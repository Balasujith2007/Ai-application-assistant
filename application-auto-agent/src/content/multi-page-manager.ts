const NEXT_WORDS = ['next', 'continue', 'save and continue', 'proceed', 'go to next', 'save & continue'];

function buttonText(el: HTMLElement): string {
  return (el.innerText || el.getAttribute('value') || el.getAttribute('aria-label') || '').toLowerCase().trim();
}

/** Never auto-click these — the user must submit. */
export function isProtectedSubmitText(t: string): boolean {
  const n = (t || '').toLowerCase().trim();
  if (!n) return false;
  if (['submit', 'apply', 'send', 'finish'].includes(n)) return true;
  return /submit application|apply now|send application|finish application|complete application/.test(n)
    || /^submit\b/.test(n)
    || /^apply\b/.test(n);
}

export function findNextButton(): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>('button, a, input[type="button"], input[type="submit"], [role="button"]'));
  for (const el of els) {
    const t = buttonText(el);
    if (isProtectedSubmitText(t)) continue;
    if (NEXT_WORDS.some((w) => t === w || t.startsWith(w))) return el;
  }
  return null;
}

export function findSubmitButton(): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>('button, a, input[type="submit"], [role="button"]'));
  for (const el of els) {
    const t = buttonText(el);
    if (isProtectedSubmitText(t)) return el;
  }
  return null;
}

export function clickNext(): boolean {
  const btn = findNextButton();
  if (!btn) return false;
  btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  btn.click();
  return true;
}
