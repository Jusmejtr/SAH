import crypto from "node:crypto";

const CODE_ALPHABET = "23456789BCDFGHJKMNPQRTVWXY";

const decodeSharedSecret = (sharedSecret) => {
  const value = String(sharedSecret ?? "").trim();
  if (!value) throw new Error("Account has no shared secret.");

  if (/^[0-9a-f]{40}$/i.test(value)) return Buffer.from(value, "hex");

  const buffer = Buffer.from(value, "base64");
  if (buffer.length !== 20) {
    throw new Error("Shared secret is not a valid Steam secret.");
  }
  return buffer;
};

export const generateGuardCode = (sharedSecret, atMs = Date.now()) => {
  const secret = decodeSharedSecret(sharedSecret);
  const counter = Math.floor(atMs / 1000 / 30);

  const message = Buffer.alloc(8);
  message.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  message.writeUInt32BE(counter >>> 0, 4);

  const hmac = crypto.createHmac("sha1", secret).update(message).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  let fullCode = hmac.readUInt32BE(offset) & 0x7fffffff;

  let code = "";
  for (let i = 0; i < 5; i += 1) {
    code += CODE_ALPHABET[fullCode % CODE_ALPHABET.length];
    fullCode = Math.floor(fullCode / CODE_ALPHABET.length);
  }
  return code;
};

export const secondsRemaining = (atMs = Date.now()) =>
  30 - (Math.floor(atMs / 1000) % 30);
