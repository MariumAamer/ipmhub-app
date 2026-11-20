/* eslint-disable prettier/prettier */
/**
 * "Restore account?" sheet shown after sign-in when the account is scheduled
 * for deletion (Figma: Sign In – Restore account). Thin wrapper around
 * StatusSheet, driven by utils/deletionPrompt. Mounted once in AppNavigator
 * so it works for every sign-in path (email, Google, LinkedIn, Apple).
 */
import React, {useSyncExternalStore} from 'react';
import StatusSheet from './StatusSheet';
import {
  subscribeDeletionPrompt,
  getDeletionPromptState,
  confirmRestore,
  confirmKeepDeletion,
  dismissDeletionPrompt,
} from '../utils/deletionPrompt';

const ScheduledDeletionSheetHost = () => {
  const {visible, dueLabel, busy} = useSyncExternalStore(
    subscribeDeletionPrompt,
    getDeletionPromptState,
  );

  return (
    <StatusSheet
      visible={visible}
      variant="error"
      headerTitle="Restore account?"
      title="Your account is scheduled for deletion"
      message={`It will be permanently deleted${dueLabel ? ` on ${dueLabel}` : ''}. Restore it to keep your profile, courses and progress.`}
      primaryLabel="Restore Account"
      onPrimary={confirmRestore}
      primaryDisabled={busy}
      secondaryLabel="Keep Deletion and Sign Out"
      onSecondary={confirmKeepDeletion}
      onClose={dismissDeletionPrompt}
    />
  );
};

export default ScheduledDeletionSheetHost;
