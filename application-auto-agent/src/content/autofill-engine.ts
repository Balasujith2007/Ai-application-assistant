export function readFieldValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  if (element instanceof HTMLSelectElement) {
    return element.options[element.selectedIndex]?.text || element.value || '';
  }
  if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
    return element.checked ? (element.value || 'true') : '';
  }
  return element.value || '';
}

export function valuesMatch(actual: string, expected: string): boolean {
  const a = actual.trim().toLowerCase();
  const e = expected.trim().toLowerCase();
  if (!a || !e) return false;
  return a === e || a.includes(e) || e.includes(a);
}

export function fillAndVerify(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
): boolean {
  if (!nativeSetValue(element, value)) return false;
  if (element instanceof HTMLInputElement && element.type === 'radio' && element.name) {
    const group = document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(element.name)}"]`);
    const selected = Array.from(group).find((r) => r.checked);
    if (!selected) return false;
    const lab = document.querySelector(`label[for="${CSS.escape(selected.id)}"]`)?.textContent || '';
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
          const lab = document.querySelector(`label[for="${CSS.escape(r.id)}"]`)?.textContent || r.value;
          if (lab.toLowerCase().includes(needle) || r.value.toLowerCase().includes(needle)) matched = r;
          if (yes && /^(yes|y|true|authorized)/i.test(lab.trim() || r.value)) matched = r;
        });
        if (!matched) return false;
        matched.checked = true;
        element = matched;
      }
    } else {
      const proto = Object.getPrototypeOf(element);
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(element, value);
      else (element as HTMLInputElement).value = value;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  } catch {
    return false;
  }
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

export async function tryAttachResume(
  input: HTMLInputElement,
  resume?: { fileName?: string; downloadUrl?: string } | null,
  apiBase?: string,
): Promise<boolean> {
  if (!resume?.downloadUrl) return false;
  try {
    const url = resume.downloadUrl.startsWith('http') ? resume.downloadUrl : `${apiBase || ''}${resume.downloadUrl}`;
    const res = await fetch(url);
    if (!res.ok) return false;
    const blob = await res.blob();
    const file = new File([blob], resume.fileName || 'resume.pdf', { type: blob.type || 'application/pdf' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  } catch {
    return false;
  }
}
