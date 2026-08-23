function fillContentEditable(el: HTMLElement, value: string): boolean {
  try {
    el.focus();
    el.textContent = value;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    return (el.textContent || '').trim().toLowerCase().includes(value.trim().toLowerCase());
  } catch {
    return false;
  }
}

export function readFieldValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement): string {
  if ((element as HTMLElement).isContentEditable || element.getAttribute?.('contenteditable')) {
    return (element as HTMLElement).textContent?.trim() || '';
  }
  if (element instanceof HTMLSelectElement) {
    return element.options[element.selectedIndex]?.text || element.value || '';
  }
  if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
    return element.checked ? (element.value || 'true') : '';
  }
  return (element as HTMLInputElement).value || '';
}

export function valuesMatch(actual: string, expected: string): boolean {
  const a = actual.trim().toLowerCase();
  const e = expected.trim().toLowerCase();
  if (!a || !e) return false;
  return a === e || a.includes(e) || e.includes(a);
}

export function fillAndVerify(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement,
  value: string,
): boolean {
  if ((element as HTMLElement).isContentEditable || element.getAttribute?.('contenteditable') === 'true' || element.getAttribute?.('contenteditable') === '') {
    return fillContentEditable(element as HTMLElement, value);
  }
  if (!nativeSetValue(element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value)) return false;
  if (element instanceof HTMLInputElement && element.type === 'radio' && element.name) {
    const group = document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(element.name)}"]`);
    const selected = Array.from(group).find((r) => r.checked);
    if (!selected) return false;
    const wrapping = selected.closest('label')?.textContent || '';
    const lab = document.querySelector(`label[for="${CSS.escape(selected.id)}"]`)?.textContent || wrapping || '';
    return valuesMatch(`${selected.value} ${lab}`, value) || valuesMatch(selected.value, value) || valuesMatch(lab, value);
  }
  return valuesMatch(readFieldValue(element), value);
}

export function nativeSetValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): boolean {
  if (!element || value == null || value === '') return false;
  try {
    element.focus();
    if (element instanceof HTMLSelectElement) {
      const needle = value.toLowerCase();
      let idx = -1;
      for (let i = 0; i < element.options.length; i++) {
        const t = element.options[i].text.toLowerCase();
        const v = element.options[i].value.toLowerCase();
        if (t === needle || v === needle || t.includes(needle) || v.includes(needle) || needle.includes(t)) {
          idx = i;
          break;
        }
      }
      if (idx < 0) return false;
      element.selectedIndex = idx;
    } else if (element instanceof HTMLInputElement && (element.type === 'radio' || element.type === 'checkbox')) {
      const needle = value.toLowerCase();
      const yes = ['yes', 'true', 'y', 'authorized', 'eligible'].some((w) => needle.includes(w));
      const no = ['no', 'false', 'n'].includes(needle);
      if (element.type === 'checkbox') {
        // Never blindly tick checkboxes (terms / marketing / legal handled upstream).
        return false;
      } else {
        const group = document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(element.name)}"]`);
        let matched: HTMLInputElement | null = null;
        group.forEach((r) => {
          const wrapping = r.closest('label')?.textContent || '';
          const lab = document.querySelector(`label[for="${CSS.escape(r.id)}"]`)?.textContent || wrapping || r.value;
          if (lab.toLowerCase().includes(needle) || r.value.toLowerCase().includes(needle)) matched = r;
          if (yes && /^(yes|y|true|authorized)/i.test((lab.trim() || r.value))) matched = r;
          if (no && /^(no|n|false)/i.test((lab.trim() || r.value))) matched = r;
        });
        if (!matched) return false;
        setNativeChecked(matched, true);
        element = matched;
      }
    } else {
      const proto = Object.getPrototypeOf(element);
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(element, value);
      else (element as HTMLInputElement).value = value;
    }
    element.dispatchEvent(new Event('click', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  } catch {
    return false;
  }
}

function setNativeChecked(el: HTMLInputElement, checked: boolean) {
  const proto = Object.getPrototypeOf(el) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(proto, 'checked')?.set
    || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set;
  if (setter) setter.call(el, checked);
  else el.checked = checked;
}

export function highlight(el: HTMLElement, kind: 'filled' | 'ask' | 'skip' | 'file') {
  const colors = {
    filled: '#10b981',
    ask: '#f59e0b',
    skip: '#ef4444',
    file: '#6366f1',
  };
  el.style.outline = `2px solid ${colors[kind]}`;
  el.style.outlineOffset = '2px';
}

export type ResumeAttachMeta = {
  fileName?: string;
  downloadUrl?: string;
  mimeType?: string;
};

export type ResumeBytes = {
  bytes: ArrayBuffer;
  fileName: string;
  mimeType: string;
};

/** Assign a File to an <input type="file"> and fire events React/vanilla listeners expect. */
export function assignFileToInput(input: HTMLInputElement, file: File): boolean {
  if (!input || input.type !== 'file') return false;
  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    // Prefer the DataTransfer FileList assignment (works in extension content scripts).
    try {
      input.files = dt.files;
    } catch {
      // Some environments throw on direct assignment; try defineProperty.
      Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const ok = !!(input.files && input.files.length > 0 && input.files[0].name === file.name);
    return ok;
  } catch {
    return false;
  }
}

export function fileFromResumeBytes(data: ResumeBytes): File {
  return new File([data.bytes], data.fileName || 'resume.pdf', {
    type: data.mimeType || 'application/pdf',
  });
}

/**
 * Attach a CareerAI resume to a file input.
 * Prefer an authenticated `fetchResume` (service worker) so JWT download works.
 * Falls back to plain fetch for sessionId-based URLs.
 * Returns false when no resume / download fails / browser blocks FileList assignment.
 */
export async function tryAttachResume(
  input: HTMLInputElement,
  resume?: ResumeAttachMeta | null,
  apiBase?: string,
  fetchResume?: (resume: ResumeAttachMeta, apiBase?: string) => Promise<ResumeBytes | null>,
): Promise<boolean> {
  // Require explicit per-user resume metadata — never invent or fetch a generic resume.
  if (!resume?.downloadUrl) return false;
  try {
    let data: ResumeBytes | null = null;
    if (fetchResume) {
      data = await fetchResume(resume, apiBase);
    } else {
      const url = resume.downloadUrl.startsWith('http')
        ? resume.downloadUrl
        : `${apiBase || ''}${resume.downloadUrl}`;
      const res = await fetch(url);
      if (!res.ok) return false;
      const buf = await res.arrayBuffer();
      if (!buf.byteLength) return false;
      const cd = res.headers.get('Content-Disposition') || '';
      const nameMatch = /filename\*?=(?:UTF-8''|")?([^";]+)"?/i.exec(cd);
      const headerName = nameMatch?.[1] ? decodeURIComponent(nameMatch[1].replace(/"/g, '')) : '';
      data = {
        bytes: buf,
        fileName: resume.fileName || headerName || 'resume.pdf',
        mimeType: resume.mimeType || res.headers.get('Content-Type') || 'application/pdf',
      };
    }
    if (!data || !data.bytes.byteLength) return false;
    return assignFileToInput(input, fileFromResumeBytes(data));
  } catch {
    return false;
  }
}
