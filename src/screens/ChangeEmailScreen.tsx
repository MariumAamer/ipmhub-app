/* eslint-disable prettier/prettier */
/**
 * ChangeEmailScreen — Figma "B · Change email (email & password users)".
 *
 * Two states from the design, one form:
 *   1. Empty  → "Send Confirmation Link" disabled (light blue)
 *   2. Filled → enabled
 * plus the error states (wrong current password, email taken/invalid) which use
 * the same red border + message treatment as Change Password.
 *
 * On success the confirmation link has been sent; the new address is remembered
 * as "pending" and we go back to Login Information, which then shows the
 * "Confirm your new email" banner.
 *
 * Field / typography tokens are the ones supplied for Change Password. Values
 * marked ESTIMATE are read off the Figma screenshot, not a spec.
 */
import React, {useRef, useState} from 'react';
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
} from 'react-native';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import BackButton from '../components/BackButton';
import EyeOpenIcon from '../components/EyeOpenIcon';
import EyeClosedIcon from '../components/EyeClosedIcon';
import {requestEmailChange} from '../api/accountApi';

const NAVY = '#192546';
const BLUE = '#0C4D91';
const GREY = '#8F9098';
const BORDER = '#C5C6CC';
const ERROR_RED = '#ED3241'; // Support-Error-Dark (message text)
const ERROR_BORDER = '#FF616D'; // Support-Error-Medium (input border)
const LINK_BLUE = '#46B0E3'; // IPM Light Blue
const DISABLED_BLUE = '#A3BAD6'; // ESTIMATE — disabled button fill

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ERROR_TEXT = {
  wrong_password: 'Incorrect password. Try again or reset it.',
  email_taken: 'That email address is already taken.',
  email_invalid: 'That email address is invalid. Check the formatting and try again.',
  email_blocked: 'That email address is currently unavailable for use.',
  email_empty: 'Email address cannot be empty.',
  nochange: 'That is already your email address.',
} as const;

// ─── Field (label + bordered input + optional eye toggle + optional error) ───
const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secure,
  visible,
  onToggleVisible,
  inputRef,
  returnKeyType,
  onSubmitEditing,
  ...inputProps
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  error?: string;
  secure?: boolean;
  visible?: boolean;
  onToggleVisible?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
} & Pick<React.ComponentProps<typeof TextInput>, 'keyboardType' | 'textContentType' | 'autoComplete'>) => (
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
        secureTextEntry={!!secure && !visible}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        {...inputProps}
      />
      {!!secure && (
        <TouchableOpacity
          onPress={onToggleVisible}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}>
          {visible ? <EyeOpenIcon /> : <EyeClosedIcon />}
        </TouchableOpacity>
      )}
    </View>
    {!!error && <Text style={s.errorText}>{error}</Text>}
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────
const ChangeEmailScreen = ({navigation, route}: any) => {
  const currentEmail: string = route?.params?.currentEmail || '';

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const canSubmit = EMAIL_RE.test(newEmail.trim()) && password.length > 0 && !submitting;

  const handleSend = async () => {
    if (!canSubmit) return;
    const target = newEmail.trim();
    if (currentEmail && target.toLowerCase() === currentEmail.toLowerCase()) {
      setEmailError(ERROR_TEXT.nochange);
      return;
    }
    setSubmitting(true);
    setEmailError('');
    setPasswordError('');
    setSubmitError('');
    try {
      await requestEmailChange(target, password);
      // The pending address now lives on the server; Login Information reads
      // it from /account/login-info when we go back.
      navigation.goBack();
    } catch (e: any) {
      // Server errors are {code, message, data.field}: field "current" is the
      // password box, "email" is the email box, anything else goes under the
      // buttons.
      if (e?.code === 'wrong_password') {
        setPasswordError(ERROR_TEXT.wrong_password);
      } else if (e?.field === 'email') {
        setEmailError(e.message);
      } else if (e?.field === 'current') {
        setPasswordError(e.message);
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

          <Text style={s.title}>{'Change Email'}</Text>
          <Text style={s.intro}>
            {"We'll send a confirmation link to your new email. Your current email keeps working until you confirm it."}
          </Text>

          <Field
            label="New email address"
            placeholder="name@email.com"
            value={newEmail}
            onChangeText={v => {
              setNewEmail(v);
              setEmailError('');
              setSubmitError('');
            }}
            error={emailError}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <View style={s.gap} />

          <Field
            label="Current password"
            placeholder="Enter your current password"
            value={password}
            onChangeText={v => {
              setPassword(v);
              setPasswordError('');
              setSubmitError('');
            }}
            error={passwordError}
            secure
            visible={showPassword}
            onToggleVisible={() => setShowPassword(p => !p)}
            inputRef={passwordRef}
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={handleSend}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={s.forgot}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={s.forgotText}>{'Forgot password?'}</Text>
          </TouchableOpacity>

          {!!submitError && <Text style={[s.errorText, s.submitError]}>{submitError}</Text>}

          <TouchableOpacity
            style={[s.primaryBtn, !canSubmit && s.primaryBtnDisabled]}
            onPress={handleSend}
            disabled={!canSubmit}
            activeOpacity={0.85}>
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={s.primaryBtnText}>{'Send Confirmation Link'}</Text>
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

  // Field wrapper: column, flex-start, gap 8, stretch
  field: {flexDirection: 'column', alignItems: 'flex-start', gap: 8, alignSelf: 'stretch'},
  gap: {height: 16}, // ESTIMATE — space between the two fields
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
  // Error state: 1.5px Support-Error-Medium border
  inputWrapError: {borderWidth: 1.5, borderColor: ERROR_BORDER},
  input: {flex: 1, color: NAVY, fontFamily: 'Runda-Normal', fontSize: 12, paddingVertical: 0},
  // Body/Body XS — Inter 10 / 400 / 14, letter-spacing 0.15, Support-Error-Dark
  errorText: {color: ERROR_RED, fontFamily: 'Inter', fontSize: 10, fontWeight: '400', lineHeight: 14, letterSpacing: 0.15},
  submitError: {marginTop: 12},

  // Action/Action M — Runda 12 / 500, Light Blue
  forgot: {alignSelf: 'flex-start', marginTop: 8, marginBottom: 24},
  forgotText: {color: LINK_BLUE, fontFamily: 'Runda-Medium', fontSize: 12, fontWeight: '500'},

  // ESTIMATE — pill buttons, 44 high, 12 apart (same as Change Password)
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

export default ChangeEmailScreen;
