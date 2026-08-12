export class ResumeHandler {
  public static async handleResume(
    field: HTMLInputElement,
    resumeData: { fileName: string; downloadUrl: string } | null
  ): Promise<{ status: 'ATTACHED' | 'MANUAL_REQUIRED'; message: string }> {
    if (!field || !resumeData) {
      return { status: 'MANUAL_REQUIRED', message: 'Resume upload requires manual file selection.' };
    }

    try {
      // Create a DataTransfer object to simulate file attachment if browser security allows
      const res = await fetch(resumeData.downloadUrl);
      if (!res.ok) throw new Error('Failed to fetch resume blob.');

      const blob = await res.blob();
      const file = new File([blob], resumeData.fileName || 'resume.pdf', { type: 'application/pdf' });

      const container = new DataTransfer();
      container.items.add(file);
      field.files = container.files;

      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));

      return { status: 'ATTACHED', message: 'Active resume automatically attached ✓' };
    } catch (err) {
      console.warn('Programmatic file injection restricted by browser policy:', err);
      return { status: 'MANUAL_REQUIRED', message: 'Website requires manual file selection for resume.' };
    }
  }
}
