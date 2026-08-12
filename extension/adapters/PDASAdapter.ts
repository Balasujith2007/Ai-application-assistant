import { FormInspector, InspectableField } from '../FormInspector';
import { SiteAdapter } from './GenericFormAdapter';

export class PDASAdapter implements SiteAdapter {
  public name = 'PDASAdapter';

  public matchUrl(url: string): boolean {
    return url.includes('pdas.org.in');
  }

  public inspectFields(): InspectableField[] {
    // PDAS forms rely on standard inputs and form controls
    return FormInspector.inspect();
  }
}
