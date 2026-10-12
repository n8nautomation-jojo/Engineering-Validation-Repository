import type { DeviceId } from "../kernel/identifiers.js";
import type { IntegritySealedRecord, TamperCheckResult } from "./types.js";
import {
  canonicalJsonStringify,
  computeHmacSha256,
  timingSafeEqualHex,
  encryptAes256Gcm,
  decryptAes256Gcm,
  deriveKey32,
  type EncryptedPayload
} from "./crypto.js";

export class TamperDetectedError extends Error {
  constructor(message: string, public readonly recordId?: string) {
    super(message);
    this.name = "TamperDetectedError";
  }
}

export class PosTamperGuard {
  /**
   * Seals a record with an HMAC-SHA-256 integrity seal over its canonical JSON content.
   */
  public sealRecord<T>(
    payload: T,
    keyId: string,
    secret: string,
    deviceId: DeviceId,
    now: string
  ): IntegritySealedRecord<T> {
    const canonical = canonicalJsonStringify({
      payload,
      keyId,
      deviceId
    });
    const digest = computeHmacSha256(canonical, secret);
    return {
      payload,
      digest,
      keyId,
      sealedAt: now,
      deviceId
    };
  }

  /**
   * Verifies an integrity sealed record.
   * Returns true if valid, false if tampered or altered.
   */
  public verifyRecordSeal<T>(
    sealed: IntegritySealedRecord<T>,
    secret: string
  ): boolean {
    const canonical = canonicalJsonStringify({
      payload: sealed.payload,
      keyId: sealed.keyId,
      deviceId: sealed.deviceId
    });
    const expectedDigest = computeHmacSha256(canonical, secret);
    return timingSafeEqualHex(sealed.digest, expectedDigest);
  }

  /**
   * Validates integrity across a list of sealed records.
   * Returns TamperCheckResult with details of any tampered records.
   */
  public validateBatchIntegrity<T extends Record<string, unknown>>(
    records: readonly IntegritySealedRecord<T>[],
    secret: string
  ): TamperCheckResult {
    const tamperedIds: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      if (!record) continue;
      const valid = this.verifyRecordSeal(record, secret);
      if (!valid) {
        const id = (record.payload["id"] as string) || `record-index-${i}`;
        tamperedIds.push(id);
      }
    }

    if (tamperedIds.length > 0) {
      return {
        passed: false,
        totalChecked: records.length,
        tamperedCount: tamperedIds.length,
        tamperedRecordIds: tamperedIds,
        reason: `Integrity check failed: ${tamperedIds.length} records tampered or altered.`
      };
    }

    return {
      passed: true,
      totalChecked: records.length,
      tamperedCount: 0,
      tamperedRecordIds: []
    };
  }

  /**
   * Encrypts a sensitive record payload into an authenticated ciphertext (AES-256-GCM).
   */
  public encryptSensitivePayload(plaintext: string, secret: string): EncryptedPayload {
    const key = deriveKey32(secret);
    return encryptAes256Gcm(plaintext, key);
  }

  /**
   * Decrypts an authenticated ciphertext.
   * Throws TamperDetectedError if the ciphertext, IV, or tag was manipulated in the database.
   */
  public decryptSensitivePayload(payload: EncryptedPayload, secret: string, recordId?: string): string {
    const key = deriveKey32(secret);
    try {
      return decryptAes256Gcm(payload, key);
    } catch (err) {
      throw new TamperDetectedError(
        `Confidential record decryption failed: authentication tag verification failed. Data tampering detected!`,
        recordId
      );
    }
  }
}
