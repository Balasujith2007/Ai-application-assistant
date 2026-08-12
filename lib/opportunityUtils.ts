import { isOpportunityOpen, getNormalizedDeadline } from './utils';

export type StudentRegistrationStatus =
  | 'NOT_REGISTERED'
  | 'INITIATED'
  | 'REGISTERED'
  | 'SHORTLISTED'
  | 'SELECTED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface OpportunityRegistrationStateInfo {
  isOpen: boolean;
  isClosed: boolean;
  registrationStatus: StudentRegistrationStatus;
  buttonText: string;
  isButtonDisabled: boolean;
  badgeText: string;
  badgeVariant: 'open' | 'closed' | 'registered' | 'shortlisted' | 'selected' | 'rejected' | 'initiated';
}

/**
 * Single source of truth for calculating opportunity availability & student registration status.
 *
 * Rules:
 * 1. Opportunity availability (OPEN vs CLOSED) is based strictly on:
 *    - opportunity.status !== 'CLOSED'
 *    - AND normalized applicationDeadline has not passed.
 * 2. Student registration status is handled independently.
 * 3. Registered / Shortlisted / Selected students ALWAYS see "Registered ✓" / "Shortlisted ✓" / "Selected ✓",
 *    even if the opportunity is closed or past deadline.
 */
export function getOpportunityRegistrationState(
  opportunity: {
    applicationDeadline?: string | Date | null;
    deadline?: string | Date | null;
    status?: string | null;
  } | null | undefined,
  registration?: {
    status?: string | null;
  } | null,
  userRegistrationStatus?: string | null
): OpportunityRegistrationStateInfo {
  const deadlineVal = opportunity?.applicationDeadline || opportunity?.deadline;
  const oppStatus = opportunity?.status;

  const isOpen = isOpportunityOpen(deadlineVal, oppStatus);
  const isClosed = !isOpen;

  // Determine student registration status
  const rawStatus = registration?.status || userRegistrationStatus;
  let registrationStatus: StudentRegistrationStatus = 'NOT_REGISTERED';

  if (rawStatus === 'REGISTERED') registrationStatus = 'REGISTERED';
  else if (rawStatus === 'SHORTLISTED') registrationStatus = 'SHORTLISTED';
  else if (rawStatus === 'SELECTED') registrationStatus = 'SELECTED';
  else if (rawStatus === 'REJECTED') registrationStatus = 'REJECTED';
  else if (rawStatus === 'WITHDRAWN') registrationStatus = 'WITHDRAWN';
  else if (rawStatus === 'INITIATED') registrationStatus = 'INITIATED';

  // Compute exact button labels and states
  let buttonText = 'Apply Now';
  let isButtonDisabled = false;
  let badgeText = isOpen ? 'Open' : 'Closed';
  let badgeVariant: OpportunityRegistrationStateInfo['badgeVariant'] = isOpen ? 'open' : 'closed';

  if (registrationStatus === 'REGISTERED') {
    buttonText = 'Registered ✓';
    isButtonDisabled = false; // allow viewing/clicking
    badgeText = 'Registered ✓';
    badgeVariant = 'registered';
  } else if (registrationStatus === 'SHORTLISTED') {
    buttonText = 'Shortlisted ✓';
    isButtonDisabled = false;
    badgeText = 'Shortlisted ✓';
    badgeVariant = 'shortlisted';
  } else if (registrationStatus === 'SELECTED') {
    buttonText = 'Selected ✓';
    isButtonDisabled = false;
    badgeText = 'Selected ✓';
    badgeVariant = 'selected';
  } else if (registrationStatus === 'REJECTED') {
    buttonText = 'Application Rejected';
    isButtonDisabled = true;
    badgeText = 'Rejected';
    badgeVariant = 'rejected';
  } else if (registrationStatus === 'INITIATED') {
    if (isOpen) {
      buttonText = 'Continue Registration';
      isButtonDisabled = false;
      badgeText = 'Registration Pending';
      badgeVariant = 'initiated';
    } else {
      buttonText = 'Registration Incomplete';
      isButtonDisabled = true;
      badgeText = 'Closed';
      badgeVariant = 'closed';
    }
  } else {
    // NOT_REGISTERED
    if (isOpen) {
      buttonText = 'Apply Now';
      isButtonDisabled = false;
      badgeText = 'Open';
      badgeVariant = 'open';
    } else {
      buttonText = 'Application Closed';
      isButtonDisabled = true;
      badgeText = 'Closed';
      badgeVariant = 'closed';
    }
  }

  return {
    isOpen,
    isClosed,
    registrationStatus,
    buttonText,
    isButtonDisabled,
    badgeText,
    badgeVariant
  };
}

/**
 * Dynamic calculation of student participation status (REGISTERED, ONGOING, COMPLETED).
 * Rules:
 * - If manually completed (completedAt exists or status === 'COMPLETED'), status = COMPLETED.
 * - Else if registered (status === 'REGISTERED' or 'SHORTLISTED' or 'SELECTED'):
 *   - If opportunity.endDate has passed, status = COMPLETED.
 *   - Else if opportunity.startDate has arrived (now >= startDate), status = ONGOING.
 *   - Otherwise = REGISTERED.
 */
export function getStudentOpportunityStatus(
  opportunity?: {
    startDate?: string | Date | null;
    endDate?: string | Date | null;
  } | null,
  registration?: {
    status?: string | null;
    completedAt?: string | Date | null;
  } | null
): 'NOT_REGISTERED' | 'INITIATED' | 'REGISTERED' | 'ONGOING' | 'COMPLETED' | 'SHORTLISTED' | 'SELECTED' | 'REJECTED' | 'WITHDRAWN' {
  if (!registration || !registration.status) return 'NOT_REGISTERED';

  const regStatus = registration.status;

  if (regStatus === 'COMPLETED' || !!registration.completedAt) {
    return 'COMPLETED';
  }

  if (regStatus === 'REJECTED' || regStatus === 'WITHDRAWN' || regStatus === 'INITIATED') {
    return regStatus as any;
  }

  const now = new Date().getTime();

  if (opportunity?.endDate) {
    const end = getNormalizedDeadline(opportunity.endDate);
    if (end && now > end.getTime()) {
      return 'COMPLETED';
    }
  }

  if (opportunity?.startDate) {
    const start = new Date(opportunity.startDate);
    if (!isNaN(start.getTime()) && now >= start.getTime()) {
      return 'ONGOING';
    }
  }

  if (regStatus === 'SHORTLISTED') return 'SHORTLISTED';
  if (regStatus === 'SELECTED') return 'SELECTED';
  return 'REGISTERED';
}

