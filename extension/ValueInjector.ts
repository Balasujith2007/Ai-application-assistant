export class ValueInjector {
  public static inject(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string): boolean {
    if (!element || value === undefined || value === null || value === '') return false;

    try {
      element.focus();

      if (element.tagName.toLowerCase() === 'select') {
        const selectEl = element as HTMLSelectElement;
        const normalizedVal = value.toLowerCase();
        let matchedIndex = -1;

        for (let i = 0; i < selectEl.options.length; i++) {
          const optText = selectEl.options[i].text.toLowerCase();
          const optVal = selectEl.options[i].value.toLowerCase();
          if (optText.includes(normalizedVal) || optVal.includes(normalizedVal)) {
            matchedIndex = i;
            break;
          }
        }

        if (matchedIndex !== -1) {
          selectEl.selectedIndex = matchedIndex;
        } else {
          return false;
        }
      } else {
        // Native setter call to bypass React/Vue property descriptor overrides
        const prototype = Object.getPrototypeOf(element);
        const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

        if (valueSetter) {
          valueSetter.call(element, value);
        } else {
          element.value = value;
        }
      }

      // Dispatch synthetic DOM events
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));

      return true;
    } catch (err) {
      console.error('ValueInjector error:', err);
      return false;
    }
  }
}
