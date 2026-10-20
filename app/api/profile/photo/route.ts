import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import {
  uploadProfilePhotoToCloudinary,
  deleteProfilePhotoFromCloudinary,
  validateImageMagicBytes,
  MAX_PHOTO_SIZE_BYTES,
  isCloudinaryConfigured,
} from '@/lib/cloudinary';

// In-memory rate limiter: max 10 photo uploads/removals per minute per user
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return false;
}

/**
 * GET /api/profile/photo
 * Retrieves the authenticated student's profile photo metadata.
 */
export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { profilePhotoUrl: true, photoPublicId: true },
    });

    return NextResponse.json({
      success: true,
      profilePhotoUrl: profile?.profilePhotoUrl || null,
      photoPublicId: profile?.photoPublicId || null,
    });
  } catch (error: any) {
    console.error('Error fetching profile photo:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/profile/photo
 * Uploads or replaces the authenticated student's profile photo in Cloudinary.
 * Follows a secure upload-first, atomic-update, and old-asset-cleanup pattern.
 */
export async function POST(req: Request) {
  try {
    // 1. Authoritative Server-side Authentication
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please log in.' },
        { status: 401 }
      );
    }

    // 2. Rate Limiting Check
    if (isRateLimited(userId)) {
      return NextResponse.json(
        { success: false, error: 'Too many upload attempts. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    // 3. Parse Multipart Form Data
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { success: false, error: 'Invalid form data payload.' },
        { status: 400 }
      );
    }

    const file = (formData.get('file') || formData.get('image') || formData.get('photo')) as File | null;
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { success: false, error: 'No image file provided in request.' },
        { status: 400 }
      );
    }

    // 5. File Size Validation
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds the 5 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB). Please select a smaller image.`,
        },
        { status: 400 }
      );
    }

    // 6. Magic Bytes Validation (Actual binary inspection, not client-supplied MIME or extension)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const magicValidation = validateImageMagicBytes(buffer);

    if (!magicValidation.valid) {
      return NextResponse.json(
        { success: false, error: magicValidation.error || 'Invalid image format.' },
        { status: 400 }
      );
    }

    // 7. Retrieve existing student profile to prepare for replacement/cleanup
    let existingProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, profilePhotoUrl: true, photoPublicId: true },
    });

    if (!existingProfile) {
      existingProfile = await prisma.profile.create({
        data: { userId },
        select: { id: true, profilePhotoUrl: true, photoPublicId: true },
      });
    }

    const oldPublicId = existingProfile.photoPublicId;

    // 8. Ensure Cloudinary is configured before attempting upload
    if (!isCloudinaryConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cloudinary is not configured on the server. Please check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
        },
        { status: 503 }
      );
    }

    // 9. Upload to Cloudinary with facial-detection cropping & optimization
    let uploadResult: { secure_url: string; public_id: string };
    try {
      uploadResult = await uploadProfilePhotoToCloudinary(buffer, userId);
    } catch (uploadErr: any) {
      console.error('Cloudinary upload failure:', uploadErr);
      return NextResponse.json(
        {
          success: false,
          error: uploadErr.message || 'Image upload failed. Please try again.',
        },
        { status: 502 }
      );
    }

    // 9. Persist photo metadata to Database
    let updatedProfile;
    try {
      updatedProfile = await prisma.profile.update({
        where: { userId },
        data: {
          profilePhotoUrl: uploadResult.secure_url,
          photoPublicId: uploadResult.public_id,
        },
        select: {
          id: true,
          userId: true,
          profilePhotoUrl: true,
          photoPublicId: true,
          updatedAt: true,
        },
      });
    } catch (dbErr: any) {
      console.error('Database update failed after Cloudinary upload. Cleaning up orphaned image:', dbErr);
      // Clean up orphaned Cloudinary asset to avoid dangling files
      await deleteProfilePhotoFromCloudinary(uploadResult.public_id);
      return NextResponse.json(
        { success: false, error: 'Database error saving photo metadata. Please try again.' },
        { status: 500 }
      );
    }

    // 10. Clean up previous Cloudinary asset ONLY after DB update is successfully committed
    if (oldPublicId && oldPublicId !== uploadResult.public_id) {
      deleteProfilePhotoFromCloudinary(oldPublicId).catch((cleanupErr) =>
        console.warn('Background cleanup of old photo warning:', cleanupErr)
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile photo uploaded successfully.',
      profilePhotoUrl: updatedProfile.profilePhotoUrl,
      photoPublicId: updatedProfile.photoPublicId,
    });
  } catch (error: any) {
    console.error('Unexpected error in profile photo upload:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'An unexpected error occurred during photo upload.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profile/photo
 * Removes the authenticated student's profile photo from database and Cloudinary.
 */
export async function DELETE(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please log in.' },
        { status: 401 }
      );
    }

    if (isRateLimited(userId)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    const existingProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { profilePhotoUrl: true, photoPublicId: true },
    });

    if (!existingProfile?.profilePhotoUrl && !existingProfile?.photoPublicId) {
      return NextResponse.json({
        success: true,
        message: 'No profile photo found to remove.',
        profilePhotoUrl: null,
      });
    }

    const oldPublicId = existingProfile.photoPublicId;

    // 1. Clear database fields first
    try {
      await prisma.profile.update({
        where: { userId },
        data: {
          profilePhotoUrl: null,
          photoPublicId: null,
        },
      });
    } catch (dbErr: any) {
      console.error('Database update failed during photo removal:', dbErr);
      return NextResponse.json(
        { success: false, error: 'Failed to update profile in database. Photo was preserved.' },
        { status: 500 }
      );
    }

    // 2. Clean up Cloudinary asset after database update succeeds
    if (oldPublicId) {
      deleteProfilePhotoFromCloudinary(oldPublicId).catch((err) =>
        console.warn('Background deletion of removed photo warning:', err)
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile photo removed successfully.',
      profilePhotoUrl: null,
      photoPublicId: null,
    });
  } catch (error: any) {
    console.error('Unexpected error removing profile photo:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'An unexpected error occurred removing the photo.' },
      { status: 500 }
    );
  }
}
