import { SiteAdapter, GenericFormAdapter } from './adapters/GenericFormAdapter';
import { GoogleFormsAdapter } from './adapters/GoogleFormsAdapter';
import { PDASAdapter } from './adapters/PDASAdapter';
import { UnstopAdapter } from './adapters/UnstopAdapter';
import { ProtectedFieldsGuard } from './ProtectedFieldsGuard';
import { FieldMatcher } from './FieldMatcher';
import { ValueInjector } from './ValueInjector';
import { HighlightManager } from './HighlightManager';
import { ResumeHandler } from './ResumeHandler';

export interface AgentPayload {
  sessionId: string;
  student: Record<string, string>;
  resume: { fileName: string; downloadUrl: string } | null;
  opportunity: { id: string; title: string; organization: string; type: string };
}

export interface AgentExecutionReport {
  sessionId: string;
  totalFieldsDetected: number;
  totalFieldsFilled: number;
  filledFields: { label: string; key: string; confidence: number }[];
  manualFields: string[];
  protectedFieldsSkipped: string[];
  resumeStatus: string;
}

export class AutoFillAgent {
  private adapters: SiteAdapter[] = [
    new GoogleFormsAdapter(),
    new PDASAdapter(),
    new UnstopAdapter()
  ];
  private fallbackAdapter = new GenericFormAdapter();

  public async run(payload: AgentPayload): Promise<AgentExecutionReport> {
    const currentUrl = window.location.href;
    const adapter = this.adapters.find((a) => a.matchUrl(currentUrl)) || this.fallbackAdapter;

    const fields = adapter.inspectFields();

    let fieldsFilled = 0;
    const filledFields: { label: string; key: string; confidence: number }[] = [];
    const manualFields: string[] = [];
    const protectedFieldsSkipped: string[] = [];
    let resumeStatus = 'NOT_APPLICABLE';

    for (const field of fields) {
      // Step 1: Protected Fields Check
      if (ProtectedFieldsGuard.isProtectedField(field)) {
        protectedFieldsSkipped.push(field.label || field.name || field.id || 'Sensitive Field');
        HighlightManager.highlight(field.element, 'manual_required');
        continue;
      }

      // Step 2: Handle File Inputs / Resumes
      if (field.type === 'file') {
        const fileRes = await ResumeHandler.handleResume(field.element as HTMLInputElement, payload.resume);
        resumeStatus = fileRes.message;
        if (fileRes.status === 'ATTACHED') {
          fieldsFilled++;
          HighlightManager.highlight(field.element, 'autofilled');
        } else {
          manualFields.push(field.label || 'Resume Attachment');
          HighlightManager.highlight(field.element, 'manual_required');
        }
        continue;
      }

      // Step 3: Match Field
      const match = FieldMatcher.match(field);

      if (!match || match.confidence < 0.70) {
        manualFields.push(field.label || field.placeholder || field.name || 'Unrecognized Field');
        continue;
      }

      const profileValue = payload.student[match.fieldKey];

      if (!profileValue) {
        manualFields.push(`${field.label || match.fieldKey} (Missing in profile)`);
        HighlightManager.highlight(field.element, 'needs_review');
        continue;
      }

      // Step 4: Inject Value
      const success = ValueInjector.inject(field.element, profileValue);

      if (success) {
        fieldsFilled++;
        filledFields.push({
          label: field.label || field.placeholder || match.fieldKey,
          key: match.fieldKey,
          confidence: match.confidence
        });
        HighlightManager.highlight(
          field.element,
          match.confidence >= 0.90 ? 'autofilled' : 'needs_review'
        );
      } else {
        manualFields.push(field.label || match.fieldKey);
        HighlightManager.highlight(field.element, 'needs_review');
      }
    }

    return {
      sessionId: payload.sessionId,
      totalFieldsDetected: fields.length,
      totalFieldsFilled: fieldsFilled,
      filledFields,
      manualFields,
      protectedFieldsSkipped,
      resumeStatus
    };
  }
}
