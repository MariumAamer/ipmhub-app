/* eslint-disable prettier/prettier */
/**
 * AccountVerifiedSheet — "Account verified" bottom sheet (Figma: Sign In –
 * Account verified). Thin wrapper around StatusSheet.
 *
 * Usage:
 *   <AccountVerifiedSheet visible={verified} onClose={() => setVerified(false)} />
 *
 * Both the X and the "Sign In" button just dismiss the sheet, leaving the
 * user on the sign-in form.
 */

import React from 'react';
import StatusSheet from './StatusSheet';

interface AccountVerifiedSheetProps {
  visible: boolean;
  onClose: () => void;
}

const AccountVerifiedSheet = ({visible, onClose}: AccountVerifiedSheetProps) => (
  <StatusSheet
    visible={visible}
    variant="success"
    headerTitle="Account verified"
    title="You're all set!"
    message="Your IPM Hub account is now active. Sign in to start connecting with the community."
    primaryLabel="Sign In"
    onPrimary={onClose}
    onClose={onClose}
  />
);

export default AccountVerifiedSheet;
