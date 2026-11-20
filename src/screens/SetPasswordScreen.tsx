/* eslint-disable prettier/prettier */
/**
 * SetPasswordScreen — Figma "D · Google sign-in users – Set a password".
 *
 * For accounts that signed up with Google/LinkedIn/Apple and have no IPM Hub
 * password. The person types a new password, then confirms they own the social
 * account ("Continue with Google"); the new password and that proof go to
 * POST /account/password (see accountApi.setPassword).
 *
 * Google, LinkedIn and Apple (iOS only) confirmation are wired.
 *
 * LinkedIn: uses requestLinkedInCode() (the same helper account deletion
 * uses); the app only gets an authorization code, so it sends code +
 * redirect_uri and the server exchanges it. Whether POST /account/password
 * accepts that is still to be confirmed with the backend.
 *
 * Values marked ESTIMATE are read off the Figma screenshot, not a spec.
 */
import React, {useEffect, useState} from 'react';
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
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import BackButton from '../components/BackButton';
import EyeOpenIcon from '../components/EyeOpenIcon';
import EyeClosedIcon from '../components/EyeClosedIcon';
import SocialButton, {GoogleIcon, LinkedInSquareIcon} from '../components/SocialButton';
import {setPassword, getLoginInfo, DEFAULT_PASSWORD_RULES} from '../api/accountApi';
import type {PasswordRules} from '../api/accountApi';
import {setPendingToast} from '../utils/pendingToast';
import {requestLinkedInCode} from '../api/linkedinAuth';
import AppleMark from '../components/AppleMark';
import {appleAuth} from '@invertase/react-native-apple-authentication';

const NAVY = '#192546';
const BLUE = '#0C4D91';
const GREY = '#8F9098';
const BORDER = '#C5C6CC';
const GREEN = '#3BBB06';
const ERROR_RED = '#ED3241';
const ERROR_BORDER = '#FF616D';

// Same short list as ChangePasswordScreen — the server has no endpoint for it.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password12', 'password123', 'password1234', 'passw0rd', 'p@ssw0rd', 'p@ssword',
  '12345678', '123456789', '1234567890', '123123123', '11111111', '00000000', '87654321', '12341234',
  'qwertyui', 'qwerty123', 'qwertyuiop', 'qwerty12', 'qwerty1234', '1q2w3e4r', '1q2w3e4r5t', 'q1w2e3r4',
  'abc12345', 'abcd1234', 'abcdefgh', 'abcd12345', 'iloveyou', 'iloveyou1', 'letmein1', 'letmein123',
  'welcome1', 'welcome123', 'admin123', 'administrator', 'changeme', 'changeme1', 'trustno1', 'sunshine1',
  'princess1', 'football1', 'baseball1', 'superman1', 'monkey123', 'dragon123', 'master123', 'login123',
  'starwars1', 'whatever1', 'freedom1', 'shadow123', 'michael1', 'jennifer1', 'charlie1', 'access123',
  'ipmhub123', 'projectmanagement', 'project123', 'manager123',
]);
const isCommonPassword = (pw: string) => COMMON_PASSWORDS.has(pw.toLowerCase());

const PROVIDER_LABEL: Record<string, string> = {google: 'Google', linkedin: 'LinkedIn', apple: 'Apple'};

const TickIcon = ({color}: {color: string}) => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M13.5202 4.14399C13.4242 4.048 13.3069 4 13.1682 4C13.0296 4 12.9122 4.048 12.8162 4.14399L5.83985 11.1197L2.84797 8.14384C2.75197 8.04784 2.63464 7.99984 2.49598 7.99984C2.35732 7.99984 2.23999 8.04784 2.14399 8.14384C2.048 8.23983 2 8.35716 2 8.49582C2 8.63449 2.048 8.75181 2.14399 8.84781L5.48786 12.1917C5.58386 12.2877 5.70119 12.3357 5.83985 12.3357C5.97851 12.3357 6.09584 12.2877 6.19184 12.1917L13.5202 4.84797C13.6162 4.75197 13.6642 4.63464 13.6642 4.49598C13.6642 4.35732 13.6162 4.23999 13.5202 4.14399Z"
      fill={color}
    />
  </Svg>
);

// ─── Screen ───────────────────────────────────────────────────────────────────
const SetPasswordScreen = ({navigation, route}: any) => {
  const provider: string = route?.params?.provider || 'google';
  const providerLabel = PROVIDER_LABEL[provider] || 'your account';

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [next, setNext] = useState('');
  const [showNext, setShowNext] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pwRules, setPwRules] = useState<PasswordRules>(DEFAULT_PASSWORD_RULES);

  useEffect(() => {
    let alive = true;
    getLoginInfo()
      .then(info => alive && setPwRules(info.passwordRules))
      .catch(() => {}); // keep the defaults if it can't be read
    return () => {
      alive = false;
    };
  }, []);

  const rules = [
    {id: 'len', label: `At least ${pwRules.minLength} characters`, met: next.length >= pwRules.minLength},
    ...(pwRules.notCommon
      ? [{id: 'common', label: 'Not a common password', met: next.length > 0 && !isCommonPassword(next)}]
      : []),
  ];
  const canSubmit = rules.every(r => r.met) && !submitting;

  // Returns the proof the server wants, or null if the person backed out.
  const confirmWithProvider = async (): Promise<{idToken?: string; code?: string; redirectUri?: string} | null> => {
    if (provider === 'linkedin') {
      // {code, redirectUri}, or null if the member backed out. The server
      // exchanges the code itself.
      return requestLinkedInCode();
    }
    if (provider === 'apple') {
      // Sign in with Apple only exists on iOS.
      if (Platform.OS !== 'ios' || !appleAuth.isSupported) {
        throw new Error('Confirming with Apple is only available on iPhone.');
      }
      try {
        const res = await appleAuth.performRequest({
          requestedOperation: appleAuth.Operation.LOGIN,
          requestedScopes: [],
        });
        if (!res.identityToken) throw new Error('No identity token received from Apple. Please try again.');
        return {idToken: res.identityToken};
      } catch (e: any) {
        // 1001 = the member closed the Apple sheet.
        if (e?.code === appleAuth.Error.CANCELED || e?.code === '1001') return null;
        throw e;
      }
    }
    if (provider !== 'google') {
      throw new Error(`Confirming with ${providerLabel} isn't available in the app yet.`);
    }
    try {
      await GoogleSignin.hasPlayServices();
      const info: any = await GoogleSignin.signIn();
      if (info?.type === 'cancelled') return null; // v16 resolves instead of throwing
      const idToken = info?.data?.idToken ?? info?.idToken;
      if (!idToken) throw new Error('No token received from Google. Please try again.');
      return {idToken};
    } catch (e: any) {
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) return null;
      throw e;
    }
  };

  const handleContinue = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setFieldError('');
    setSubmitError('');
    try {
      const proof = await confirmWithProvider();
      if (!proof) return; // cancelled — stay on the form
      await setPassword(next, proof);
      setPendingToast('Password set. You can now also sign in with your email.');
      navigation.goBack();
    } catch (e: any) {
      if (e?.field === 'new' || e?.field === 'password') {
        setFieldError(e.message);
      } else {
        setSubmitError(e?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={s.flex}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <BackButton navigation={navigation} style={s.back} />

          <Text style={s.title}>{'Set a Password'}</Text>
          <Text style={s.intro}>
            {`Create a password so you can also sign in with your email. To keep your account safe, we'll ask you to confirm with ${providerLabel}.`}
          </Text>

          <View style={s.field}>
            <Text style={s.fieldLabel}>{'New password'}</Text>
            <View style={[s.inputWrap, !!fieldError && s.inputWrapError]}>
              <TextInput
                style={s.input}
                value={next}
                onChangeText={v => {
                  setNext(v);
                  setFieldError('');
                  setSubmitError('');
                }}
                placeholder="Create a password"
                placeholderTextColor={GREY}
                secureTextEntry={!showNext}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                maxLength={pwRules.maxLength}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
              <TouchableOpacity
                onPress={() => setShowNext(p => !p)}
                hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
                accessibilityRole="button"
                accessibilityLabel={showNext ? 'Hide password' : 'Show password'}>
                {showNext ? <EyeOpenIcon /> : <EyeClosedIcon />}
              </TouchableOpacity>
            </View>
            {!!fieldError && <Text style={s.errorText}>{fieldError}</Text>}
          </View>

          <View style={s.rules}>
            {rules.map(r => (
              <View key={r.id} style={s.ruleRow}>
                <TickIcon color={r.met ? GREEN : BORDER} />
                <Text style={[s.ruleText, r.met && s.ruleTextMet]}>{r.label}</Text>
              </View>
            ))}
          </View>

          {!!submitError && <Text style={[s.errorText, s.submitError]}>{submitError}</Text>}

          {/* Same outlined "Continue with …" button as Sign Up / Sign In */}
          <SocialButton
            label={`Continue with ${providerLabel}`}
            icon={
              provider === 'google' ? <GoogleIcon /> : provider === 'linkedin' ? <LinkedInSquareIcon /> : provider === 'apple' ? <AppleMark /> : null
            }
            onPress={handleContinue}
            loading={submitting}
            disabled={!canSubmit}
          />

          <TouchableOpacity
            style={s.secondaryBtn}
            onPress={() => navigation.goBack()}
            disabled={submitting}
            activeOpacity={0.85}>
            <Text style={s.secondaryBtnText}>{'Cancel'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </View>
  );
};

// ─── Styles (same tokens as Change Password) ──────────────────────────────────
const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  flex: {flex: 1},
  content: {paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40},
  back: {alignSelf: 'flex-start', marginBottom: 20},

  // Heading/H2 — Runda 18 / 700, Navy, letter-spacing 0.09
  title: {color: NAVY, fontFamily: 'Runda-Bold', fontSize: 18, fontWeight: '700', letterSpacing: 0.09},
  // Body/Body M — Runda 14 / 400, line-height 18, Navy
  intro: {color: NAVY, fontFamily: 'Runda-Normal', fontSize: 14, fontWeight: '400', lineHeight: 18, marginTop: 8, marginBottom: 24},

  field: {flexDirection: 'column', alignItems: 'flex-start', gap: 8, alignSelf: 'stretch'},
  // Heading/H5 — Runda 12 / 500, Navy
  fieldLabel: {color: NAVY, fontFamily: 'Runda-Medium', fontSize: 12, fontWeight: '500'},
  inputWrap: {
    alignSelf: 'stretch',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  inputWrapError: {borderWidth: 1.5, borderColor: ERROR_BORDER},
  input: {flex: 1, color: NAVY, fontFamily: 'Runda-Normal', fontSize: 12, paddingVertical: 0},
  errorText: {color: ERROR_RED, fontFamily: 'Inter', fontSize: 10, fontWeight: '400', lineHeight: 14, letterSpacing: 0.15},
  submitError: {marginBottom: 12},

  rules: {flexDirection: 'column', alignItems: 'flex-start', alignSelf: 'stretch', gap: 6, marginTop: 12, marginBottom: 20},
  ruleRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  ruleText: {color: GREY, fontFamily: 'Runda-Normal', fontSize: 12, fontWeight: '400', lineHeight: 16},
  ruleTextMet: {color: NAVY},

  secondaryBtn: {
    height: 44,
    marginTop: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: {color: BLUE, fontFamily: 'Runda-Medium', fontSize: 14, fontWeight: '500'},
});

export default SetPasswordScreen;
