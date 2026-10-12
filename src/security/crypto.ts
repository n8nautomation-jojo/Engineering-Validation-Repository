import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

/**
 * Deterministic JSON stringifier to guarantee identical digests regardless of property insertion order.
 */
export function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJsonStringify).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const pairs = keys
    .filter(k => obj[k] !== undefined)
    .map(k => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`);
  return "{" + pairs.join(",") + "}";
}

/**
 * Computes SHA-256 digest of payload.
 */
export function computeSha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Computes HMAC-SHA-256 signature for canonical data payload.
 */
export function computeHmacSha256(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data, "utf8").digest("hex");
}

/**
 * Securely compares two hex strings in constant time to prevent timing attacks.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) {
    diff |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return diff === 0;
}

export interface EncryptedPayload {
  readonly ciphertext: string; // Base64
  readonly iv: string;         // Hex
  readonly tag: string;        // Hex
}

/**
 * Encrypts a plaintext string using AES-256-GCM authenticated encryption.
 */
export function encryptAes256Gcm(plaintext: string, key32Bytes: Buffer): EncryptedPayload {
  const iv = randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = createCipheriv("aes-256-gcm", key32Bytes, iv);
  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");
  const tag = cipher.getAuthTag().toString("hex");
  return {
    ciphertext,
    iv: iv.toString("hex"),
    tag
  };
}

/**
 * Decrypts an AES-256-GCM payload and verifies authentication tag.
 * Throws error if tag does not match or data was tampered with.
 */
export function decryptAes256Gcm(payload: EncryptedPayload, key32Bytes: Buffer): string {
  const decipher = createDecipheriv("aes-256-gcm", key32Bytes, Buffer.from(payload.iv, "hex"));
  decipher.setAuthTag(Buffer.from(payload.tag, "hex"));
  let plaintext = decipher.update(payload.ciphertext, "base64", "utf8");
  plaintext += decipher.final("utf8");
  return plaintext;
}

/**
 * Derives a 32-byte key from a secret string using SHA-256.
 */
export function deriveKey32(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}
