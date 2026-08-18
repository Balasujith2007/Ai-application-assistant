import { describe, expect, it } from 'vitest';
import { AgentStateMachine, allowedTransitions } from '../automation/state-machine';
import { bumpNavigation, currentEpoch, isStale } from '../automation/nav-state';

describe('state machine', () => {
  it('starts idle and records history', () => {
    const m = new AgentStateMachine();
    expect(m.getSnapshot().state).toBe('IDLE');
    m.transition('APPLICATION_DETECTED');
    m.pause('CAPTCHA', 'solve it yourself');
    m.resume();
    const snap = m.getSnapshot();
    expect(snap.state).toBe('RESUME');
    expect(snap.history.map((h) => h.state)).toContain('HUMAN_INTERVENTION_REQUIRED');
  });

  it('defines a path from idle to submitted', () => {
    const path = [
      'IDLE', 'APPLICATION_DETECTED', 'ANALYZING', 'CAPTCHA_CHECK', 'FORM_DETECTED',
      'PROFILE_LOADING', 'FIELD_MAPPING', 'AUTOFILLING', 'FINAL_REVIEW', 'USER_CONFIRMATION', 'SUBMITTED',
    ] as const;
    for (let i = 0; i < path.length - 1; i++) {
      expect(allowedTransitions[path[i]]).toContain(path[i + 1]);
    }
  });

  it('allows recovering from ERROR', () => {
    expect(allowedTransitions.ERROR).toContain('IDLE');
    expect(allowedTransitions.ERROR).toContain('APPLICATION_DETECTED');
  });
});

describe('SPA navigation epoch', () => {
  it('does not treat a previous page runner as current after route change', () => {
    const started = currentEpoch();
    expect(isStale(started)).toBe(false);
    bumpNavigation();
    expect(isStale(started)).toBe(true);
    expect(isStale(currentEpoch())).toBe(false);
  });
});
