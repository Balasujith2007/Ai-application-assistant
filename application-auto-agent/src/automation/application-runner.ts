import { AgentStateMachine } from './state-machine';
import { waitForCaptchaClear, evaluateCaptcha, markCurrentCaptchaCompleted } from '../content/captcha-detector';
import { getExtractedFields, scoreApplicationPage } from '../content/form-detector';
import { highlight, fillAndVerify, tryAttachResume } from '../content/autofill-engine';
import { clickNext, findSubmitButton, findNextButton } from '../content/multi-page-manager';
import { getSessionIdFromPage, wait } from '../content/dom-utils';
import { matchField, StoredMapping, customKeyFromLabel } from '../ai/semantic-mapper';
import { classifyField, isReusable, normalizeLabel } from '../ai/question-classifier';
import { bg } from '../api/api-client';
import { getOverlay, MissingQuestion, DryRunRow } from '../ui/assistant/overlay';
import { resolvePolicy, type FillPolicy } from '../storage/storage-manager';
import { captureOriginal, undoAll, clearUndo, undoCount } from '../content/undo-stack';
import { audit, flushAudit } from './audit-log';
import { currentEpoch, isStale } from './nav-state';
import { applyLog } from '../debug';
import { rememberSessionAnswer, getSessionAnswer, clearSessionAnswers } from './session-answers';
import { decideFieldAction } from './fill-decision';
import { RESUME_AUDIT, decideResumeAction } from './resume-flow';

interface ProfileFlat {
  flat?: Record<string, string>;
  [k: string]: unknown;
}

type FormEl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
function asFormEl(el: HTMLElement | FormEl): FormEl {
  return el as FormEl;
}

export async function runApplicationAgent() {
  const epoch = currentEpoch();
  const machine = new AgentStateMachine();
  const ui = getOverlay();
  machine.subscribe((snap) => ui.renderState(snap));

  const detection = scoreApplicationPage();
  applyLog('Detector', `kind=${detection.kind} score=${detection.score}`);
  audit('DETECTED', { detail: `confidence ${detection.score}` });

  if (detection.kind === 'LANDING' || (detection.score < 40 && !getSessionIdFromPage() && !detection.autoStart)) {
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

    if (isStale(epoch)) return;
    await handleCaptcha(machine, ui, sessionId, epoch);
    if (isStale(epoch)) return;

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
      resume?: { fileName: string; downloadUrl: string; mimeType?: string };
      error?: string;
      authExpired?: boolean;
      network?: boolean;
    }>({
      type: 'GET_PROFILE',
      sessionId: sessionId || undefined,
      categories,
    });
    applyLog('Profile', profileRes?.success ? 'Profile loaded' : `Profile failed (${profileRes?.error ? 'error' : 'no-auth'})`);

    if (!profileRes?.success) {
      if (profileRes?.authExpired) {
        machine.pause('AUTH_EXPIRED', 'CareerAI connection expired.');
        audit('AUTH_EXPIRED');
        await ui.showReconnect('Unable to load CareerAI profile. Retry or reconnect your CareerAI account.');
        await flushAudit(sessionId);
        return;
      }
      if (profileRes?.network) {
        machine.pause('NETWORK_ERROR', 'CareerAI connection unavailable.');
        audit('NETWORK_ERROR');
        const action = await ui.showReconnect('Unable to load CareerAI profile. Retry or reconnect.');
        if (action === 'retry') {
          await flushAudit(sessionId);
          return runApplicationAgent();
        }
        await flushAudit(sessionId);
        return;
      }
      machine.pause('AUTH_EXPIRED', profileRes?.error || 'Unable to load CareerAI profile.');
      await ui.showReconnect(profileRes?.error || 'Unable to load CareerAI profile. Retry or reconnect.');
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
      if (isStale(epoch)) return;
      await handleCaptcha(machine, ui, sessionId, epoch);
      if (isStale(epoch)) return;

      machine.transition('FIELD_MAPPING');
      const fields = getExtractedFields();
      detected = Math.max(detected, fields.length);
      const missing: MissingQuestion[] = [];
      const pendingFiles: HTMLInputElement[] = [];
      const legalLabels: string[] = [];
      const hasCustomDropdown = !!document.querySelector('[data-careerai-custom-dropdown]');
      const dryRows: DryRunRow[] = [];
      const seenKeys = new Set<string>();

      machine.transition(dryRun ? 'FIELD_MAPPING' : 'AUTOFILLING');

      for (const field of fields) {
        const label = field.label || field.placeholder || field.name || field.id;
        if (
          field.element.closest('[data-careerai-captcha]')
          || field.id === 'careerai-test-captcha'
          || /captcha|recaptcha|hcaptcha|turnstile/i.test(`${field.name} ${field.id} ${label}`)
        ) {
          continue;
        }
        const signalBlob = [label, field.name, field.id, field.placeholder].filter(Boolean).join(' ');
        const hit = matchField(field, memory, siteHost);
        const classification = hit?.classification || classifyField(signalBlob);
        const key = hit?.key || (
          isReusable(classification) || classification === 'APPLICATION_SPECIFIC_FIELD'
            ? `custom.${customKeyFromLabel(label)}`
            : `application.${customKeyFromLabel(label)}`
        );
        const policy = resolvePolicy(key, classification, settings.fillPolicies);
        const confidence = hit?.confidence ?? (classification === 'REUSABLE_PROFILE_FIELD' ? 0.85 : 0.4);
        const value = lookup(flat, key);
        const action = decideFieldAction({
          classification,
          policy,
          hasValue: !!value,
          confidence: value ? confidence : 0,
        });
        audit(hit ? 'MAPPED' : 'DETECTED', { fieldKey: key, fieldLabel: label, detail: hit?.method || classification });

        if (field.type === 'file' || classification === 'DOCUMENT_FIELD') {
          if (dryRun) {
            dryRows.push({ label, key, confidence: 0.7, action: 'WOULD ASK (file)' });
            continue;
          }
          // Only auto-attach when THIS authenticated user already has a stored profile file.
          // Never download a generic/other-user file.
          const fileInput = field.element as HTMLInputElement;
          const hasStored = !!(profileRes.resume?.downloadUrl);
          applyLog('Resume', hasStored ? 'RESUME_PROFILE_RETURNED' : 'RESUME_NOT_FOUND');
          let attached = false;
          let attachAttempts = 0;
          if (hasStored && profileRes.resume) {
            const fetchResume = makeResumeFetcher();
            // Retry once on attach failure before asking the user to re-select.
            for (let attempt = 1; attempt <= 2 && !attached; attempt++) {
              attachAttempts = attempt;
              applyLog('Resume', `RESUME_DOWNLOAD_STARTED attempt=${attempt}`);
              attached = await tryAttachResume(
                fileInput,
                profileRes.resume,
                settings.apiBase,
                fetchResume,
              );
              applyLog('Resume', attached ? 'RESUME_ATTACH_SUCCESS' : 'RESUME_ATTACH_FAILED');
              if (!attached && attempt < 2) await wait(350);
            }
          }
          const decision = decideResumeAction({
            hasStoredResume: hasStored,
            attachSucceeded: attached,
            attachAttempts,
          });
          if (attached || decision === 'ATTACH_STORED') {
            filled += 1;
            reviewItems.push(`${label} (attached from your profile)`);
            highlight(fileInput, 'file');
            audit('FILLED', { fieldKey: key, fieldLabel: label, detail: RESUME_AUDIT.ATTACH_SUCCESS });
          } else {
            pendingFiles.push(fileInput);
            highlight(fileInput, 'file');
            audit('MISSING', {
              fieldKey: key,
              fieldLabel: label,
              detail: hasStored ? RESUME_AUDIT.ATTACH_FAILED : RESUME_AUDIT.NOT_FOUND,
            });
            if (hasStored && !attached) {
              ui.toast('Could not attach your saved resume. You may need to select it again.');
            }
          }
          continue;
        }

        if (action === 'SKIP' || classification === 'LEGAL_FIELD' || policy === 'NEVER') {
          highlight(field.element, 'skip');
          if (classification === 'LEGAL_FIELD') {
            legalLabels.push(label);
            reviewItems.push(`${label} — Manual action required`);
          }
          audit('SKIPPED', { fieldKey: key, fieldLabel: label, detail: 'legal or NEVER policy' });
          dryRows.push({ label, key, confidence, action: 'WOULD SKIP' });
          continue;
        }

        if (dryRun) {
          dryRows.push({
            label,
            key,
            confidence,
            action: action === 'FILL' ? 'WOULD FILL' : 'WOULD ASK',
          });
          continue;
        }

        if (action === 'FILL' && value) {
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
            pushMissing(missing, seenKeys, {
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

        pushMissing(missing, seenKeys, {
          id: `${key}-${fields.indexOf(field)}`,
          label,
          key,
          classification,
          required: field.required || classification === 'SENSITIVE_FIELD',
          placeholder: classification === 'APPLICATION_SPECIFIC_FIELD'
            ? 'Write your answer — choose Use for next time if you want to reuse it'
            : classification === 'SENSITIVE_FIELD'
              ? (key.includes('workAuthorization') || /authorization|visa|citizen/i.test(label)
                ? 'Please select your work authorization (Yes or No)'
                : 'Please answer this yourself. We will not guess.')
              : 'Enter value',
          currentValue: value || '',
          hint: classification === 'SENSITIVE_FIELD' && value
            ? 'Saved value is on file — confirm or replace. We will not guess.'
            : undefined,
        });
        highlight(field.element, 'ask');
        audit('MISSING', { fieldKey: key, fieldLabel: label });
      }

      applyLog('Mapper', `${fields.length} fields inspected`);
      applyLog('Autofill', `${filled} filled, ${missing.length} missing`);

      if (dryRun) {
        audit('DRY_RUN', { detail: `${dryRows.length} predictions` });
        await ui.showDryRun(dryRows);
        await flushAudit(sessionId);
        machine.transition('IDLE', { detail: 'Dry run complete — no fields were modified.' });
        return;
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

          let saveMode = ans.saveMode;
          // Legal confirmations are never persisted. Application essays may be saved when the user chooses "Use for next time".
          if (ans.classification === 'LEGAL_FIELD') {
            saveMode = 'USE_ONCE';
          }

          // Persist SAVE answers (including application-specific) as custom profile fields for this user.
          const persistKey = ans.key.startsWith('application.')
            ? `custom.${ans.key.slice('application.'.length)}`
            : ans.key;

          rememberSessionAnswer(ans.key, ans.value);
          rememberSessionAnswer(persistKey, ans.value);
          flat[ans.key] = ans.value;
          flat[persistKey] = ans.value;
          const short = ans.key.split('.').pop();
          if (short) flat[short] = ans.value;

          if (saveMode === 'SAVE' && ans.classification === 'LEGAL_FIELD') {
            audit('USER_PROVIDED', { fieldKey: ans.key, fieldLabel: ans.label, detail: 'legal-never-saved' });
            continue;
          }

          const confirm = await bg<{
            ok?: boolean;
            conflict?: boolean;
            current?: string;
            incoming?: string;
            saved?: boolean;
            useOnce?: boolean;
            authExpired?: boolean;
            network?: boolean;
            error?: string;
          }>({
            type: 'CONFIRM_FIELD',
            payload: {
              key: persistKey.startsWith('application.') ? undefined : persistKey,
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

          if (confirm?.network || (!confirm?.ok && !confirm?.conflict && saveMode === 'SAVE')) {
            ui.toast('Could not save this information. It will be used once.');
            audit('USER_PROVIDED', { fieldKey: ans.key, fieldLabel: ans.label, detail: 'USE_ONCE_FALLBACK' });
            continue;
          }

          if (confirm?.conflict && confirm.current && confirm.incoming) {
            audit('USER_PROVIDED', { fieldKey: ans.key, fieldLabel: ans.label, detail: 'FIELD_CONFLICT' });
            const choice = await ui.askConflict(ans.label, confirm.current, confirm.incoming);
            if (choice === 'UPDATE') {
              const saved = await bg<{ saved?: boolean; network?: boolean; ok?: boolean }>({
                type: 'CONFIRM_FIELD',
                payload: {
                  key: persistKey,
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
              if (saved?.saved) {
                savedToProfile += 1;
                ui.toast('Saved for next time.');
              } else ui.toast('Could not save this information. It will be used once.');
            } else if (choice === 'CANCEL') {
              if (target) await fillWithRetry(target.element, confirm.current);
              rememberSessionAnswer(ans.key, confirm.current);
              rememberSessionAnswer(persistKey, confirm.current);
              flat[ans.key] = confirm.current;
              flat[persistKey] = confirm.current;
            }
          } else if (confirm?.saved) {
            savedToProfile += 1;
            if (ans.classification === 'APPLICATION_SPECIFIC_FIELD') {
              ui.toast('Saved for next applications.');
            }
          }
          audit('USER_PROVIDED', { fieldKey: persistKey, fieldLabel: ans.label, detail: saveMode });
        }
        machine.resume();
      }

      if (pendingFiles.length) {
        const hadStoredButFailed = !!(profileRes.resume?.downloadUrl);
        machine.pause(
          'FILE_SELECTION',
          hadStoredButFailed
            ? 'Saved resume could not be attached — please select your resume file.'
            : 'Please select your CareerAI resume for this account (saved once for future applications).',
        );
        for (const input of pendingFiles) {
          highlight(input, 'file');
          // Dedicated picker: "Save & continue" stays disabled until a real File is chosen.
          // Generic waitForHuman previously let users continue with FILE_NOT_SELECTED → never persisted.
          const pick = await ui.askResumeFile(input, {
            mode: hadStoredButFailed ? 'RETRY_OR_REPLACE' : 'SELECT_NEW',
            allowSkip: false,
            detail: hadStoredButFailed
              ? 'Your profile already has a resume, but attachment failed. Choose the file again so we can replace/re-save it for this account.'
              : 'Select your resume PDF once. We will save it to your CareerAI profile and reuse it automatically next time.',
          });
          const selected = pick.file;
          if (!selected) {
            reviewItems.push('Resume — please select your file');
            failed += 1;
            audit('MISSING', { fieldLabel: 'Resume', detail: RESUME_AUDIT.FILE_NOT_SELECTED });
            applyLog('Resume', 'RESUME_NOT_FOUND (user cancelled picker)');
            continue;
          }
          applyLog('Resume', 'RESUME_SELECTION_RECEIVED');
          audit('USER_PROVIDED', { fieldLabel: 'Resume', detail: RESUME_AUDIT.SELECTION_RECEIVED });
          filled += 1;

          applyLog('Resume', 'RESUME_UPLOAD_STARTED');
          audit('USER_PROVIDED', { fieldLabel: 'Resume', detail: RESUME_AUDIT.UPLOAD_STARTED });
          const saved = await persistSelectedResumeToProfile(selected);
          applyLog(
            'Resume',
            saved?.ok ? 'RESUME_UPLOAD_SUCCESS' : `RESUME_UPLOAD_FAILED (${saved?.error || 'unknown'})`,
          );

          if (saved?.ok && saved.resume?.downloadUrl) {
            profileRes.resume = {
              fileName: saved.resume.fileName,
              downloadUrl: saved.resume.downloadUrl,
              mimeType: saved.resume.mimeType,
            };
            // Confirm profile API returns the stored resume for THIS user before claiming success.
            const verified = await verifyProfileHasResume();
            if (verified) {
              applyLog('Resume', 'RESUME_DB_PERSISTED');
              audit('USER_PROVIDED', { fieldLabel: 'Resume', detail: RESUME_AUDIT.UPLOAD_SUCCESS });
              reviewItems.push(`Resume saved to your profile (${saved.resume.fileName})`);
              ui.toast('Resume saved to your CareerAI profile for future applications.');
            } else {
              applyLog('Resume', 'RESUME_UPLOAD_SUCCESS but profile verify missed resume');
              reviewItems.push(`Resume uploaded (${saved.resume.fileName}) — profile verify pending`);
              ui.toast('Resume uploaded. If the next application asks again, reconnect and retry.');
              audit('USER_PROVIDED', { fieldLabel: 'Resume', detail: RESUME_AUDIT.UPLOAD_SUCCESS });
            }
          } else {
            reviewItems.push(`Resume (selected for this form: ${selected.name})`);
            ui.toast(saved?.error
              ? `Could not save to profile (${saved.error}). File is attached to this form only.`
              : 'Could not save resume to profile. It was still attached to this form.');
            audit('USER_PROVIDED', { fieldLabel: 'Resume', detail: RESUME_AUDIT.UPLOAD_FAILED });
          }
          try {
            sessionStorage.setItem('careerai_test_resume', selected.name);
          } catch { /* ignore */ }
        }
        machine.resume();
        audit('USER_PROVIDED', { detail: 'FILE_FLOW_DONE' });
      }

      if (hasCustomDropdown || legalLabels.length) {
        const parts = [
          legalLabels.length ? 'Legal checkbox: Manual action required. The agent will not check it.' : '',
          hasCustomDropdown ? 'Please complete the custom dropdown yourself.' : '',
        ].filter(Boolean);
        machine.pause(hasCustomDropdown ? 'UNSUPPORTED_WIDGET' : 'LEGAL_CONFIRMATION', parts.join(' '));
        if (hasCustomDropdown) audit('SKIPPED', { detail: 'unsupported custom dropdown' });
        await ui.waitForHuman('Manual action required', parts.join(' '));
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
        // Check if the click revealed validation errors instead of advancing
        const validationErrors = detectValidationErrors();
        if (validationErrors.length) {
          audit('ERROR', { detail: `validation: ${validationErrors.map((e) => e.label || e.fieldId).join(', ')}` });
          ui.toast(`Validation failed: ${validationErrors.map((e) => e.error).join(' | ')}`);
          machine.transition('IDLE', { detail: 'Validation errors found — please review and correct.' });
          return;
        }
        await fillCurrentPage();
        return;
      }

      if (submitBtn) {
        highlight(submitBtn, 'skip');
        machine.transition('FINAL_REVIEW');
        audit('REVIEW_READY', { detail: `${filled} filled` });
        const manualRemaining = failed + (legalLabels.length ? 1 : 0) + (pendingFiles.some((f) => !f.files?.length) ? 0 : 0);
        await ui.showReview({
          filled,
          detected,
          providedByUser,
          savedToProfile,
          missingRequired: manualRemaining || failed,
          items: Array.from(new Set(reviewItems)).slice(0, 30),
        });
        machine.transition('USER_CONFIRMATION', { detail: 'Submit the form yourself when you are ready.' });
        clearSessionAnswers();
        if (sessionId) {
          await bg({
            type: 'REPORT_SESSION',
            payload: { sessionToken: sessionId, status: 'REVIEW', fieldsDetected: detected, fieldsFilled: filled, newFieldsSaved: savedToProfile },
          });
        }
        await flushAudit(sessionId);
      } else if (!settings.autoAdvancePages && findNextButton()) {
        machine.transition('IDLE', { detail: 'Page filled. Click Continue on the site when ready.' });
        ui.toast('Filled this page. Click Continue on the site when you are ready.');
        // Watch for new fields dynamically added while user reads the page
        const stopWatcher = watchDynamicFields((newEls) => {
          const count = newEls.filter((el) => {
            const type = (el.getAttribute('type') || el.tagName).toLowerCase();
            return !['submit', 'button', 'image', 'reset', 'hidden'].includes(type);
          }).length;
          if (count > 0) {
            stopWatcher();
            ui.toast(`${count} new field(s) appeared. Re-analyzing…`);
            void fillCurrentPage();
          }
        });
        // Disconnect watcher on next navigation to avoid dangling observer
        window.addEventListener('popstate', stopWatcher, { once: true });
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
  epoch: number,
) {
  const state = evaluateCaptcha();
  applyLog('CAPTCHA', state);
  if (state === 'CAPTCHA_NOT_PRESENT' || state === 'CAPTCHA_COMPLETED') return;

  machine.pause('CAPTCHA', 'Human verification required. Complete the CAPTCHA.');
  ui.showCaptcha();
  audit('CAPTCHA_PAUSED');
  applyLog('CAPTCHA', 'Waiting for user');
  await waitForCaptchaClear(8 * 60 * 1000, () => ui.confirmCaptchaDone(), {
    isAborted: () => isStale(epoch),
  });
  if (isStale(epoch)) return;
  markCurrentCaptchaCompleted();
  ui.hideCaptcha();
  machine.resume('Verification complete');
  audit('RESUMED', { detail: 'captcha' });
  applyLog('CAPTCHA', 'Verification completed');
  await flushAudit(sessionId);
}

async function fillWithRetry(
  element: HTMLElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: string,
): Promise<boolean> {
  captureOriginal(asFormEl(element));
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
    if (/salary|ctc|compensation|notice|authorization|location|preference/.test(blob)) cats.add('preferences');
    if (/resume|cv|upload|transcript|file/.test(blob)) cats.add('documents');
    if (/github|linkedin|portfolio/.test(blob)) cats.add('links');
  }
  if (cats.size === 1) return 'personal,education,preferences,documents,custom';
  return [...cats].join(',');
}

function pushMissing(
  missing: MissingQuestion[],
  seenKeys: Set<string>,
  q: MissingQuestion,
) {
  if (seenKeys.has(q.key)) return;
  seenKeys.add(q.key);
  missing.push(q);
}

function lookup(flat: Record<string, string>, key: string): string {
  const sessionHit = getSessionAnswer(key);
  if (sessionHit) return sessionHit;
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

type ResumeMeta = { fileName: string; downloadUrl: string; mimeType?: string };

function makeResumeFetcher() {
  return async (resumeMeta: { fileName?: string; downloadUrl: string; mimeType?: string }) => {
    applyLog('Resume', 'RESUME_DOWNLOAD_STARTED');
    const res = await bg<{
      ok?: boolean;
      base64?: string;
      fileName?: string;
      mimeType?: string;
      missing?: boolean;
      error?: string;
      byteLength?: number;
    }>({
      type: 'DOWNLOAD_RESUME',
      downloadUrl: resumeMeta.downloadUrl,
    });
    if (!res?.ok || !res.base64) {
      applyLog(
        'Resume',
        `RESUME_DOWNLOAD_FAILED (${res?.missing ? 'missing' : res?.error || 'error'})`,
      );
      return null;
    }
    applyLog('Resume', `RESUME_DOWNLOAD_SUCCESS bytes=${res.byteLength || 0}`);
    const binary = atob(res.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return {
      bytes: bytes.buffer,
      fileName: res.fileName || resumeMeta.fileName || 'document.pdf',
      mimeType: res.mimeType || resumeMeta.mimeType || 'application/pdf',
    };
  };
}

/** Re-fetch profile and confirm THIS account still exposes an active resume. */
async function verifyProfileHasResume(): Promise<boolean> {
  try {
    // Prefer authenticated extension profile (JWT-scoped) — source of truth for persistence.
    const res = await bg<{
      success?: boolean;
      resume?: ResumeMeta | null;
    }>({ type: 'GET_PROFILE' });
    const has = !!(res?.success && res.resume?.downloadUrl);
    applyLog('Resume', has ? 'RESUME_PROFILE_RETURNED' : 'RESUME_NOT_FOUND after upload');
    return has;
  } catch {
    return false;
  }
}

/** Upload the user-selected file into THIS account's CareerAI resume storage. */
async function persistSelectedResumeToProfile(file: File): Promise<{
  ok?: boolean;
  error?: string;
  resume?: ResumeMeta;
}> {
  try {
    const buf = await file.arrayBuffer();
    if (!buf.byteLength) return { ok: false, error: 'empty file' };
    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return await bg<{
      ok?: boolean;
      error?: string;
      resume?: ResumeMeta;
    }>({
      type: 'UPLOAD_RESUME',
      fileName: file.name || 'document.pdf',
      mimeType: file.type || 'application/pdf',
      base64: btoa(binary),
    });
  } catch (err) {
    return { ok: false, error: (err as Error)?.message || 'upload failed' };
  }
}

/**
 * Detect validation error messages in the DOM after a form submit attempt.
 * Returns a list of fields that have associated error text.
 */
export function detectValidationErrors(): Array<{ fieldId: string; label: string; error: string }> {
  const errors: Array<{ fieldId: string; label: string; error: string }> = [];
  const errorEls = Array.from(document.querySelectorAll<HTMLElement>(
    '[aria-invalid="true"], .error, .field-error, [class*="error"], [role="alert"], .invalid-feedback, [data-error]',
  ));
  for (const el of errorEls) {
    const text = el.textContent?.trim();
    if (!text) continue;
    const fieldId = el.getAttribute('data-field-id') || el.closest('[id]')?.id || '';
    const label = el.closest('[data-label]')?.getAttribute('data-label')
      || document.querySelector(`label[for="${fieldId}"]`)?.textContent?.trim()
      || '';
    errors.push({ fieldId, label, error: text });
  }
  return errors;
}

/**
 * Watch for new form fields added dynamically by the page (AJAX / React state updates).
 * Returns a cleanup function. Calls `onNewFields` only once per batch of mutations,
 * debounced to avoid overlapping calls.
 */
export function watchDynamicFields(onNewFields: (fields: HTMLElement[]) => void): () => void {
  const seen = new WeakSet<HTMLElement>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const pending: HTMLElement[] = [];

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of Array.from(m.addedNodes)) {
        if (!(node instanceof HTMLElement)) continue;
        const inputs = node.matches('input, select, textarea, [contenteditable]')
          ? [node]
          : Array.from(node.querySelectorAll<HTMLElement>('input, select, textarea, [contenteditable]'));
        for (const inp of inputs) {
          if (!seen.has(inp)) {
            seen.add(inp);
            pending.push(inp);
          }
        }
      }
    }
    if (pending.length > 0) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const batch = pending.splice(0);
        if (batch.length) onNewFields(batch);
        timer = null;
      }, 400);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

function watchUserEdit(
  el: HTMLElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
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
