import { extractFields, ExtractedField } from '../field-extractor';

export interface ApplicationAdapter {
  name: string;
  match(url: string): boolean;
  inspect(): ExtractedField[];
}

export const GenericApplicationAdapter: ApplicationAdapter = {
  name: 'generic',
  match() {
    return true;
  },
  inspect() {
    return extractFields();
  },
};

export function getAdapter(url: string): ApplicationAdapter {
  void url;
  return GenericApplicationAdapter;
}
