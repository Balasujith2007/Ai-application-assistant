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
  currentValue?: string;
}

export interface MissingResult {
  answers: Array<{
    id: string;
    key: string;
    label: string;
    value: string;
    classification: FieldClassification;
    saveMode: 'SAVE' | 'USE_ONCE';
  }>;
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
  /** Dedicated resume picker — Continue disabled until a file is chosen (or user skips). */
  askResumeFile: (input: HTMLInputElement, opts?: {
    title?: string;
    detail?: string;
    allowSkip?: boolean;
    mode?: 'SELECT_NEW' | 'RETRY_OR_REPLACE';
  }) => Promise<{ file: File | null; skipped: boolean }>;
  setUndoHandler: (fn: (() => void) | null) => void;
  toast: (msg: string) => void;
};

let api: OverlayApi & { dismissTransient: () => void } | null = null;

export function getOverlay() {
  if (api) return api;
  api = mountOverlay();
  return api;
}

export function dismissOverlayModals() {
  if (!api) return;
  api.dismissTransient();
}

function mountOverlay() {
  const existing = document.getElementById('careerai-apply-overlay') || document.getElementById('careerai-apply-agent-root');
  if (existing) existing.remove();
  const host = document.createElement('div');
  host.id = 'careerai-apply-overlay';
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
        position: fixed; inset: 0; z-index: 2147483647; background: rgba(15,23,42,.65);
        display: flex; align-items: center; justify-content: center; padding: 16px;
        backdrop-filter: blur(4px);
      }
      .modal {
        width: min(540px, 94vw);
        max-height: min(86vh, 720px);
        background: #ffffff;
        color: #0f172a;
        border-radius: 20px;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,.45), 0 0 0 1px rgba(0,0,0,.08);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .modal-header {
        padding: 18px 24px 14px;
        border-bottom: 1px solid #e2e8f0;
        background: #ffffff;
        flex-shrink: 0;
      }
      .modal-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
      }
      .modal-header p {
        margin: 4px 0 0;
        font-size: 13px;
        color: #64748b;
        line-height: 1.4;
      }
      .modal-body {
        padding: 16px 24px;
        overflow-y: auto;
        flex: 1;
        overscroll-behavior: contain;
      }
      .modal-body::-webkit-scrollbar {
        width: 6px;
      }
      .modal-body::-webkit-scrollbar-track {
        background: #f8fafc;
        border-radius: 999px;
      }
      .modal-body::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 999px;
      }
      .modal-body::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
      .modal-footer {
        padding: 14px 24px;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
        display: flex;
        gap: 10px;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }
      .q {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 14px 16px;
        margin-bottom: 14px;
      }
      .q:last-child {
        margin-bottom: 0;
      }
      .q label {
        font-weight: 600;
        font-size: 13px;
        color: #1e293b;
        display: block;
      }
      .q small {
        font-weight: 400;
        font-size: 12px;
        color: #64748b;
      }
      input[type=text], textarea {
        width: 100%;
        margin-top: 8px;
        border: 1.5px solid #cbd5e1;
        border-radius: 8px;
        padding: 9px 12px;
        font-size: 13.5px;
        background: #ffffff;
        color: #0f172a;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      input[type=text]:focus, textarea:focus {
        outline: none;
        border-color: #4f46e5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
      }
      textarea { min-height: 80px; resize: vertical; }
      .actions { display: flex; gap: 8px; justify-content: flex-end; }
      button { border: 0; border-radius: 8px; padding: 9px 15px; font-weight: 600; cursor: pointer; font-size: 13px; transition: background-color 0.15s, transform 0.05s; }
      button:active { transform: scale(0.98); }
      .primary { background: #4f46e5; color: #fff; }
      .primary:hover { background: #4338ca; }
      .ghost { background: #e2e8f0; color: #0f172a; }
      .ghost:hover { background: #cbd5e1; }
      .warn { background: #f59e0b; color: #111; }
      .check { display: flex; gap: 8px; align-items: flex-start; margin-top: 12px; font-size: 13px; }
      .banner {
        position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 2147483646;
        background: #7c2d12; color: #fff7ed; border-radius: 12px; padding: 12px 16px; max-width: 520px;
        border: 1px solid #fb923c; font-size: 13px; font-weight: 600;
      }
      .save-row { display: flex; gap: 16px; margin-top: 8px; font-size: 12px; color: #475569; }
      .save-row label { display: flex; gap: 5px; align-items: center; font-size: 12px; cursor: pointer; font-weight: 500; }
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
            <div class="modal-header">
              <h3>CareerAI Apply Agent</h3>
              <p><strong>We need a few details (${questions.length} question${questions.length === 1 ? '' : 's'})</strong></p>
              <p>These fields were not found in your profile. Fill them once to save for future applications.</p>
            </div>
            <form id="mf" style="display:flex;flex-direction:column;flex:1;overflow:hidden;margin:0">
              <div class="modal-body">
                ${questions.map((q) => {
                  const lockedOnce = q.classification === 'LEGAL_FIELD';
                  const isAppSpecific = q.classification === 'APPLICATION_SPECIFIC_FIELD';
                  const isLong = isAppSpecific || (q.label + (q.hint || '')).length > 80;
                  const defaultOnce = isAppSpecific || q.classification === 'SENSITIVE_FIELD';
                  return `
                  <div class="q">
                    <label>
                      ${escapeHtml(q.label)}${q.required ? ' *' : ''}
                      ${q.hint ? `<br><small>${escapeHtml(q.hint)}</small>` : ''}
                      ${q.classification === 'SENSITIVE_FIELD' ? '<br><small>Sensitive — you must answer this yourself. Saving is optional.</small>' : ''}
                      ${isAppSpecific ? '<br><small>Choose whether to reuse this answer on future applications.</small>' : ''}
                      ${isLong
                        ? `<textarea name="${escapeHtml(q.id)}" placeholder="${escapeHtml(q.placeholder || '')}" ${q.required ? 'required' : ''}>${escapeHtml(q.currentValue || '')}</textarea>`
                        : `<input type="text" name="${escapeHtml(q.id)}" placeholder="${escapeHtml(q.placeholder || '')}" value="${escapeHtml(q.currentValue || '')}" ${q.required ? 'required' : ''} />`
                      }
                    </label>
                    ${lockedOnce
                      ? '<p class="hint" style="margin:6px 0 0;font-size:12px;color:#64748b">Legal confirmation — not saved to your profile.</p>'
                      : `<div class="save-row">
                          <label><input type="radio" name="save-${escapeHtml(q.id)}" value="SAVE" ${defaultOnce ? '' : 'checked'} /> Use for next time</label>
                          <label><input type="radio" name="save-${escapeHtml(q.id)}" value="USE_ONCE" ${defaultOnce ? 'checked' : ''} /> Use once</label>
                        </div>`}
                  </div>`;
                }).join('')}
              </div>
              <div class="modal-footer">
                <div style="display:flex;gap:8px">
                  <button type="button" class="ghost" id="save-all" style="font-size:12px;padding:7px 12px">Save all for future</button>
                  <button type="button" class="ghost" id="once-all" style="font-size:12px;padding:7px 12px">Use all once</button>
                </div>
                <button type="submit" class="primary" style="padding:8px 20px">Continue</button>
              </div>
            </form>
          </div>
        </div>`;
      extra.querySelector('#once-all')?.addEventListener('click', () => {
        extra.querySelectorAll<HTMLInputElement>('input[type="radio"][value="USE_ONCE"]').forEach((r) => { r.checked = true; });
      });
      extra.querySelector('#save-all')?.addEventListener('click', () => {
        extra.querySelectorAll<HTMLInputElement>('input[type="radio"][value="SAVE"]').forEach((r) => { r.checked = true; });
      });
      extra.querySelector('#mf')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const fd = new FormData(form);
        const answers = questions.map((q) => {
          const lockedOnce = q.classification === 'LEGAL_FIELD';
          const defaultOnce = q.classification === 'APPLICATION_SPECIFIC_FIELD' || q.classification === 'SENSITIVE_FIELD';
          const saveMode: 'SAVE' | 'USE_ONCE' = lockedOnce
            ? 'USE_ONCE'
            : (String(fd.get(`save-${q.id}`) || (defaultOnce ? 'USE_ONCE' : 'SAVE')) === 'USE_ONCE' ? 'USE_ONCE' : 'SAVE');
          return {
            id: q.id,
            key: q.key,
            label: q.label,
            classification: q.classification,
            value: String(fd.get(q.id) || '').trim(),
            saveMode,
          };
        }).filter((a) => a.value);
        extra.innerHTML = '';
        resolve({ answers, saveForFuture: answers.some((a) => a.saveMode === 'SAVE') });
      });
    });
  }

  function askConflict(label: string, current: string, incoming: string): Promise<'UPDATE' | 'ONCE' | 'CANCEL'> {
    return new Promise((resolve) => {
      extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal" style="max-height:none">
            <div class="modal-header">
              <h3>Update your profile?</h3>
              <p>You already have <strong>${escapeHtml(label)}</strong>: <strong>${escapeHtml(current)}</strong></p>
              <p>You entered: <strong>${escapeHtml(incoming)}</strong></p>
            </div>
            <div class="modal-footer" style="justify-content:flex-end">
              <button class="ghost" id="c">Cancel</button>
              <button class="warn" id="o">Use once</button>
              <button class="primary" id="u">Update profile</button>
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
  function dismissTransient() {
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
            <h3>CareerAI detected an application form. Start the assistant?</h3>
            <p>Application confidence: <strong>${score}%</strong></p>
            <ul>${reasons.slice(0, 8).map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
            <div class="actions">
              <button class="primary" id="go">Start Assistant</button>
              <button class="ghost" id="no">Not Now</button>
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

  /**
   * Resume picker that cannot succeed without a real File on the target input.
   * "Save & continue" stays disabled until a file is chosen.
   */
  function askResumeFile(
    input: HTMLInputElement,
    opts?: {
      title?: string;
      detail?: string;
      allowSkip?: boolean;
      mode?: 'SELECT_NEW' | 'RETRY_OR_REPLACE';
    },
  ): Promise<{ file: File | null; skipped: boolean }> {
    return new Promise((resolve) => {
      const title = opts?.title || (opts?.mode === 'RETRY_OR_REPLACE'
        ? 'Could not attach your saved resume'
        : 'Resume required');
      const detail = opts?.detail
        || (opts?.mode === 'RETRY_OR_REPLACE'
          ? 'Your CareerAI profile has a resume, but it could not be attached. Choose the file again to replace it, or cancel.'
          : 'Select your resume PDF once. We save it to your CareerAI profile and reuse it on future applications.');
      const allowSkip = opts?.allowSkip === true;
      extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(detail)}</p>
            <p id="careerai-resume-name" style="font-size:13px;opacity:.85">No file selected yet.</p>
            <div class="actions">
              <button class="primary" id="pick">Choose file</button>
              <button class="primary" id="save" disabled>Save to profile &amp; continue</button>
              ${allowSkip ? '<button class="ghost" id="skip">Skip for now</button>' : ''}
              <button class="ghost" id="cancel">Cancel</button>
            </div>
          </div>
        </div>`;

      const nameEl = extra.querySelector('#careerai-resume-name') as HTMLElement | null;
      const saveBtn = extra.querySelector('#save') as HTMLButtonElement | null;
      let chosen: File | null = null;
      let pollTimer: ReturnType<typeof setInterval> | null = null;

      const syncFromInput = () => {
        const f = input.files && input.files.length > 0 ? input.files[0] : null;
        chosen = f;
        if (nameEl) {
          nameEl.textContent = f
            ? `Selected: ${f.name} (${Math.max(1, Math.round(f.size / 1024))} KB)`
            : 'No file selected yet.';
        }
        if (saveBtn) saveBtn.disabled = !f;
      };

      const onChange = () => syncFromInput();
      input.addEventListener('change', onChange);
      pollTimer = setInterval(syncFromInput, 400);
      syncFromInput();

      const cleanup = () => {
        input.removeEventListener('change', onChange);
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = null;
        extra.innerHTML = '';
      };

      extra.querySelector('#pick')?.addEventListener('click', () => {
        try {
          input.click();
        } catch {
          /* ignore */
        }
      });
      extra.querySelector('#save')?.addEventListener('click', () => {
        syncFromInput();
        if (!chosen) return;
        const file = chosen;
        cleanup();
        resolve({ file, skipped: false });
      });
      extra.querySelector('#skip')?.addEventListener('click', () => {
        cleanup();
        resolve({ file: null, skipped: true });
      });
      extra.querySelector('#cancel')?.addEventListener('click', () => {
        cleanup();
        resolve({ file: null, skipped: false });
      });
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
            <h3>CareerAI Apply Agent</h3>
            <p><strong>Application Review</strong></p>
            <p>Known fields completed: ${summary.filled}<br>
               User-provided fields: ${summary.providedByUser}<br>
               Manual fields remaining: ${summary.missingRequired}<br>
               Saved to profile: ${summary.savedToProfile}</p>
            <ul>${summary.items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
            <p><strong>${summary.missingRequired ? 'Resolve the remaining manual fields before submitting.' : 'Ready for final submission.'}</strong></p>
            <p>The agent will not click Submit. Review the page, then submit yourself.</p>
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
    showReview, showDryRun, askStartAssistant, showReconnect, waitForHuman, askResumeFile, setUndoHandler, toast,
    dismissTransient,
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
