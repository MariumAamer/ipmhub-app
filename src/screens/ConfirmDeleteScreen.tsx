/* eslint-disable prettier/prettier */
import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Platform} from 'react-native';
import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';
import Svg, {Path, Circle} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import BackButton from '../components/BackButton';
import EyeClosedIcon from '../components/EyeClosedIcon';
import EyeOpenIcon from '../components/EyeOpenIcon';
import SocialButton, {GoogleIcon, LinkedInSquareIcon} from '../components/SocialButton';
import {requestLinkedInCode} from '../api/linkedinAuth';
import {getStoredUser, logoutUser} from '../api/authApi';
import {
  AccountApiError,
  DeletionConfirmation,
  DeletionMode,
  DeletionStatus,
  getDeletionStatus,
  requestAccountDeletion,
  sendDeletionCode,
} from '../api/accountApi';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const NAVY = '#192546'; // --IPM-Color-Palette-Navy-Blue
const DARK_BLUE = '#0C4D91'; // --IPM-Color-Palette-Dark-Blue
const LIGHT_BLUE = '#46B0E3'; // --IPM-Color-Palette-Light-Blue
const GREY = '#8F9098'; // --Neutral-Dark-Lightest
const ERROR_RED = '#ED3241'; // --Support-Error-Dark
const BORDER_GREY = '#C5C6CC';

type DeleteMode = 'deactivate' | 'immediate';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "8 Nov 2026" — 30 days from today (restore window).
const restoreUntil = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// ─── Icons ────────────────────────────────────────────────────────────────────
// Rebuilt without <mask> (react-native-svg@15.3.0 doesn't render it).
const TICK_PATH_18 =
  'M12.5934 6.62372C12.3015 6.30928 11.8175 6.30439 11.5198 6.61368L8.16743 10.0966L6.47979 8.34328C6.1821 8.03399 5.69813 8.03889 5.4062 8.35332C5.12151 8.65995 5.12544 9.14761 5.41569 9.44916L8.16743 12.3081L12.5839 7.71956C12.8742 7.418 12.8781 6.93034 12.5934 6.62372Z';

const RadioEmpty = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9 0.75C13.5563 0.75 17.25 4.44365 17.25 9C17.25 13.5563 13.5563 17.25 9 17.25C4.44365 17.25 0.75 13.5563 0.75 9C0.75 4.44365 4.44365 0.75 9 0.75ZM9 1.875C5.06497 1.875 1.875 5.06497 1.875 9C1.875 12.935 5.06497 16.125 9 16.125C12.935 16.125 16.125 12.935 16.125 9C16.125 5.06497 12.935 1.875 9 1.875Z"
      fill={DARK_BLUE}
    />
  </Svg>
);

const RadioChecked = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Circle cx={9} cy={9} r={8.25} fill={DARK_BLUE} />
    <Path d={TICK_PATH_18} fill="#FFFFFF" />
  </Svg>
);

const CheckTick = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.7541 2.30086C12.0858 2.63911 12.0809 3.18261 11.7432 3.51481L4.5973 10.5437L0.25653 6.27403C-0.0811989 5.94183 -0.0860879 5.39832 0.24561 5.06008C0.577309 4.72184 1.11999 4.71694 1.45772 5.04915L4.5973 8.13734L10.542 2.28993C10.8797 1.95773 11.4224 1.96262 11.7541 2.30086Z"
      fill="#FFFFFF"
    />
  </Svg>
);

// "Continue with Apple" — black pill, same look as the sign-in Apple button.
const AppleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path d="M9.11396 5.172C8.40296 5.172 7.30271 4.3635 6.14396 4.392C4.61396 4.41225 3.21146 5.27925 2.42321 6.6525C0.835461 9.40875 2.01371 13.4797 3.56246 15.72C4.32221 16.8105 5.21846 18.0375 6.40646 17.9992C7.54646 17.9505 7.97396 17.259 9.35771 17.259C10.731 17.259 11.1202 17.9992 12.3277 17.97C13.5555 17.9505 14.3347 16.86 15.0847 15.759C15.9517 14.493 16.3117 13.2652 16.3312 13.1977C16.302 13.188 13.9447 12.282 13.9162 9.555C13.8967 7.275 15.7762 6.1845 15.864 6.13575C14.7922 4.56825 13.1467 4.39275 12.5715 4.35375C11.0715 4.23675 9.81521 5.172 9.11396 5.172ZM11.6475 2.8725C12.2797 2.1135 12.6975 1.05225 12.5812 0C11.676 0.039 10.5847 0.60375 9.93221 1.3635C9.34721 2.0355 8.84171 3.117 8.97746 4.149C9.98096 4.227 11.0137 3.633 11.6467 2.87325" fill="#FFFFFF" />
  </Svg>
);

const AppleConfirmButton = ({disabled, onPress}: {disabled?: boolean; onPress: () => void}) => (
  <TouchableOpacity
    style={[styles.appleBtn, disabled && styles.appleBtnDisabled]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel="Continue with Apple">
    <AppleIcon />
    <Text style={styles.appleLabel}>{'Continue with Apple'}</Text>
  </TouchableOpacity>
);

// ─── Option card ──────────────────────────────────────────────────────────────
const OptionCard = ({
  selected,
  title,
  body,
  onPress,
}: {
  selected: boolean;
  title: string;
  body: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.optionCard, selected && styles.optionCardSelected]}
    onPress={onPress}
    activeOpacity={0.8}>
    {selected ? <RadioChecked /> : <RadioEmpty />}
    <View style={styles.optionText}>
      <Text style={styles.h4}>{title}</Text>
      <Text style={styles.bodyS}>{body}</Text>
    </View>
  </TouchableOpacity>
);

// ─── Screen ───────────────────────────────────────────────────────────────────
// How this member confirms is decided by the server (GET /account/deletion →
// confirm_with), not by how they signed in. First method we can actually do
// in the app wins. LinkedIn sends the OAuth code (+ redirect_uri) and the
// server checks the LinkedIn email matches; if that check fails the member can
// fall back to an email code.
const METHOD_ORDER = ['password', 'google', 'apple', 'linkedin', 'email_code'] as const;
type Method = (typeof METHOD_ORDER)[number] | 'unsupported';

const pickMethod = (list: string[]): Method => {
  const m = METHOD_ORDER.find(
    k => list.includes(k) && (k !== 'apple' || Platform.OS === 'ios'),
  );
  return m ?? 'unsupported';
};

const SESSION_EXPIRED = 'Your session has expired. Please sign in again.';

const ConfirmDeleteScreen = ({navigation}: any) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [mode, setMode] = useState<DeleteMode>('deactivate');
  const [confirmed, setConfirmed] = useState(false);

  const [status, setStatus] = useState<DeletionStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  // LinkedIn check failed (e.g. email changed on the Hub) → confirm by email code.
  const [useEmailCode, setUseEmailCode] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setLoadError('');
    try {
      setStatus(await getDeletionStatus());
    } catch (e: any) {
      setLoadError(
        e instanceof AccountApiError && e.isSessionExpired
          ? SESSION_EXPIRED
          : e?.message || 'Could not load your account details.',
      );
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const user = await getStoredUser();
      setEmail(user?.email || '');
    })();
    loadStatus();
  }, [loadStatus]);

  const method: Method = status
    ? useEmailCode
      ? 'email_code'
      : pickMethod(status.confirmWith)
    : 'password';
  const graceDays = status?.graceDays ?? 30;
  const until = status?.previewDueLabel || restoreUntil();
  const blocked = !!status && !status.canDelete;
  const ready = !!status && !blocked && !submitting;
  const providerName =
    method === 'google'
      ? 'Google'
      : method === 'apple'
      ? 'Apple'
      : method === 'linkedin'
      ? 'LinkedIn'
      : '';

  const submit = async (confirmation: DeletionConfirmation) => {
    if (!status || submitting) return;
    setSubmitting(true);
    setError('');
    setPasswordError('');
    const apiMode: DeletionMode = mode === 'immediate' ? 'now' : 'scheduled';
    try {
      const res = await requestAccountDeletion(apiMode, confirmation);
      // The server has ended the session; clear ours too before leaving.
      if (res.signedOut) await logoutUser();
      navigation?.reset?.({
        index: 0,
        routes: [
          {
            name: 'DeleteAccountResult',
            params: {
              variant: apiMode === 'now' ? 'deleted' : 'scheduled',
              email,
              until: res.dueLabel || status.previewDueLabel || undefined,
            },
          },
        ],
      });
    } catch (e: any) {
      if (e instanceof AccountApiError) {
        if (
          e.code === 'deletion_confirmation_required' &&
          Array.isArray(e.data?.confirm_with)
        ) {
          // Server wants a different method than we offered — switch to it.
          setStatus(s => (s ? {...s, confirmWith: e.data.confirm_with} : s));
          setError(e.message);
        } else if (e.code === 'deletion_blocked') {
          setStatus(s => (s ? {...s, canDelete: false, blockedReason: e.message} : s));
        } else if (e.isSessionExpired) {
          setError(SESSION_EXPIRED);
        } else if (
          method === 'password' &&
          /password/i.test(`${e.code} ${e.message}`)
        ) {
          setPasswordError(e.message);
        } else {
          setError(e.message);
        }
      } else {
        setError(e?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePassword = () => {
    if (!password) {
      setPasswordError('Enter your password.');
      return;
    }
    submit({password});
  };

  const handleGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const info = await GoogleSignin.signIn();
      const idToken = info.data?.idToken ?? (info as any).idToken;
      if (!idToken) throw new Error('No token received from Google');
      await submit({googleIdToken: idToken});
    } catch (e: any) {
      if (e?.code !== statusCodes.SIGN_IN_CANCELLED)
        setError('Google confirmation failed. Please try again.');
    }
  };

  const handleApple = async () => {
    try {
      // iOS-only native module — load lazily so Android never touches it.
      const {appleAuth} = require('@invertase/react-native-apple-authentication');
      const res = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [],
      });
      if (!res.identityToken) throw new Error('No identity token received from Apple');
      await submit({appleIdToken: res.identityToken});
    } catch (e: any) {
      if (e?.code === '1001') return; // user cancelled the Apple sheet
      setError('Apple confirmation failed. Please try again.');
    }
  };

  const handleLinkedIn = async () => {
    setError('');
    try {
      const result = await requestLinkedInCode();
      if (!result) return; // came back without finishing — not an error
      await submit({linkedInCode: result});
    } catch {
      setError('LinkedIn confirmation failed. Please try again.');
    }
  };

  const handleSendCode = async () => {
    setSendingCode(true);
    setError('');
    try {
      await sendDeletionCode();
      setCodeSent(true);
    } catch (e: any) {
      setError(e?.message || 'Could not send the code. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleEmailCode = () => {
    if (!/^\d{6}$/.test(emailCode.trim())) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    submit({emailCode: emailCode.trim()});
  };

  const handleForgotPassword = () => {
    navigation?.navigate?.('ForgotPassword');
  };

  const intro = (() => {
    if (method === 'google' || method === 'apple' || method === 'linkedin')
      return `You signed in with ${providerName}. Choose how to delete ${email || 'your account'}, then confirm with your ${providerName} account.`;
    if (method === 'email_code')
      return `To delete ${email || 'your account'}, we'll email you a 6-digit code to confirm it's you.`;
    if (method === 'unsupported')
      return "This account can't be deleted from the app yet. Please contact support to delete it.";
    return `Choose how to delete ${email || 'your account'}, then enter your password.`;
  })();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}>
        <BackButton style={styles.backBtn} onPress={() => navigation?.goBack()} />

        <Text style={styles.pageTitle}>{"Confirm it's you"}</Text>

        {loadingStatus ? (
          <ActivityIndicator color={DARK_BLUE} style={styles.loader} />
        ) : loadError ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{loadError}</Text>
            {loadError !== SESSION_EXPIRED && (
              <TouchableOpacity onPress={loadStatus} activeOpacity={0.7}>
                <Text style={styles.actionM}>{'Try again'}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {blocked && (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  {status?.blockedReason || "This account can't be deleted here. Please contact support."}
                </Text>
              </View>
            )}

            <Text style={styles.bodyM}>{intro}</Text>

            {/* ── How to delete ── */}
            <Text style={styles.h4}>{'How do you want to delete your account?'}</Text>

            <View style={styles.options}>
              <OptionCard
                selected={mode === 'deactivate'}
                title={`Delete after ${graceDays} days`}
                body={`You'll be signed out. Sign in before ${until} to restore your account.`}
                onPress={() => setMode('deactivate')}
              />
              <OptionCard
                selected={mode === 'immediate'}
                title={'Delete now'}
                body={'Your account and data are deleted straight away. This can’t be undone.'}
                onPress={() => setMode('immediate')}
              />
            </View>

            {/* ── Password ── */}
            {method === 'password' && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{'Password'}</Text>
                <View style={[styles.passRow, !!passwordError && styles.passRowError]}>
                  <TextInput
                    style={styles.passInput}
                    value={password}
                    onChangeText={t => {
                      setPassword(t);
                      if (passwordError) setPasswordError('');
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Enter your password"
                    placeholderTextColor="#C0C0C0"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(p => !p)}
                    hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
                    {showPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
                  </TouchableOpacity>
                </View>
                {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
              </View>
            )}

            {method === 'password' && (
              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7} style={styles.linkWrap}>
                <Text style={styles.actionM}>{'Forgot password?'}</Text>
              </TouchableOpacity>
            )}

            {/* ── Email code (accounts without a password) ── */}
            {method === 'email_code' && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{'6-digit code'}</Text>
                <View style={styles.passRow}>
                  <TextInput
                    style={styles.passInput}
                    value={emailCode}
                    onChangeText={t => {
                      setEmailCode(t.replace(/\D/g, '').slice(0, 6));
                      if (error) setError('');
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="Enter the code"
                    placeholderTextColor="#C0C0C0"
                  />
                </View>
                <TouchableOpacity
                  onPress={handleSendCode}
                  disabled={sendingCode}
                  activeOpacity={0.7}
                  style={styles.linkWrap}>
                  <Text style={styles.actionM}>
                    {sendingCode ? 'Sending…' : codeSent ? 'Resend code' : 'Email me a code'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            {/* ── Confirmation checkbox ── */}
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setConfirmed(c => !c)}
              activeOpacity={0.8}>
              <View style={[styles.checkBox, confirmed && styles.checkBoxChecked]}>
                {confirmed && <CheckTick />}
              </View>
              <Text style={[styles.actionM, styles.checkLabel]}>
                {"I understand that once my account is deleted, it can't be restored."}
              </Text>
            </TouchableOpacity>

            {/* ── Actions ── */}
            <View style={styles.buttons}>
              {method === 'google' && (
                <SocialButton
                  label="Continue with Google"
                  icon={<GoogleIcon />}
                  onPress={handleGoogle}
                  loading={submitting}
                  disabled={!confirmed || !ready}
                />
              )}
              {method === 'apple' && (
                <AppleConfirmButton onPress={handleApple} disabled={!confirmed || !ready} />
              )}
              {method === 'linkedin' && (
                <SocialButton
                  label="Continue with LinkedIn"
                  icon={<LinkedInSquareIcon />}
                  onPress={handleLinkedIn}
                  loading={submitting}
                  disabled={!confirmed || !ready}
                />
              )}
              {method === 'linkedin' && !!error && (
                <TouchableOpacity
                  onPress={() => {
                    setError('');
                    setUseEmailCode(true);
                  }}
                  activeOpacity={0.7}
                  style={styles.linkWrap}>
                  <Text style={styles.actionM}>{'Confirm with an email code instead'}</Text>
                </TouchableOpacity>
              )}
              {(method === 'password' || method === 'email_code') && (
                <TouchableOpacity
                  style={[styles.deleteBtn, (!confirmed || !ready) && styles.deleteBtnDisabled]}
                  onPress={method === 'password' ? handlePassword : handleEmailCode}
                  disabled={!confirmed || !ready}
                  activeOpacity={0.85}>
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.deleteText}>{'Delete My Account'}</Text>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation?.goBack()} activeOpacity={0.85}>
                <Text style={styles.cancelText}>{'Cancel'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{height: 24}} />
      </ScrollView>

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 16,
  },
  backBtn: {alignSelf: 'flex-start'},
  // Heading/H2
  pageTitle: {
    fontFamily: 'Runda-Bold',
    fontSize: 18,
    color: NAVY,
    letterSpacing: 0.09,
  },
  // Body/Body M
  bodyM: {
    fontFamily: 'Runda-Normal',
    fontSize: 14,
    lineHeight: 18,
    color: NAVY,
  },
  // Heading/H4
  h4: {
    fontFamily: 'Runda-Medium',
    fontSize: 14,
    color: NAVY,
  },
  // Body/Body S
  bodyS: {
    fontFamily: 'Runda-Normal',
    fontSize: 12,
    lineHeight: 16,
    color: GREY,
  },
  // Action/Action M
  actionM: {
    fontFamily: 'Runda-Medium',
    fontSize: 12,
    color: LIGHT_BLUE,
  },
  // TODO: confirm password input spec — matched to existing app inputs.
  field: {alignSelf: 'stretch', gap: 6},
  fieldLabel: {fontFamily: 'Runda-Medium', fontSize: 12, color: NAVY},
  passRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: BORDER_GREY,
    backgroundColor: '#FFFFFF',
  },
  passRowError: {borderColor: ERROR_RED},
  passInput: {flex: 1, fontSize: 14, color: NAVY, paddingVertical: 0},
  // Body/Body XS (spec says Inter — not bundled, so system font)
  errorText: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.15,
    color: ERROR_RED,
  },
  linkWrap: {alignSelf: 'flex-start'},
  loader: {marginTop: 24},
  noticeBox: {
    alignSelf: 'stretch',
    gap: 8,
    padding: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: ERROR_RED,
    backgroundColor: '#FFE2E5', // --Support-Error-Light
  },
  noticeText: {fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16, color: NAVY},
  options: {alignSelf: 'stretch', gap: 12},
  // Option card spec: padding 12/16, gap 12, radius 5, 1px border.
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: BORDER_GREY,
    backgroundColor: '#FFFFFF',
  },
  optionCardSelected: {borderColor: DARK_BLUE},
  optionText: {flex: 1, gap: 2},
  // Checkbox row spec: padding 12, gap 10.
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    padding: 12,
    gap: 10,
  },
  checkBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: DARK_BLUE,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxChecked: {backgroundColor: DARK_BLUE},
  checkLabel: {flex: 1, color: NAVY, lineHeight: 16},
  buttons: {alignSelf: 'stretch', gap: 12},
  // Button spec: height 40, padding 12/16, radius 100, #ED3241.
  deleteBtn: {
    height: 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 100,
    backgroundColor: ERROR_RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // TODO: confirm disabled style.
  deleteBtnDisabled: {opacity: 0.5},
  appleBtn: {
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
  appleBtnDisabled: {opacity: 0.6},
  appleLabel: {color: '#FFFFFF', fontSize: 16, fontWeight: '500', lineHeight: 20},
  deleteText: {fontFamily: 'Runda-Medium', fontSize: 12, color: '#FFFFFF'},
  cancelBtn: {
    height: 40,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: DARK_BLUE,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {fontFamily: 'Runda-Medium', fontSize: 12, color: DARK_BLUE},
});

export default ConfirmDeleteScreen;
