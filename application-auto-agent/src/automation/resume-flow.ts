/**
 * Pure helpers for resume ask / attach / persist decisions.
 * Kept free of DOM so unit tests can lock the product rules.
 */

export type ResumeFlowDecision =
  | 'ATTACH_STORED'
  | 'ASK_USER_TO_SELECT'
  | 'REPORT_ATTACH_FAILURE'
  | 'SKIP_NO_FILE';

export function decideResumeAction(input: {
  hasStoredResume: boolean;
  attachSucceeded: boolean;
  attachAttempts: number;
}): ResumeFlowDecision {
  if (input.hasStoredResume) {
    if (input.attachSucceeded) return 'ATTACH_STORED';
    // Retry is handled by caller; after retries, report failure before re-asking.
    if (input.attachAttempts < 2) return 'REPORT_ATTACH_FAILURE';
    return 'ASK_USER_TO_SELECT';
  }
  return 'ASK_USER_TO_SELECT';
}

export function shouldCreateDuplicateActiveResume(existingActiveCount: number): boolean {
  // Product rule: keep a single active resume; save path deactivates old ones.
  return existingActiveCount === 0;
}

export function isUserScopedResume(ownerUserId: string | null | undefined, authUserId: string | null | undefined): boolean {
  if (!ownerUserId || !authUserId) return false;
  return ownerUserId === authUserId;
}

export const RESUME_AUDIT = {
  NOT_FOUND: 'NO_STORED_FILE',
  SELECTION_RECEIVED: 'FILE_SELECTED',
  UPLOAD_STARTED: 'UPLOAD_STARTED',
  UPLOAD_SUCCESS: 'PROFILE_FILE_SAVED',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  DB_PERSISTED: 'DB_PERSISTED',
  PROFILE_RETURNED: 'PROFILE_HAS_FILE',
  DOWNLOAD_STARTED: 'DOWNLOAD_STARTED',
  DOWNLOAD_SUCCESS: 'DOWNLOAD_OK',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  ATTACH_SUCCESS: 'PROFILE_FILE_ATTACHED',
  ATTACH_FAILED: 'ATTACH_FAILED',
  FILE_NOT_SELECTED: 'FILE_NOT_SELECTED',
} as const;
