type Snapshot =
  | { kind: 'value'; el: HTMLInputElement | HTMLTextAreaElement; original: string }
  | { kind: 'select'; el: HTMLSelectElement; original: number }
  | { kind: 'check'; el: HTMLInputElement; original: boolean };

const stack: Snapshot[] = [];

export function captureOriginal(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  if (stack.some((s) => s.el === el)) return;
  if (el instanceof HTMLSelectElement) {
    stack.push({ kind: 'select', el, original: el.selectedIndex });
    return;
  }
  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
    stack.push({ kind: 'check', el, original: el.checked });
    return;
  }
  stack.push({ kind: 'value', el: el as HTMLInputElement | HTMLTextAreaElement, original: el.value });
}

export function undoAll(): number {
  let n = 0;
  for (const item of stack) {
    try {
      if (item.kind === 'select') item.el.selectedIndex = item.original;
      else if (item.kind === 'check') item.el.checked = item.original;
      else item.el.value = item.original;
      item.el.dispatchEvent(new Event('input', { bubbles: true }));
      item.el.dispatchEvent(new Event('change', { bubbles: true }));
      n += 1;
    } catch { /* ignore detached nodes */ }
  }
  return n;
}

export function clearUndo() {
  stack.length = 0;
}

export function undoCount() {
  return stack.length;
}
