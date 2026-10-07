export const CAPABILITIES = [
  "sales.create","sales.reverse","sales.return","sales.read",
  "payments.record","payments.evidence.add","payments.verify.manual","payments.verify.external","payments.read",
  "cash.sessions.open","cash.sessions.move","cash.sessions.close","cash.sessions.reconcile",
  "inventory.read","inventory.adjust.create","inventory.adjust.approve",
  "inventory.transfer.create","inventory.transfer.dispatch","inventory.transfer.receive",
  "purchasing.po.create","purchasing.po.read","purchasing.receipt.create",
  "sync.push","sync.pull","sync.conflict.resolve","audit.read"
] as const;

export type Capability = typeof CAPABILITIES[number];

export type OfflineClass = "OFFLINE_ELIGIBLE" | "OFFLINE_RESTRICTED" | "ONLINE_ONLY" | "NEVER_OFFLINE";

export const OFFLINE_CLASS: Readonly<Record<Capability, OfflineClass>> = {
  "sales.create":"OFFLINE_ELIGIBLE","sales.reverse":"OFFLINE_RESTRICTED","sales.return":"OFFLINE_RESTRICTED","sales.read":"OFFLINE_ELIGIBLE",
  "payments.record":"OFFLINE_ELIGIBLE","payments.evidence.add":"OFFLINE_RESTRICTED","payments.verify.manual":"OFFLINE_RESTRICTED","payments.verify.external":"ONLINE_ONLY","payments.read":"OFFLINE_ELIGIBLE",
  "cash.sessions.open":"OFFLINE_RESTRICTED","cash.sessions.move":"OFFLINE_ELIGIBLE","cash.sessions.close":"OFFLINE_RESTRICTED","cash.sessions.reconcile":"ONLINE_ONLY",
  "inventory.read":"OFFLINE_ELIGIBLE","inventory.adjust.create":"OFFLINE_RESTRICTED","inventory.adjust.approve":"ONLINE_ONLY",
  "inventory.transfer.create":"OFFLINE_RESTRICTED","inventory.transfer.dispatch":"OFFLINE_RESTRICTED","inventory.transfer.receive":"OFFLINE_RESTRICTED",
  "purchasing.po.create":"ONLINE_ONLY","purchasing.po.read":"ONLINE_ONLY","purchasing.receipt.create":"OFFLINE_RESTRICTED",
  "sync.push":"OFFLINE_ELIGIBLE","sync.pull":"OFFLINE_ELIGIBLE","sync.conflict.resolve":"ONLINE_ONLY","audit.read":"ONLINE_ONLY"
};

export function isCapability(value: string): value is Capability {
  return (CAPABILITIES as readonly string[]).includes(value);
}
