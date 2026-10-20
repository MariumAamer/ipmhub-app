// Type declaration so TypeScript can resolve '../components/AppleSignInButton'.
// Metro picks AppleSignInButton.ios.tsx or AppleSignInButton.android.tsx at build time.
import React from 'react';
import {AuthUser} from '../api/authApi';

interface Props {
  disabled?: boolean;
  /** 'sign-in' → "Sign in with Apple", 'sign-up' → "Sign up with Apple" */
  mode?: 'sign-in' | 'sign-up';
  onSuccess: (user: AuthUser) => void | Promise<void>;
  onError: (message: string) => void;
}

declare const AppleSignInButton: (props: Props) => React.JSX.Element | null;
export default AppleSignInButton;
