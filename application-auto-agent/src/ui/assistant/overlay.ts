import type { AgentState, InterventionReason, MachineSnapshot } from '../../automation/state-machine';
import type { FieldClassification } from '../../ai/question-classifier';

export interface MissingQuestion {
  id: string;
  label: string;
  key: string;
  classification: FieldClassification;
  required: boolean;
  placeholder?: string;
  hint?: string;
}

export interface MissingResult {
  answers: Array<{ id: string; key: string; label: string; value: string; classification: FieldClassification }>;
  saveForFuture: boolean;
}

export interface ReviewSummary {
  filled: number;
  detected: number;
  providedByUser: number;
  savedToProfile: number;
  missingRequired: number;
  items: string[];
}

export interface DryRunRow {
  label: string;
  key: string;
  confidence: number;
  action: string;
}

type OverlayApi = {
  renderState: (snap: MachineSnapshot) => void;
  askMissing: (questions: MissingQuestion[]) => Promise<MissingResult>;
  askConflict: (label: string, current: string, incoming: string) => Promise<'UPDATE' | 'ONCE' | 'CANCEL'>;
  showCaptcha: () => void;
  hideCaptcha: () => void;
  confirmCaptchaDone: () => Promise<boolean>;
  showReview: (summary: ReviewSummary) => Promise<boolean>;
  showDryRun: (rows: DryRunRow[]) => Promise<void>;
  askStartAssistant: (score: number, reasons: string[]) => Promise<boolean>;
  showReconnect: (message: string) => Promise<'retry' | 'close'>;
  waitForHuman: (reason: string, detail: string) => Promise<void>;
  setUndoHandler: (fn: (() => void) | null) => void;
  toast: (msg: string) => void;
};

let api: OverlayApi | null = null;

export function getOverlay(): OverlayApi {
  if (api) return api;
  api = mountOverlay();
  return api;
}

function mountOverlay(): OverlayApi {
  const host = document.createElement('div');
  host.id = 'careerai-apply-agent-root';
  host.style.all = 'initial';
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, Segoe UI, sans-serif; }
      .panel {
        position: fixed; right: 16px; bottom: 16px; z-index: 2147483646;
        width: 340px; background: #0f172a; color: #f8fafc; border: 1px solid #334155;
        border-radius: 14px; padding: 14px 16px; box-shadow: 0 18px 40px rgba(0,0,0,.45);
      }
      .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .title { font-weight: 700; font-size: 13px; color: #38bdf8; }
      .state { font-size: 12px; color: #cbd5e1; margin-top: 8px; line-height: 1.45; }
      .pill { font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
        background: #1e293b; color: #93c5fd; border-radius: 999px; padding: 3px 8px; }
      .modal-backdrop {
        position: fixed; inset: 0; z-index: 2147483647; background: rgba(15,23,42,.55);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      .modal { width: min(480px, 100%); background: #fff; color: #0f172a; border-radius: 16px; padding: 20px; }
      h3 { margin: 0 0 8px; font-size: 16px; }
      p, label { font-size: 13px; color: #334155; }
      .q { margin: 12px 0; }
      input[type=text], textarea {
        width: 100%; margin-top: 4px; border: 1px solid #cbd5e1; border-radius: 10px;
        padding: 10px 12px; font-size: 14px;
      }
      textarea { min-height: 88px; resize: vertical; }
      .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
      button { border: 0; border-radius: 10px; padding: 9px 14px; font-weight: 600; cursor: pointer; font-size: 13px; }
      .primary { background: #4f46e5; color: #fff; }
      .ghost { background: #e2e8f0; color: #0f172a; }
      .warn { background: #f59e0b; color: #111; }
      .check { display: flex; gap: 8px; align-items: flex-start; margin-top: 12px; font-size: 13px; }
      .banner {
        position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 2147483646;
        background: #7c2d12; color: #fff7ed; border-radius: 12px; padding: 12px 16px; max-width: 520px;
        border: 1px solid #fb923c; font-size: 13px; font-weight: 600;
      }
      ul { margin: 8px 0 0; padding-left: 18px; font-size: 12px; color: #334155; max-height: 160px; overflow: auto; }
    </style>
    <div class="panel" id="panel">
      <div class="row">
        <div class="title">CareerAI Apply Agent</div>
        <span class="pill" id="pill">IDLE</span>
      </div>
      <div class="state" id="stateText">Waiting for an application page…</div>
      <div class="actions" style="margin-top:10px;justify-content:flex-start">
        <button class="ghost" id="undoBtn" style="display:none">Undo autofill</button>
      </div>
    </div>
    <div id="extra"></div>
  `;

  const pill = shadow.getElementById('pill')!;
  const stateText = shadow.getElementById('stateText')!;
  const extra = shadow.getElementById('extra')!;
  const undoBtn = shadow.getElementById('undoBtn') as HTMLButtonElement;
  let undoHandler: (() => void) | null = null;
  undoBtn.addEventListener('click', () => undoHandler?.());

  function renderState(snap: MachineSnapshot) {
    pill.textContent = snap.state;
    const reason = snap.reason ? ` · ${snap.reason}` : '';
    stateText.textContent = (snap.detail || humanState(snap.state)) + reason;
  }

  function askMissing(questions: MissingQuestion[]): Promise<MissingResult> {
    return new Promise((resolve) => {
      extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h3>Additional information required</h3>
            <p>${questions.length} detail${questions.length === 1 ? '' : 's'} needed before we can continue. We will not invent answers.</p>
            <form id="mf">
              ${questions.map((q) => `
                <div class="q">
                  <label>
                    ${escapeHtml(q.label)}${q.required ? ' *' : ''}
                    ${q.hint ? `<br><small>${escapeHtml(q.hint)}</small>` : ''}
                    ${q.classification === 'SENSITIVE_FIELD' ? '<br><small>Sensitive — you must answer this yourself.</small>' : ''}
                    ${q.classification === 'APPLICATION_SPECIFIC_FIELD' ? '<br><small>Application-specific — not saved to your permanent profile by default.</small>' : ''}
                    ${q.classification === 'APPLICATION_SPECIFIC_FIELD' || (q.label + q.hint || '').length > 80
                      ? `<textarea name="${escapeHtml(q.id)}" placeholder="${escapeHtml(q.placeholder || '')}" ${q.required ? 'required' : ''}></textarea>`
                      : `<input type="text" name="${escapeHtml(q.id)}" placeholder="${escapeHtml(q.placeholder || '')}" ${q.required ? 'required' : ''} />`
                    }
                  </label>
                </div>
              `).join('')}
              <label class="check">
                <input type="checkbox" name="saveFuture" checked />
                <span>Save reusable answers to my CareerAI profile for future applications</span>
              </label>
              <div class="actions">
                <button type="submit" class="primary">Continue</button>
              </div>
            </form>
          </div>
        </div>`;
      extra.querySelector('#mf')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const fd = new FormData(form);
        const saveForFuture = fd.get('saveFuture') === 'on';
        const answers = questions.map((q) => ({
          id: q.id,
          key: q.key,
          label: q.label,
          classification: q.classification,
          value: String(fd.get(q.id) || '').trim(),
        })).filter((a) => a.value);
        extra.innerHTML = '';
        resolve({ answers, saveForFuture });
      });
    });
  }

  function askConflict(label: string, current: string, incoming: string): Promise<'UPDATE' | 'ONCE' | 'CANCEL'> {
    return new Promise((resolve) => {
      extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h3>Update your profile?</h3>
            <p>You already have <strong>${escapeHtml(label)}</strong>: <strong>${escapeHtml(current)}</strong></p>
            <p>You entered: <strong>${escapeHtml(incoming)}</strong></p>
            <div class="actions">
              <button class="primary" id="u">Update profile</button>
              <button class="warn" id="o">Use once</button>
              <button class="ghost" id="c">Cancel</button>
            </div>
          </div>
        </div>`;
      extra.querySelector('#u')?.addEventListener('click', () => { extra.innerHTML = ''; resolve('UPDATE'); });
      extra.querySelector('#o')?.addEventListener('click', () => { extra.innerHTML = ''; resolve('ONCE'); });
      extra.querySelector('#c')?.addEventListener('click', () => { extra.innerHTML = ''; resolve('CANCEL'); });
    });
  }

  function showCaptcha() {
    extra.innerHTML = `<div class="banner">Human verification required. Complete the CAPTCHA on the page. The agent will never solve it for you.</div>`;
  }
  function hideCaptcha() {
    extra.innerHTML = '';
  }
  function confirmCaptchaDone(): Promise<boolean> {
    return new Promise((resolve) => {
      extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h3>Have you completed the verification?</h3>
            <p>We cannot always detect CAPTCHA completion. If you finished the human check, continue. The agent will not bypass it.</p>
            <div class="actions">
              <button class="primary" id="yes">Yes, continue</button>
              <button class="ghost" id="no">Not yet</button>
            </div>
          </div>
        </div>`;
      extra.querySelector('#yes')?.addEventListener('click', () => { extra.innerHTML = ''; resolve(true); });
      extra.querySelector('#no')?.addEventListener('click', () => { extra.innerHTML = ''; resolve(false); });
    });
  }
  function showDryRun(rows: DryRunRow[]): Promise<void> {
    return new Promise((resolve) => {
      extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h3>Dry run — no fields were modified</h3>
            <ul>${rows.map((r) => `<li>${escapeHtml(r.label)} → ${escapeHtml(r.key)} · confidence ${r.confidence.toFixed(2)} · ${escapeHtml(r.action)}</li>`).join('')}</ul>
            <div class="actions"><button class="primary" id="ok">Close</button></div>
          </div>
        </div>`;
      extra.querySelector('#ok')?.addEventListener('click', () => { extra.innerHTML = ''; resolve(); });
    });
  }
  function askStartAssistant(score: number, reasons: string[]): Promise<boolean> {
    return new Promise((resolve) => {
      extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h3>Start Apply Assistant?</h3>
            <p>Application confidence: <strong>${score}%</strong></p>
            <ul>${reasons.slice(0, 8).map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
            <div class="actions">
              <button class="primary" id="go">Start Assistant</button>
              <button class="ghost" id="no">Not now</button>
            </div>
          </div>
        </div>`;
      extra.querySelector('#go')?.addEventListener('click', () => { extra.innerHTML = ''; resolve(true); });
      extra.querySelector('#no')?.addEventListener('click', () => { extra.innerHTML = ''; resolve(false); });
    });
  }
  function showReconnect(message: string): Promise<'retry' | 'close'> {
    return new Promise((resolve) => {
      extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h3>CareerAI connection</h3>
            <p>${escapeHtml(message)}</p>
            <div class="actions">
              <button class="primary" id="r">Retry / Reconnect</button>
              <button class="ghost" id="c">Close</button>
            </div>
          </div>
        </div>`;
      extra.querySelector('#r')?.addEventListener('click', () => { extra.innerHTML = ''; resolve('retry'); });
      extra.querySelector('#c')?.addEventListener('click', () => { extra.innerHTML = ''; resolve('close'); });
    });
  }
  function waitForHuman(reason: string, detail: string): Promise<void> {
    return new Promise((resolve) => {
      extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h3>Automation paused</h3>
            <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
            <p>${escapeHtml(detail)}</p>
            <div class="actions">
              <button class="primary" id="done">Complete</button>
              <button class="ghost" id="resume">Resume automation</button>
            </div>
          </div>
        </div>`;
      extra.querySelector('#done')?.addEventListener('click', () => { extra.innerHTML = ''; resolve(); });
      extra.querySelector('#resume')?.addEventListener('click', () => { extra.innerHTML = ''; resolve(); });
    });
  }
  function setUndoHandler(fn: (() => void) | null) {
    undoHandler = fn;
    undoBtn.style.display = fn ? 'inline-block' : 'none';
  }

  function showReview(summary: ReviewSummary): Promise<boolean> {
    return new Promise((resolve) => {
      extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h3>Application ready</h3>
            <p>✓ ${summary.filled} / ${summary.detected} fields filled<br>
               ✓ ${summary.providedByUser} fields provided by you<br>
               ✓ ${summary.savedToProfile} new profile fields saved<br>
               ${summary.missingRequired ? `⚠ ${summary.missingRequired} required fields still empty` : '✓ 0 required fields missing'}</p>
            <ul>${summary.items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
            <p><strong>The agent will not click Submit.</strong> Review the page, then submit yourself.</p>
            <div class="actions">
              <button class="primary" id="ok">I understand — I will submit</button>
            </div>
          </div>
        </div>`;
      extra.querySelector('#ok')?.addEventListener('click', () => { extra.innerHTML = ''; resolve(true); });
    });
  }

  function toast(msg: string) {
    stateText.textContent = msg;
  }

  return {
    renderState, askMissing, askConflict, showCaptcha, hideCaptcha, confirmCaptchaDone,
    showReview, showDryRun, askStartAssistant, showReconnect, waitForHuman, setUndoHandler, toast,
  };
}

function humanState(s: AgentState): string {
  const map: Record<AgentState, string> = {
    IDLE: 'Waiting…',
    APPLICATION_DETECTED: 'Application page detected',
    ANALYZING: 'Analyzing the page',
    CAPTCHA_CHECK: 'Checking for human verification',
    FORM_DETECTED: 'Form detected',
    PROFILE_LOADING: 'Loading your CareerAI profile',
    FIELD_MAPPING: 'Matching fields to your profile',
    AUTOFILLING: 'Filling known information',
    MISSING_INFORMATION: 'Waiting for information from you',
    HUMAN_INTERVENTION_REQUIRED: 'Paused — your action is needed',
    VALIDATION: 'Checking filled values',
    RESUME: 'Resuming automation',
    NEXT_PAGE: 'Moving to the next page',
    FINAL_REVIEW: 'Ready for your review',
    USER_CONFIRMATION: 'Waiting for you to submit',
    SUBMITTED: 'Submitted by you',
    ERROR: 'Something went wrong',
  };
  return map[s] || s;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export type { InterventionReason };
