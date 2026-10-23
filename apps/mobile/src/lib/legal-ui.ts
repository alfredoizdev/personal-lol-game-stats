/** Profile → Legal: the LEGAL_VERSION stored in user metadata at sign-up, or a dash for accounts created before it existed. */
export function acceptedVersionLabel(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : '—'
}
