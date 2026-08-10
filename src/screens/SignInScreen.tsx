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
import {loginUser, socialLogin, getPostAuthRoute} from '../api/authApi';

// ─── Google OAuth ───────────────────────────────────────────────────────────
// This MUST be the Web-type OAuth Client ID (has a client secret attached in
// the Google Cloud console, unlike Android-type clients which are verified
// by SHA-1 fingerprint instead). The client SECRET never goes in the app —
// GoogleSignin only ever needs the Client ID below.
GoogleSignin.configure({
  webClientId:
    '497284409682-sn3tjrcn0ihusc7b38i4b474n08s3ave.apps.googleusercontent.com',
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
  'https://hub.instituteprojectmanagement.com/linkedin-callback';
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
  const [error, setError] = useState('');
  const passRef = useRef<TextInput>(null);

  // Show success message if coming from email verification
  const verified = route?.params?.verified;

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await loginUser(email.trim(), password);
      await handlePostLogin(user, navigation);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
      // TEMP DEBUG: show the real error/code instead of a generic message
      // so this can be diagnosed from a screenshot alone, no Logcat needed.
      if (err.code !== statusCodes.SIGN_IN_CANCELLED)
        setError(`DEBUG Google: code=${err?.code} msg=${err?.message}`);
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

    let subscription: {remove: () => void} | null = null;
    let settled = false;

    try {
      const available = await InAppBrowser.isAvailable();
      if (!available) {
        setError('LinkedIn sign-in is unavailable on this device.');
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
        setError(`DEBUG: no code in redirect URL: ${redirectUrl}`);
        return;
      }
      const user = await socialLogin('linkedin', decodeURIComponent(match[1]));
      await handlePostLogin(user, navigation);
    } catch (err: any) {
      // TEMP DEBUG: show the real error instead of a generic message so
      // this can be diagnosed from a screenshot alone, no Logcat needed.
      setError(`DEBUG LinkedIn: ${err?.message || JSON.stringify(err)}`);
    } finally {
      subscription?.remove();
      setLinkedinLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F2" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Welcome heading */}
        <Text style={styles.welcome}>{'Welcome'}</Text>

        {/* Email verified success banner */}
        {verified ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>
              {'✓ Account verified! Please sign in.'}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
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
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => passRef.current?.focus()}
          />
        </View>

        {/* Password field */}
        <View style={styles.inputWrap}>
          <TextInput
            ref={passRef}
            style={styles.passInput}
            placeholder="Password"
            placeholderTextColor="#AAAAAA"
            value={password}
            onChangeText={v => {
              setPassword(v);
              setError('');
            }}
            secureTextEntry={!showPassword}
            returnKeyType="done"
            onSubmitEditing={handleSignIn}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(p => !p)}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
            style={styles.eyeBtn}>
            <Image
              source={require('../assets/images/eyeinvisible.png')}
              style={[styles.eyeIcon, showPassword && styles.eyeVisible]}
              resizeMode="contain"
            />
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

        {/* Not a member */}
        <TouchableOpacity
          onPress={() => navigation.navigate('SignUp')}
          style={styles.signUpRow}>
          <Text style={styles.signUpText}>
            {'Not a member? '}
            <Text style={styles.signUpLink}>{'Sign Up for Free'}</Text>
          </Text>
        </TouchableOpacity>

        {/* OR CONTINUE WITH */}
        <View style={styles.divider}>
          <View style={styles.divLine} />
          <Text style={styles.divText}>{'OR CONTINUE WITH'}</Text>
          <View style={styles.divLine} />
        </View>

        {/* Social buttons */}
        <View style={styles.socialRow}>
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
      </ScrollView>
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
  input: {flex: 1, paddingVertical: 15, fontSize: 15, color: '#222222'},
  passInput: {flex: 1, paddingVertical: 15, fontSize: 15, color: '#222222'},
  eyeBtn: {paddingLeft: 8},
  eyeIcon: {width: 20, height: 20, opacity: 0.45},
  eyeVisible: {opacity: 0.8},

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

  socialRow: {flexDirection: 'row', justifyContent: 'center', gap: 16},
  googleBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#5BA4E6',
    alignItems: 'center', justifyContent: 'center', elevation: 2,
  },
  linkedinBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#1A3A6B',
    alignItems: 'center', justifyContent: 'center', elevation: 2,
  },
  socialBtnText: {color: '#FFF', fontWeight: '700', fontSize: 17},
});

export default SignInScreen;
