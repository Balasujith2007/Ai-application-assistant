import { FormInspector, InspectableField } from '../FormInspector';

export interface SiteAdapter {
  name: string;
  matchUrl(url: string): boolean;
  inspectFields(): InspectableField[];
}

export class GenericFormAdapter implements SiteAdapter {
  public name = 'GenericFormAdapter';

  public matchUrl(): boolean {
    return true; // Fallback for all sites
  }

  public inspectFields(): InspectableField[] {
    return FormInspector.inspect();
  }
}
