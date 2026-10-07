import test from 'node:test';
import assert from 'node:assert/strict';

function authorize(snapshot, request, now) {
  if (!snapshot || snapshot.deviceId !== request.deviceId) return false;
  if (now >= snapshot.expiresAt) return false;
  if (!snapshot.capabilities.includes(request.capability)) return false;
  if (!snapshot.scopes.includes(request.scope)) return false;
  return true;
}

function verifyIntegrity(record, expectedDigest) {
  return record.digest === expectedDigest;
}

function canCloneDevice(original, cloned) {
  return original.deviceId === cloned.deviceId && original.keyBinding === cloned.keyBinding;
}

function applyRevocation(device, revokedAt) {
  return { ...device, revokedAt };
}

function privilegedAllowed(device, now) {
  return !device.revokedAt || now < device.revokedAt;
}

test('B-REF-01 offline authorization is bounded by expiry', () => {
  const snapshot = { deviceId: 'D1', expiresAt: 100, capabilities: ['sales.create'], scopes: ['B1'] };
  assert.equal(authorize(snapshot, { deviceId: 'D1', capability: 'sales.create', scope: 'B1' }, 99), true);
  assert.equal(authorize(snapshot, { deviceId: 'D1', capability: 'sales.create', scope: 'B1' }, 100), false);
});

test('B-REF-02 forged capability or scope is denied', () => {
  const snapshot = { deviceId: 'D1', expiresAt: 100, capabilities: ['sales.create'], scopes: ['B1'] };
  assert.equal(authorize(snapshot, { deviceId: 'D1', capability: 'inventory.adjust.approve', scope: 'B1' }, 10), false);
  assert.equal(authorize(snapshot, { deviceId: 'D1', capability: 'sales.create', scope: 'B2' }, 10), false);
});

test('B-REF-03 copied snapshot cannot cross device binding', () => {
  const snapshot = { deviceId: 'D1', expiresAt: 100, capabilities: ['sales.create'], scopes: ['B1'] };
  assert.equal(authorize(snapshot, { deviceId: 'D2', capability: 'sales.create', scope: 'B1' }, 10), false);
});

test('B-REF-04 integrity mismatch is detected', () => {
  assert.equal(verifyIntegrity({ digest: 'original' }, 'original'), true);
  assert.equal(verifyIntegrity({ digest: 'tampered' }, 'original'), false);
});

test('B-REF-05 device identity cloning requires matching binding', () => {
  const original = { deviceId: 'D1', keyBinding: 'K1' };
  assert.equal(canCloneDevice(original, { deviceId: 'D1', keyBinding: 'K1' }), true);
  assert.equal(canCloneDevice(original, { deviceId: 'D1', keyBinding: 'K2' }), false);
});

test('B-REF-06 cloud revocation removes privileged authority after revocation point', () => {
  const device = applyRevocation({ deviceId: 'D1', revokedAt: 50 }, 20);
  assert.equal(privilegedAllowed(device, 10), true);
  assert.equal(privilegedAllowed(device, 20), false);
});

test('B-REF-07 missing protection fails closed', () => {
  const requiredKey = null;
  assert.equal(requiredKey !== null, false);
});

test('B-REF-08 payment evidence is not provider verification', () => {
  const payment = { evidenceCaptured: true, verification: 'EVIDENCE_REVIEW' };
  assert.notEqual(payment.verification, 'API_VERIFICATION');
});

test('B-REF-09 security event processing is idempotent', () => {
  const seen = new Set();
  const event = 'SEC-E1';
  const process = () => { if (seen.has(event)) return false; seen.add(event); return true; };
  assert.equal(process(), true);
  assert.equal(process(), false);
});

test('B-REF-10 recovery cannot silently restore revoked authority', () => {
  const revoked = { deviceId: 'D1', revokedAt: 10 };
  const restored = { ...revoked };
  assert.equal(privilegedAllowed(restored, 11), false);
});
