import { isOpportunityOpen, getNormalizedDeadline } from './utils';

export type StudentRegistrationStatus =
  | 'NOT_REGISTERED'
  | 'STARTED'
  | 'INITIATED'
  | 'IN_PROGRESS'
  | 'STUDENT_CONFIRMED'
  | 'VERIFIED'
  | 'REGISTERED'
  | 'SHORTLISTED'
  | 'SELECTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'COMPLETED';

export interface OpportunityRegistrationStateInfo {
  isOpen: boolean;
  isClosed: boolean;
  registrationStatus: StudentRegistrationStatus;
  buttonText: string;
  isButtonDisabled: boolean;
  badgeText: string;
  badgeVariant: 'open' | 'closed' | 'verified' | 'student_confirmed' | 'in_progress' | 'registered' | 'shortlisted' | 'selected' | 'rejected' | 'initiated' | 'completed';
}

/**
 * Single source of truth for calculating opportunity availability & student registration status.
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
  const rawStatus = (registration?.status || userRegistrationStatus || '').toUpperCase();
  let registrationStatus: StudentRegistrationStatus = 'NOT_REGISTERED';

  if (rawStatus === 'VERIFIED') registrationStatus = 'VERIFIED';
  else if (rawStatus === 'STUDENT_CONFIRMED') registrationStatus = 'STUDENT_CONFIRMED';
  else if (rawStatus === 'IN_PROGRESS') registrationStatus = 'IN_PROGRESS';
  else if (rawStatus === 'STARTED') registrationStatus = 'STARTED';
  else if (rawStatus === 'REGISTERED') registrationStatus = 'REGISTERED';
  else if (rawStatus === 'SHORTLISTED') registrationStatus = 'SHORTLISTED';
  else if (rawStatus === 'SELECTED') registrationStatus = 'SELECTED';
  else if (rawStatus === 'REJECTED') registrationStatus = 'REJECTED';
  else if (rawStatus === 'WITHDRAWN') registrationStatus = 'WITHDRAWN';
  else if (rawStatus === 'INITIATED') registrationStatus = 'INITIATED';
  else if (rawStatus === 'COMPLETED') registrationStatus = 'COMPLETED';

  // Compute exact button labels and states
  let buttonText = 'Apply Now';
  let isButtonDisabled = false;
  let badgeText = isOpen ? 'Open' : 'Closed';
  let badgeVariant: OpportunityRegistrationStateInfo['badgeVariant'] = isOpen ? 'open' : 'closed';

  if (registrationStatus === 'VERIFIED') {
    buttonText = 'Verified ✓';
    isButtonDisabled = false;
    badgeText = 'Verified ✓';
    badgeVariant = 'verified';
  } else if (registrationStatus === 'STUDENT_CONFIRMED') {
    buttonText = 'Student Confirmed';
    isButtonDisabled = false;
    badgeText = 'Student Confirmed';
    badgeVariant = 'student_confirmed';
  } else if (registrationStatus === 'IN_PROGRESS' || registrationStatus === 'STARTED' || registrationStatus === 'INITIATED') {
    if (isOpen) {
      buttonText = 'Verify Registration';
      isButtonDisabled = false;
      badgeText = registrationStatus === 'IN_PROGRESS' ? 'In Progress' : 'Started';
      badgeVariant = registrationStatus === 'IN_PROGRESS' ? 'in_progress' : 'initiated';
    } else {
      buttonText = 'Registration Incomplete';
      isButtonDisabled = true;
      badgeText = 'Closed';
      badgeVariant = 'closed';
    }
  } else if (registrationStatus === 'REGISTERED') {
    buttonText = 'Registered ✓';
    isButtonDisabled = false;
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
): string {
  if (!registration || !registration.status) return 'NOT_REGISTERED';

  const regStatus = registration.status;

  if (regStatus === 'COMPLETED' || !!registration.completedAt) {
    return 'COMPLETED';
  }

  if (regStatus === 'VERIFIED') return 'VERIFIED';
  if (regStatus === 'STUDENT_CONFIRMED') return 'STUDENT_CONFIRMED';
  if (regStatus === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (regStatus === 'STARTED' || regStatus === 'INITIATED') return 'STARTED';
  if (regStatus === 'REJECTED' || regStatus === 'WITHDRAWN') return regStatus;

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
