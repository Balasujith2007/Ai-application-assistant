import { badgeEngine } from './badgeEngine';

/**
 * Backend badge triggers
 * ----------------------
 * Career-event endpoints call these after a *verified* career mutation so
 * badges are awarded from real platform records. Badge work is best-effort and
 * never allowed to break the primary request, and the engine itself is fully
 * idempotent + concurrency-safe, so duplicate calls are harmless.
 *
 * Badges are ALWAYS evaluated from backend-gathered, verified statistics —
 * frontend clients can never award themselves a badge.
 */

/** Evaluates and awards eligible badges for a student. Never throws. */
export async function triggerBadgeEvaluation(studentId: string): Promise<void> {
  try {
    await badgeEngine.evaluateAndAwardBadges(studentId);
  } catch (error) {
    console.error('[badgeTriggers] evaluation failed:', error);
  }
}

/**
 * Records a *qualifying* career activity (streak engine) and then evaluates
 * badges. Non-qualifying activity types are ignored by the engine, so passing a
 * meaningless action never extends a streak. Never throws.
 */
export async function recordCareerActivity(
  studentId: string,
  activityType: string,
  sourceReference?: string
): Promise<void> {
  try {
    await badgeEngine.recordDailyActivity(studentId, activityType, sourceReference);
    await badgeEngine.evaluateAndAwardBadges(studentId);
  } catch (error) {
    console.error('[badgeTriggers] activity + evaluation failed:', error);
  }
}
