/* eslint-disable prettier/prettier */
import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Image, Linking} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {getStoredUser} from '../api/authApi';

// Final step of the delete-account flow. One layout, two variants:
//   navigation.navigate('DeleteAccountResult', {variant: 'scheduled', email})
//   navigation.navigate('DeleteAccountResult', {variant: 'deleted', email})
// `email` is optional (falls back to the stored user), `until` is optional for
// 'scheduled' (e.g. "8 Nov 2026"; defaults to 30 days from today).

// ─── Tokens ───────────────────────────────────────────────────────────────────
const NAVY = '#192546';
const DARK_BLUE = '#0C4D91';
const LIGHT_BLUE = '#46B0E3';
const SUCCESS = '#3BBB06'; // --Support-Success-Dark
const BODY_GREY = '#71727A';
// TODO: confirm halo colour from Figma.
const HALO = '#EEF0F5';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const thirtyDaysFromNow = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// ─── Success tick (same Figma path as ForgotPasswordScreen) ───────────────────
const SuccessTick = ({size = 28}: {size?: number}) => (
  <Svg width={size} height={size} viewBox="0 0 45 45" fill="none">
    <Path
      d="M22.5 0C10.0737 0 0 10.0737 0 22.5C0 34.927 10.0737 45 22.5 45C34.927 45 45 34.927 45 22.5C45 10.0737 34.927 0 22.5 0ZM22.5 42.2318C11.6445 42.2318 2.8125 33.3555 2.8125 22.4999C2.8125 11.6444 11.6445 2.81241 22.5 2.81241C33.3555 2.81241 42.1875 11.6444 42.1875 22.4999C42.1875 33.3554 33.3555 42.2318 22.5 42.2318ZM31.4796 14.2671L18.2784 27.5512L12.3335 21.6063C11.7843 21.0572 10.8942 21.0572 10.3443 21.6063C9.79519 22.1555 9.79519 23.0456 10.3443 23.5948L17.3046 30.5557C17.8537 31.1041 18.7439 31.1041 19.2937 30.5557C19.357 30.4924 19.4112 30.4235 19.4604 30.3518L33.4695 16.2562C34.0179 15.7071 34.0179 14.8169 33.4695 14.2671C32.9196 13.718 32.0295 13.718 31.4796 14.2671Z"
      fill={SUCCESS}
    />
  </Svg>
);

const DeleteAccountResultScreen = ({navigation, route}: any) => {
  const variant: 'scheduled' | 'deleted' = route?.params?.variant === 'deleted' ? 'deleted' : 'scheduled';
  const [email, setEmail] = useState<string>(route?.params?.email || '');
  const until: string = route?.params?.until || thirtyDaysFromNow();

  useEffect(() => {
    if (email) return;
    (async () => {
      const user = await getStoredUser();
      setEmail(user?.email || '');
    })();
  }, [email]);

  const isScheduled = variant === 'scheduled';

  const title = isScheduled ? 'Account Scheduled for Deletion' : 'Your Account Has Been Deleted';
  const message = isScheduled
    ? `Your account will be permanently deleted on ${until}. Changed your mind? Sign in before then and choose Restore account.`
    : 'Your account and personal data have been permanently deleted. Some records, like invoices, are kept only where the law requires.';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        <Image
          source={require('../assets/images/ipmlogosignup.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Heading/H1 */}
        <Text style={styles.heading}>{title}</Text>

        {/* Body */}
        <Text style={styles.subtitle}>
          {`We've sent a confirmation to\n${email || 'your email'}.`}
        </Text>

        <View style={styles.halo}>
          <SuccessTick />
        </View>

        {/* Body M, Support-Success-Dark */}
        <Text style={styles.message}>{message}</Text>

        <TouchableOpacity
          onPress={() => navigation?.reset?.({index: 0, routes: [{name: 'SignIn'}]})}
          style={styles.backToSignInBtn}
          activeOpacity={0.7}>
          <Text style={styles.backToSignInText}>{'Back to Sign In'}</Text>
        </TouchableOpacity>

        <View style={styles.legalRow}>
          <Text
            style={styles.legalLink}
            onPress={() => Linking.openURL('https://hub.instituteprojectmanagement.com/community-guidelines/')}>
            {'Terms of Service'}
          </Text>
          <Text style={styles.legalAnd}>{' and '}</Text>
          <Text
            style={styles.legalLink}
            onPress={() => Linking.openURL('https://hub.instituteprojectmanagement.com/privacy-policy/')}>
            {'Privacy Policy'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logo: {width: 64, height: 64, marginBottom: 16},
  heading: {
    color: DARK_BLUE,
    textAlign: 'center',
    fontFamily: 'Runda-Bold',
    fontSize: 24,
    letterSpacing: 0.24,
    marginBottom: 6,
  },
  subtitle: {
    color: BODY_GREY,
    textAlign: 'center',
    fontFamily: 'Runda-Normal',
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 24,
  },
  // TODO: confirm halo size/colour from Figma (estimated from the mock).
  halo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: HALO,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  message: {
    color: SUCCESS,
    textAlign: 'center',
    fontFamily: 'Runda-Normal',
    fontSize: 14,
    lineHeight: 18,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  backToSignInBtn: {
    height: 40,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  backToSignInText: {
    color: DARK_BLUE,
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  legalRow: {flexDirection: 'row', justifyContent: 'center', marginTop: 4},
  // Action/Action M
  legalLink: {
    color: LIGHT_BLUE,
    textAlign: 'center',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  legalAnd: {
    color: BODY_GREY,
    fontFamily: 'Runda-Normal',
    fontSize: 12,
  },
});

export default DeleteAccountResultScreen;
