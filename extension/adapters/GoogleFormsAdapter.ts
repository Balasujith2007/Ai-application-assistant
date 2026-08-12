import { InspectableField } from '../FormInspector';
import { SiteAdapter } from './GenericFormAdapter';

export class GoogleFormsAdapter implements SiteAdapter {
  public name = 'GoogleFormsAdapter';

  public matchUrl(url: string): boolean {
    return url.includes('docs.google.com/forms');
  }

  public inspectFields(): InspectableField[] {
    const fields: InspectableField[] = [];
    const questionItems = document.querySelectorAll<HTMLElement>('[role="listitem"], .geFormPageItem');

    questionItems.forEach((item) => {
      const heading = item.querySelector('[role="heading"], .M7260d, .header');
      const labelText = heading?.textContent || item.innerText || '';

      const input = item.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        'input[type="text"], input[type="email"], input[type="tel"], textarea, select'
      );

      if (input) {
        fields.push({
          element: input,
          id: input.id || '',
          name: input.name || '',
          type: input.type || 'text',
          placeholder: input.getAttribute('placeholder') || '',
          label: labelText.trim(),
          parentText: item.innerText.slice(0, 100).trim()
        });
      }
    });

    return fields;
  }
}
