import { AutoFillAgent, AgentPayload, AgentExecutionReport } from './autofillAgentCore';

let cachedPayload: AgentPayload | null = null;
let currentReport: AgentExecutionReport | null = null;
let isFillingInProgress = false;

async function initCareerAIAgent() {
  const urlObj = new URL(window.location.href);
  let sessionId = urlObj.searchParams.get('careerai_session_id');

  if (!sessionId) {
    sessionId = sessionStorage.getItem('careerai_agent_session_id');
  } else {
    sessionStorage.setItem('careerai_agent_session_id', sessionId);
  }

  if (!sessionId) return; // Not a CareerAI agent session tab

  console.log('[CareerAI Agent] Session active:', sessionId);

  try {
    const host = window.location.origin.includes('localhost') ? window.location.origin : 'http://localhost:3000';
    const payloadRes = await fetch(`${host}/api/agent/autofill-payload?sessionId=${sessionId}`);

    if (!payloadRes.ok) {
      console.warn('[CareerAI Agent] Unable to fetch payload:', payloadRes.statusText);
      return;
    }

    const payloadData = await payloadRes.json();
    if (!payloadData.success || !payloadData.student) return;

    cachedPayload = {
      sessionId: payloadData.sessionId,
      student: payloadData.student,
      resume: payloadData.resume,
      opportunity: payloadData.opportunity
    };

    // Execute initial autofill attempt
    await executeAutofill();

    // Auto-click landing page registration button if form is not yet visible
    autoClickLandingRegisterButton();

    // Observe dynamic DOM changes (e.g. form modal opening, SPA navigation, tab clicks)
    setupDOMObserver();

  } catch (err) {
    console.error('[CareerAI Agent] Initialization error:', err);
  }
}

async function executeAutofill() {
  if (!cachedPayload || isFillingInProgress) return;
  isFillingInProgress = true;

  try {
    const agent = new AutoFillAgent();
    const report = await agent.run(cachedPayload);

    if (report.totalFieldsDetected > 0) {
      currentReport = report;
      renderAgentHUD(report, cachedPayload.opportunity.title);
    }
  } catch (err) {
    console.error('[CareerAI Agent] Autofill error:', err);
  } finally {
    isFillingInProgress = false;
  }
}

function autoClickLandingRegisterButton() {
  // If input fields are not yet visible, check for landing page Register Now buttons and click automatically
  const inputs = document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea');
  const visibleInputs = Array.from(inputs).filter((i) => i.type !== 'hidden' && i.offsetWidth > 0 && i.offsetHeight > 0);

  if (visibleInputs.length === 0) {
    const clickableElements = document.querySelectorAll<HTMLElement>('a, button, input[type="button"], input[type="submit"], [role="button"], .btn');
    const targetKeywords = ['register now', 'visit registration', 'register', 'apply now', 'fill form', 'continue to register'];

    for (const el of Array.from(clickableElements)) {
      const text = (el.innerText || el.getAttribute('value') || el.getAttribute('aria-label') || '').toLowerCase().trim();
      if (targetKeywords.some((kw) => text.includes(kw))) {
        console.log('[CareerAI Agent] Automatically triggering registration button:', text);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Dispatch full synthetic click sequence
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        el.click();

        // If link points to another page, ensure session token carries over
        const anchor = el as HTMLAnchorElement;
        if (anchor.href && anchor.href !== '#' && !anchor.href.startsWith('javascript:')) {
          setTimeout(() => {
            if (!anchor.href.includes('careerai_session_id') && cachedPayload) {
              const destUrl = new URL(anchor.href, window.location.href);
              destUrl.searchParams.set('careerai_session_id', cachedPayload.sessionId);
              window.location.href = destUrl.toString();
            }
          }, 300);
        }

        setTimeout(executeAutofill, 600);
        setTimeout(executeAutofill, 1200);
        break;
      }
    }
  }
}

function setupDOMObserver() {
  let debounceTimeout: NodeJS.Timeout | null = null;

  const observer = new MutationObserver(() => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      executeAutofill();
    }, 400);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Re-check on click events (e.g. clicking tab, modal trigger)
  document.addEventListener('click', () => {
    setTimeout(executeAutofill, 500);
  });
}

function renderAgentHUD(report: AgentExecutionReport, opportunityTitle: string) {
  let container = document.getElementById('careerai-agent-hud');
  if (!container) {
    container = document.createElement('div');
    container.id = 'careerai-agent-hud';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 360px;
    `;
    document.body.appendChild(container);
  }

  const filledItems = report.filledFields.map((f) => `<li style="color: #10b981;">✓ ${f.label}</li>`).join('');
  const manualItems = report.manualFields.map((m) => `<li style="color: #f59e0b;">⚠ ${m}</li>`).join('');
  const protectedItems = report.protectedFieldsSkipped.map((p) => `<li style="color: #ef4444;">🔒 ${p} (Manual Entry)</li>`).join('');

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
      <span style="font-weight: 700; font-size: 14px; color: #38bdf8;">⚡ CareerAI Auto-Fill Agent</span>
      <button id="careerai-hud-close" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 16px;">✕</button>
    </div>
    <div style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">${opportunityTitle}</div>
    <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">
      ${report.totalFieldsFilled} / ${report.totalFieldsDetected} Fields Auto-filled from DB
    </div>
    <ul style="font-size: 12px; margin: 0; padding-left: 16px; max-height: 140px; overflow-y: auto;">
      ${filledItems}
      ${manualItems}
      ${protectedItems}
    </ul>
    <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #334155; font-size: 11px; color: #cbd5e1;">
      Review all fields carefully. The agent will <strong>NEVER</strong> automatically submit this form.
    </div>
  `;

  document.getElementById('careerai-hud-close')?.addEventListener('click', () => {
    container?.remove();
  });
}

// Initialize when DOM ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initCareerAIAgent();
} else {
  window.addEventListener('DOMContentLoaded', initCareerAIAgent);
}
