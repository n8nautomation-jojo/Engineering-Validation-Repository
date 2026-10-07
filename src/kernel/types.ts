export type UUID = string;

export type ISODateTime = string;

export type TenantId = UUID;
export type OrganizationId = UUID;
export type BranchId = UUID;
export type WarehouseId = UUID;
export type DeviceId = UUID;
export type UserId = UUID;

export type AggregateVersion = number & { readonly __brand: "AggregateVersion" };

export function nextAggregateVersion(version: AggregateVersion): AggregateVersion {
  if (!Number.isSafeInteger(version) || version < 0) {
    throw new Error("INVALID_AGGREGATE_VERSION");
  }
  return (version + 1) as AggregateVersion;
}
