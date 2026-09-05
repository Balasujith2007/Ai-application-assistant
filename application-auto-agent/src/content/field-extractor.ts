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
  
  // 1. Fieldset legend (common for radio / checkbox groups)
  const fieldset = el.closest('fieldset, [role="group"], [role="radiogroup"]');
  const legend = fieldset?.querySelector(':scope > legend, :scope > .legend, :scope > [role="heading"]')?.textContent?.trim() || '';
  if ((type === 'radio' || type === 'checkbox') && legend) return legend;

  // 2. aria-labelledby
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
    if (text) return text;
  }

  // 3. aria-label or title
  const aria = el.getAttribute('aria-label') || el.getAttribute('title') || '';
  if (aria && aria.length > 1) return aria.trim();

  // 4. Standard label[for="id"]
  if (el.id) {
    try {
      const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lab?.textContent?.trim()) return lab.textContent.trim();
    } catch { /* ignore */ }
  }

  // 5. Wrapping label
  const wrapping = el.closest('label');
  if (wrapping?.textContent?.trim()) {
    const wrapText = wrapping.textContent.trim();
    if (!(type === 'radio' || type === 'checkbox') || !legend) return wrapText;
  }

  // 6. Sibling label or previous heading
  const prev = el.previousElementSibling;
  if (prev && (prev.tagName === 'LABEL' || prev.classList.contains('label'))) return (prev.textContent || '').trim();

  // 7. Common ATS / Form container label lookup (Greenhouse, Lever, Workday, Google Forms, Ashby)
  const container = el.closest(
    '.form-group, .field, .input-group, [role="listitem"], .form-field, .application-question, .postings-group, .freebirdFormviewerViewItemsItemItem, .js-field, .form-row, .question-wrapper, .field-wrapper'
  );
  if (container) {
    const heading = container.querySelector(
      'label, .label, [role="heading"], h3, h4, .title, .M7eMe, .freebirdFormviewerViewItemsItemItemTitle, [data-qa="label"]'
    );
    if (heading?.textContent?.trim()) {
      return heading.textContent.trim();
    }
  }

  // 8. Parent label element
  const parentLabel = el.parentElement?.querySelector('label, .label');
  if (parentLabel?.textContent?.trim()) return parentLabel.textContent.trim();

  // 9. Placeholder or custom data-label
  const dataLabel = el.getAttribute('data-label') || el.getAttribute('data-placeholder') || el.getAttribute('placeholder') || '';
  return legend || aria || dataLabel.trim();
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
