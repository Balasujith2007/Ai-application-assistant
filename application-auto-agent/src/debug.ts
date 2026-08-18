export function applyLog(scope: string, message: string) {
  try {
    const host = typeof location !== 'undefined' ? location.hostname : '';
    if (host !== 'localhost' && host !== '127.0.0.1') return;
    console.info(`[ApplyAI][${scope}] ${message}`);
  } catch {
    /* ignore */
  }
}
