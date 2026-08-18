let epoch = 0;

export function currentEpoch(): number {
  return epoch;
}

export function bumpNavigation(): number {
  epoch += 1;
  return epoch;
}

export function isStale(snapshot: number): boolean {
  return snapshot !== epoch;
}
