import type { BranchId, DeviceId, UUID } from "../../kernel/types.js";

export type OfflineAllocationState = "UNALLOCATED" | "ACTIVE" | "EXHAUSTED" | "SUSPENDED" | "EXPIRED" | "RECONCILING" | "RECONCILED";

export interface OfflineSafetyAllocation {
  readonly id: UUID;
  readonly branchId: BranchId;
  readonly warehouseId: UUID;
  readonly deviceId: DeviceId;
  readonly productId: UUID;
  readonly allocatedCapacity: number;
  readonly consumedCapacity: number;
  readonly releasedCapacity: number;
  readonly state: OfflineAllocationState;
  readonly version: number;
  readonly issuedAt: string;
  readonly validFrom: string;
  readonly expiresAt: string;
}

const ISO_DATE_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;

export function normalizeCanonicalUtc(isoString: string): string {
  if (typeof isoString !== "string" || !ISO_DATE_PATTERN.test(isoString)) {
    throw new Error("INVALID_TIMESTAMP_FORMAT");
  }
  const epoch = Date.parse(isoString);
  if (!Number.isFinite(epoch)) {
    throw new Error("INVALID_TIMESTAMP_FORMAT");
  }
  const canonical = new Date(epoch).toISOString();
  const inputDate = isoString.slice(0, 10);
  const canonicalDate = canonical.slice(0, 10);
  if (!isoString.includes("+") && !isoString.slice(10).includes("-")) {
    if (inputDate !== canonicalDate) {
      throw new Error("INVALID_CALENDAR_DATE");
    }
  }
  return canonical;
}

export function parseCanonicalUtc(isoString: string): number {
  const canonical = normalizeCanonicalUtc(isoString);
  return Date.parse(canonical);
}

export function createOfflineAllocation(input: Omit<OfflineSafetyAllocation, "consumedCapacity" | "releasedCapacity" | "state" | "version">): OfflineSafetyAllocation {
  if (input.allocatedCapacity < 0 || !Number.isFinite(input.allocatedCapacity)) throw new Error("INVALID_ALLOCATION_CAPACITY");
  if (!input.issuedAt || !input.validFrom || !input.expiresAt) throw new Error("OFFLINE_ALLOCATION_INVALID");
  const issuedAt = normalizeCanonicalUtc(input.issuedAt);
  const validFrom = normalizeCanonicalUtc(input.validFrom);
  const expiresAt = normalizeCanonicalUtc(input.expiresAt);
  const issuedEpoch = Date.parse(issuedAt);
  const validFromEpoch = Date.parse(validFrom);
  const expiresAtEpoch = Date.parse(expiresAt);
  if (issuedEpoch > validFromEpoch || validFromEpoch >= expiresAtEpoch) {
    throw new Error("INVALID_ALLOCATION_TEMPORAL_WINDOW");
  }
  return Object.freeze({
    ...input,
    issuedAt,
    validFrom,
    expiresAt,
    consumedCapacity: 0,
    releasedCapacity: 0,
    state: "ACTIVE" as const,
    version: 0
  });
}

export function remainingCapacity(a: OfflineSafetyAllocation): number {
  return a.allocatedCapacity - a.consumedCapacity + a.releasedCapacity;
}

export function isOfflineAllocationExpired(a: OfflineSafetyAllocation, now: string): boolean {
  if (!a.expiresAt) return true;
  const nowMs = parseCanonicalUtc(now);
  const expiresMs = parseCanonicalUtc(a.expiresAt);
  return nowMs >= expiresMs;
}

export function assertOfflineAllocationValid(a: OfflineSafetyAllocation, now: string): void {
  if (!a.issuedAt || !a.validFrom || !a.expiresAt) throw new Error("OFFLINE_ALLOCATION_INVALID");
  if (a.state !== "ACTIVE") throw new Error("OFFLINE_ALLOCATION_UNAVAILABLE");
  const nowMs = parseCanonicalUtc(now);
  const validFromMs = parseCanonicalUtc(a.validFrom);
  const expiresAtMs = parseCanonicalUtc(a.expiresAt);
  if (nowMs < validFromMs) throw new Error("OFFLINE_ALLOCATION_NOT_YET_VALID");
  if (nowMs >= expiresAtMs) throw new Error("OFFLINE_ALLOCATION_EXPIRED");
}

export function consumeOfflineAllocation(a: OfflineSafetyAllocation, quantity: number, now?: string): OfflineSafetyAllocation {
  if (now) {
    assertOfflineAllocationValid(a, now);
  } else {
    if (a.state !== "ACTIVE") throw new Error("OFFLINE_ALLOCATION_UNAVAILABLE");
  }
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("INVALID_ALLOCATION_CONSUMPTION");
  if (quantity > remainingCapacity(a)) throw new Error("OFFLINE_ALLOCATION_EXHAUSTED");
  const consumed = a.consumedCapacity + quantity;
  return Object.freeze({
    ...a,
    consumedCapacity: consumed,
    state: remainingCapacity({ ...a, consumedCapacity: consumed }) === 0 ? "EXHAUSTED" : "ACTIVE",
    version: a.version + 1
  });
}

export function suspendOfflineAllocation(a: OfflineSafetyAllocation): OfflineSafetyAllocation {
  if (a.state !== "ACTIVE" && a.state !== "EXHAUSTED") throw new Error("INVALID_ALLOCATION_TRANSITION");
  return Object.freeze({ ...a, state: "SUSPENDED" as const, version: a.version + 1 });
}

export function expireOfflineAllocation(a: OfflineSafetyAllocation): OfflineSafetyAllocation {
  if (a.state !== "ACTIVE") throw new Error("INVALID_ALLOCATION_TRANSITION");
  return Object.freeze({ ...a, state: "EXPIRED" as const, version: a.version + 1 });
}

export function activateOfflineAllocation(a: OfflineSafetyAllocation, now?: string): OfflineSafetyAllocation {
  if (a.state !== "SUSPENDED") throw new Error("INVALID_ALLOCATION_TRANSITION");
  if (remainingCapacity(a) <= 0) throw new Error("CANNOT_ACTIVATE_EMPTY_ALLOCATION");
  if (now && isOfflineAllocationExpired(a, now)) throw new Error("OFFLINE_ALLOCATION_EXPIRED");
  return Object.freeze({ ...a, state: "ACTIVE" as const, version: a.version + 1 });
}

export function replenishOfflineAllocation(a: OfflineSafetyAllocation, additionalCapacity: number, now?: string): OfflineSafetyAllocation {
  if (!Number.isFinite(additionalCapacity) || additionalCapacity <= 0) throw new Error("INVALID_ALLOCATION_CAPACITY");
  if (a.state === "EXPIRED" || a.state === "SUSPENDED") throw new Error("ALLOCATION_NOT_REPLENISHABLE");
  if (a.state !== "EXHAUSTED" && a.state !== "ACTIVE") throw new Error("INVALID_ALLOCATION_TRANSITION");
  if (now && isOfflineAllocationExpired(a, now)) throw new Error("OFFLINE_ALLOCATION_EXPIRED");
  return Object.freeze({
    ...a,
    allocatedCapacity: a.allocatedCapacity + additionalCapacity,
    state: "ACTIVE" as const,
    version: a.version + 1
  });
}

export function startReconciliation(a: OfflineSafetyAllocation): OfflineSafetyAllocation {
  if (a.state !== "ACTIVE" && a.state !== "EXHAUSTED" && a.state !== "SUSPENDED" && a.state !== "EXPIRED") throw new Error("INVALID_ALLOCATION_TRANSITION");
  return Object.freeze({ ...a, state: "RECONCILING" as const, version: a.version + 1 });
}

export function reconcileOfflineAllocation(a: OfflineSafetyAllocation): OfflineSafetyAllocation {
  if (a.state !== "RECONCILING") throw new Error("INVALID_ALLOCATION_TRANSITION");
  return Object.freeze({ ...a, state: "RECONCILED" as const, version: a.version + 1 });
}
