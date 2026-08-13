import { ExtractedField } from './field-extractor';
import { getAdapter } from './adapters/generic';
import { detectApplicationPage as detectByScore, scoreApplicationPage } from './application-detector';

export function hasVisibleForm(): boolean {
  return getAdapter(location.href).inspect().length > 0;
}

export function detectApplicationPage(): boolean {
  return detectByScore();
}

export function getExtractedFields(): ExtractedField[] {
  return getAdapter(location.href).inspect();
}

export { scoreApplicationPage };
