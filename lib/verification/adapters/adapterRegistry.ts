import { PlatformAdapter } from './adapterInterface';
import { UnstopAdapter } from './unstopAdapter';
import { GoogleFormsAdapter } from './googleFormsAdapter';
import { HireTodayAdapter } from './hireTodayAdapter';
import { ExtractedEvidenceData } from '../types';

export class AdapterRegistry {
  private adapters: PlatformAdapter[] = [
    new UnstopAdapter(),
    new GoogleFormsAdapter(),
    new HireTodayAdapter()
  ];

  public registerAdapter(adapter: PlatformAdapter) {
    this.adapters.push(adapter);
  }

  public findMatchingAdapter(url?: string | null, text?: string | null, sender?: string | null): PlatformAdapter | null {
    for (const adapter of this.adapters) {
      if (adapter.matches(url, text, sender)) {
        return adapter;
      }
    }
    return null;
  }

  public applyAdapterEnhancements(
    base: ExtractedEvidenceData,
    rawText: string,
    lines: string[],
    url?: string | null
  ): ExtractedEvidenceData {
    const adapter = this.findMatchingAdapter(url, rawText, base.senderDomain.value);
    if (!adapter) return base;

    const specific = adapter.extract(rawText, lines);

    // Merge specific findings where base was missing or specific is higher confidence
    return {
      ...base,
      platformName: specific.platformName?.found ? specific.platformName : base.platformName,
      referenceId: specific.referenceId?.found ? specific.referenceId : base.referenceId,
      opportunityName: (!base.opportunityName.found && specific.opportunityName?.found) ? specific.opportunityName : base.opportunityName,
      confirmationWording: (base.confirmationWording.value === 'AMBIGUOUS_OR_UNREADABLE' && specific.confirmationWording?.found)
        ? specific.confirmationWording
        : base.confirmationWording
    };
  }
}

export const adapterRegistry = new AdapterRegistry();
