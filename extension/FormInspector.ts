export interface InspectableField {
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  id: string;
  name: string;
  type: string;
  placeholder: string;
  label: string;
  parentText: string;
  options?: string[];
}

export class FormInspector {
  public static inspect(root: Document | HTMLElement = document): InspectableField[] {
    const fields: InspectableField[] = [];
    const elements = root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input, select, textarea'
    );

    elements.forEach((el) => {
      const type = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase();

      // Skip submit, button, image, reset
      if (['submit', 'button', 'image', 'reset', 'hidden'].includes(type)) return;

      const id = el.id || '';
      const name = el.getAttribute('name') || '';
      const placeholder = el.getAttribute('placeholder') || el.getAttribute('aria-placeholder') || '';
      const ariaLabel = el.getAttribute('aria-label') || '';

      // Find label
      let labelText = ariaLabel;
      if (id) {
        const associatedLabel = root.querySelector(`label[for="${id}"]`);
        if (associatedLabel) {
          labelText = labelText ? `${labelText} ${associatedLabel.textContent}` : associatedLabel.textContent || '';
        }
      }

      if (!labelText && el.parentElement) {
        const parentLabel = el.parentElement.querySelector('label');
        if (parentLabel) {
          labelText = parentLabel.textContent || '';
        }
      }

      // Collect options if select element
      let options: string[] | undefined;
      if (el.tagName.toLowerCase() === 'select') {
        const selectEl = el as HTMLSelectElement;
        options = Array.from(selectEl.options).map((opt) => opt.text.trim());
      }

      const parentText = el.parentElement?.innerText || '';

      fields.push({
        element: el,
        id,
        name,
        type,
        placeholder,
        label: labelText.trim(),
        parentText: parentText.slice(0, 100).trim(),
        options
      });
    });

    return fields;
  }
}
