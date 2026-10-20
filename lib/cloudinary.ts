import { v2 as cloudinary } from 'cloudinary';
import * as crypto from 'crypto';

/**
 * Maximum allowed profile photo upload size in bytes (5 MB)
 */
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Cloudinary configuration resolver.
 * Reads standard CLOUDINARY_* environment variables, with fallback to legacy aliases.
 */
export function getCloudinaryConfig() {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    '';

  const apiKey =
    process.env.CLOUDINARY_API_KEY ||
    process.env['API Key'] ||
    process.env.API_KEY ||
    '';

  const apiSecret =
    process.env.CLOUDINARY_API_SECRET ||
    process.env['API Secret'] ||
    process.env.API_SECRET ||
    '';

  if (!cloudName.trim() || !apiKey.trim() || !apiSecret.trim()) {
    return null;
  }

  return {
    cloud_name: cloudName.trim(),
    api_key: apiKey.trim(),
    api_secret: apiSecret.trim(),
  };
}

/**
 * Checks whether all required Cloudinary environment variables are present.
 */
export function isCloudinaryConfigured(): boolean {
  return getCloudinaryConfig() !== null;
}

/**
 * Magic Bytes validator for image buffers.
 * Validates actual binary file signatures to prevent executable/malicious uploads.
 * Supported formats: JPG/JPEG, PNG, WebP.
 */
export function validateImageMagicBytes(buffer: Buffer): {
  valid: boolean;
  format?: 'jpeg' | 'png' | 'webp';
  mimeType?: string;
  error?: string;
} {
  if (!buffer || buffer.length < 12) {
    return { valid: false, error: 'File is too small or empty to be a valid image.' };
  }

  // 1. JPEG / JPG: 0xFF, 0xD8, 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, format: 'jpeg', mimeType: 'image/jpeg' };
  }

  // 2. PNG: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, format: 'png', mimeType: 'image/png' };
  }

  // 3. WebP: RIFF header (bytes 0-3: 'RIFF') and bytes 8-11: 'WEBP'
  const isRiff =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46;
  const isWebp =
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  if (isRiff && isWebp) {
    return { valid: true, format: 'webp', mimeType: 'image/webp' };
  }

  return {
    valid: false,
    error: 'Unsupported file format or corrupted image. Only JPG/JPEG, PNG, and WebP files are allowed.',
  };
}

/**
 * Computes SHA-256 hash of an image buffer to detect duplicate uploads.
 */
export function computeImageBufferHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Uploads a validated image buffer to Cloudinary using secure server-side upload.
 * Applies facial recognition crop and auto quality/format transformations.
 */
export async function uploadProfilePhotoToCloudinary(
  buffer: Buffer,
  userId: string
): Promise<{ secure_url: string; public_id: string; format: string; width: number; height: number }> {
  const config = getCloudinaryConfig();
  if (!config) {
    throw new Error(
      'Cloudinary is not configured. Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET.'
    );
  }

  cloudinary.config({
    cloud_name: config.cloud_name,
    api_key: config.api_key,
    api_secret: config.api_secret,
    secure: true,
  });

  const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const publicId = `student_${userId}_${uniqueSuffix}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'careerai/student-profiles',
        public_id: publicId,
        overwrite: false,
        resource_type: 'image',
        // Cloudinary Transformations for optimized profile avatar:
        transformation: [
          { width: 500, height: 500, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Upload to Cloudinary failed'));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Deletes an existing profile photo from Cloudinary.
 * Used when replacing or removing a profile photo.
 */
export async function deleteProfilePhotoFromCloudinary(publicId: string): Promise<boolean> {
  if (!publicId) return true;

  const config = getCloudinaryConfig();
  if (!config) {
    console.warn('Cannot delete Cloudinary asset: credentials not configured');
    return false;
  }

  cloudinary.config({
    cloud_name: config.cloud_name,
    api_key: config.api_key,
    api_secret: config.api_secret,
    secure: true,
  });

  try {
    const res = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
    return res.result === 'ok' || res.result === 'not found';
  } catch (err) {
    console.error(`Failed to delete Cloudinary asset "${publicId}":`, err);
    return false;
  }
}
