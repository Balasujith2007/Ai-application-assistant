import { FormInspector, InspectableField } from '../FormInspector';
import { SiteAdapter } from './GenericFormAdapter';

export class UnstopAdapter implements SiteAdapter {
  public name = 'UnstopAdapter';

  public matchUrl(url: string): boolean {
    return url.includes('unstop.com');
  }

  public inspectFields(): InspectableField[] {
    return FormInspector.inspect();
  }
}
