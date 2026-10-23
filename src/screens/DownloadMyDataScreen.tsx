/* eslint-disable prettier/prettier */
import React, {useEffect, useRef, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator} from 'react-native';
import Svg, {Path, Circle} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import BackButton from '../components/BackButton';
import {getStoredUser, requestDataExport} from '../api/authApi';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const NAVY = '#192546'; // --IPM-Color-Palette-Navy-Blue
const DARK_BLUE = '#0C4D91'; // --IPM-Color-Palette-Dark-Blue
const LIGHT_BLUE = '#46B0E3'; // --IPM-Color-Palette-Light-Blue
const GREY = '#8F9098'; // --Neutral-Dark-Lightest
const SUCCESS = '#3BBB06'; // --Support-Success-Dark
// TODO: confirm exact blue-banner tokens from Figma (same as DeleteAccountScreen).
const INFO_BG = '#EEF8FD';
const INFO_BORDER = '#8FD0F0';

const TOAST_DURATION = 3000;

// ─── Icons (rebuilt without <mask>; react-native-svg@15.3.0 doesn't render it) ─
const InfoIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx="8.0013" cy="8.00033" r="7.33333" fill={LIGHT_BLUE} />
    <Path fillRule="evenodd" clipRule="evenodd" d="M6.42267 7.20901C6.42267 6.84082 6.72115 6.54235 7.08934 6.54235H8.00053C8.36872 6.54235 8.6672 6.84082 8.6672 7.20901V10.3135H9.47111C9.8393 10.3135 10.1378 10.612 10.1378 10.9802C10.1378 11.3484 9.8393 11.6469 9.47111 11.6469H6.52995C6.16176 11.6469 5.86328 11.3484 5.86328 10.9802C5.86328 10.612 6.16176 10.3135 6.52995 10.3135H7.33386V7.87568H7.08934C6.72115 7.87568 6.42267 7.5772 6.42267 7.20901Z" fill="#FFFFFF" />
    <Path d="M8.82227 5.22584C8.82227 5.70761 8.43172 6.09816 7.94995 6.09816C7.46818 6.09816 7.07763 5.70761 7.07763 5.22584C7.07763 4.74407 7.46818 4.35352 7.94995 4.35352C8.43172 4.35352 8.82227 4.74407 8.82227 5.22584Z" fill="#FFFFFF" />
  </Svg>
);

const SuccessIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx="7.99935" cy="8.00033" r="7.33333" fill={SUCCESS} />
    <Path d="M11.1953 5.88721C10.9358 5.60771 10.5056 5.60336 10.2409 5.87828L7.26103 8.97425L5.7609 7.41571C5.49628 7.14078 5.06609 7.14513 4.80659 7.42463C4.55354 7.69719 4.55703 8.13067 4.81503 8.39871L7.26103 10.94L11.1868 6.86129C11.4448 6.59324 11.4483 6.15976 11.1953 5.88721Z" fill="#FFFFFF" />
  </Svg>
);

const DownloadMyDataScreen = ({navigation}: any) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const user = await getStoredUser();
      setEmail(user?.email || '');
    })();
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const handleRequest = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // POST /custom/v1/account/data-export (WordPress personal-data request;
      // the backend emails the member a confirmation link).
      const result = await requestDataExport();
      if (result.alreadyRequested) {
        Alert.alert(
          'Request already sent',
          result.status === 'completed'
            ? 'Your data export is ready. Check your email for the download link, or send a new request from the website.'
            : `You already have a data request in progress${
                result.maskedEmail ? ` for ${result.maskedEmail}` : ''
              }. Check your email for the confirmation link.`,
        );
        return;
      }
      setToastVisible(true);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastVisible(false), TOAST_DURATION);
    } catch (err: any) {
      Alert.alert('Request failed', err?.message || 'Could not send your data request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS = [
    'Tap Request My Data.',
    `Confirm the request from the email we send to ${email || 'your email'}.`,
    "We'll email you a secure download link when your file is ready.",
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <BackButton style={styles.backBtn} onPress={() => navigation?.goBack()} />

        <Text style={styles.pageTitle}>{'Download My Data'}</Text>

        <Text style={styles.bodyM}>
          {'Request a copy of the personal data IPM Hub holds about you, including your profile, activity and learning records.'}
        </Text>

        {/* ── How it works ── */}
        <Text style={styles.h3}>{'How it works'}</Text>
        {/* Figma renders this list in a fallback (Inter-like) font, about 7%
            wider than Runda, so it uses the system font here (Inter isn't
            bundled). Switch to styles.bodyM for Runda if the design is updated. */}
        <Text style={styles.stepsText}>
          {STEPS.map((step, i) => `${i + 1}. ${step}`).join('\n')}
        </Text>

        {/* ── Info banner ── */}
        <View style={styles.infoBanner}>
          <InfoIcon />
          <View style={styles.bannerText}>
            <Text style={styles.h4}>{'Download links expire'}</Text>
            <Text style={styles.bodyS}>{'If your link expires, simply send a new request.'}</Text>
          </View>
        </View>

        {/* ── Actions ── */}
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.requestBtn} onPress={handleRequest} disabled={submitting} activeOpacity={0.85}>
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.requestText}>{'Request My Data'}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation?.goBack()} activeOpacity={0.85}>
            <Text style={styles.cancelText}>{'Cancel'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{height: 80}} />
      </ScrollView>

      {/* ── Toast ── */}
      {toastVisible && (
        <View style={styles.toast} pointerEvents="none">
          <SuccessIcon />
          <Text style={styles.toastText}>{'Request sent. Check your email to confirm it.'}</Text>
        </View>
      )}

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
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
  // Numbered steps — system font (see note above); same size/colour as Body M.
  stepsText: {
    fontSize: 14,
    lineHeight: 18,
    color: NAVY,
  },
  // Heading/H3
  h3: {
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.08,
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
    color: NAVY,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    padding: 16,
    gap: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: INFO_BORDER,
    backgroundColor: INFO_BG,
  },
  bannerText: {flex: 1, gap: 4},
  buttons: {alignSelf: 'stretch', gap: 12},
  requestBtn: {
    height: 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 50,
    backgroundColor: DARK_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestText: {fontFamily: 'Runda-Medium', fontSize: 12, color: '#FFFFFF'},
  cancelBtn: {
    height: 40,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: DARK_BLUE,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {fontFamily: 'Runda-Medium', fontSize: 12, color: DARK_BLUE},
  // Toast spec: padding 12/16, gap 8, radius 5, Navy, soft shadow.
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    borderRadius: 5,
    backgroundColor: NAVY,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 9.418,
    elevation: 6,
  },
  toastText: {
    flex: 1,
    fontFamily: 'Runda-Normal',
    fontSize: 14,
    lineHeight: 18,
    color: '#FFFFFF',
  },
});

export default DownloadMyDataScreen;
