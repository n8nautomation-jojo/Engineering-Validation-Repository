import crypto from 'node:crypto';

export function canonical(value) {
  return JSON.stringify(value, Object.keys(value).sort());
}

export function digest(value) {
  return crypto.createHash('sha256').update(canonical(value)).digest('hex');
}

export function generateDeviceIdentity() {
  return { deviceId: crypto.randomUUID(), publicId: crypto.randomBytes(16).toString('hex') };
}

export function createKey() {
  return crypto.randomBytes(32);
}

export function encrypt(key, plaintext, aad='') {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
  return { iv: iv.toString('base64'), ciphertext: ciphertext.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}

export function decrypt(key, sealed, aad='') {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(sealed.iv,'base64'));
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(Buffer.from(sealed.tag,'base64'));
  return Buffer.concat([decipher.update(Buffer.from(sealed.ciphertext,'base64')), decipher.final()]).toString();
}

export function verifySnapshot(snapshot, key, expectedDeviceId, now) {
  if (snapshot.deviceId !== expectedDeviceId) return false;
  if (now >= snapshot.expiresAt) return false;
  const payload = {...snapshot, mac: undefined};
  const expected = crypto.createHmac('sha256', key).update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(snapshot.mac), Buffer.from(expected));
}

export function signSnapshot(snapshot, key) {
  const payload = {...snapshot, mac: undefined};
  return {...snapshot, mac: crypto.createHmac('sha256', key).update(JSON.stringify(payload)).digest('hex')};
}

export function idempotentProcessor() {
  const seen = new Set();
  return eventId => seen.has(eventId) ? false : (seen.add(eventId), true);
}
