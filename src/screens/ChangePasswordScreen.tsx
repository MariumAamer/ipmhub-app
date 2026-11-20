/* eslint-disable prettier/prettier */
/**
 * ChangePasswordScreen — Figma "A · Change password (email & password users)".
 *
 * Three states from the design, all driven by the same form:
 *   1. Empty        → Update Password disabled (light blue), checklist grey
 *   2. Valid        → every rule green, Update Password enabled
 *   3. Wrong current password → red border + "Incorrect password…" message
 *
 * Values marked ESTIMATE are read off the Figma screenshot, not the spec —
 * replace them when exact numbers are available.
 *
 * Accounts with no password (Google/LinkedIn/Apple sign-up) use
 * SetPasswordScreen instead.
 *
 * Rules and the "sign out of other devices" default come from
 * GET /account/login-info. The sign-out request field name is UNCONFIRMED
 * (see accountApi.ts FIELDS).
 */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import BackButton from '../components/BackButton';
import EyeOpenIcon from '../components/EyeOpenIcon';
import EyeClosedIcon from '../components/EyeClosedIcon';
import {changePassword, getLoginInfo, DEFAULT_PASSWORD_RULES} from '../api/accountApi';
import type {PasswordRules} from '../api/accountApi';

const NAVY = '#192546'; // IPM Navy Blue (text)
const BLUE = '#0C4D91'; // primary action blue
const GREY = '#8F9098';
const BORDER = '#C5C6CC';
const GREEN = '#3BBB06';
const ERROR_RED = '#ED3241'; // Support-Error-Dark (message text)
const ERROR_BORDER = '#FF616D'; // Support-Error-Medium (input border)
const LINK_BLUE = '#46B0E3'; // IPM Light Blue — "Forgot password?"
const DISABLED_BLUE = '#A3BAD6'; // ESTIMATE — disabled Update Password fill

const WRONG_PASSWORD_MESSAGE = 'Incorrect password. Try again or reset it.';

// login-info reports sign_out_others_default, so the option is supported.
const SIGN_OUT_OTHERS_SUPPORTED = true;

// ─── "Not a common password" ──────────────────────────────────────────────────
// Checked on the phone against a short built-in list; the server has no
// endpoint for it. Extend freely (all lowercase). If the server enforces its own
// rules, those can still reject a password this list lets through.
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

// ─── Tick (Figma export; <mask> is not rendered by react-native-svg@15.3.0, ──
// so it is drawn as a direct-fill path — same shape) ────────────────────────
const TickIcon = ({color}: {color: string}) => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M13.5202 4.14399C13.4242 4.048 13.3069 4 13.1682 4C13.0296 4 12.9122 4.048 12.8162 4.14399L5.83985 11.1197L2.84797 8.14384C2.75197 8.04784 2.63464 7.99984 2.49598 7.99984C2.35732 7.99984 2.23999 8.04784 2.14399 8.14384C2.048 8.23983 2 8.35716 2 8.49582C2 8.63449 2.048 8.75181 2.14399 8.84781L5.48786 12.1917C5.58386 12.2877 5.70119 12.3357 5.83985 12.3357C5.97851 12.3357 6.09584 12.2877 6.19184 12.1917L13.5202 4.84797C13.6162 4.75197 13.6642 4.63464 13.6642 4.49598C13.6642 4.35732 13.6162 4.23999 13.5202 4.14399Z"
      fill={color}
    />
  </Svg>
);

// ─── Password field (label + bordered input + eye toggle + optional error) ───
const PasswordField = ({
  label,
  placeholder,
  value,
  onChangeText,
  visible,
  onToggleVisible,
  error,
  inputRef,
  returnKeyType,
  onSubmitEditing,
  textContentType,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  error?: string;
  inputRef?: React.RefObject<TextInput | null>;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  textContentType?: 'password' | 'newPassword';
}) => (
  <View style={s.field}>
    <Text style={s.fieldLabel}>{label}</Text>
    <View style={[s.inputWrap, !!error && s.inputWrapError]}>
      <TextInput
        ref={inputRef}
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={GREY}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType={textContentType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
      <TouchableOpacity
        onPress={onToggleVisible}
        hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}>
        {visible ? <EyeOpenIcon /> : <EyeClosedIcon />}
      </TouchableOpacity>
    </View>
    {!!error && <Text style={s.errorText}>{error}</Text>}
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────
const ChangePasswordScreen = ({navigation}: any) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [signOutOthers, setSignOutOthers] = useState(true);

  const [currentError, setCurrentError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const newRef = React.useRef<TextInput>(null);

  const [pwRules, setPwRules] = useState<PasswordRules>(DEFAULT_PASSWORD_RULES);
  useEffect(() => {
    let alive = true;
    getLoginInfo()
      .then(info => {
        if (!alive) return;
        setPwRules(info.passwordRules);
        setSignOutOthers(info.signOutOthersDefault);
      })
      .catch(() => {}); // keep the defaults if it can't be read
    return () => {
      alive = false;
    };
  }, []);

  const rules = [
    {id: 'len', label: `At least ${pwRules.minLength} characters`, met: next.length >= pwRules.minLength},
    ...(pwRules.differentFromCurrent
      ? [{id: 'diff', label: 'Different from your current password', met: next.length > 0 && next !== current}]
      : []),
    ...(pwRules.notCommon
      ? [{id: 'common', label: 'Not a common password', met: next.length > 0 && !isCommonPassword(next)}]
      : []),
  ];
  const allRulesMet = rules.every(r => r.met);
  const canSubmit = current.length > 0 && allRulesMet && !submitting;

  const handleUpdate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setCurrentError('');
    setSubmitError('');
    try {
      await changePassword(current, next, SIGN_OUT_OTHERS_SUPPORTED ? signOutOthers : undefined);
      Alert.alert('Password updated', 'Your password has been changed.', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (e: any) {
      if (e?.code === 'wrong_password') {
        setCurrentError(WRONG_PASSWORD_MESSAGE);
      } else if (e?.field === 'current') {
        setCurrentError(e.message);
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

          <Text style={s.title}>{'Change Password'}</Text>
          <Text style={s.intro}>{'Enter your current password, then choose a new one.'}</Text>

          <PasswordField
            label="Current password"
            placeholder="Enter your current password"
            value={current}
            onChangeText={v => {
              setCurrent(v);
              setCurrentError('');
              setSubmitError('');
            }}
            visible={showCurrent}
            onToggleVisible={() => setShowCurrent(p => !p)}
            error={currentError}
            returnKeyType="next"
            onSubmitEditing={() => newRef.current?.focus()}
            textContentType="password"
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={s.forgot}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={s.forgotText}>{'Forgot password?'}</Text>
          </TouchableOpacity>

          <PasswordField
            label="New password"
            placeholder="Create a new password"
            value={next}
            onChangeText={v => {
              setNext(v);
              setSubmitError('');
            }}
            visible={showNext}
            onToggleVisible={() => setShowNext(p => !p)}
            inputRef={newRef}
            returnKeyType="done"
            onSubmitEditing={handleUpdate}
            textContentType="newPassword"
          />

          <View style={s.rules}>
            {rules.map(r => (
              <View key={r.id} style={s.ruleRow}>
                <TickIcon color={r.met ? GREEN : BORDER} />
                <Text style={[s.ruleText, r.met && s.ruleTextMet]}>{r.label}</Text>
              </View>
            ))}
          </View>

          {SIGN_OUT_OTHERS_SUPPORTED && (
            <TouchableOpacity
              style={s.checkRow}
              onPress={() => setSignOutOthers(p => !p)}
              activeOpacity={0.8}
              accessibilityRole="checkbox"
              accessibilityState={{checked: signOutOthers}}>
              <View style={[s.checkBox, signOutOthers && s.checkBoxOn]}>
                {signOutOthers && (
                  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                    <Path
                      d="M10.1403 3.108C10.0683 3.036 9.9803 3 9.87631 3C9.77231 3 9.68431 3.036 9.61231 3.108L4.37993 8.33988L2.13599 6.10793C2.06399 6.03593 1.97599 5.99993 1.87199 5.99993C1.76799 5.99993 1.68 6.03593 1.608 6.10793C1.536 6.17993 1.5 6.26792 1.5 6.37192C1.5 6.47592 1.536 6.56392 1.608 6.63592L4.11594 9.14386C4.18794 9.21586 4.27594 9.25185 4.37993 9.25185C4.48393 9.25185 4.57193 9.21586 4.64393 9.14386L10.1403 3.63599C10.2123 3.56399 10.2483 3.47599 10.2483 3.37199C10.2483 3.26799 10.2123 3.18 10.1403 3.108Z"
                      fill="#FFFFFF"
                    />
                  </Svg>
                )}
              </View>
              <Text style={s.checkLabel}>{'Sign out of all other devices'}</Text>
            </TouchableOpacity>
          )}

          {!!submitError && <Text style={[s.errorText, s.submitError]}>{submitError}</Text>}

          <TouchableOpacity
            style={[s.primaryBtn, !canSubmit && s.primaryBtnDisabled]}
            onPress={handleUpdate}
            disabled={!canSubmit}
            activeOpacity={0.85}>
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={s.primaryBtnText}>{'Update Password'}</Text>
            )}
          </TouchableOpacity>

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

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  flex: {flex: 1},
  content: {paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40},
  back: {alignSelf: 'flex-start', marginBottom: 20},

  // Heading/H2 — Runda 18 / 700, Navy, letter-spacing 0.09
  title: {color: NAVY, fontFamily: 'Runda-Bold', fontSize: 18, fontWeight: '700', letterSpacing: 0.09},
  // Body/Body M — Runda 14 / 400, line-height 18, Navy
  intro: {color: NAVY, fontFamily: 'Runda-Normal', fontSize: 14, fontWeight: '400', lineHeight: 18, marginTop: 8, marginBottom: 24},

  // Field wrapper from the spec: column, flex-start, gap 8, stretch
  field: {flexDirection: 'column', alignItems: 'flex-start', gap: 8, alignSelf: 'stretch'},
  // Heading/H5 — Runda 12 / 500, Navy
  fieldLabel: {color: NAVY, fontFamily: 'Runda-Medium', fontSize: 12, fontWeight: '500'},
  // Textbox: height 48, padding 12/16, centered row, gap 8, stretch, radius 5, 1px #C5C6CC
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
  // Incorrect-password state: 1.5px Support-Error-Medium border
  inputWrapError: {borderWidth: 1.5, borderColor: ERROR_BORDER},
  input: {flex: 1, color: NAVY, fontFamily: 'Runda-Normal', fontSize: 12, paddingVertical: 0},
  // Body/Body XS — Inter 10 / 400 / 14, letter-spacing 0.15, Support-Error-Dark
  errorText: {color: ERROR_RED, fontFamily: 'Inter', fontSize: 10, fontWeight: '400', lineHeight: 14, letterSpacing: 0.15},
  submitError: {marginBottom: 12},

  forgot: {alignSelf: 'flex-start', marginTop: 8, marginBottom: 16},
  // Action/Action M — Runda 12 / 500, Light Blue
  forgotText: {color: LINK_BLUE, fontFamily: 'Runda-Medium', fontSize: 12, fontWeight: '500'},

  // Box: column, flex-start, gap 6, stretch
  rules: {flexDirection: 'column', alignItems: 'flex-start', alignSelf: 'stretch', gap: 6, marginTop: 12, marginBottom: 20},
  ruleRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  // Body/Body S — Runda 12 / 400 / 16, Neutral Dark Lightest (unmet)
  ruleText: {color: GREY, fontFamily: 'Runda-Normal', fontSize: 12, fontWeight: '400', lineHeight: 16},
  ruleTextMet: {color: NAVY},

  // Box: padding 12, column, gap 10 (checkbox + label)
  checkRow: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 12},
  checkBox: {
    width: 16,
    height: 16,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: GREY,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkBoxOn: {backgroundColor: BLUE, borderColor: BLUE},
  // Action/Action M — Runda 12 / 500, Navy
  checkLabel: {color: NAVY, fontFamily: 'Runda-Medium', fontSize: 12, fontWeight: '500'},

  // ESTIMATE — pill buttons, 44 high, 12 apart
  primaryBtn: {
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE,
  },
  primaryBtnDisabled: {backgroundColor: DISABLED_BLUE},
  primaryBtnText: {color: '#FFFFFF', fontFamily: 'Runda-Medium', fontSize: 14, fontWeight: '500'},
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

export default ChangePasswordScreen;
