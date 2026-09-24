import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard for GCM
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.EMAIL_SYNC_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "career-ai-email-sync-secret-key-32b!";
  // Generate 32-byte key from the secret
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return "";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine iv + authTag + encrypted into single base64 string
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypt a base64 ciphertext string using AES-256-GCM
 */
export function decryptToken(cipherText: string): string {
  if (!cipherText) return "";
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(cipherText, "base64");

    if (combined.length < IV_LENGTH + TAG_LENGTH) {
      throw new Error("Ciphertext too short");
    }

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Token decryption error:", error);
    return "";
  }
}
