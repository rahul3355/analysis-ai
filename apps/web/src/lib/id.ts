export function getUniqueId(_prefix: string): string {
  return crypto.randomUUID();
}
export function getNextDocId(): string {
  return crypto.randomUUID();
}
