/* eslint-disable prettier/prettier */
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {openLinkedInAuth} from '../api/linkedinAuth';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {loginUser, socialLogin, getPostAuthRoute} from '../api/authApi';
import {resolveScheduledDeletion} from '../utils/deletionPrompt';
import AppleSignInButton from '../components/AppleSignInButton';
import SocialButton, {GoogleIcon, LinkedInSquareIcon} from '../components/SocialButton';
import SocialTermsNotice from '../components/SocialTermsNotice';
import EyeClosedIcon from '../components/EyeClosedIcon';
import EyeOpenIcon from '../components/EyeOpenIcon';
import SuccessToast from '../components/SuccessToast';
import AccountVerifiedSheet from '../components/AccountVerifiedSheet';
import StatusSheet from '../components/StatusSheet';
import InlineErrorBanner from '../components/InlineErrorBanner';

// ─── Google OAuth ───────────────────────────────────────────────────────────
// This MUST be the Web-type OAuth Client ID (has a client secret attached in
// the Google Cloud console, unlike Android-type clients which are verified
// by SHA-1 fingerprint instead). The client SECRET never goes in the app —
// GoogleSignin only ever needs the Client ID below.
// iosClientId is REQUIRED on iOS even when not using Firebase — without it
// GoogleSignin throws "failed to determine clientID". Separate OAuth client
// from webClientId above — Robby created this one 2026-08-13 (iOS-type
// client, Google Cloud Console). Kept in sync with SignUpScreen.tsx.
GoogleSignin.configure({
  webClientId:
    '497284409682-sn3tjrcn0ihusc7b38i4b474n08s3ave.apps.googleusercontent.com',
  iosClientId:
    '497284409682-fvbkukc745v8nciu7dufrb9tg1rqlb67.apps.googleusercontent.com',
});

// ─── LinkedIn OAuth ─────────────────────────────────────────────────────────
// Confirmed live Client ID from the IPM Hub website's LinkedIn Auth Platform.
//
// LINKEDIN_REDIRECT is what's registered with LinkedIn itself AND what the
// backend uses during the code→token exchange — it must stay this exact
// https URL, unchanged, on both ends. LinkedIn only accepts https redirect
// URIs, never a custom scheme, so this can't be swapped for the app scheme
// below.
//
// Path changed 2026-08-08 (Robby): now /linkedin-callback-app, NOT the
// original /linkedin-callback — this is the new bounce-page path he built
// that shows a tappable "Continue to IPM Hub App" button. Must stay in sync
// with the same redirect_uri sent in authApi.ts's linkedInSocialLogin.
//
// LINKEDIN_APP_REDIRECT is a SEPARATE, second hop: Robby's bounce page
// (after LinkedIn lands the user there with the code) forwards the browser
// to this custom scheme, which our own manifest intent-filter catches.
// Research into react-native-inappbrowser-reborn + Chrome Custom Tabs
// confirmed relying on the https redirect alone to hand back to the app is
// fundamentally unreliable on Android: Chrome blocks *automatic*
// (non-tapped) redirects to app links as a security measure, which is
// exactly what happens for a LinkedIn user who's already logged in — no
// tap, no hand-off, tab just stays open. A custom scheme reached via an
// actual link/button tap on Robby's page doesn't have that problem, since
// there's no webpage Chrome could render instead.
const LINKEDIN_CLIENT_ID = '86aeqmka1c4bj1';
const LINKEDIN_REDIRECT =
  'https://hub.instituteprojectmanagement.com/linkedin-callback-app';
const LINKEDIN_APP_REDIRECT = 'ipmhub://linkedin-callback';
const LINKEDIN_AUTH_URL =
  `https://www.linkedin.com/oauth/v2/authorization?response_type=code` +
  `&client_id=${LINKEDIN_CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT)}` +
  `&scope=openid%20profile%20email`;

// ─── Post-login routing ───────────────────────────────────────────────────────
// Routes via server-side BuddyBoss data (see authApi.getPostAuthRoute), so the
// same logic applies no matter which device the person signs in on, and no
// matter whether they used email/password, Google, or LinkedIn.
const handlePostLogin = async (user: any, navigation: any) => {
  // Account scheduled for deletion → Restore / Keep prompt first. Keep ends
  // the session, so stay on Sign In instead of routing into the app.
  if ((await resolveScheduledDeletion()) === 'signed_out') return;
  const route = await getPostAuthRoute(user);
  navigation.replace(route);
};

const SignInScreen = ({navigation, route}: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  // Show success message if coming from email verification. Kept as state
  // (not a fixed const from route params) so it can be turned off below if
  // a real sign-in attempt shows the account genuinely isn't active —
  // otherwise the stale "verified" banner stays on screen right next to a
  // contradicting "not activated" error, which is the exact bug reported.
  const [verified, setVerified] = useState<boolean>(!!route?.params?.verified);
  // Activation link was bad / expired / already used → "Link expired" sheet
  // (replaces the old red error banner for this case).
  const [linkExpired, setLinkExpired] = useState<boolean>(
    !!route?.params?.activationFailed,
  );
  const [error, setError] = useState('');
  // Wrong email/password → pink "Incorrect email or password" card + red
  // border on the password field (separate from the generic error banner).
  const [credError, setCredError] = useState(false);
  // A real, working "resend activation email" URL parsed out of the
  // server's error message (see authApi.ts's extractLink) — previously
  // that link was silently discarded by clean(), leaving the "click here
  // to resend it" text in the error banner dead and unclickable.
  const [resendUrl, setResendUrl] = useState<string | null>(null);
  const [resendToast, setResendToast] = useState(false);
  const passRef = useRef<TextInput>(null);

  // The activation deep link does navigate('SignIn', {verified: true}). If
  // SignIn is already in the stack (user tried to sign in before activating),
  // React Navigation reuses that instance and only updates route.params —
  // useState initializers above never re-run, so the old "account has not
  // been activated" error stayed on screen and the verified banner never
  // appeared. Re-sync state whenever the params change.
  useEffect(() => {
    if (route?.params?.verified) {
      setVerified(true);
      setLinkExpired(false);
      setError('');
      setResendUrl(null);
    } else if (route?.params?.activationFailed) {
      setVerified(false);
      setLinkExpired(true);
      setResendUrl(null);
      setError('');
    }
  }, [route?.params?.verified, route?.params?.activationFailed]);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    setCredError(false);
    setResendUrl(null);
    try {
      const user = await loginUser(email.trim(), password);
      await handlePostLogin(user, navigation);
    } catch (err: any) {
      const message = err.message || 'Login failed. Please try again.';
      // Wrong email or password (WP jwt-auth codes: incorrect_password,
      // invalid_username, invalid_email) → dedicated card, no resend link.
      if (
        /incorrect_password|invalid_username|invalid_email/i.test(err.code || '') ||
        /password you entered|incorrect|invalid (username|email)/i.test(message)
      ) {
        setCredError(true);
        return;
      }
      // The deep link only ever guessed at "verified" from the URL's shape
      // (see AppNavigator.tsx) — if the server now says the account isn't
      // actually active, that guess was wrong, so drop the stale success
      // banner instead of showing both at once.
      if (verified && /activat/i.test(message)) {
        setVerified(false);
      }
      setError(message);
      if (err.resendUrl) setResendUrl(err.resendUrl);
    } finally {
      setLoading(false);
    }
  };

  // Triggers the real resend-activation link the server sent. It's requested
  // in the background so we can stay on this screen and show the
  // "New verification link sent" toast; if that request fails for any reason
  // we fall back to the old behaviour of opening the link in the browser.
  const handleResendActivation = async () => {
    if (!resendUrl) return;
    try {
      const res = await fetch(resendUrl);
      if (!res.ok) throw new Error('resend failed');
      setResendToast(false);
      setTimeout(() => setResendToast(true), 0);
    } catch {
      Linking.openURL(resendUrl).catch(() => {});
    }
  };

  // "Resend link" on the Link expired sheet. There's no dedicated
  // resend-activation endpoint in the app, and an expired deep link doesn't
  // tell us who the user is — the only real resend link we ever get is the
  // one the server returns when an inactive account tries to sign in (see
  // resendUrl above). So: use it if we already have it, otherwise close the
  // sheet and prompt the user to sign in, which surfaces that link.
  const handleExpiredResend = async () => {
    if (resendUrl) {
      setLinkExpired(false);
      await handleResendActivation();
      return;
    }
    setLinkExpired(false);
    setError(
      'Enter your email and password, then tap Sign In to get a new verification link.',
    );
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await GoogleSignin.hasPlayServices();
      const info = await GoogleSignin.signIn();
      const idToken = info.data?.idToken ?? (info as any).idToken;
      if (!idToken) throw new Error('No token received from Google');
      const user = await socialLogin('google', idToken);
      await handlePostLogin(user, navigation);
    } catch (err: any) {
      if (err.code !== statusCodes.SIGN_IN_CANCELLED)
        setError('Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ─── LinkedIn Sign-In (Chrome Custom Tabs + explicit deep-link listener) ─────
  // Does NOT rely on InAppBrowser.openAuth()'s built-in redirect matching —
  // confirmed unreliable on Android (the native module has no real handling
  // for it; resolution depends entirely on the OS delivering the redirect to
  // our manifest intent-filter). Instead we open a plain Custom Tab and
  // listen for the ipmhub:// deep link ourselves via Linking, which is the
  // same mechanism email verification already depends on.
  //
  // Requires Robby's /linkedin-callback page to forward the code to
  // LINKEDIN_APP_REDIRECT via a real, tappable link/button (see message
  // drafted for Robby) — a silent auto-redirect gets blocked by Chrome for
  // users who are already logged into LinkedIn.
  const handleLinkedIn = async () => {
    setLinkedinLoading(true);
    setError('');

    try {
      // Opens the system browser via Linking and waits for the
      // ipmhub://linkedin-callback deep link (no InAppBrowser native module).
      const redirectUrl = await openLinkedInAuth(
        LINKEDIN_AUTH_URL,
        LINKEDIN_APP_REDIRECT,
      );

      if (!redirectUrl) {
        // User came back without finishing — not an error, stop quietly.
        return;
      }

      const match = redirectUrl.match(/[?&]code=([^&]+)/);
      if (!match) {
        setError('LinkedIn sign-in was not completed. Please try again.');
        return;
      }
      const user = await socialLogin('linkedin', decodeURIComponent(match[1]));
      await handlePostLogin(user, navigation);
    } catch (err: any) {
      setError('LinkedIn sign-in failed. Please try again.');
    } finally {
      setLinkedinLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Welcome heading */}
        <Text style={styles.welcome}>{'Welcome'}</Text>

        {/* Wrong email / password */}
        {credError ? (
          <View style={styles.credErrorWrap}>
            <InlineErrorBanner
              title="Incorrect email or password"
              message="Check your details and try again."
              actionLabel="Reset password"
              onAction={() => navigation.navigate('ForgotPassword')}
              onDismiss={() => setCredError(false)}
            />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            {resendUrl ? (
              <TouchableOpacity
                onPress={handleResendActivation}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                style={styles.resendLinkBtn}>
                <Text style={styles.resendLinkText}>
                  {'Resend verification email'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Email field */}
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor="#AAAAAA"
            value={email}
            onChangeText={v => {
              setEmail(v);
              setError('');
              setCredError(false);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => passRef.current?.focus()}
          />
        </View>

        {/* Password field */}
        <View style={[styles.inputWrap, credError && styles.inputWrapError]}>
          <TextInput
            ref={passRef}
            style={styles.passInput}
            placeholder="Password"
            placeholderTextColor="#AAAAAA"
            value={password}
            onChangeText={v => {
              setPassword(v);
              setError('');
              setCredError(false);
            }}
            secureTextEntry={!showPassword}
            returnKeyType="done"
            onSubmitEditing={handleSignIn}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(p => !p)}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
            style={styles.eyeBtn}>
            {showPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
          </TouchableOpacity>
        </View>

        {/* Forgot password */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgotBtn}>
          <Text style={styles.forgotText}>{'Forgot password?'}</Text>
        </TouchableOpacity>

        {/* Sign In button */}
        <TouchableOpacity
          style={[styles.signInBtn, loading && styles.btnDisabled]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.signInBtnText}>{'Sign In'}</Text>
          )}
        </TouchableOpacity>

        {/* OR CONTINUE WITH */}
        <View style={styles.divider}>
          <View style={styles.divLine} />
          <Text style={styles.divText}>{'OR CONTINUE WITH'}</Text>
          <View style={styles.divLine} />
        </View>

        {/* Social buttons — Apple first (iOS only, App Store 4.8) */}
        <View style={styles.socialStack}>
          <AppleSignInButton
            mode="sign-in"
            disabled={loading || googleLoading || linkedinLoading}
            onSuccess={user => handlePostLogin(user, navigation)}
            onError={setError}
          />
          <SocialButton
            label="Continue with Google"
            icon={<GoogleIcon />}
            onPress={handleGoogle}
            loading={googleLoading}
            disabled={loading || linkedinLoading}
          />
          <SocialButton
            label="Continue with LinkedIn"
            icon={<LinkedInSquareIcon />}
            onPress={handleLinkedIn}
            loading={linkedinLoading}
            disabled={loading || googleLoading}
          />
        </View>

        {/* Agreement for social sign-in / sign-up (App Store 1.2) */}
        <SocialTermsNotice navigation={navigation} />

        {/* Not a member */}
        <TouchableOpacity
          onPress={() => navigation.navigate('SignUp')}
          style={styles.signUpRow}>
          <Text style={styles.signUpText}>
            {'Not a member? '}
            <Text style={styles.signUpLink}>{'Sign Up for Free'}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Email verified — "Account verified" bottom sheet */}
      <AccountVerifiedSheet
        visible={verified}
        onClose={() => setVerified(false)}
      />

      {/* Activation link expired / invalid — "Link expired" bottom sheet */}
      <StatusSheet
        visible={linkExpired}
        variant="error"
        headerTitle="Link expired"
        title="This link is no longer valid"
        message="This verification link has expired or has already been used. Request a new one and we will email it to you."
        primaryLabel="Resend link"
        onPrimary={handleExpiredResend}
        secondaryLabel="Back to Sign In"
        onSecondary={() => setLinkExpired(false)}
        onClose={() => setLinkExpired(false)}
      />

      <SuccessToast
        visible={resendToast}
        message="New verification link sent. Check your inbox."
        onHide={() => setResendToast(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: '#F2F2F2'},
  scroll: {flex: 1},
  content: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 48,
  },

  welcome: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A3A6B',
    marginBottom: 28,
  },

  successBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successText: {color: '#065F46', fontSize: 13, textAlign: 'center', fontWeight: '600'},

  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {color: '#DC2626', fontSize: 13, textAlign: 'center'},
  resendLinkBtn: {marginTop: 6, alignItems: 'center'},
  resendLinkText: {
    color: '#1A7FD4',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  inputWrap: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  // Incorrect password: 1.5px #FF616D border (Support-Error-Medium)
  inputWrapError: {borderWidth: 1.5, borderColor: '#FF616D', borderRadius: 5},
  credErrorWrap: {marginBottom: 14},
  input: {flex: 1, paddingVertical: 15, fontSize: 15, color: '#222222'},
  passInput: {flex: 1, paddingVertical: 15, fontSize: 15, color: '#222222'},
  eyeBtn: {paddingLeft: 8},

  forgotBtn: {alignSelf: 'flex-start', marginBottom: 20, marginTop: 2},
  forgotText: {fontSize: 13, color: '#1A7FD4', fontWeight: '500'},

  signInBtn: {
    backgroundColor: '#1A3A6B',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  btnDisabled: {opacity: 0.6},
  signInBtnText:  {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},

  signUpRow: {alignItems: 'center', marginBottom: 20},
  signUpText: {fontSize: 13, color: '#555555'},
  signUpLink: {color: '#1A7FD4', fontWeight: '600'},

  divider: {flexDirection: 'row', alignItems: 'center', marginBottom: 20},
  divLine: {flex: 1, height: 1, backgroundColor: '#CCCCCC'},
  divText: {fontSize: 11, color: '#999999', marginHorizontal: 10, letterSpacing: 0.5},

  socialStack: {alignSelf: 'stretch', gap: 12, marginBottom: 16},
});

export default SignInScreen;
