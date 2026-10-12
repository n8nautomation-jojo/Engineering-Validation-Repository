import * as fs from "node:fs";
import * as path from "node:path";
import { encryptAes256Gcm, decryptAes256Gcm, deriveKey32, type EncryptedPayload } from "./crypto.js";

export class SecurityKeyUnavailableError extends Error {
  constructor(message: string, public readonly keyId?: string) {
    super(message);
    this.name = "SecurityKeyUnavailableError";
  }
}

export interface OsSecretStore {
  getSecret(keyId: string): Promise<string | null>;
  setSecret(keyId: string, secret: string): Promise<void>;
  deleteSecret(keyId: string): Promise<void>;
  hasSecret(keyId: string): Promise<boolean>;
}

/**
 * In-memory secret store for testing and ephemeral execution.
 */
export class MemorySecretStore implements OsSecretStore {
  private readonly secrets = new Map<string, string>();
  private failureInjected = false;

  public injectFailure(fail: boolean): void {
    this.failureInjected = fail;
  }

  async getSecret(keyId: string): Promise<string | null> {
    if (this.failureInjected) {
      throw new SecurityKeyUnavailableError(`OS secret store failure: key '${keyId}' cannot be retrieved.`, keyId);
    }
    return this.secrets.get(keyId) ?? null;
  }

  async setSecret(keyId: string, secret: string): Promise<void> {
    if (this.failureInjected) {
      throw new SecurityKeyUnavailableError(`OS secret store failure: cannot set key '${keyId}'.`, keyId);
    }
    this.secrets.set(keyId, secret);
  }

  async deleteSecret(keyId: string): Promise<void> {
    this.secrets.delete(keyId);
  }

  async hasSecret(keyId: string): Promise<boolean> {
    if (this.failureInjected) {
      throw new SecurityKeyUnavailableError(`OS secret store failure.`, keyId);
    }
    return this.secrets.has(keyId);
  }
}

/**
 * Windows-compatible encrypted local vault simulating OS-protected credential store.
 * Encrypts all secrets on disk using AES-256-GCM authenticated encryption bound
 * to the machine/hardware salt.
 * 
 * Invariant: SEC-P06 — Fail-closed behavior on missing or unreadable secrets; NO plaintext fallback.
 */
export class WindowsProtectedSecretStore implements OsSecretStore {
  private readonly vaultPath: string;
  private readonly masterKey: Buffer;

  constructor(vaultPath: string, machineSecret: string) {
    this.vaultPath = vaultPath;
    this.masterKey = deriveKey32(`WINDOWS_OS_BOUND_VAULT:${machineSecret}`);
  }

  private readVault(): Record<string, EncryptedPayload> {
    if (!fs.existsSync(this.vaultPath)) {
      return {};
    }
    try {
      const raw = fs.readFileSync(this.vaultPath, "utf8");
      return JSON.parse(raw);
    } catch (err) {
      throw new SecurityKeyUnavailableError(
        `OS secret store corrupted or inaccessible at '${this.vaultPath}'. Fail-closed: ${String(err)}`
      );
    }
  }

  private writeVault(vault: Record<string, EncryptedPayload>): void {
    const dir = path.dirname(this.vaultPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.vaultPath, JSON.stringify(vault, null, 2), "utf8");
  }

  async getSecret(keyId: string): Promise<string | null> {
    const vault = this.readVault();
    const entry = vault[keyId];
    if (!entry) return null;

    try {
      return decryptAes256Gcm(entry, this.masterKey);
    } catch (err) {
      // Authenticated tag mismatch or corruption detected -> Fail closed!
      throw new SecurityKeyUnavailableError(
        `Failed to decrypt secret '${keyId}'. Integrity tag verification failed or key unavailable.`,
        keyId
      );
    }
  }

  async setSecret(keyId: string, secret: string): Promise<void> {
    const vault = this.readVault();
    const encrypted = encryptAes256Gcm(secret, this.masterKey);
    vault[keyId] = encrypted;
    this.writeVault(vault);
  }

  async deleteSecret(keyId: string): Promise<void> {
    const vault = this.readVault();
    if (keyId in vault) {
      delete vault[keyId];
      this.writeVault(vault);
    }
  }

  async hasSecret(keyId: string): Promise<boolean> {
    const vault = this.readVault();
    return keyId in vault;
  }
}
