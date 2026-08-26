export interface ExtractedField {
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLElement;
  id: string;
  name: string;
  type: string;
  placeholder: string;
  autocomplete: string;
  label: string;
  required: boolean;
  options?: string[];
  isContentEditable?: boolean;
}

function visible(el: HTMLElement): boolean {
  if (el.getAttribute('type') === 'hidden') return false;
  if (el instanceof HTMLInputElement && el.type === 'file') {
    // Custom-styled file upload inputs are often hidden with display:none or 0 width/height.
    // Extract them anyway so the agent can autofill / attach the file.
    return true;
  }
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function labelFor(el: HTMLElement): string {
  const type = (el.getAttribute('type') || '').toLowerCase();
  const fieldset = el.closest('fieldset');
  const legend = fieldset?.querySelector(':scope > legend')?.textContent?.trim() || '';
  if ((type === 'radio' || type === 'checkbox') && legend) return legend;

  const aria = el.getAttribute('aria-label') || '';
  if (el.id) {
    const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (lab?.textContent) return lab.textContent.trim();
  }
  const wrapping = el.closest('label');
  if (wrapping?.textContent) {
    const wrapText = wrapping.textContent.trim();
    if (!(type === 'radio' || type === 'checkbox') || !legend) return wrapText;
  }
  const prev = el.previousElementSibling;
  if (prev && prev.tagName === 'LABEL') return (prev.textContent || '').trim();
  const parentLabel = el.parentElement?.querySelector('label');
  if (parentLabel?.textContent) return parentLabel.textContent.trim();
  return legend || aria;
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

  // Also capture contenteditable fields (rich-text editors used by some ATS platforms)
  const contentEditables = Array.from(root.querySelectorAll<HTMLElement>('[contenteditable="true"],[contenteditable=""]'))
    .filter((el) => {
      if (!visible(el)) return false;
      const role = el.getAttribute('role') || '';
      // Skip toolbar items and buttons
      if (['button', 'menuitem', 'option', 'tab', 'listitem'].includes(role)) return false;
      return true;
    });
  for (const el of contentEditables) {
    out.push({
      element: el,
      id: el.id || '',
      name: el.getAttribute('name') || el.getAttribute('data-field') || '',
      type: 'contenteditable',
      placeholder: el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || '',
      autocomplete: '',
      label: labelFor(el),
      required: el.getAttribute('aria-required') === 'true',
      isContentEditable: true,
    });
  }

  return out;
}
