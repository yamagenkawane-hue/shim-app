import crypto from "crypto";

const algorithm = "scrypt";
const keyLength = 64;

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt);
  return `${algorithm}$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [storedAlgorithm, salt, hash] = storedHash.split("$");
  if (storedAlgorithm !== algorithm || !salt || !hash) return false;
  const derived = await scrypt(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), derived);
}

function scrypt(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, keyLength, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}
