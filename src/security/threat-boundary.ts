import type { AttackerClass, AttackerBoundary } from "./types.js";

export const ATTACKER_BOUNDARIES: Record<AttackerClass, AttackerBoundary> = {
  A0: {
    attackerClass: "A0",
    name: "Ordinary Application User",
    description: "Operates the POS application with standard user privileges and no direct database or filesystem access.",
    preventionGuaranteed: true,
    containmentStrategy: "Fine-grained role/capability authorization, Separation of Duties (SoD) against self-approval, and structured audit trail.",
    residualRisk: "Social engineering or credential sharing, mitigated by session expirations and mandatory audit logs."
  },
  A1: {
    attackerClass: "A1",
    name: "Local Filesystem / DB Inspection",
    description: "Has user-level read/write access to the local machine and SQLite files, but no administrator privileges.",
    preventionGuaranteed: true,
    containmentStrategy: "OS-backed secret storage (Windows vault), AES-256-GCM payload encryption, HMAC integrity seals on Outbox/allocations, and cryptographic snapshot signatures.",
    residualRisk: "Direct deletion of database files causes service disruption, mitigated by durable Outbox cloud revalidation and recovery procedures."
  },
  A2: {
    attackerClass: "A2",
    name: "Local OS Administrator",
    description: "Has administrative privileges on the POS Windows host, able to inspect running process memory or modify local files.",
    preventionGuaranteed: false,
    containmentStrategy: "Cloud-authoritative state reconciliation, non-exportable hardware key binding (TPM/DPAPI where available), offline grace period caps, and cloud revocation propagation.",
    residualRisk: "Admin can extract secrets from live memory or tamper with local runtime. The platform detects discrepancy upon cloud reconnect and isolates the compromised device."
  },
  A3: {
    attackerClass: "A3",
    name: "Lost / Stolen Physical Device",
    description: "Possesses physical device without OS credentials or valid user sessions.",
    preventionGuaranteed: true,
    containmentStrategy: "Full-disk encryption (BitLocker), encrypted OS secret store, device binding mismatch rejection, and immediate remote revocation via cloud portal.",
    residualRisk: "Device data cannot be extracted without OS credentials/key material; attempts to clone database fail on non-bound devices."
  },
  A4: {
    attackerClass: "A4",
    name: "Fully Compromised Endpoint",
    description: "Endpoint compromised by active malware with kernel/rootkit capabilities.",
    preventionGuaranteed: false,
    containmentStrategy: "Server-side transaction validation, cloud inventory limits, bounded offline duration (max 24h), audit trail append-only locks, and immediate tenant-level quarantine.",
    residualRisk: "Host cannot be trusted. Containment prevents cloud infrastructure and other branches from being compromised."
  }
};

export function getAttackerBoundary(attackerClass: AttackerClass): AttackerBoundary {
  return ATTACKER_BOUNDARIES[attackerClass];
}
