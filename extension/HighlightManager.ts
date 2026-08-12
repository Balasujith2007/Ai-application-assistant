export class HighlightManager {
  public static highlight(
    element: HTMLElement,
    status: 'autofilled' | 'needs_review' | 'manual_required'
  ): void {
    if (!element) return;

    element.classList.add('careerai-agent-highlight');

    if (status === 'autofilled') {
      element.style.borderColor = '#10b981';
      element.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.2)';
      element.style.transition = 'all 0.3s ease';
    } else if (status === 'needs_review') {
      element.style.borderColor = '#f59e0b';
      element.style.boxShadow = '0 0 0 2px rgba(245, 158, 11, 0.2)';
    } else if (status === 'manual_required') {
      element.style.borderColor = '#ef4444';
      element.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
    }
  }
}
