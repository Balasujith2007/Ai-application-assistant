export interface ExtractedField {
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  id: string;
  name: string;
  type: string;
  placeholder: string;
  autocomplete: string;
  label: string;
  required: boolean;
  options?: string[];
}

function visible(el: HTMLElement): boolean {
  if (el.getAttribute('type') === 'hidden') return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function labelFor(el: HTMLElement): string {
  const aria = el.getAttribute('aria-label') || '';
  if (el.id) {
    const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (lab?.textContent) return lab.textContent.trim();
  }
  const wrapping = el.closest('label');
  if (wrapping?.textContent) return wrapping.textContent.trim();
  const prev = el.previousElementSibling;
  if (prev && prev.tagName === 'LABEL') return (prev.textContent || '').trim();
  const parentLabel = el.parentElement?.querySelector('label');
  if (parentLabel?.textContent) return parentLabel.textContent.trim();
  return aria;
}

export function extractFields(root: ParentNode = document): ExtractedField[] {
  const nodes = Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    'input, select, textarea',
  ));
  const out: ExtractedField[] = [];
  for (const el of nodes) {
    const type = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase();
    if (['submit', 'button', 'image', 'reset', 'hidden'].includes(type)) continue;
    if (!visible(el)) continue;
    const options = el instanceof HTMLSelectElement
      ? Array.from(el.options).map((o) => o.text.trim())
      : undefined;
    out.push({
      element: el,
      id: el.id || '',
      name: el.getAttribute('name') || '',
      type,
      placeholder: el.getAttribute('placeholder') || '',
      autocomplete: el.getAttribute('autocomplete') || '',
      label: labelFor(el),
      required: el.hasAttribute('required') || el.getAttribute('aria-required') === 'true',
      options,
    });
  }
  return out;
}
