import { AgentStateMachine } from './state-machine';
import { isCaptchaPresent, waitForCaptchaClear } from '../content/captcha-detector';
import { getExtractedFields, scoreApplicationPage } from '../content/form-detector';
import { highlight, fillAndVerify, tryAttachResume } from '../content/autofill-engine';
import { clickNext, findSubmitButton } from '../content/multi-page-manager';
import { getSessionIdFromPage, wait } from '../content/dom-utils';
import { matchField, StoredMapping, customKeyFromLabel } from '../ai/semantic-mapper';
import { classifyField, isReusable, normalizeLabel } from '../ai/question-classifier';
import { bg } from '../api/api-client';
import { getOverlay, MissingQuestion, DryRunRow } from '../ui/assistant/overlay';
import { resolvePolicy, type FillPolicy } from '../storage/storage-manager';
import { captureOriginal, undoAll, clearUndo, undoCount } from '../content/undo-stack';
import { audit, flushAudit } from './audit-log';

interface ProfileFlat {
  flat?: Record<string, string>;
  [k: string]: unknown;
}

export async function runApplicationAgent() {
  const machine = new AgentStateMachine();
  const ui = getOverlay();
  machine.subscribe((snap) => ui.renderState(snap));

  const detection = scoreApplicationPage();
  audit('DETECTED', { detail: `confidence ${detection.score}` });

  if (detection.score < 40 && !getSessionIdFromPage()) {
    machine.transition('IDLE', { detail: 'No application form detected on this page.' });
    return;
  }

  if (!detection.autoStart) {
    const go = await ui.askStartAssistant(detection.score, detection.reasons);
    if (!go) {
      machine.transition('IDLE', { detail: `Application confidence ${detection.score}% — waiting for Start Assistant.` });
      return;
    }
  }

  const sessionId = getSessionIdFromPage();
  let filled = 0;
  let detected = 0;
  let providedByUser = 0;
  let savedToProfile = 0;
  let failed = 0;
  const reviewItems: string[] = [];

  try {
    machine.transition('APPLICATION_DETECTED', { detail: `Application confidence ${detection.score}%` });
    machine.transition('ANALYZING');
    machine.transition('CAPTCHA_CHECK');

    await handleCaptcha(machine, ui, sessionId);

    machine.transition('FORM_DETECTED');
    machine.transition('PROFILE_LOADING');

    const settingsRes = await bg<{
      settings: {
        apiBase: string;
        autoAdvancePages: boolean;
        dryRun: boolean;
        developerMode: boolean;
        fillPolicies: Record<string, FillPolicy>;
      };
    }>({ type: 'GET_SETTINGS' });
    const settings = settingsRes.settings;
    const dryRun = !!(settings.developerMode && settings.dryRun);

    const fieldsPreview = getExtractedFields();
    const categories = categoriesFromFields(fieldsPreview);

    const profileRes = await bg<{
      success: boolean;
      profile?: ProfileFlat;
      student?: Record<string, string>;
      resume?: { fileName: string; downloadUrl: string };
      error?: string;
      authExpired?: boolean;
      network?: boolean;
    }>({
      type: 'GET_PROFILE',
      sessionId: sessionId || undefined,
      categories,
    });

    if (!profileRes?.success) {
      if (profileRes?.authExpired) {
        machine.pause('AUTH_EXPIRED', 'CareerAI connection expired.');
        audit('AUTH_EXPIRED');
        await ui.showReconnect('CareerAI connection expired. Open the popup or /connect-extension to reconnect.');
        await flushAudit(sessionId);
        return;
      }
      if (profileRes?.network) {
        machine.pause('NETWORK_ERROR', 'CareerAI connection unavailable.');
        audit('NETWORK_ERROR');
        const action = await ui.showReconnect('CareerAI connection unavailable.');
        if (action === 'retry') {
          await flushAudit(sessionId);
          return runApplicationAgent();
        }
        await flushAudit(sessionId);
        return;
      }
      machine.pause('AUTH_EXPIRED', profileRes?.error || 'Connect your CareerAI account in the extension popup.');
      await ui.showReconnect(profileRes?.error || 'Open the extension popup and sign in to CareerAI.');
      await flushAudit(sessionId);
      return;
    }

    const flat: Record<string, string> = {
      ...(profileRes.student || {}),
      ...(profileRes.profile?.flat || {}),
    };

    const mappingsRes = await bg<{ success: boolean; mappings?: StoredMapping[] }>({ type: 'GET_MAPPINGS' }).catch(() => ({ success: false, mappings: [] as StoredMapping[] }));
    const memory = mappingsRes.mappings || [];
    const siteHost = location.host;

    ui.setUndoHandler(() => {
      const n = undoAll();
      audit('UNDO', { detail: `${n} fields restored` });
      void flushAudit(sessionId);
      ui.toast(`Undo autofill restored ${n} field(s).`);
    });

    await fillCurrentPage();

    async function fillCurrentPage() {
      await handleCaptcha(machine, ui, sessionId);

      if (document.querySelector('[data-careerai-custom-dropdown]')) {
        machine.pause('UNSUPPORTED_WIDGET', 'Custom dropdown cannot be filled safely.');
        audit('SKIPPED', { detail: 'unsupported custom dropdown' });
        await ui.waitForHuman('Unsupported widget', 'Please complete the custom dropdown yourself, then resume.');
        machine.resume();
      }

      machine.transition('FIELD_MAPPING');
      const fields = getExtractedFields();
      detected = Math.max(detected, fields.length);
      const missing: MissingQuestion[] = [];
      const sensitiveConfirm: Array<{ field: typeof fields[0]; key: string; value: string }> = [];
      const dryRows: DryRunRow[] = [];

      machine.transition(dryRun ? 'FIELD_MAPPING' : 'AUTOFILLING');

      for (const field of fields) {
        const label = field.label || field.placeholder || field.name || field.id;
        const classification = classifyField(label);
        const hit = matchField(field, memory, siteHost);
        const key = hit?.key || (isReusable(classification) ? `custom.${customKeyFromLabel(label)}` : `application.${customKeyFromLabel(label)}`);
        const policy = resolvePolicy(key, classification, settings.fillPolicies);
        const confidence = hit?.confidence ?? (classification === 'REUSABLE_PROFILE_FIELD' ? 0.85 : 0.4);
        audit(hit ? 'MAPPED' : 'DETECTED', { fieldKey: key, fieldLabel: label, detail: hit?.method || classification });

        if (classification === 'LEGAL_FIELD' || policy === 'NEVER') {
          highlight(field.element, 'skip');
          audit('SKIPPED', { fieldKey: key, fieldLabel: label, detail: 'legal or NEVER policy' });
          dryRows.push({ label, key, confidence, action: 'WOULD SKIP' });
          continue;
        }

        if (field.type === 'file' || classification === 'DOCUMENT_FIELD') {
          if (dryRun) {
            dryRows.push({ label, key, confidence: 0.7, action: 'WOULD ASK (file)' });
            continue;
          }
          const attached = await tryAttachResume(field.element as HTMLInputElement, profileRes.resume, settings.apiBase);
          if (attached) {
            filled += 1;
            reviewItems.push(`${label} (resume attached)`);
            highlight(field.element, 'file');
            audit('FILLED', { fieldKey: key, fieldLabel: label, detail: 'resume' });
          } else {
            machine.pause('FILE_SELECTION', 'Please attach your resume file. Browsers block silent file uploads.');
            highlight(field.element, 'file');
            ui.toast('Please select your resume file, then continue.');
            await waitForFile(field.element as HTMLInputElement);
            machine.resume();
            audit('USER_PROVIDED', { fieldKey: key, fieldLabel: label, detail: 'file' });
          }
          continue;
        }

        const value = lookup(flat, key);

        if (dryRun) {
          let action = 'WOULD ASK';
          if (value && policy === 'AUTOMATIC' && (classification === 'REUSABLE_PROFILE_FIELD' || (hit && hit.confidence >= 0.8))) {
            action = 'WOULD FILL';
          } else if (!value) {
            action = 'WOULD ASK';
          } else if (policy === 'ASK') {
            action = 'WOULD ASK';
          }
          dryRows.push({ label, key, confidence, action });
          continue;
        }

        if ((classification === 'SENSITIVE_FIELD' || policy === 'ASK') && value) {
          sensitiveConfirm.push({ field, key, value });
          continue;
        }

        if (value && policy === 'AUTOMATIC' && (classification === 'REUSABLE_PROFILE_FIELD' || (hit && hit.confidence >= 0.8))) {
          const ok = await fillWithRetry(field.element, value);
          if (ok) {
            filled += 1;
            reviewItems.push(label);
            highlight(field.element, 'filled');
            audit('FILLED', { fieldKey: key, fieldLabel: label });
            watchUserEdit(field.element, label, key, value);
          } else {
            failed += 1;
            highlight(field.element, 'ask');
            audit('FAILED', { fieldKey: key, fieldLabel: label });
            missing.push({
              id: `${key}-fail-${fields.indexOf(field)}`,
              label,
              key,
              classification,
              required: field.required,
              placeholder: 'Enter value',
              hint: `Could not automatically fill: ${label}. Please enter it manually.`,
            });
          }
          continue;
        }

        if (!value || policy === 'ASK') {
          missing.push({
            id: `${key}-${fields.indexOf(field)}`,
            label,
            key,
            classification,
            required: field.required || classification === 'SENSITIVE_FIELD',
            placeholder: classification === 'APPLICATION_SPECIFIC_FIELD' ? 'Write your answer for this application only' : 'Enter value',
          });
          highlight(field.element, 'ask');
          audit('MISSING', { fieldKey: key, fieldLabel: label });
        }
      }

      if (dryRun) {
        audit('DRY_RUN', { detail: `${dryRows.length} predictions` });
        await ui.showDryRun(dryRows);
        await flushAudit(sessionId);
        machine.transition('IDLE', { detail: 'Dry run complete — no fields were modified.' });
        return;
      }

      if (sensitiveConfirm.length) {
        machine.pause('SENSITIVE_QUESTION', 'Confirm sensitive values before filling.');
        const qs: MissingQuestion[] = sensitiveConfirm.map((s, i) => ({
          id: `sens-${i}`,
          label: `${s.field.label || s.key} (saved value on file — confirm or replace)`,
          key: s.key,
          classification: 'SENSITIVE_FIELD',
          required: true,
          placeholder: 'Type the value to use',
        }));
        const result = await ui.askMissing(qs);
        providedByUser += result.answers.length;
        for (let i = 0; i < result.answers.length; i++) {
          const ans = result.answers[i];
          const target = sensitiveConfirm[i];
          const v = ans.value || target.value;
          const ok = await fillWithRetry(target.field.element, v);
          if (ok) {
            filled += 1;
            reviewItems.push(target.field.label || target.key);
            highlight(target.field.element, 'filled');
            audit('USER_PROVIDED', { fieldKey: target.key, fieldLabel: target.field.label || target.key });
          } else {
            failed += 1;
            audit('FAILED', { fieldKey: target.key, fieldLabel: target.field.label || target.key });
          }
        }
        machine.resume();
      }

      if (missing.length) {
        machine.transition('MISSING_INFORMATION');
        machine.pause('MISSING_INFORMATION', `${missing.length} field(s) need your answer.`);
        const result = await ui.askMissing(missing);
        providedByUser += result.answers.length;

        for (const ans of result.answers) {
          const target = fields.find((f) => (f.label || f.placeholder || f.name) === ans.label) ||
            fields.find((f) => matchField(f, memory, siteHost)?.key === ans.key);
          if (target) {
            const ok = await fillWithRetry(target.element, ans.value);
            if (ok) {
              filled += 1;
              reviewItems.push(ans.label);
              highlight(target.element, 'filled');
            } else {
              failed += 1;
              audit('FAILED', { fieldKey: ans.key, fieldLabel: ans.label });
            }
          }

          const saveMode = ans.classification === 'APPLICATION_SPECIFIC_FIELD'
            ? 'USE_ONCE'
            : (result.saveForFuture ? 'SAVE' : 'USE_ONCE');

          if (saveMode === 'SAVE' && !isReusable(ans.classification) && ans.classification !== 'UNKNOWN_FIELD') {
            audit('USER_PROVIDED', { fieldKey: ans.key, fieldLabel: ans.label, detail: 'application-specific' });
            continue;
          }

          const confirm = await bg<{ ok?: boolean; conflict?: boolean; current?: string; incoming?: string; saved?: boolean; authExpired?: boolean; network?: boolean }>({
            type: 'CONFIRM_FIELD',
            payload: {
              key: ans.key.startsWith('application.') ? undefined : ans.key,
              label: ans.label,
              value: ans.value,
              saveMode,
              classification: ans.classification,
              fieldPattern: normalizeLabel(ans.label),
              siteHost,
              sessionToken: sessionId,
            },
          });

          if (confirm?.authExpired) {
            machine.pause('AUTH_EXPIRED', 'CareerAI connection expired.');
            await ui.showReconnect('CareerAI connection expired.');
            break;
          }

          if (confirm?.conflict && confirm.current && confirm.incoming) {
            const choice = await ui.askConflict(ans.label, confirm.current, confirm.incoming);
            if (choice === 'UPDATE') {
              await bg({
                type: 'CONFIRM_FIELD',
                payload: {
                  key: ans.key,
                  label: ans.label,
                  value: ans.value,
                  saveMode: 'SAVE',
                  forceUpdate: true,
                  classification: ans.classification,
                  fieldPattern: normalizeLabel(ans.label),
                  siteHost,
                  sessionToken: sessionId,
                },
              });
              savedToProfile += 1;
            }
          } else if (confirm?.saved) {
            savedToProfile += 1;
            flat[ans.key] = ans.value;
            const short = ans.key.split('.').pop();
            if (short) flat[short] = ans.value;
          }
          audit('USER_PROVIDED', { fieldKey: ans.key, fieldLabel: ans.label, detail: saveMode });
        }
        machine.resume();
      }

      machine.transition('VALIDATION', { detail: failed ? `${failed} field(s) could not be verified` : 'Values verified' });

      if (sessionId) {
        await bg({
          type: 'REPORT_SESSION',
          payload: {
            sessionToken: sessionId,
            status: 'FILLING',
            fieldsDetected: detected,
            fieldsFilled: filled,
            newFieldsSaved: savedToProfile,
            report: { labels: reviewItems.slice(0, 40), failed },
          },
        });
      }
      await flushAudit(sessionId);

      const submitBtn = findSubmitButton();
      const canAdvance = settings.autoAdvancePages && !submitBtn;

      if (canAdvance && clickNext()) {
        machine.transition('NEXT_PAGE', { detail: 'Opening the next page…' });
        await wait(900);
        await fillCurrentPage();
        return;
      }

      if (submitBtn) {
        highlight(submitBtn, 'skip');
        machine.transition('FINAL_REVIEW');
        audit('REVIEW_READY', { detail: `${filled} filled` });
        await ui.showReview({
          filled,
          detected,
          providedByUser,
          savedToProfile,
          missingRequired: failed,
          items: reviewItems.slice(0, 30),
        });
        machine.transition('USER_CONFIRMATION', { detail: 'Submit the form yourself when you are ready.' });
        if (sessionId) {
          await bg({
            type: 'REPORT_SESSION',
            payload: { sessionToken: sessionId, status: 'REVIEW', fieldsDetected: detected, fieldsFilled: filled, newFieldsSaved: savedToProfile },
          });
        }
        await flushAudit(sessionId);
      } else if (!settings.autoAdvancePages && clickNext()) {
        machine.pause('MISSING_INFORMATION', 'Auto-advance is off. Click Continue on the page when ready.');
        await ui.waitForHuman('Next page', 'Click Continue on the site when you are ready, then resume.');
        machine.resume();
        machine.transition('NEXT_PAGE');
        await wait(600);
        await fillCurrentPage();
      } else {
        ui.toast(`Filled ${filled}/${detected} fields. Continue on the site if there is another step.`);
      }
    }
  } catch (err) {
    machine.error((err as Error).message || 'Agent failed');
    audit('ERROR', { detail: 'runner error' });
    await flushAudit(sessionId);
  } finally {
    if (undoCount() === 0) clearUndo();
  }
}

async function handleCaptcha(
  machine: AgentStateMachine,
  ui: ReturnType<typeof getOverlay>,
  sessionId: string | null,
) {
  if (!isCaptchaPresent()) return;
  machine.pause('CAPTCHA', 'Human verification required. Complete the CAPTCHA.');
  ui.showCaptcha();
  audit('CAPTCHA_PAUSED');
  await waitForCaptchaClear(8 * 60 * 1000, () => ui.confirmCaptchaDone());
  ui.hideCaptcha();
  machine.resume('Verification complete');
  audit('RESUMED', { detail: 'captcha' });
  await flushAudit(sessionId);
}

async function fillWithRetry(
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: string,
): Promise<boolean> {
  captureOriginal(element);
  if (fillAndVerify(element, value)) return true;
  await wait(80);
  return fillAndVerify(element, value);
}

function categoriesFromFields(fields: ReturnType<typeof getExtractedFields>): string {
  const cats = new Set<string>(['custom']);
  for (const f of fields) {
    const blob = normalizeLabel(`${f.label} ${f.name} ${f.placeholder} ${f.autocomplete}`);
    if (/email|name|phone|mobile|gender|dob|birth/.test(blob)) cats.add('personal');
    if (/college|university|cgpa|gpa|degree|department|education/.test(blob)) cats.add('education');
    if (/salary|ctc|notice|authorization|location|preference/.test(blob)) cats.add('preferences');
    if (/resume|cv|upload|transcript|file/.test(blob)) cats.add('documents');
    if (/github|linkedin|portfolio/.test(blob)) cats.add('links');
  }
  if (cats.size === 1) return 'personal,education,preferences,documents,custom';
  return [...cats].join(',');
}

function lookup(flat: Record<string, string>, key: string): string {
  if (flat[key]) return flat[key];
  const short = key.split('.').pop() || '';
  if (flat[short]) return flat[short];
  const aliases: Record<string, string[]> = {
    'personal.fullName': ['fullName', 'name'],
    'personal.firstName': ['firstName'],
    'personal.lastName': ['lastName'],
    'personal.email': ['email'],
    'personal.phone': ['phone'],
    'education.college': ['college'],
    'education.cgpa': ['cgpa'],
    'education.department': ['department'],
    'education.year': ['year'],
    'links.github': ['github'],
    'links.linkedin': ['linkedin'],
    'preferences.expectedSalary': ['expectedSalary'],
    'preferences.noticePeriod': ['noticePeriod'],
    'preferences.workAuthorization': ['workAuthorization'],
    'preferences.preferredLocation': ['preferredLocation', 'location'],
  };
  for (const a of aliases[key] || []) {
    if (flat[a]) return flat[a];
  }
  return '';
}

function waitForFile(input: HTMLInputElement): Promise<void> {
  return new Promise((resolve) => {
    const onChange = () => {
      if (input.files && input.files.length > 0) {
        input.removeEventListener('change', onChange);
        resolve();
      }
    };
    input.addEventListener('change', onChange);
  });
}

function watchUserEdit(
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  label: string,
  key: string,
  original: string,
) {
  const handler = async () => {
    const next = 'value' in el ? String((el as HTMLInputElement).value || '') : '';
    if (!next || next === original) return;
    el.removeEventListener('change', handler);
    const ui = getOverlay();
    const choice = await ui.askConflict(label, original, next);
    if (choice === 'UPDATE') {
      await bg({
        type: 'CONFIRM_FIELD',
        payload: { key, label, value: next, saveMode: 'SAVE', forceUpdate: true, classification: 'REUSABLE_PROFILE_FIELD' },
      });
    }
  };
  el.addEventListener('change', handler);
}
