/* eslint-disable prettier/prettier */
import React, {useState, useEffect, useRef} from 'react';
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
import Svg, {Path} from 'react-native-svg';
import {forgotPassword, resetPassword} from '../api/authApi';

// ─── Success tick icon — exact Figma SVG ──────────────────────────────────
const SuccessTick = () => (
  <Svg width={45} height={45} viewBox="0 0 45 45" fill="none">
    <Path
      d="M22.5 0C10.0737 0 0 10.0737 0 22.5C0 34.927 10.0737 45 22.5 45C34.927 45 45 34.927 45 22.5C45 10.0737 34.927 0 22.5 0ZM22.5 42.2318C11.6445 42.2318 2.8125 33.3555 2.8125 22.4999C2.8125 11.6444 11.6445 2.81241 22.5 2.81241C33.3555 2.81241 42.1875 11.6444 42.1875 22.4999C42.1875 33.3554 33.3555 42.2318 22.5 42.2318ZM31.4796 14.2671L18.2784 27.5512L12.3335 21.6063C11.7843 21.0572 10.8942 21.0572 10.3443 21.6063C9.79519 22.1555 9.79519 23.0456 10.3443 23.5948L17.3046 30.5557C17.8537 31.1041 18.7439 31.1041 19.2937 30.5557C19.357 30.4924 19.4112 30.4235 19.4604 30.3518L33.4695 16.2562C34.0179 15.7071 34.0179 14.8169 33.4695 14.2671C32.9196 13.718 32.0295 13.718 31.4796 14.2671Z"
      fill="#3BBB06"
    />
  </Svg>
);

// ─── Eye icons (matches SignInScreen's local-asset pattern) ──────────────
const EyeToggle = ({visible, onPress}: {visible: boolean; onPress: () => void}) => (
  <TouchableOpacity
    onPress={onPress}
    hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
    style={styles.eyeBtn}>
    <Image
      source={require('../assets/images/eyeinvisible.png')}
      style={[styles.eyeIcon, visible && styles.eyeVisible]}
      resizeMode="contain"
    />
  </TouchableOpacity>
);

// ─── Screen states ─────────────────────────────────────────────────────────
type Stage = 'request' | 'checkEmail' | 'changePassword' | 'finished';

const ForgotPasswordScreen = ({navigation, route}: any) => {
  const [stage, setStage] = useState<Stage>('request');

  // Request stage
  const [email, setEmail] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState('');

  // Change-password stage (arrives via deep link: ipmhub://reset-password?key=&login=)
  const [resetKey, setResetKey] = useState('');
  const [resetLogin, setResetLogin] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const repeatRef = useRef<TextInput>(null);

  // ── Parse deep link params, whether app was cold-started or already open ──
  const applyDeepLink = (url: string) => {
    if (!url.includes('reset-password')) return;
    try {
      const query = url.split('?')[1] || '';
      const params = new URLSearchParams(query);
      const key = params.get('key');
      const login = params.get('login');
      if (key && login) {
        setResetKey(key);
        setResetLogin(login);
        setResetError('');
        setStage('changePassword');
      }
    } catch {
      // malformed link — ignore, user stays on whatever stage they're on
    }
  };

  useEffect(() => {
    // App already open in background, link tapped → onURL event
    const sub = Linking.addEventListener('url', ({url}) => applyDeepLink(url));

    // App cold-started from the link → check initial URL once
    Linking.getInitialURL().then(url => {
      if (url) applyDeepLink(url);
    });

    // Also support arriving via React Navigation linking config params,
    // in case AppNavigator's `linking` prop parses the URL upstream.
    if (route?.params?.key && route?.params?.login) {
      setResetKey(route.params.key);
      setResetLogin(route.params.login);
      setStage('changePassword');
    }

    return () => sub.remove();
  }, []);

  // ── Stage 1 → 2: Request reset email ───────────────────────────────────
  const handleRequestReset = async () => {
    if (!email.trim()) {
      setRequestError('Please enter your username or email address.');
      return;
    }
    setRequesting(true);
    setRequestError('');
    try {
      await forgotPassword(email.trim());
      setStage('checkEmail');
    } catch (err: any) {
      setRequestError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  // ── Stage 3 → 4: Submit new password ───────────────────────────────────
  const handleResetPassword = async () => {
    if (!password || !repeatPassword) {
      setResetError('Please fill in both password fields.');
      return;
    }
    if (password.length < 8) {
      setResetError('Password must be at least 8 characters.');
      return;
    }
    if (password !== repeatPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    setResetting(true);
    setResetError('');
    try {
      await resetPassword(resetKey, resetLogin, password);
      setStage('finished');
    } catch (err: any) {
      setResetError(err.message || 'This reset link may have expired. Please request a new one.');
    } finally {
      setResetting(false);
    }
  };

  const isRequestFilled = email.trim().length > 0;
  const isResetFilled = password.length > 0 && repeatPassword.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Back button — only on the initial request stage */}
        {stage === 'request' && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
              <Path
                d="M12.5 15.8333L6.66667 10L12.5 4.16667"
                stroke="#192546"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        )}

        {/* Logo */}
        <Image
          source={require('../assets/images/ipmlogosignup.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Heading — identical across all stages */}
        <Text style={styles.heading}>{'Create a new Password'}</Text>
        <Text style={styles.welcomeText}>
          {'Welcome to The Institute of Project\nManagement'}
        </Text>

        {/* ── STAGE 1: Request ─────────────────────────────────────────── */}
        {stage === 'request' && (
          <>
            <Text style={styles.instructions}>
              {'Please enter your username or email address.\nYou will receive a link to create a new password via\nemail.'}
            </Text>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>{'Email Address'}</Text>
              <View
                style={[
                  styles.inputWrap,
                  isRequestFilled && styles.inputWrapFilled,
                ]}>
                <TextInput
                  style={styles.input}
                  placeholder="name@email.com"
                  placeholderTextColor="#9CA0AC"
                  value={email}
                  onChangeText={v => {
                    setEmail(v);
                    setRequestError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleRequestReset}
                />
              </View>
            </View>

            {requestError ? (
              <Text style={styles.errorText}>{requestError}</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                isRequestFilled ? styles.primaryBtnActive : styles.primaryBtnDisabled,
              ]}
              onPress={handleRequestReset}
              disabled={!isRequestFilled || requesting}
              activeOpacity={0.85}>
              {requesting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.primaryBtnText,
                    isRequestFilled
                      ? styles.primaryBtnTextActive
                      : styles.primaryBtnTextDisabled,
                  ]}>
                  {'Reset Password'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* ── STAGE 2: Check your email ────────────────────────────────── */}
        {stage === 'checkEmail' && (
          <View style={styles.statusBlock}>
            <SuccessTick />
            <Text style={styles.successMessage}>
              {'Check your email for the password reset link.'}
            </Text>
          </View>
        )}

        {/* ── STAGE 3: Change password (arrived via deep link) ────────── */}
        {stage === 'changePassword' && (
          <>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>{'Password'}</Text>
              <View style={[styles.inputWrap, styles.inputWrapFilled]}>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#9CA0AC"
                  value={password}
                  onChangeText={v => {
                    setPassword(v);
                    setResetError('');
                  }}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => repeatRef.current?.focus()}
                />
                <EyeToggle
                  visible={showPassword}
                  onPress={() => setShowPassword(p => !p)}
                />
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>{'Repeat password'}</Text>
              <View style={[styles.inputWrap, styles.inputWrapFilled]}>
                <TextInput
                  ref={repeatRef}
                  style={styles.input}
                  placeholder="Repeat password"
                  placeholderTextColor="#9CA0AC"
                  value={repeatPassword}
                  onChangeText={v => {
                    setRepeatPassword(v);
                    setResetError('');
                  }}
                  secureTextEntry={!showRepeatPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                />
                <EyeToggle
                  visible={showRepeatPassword}
                  onPress={() => setShowRepeatPassword(p => !p)}
                />
              </View>
            </View>

            {resetError ? (
              <Text style={styles.errorText}>{resetError}</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                isResetFilled ? styles.primaryBtnActive : styles.primaryBtnDisabled,
              ]}
              onPress={handleResetPassword}
              disabled={!isResetFilled || resetting}
              activeOpacity={0.85}>
              {resetting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.primaryBtnText,
                    isResetFilled
                      ? styles.primaryBtnTextActive
                      : styles.primaryBtnTextDisabled,
                  ]}>
                  {'Reset Password'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* ── STAGE 4: Finished ────────────────────────────────────────── */}
        {stage === 'finished' && (
          <View style={styles.statusBlock}>
            <SuccessTick />
            <Text style={styles.successMessage}>
              {'Your password has been successfully changed!'}
            </Text>
          </View>
        )}

        {/* Back to Sign In — present on every stage */}
        <TouchableOpacity
          onPress={() => navigation.replace('SignIn')}
          style={styles.backToSignInBtn}>
          <Text style={styles.backToSignInText}>{'Back to Sign In'}</Text>
        </TouchableOpacity>

        {/* Terms / Privacy */}
        <View style={styles.legalRow}>
          <Text
            style={styles.legalLink}
            onPress={() =>
              Linking.openURL(
                'https://hub.instituteprojectmanagement.com/community-guidelines/',
              )
            }>
            {'Terms of Service'}
          </Text>
          <Text style={styles.legalAnd}>{' and '}</Text>
          <Text
            style={styles.legalLink}
            onPress={() =>
              Linking.openURL(
                'https://hub.instituteprojectmanagement.com/privacy-policy/',
              )
            }>
            {'Privacy Policy'}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: '#FFFFFF'},
  scroll: {flex: 1},
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },

  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },

  logo: {
    width: 64,
    height: 64,
    marginTop: 12,
    marginBottom: 16,
  },

  // Heading/H1 — Figma exact
  heading: {
    color: '#0C4D91',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.24,
    marginBottom: 6,
  },

  // Body/Body — Figma exact
  welcomeText: {
    color: '#71727A',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 20,
    marginBottom: 24,
  },

  // Body/Body M — Figma exact
  instructions: {
    color: '#192546',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    marginBottom: 24,
  },

  fieldBlock: {
    width: '100%',
    marginBottom: 16,
  },
  // Heading/H5 — Figma exact
  fieldLabel: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },

  // Empty state — Figma exact:
  // border-radius: 50px; border: 1px solid #C5C6CC; background: #F8F9FE
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#C5C6CC',
    backgroundColor: '#F8F9FE',
  },
  // Filled state — Figma gives no explicit new border/bg values for "after
  // typing" on the field itself (only the button changes color per the
  // brief) — kept visually identical, just exposed as its own style hook
  // in case Figma specifies a distinct filled-field treatment later.
  inputWrapFilled: {},
  input: {
    flex: 1,
    fontFamily: 'Runda',
    fontSize: 14,
    color: '#192546',
    padding: 0,
  },
  eyeBtn: {paddingLeft: 8},
  eyeIcon: {width: 18, height: 18, opacity: 0.45},
  eyeVisible: {opacity: 0.8},

  errorText: {
    width: '100%',
    color: '#DC2626',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 12,
    textAlign: 'left',
  },

  // Reset Password button — Figma exact box model
  primaryBtn: {
    width: '100%',
    height: 40,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  // Disabled (no email yet) — muted, matches "Forgot Password - Empty" mock
  primaryBtnDisabled: {
    backgroundColor: '#E8E9F1',
  },
  // Active (email typed) — Figma "Filled" mock button color
  primaryBtnActive: {
    backgroundColor: '#0C4D91',
  },
  primaryBtnText: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryBtnTextDisabled: {color: '#A6A8B5'},
  primaryBtnTextActive: {color: '#FFFFFF'},

  statusBlock: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 8,
  },
  // Body/Body M, Support-Success-Dark — Figma exact
  successMessage: {
    color: '#3BBB06',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    marginTop: 14,
    paddingHorizontal: 12,
  },

  backToSignInBtn: {
    height: 40,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  backToSignInText: {
    color: '#0C4D91',
    fontFamily: 'Runda',
    fontSize: 13,
    fontWeight: '600',
  },

  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  // Action/Action M — Figma exact
  legalLink: {
    color: '#46B0E3',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '500',
  },
  legalAnd: {
    color: '#71727A',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '400',
  },
});

export default ForgotPasswordScreen;
