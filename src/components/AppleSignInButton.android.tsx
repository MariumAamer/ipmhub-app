/* eslint-disable prettier/prettier */
import {AuthUser} from '../api/authApi';

// Sign in with Apple is iOS-only (App Store guideline 4.8).
// On Android this renders nothing, and the Apple package is never bundled.
interface Props {
  disabled?: boolean;
  mode?: 'sign-in' | 'sign-up';
  onSuccess: (user: AuthUser) => void | Promise<void>;
  onError: (message: string) => void;
}

const AppleSignInButton = (_props: Props) => null;

export default AppleSignInButton;
