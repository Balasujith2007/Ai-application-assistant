export type AgentState =
  | 'IDLE'
  | 'APPLICATION_DETECTED'
  | 'ANALYZING'
  | 'CAPTCHA_CHECK'
  | 'FORM_DETECTED'
  | 'PROFILE_LOADING'
  | 'FIELD_MAPPING'
  | 'AUTOFILLING'
  | 'MISSING_INFORMATION'
  | 'HUMAN_INTERVENTION_REQUIRED'
  | 'VALIDATION'
  | 'RESUME'
  | 'NEXT_PAGE'
  | 'FINAL_REVIEW'
  | 'USER_CONFIRMATION'
  | 'SUBMITTED'
  | 'ERROR';

export type InterventionReason =
  | 'CAPTCHA'
  | 'MISSING_INFORMATION'
  | 'SENSITIVE_QUESTION'
  | 'AMBIGUOUS_FIELD'
  | 'FILE_SELECTION'
  | 'LEGAL_CONFIRMATION'
  | 'WEBSITE_ERROR'
  | 'AUTH_EXPIRED'
  | 'NETWORK_ERROR'
  | 'UNSUPPORTED_WIDGET';

export interface MachineSnapshot {
  state: AgentState;
  reason?: InterventionReason;
  detail?: string;
  history: Array<{ state: AgentState; at: number; detail?: string }>;
}

type Listener = (snap: MachineSnapshot) => void;

export class AgentStateMachine {
  private state: AgentState = 'IDLE';
  private reason?: InterventionReason;
  private detail?: string;
  private history: MachineSnapshot['history'] = [];
  private listeners = new Set<Listener>();

  getSnapshot(): MachineSnapshot {
    return { state: this.state, reason: this.reason, detail: this.detail, history: [...this.history] };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.getSnapshot());
    return () => this.listeners.delete(fn);
  }

  transition(next: AgentState, opts?: { reason?: InterventionReason; detail?: string }) {
    this.state = next;
    this.reason = opts?.reason;
    this.detail = opts?.detail;
    this.history.push({ state: next, at: Date.now(), detail: opts?.detail });
    const snap = this.getSnapshot();
    this.listeners.forEach((l) => l(snap));
  }

  pause(reason: InterventionReason, detail?: string) {
    this.transition('HUMAN_INTERVENTION_REQUIRED', { reason, detail });
  }

  resume(detail?: string) {
    this.transition('RESUME', { detail });
  }

  error(detail: string) {
    this.transition('ERROR', { detail });
  }
}

export const allowedTransitions: Record<AgentState, AgentState[]> = {
  IDLE: ['APPLICATION_DETECTED', 'ERROR'],
  APPLICATION_DETECTED: ['ANALYZING', 'ERROR'],
  ANALYZING: ['CAPTCHA_CHECK', 'ERROR'],
  CAPTCHA_CHECK: ['FORM_DETECTED', 'HUMAN_INTERVENTION_REQUIRED', 'ERROR'],
  FORM_DETECTED: ['PROFILE_LOADING', 'HUMAN_INTERVENTION_REQUIRED', 'ERROR'],
  PROFILE_LOADING: ['FIELD_MAPPING', 'HUMAN_INTERVENTION_REQUIRED', 'ERROR'],
  FIELD_MAPPING: ['AUTOFILLING', 'MISSING_INFORMATION', 'ERROR'],
  AUTOFILLING: ['MISSING_INFORMATION', 'HUMAN_INTERVENTION_REQUIRED', 'VALIDATION', 'NEXT_PAGE', 'FINAL_REVIEW', 'ERROR'],
  VALIDATION: ['NEXT_PAGE', 'FINAL_REVIEW', 'HUMAN_INTERVENTION_REQUIRED', 'ERROR'],
  MISSING_INFORMATION: ['HUMAN_INTERVENTION_REQUIRED', 'AUTOFILLING', 'ERROR'],
  HUMAN_INTERVENTION_REQUIRED: ['RESUME', 'ERROR'],
  RESUME: ['CAPTCHA_CHECK', 'AUTOFILLING', 'FIELD_MAPPING', 'VALIDATION', 'NEXT_PAGE', 'ERROR'],
  NEXT_PAGE: ['ANALYZING', 'CAPTCHA_CHECK', 'FINAL_REVIEW', 'ERROR'],
  FINAL_REVIEW: ['USER_CONFIRMATION', 'ERROR'],
  USER_CONFIRMATION: ['SUBMITTED', 'ERROR'],
  SUBMITTED: ['IDLE'],
  ERROR: ['IDLE', 'APPLICATION_DETECTED'],
};
