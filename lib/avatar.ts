/**
 * Utilities for cleaning, optimizing, and presenting profile avatar URLs
 * ensuring maximum clarity, retina sharpness, and face-centered cropping.
 */

/**
 * Returns a high-definition, properly formatted avatar URL.
 * If the URL is hosted on Cloudinary:
 * - Strips low-resolution legacy transforms (e.g. w_64, w_100)
 * - Injects high-quality transforms: facial gravity (g_face), best auto-quality (q_auto:best),
 *   auto-format (f_auto), and appropriate dimensions (at least 2x-3x display size for Retina).
 * If the URL is a local disk upload or external URL, returns it directly.
 */
export function getCleanProfilePhotoUrl(
  url: string | null | undefined,
  targetResolution: number = 400
): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Cloudinary URL enhancement
  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/image/upload/')) {
    try {
      const uploadToken = '/image/upload/';
      const uploadIdx = trimmed.indexOf(uploadToken);
      const prefix = trimmed.substring(0, uploadIdx + uploadToken.length);
      let rest = trimmed.substring(uploadIdx + uploadToken.length);

      // Check if URL currently has Cloudinary transformation parameters
      // e.g. c_fill,w_64,h_64,g_face,q_auto,f_auto/
      const transformPrefixRegex = /^(?:(?:[a-z]{1,3}_[a-zA-Z0-9:]+,?)+\/)+/;
      if (transformPrefixRegex.test(rest)) {
        rest = rest.replace(transformPrefixRegex, '');
      }

      // Ensure resolution is at least 300px for crispness on Retina/Hi-DPI displays
      const res = Math.max(targetResolution, 300);
      const optimizedTransform = `c_fill,w_${res},h_${res},g_face,q_auto:best,f_auto/`;

      return `${prefix}${optimizedTransform}${rest}`;
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}
