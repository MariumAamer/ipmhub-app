/**
 * pendingToast — hand a one-line message to the screen we are about to return
 * to. SetPasswordScreen sets it, goes back, and Login Information picks it up
 * on focus and shows it once.
 */
let pending: string | null = null;

export const setPendingToast = (message: string): void => {
  pending = message;
};

export const takePendingToast = (): string | null => {
  const m = pending;
  pending = null;
  return m;
};
