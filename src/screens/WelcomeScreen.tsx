/* eslint-disable prettier/prettier */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
// Real per-device top inset — replaces the old `StatusBar.currentHeight || 0`
// guess, which is always 0 on iOS (masking the bug there entirely) and only
// ever covered the status bar height on Android, not notches/cutouts.
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

const {width, height} = Dimensions.get('window');
// Figma: logo 509x509 on 390px wide screen, left offset -20px, bottom offset -87px
const LOGO_SIZE = (509 / 390) * width;
const LOGO_LEFT = (-20 / 390) * width;
const LOGO_BOTTOM = (-87 / 844) * height;

const WelcomeScreen = ({navigation}: any) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      {/* White status bar backing — real device inset now, not the old
          Android-only StatusBar.currentHeight guess. */}
      <View style={[styles.topWhite, {height: insets.top}]} />

      <LinearGradient
        colors={['#005AB4', '#E257E4']}
        start={{x: 0.5, y: 0}}
        end={{x: 0.5, y: 1}}
        style={styles.gradient}>

        {/* Text content */}
        <View style={styles.textContainer}>
          <Text style={styles.welcomeText}>{'Welcome to'}</Text>
          <Text style={styles.heading}>{"IPM's Global\nCommunity"}</Text>
          <Text style={styles.subheading}>{"Let's set up your profile."}</Text>

          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => navigation.navigate('ProfileSetup')}
            activeOpacity={0.8}>
            <Text style={styles.arrowText}>{'›'}</Text>
          </TouchableOpacity>
        </View>

        {/* Logo — exact Figma position */}
        <View style={[styles.logoContainer, {left: LOGO_LEFT, bottom: LOGO_BOTTOM}]}>
          <Image
            source={require('../assets/images/ipmlogowelcomescreen.png')}
            style={[styles.logo, {width: LOGO_SIZE, height: LOGO_SIZE}]}
            resizeMode="contain"
          />
        </View>
      </LinearGradient>

      {/* White bottom area */}
      <View style={styles.bottomWhite} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#FFFFFF'},
  // height is set inline above using the real safe-area top inset.
  topWhite: {backgroundColor: '#FFFFFF'},
  bottomWhite: {height: 24, backgroundColor: '#FFFFFF'},
  gradient: {flex: 1},

  textContainer: {
    paddingHorizontal: 30,
    paddingTop: 52,
    zIndex: 2,
  },

  welcomeText: {
    fontFamily: 'Runda-Bold',
    fontSize: 33.743,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.337,
    marginBottom: 2,
  },

  heading: {
    fontFamily: 'Runda-Bold',
    fontSize: 44.991,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 50.614,
    marginBottom: 14,
  },

  subheading: {
    fontFamily: 'Runda',
    fontSize: 20.144,
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: 25.18,
    marginBottom: 32,
  },

  arrowButton: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {color: '#FFFFFF', fontSize: 24, fontWeight: '300'},

  // Position set dynamically above
  logoContainer: {position: 'absolute'},
  logo: {},
});

export default WelcomeScreen;
