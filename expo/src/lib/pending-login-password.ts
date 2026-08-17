/** Stash the password used at login so first-change can verify current without retyping. */
let pendingCurrentPassword: string | null = null

export function stashPendingLoginPassword(password: string) {
  pendingCurrentPassword = password
}

export function consumePendingLoginPassword(): string | null {
  const value = pendingCurrentPassword
  pendingCurrentPassword = null
  return value
}

export function peekPendingLoginPassword(): string | null {
  return pendingCurrentPassword
}

export function clearPendingLoginPassword() {
  pendingCurrentPassword = null
}
