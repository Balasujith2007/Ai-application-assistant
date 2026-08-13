const NEXT_WORDS = ['next', 'continue', 'save and continue', 'proceed', 'go to next'];
const SUBMIT_WORDS = ['submit', 'submit application', 'finish', 'complete application', 'send application'];

function buttonText(el: HTMLElement): string {
  return (el.innerText || el.getAttribute('value') || el.getAttribute('aria-label') || '').toLowerCase().trim();
}

export function findNextButton(): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>('button, a, input[type="button"], input[type="submit"], [role="button"]'));
  for (const el of els) {
    const t = buttonText(el);
    if (SUBMIT_WORDS.some((w) => t === w || t.includes(w))) continue;
    if (NEXT_WORDS.some((w) => t === w || t.startsWith(w))) return el;
  }
  return null;
}

export function findSubmitButton(): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>('button, a, input[type="submit"], [role="button"]'));
  for (const el of els) {
    const t = buttonText(el);
    if (SUBMIT_WORDS.some((w) => t === w || t.includes(w))) return el;
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
