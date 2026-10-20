/* eslint-disable prettier/prettier */
import React, {useState} from 'react';
import {Platform, Text, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';
import Svg, {Path, G, Defs, ClipPath, Rect} from 'react-native-svg';
import {appleAuth} from '@invertase/react-native-apple-authentication';
import {appleSocialLogin, AuthUser} from '../api/authApi';

// Sign in with Apple (App Store guideline 4.8). Renders only on iOS, using
// a custom "Continue with Apple" button (black, white Apple logo) per Figma,
// full width and placed first in the social stack per Apple's HIG.
interface Props {
  disabled?: boolean;
  mode?: 'sign-in' | 'sign-up';
  onSuccess: (user: AuthUser) => void | Promise<void>;
  onError: (message: string) => void;
}

const AppleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <G clipPath="url(#clip0_5703_69511)">
      <Path d="M9.11396 5.172C8.40296 5.172 7.30271 4.3635 6.14396 4.392C4.61396 4.41225 3.21146 5.27925 2.42321 6.6525C0.835461 9.40875 2.01371 13.4797 3.56246 15.72C4.32221 16.8105 5.21846 18.0375 6.40646 17.9992C7.54646 17.9505 7.97396 17.259 9.35771 17.259C10.731 17.259 11.1202 17.9992 12.3277 17.97C13.5555 17.9505 14.3347 16.86 15.0847 15.759C15.9517 14.493 16.3117 13.2652 16.3312 13.1977C16.302 13.188 13.9447 12.282 13.9162 9.555C13.8967 7.275 15.7762 6.1845 15.864 6.13575C14.7922 4.56825 13.1467 4.39275 12.5715 4.35375C11.0715 4.23675 9.81521 5.172 9.11396 5.172ZM11.6475 2.8725C12.2797 2.1135 12.6975 1.05225 12.5812 0C11.676 0.039 10.5847 0.60375 9.93221 1.3635C9.34721 2.0355 8.84171 3.117 8.97746 4.149C9.98096 4.227 11.0137 3.633 11.6467 2.87325" fill="white" />
    </G>
    <Defs>
      <ClipPath id="clip0_5703_69511">
        <Rect width={18} height={18} fill="white" />
      </ClipPath>
    </Defs>
  </Svg>
);

const AppleSignInButton = ({disabled, onSuccess, onError}: Props) => {
  const [loading, setLoading] = useState(false);

  if (Platform.OS !== 'ios' || !appleAuth.isSupported) return null;

  const handlePress = async () => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      const res = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });
      if (!res.identityToken) throw new Error('No identity token received from Apple');

      // Apple only supplies name/email on the very first authorisation.
      const given = res.fullName?.givenName ?? '';
      const family = res.fullName?.familyName ?? '';
      const fullName = `${given} ${family}`.trim();

      const user = await appleSocialLogin({
        identityToken: res.identityToken,
        authorizationCode: res.authorizationCode,
        email: res.email,
        fullName: fullName || null,
      });
      await onSuccess(user);
    } catch (err: any) {
      // 1001 = user cancelled the Apple sheet — not an error.
      if (err?.code === appleAuth.Error.CANCELED || err?.code === '1001') {
        return;
      }
      if (err?.isBackendError && err?.message) {
        // Real backend rejection (e.g. invalid token, audience mismatch).
        onError(`Apple sign-in failed: ${err.message}`);
      } else if (err instanceof TypeError) {
        // fetch() network failure.
        onError('Apple sign-in failed: could not reach the server. Check your connection and try again.');
      } else if (err?.message) {
        // Native Apple sheet / missing-token errors.
        onError(`Apple sign-in failed: ${err.message}`);
      } else {
        onError('Apple sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={handlePress}
      disabled={loading || disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Continue with Apple">
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <>
          <AppleIcon />
          <Text style={styles.label}>{'Continue with Apple'}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    alignSelf: 'stretch',
    height: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderRadius: 22,
    backgroundColor: '#000000',
  },
  // Inter isn't bundled; iOS falls back to the system font (SF).
  label: {color: '#FFFFFF', fontSize: 16, fontWeight: '500', lineHeight: 20},
});

export default AppleSignInButton;
