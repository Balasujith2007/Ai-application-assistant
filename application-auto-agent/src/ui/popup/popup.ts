import { bg } from '../../api/api-client';
import type { StoredAuth, AgentSettings, FillPolicy } from '../../storage/storage-manager';

const loginView = document.getElementById('view-login')!;
const homeView = document.getElementById('view-home')!;
const profileView = document.getElementById('view-profile')!;
const settingsView = document.getElementById('view-settings')!;
const hello = document.getElementById('hello')!;
const loginError = document.getElementById('login-error')!;
const fieldsEl = document.getElementById('fields')!;

function show(view: 'login' | 'home' | 'profile' | 'settings') {
  for (const el of [loginView, homeView, profileView, settingsView]) el.classList.add('hidden');
  ({ login: loginView, home: homeView, profile: profileView, settings: settingsView }[view]).classList.remove('hidden');
}

async function refresh() {
  const { auth } = await bg<{ auth: StoredAuth | null }>({ type: 'GET_AUTH' });
  if (!auth) {
    show('login');
    return;
  }
  hello.textContent = `Signed in as ${auth.user.name} (${auth.user.email})`;
  show('home');
}

document.getElementById('login-btn')!.addEventListener('click', async () => {
  loginError.textContent = '';
  const email = (document.getElementById('email') as HTMLInputElement).value.trim();
  const password = (document.getElementById('password') as HTMLInputElement).value;
  const res = await bg<{ success: boolean; error?: string }>({ type: 'LOGIN', email, password });
  if (!res.success) {
    loginError.textContent = res.error || 'Login failed';
    return;
  }
  await refresh();
});

document.getElementById('logout')!.addEventListener('click', async () => {
  await bg({ type: 'LOGOUT' });
  await refresh();
});

document.getElementById('open-profile')!.addEventListener('click', async () => {
  show('profile');
  fieldsEl.innerHTML = '<p class="muted">Loading…</p>';
  const res = await bg<{ success: boolean; fields?: Array<{ id: string; label: string; key: string; value: string; enabled: boolean; category: string }> }>({ type: 'GET_CUSTOM_FIELDS' });
  if (!res.success || !res.fields?.length) {
    fieldsEl.innerHTML = '<p class="muted">No learned fields yet. Apply once and choose Save for future.</p>';
    return;
  }
  fieldsEl.innerHTML = res.fields.map((f) => `
    <div class="field" data-id="${f.id}">
      <div>
        <strong>${escapeHtml(f.label)}</strong>
        <span class="muted">${escapeHtml(f.key)} · ${escapeHtml(f.value)}</span>
      </div>
      <div>
        <button class="ghost toggle">${f.enabled ? 'Disable auto-use' : 'Enable'}</button>
        <button class="danger del">Delete</button>
      </div>
    </div>
  `).join('');

  fieldsEl.querySelectorAll('.toggle').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const row = (e.currentTarget as HTMLElement).closest('.field')!;
      const id = row.getAttribute('data-id')!;
      const currentlyEnabled = (e.currentTarget as HTMLElement).textContent?.includes('Disable');
      await bg({ type: 'PATCH_CUSTOM_FIELD', id, payload: { enabled: !currentlyEnabled } });
      document.getElementById('open-profile')!.click();
    });
  });
  fieldsEl.querySelectorAll('.del').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const row = (e.currentTarget as HTMLElement).closest('.field')!;
      const id = row.getAttribute('data-id')!;
      await bg({ type: 'DELETE_CUSTOM_FIELD', id });
      document.getElementById('open-profile')!.click();
    });
  });
});

document.getElementById('back-from-profile')!.addEventListener('click', () => show('home'));
document.getElementById('back-from-settings')!.addEventListener('click', () => show('home'));

function setSelect(id: string, value: string) {
  const el = document.getElementById(id) as HTMLSelectElement;
  if (el) el.value = value;
}

document.getElementById('open-settings')!.addEventListener('click', async () => {
  show('settings');
  const { settings } = await bg<{ settings: AgentSettings }>({ type: 'GET_SETTINGS' });
  (document.getElementById('api-base') as HTMLInputElement).value = settings.apiBase;
  (document.getElementById('auto-advance') as HTMLInputElement).checked = settings.autoAdvancePages;
  (document.getElementById('developer-mode') as HTMLInputElement).checked = settings.developerMode;
  (document.getElementById('dry-run') as HTMLInputElement).checked = settings.dryRun;
  setSelect('policy-email', settings.fillPolicies['personal.email'] || 'AUTOMATIC');
  setSelect('policy-phone', settings.fillPolicies['personal.phone'] || 'AUTOMATIC');
  setSelect('policy-salary', settings.fillPolicies['preferences.expectedSalary'] || 'AUTOMATIC');
  setSelect('policy-workauth', settings.fillPolicies['preferences.workAuthorization'] || 'ASK');
  setSelect('policy-gender', settings.fillPolicies['personal.gender'] || 'ASK');
});

document.getElementById('save-settings')!.addEventListener('click', async () => {
  const policy = (id: string) => (document.getElementById(id) as HTMLSelectElement).value as FillPolicy;
  await bg({
    type: 'SET_SETTINGS',
    patch: {
      apiBase: (document.getElementById('api-base') as HTMLInputElement).value.trim(),
      autoAdvancePages: (document.getElementById('auto-advance') as HTMLInputElement).checked,
      developerMode: (document.getElementById('developer-mode') as HTMLInputElement).checked,
      dryRun: (document.getElementById('dry-run') as HTMLInputElement).checked,
      fillPolicies: {
        'personal.email': policy('policy-email'),
        'personal.phone': policy('policy-phone'),
        'preferences.expectedSalary': policy('policy-salary'),
        'preferences.workAuthorization': policy('policy-workauth'),
        'personal.gender': policy('policy-gender'),
        LEGAL: 'NEVER',
      },
    },
  });
  show('home');
});

document.getElementById('open-test')!.addEventListener('click', async () => {
  const { settings } = await bg<{ settings: { apiBase: string } }>({ type: 'GET_SETTINGS' });
  window.open(`${settings.apiBase.replace(/\/$/, '')}/test-apply`, '_blank');
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

void refresh();
