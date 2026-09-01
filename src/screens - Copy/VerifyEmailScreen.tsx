/* eslint-disable prettier/prettier */
import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator, Image, Linking} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import {openInbox} from 'react-native-email-link';
import {forgotPassword} from '../api/authApi';

// ─── Gradient title — 267deg = right-to-left so start x:1 end x:0 ────────────
// Figma: linear-gradient(267deg, #E257E4 19.57%, #005AB4 75.14%)
const GradientTitle = ({text, style}: {text: string; style?: any}) => (
  <MaskedView
    style={{alignSelf: 'stretch'}}
    maskElement={
      <View style={{backgroundColor: 'transparent', alignItems: 'center'}}>
        <Text style={[style, {backgroundColor: 'transparent'}]}>{text}</Text>
      </View>
    }>
    <LinearGradient
      colors={['#E257E4', '#005AB4']}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 0}}
      style={{alignItems: 'center', alignSelf: 'stretch'}}>
      <Text style={[style, {opacity: 0}]}>{text}</Text>
    </LinearGradient>
  </MaskedView>
);

const VerifyEmailScreen = ({route, navigation}: any) => {
  const email = route?.params?.email || '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // ── Deep link handler ──────────────────────────────────────────────────────
  // Handles both:
  // 1. Custom scheme: ipmhub://activate (if Robby sets this up)
  // 2. https: hub.instituteprojectmanagement.com/activate (Android App Links)
  useEffect(() => {
    const handleDeepLink = ({url}: {url: string}) => {
      if (
        url.includes('activate') ||
        url.includes('verify') ||
        url.includes('ipmhub://')
      ) {
        navigation.replace('SignIn', {verified: true});
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // App was closed and opened via link
    Linking.getInitialURL().then(url => {
      if (
        url &&
        (url.includes('activate') ||
          url.includes('verify') ||
          url.includes('ipmhub://'))
      ) {
        navigation.replace('SignIn', {verified: true});
      }
    });

    return () => subscription.remove();
  }, [navigation]);

  // ── Open email app ─────────────────────────────────────────────────────────
  // Previously fell back to Linking.openURL('mailto:'), which Android treats
  // as a "compose a new email" intent — that's why the button was opening a
  // blank draft instead of the inbox. openInbox() launches the mail app's
  // actual inbox screen (via ACTION_MAIN / CATEGORY_APP_EMAIL under the
  // hood), or shows a native chooser if more than one mail app is installed,
  // with no compose screen involved either way.
  const handleOpenEmailApp = () => {
    openInbox().catch(() => {});
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await forgotPassword(email);
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch {
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.inner}>

        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={require('../assets/images/ipmlogoverifyscreen.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Gradient title — Heading/H2 */}
        <GradientTitle text="Check Your Inbox" style={styles.title} />

        <View style={{height: 16}} />

        {/* Body — Body/Body M */}
        <Text style={styles.body}>
          {'Please activate your account by clicking the verification link we\'ve sent to your email.'}
        </Text>

        {/* Email address */}
        {email ? (
          <Text style={styles.emailText}>{email}</Text>
        ) : null}

        <Text style={styles.body}>
          {'If the email doesn\'t appear soon, please check your spam or junk folder.'}
        </Text>

        {/* Resent banner */}
        {resent ? (
          <View style={styles.resentBanner}>
            <Text style={styles.resentText}>{'✓ Verification email resent!'}</Text>
          </View>
        ) : null}

        <View style={{height: 36}} />

        {/* Open Email App */}
        <TouchableOpacity
          style={styles.openEmailBtn}
          onPress={handleOpenEmailApp}
          activeOpacity={0.85}>
          <Text style={styles.openEmailBtnText}>{'Open Email App'}</Text>
        </TouchableOpacity>

        {/* Resend */}
        <TouchableOpacity
          style={styles.resendRow}
          onPress={handleResend}
          disabled={resending}>
          {resending ? (
            <ActivityIndicator size="small" color="#46B0E3" />
          ) : (
            <Text style={styles.resendText}>{'Resend Email'}</Text>
          )}
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },

  // Logo
  logoWrap: {marginBottom: 32},
  logo: {width: 90, height: 90},

  // Heading/H2 — Runda Bold 18px letterSpacing 0.09
  title: {
    fontFamily: 'Runda-Bold',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Body/Body M — Runda 14px 400 #71727A lh 18
  body: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    color: '#71727A',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  // Email highlight
  emailText: {
    fontFamily: 'Runda-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#0C4D91',
    textAlign: 'center',
    marginBottom: 8,
  },

  // Resent banner
  resentBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    width: '100%',
    alignItems: 'center',
  },
  resentText: {color: '#065F46', fontSize: 13, fontWeight: '600'},

  // Open Email App button
  openEmailBtn: {
    backgroundColor: '#1A3A6B',
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    elevation: 2,
  },
  openEmailBtnText: {
    fontFamily: 'Runda-Bold',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Resend link
  resendRow: {paddingVertical: 8, alignItems: 'center'},
  resendText: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '600',
    color: '#46B0E3',
  },
});

export default VerifyEmailScreen;
