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
import {InAppBrowser} from 'react-native-inappbrowser-reborn';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {registerUser, socialLogin, getPostAuthRoute} from '../api/authApi';
import Svg, {Path, G} from 'react-native-svg';

// ─── Google OAuth ───────────────────────────────────────────────────────────
// This MUST be the Web-type OAuth Client ID (has a client secret attached in
// the Google Cloud console, unlike Android-type clients which are verified
// by SHA-1 fingerprint instead). The client SECRET never goes in the app —
// GoogleSignin only ever needs the Client ID below.
// iosClientId is REQUIRED on iOS even when not using Firebase — without it
// GoogleSignin has no way to determine the client ID and throws
// "failed to determine clientID" (the DEBUG banner seen on the iOS Sign Up
// screen). This is a SEPARATE OAuth client from webClientId above — it must
// be the iOS-type client ID from Google Cloud Console > Credentials, not the
// Web-type one. TODO(Marium/Robby): swap in the real iOS client ID here —
// currently a placeholder so this doesn't silently ship broken.
const GOOGLE_IOS_CLIENT_ID =
  'REPLACE_WITH_IOS_OAUTH_CLIENT_ID.apps.googleusercontent.com';

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

// ─── Eye Open SVG Icon ────────────────────────────────────────────────────────
const EyeOpenIcon = ({color = '#AAAAAA'}: {color?: string}) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 5C7.5 5 3.73 7.61 2 12c1.73 4.39 5.5 7 10 7s8.27-2.61 10-7c-1.73-4.39-5.5-7-10-7z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── Eye Closed SVG Icon ──────────────────────────────────────────────────────
const EyeClosedIcon = ({color = '#AAAAAA'}: {color?: string}) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── Google "G" SVG Icon ──────────────────────────────────────────────────────
const GoogleIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 48 48">
    <G>
      <Path
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.3 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.1 29 5 24 5 12.95 5 4 13.95 4 25s8.95 20 20 20 20-8.95 20-20c0-1.5-.2-2.9-.4-4.5z"
        fill="#FFC107"
      />
      <Path
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.1 29 5 24 5c-7.7 0-14.3 4.4-17.7 9.7z"
        fill="#FF3D00"
      />
      <Path
        d="M24 45c4.9 0 9.3-1.9 12.7-4.9l-6.2-5.2C28.6 36.6 26.4 37.5 24 37.5c-5.2 0-9.6-3.5-11.2-8.3l-6.6 5.1C9.5 40.5 16.3 45 24 45z"
        fill="#4CAF50"
      />
      <Path
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.2 5.2C37.5 38.8 44 34 44 25c0-1.5-.2-2.9-.4-4.5z"
        fill="#1976D2"
      />
    </G>
  </Svg>
);

// ─── LinkedIn "in" SVG Icon ───────────────────────────────────────────────────
const LinkedInIcon = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF">
    <Path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </Svg>
);

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
      // TEMP DEBUG: show the real error/code instead of a generic message
      // so this can be diagnosed from a screenshot alone, no Logcat needed.
      if (err.code !== statusCodes.SIGN_IN_CANCELLED)
        setErrors({general: `DEBUG Google: code=${err?.code} msg=${err?.message}`});
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

    let subscription: {remove: () => void} | null = null;
    let settled = false;

    try {
      const available = await InAppBrowser.isAvailable();
      if (!available) {
        setErrors({general: 'LinkedIn sign-in is unavailable on this device.'});
        return;
      }

      // Primary path: resolves as soon as our ipmhub:// deep link arrives.
      const deepLinkPromise = new Promise<string | null>(resolve => {
        subscription = Linking.addEventListener('url', ({url}) => {
          if (!settled && url.startsWith(LINKEDIN_APP_REDIRECT)) {
            settled = true;
            resolve(url);
          }
        });
      });

      // Also check getInitialURL in case the deep link arrives so fast the
      // listener above hasn't attached yet (edge case, cheap to guard).
      Linking.getInitialURL().then(url => {
        if (url && !settled && url.startsWith(LINKEDIN_APP_REDIRECT)) {
          settled = true;
        }
      });

      // Fallback path: resolves when the user closes the tab themselves
      // without completing sign-in. Given a short grace window afterward,
      // since on some devices the tab's "dismissed" event can fire slightly
      // before or after the deep link's 'url' event lands — order isn't
      // guaranteed, so we don't want a fast dismiss event to short-circuit
      // a redirect that's still on its way in.
      const dismissedPromise = InAppBrowser.open(LINKEDIN_AUTH_URL, {
        ephemeralWebSession: false,
        showTitle: false,
        enableUrlBarHiding: true,
        enableDefaultShare: false,
      }).then(async () => {
        if (settled) return undefined; // already resolved via deep link
        const late = await Promise.race([
          deepLinkPromise,
          new Promise<null>(resolve => setTimeout(() => resolve(null), 500)),
        ]);
        return late;
      });

      const redirectUrl = await Promise.race([
        deepLinkPromise,
        dismissedPromise,
      ]);

      try {
        await InAppBrowser.close();
      } catch {}

      if (!redirectUrl) {
        // User cancelled/backed out — not an error, just stop quietly.
        return;
      }

      const match = redirectUrl.match(/[?&]code=([^&]+)/);
      if (!match) {
        // TEMP DEBUG: show the actual returned URL so we can see what came
        // back instead of a code (e.g. an error= param from LinkedIn).
        setErrors({general: `DEBUG: no code in redirect URL: ${redirectUrl}`});
        return;
      }
      const user = await socialLogin('linkedin', decodeURIComponent(match[1]));
      const route = await getPostAuthRoute(user);
      navigation.replace(route);
    } catch (err: any) {
      // TEMP DEBUG: show the real error instead of a generic message so
      // this can be diagnosed from a screenshot alone, no Logcat needed.
      setErrors({general: `DEBUG LinkedIn: ${err?.message || JSON.stringify(err)}`});
    } finally {
      subscription?.remove();
      setLinkedinLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Back */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>{'‹'}</Text>
        </TouchableOpacity>

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
              <EyeOpenIcon color="#AAAAAA" />
            ) : (
              <EyeClosedIcon color="#AAAAAA" />
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
              <EyeOpenIcon color="#AAAAAA" />
            ) : (
              <EyeClosedIcon color="#AAAAAA" />
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

        {/* ── Divider ── */}
        <View style={styles.divider}>
          <View style={styles.divLine} />
          <Text style={styles.divText}>{'OR CONTINUE WITH'}</Text>
          <View style={styles.divLine} />
        </View>

        {/* ── Social buttons ── */}
        <View style={styles.socialRow}>
          {/* Google */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogle}
            disabled={googleLoading || loading}
            activeOpacity={0.85}>
            {googleLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.socialBtnText}>{'G'}</Text>
            )}
          </TouchableOpacity>

          {/* LinkedIn */}
          <TouchableOpacity
            style={styles.linkedinBtn}
            onPress={handleLinkedIn}
            disabled={linkedinLoading || loading}
            activeOpacity={0.85}>
            {linkedinLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.socialBtnText}>{'in'}</Text>
            )}
          </TouchableOpacity>
        </View>

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
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  backIcon: {fontSize: 20, color: '#444', lineHeight: 24, fontWeight: '300'},

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
  divider: {flexDirection: 'row', alignItems: 'center', marginBottom: 12},
  divLine: {flex: 1, height: 1, backgroundColor: '#E5E7EB'},
  divText: {
    fontFamily: 'Runda',
    fontSize: 10,
    color: '#BBBBBB',
    marginHorizontal: 10,
    letterSpacing: 0.4,
  },

  // Social buttons
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 14,
  },
  googleBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#4A90D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    elevation: 2,
  },
  linkedinBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0A66C2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  socialBtnText: {color: '#FFF', fontWeight: '700', fontSize: 17},

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
