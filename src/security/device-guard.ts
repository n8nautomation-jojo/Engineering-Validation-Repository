import type { DeviceIdentity, SecurityEvent } from "./types.js";
import type { OsSecretStore } from "./secret-store.js";
import { computeSha256 } from "./crypto.js";

export class DeviceBindingMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeviceBindingMismatchError";
  }
}

export class DeviceRevokedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeviceRevokedError";
  }
}

export class DeviceSecurityGuard {
  private readonly secretStore: OsSecretStore;
  private readonly processedEvents = new Set<string>();

  constructor(secretStore: OsSecretStore) {
    this.secretStore = secretStore;
  }

  /**
   * Computes a deterministic key binding digest from device hardware/OS parameters.
   */
  public computeKeyBinding(deviceId: string, machineFingerprint: string): string {
    return computeSha256(`DEVICE_BINDING:${deviceId}:${machineFingerprint}`);
  }

  /**
   * Registers or updates a device identity and stores its secret in OS secret store.
   */
  public async registerDevice(
    identity: DeviceIdentity,
    deviceSecret: string,
    machineFingerprint: string
  ): Promise<void> {
    const expectedBinding = this.computeKeyBinding(identity.deviceId, machineFingerprint);
    if (identity.keyBindingDigest !== expectedBinding) {
      throw new DeviceBindingMismatchError(
        `Device registration rejected: keyBindingDigest mismatch for device '${identity.deviceId}'.`
      );
    }
    // Store device secret in OS-backed secret store
    await this.secretStore.setSecret(`DEVICE_KEY:${identity.deviceId}`, deviceSecret);
  }

  /**
   * Verifies that the current execution environment matches the registered device binding.
   * Throws DeviceBindingMismatchError if a copied/cloned database is opened without the correct binding.
   */
  public async verifyDeviceBinding(
    identity: DeviceIdentity,
    currentMachineFingerprint: string
  ): Promise<{ valid: boolean; deviceSecret: string }> {
    // 1. Check if device has been revoked
    if (identity.status === "REVOKED") {
      throw new DeviceRevokedError(
        `Device '${identity.deviceId}' is REVOKED. Access denied to privileged POS operations.`
      );
    }

    // 2. Verify key binding digest
    const expectedBinding = this.computeKeyBinding(identity.deviceId, currentMachineFingerprint);
    if (identity.keyBindingDigest !== expectedBinding) {
      throw new DeviceBindingMismatchError(
        `Device cloning detected: current hardware binding does not match registered binding for '${identity.deviceId}'.`
      );
    }

    // 3. Verify device secret can be retrieved from OS secret store
    const secret = await this.secretStore.getSecret(`DEVICE_KEY:${identity.deviceId}`);
    if (!secret) {
      throw new DeviceBindingMismatchError(
        `Device identity invalid: required OS-backed secret missing for '${identity.deviceId}'. Fail-closed.`
      );
    }

    return { valid: true, deviceSecret: secret };
  }

  /**
   * Evaluates whether a device is allowed to perform privileged operations at timestamp `now`.
   */
  public isPrivilegedAllowed(identity: DeviceIdentity, now: string): boolean {
    if (identity.status === "REVOKED") return false;
    if (identity.revokedAt) {
      const revokedMs = Date.parse(identity.revokedAt);
      const nowMs = Date.parse(now);
      if (Number.isFinite(revokedMs) && Number.isFinite(nowMs) && nowMs >= revokedMs) {
        return false;
      }
    }
    return identity.status === "ACTIVE";
  }

  /**
   * Processes a security event idempotently (SEC-P14).
   * Returns true if processed for the first time, false if duplicate.
   */
  public processSecurityEvent(event: SecurityEvent): boolean {
    if (this.processedEvents.has(event.eventId)) {
      return false; // Idempotent deduplication!
    }
    this.processedEvents.add(event.eventId);
    return true;
  }

  /**
   * Applies revocation to a device identity and returns the revoked identity.
   */
  public applyDeviceRevocation(
    identity: DeviceIdentity,
    revokedAt: string,
    reason?: string
  ): DeviceIdentity {
    return {
      ...identity,
      status: "REVOKED",
      revokedAt,
      ...(reason ? { suspensionReason: reason } : {})
    };
  }
}
