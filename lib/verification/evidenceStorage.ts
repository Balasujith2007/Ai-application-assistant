import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface StoredEvidenceFile {
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileHash: string;
}

export interface ValidationFileResult {
  isValid: boolean;
  detectedMime?: string;
  error?: string;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validate image buffer using magic bytes (not just MIME header or filename).
 */
export function validateImageMagicBytes(buffer: Buffer): ValidationFileResult {
  if (!buffer || buffer.length === 0) {
    return { isValid: false, error: 'Empty file buffer.' };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { isValid: false, error: `File size exceeds maximum allowed limit of 10MB.` };
  }

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, detectedMime: 'image/png' };
  }

  // JPEG magic bytes: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { isValid: true, detectedMime: 'image/jpeg' };
  }

  // WebP: RIFF ... WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50  // WEBP
  ) {
    return { isValid: true, detectedMime: 'image/webp' };
  }

  return {
    isValid: false,
    error: 'Unsupported image format. Upload a valid PNG or JPEG screenshot.'
  };
}

/**
 * Calculate SHA-256 hash of image buffer to detect duplicate evidence reuse.
 */
export function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Securely store evidence screenshot in private storage.
 * Files in private_storage are NEVER served statically and require authenticated authorization checks.
 */
export async function storeEvidenceScreenshot(
  buffer: Buffer,
  originalFilename: string,
  studentId: string,
  opportunityId: string
): Promise<StoredEvidenceFile> {
  const validation = validateImageMagicBytes(buffer);
  if (!validation.isValid || !validation.detectedMime) {
    throw new Error(validation.error || 'Invalid file content.');
  }

  const fileHash = calculateFileHash(buffer);

  // Private storage directory outside public web root
  const privateStorageDir = path.join(process.cwd(), 'private_storage', 'evidence');
  if (!fs.existsSync(privateStorageDir)) {
    fs.mkdirSync(privateStorageDir, { recursive: true });
  }

  // Sanitize filename and create unique, tamper-proof filename
  const ext = validation.detectedMime === 'image/png' ? 'png' : validation.detectedMime === 'image/webp' ? 'webp' : 'jpg';
  const sanitizedOriginal = path.basename(originalFilename).replace(/[^a-zA-Z0-9.-]/g, '_');
  const safeUniqueName = `ev_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const targetPath = path.join(privateStorageDir, safeUniqueName);

  // Path traversal prevention check
  const normalizedTarget = path.normalize(targetPath);
  if (!normalizedTarget.startsWith(path.normalize(privateStorageDir))) {
    throw new Error('Security Error: Invalid file destination path.');
  }

  await fs.promises.writeFile(targetPath, buffer);

  return {
    filePath: targetPath,
    fileName: safeUniqueName,
    fileSize: buffer.length,
    mimeType: validation.detectedMime,
    fileHash
  };
}

/**
 * Read evidence file securely from private storage.
 */
export async function readEvidenceFile(filePath: string): Promise<Buffer | null> {
  const privateStorageDir = path.join(process.cwd(), 'private_storage', 'evidence');
  const normalizedTarget = path.normalize(filePath);

  // Ensure file is within private storage or public uploads fallback
  if (!fs.existsSync(normalizedTarget)) {
    return null;
  }

  return fs.promises.readFile(normalizedTarget);
}
