const answers = new Map<string, string>();

export function rememberSessionAnswer(key: string, value: string) {
  if (!key || !value) return;
  answers.set(key, value);
  const short = key.split('.').pop();
  if (short) answers.set(short, value);
}

export function getSessionAnswer(key: string): string {
  if (answers.get(key)) return answers.get(key)!;
  const short = key.split('.').pop() || '';
  return answers.get(short) || '';
}

export function clearSessionAnswers() {
  answers.clear();
}
