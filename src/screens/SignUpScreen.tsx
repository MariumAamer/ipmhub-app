/* eslint-disable prettier/prettier */
import React, {useState, useRef} from 'react';
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
  Image,
  Linking,
} from 'react-native';
import {openLinkedInAuth} from '../api/linkedinAuth';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {registerUser, socialLogin, getPostAuthRoute} from '../api/authApi';
import AppleSignInButton from '../components/AppleSignInButton';
import SocialButton, {GoogleIcon, LinkedInSquareIcon} from '../components/SocialButton';
import EyeClosedIcon from '../components/EyeClosedIcon';
import EyeOpenIcon from '../components/EyeOpenIcon';
import BackButton from '../components/BackButton';

// ─── Google OAuth ───────────────────────────────────────────────────────────
// This MUST be the Web-type OAuth Client ID (has a client secret attached in
// the Google Cloud console, unlike Android-type clients which are verified
// by SHA-1 fingerprint instead). The client SECRET never goes in the app —
// GoogleSignin only ever needs the Client ID below.
// iosClientId is REQUIRED on iOS even when not using Firebase — without it
// GoogleSignin has no way to determine the client ID and throws
// "failed to determine clientID" (the DEBUG banner seen on the iOS Sign Up
// screen). This is a SEPARATE OAuth client from webClientId above — Robby
// created this one 2026-08-13 (iOS-type client, Google Cloud Console).
const GOOGLE_IOS_CLIENT_ID =
  '497284409682-fvbkukc745v8nciu7dufrb9tg1rqlb67.apps.googleusercontent.com';

GoogleSignin.configure({
  webClientId:
    '497284409682-sn3tjrcn0ihusc7b38i4b474n08s3ave.apps.googleusercontent.com',
  iosClientId: GOOGLE_IOS_CLIENT_ID,
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
// LINKEDIN_APP_REDIRECT is a SEPARATE, second hop: Robby's /linkedin-callback
// page (after LinkedIn lands the user there with the code) forwards the
// browser to this custom scheme, which our own manifest intent-filter
// catches. Research into react-native-inappbrowser-reborn + Chrome Custom
// Tabs confirmed the previous approach (relying on the https redirect alone
// to hand back to the app) is fundamentally unreliable on Android: Chrome
// blocks *automatic* (non-tapped) redirects to app links as a security
// measure, which is exactly what happens for a LinkedIn user who's already
// logged in — no tap, no hand-off, tab just stays open. A custom scheme
// reached via an actual link/button tap on Robby's page doesn't have that
// problem, since there's no webpage Chrome could render instead.
const LINKEDIN_CLIENT_ID = '86aeqmka1c4bj1';
const LINKEDIN_REDIRECT =
  // Path changed 2026-08-08 (Robby): now /linkedin-callback-app, NOT the
  // original /linkedin-callback — his new bounce-page path with the
  // tappable "Continue to IPM Hub App" button. Must stay in sync with the
  // same redirect_uri sent in authApi.ts's linkedInSocialLogin.
  'https://hub.instituteprojectmanagement.com/linkedin-callback-app';
const LINKEDIN_APP_REDIRECT = 'ipmhub://linkedin-callback';
const LINKEDIN_AUTH_URL =
  `https://www.linkedin.com/oauth/v2/authorization?response_type=code` +
  `&client_id=${LINKEDIN_CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT)}` +
  `&scope=openid%20profile%20email`;

const SignUpScreen = ({navigation}: any) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Full name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'Min. 8 characters required';
    if (!confirmPassword) e.confirm = 'Please confirm your password';
    else if (password !== confirmPassword) e.confirm = 'Passwords do not match';
    if (!agreed) e.agreed = 'Please agree to the Privacy Policy';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const username =
        name
          .toLowerCase()
          .replace(/\s+/g, '')
          .replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 999);
      await registerUser(username, email.trim(), password, name.trim());
      navigation.navigate('VerifyEmail', {email: email.trim()});
    } catch (err: any) {
      const msg = err.message || 'Registration failed.';
      if (msg.toLowerCase().includes('email')) setErrors({email: msg});
      else if (msg.toLowerCase().includes('user'))
        setErrors({name: 'This name is already taken.'});
      else setErrors({general: msg});
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setErrors({});
    try {
      await GoogleSignin.hasPlayServices();
      const info = await GoogleSignin.signIn();
      const idToken = info.data?.idToken ?? (info as any).idToken;
      if (!idToken) throw new Error('No token received from Google');
      const user = await socialLogin('google', idToken);
      const route = await getPostAuthRoute(user);
      navigation.replace(route);
    } catch (err: any) {
      if (err.code !== statusCodes.SIGN_IN_CANCELLED)
        setErrors({general: 'Google sign-in failed. Please try again.'});
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
    setErrors({});

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
        setErrors({general: 'LinkedIn sign-in was not completed. Please try again.'});
        return;
      }
      const user = await socialLogin('linkedin', decodeURIComponent(match[1]));
      const route = await getPostAuthRoute(user);
      navigation.replace(route);
    } catch (err: any) {
      setErrors({general: 'LinkedIn sign-in failed. Please try again.'});
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
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Back */}
        <BackButton style={styles.backBtn} onPress={() => navigation.goBack()} />

        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={require('../assets/images/ipmlogosignup.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Title — Heading/H1: Runda Bold 24px #0C4D91 */}
        <Text style={styles.title}>{'Sign Up to IPM Hub'}</Text>

        {/* Subtitle — Body/Body S: Runda 12px #71727A */}
        <Text style={styles.subtitle}>
          {"Unlimited Access to IPM's Resources & Initiatives"}
        </Text>

        {errors.general ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errors.general}</Text>
          </View>
        ) : null}

        {/* ── Social sign-up — Apple first (iOS only, App Store 4.8) ── */}
        <View style={styles.socialStack}>
          <AppleSignInButton
            mode="sign-up"
            disabled={loading || googleLoading || linkedinLoading}
            onSuccess={async user => {
              const route = await getPostAuthRoute(user);
              navigation.replace(route);
            }}
            onError={msg => setErrors({general: msg})}
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

        {/* ── Divider ── */}
        <View style={styles.divider}>
          <View style={styles.divLine} />
          <Text style={styles.divText}>{'OR SIGN UP WITH EMAIL'}</Text>
          <View style={styles.divLine} />
        </View>

        {/* ── Full Name ── */}
        <Text style={styles.label}>{'Name'}</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputErr]}
          placeholder="Full Name"
          placeholderTextColor="#C0C0C0"
          value={name}
          onChangeText={v => {
            setName(v);
            setErrors(e => ({...e, name: ''}));
          }}
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          autoCapitalize="words"
        />
        {errors.name ? (
          <Text style={styles.fieldErr}>{errors.name}</Text>
        ) : null}

        {/* ── Email Address ── */}
        <Text style={styles.label}>{'Email Address'}</Text>
        <TextInput
          ref={emailRef}
          style={[styles.input, errors.email && styles.inputErr]}
          placeholder="name@email.com"
          placeholderTextColor="#C0C0C0"
          value={email}
          onChangeText={v => {
            setEmail(v);
            setErrors(e => ({...e, email: ''}));
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
          onSubmitEditing={() => passRef.current?.focus()}
        />
        {errors.email ? (
          <Text style={styles.fieldErr}>{errors.email}</Text>
        ) : null}

        {/* ── Password ── */}
        <Text style={styles.label}>{'Password'}</Text>
        <View style={[styles.passRow, errors.password && styles.inputErr]}>
          <TextInput
            ref={passRef}
            style={styles.passInput}
            placeholder="Create a password"
            placeholderTextColor="#C0C0C0"
            value={password}
            onChangeText={v => {
              setPassword(v);
              setErrors(e => ({...e, password: ''}));
            }}
            secureTextEntry={!showPassword}
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(p => !p)}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            {showPassword ? (
              <EyeOpenIcon />
            ) : (
              <EyeClosedIcon />
            )}
          </TouchableOpacity>
        </View>
        {errors.password ? (
          <Text style={styles.fieldErr}>{errors.password}</Text>
        ) : null}

        {/* ── Confirm Password ── */}
        <View
          style={[
            styles.passRow,
            {marginTop: 8},
            errors.confirm && styles.inputErr,
          ]}>
          <TextInput
            ref={confirmRef}
            style={styles.passInput}
            placeholder="Confirmation password"
            placeholderTextColor="#C0C0C0"
            value={confirmPassword}
            onChangeText={v => {
              setConfirmPassword(v);
              setErrors(e => ({...e, confirm: ''}));
            }}
            secureTextEntry={!showConfirm}
            returnKeyType="done"
            onSubmitEditing={handleSignUp}
          />
          <TouchableOpacity
            onPress={() => setShowConfirm(p => !p)}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            {showConfirm ? (
              <EyeOpenIcon />
            ) : (
              <EyeClosedIcon />
            )}
          </TouchableOpacity>
        </View>
        {errors.confirm ? (
          <Text style={styles.fieldErr}>{errors.confirm}</Text>
        ) : null}

        {/* ── Privacy Policy checkbox ── */}
        <View style={styles.checkRow}>
          <TouchableOpacity
            style={[styles.checkbox, agreed && styles.checkboxOn]}
            onPress={() => {
              setAgreed(a => !a);
              setErrors(e => ({...e, agreed: ''}));
            }}>
            {agreed ? <Text style={styles.checkmark}>{'✓'}</Text> : null}
          </TouchableOpacity>
          {/* Body/Body S: #71727A 12px 400 lh 16px */}
          <Text style={styles.checkLabel}>
            {'I agree to the '}
            {/* Action/Action M: #46B0E3 12px 500 */}
            <Text
              style={styles.privacyLink}
              onPress={() =>
                Linking.openURL(
                  'https://hub.instituteprojectmanagement.com/privacy-policy/',
                )
              }>
              {'Privacy Policy'}
            </Text>
          </Text>
        </View>
        {errors.agreed ? (
          <Text style={[styles.fieldErr, {marginTop: -8}]}>
            {errors.agreed}
          </Text>
        ) : null}

        {/* ── Sign Up button ── */}
        <TouchableOpacity
          style={[styles.signUpBtn, loading && styles.signUpBtnDisabled]}
          onPress={handleSignUp}
          disabled={loading}
          activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.signUpBtnText}>{'Sign Up For Free'}</Text>
          )}
        </TouchableOpacity>

        {/* ── Sign In link ── */}
        <TouchableOpacity
          style={styles.signInRow}
          onPress={() => navigation.navigate('SignIn')}>
          {/* Body/Body S: #71727A 12px 400 */}
          <Text style={styles.signInText}>
            {'Already a member? '}
            {/* Action/Action M: #46B0E3 12px 500 */}
            <Text style={styles.signInLink}>{'Sign In'}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: '#FFFFFF'},
  scroll: {flex: 1},
  content: {paddingHorizontal: 24, paddingBottom: 24},

  // Back button
  backBtn: {
    marginTop: 46,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },

  // Logo
  logoWrap: {alignItems: 'center', marginTop: 6, marginBottom: 8},
  logo: {width: 140, height: 40},

  // ── Heading/H1 — Runda Bold 24px #0C4D91 center, letterSpacing 0.24 ──
  title: {
    fontFamily: 'Runda-Bold',
    fontSize: 24,
    fontWeight: '700',
    color: '#0C4D91',
    textAlign: 'center',
    letterSpacing: 0.24,
    marginBottom: 4,
  },

  // ── Body/Body S — Runda 12px #71727A center lh 16px ──
  subtitle: {
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '400',
    color: '#71727A',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },

  // Error banner
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerText: {color: '#DC2626', fontSize: 12, textAlign: 'center'},

  // Fields
  label: {
    fontFamily: 'Runda',
    fontSize: 13,
    fontWeight: '500',
    color: '#222',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#222',
    marginBottom: 4,
    fontFamily: 'Runda',
  },
  inputErr: {borderColor: '#EF4444'},
  fieldErr: {fontSize: 11, color: '#EF4444', marginBottom: 8},

  // Password row (with eye icon)
  passRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  passInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: '#222',
    fontFamily: 'Runda',
  },

  // ── Privacy Policy checkbox ──
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  checkbox: {
    width: 17,
    height: 17,
    borderWidth: 1.5,
    borderColor: '#CCCCCC',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  checkboxOn: {backgroundColor: '#1A3A6B', borderColor: '#1A3A6B'},
  checkmark: {color: '#FFF', fontSize: 10, fontWeight: '700'},

  // Body/Body S: #71727A 12px 400 lh 16px
  checkLabel: {
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '400',
    color: '#71727A',
    lineHeight: 16,
  },
  // Action/Action M: #46B0E3 12px 500
  privacyLink: {
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '500',
    color: '#46B0E3',
  },

  // Divider
  divider: {flexDirection: 'row', alignItems: 'center', marginBottom: 16},
  divLine: {flex: 1, height: 1, backgroundColor: '#E5E7EB'},
  divText: {
    fontFamily: 'Runda',
    fontSize: 10,
    color: '#BBBBBB',
    marginHorizontal: 10,
    letterSpacing: 0.4,
  },

  // Social buttons
  socialStack: {alignSelf: 'stretch', gap: 12, marginBottom: 16},

  // Sign Up button
  signUpBtn: {
    backgroundColor: '#1A3A6B',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
  },
  signUpBtnDisabled: {opacity: 0.6},
  signUpBtnText: {
    fontFamily: 'Runda-Bold',
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Sign In link row
  signInRow: {alignItems: 'center', paddingVertical: 4},

  // Body/Body S: #71727A 12px 400
  signInText: {
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '400',
    color: '#71727A',
  },
  // Action/Action M: #46B0E3 12px 500
  signInLink: {
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '500',
    color: '#46B0E3',
  },
});

export default SignUpScreen;
