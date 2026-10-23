// Sign in with Apple + "Hide My Email" gives the app a random forwarding
// address like 2682xxxx@privaterelay.appleid.com. That is the real account
// email, but it looks like a glitch if shown to the user as-is.

export const isApplePrivateRelay = (email?: string | null): boolean =>
  /@privaterelay\.appleid\.com$/i.test((email || '').trim());

// Text to show next to "Log Out". Real emails are shown unchanged.
export const emailForDisplay = (email?: string | null): string =>
  isApplePrivateRelay(email) ? 'Signed in with Apple' : email || '';
