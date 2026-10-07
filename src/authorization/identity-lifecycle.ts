export const IDENTITY_LIFECYCLE = [
  "PROVISIONED",
  "PASSWORD_CHANGE_REQUIRED",
  "ACTIVE"
] as const;

export type IdentityLifecycleState = typeof IDENTITY_LIFECYCLE[number];

export const SECURITY_STATES = [
  "DISABLED",
  "LOCKED",
  "REVOKED"
] as const;

export type SecurityState = typeof SECURITY_STATES[number];

export type IdentityState = Readonly<{
  lifecycle: IdentityLifecycleState;
  security: SecurityState | null;
}>;

const allowedLifecycleTransitions: Readonly<Record<IdentityLifecycleState, readonly IdentityLifecycleState[]>> = {
  PROVISIONED: ["PASSWORD_CHANGE_REQUIRED"],
  PASSWORD_CHANGE_REQUIRED: ["ACTIVE"],
  ACTIVE: []
};

export function transitionLifecycle(
  current: IdentityLifecycleState,
  next: IdentityLifecycleState
): IdentityLifecycleState {
  if (!allowedLifecycleTransitions[current].includes(next)) {
    throw new Error(`INVALID_IDENTITY_LIFECYCLE_TRANSITION:${current}->${next}`);
  }
  return next;
}

export function canAuthenticateNormally(state: IdentityState): boolean {
  return state.lifecycle === "ACTIVE" && state.security === null;
}

export function canEnterPasswordChangeFlow(state: IdentityState): boolean {
  return state.lifecycle === "PASSWORD_CHANGE_REQUIRED" &&
    state.security !== "DISABLED" &&
    state.security !== "LOCKED" &&
    state.security !== "REVOKED";
}

export function assertNormalAccess(state: IdentityState): void {
  if (!canAuthenticateNormally(state)) {
    throw new Error("NORMAL_ACCESS_NOT_PERMITTED");
  }
}

export function assertPasswordChangeFlow(state: IdentityState): void {
  if (!canEnterPasswordChangeFlow(state)) {
    throw new Error("PASSWORD_CHANGE_FLOW_NOT_PERMITTED");
  }
}
