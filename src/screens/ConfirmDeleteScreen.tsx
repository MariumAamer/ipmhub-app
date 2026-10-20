/* eslint-disable prettier/prettier */
import React, {useEffect, useState} from 'react';
import {View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, StatusBar} from 'react-native';
import Svg, {Path, Circle} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import BackButton from '../components/BackButton';
import EyeClosedIcon from '../components/EyeClosedIcon';
import EyeOpenIcon from '../components/EyeOpenIcon';
import SocialButton, {GoogleIcon, LinkedInSquareIcon} from '../components/SocialButton';
import {getStoredUser} from '../api/authApi';

type Provider = 'email' | 'google' | 'linkedin' | 'apple';

const PROVIDER_LABEL: Record<Exclude<Provider, 'email'>, string> = {
  google: 'Google',
  linkedin: 'LinkedIn',
  apple: 'Apple',
};

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
const ConfirmDeleteScreen = ({navigation}: any) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // TODO: set from the delete-account response (e.g. "Incorrect password. Try again or reset it.").
  const [passwordError, setPasswordError] = useState('');
  const [mode, setMode] = useState<DeleteMode>('deactivate');
  const [confirmed, setConfirmed] = useState(false);
  const [provider, setProvider] = useState<Provider>('email');

  useEffect(() => {
    (async () => {
      const user = await getStoredUser();
      setEmail(user?.email || '');
      setProvider((user?.provider as Provider) || 'email');
    })();
  }, []);

  const isSocial = provider !== 'email';
  const providerName = isSocial ? PROVIDER_LABEL[provider as Exclude<Provider, 'email'>] : '';

  const handleDelete = () => {
    setPasswordError('');
    // TODO: call the delete-account endpoint with { password, mode } once shared,
    // set passwordError on a wrong password, and only navigate on success.
    // UI preview only — nothing is deleted yet.
    navigation?.navigate?.('DeleteAccountResult', {
      variant: mode === 'immediate' ? 'deleted' : 'scheduled',
      email,
      // 30 days from the moment the deletion is requested. Replace with the
      // date returned by the backend once the endpoint is wired.
      until: restoreUntil(),
    });
  };

  const handleForgotPassword = () => {
    navigation?.navigate?.('ForgotPassword');
  };

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

        <Text style={styles.bodyM}>
          {isSocial
            ? provider === 'apple'
              ? 'You signed in with Apple. To delete your account, confirm with your Apple ID.'
              : `You signed in with ${providerName}. To delete ${email || 'your account'}, confirm with your ${providerName} account.`
            : `Enter the password for ${email || 'your account'} to delete your account.`}
        </Text>

        {/* ── Password (email sign-in only) ── */}
        {!isSocial && (
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

        {!isSocial && (
          <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7} style={styles.linkWrap}>
            <Text style={styles.actionM}>{'Forgot password?'}</Text>
          </TouchableOpacity>
        )}

        {/* ── How to delete ── */}
        <Text style={styles.h4}>{'How do you want to delete your account?'}</Text>

        <View style={styles.options}>
          <OptionCard
            selected={mode === 'deactivate'}
            title={'Deactivate now, delete in 30 days'}
            body={`You can restore your account until ${restoreUntil()}.`}
            onPress={() => setMode('deactivate')}
          />
          <OptionCard
            selected={mode === 'immediate'}
            title={'Delete immediately'}
            body={'Your account and data are deleted now. This can’t be undone.'}
            onPress={() => setMode('immediate')}
          />
        </View>

        {/* ── Confirmation checkbox ── */}
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setConfirmed(c => !c)}
          activeOpacity={0.8}>
          <View style={[styles.checkBox, confirmed && styles.checkBoxChecked]}>
            {confirmed && <CheckTick />}
          </View>
          <Text style={[styles.actionM, styles.checkLabel]}>
            {"I understand that once my account is permanently deleted, it can't be recovered."}
          </Text>
        </TouchableOpacity>

        {/* ── Actions ── */}
        <View style={styles.buttons}>
          {/* Social sign-in: re-confirm with the provider (disabled until the checkbox is ticked). */}
          {provider === 'google' && (
            <SocialButton label="Continue with Google" icon={<GoogleIcon />} onPress={handleDelete} disabled={!confirmed} />
          )}
          {provider === 'linkedin' && (
            <SocialButton label="Continue with LinkedIn" icon={<LinkedInSquareIcon />} onPress={handleDelete} disabled={!confirmed} />
          )}
          {provider === 'apple' && <AppleConfirmButton onPress={handleDelete} disabled={!confirmed} />}
          {!isSocial && (
            <TouchableOpacity
              style={[styles.deleteBtn, !confirmed && styles.deleteBtnDisabled]}
              onPress={handleDelete}
              disabled={!confirmed}
              activeOpacity={0.85}>
              <Text style={styles.deleteText}>{'Delete Account'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation?.goBack()} activeOpacity={0.85}>
            <Text style={styles.cancelText}>{'Cancel'}</Text>
          </TouchableOpacity>
        </View>

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
