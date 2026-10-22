/**
 * When to register or revoke this device's push token. Registration follows
 * the "Goal updates during games" toggle, so the OS permission prompt and the
 * token row only exist for users who asked (Privacy Policy, "Push notifications").
 * `prev` is whether this device is currently registered (null = unknown yet).
 */
export function pushRegistrationAction(
  prev: boolean | null,
  next: { signedIn: boolean; goalPush: boolean | null },
): 'register' | 'revoke' | null {
  if (!next.signedIn || next.goalPush === null) return null
  if (next.goalPush) return prev ? null : 'register'
  return prev ? 'revoke' : null
}
