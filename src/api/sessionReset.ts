// src/api/sessionReset.ts
//
// One place to wipe everything that belongs to the signed-in account.
// Modules that keep per-user state (module-level caches, local storage keys)
// register a reset function here; logoutUser() and saveUser() (i.e. every
// login) call resetSessionState(), so the next account can never see the
// previous account's avatar, unread counts, certificates, registrations, etc.
//
// No imports on purpose, so any module can import this without creating a
// circular dependency.

type Resetter = () => void | Promise<void>;

const resetters = new Set<Resetter>();

export const registerSessionReset = (fn: Resetter): void => {
  resetters.add(fn);
};

export const resetSessionState = async (): Promise<void> => {
  await Promise.allSettled(
    [...resetters].map(fn => Promise.resolve().then(fn)),
  );
};
