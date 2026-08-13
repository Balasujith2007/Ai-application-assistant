export function isCareerAiAppShell(): boolean {
  const path = location.pathname;
  if (path.startsWith('/test-apply')) return false;
  if (location.port === '3000' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return !path.startsWith('/test-apply');
  }
  return !!document.querySelector('meta[name="careerai-app"]');
}

export function getSessionIdFromPage(): string | null {
  const q = new URLSearchParams(location.search).get('careerai_session_id');
  if (q) {
    sessionStorage.setItem('careerai_agent_session_id', q);
    return q;
  }
  return sessionStorage.getItem('careerai_agent_session_id');
}

export function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
