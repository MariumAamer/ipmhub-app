/* eslint-disable prettier/prettier */
/**
 * After ANY successful sign-in: if the account is scheduled for deletion,
 * show the "Restore account?" sheet (rendered by ScheduledDeletionSheetHost,
 * mounted once in AppNavigator) before the member enters the app.
 *
 *   Restore Account              → POST /account/deletion/restore → 'continue'
 *   Keep Deletion and Sign Out   → POST /account/deletion/keep (server ends the
 *                                  session), local session cleared → 'signed_out'
 *   X / tap outside              → local sign-out only (deletion stays
 *                                  scheduled, nothing is sent) → 'signed_out'
 *
 * Callers: `if ((await resolveScheduledDeletion()) === 'signed_out') return;`
 * A failed status lookup never blocks sign-in.
 */
import {Alert} from 'react-native';
import {logoutUser} from '../api/authApi';
import {
  getDeletionStatus,
  restoreAccount,
  keepDeletion,
} from '../api/accountApi';

export type DeletionPromptResult = 'continue' | 'signed_out';

export interface DeletionPromptState {
  visible: boolean;
  dueLabel: string;
  busy: boolean;
}

let state: DeletionPromptState = {visible: false, dueLabel: '', busy: false};
let pending: Promise<DeletionPromptResult> | null = null;
let settle: ((r: DeletionPromptResult) => void) | null = null;
const listeners = new Set<() => void>();

const setState = (next: Partial<DeletionPromptState>) => {
  state = {...state, ...next};
  listeners.forEach(l => l());
};

// useSyncExternalStore contract
export const subscribeDeletionPrompt = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export const getDeletionPromptState = () => state;

const finish = (result: DeletionPromptResult) => {
  setState({visible: false, busy: false});
  const done = settle;
  settle = null;
  pending = null;
  done?.(result);
};

export const resolveScheduledDeletion =
  async (): Promise<DeletionPromptResult> => {
    if (pending) return pending;
    let status;
    try {
      status = await getDeletionStatus();
    } catch {
      return 'continue';
    }
    if (!status.scheduled) return 'continue';

    pending = new Promise<DeletionPromptResult>(resolve => {
      settle = resolve;
    });
    setState({visible: true, dueLabel: status.dueLabel, busy: false});
    return pending;
  };

// ─── Sheet actions ────────────────────────────────────────────────────────────
export const confirmRestore = async () => {
  if (state.busy) return;
  setState({busy: true});
  try {
    await restoreAccount();
    finish('continue');
  } catch (e: any) {
    setState({busy: false});
    Alert.alert('Could not restore your account', e?.message || 'Please try again.');
  }
};

export const confirmKeepDeletion = async () => {
  if (state.busy) return;
  setState({busy: true});
  try {
    await keepDeletion();
  } catch {
    // Deletion stays scheduled either way — still sign out locally.
  }
  await logoutUser();
  finish('signed_out');
};

export const dismissDeletionPrompt = async () => {
  if (state.busy) return;
  await logoutUser();
  finish('signed_out');
};
