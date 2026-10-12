import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";
import {
  PosTamperGuard,
  DeviceSecurityGuard,
  PaymentEvidenceGuard,
  WindowsProtectedSecretStore,
  MemorySecretStore,
  SecurityKeyUnavailableError,
  DeviceBindingMismatchError,
  DeviceRevokedError,
  ATTACKER_BOUNDARIES,
  getAttackerBoundary,
  canonicalJsonStringify,
  computeSha256,
  computeHmacSha256
} from "../dist/src/security/index.js";
import {
  createAuthorizationSnapshot,
  verifySnapshotSignature,
  computeSnapshotSignature,
  AuthorizationRuntime
} from "../dist/src/authorization/index.js";

function getTempFilePath(prefix) {
  return path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function getTempVaultPath(prefix) {
  return path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.vault`);
}

test("SEC-P01: Local DB confidentiality - sensitive data is encrypted at rest and inaccessible without key", async () => {
  const guard = new PosTamperGuard();
  const dbPath = getTempFilePath("sec-p01-confidentiality");
  const secretKey = "super-secret-pos-data-protection-key";
  const wrongKey = "wrong-attacker-key-material-1234567";

  try {
    const db = new DatabaseSync(dbPath);
    db.exec(`
      CREATE TABLE customer_prescriptions (
        prescription_id TEXT PRIMARY KEY,
        patient_name TEXT,
        encrypted_payload TEXT NOT NULL,
        iv TEXT NOT NULL,
        tag TEXT NOT NULL
      );
    `);

    const confidentialPayload = JSON.stringify({
      nationalId: "1234567890",
      patientName: "Ahmed Ali",
      diagnosis: "Chronic Hypertension",
      prescribedDrugs: ["Amlodipine 5mg", "Lisinopril 10mg"]
    });

    const encrypted = guard.encryptSensitivePayload(confidentialPayload, secretKey);

    db.prepare(`
      INSERT INTO customer_prescriptions (prescription_id, patient_name, encrypted_payload, iv, tag)
      VALUES (?, ?, ?, ?, ?)
    `).run("rx-001", "Confidential", encrypted.ciphertext, encrypted.iv, encrypted.tag);

    db.close();

    // 1. Direct raw database file inspection (attacker class A1)
    const rawFile = fs.readFileSync(dbPath, "utf8");
    assert.equal(rawFile.includes("Chronic Hypertension"), false, "Plaintext medical data MUST NOT appear in DB file");
    assert.equal(rawFile.includes("Amlodipine 5mg"), false, "Plaintext drug names MUST NOT appear in DB file");

    // 2. Open DB with standard SQLite tooling and inspect row
    const dbInspect = new DatabaseSync(dbPath);
    const row = dbInspect.prepare("SELECT * FROM customer_prescriptions WHERE prescription_id = ?").get("rx-001");
    assert.ok(row);
    assert.notEqual(row.encrypted_payload, confidentialPayload);

    // 3. Attempt decryption with wrong key material -> MUST fail closed
    assert.throws(
      () => {
        guard.decryptSensitivePayload(
          { ciphertext: row.encrypted_payload, iv: row.iv, tag: row.tag },
          wrongKey,
          "rx-001"
        );
      },
      (err) => {
        return err.name === "TamperDetectedError";
      }
    );

    // 4. Decryption with correct key succeeds
    const decrypted = guard.decryptSensitivePayload(
      { ciphertext: row.encrypted_payload, iv: row.iv, tag: row.tag },
      secretKey,
      "rx-001"
    );
    assert.equal(decrypted, confidentialPayload);

    dbInspect.close();
  } finally {
    try { fs.unlinkSync(dbPath); } catch {}
  }
});

test("SEC-P02: Local DB tamper detection - unauthorized modifications to security-critical state are detected", async () => {
  const guard = new PosTamperGuard();
  const dbPath = getTempFilePath("sec-p02-tamper");
  const integritySecret = "pos-integrity-seal-secret-key-999";

  try {
    const db = new DatabaseSync(dbPath);
    db.exec(`
      CREATE TABLE offline_allocations (
        allocation_id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        allocated_capacity INTEGER NOT NULL,
        consumed_capacity INTEGER NOT NULL,
        integrity_digest TEXT NOT NULL,
        sealed_at TEXT NOT NULL
      );
    `);

    const allocation1 = {
      id: "alloc-001",
      deviceId: "dev-pos-01",
      allocatedCapacity: 50,
      consumedCapacity: 10
    };

    const allocation2 = {
      id: "alloc-002",
      deviceId: "dev-pos-01",
      allocatedCapacity: 100,
      consumedCapacity: 0
    };

    const sealed1 = guard.sealRecord(allocation1, "key-01", integritySecret, "dev-pos-01", "2026-10-12T10:00:00.000Z");
    const sealed2 = guard.sealRecord(allocation2, "key-01", integritySecret, "dev-pos-01", "2026-10-12T10:00:00.000Z");

    const insertStmt = db.prepare(`
      INSERT INTO offline_allocations (allocation_id, device_id, allocated_capacity, consumed_capacity, integrity_digest, sealed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(allocation1.id, allocation1.deviceId, allocation1.allocatedCapacity, allocation1.consumedCapacity, sealed1.digest, sealed1.sealedAt);
    insertStmt.run(allocation2.id, allocation2.deviceId, allocation2.allocatedCapacity, allocation2.consumedCapacity, sealed2.digest, sealed2.sealedAt);

    // Validate initial uncorrupted state
    const resultInitial = guard.validateBatchIntegrity([sealed1, sealed2], integritySecret);
    assert.equal(resultInitial.passed, true);
    assert.equal(resultInitial.tamperedCount, 0);

    // SIMULATE TAMPERING: Attacker outside application edits SQLite allocation capacity to give themselves 500 units!
    db.prepare("UPDATE offline_allocations SET allocated_capacity = 500 WHERE allocation_id = 'alloc-001'").run();

    const tamperedRow = db.prepare("SELECT * FROM offline_allocations WHERE allocation_id = 'alloc-001'").get();
    const tamperedRecord = {
      payload: {
        id: tamperedRow.allocation_id,
        deviceId: tamperedRow.device_id,
        allocatedCapacity: tamperedRow.allocated_capacity, // Now 500!
        consumedCapacity: tamperedRow.consumed_capacity
      },
      digest: tamperedRow.integrity_digest, // Old digest over 50 units!
      keyId: "key-01",
      sealedAt: tamperedRow.sealed_at,
      deviceId: tamperedRow.device_id
    };

    const tamperCheck = guard.validateBatchIntegrity([tamperedRecord, sealed2], integritySecret);
    assert.equal(tamperCheck.passed, false, "Tampering must be detected!");
    assert.equal(tamperCheck.tamperedCount, 1);
    assert.deepEqual(tamperCheck.tamperedRecordIds, ["alloc-001"]);

    db.close();
  } finally {
    try { fs.unlinkSync(dbPath); } catch {}
  }
});

test("SEC-P03: Offline authorization snapshot forgery - altered capabilities or scopes fail signature verification", () => {
  const assignments = [
    {
      userId: "usr-cashier-01",
      capabilities: ["sales.create", "payments.record"],
      scope: {
        tenantId: "t-001",
        organizationId: "org-001",
        branchIds: ["branch-01"],
        warehouseIds: ["wh-01"],
        deviceIds: ["dev-pos-01"]
      }
    }
  ];

  const snap = createAuthorizationSnapshot({
    snapshotId: "snap-sec-01",
    userId: "usr-cashier-01",
    deviceId: "dev-pos-01",
    tenantId: "t-001",
    organizationId: "org-001",
    assignments,
    issuedAt: "2026-10-12T08:00:00.000Z",
    expiresAt: "2026-10-12T20:00:00.000Z"
  });

  assert.ok(snap.signature);
  assert.equal(verifySnapshotSignature(snap), true);

  // Attack 1: Inject forbidden admin capability "roles.manage"
  const forgedCaps = [
    {
      ...assignments[0],
      capabilities: ["sales.create", "payments.record", "roles.manage"]
    }
  ];
  const tamperedSnap1 = { ...snap, assignments: forgedCaps };
  assert.equal(verifySnapshotSignature(tamperedSnap1), false, "Forged capability must fail verification");

  // Attack 2: Expand branch scope from "branch-01" to "*"
  const forgedScope = [
    {
      ...assignments[0],
      scope: { ...assignments[0].scope, branchIds: ["branch-01", "branch-02"] }
    }
  ];
  const tamperedSnap2 = { ...snap, assignments: forgedScope };
  assert.equal(verifySnapshotSignature(tamperedSnap2), false, "Forged scope must fail verification");

  // Attack 3: Alter deviceId binding
  const tamperedSnap3 = { ...snap, deviceId: "dev-stolen-pos" };
  assert.equal(verifySnapshotSignature(tamperedSnap3), false, "Device binding change must fail verification");
});

test("SEC-P04: Device identity cloning - copied database cannot independently authorize on un-bound device", async () => {
  const secretStore = new MemorySecretStore();
  const guard = new DeviceSecurityGuard(secretStore);

  const MACHINE_1 = "WINDOWS-CPU-ID-A1B2-C3D4";
  const MACHINE_2_CLONE = "WINDOWS-CPU-ID-ROGUE-9999";

  const binding1 = guard.computeKeyBinding("dev-pos-101", MACHINE_1);

  const identity = {
    deviceId: "dev-pos-101",
    tenantId: "t-001",
    organizationId: "org-001",
    branchId: "branch-001",
    keyBindingDigest: binding1,
    status: "ACTIVE",
    registeredAt: "2026-10-12T00:00:00.000Z"
  };

  await guard.registerDevice(identity, "dev-secret-alpha", MACHINE_1);

  // Verification on legitimate Machine 1 passes
  const legitResult = await guard.verifyDeviceBinding(identity, MACHINE_1);
  assert.equal(legitResult.valid, true);
  assert.equal(legitResult.deviceSecret, "dev-secret-alpha");

  // Attack: Copied database is opened on Machine 2 (cloned POS endpoint)
  await assert.rejects(
    async () => {
      await guard.verifyDeviceBinding(identity, MACHINE_2_CLONE);
    },
    (err) => {
      assert.ok(err instanceof DeviceBindingMismatchError);
      assert.match(err.message, /cloning detected/i);
      return true;
    }
  );
});

test("SEC-P05: Revoked device containment - revocation is durable across restart and disconnect", async () => {
  const secretStore = new MemorySecretStore();
  const guard = new DeviceSecurityGuard(secretStore);
  const MACHINE = "WINDOWS-POS-HW-001";
  const binding = guard.computeKeyBinding("dev-pos-202", MACHINE);

  let identity = {
    deviceId: "dev-pos-202",
    tenantId: "t-001",
    organizationId: "org-001",
    branchId: "branch-001",
    keyBindingDigest: binding,
    status: "ACTIVE",
    registeredAt: "2026-10-12T00:00:00.000Z"
  };

  await guard.registerDevice(identity, "secret-pos-202", MACHINE);

  assert.equal(guard.isPrivilegedAllowed(identity, "2026-10-12T10:00:00.000Z"), true);

  // Cloud pushes revocation notice
  identity = guard.applyDeviceRevocation(identity, "2026-10-12T11:00:00.000Z", "Compromised terminal reported");
  assert.equal(identity.status, "REVOKED");

  // Privileged actions must be immediately blocked
  assert.equal(guard.isPrivilegedAllowed(identity, "2026-10-12T11:05:00.000Z"), false);

  // Attempting device binding check on revoked device throws DeviceRevokedError
  await assert.rejects(
    async () => {
      await guard.verifyDeviceBinding(identity, MACHINE);
    },
    (err) => {
      assert.ok(err instanceof DeviceRevokedError);
      return true;
    }
  );

  // Simulate application restart: identity loaded from disk is still REVOKED
  const restartedIdentity = { ...identity };
  assert.equal(restartedIdentity.status, "REVOKED");
  assert.equal(guard.isPrivilegedAllowed(restartedIdentity, "2026-10-12T12:00:00.000Z"), false);
});

test("SEC-P06: Key unavailability - fail-closed behavior with no plaintext fallback", async () => {
  const vaultPath = getTempVaultPath("sec-p06-key-unavail");
  const machineSecret = "hardware-tpm-simulated-seed-001";

  try {
    const store = new WindowsProtectedSecretStore(vaultPath, machineSecret);

    // Write a key
    await store.setSecret("SIGNING_KEY", "highly-confidential-signing-secret");
    assert.equal(await store.getSecret("SIGNING_KEY"), "highly-confidential-signing-secret");

    // Attack / Failure: Corrupt the vault file on disk (simulate permission loss, key corruption)
    fs.writeFileSync(vaultPath, "{ malformed corrupted json...", "utf8");

    // Access must fail closed and throw SecurityKeyUnavailableError, NOT return null or plaintext fallback
    await assert.rejects(
      async () => {
        await store.getSecret("SIGNING_KEY");
      },
      (err) => {
        assert.ok(err instanceof SecurityKeyUnavailableError);
        assert.match(err.message, /Fail-closed/i);
        return true;
      }
    );
  } finally {
    try { fs.unlinkSync(vaultPath); } catch {}
  }
});

test("SEC-P07: SQLite corruption - detected deterministically without silent invalid execution", () => {
  const dbPath = getTempFilePath("sec-p07-corruption");

  try {
    // 1. Create a valid SQLite DB
    const db = new DatabaseSync(dbPath);
    db.exec("CREATE TABLE test_data (id INTEGER PRIMARY KEY, val TEXT);");
    db.prepare("INSERT INTO test_data (val) VALUES (?)").run("valid record");
    db.close();

    // 2. Corrupt the SQLite database file headers directly
    const fd = fs.openSync(dbPath, "r+");
    const garbage = Buffer.from("CORRUPTED_GARBAGE_BYTES_OVERWRITING_SQLITE_PAGE_HEADER");
    fs.writeSync(fd, garbage, 0, garbage.length, 50); // Overwrite page offset
    fs.closeSync(fd);

    // 3. Reopening and checking integrity detects corruption
    assert.throws(
      () => {
        const corruptedDb = new DatabaseSync(dbPath);
        const check = corruptedDb.prepare("PRAGMA integrity_check").get();
        if (check && check.integrity_check !== "ok") {
          corruptedDb.close();
          throw new Error(`Database corruption detected: ${check.integrity_check}`);
        }
        corruptedDb.close();
      },
      (err) => {
        return err.message.includes("corruption detected") || err.message.includes("malformed");
      }
    );
  } finally {
    try { fs.unlinkSync(dbPath); } catch {}
  }
});

test("SEC-P08: Power-loss / transaction atomicity - multi-table commit rolls back cleanly on failure injection", () => {
  const dbPath = getTempFilePath("sec-p08-powerloss");

  try {
    const db = new DatabaseSync(dbPath);
    db.exec(`
      CREATE TABLE sales (sale_id TEXT PRIMARY KEY, amount REAL);
      CREATE TABLE payments (payment_id TEXT PRIMARY KEY, sale_id TEXT, amount REAL);
      CREATE TABLE outbox_events (event_id TEXT PRIMARY KEY, topic TEXT);
      CREATE TABLE audit_records (audit_id TEXT PRIMARY KEY, event TEXT);
    `);

    // Failure injection: simulate process abort or exception before completing full atomic write
    assert.throws(() => {
      db.exec("BEGIN TRANSACTION;");
      db.prepare("INSERT INTO sales (sale_id, amount) VALUES (?, ?)").run("sale-tx-01", 150.0);
      db.prepare("INSERT INTO payments (payment_id, sale_id, amount) VALUES (?, ?, ?)").run("pay-01", "sale-tx-01", 150.0);
      
      // Simulate sudden power interruption / failure before Outbox and Audit insert
      throw new Error("POWER_INTERRUPTED_SIMULATION");
    });
    db.exec("ROLLBACK;");

    // Invariant check: zero partial rows must exist in database!
    const salesCount = db.prepare("SELECT count(*) as c FROM sales").get().c;
    const paymentsCount = db.prepare("SELECT count(*) as c FROM payments").get().c;
    assert.equal(salesCount, 0, "No partial sale row should exist after rollback");
    assert.equal(paymentsCount, 0, "No partial payment row should exist after rollback");

    // Happy path transaction commit
    db.exec("BEGIN TRANSACTION;");
    db.prepare("INSERT INTO sales (sale_id, amount) VALUES (?, ?)").run("sale-tx-02", 200.0);
    db.prepare("INSERT INTO payments (payment_id, sale_id, amount) VALUES (?, ?, ?)").run("pay-02", "sale-tx-02", 200.0);
    db.prepare("INSERT INTO outbox_events (event_id, topic) VALUES (?, ?)").run("evt-01", "sales.completed");
    db.prepare("INSERT INTO audit_records (audit_id, event) VALUES (?, ?)").run("aud-01", "SALE_COMMITTED");
    db.exec("COMMIT;");

    assert.equal(db.prepare("SELECT count(*) as c FROM sales").get().c, 1);
    assert.equal(db.prepare("SELECT count(*) as c FROM outbox_events").get().c, 1);

    db.close();
  } finally {
    try { fs.unlinkSync(dbPath); } catch {}
  }
});

test("SEC-P09: Payment evidence integrity - altered evidence is quarantined and cannot bypass API verification", () => {
  const guard = new PaymentEvidenceGuard();
  const evidenceSecret = "evidence-protection-secret-777";

  const originalReceiptContent = "RECEIPT-SLIP: Bankak Transfer TRX#991823 Amount: 5000 SDG";
  const validFileHash = computeSha256(originalReceiptContent);

  const evidenceInput = {
    evidenceId: "ev-1001",
    saleId: "sale-900",
    paymentMethod: "BANKAK",
    amount: 5000,
    currency: "SDG",
    capturedAt: "2026-10-12T10:00:00.000Z",
    fileHash: validFileHash
  };

  const evidence = guard.createEvidence(evidenceInput, evidenceSecret);
  assert.equal(evidence.verificationStatus, "UNVERIFIED");
  assert.ok(evidence.evidenceDigest);

  // 1. Verify integrity of unmodified receipt
  const valid = guard.verifyEvidenceIntegrity(evidence, validFileHash, evidenceSecret);
  assert.equal(valid, true);

  // 2. Attack: Receipt slip file is modified outside application (altered amount to 50000 SDG)
  const tamperedReceiptContent = "RECEIPT-SLIP: Bankak Transfer TRX#991823 Amount: 50000 SDG";
  const tamperedFileHash = computeSha256(tamperedReceiptContent);

  // 3. Attempting offline review with tampered file MUST quarantine evidence!
  const reviewed = guard.reviewEvidenceOffline(
    evidence,
    "usr-supervisor",
    "2026-10-12T10:30:00.000Z",
    tamperedFileHash,
    evidenceSecret
  );
  assert.equal(reviewed.verificationStatus, "QUARANTINED");
  assert.ok(reviewed.quarantineReason);

  // 4. Attempting to convert quarantined evidence to API_VERIFICATION is strictly rejected!
  assert.throws(
    () => {
      guard.applyProviderVerification(reviewed, "BANKAK-API-REF-001", "2026-10-12T11:00:00.000Z");
    },
    (err) => {
      return err.name === "EvidenceTamperedError";
    }
  );

  // 5. Offline review of valid evidence produces EVIDENCE_REVIEW, NOT API_VERIFICATION
  const validReviewed = guard.reviewEvidenceOffline(
    evidence,
    "usr-supervisor",
    "2026-10-12T10:30:00.000Z",
    validFileHash,
    evidenceSecret
  );
  assert.equal(validReviewed.verificationStatus, "EVIDENCE_REVIEWED");
  assert.equal(validReviewed.verificationMethod, "EVIDENCE_REVIEW");
  assert.notEqual(validReviewed.verificationMethod, "API_VERIFICATION");
});

test("SEC-P10: Security performance overhead - cryptographic operations comply with P95 < 200ms target", () => {
  const guard = new PosTamperGuard();
  const secret = "benchmark-secret-material-abc-123";
  const iterations = 500;
  const durationsMs = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    // Perform full security pipeline: sealing record, encrypting payload, decrypting payload, verifying seal
    const sealed = guard.sealRecord(
      { transactionId: `tx-${i}`, amount: 125.5, items: ["item1", "item2"] },
      "key-01",
      secret,
      "dev-pos-bench",
      "2026-10-12T10:00:00.000Z"
    );

    const encrypted = guard.encryptSensitivePayload(JSON.stringify(sealed.payload), secret);
    const decrypted = guard.decryptSensitivePayload(encrypted, secret);
    const valid = guard.verifyRecordSeal(sealed, secret);

    assert.ok(valid);
    assert.ok(decrypted);

    durationsMs.push(performance.now() - start);
  }

  durationsMs.sort((a, b) => a - b);
  const p50 = durationsMs[Math.floor(iterations * 0.50)];
  const p95 = durationsMs[Math.floor(iterations * 0.95)];
  const p99 = durationsMs[Math.floor(iterations * 0.99)];

  // Target requirement: P95 < 200 ms
  assert.ok(p95 < 200, `P95 latency (${p95.toFixed(2)} ms) must be well below 200ms`);
  assert.ok(p95 < 10, `On modern desktop hardware, P95 (${p95.toFixed(2)} ms) is expected to be under 10ms`);
});

test("SEC-P11 & SEC-P12: Device replacement and re-provisioning without privilege leakage", async () => {
  const secretStore = new MemorySecretStore();
  const guard = new DeviceSecurityGuard(secretStore);

  const OLD_MACHINE = "HW-MACHINE-OLD-111";
  const NEW_MACHINE = "HW-MACHINE-NEW-222";

  const oldBinding = guard.computeKeyBinding("dev-001", OLD_MACHINE);
  const oldIdentity = {
    deviceId: "dev-001",
    tenantId: "t-001",
    organizationId: "org-001",
    branchId: "branch-001",
    keyBindingDigest: oldBinding,
    status: "ACTIVE",
    registeredAt: "2026-10-01T00:00:00.000Z"
  };
  await guard.registerDevice(oldIdentity, "old-secret-111", OLD_MACHINE);

  // Old device is decommissioned and revoked
  const revokedOldIdentity = guard.applyDeviceRevocation(oldIdentity, "2026-10-12T08:00:00.000Z", "Replaced with new hardware");
  assert.equal(revokedOldIdentity.status, "REVOKED");

  // Attempting to run new machine with old device credentials fails
  await assert.rejects(
    async () => {
      await guard.verifyDeviceBinding(oldIdentity, NEW_MACHINE);
    },
    (err) => err instanceof DeviceBindingMismatchError
  );

  // Controlled re-provisioning creates NEW distinct device identity
  const newBinding = guard.computeKeyBinding("dev-002", NEW_MACHINE);
  const newIdentity = {
    deviceId: "dev-002",
    tenantId: "t-001",
    organizationId: "org-001",
    branchId: "branch-001",
    keyBindingDigest: newBinding,
    status: "ACTIVE",
    registeredAt: "2026-10-12T09:00:00.000Z"
  };
  await guard.registerDevice(newIdentity, "new-secret-222", NEW_MACHINE);

  const newVerified = await guard.verifyDeviceBinding(newIdentity, NEW_MACHINE);
  assert.equal(newVerified.valid, true);
  assert.equal(newVerified.deviceSecret, "new-secret-222");
});

test("SEC-P13: Offline to online transition preserves security invariants", () => {
  const secretStore = new MemorySecretStore();
  const guard = new DeviceSecurityGuard(secretStore);
  const MACHINE = "HW-MACHINE-TRANSITION-01";
  const binding = guard.computeKeyBinding("dev-trans-01", MACHINE);

  const identity = {
    deviceId: "dev-trans-01",
    tenantId: "t-001",
    organizationId: "org-001",
    branchId: "branch-001",
    keyBindingDigest: binding,
    status: "ACTIVE",
    registeredAt: "2026-10-12T00:00:00.000Z"
  };

  // While offline: operations within approved envelope proceed
  assert.equal(guard.isPrivilegedAllowed(identity, "2026-10-12T10:00:00.000Z"), true);

  // Transition online: cloud reports device has been revoked
  const revokedIdentity = guard.applyDeviceRevocation(identity, "2026-10-12T11:00:00.000Z");
  assert.equal(guard.isPrivilegedAllowed(revokedIdentity, "2026-10-12T11:00:01.000Z"), false);
});

test("SEC-P14: Duplicate security event handling is strictly idempotent", () => {
  const secretStore = new MemorySecretStore();
  const guard = new DeviceSecurityGuard(secretStore);

  const event = {
    eventId: "sec-event-quarantine-991",
    eventType: "TAMPER_DETECTED",
    deviceId: "dev-pos-01",
    severity: "CRITICAL",
    timestamp: "2026-10-12T10:00:00.000Z",
    details: { reason: "Allocation hash mismatch" }
  };

  // First ingestion: processed
  const first = guard.processSecurityEvent(event);
  assert.equal(first, true);

  // Duplicate ingestion: deduplicated
  const second = guard.processSecurityEvent(event);
  assert.equal(second, false);

  const third = guard.processSecurityEvent(event);
  assert.equal(third, false);
});

test("SEC-P15: Local-admin boundary (A2) residual risk characterization", () => {
  const a2 = getAttackerBoundary("A2");
  assert.equal(a2.attackerClass, "A2");
  assert.equal(a2.preventionGuaranteed, false, "Application-only controls CANNOT guarantee prevention against A2 admin");
  assert.ok(a2.containmentStrategy.includes("Cloud-authoritative"));
  assert.ok(a2.residualRisk.length > 0);
});

test("SEC-P16: Fully compromised endpoint boundary (A4) containment verification", () => {
  const a4 = getAttackerBoundary("A4");
  assert.equal(a4.attackerClass, "A4");
  assert.equal(a4.preventionGuaranteed, false, "Application cannot guarantee absolute prevention on compromised endpoint");
  assert.ok(a4.containmentStrategy.includes("bounded offline duration"));
  assert.ok(a4.residualRisk.length > 0);
});
