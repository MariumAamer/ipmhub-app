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
import Svg, {Rect, Path} from 'react-native-svg';

const {width} = Dimensions.get('window');
// Figma (390px wide frame): logo box 370x388, image drawn at 137.568% x 131.186%
// of the box (= 509x509) anchored top-left and clipped by the box.
const SCALE = width / 390;
const LOGO_BOX_W = 370 * SCALE;
const LOGO_BOX_H = 388 * SCALE;
const LOGO_IMG = 509 * SCALE;
// Figma places the logo box 44px in from the left edge of the 390 frame
// (the box overflows the right edge and is clipped by the screen).
const LOGO_LEFT = 44 * SCALE;

// Figma gradient: linear-gradient(0deg, #E257E4 -23.6%, #005AB4 75.8%).
// Pink starts below the bottom edge, so the visible bottom colour is the
// blend at 0% (#AC58D9) and the blue is solid from 75.8% up (end y = 0.242).
const GRADIENT_COLORS = ['#AC58D9', '#005AB4'];
const GRADIENT_START = {x: 0.5, y: 1};
const GRADIENT_END = {x: 0.5, y: 0.242};

// Figma arrow button: 28x28 outlined rounded square with a chevron.
const ArrowIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
    <Rect
      x={-0.5}
      y={0.5}
      width={27}
      height={27}
      rx={4.5}
      transform="matrix(-1 0 0 1 27 0)"
      stroke="#FFFFFF"
    />
    <Path
      d="M17.5506 12.844C18.1496 13.4425 18.1496 14.4152 17.5506 15.0137L12.7027 19.8625L12 19.1598L16.8479 14.3106C17.0577 14.0999 17.0577 13.7578 16.8479 13.5471L12.0027 8.70284L12.7059 8.00012L17.5506 12.844Z"
      fill="#FFFFFF"
      stroke="#FFFFFF"
      strokeWidth={0.5}
    />
  </Svg>
);

const WelcomeScreen = ({navigation}: any) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* White status bar backing — real device inset now, not the old
          Android-only StatusBar.currentHeight guess. */}
      <View style={[styles.topWhite, {height: insets.top}]} />

      <LinearGradient
        colors={GRADIENT_COLORS}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.gradient}>

        {/* Text content */}
        <View style={styles.textContainer}>
          <Text style={styles.welcomeText}>{'Welcome to'}</Text>
          <Text style={styles.heading}>{"IPM's Global\nCommunity"}</Text>
          <Text style={styles.subheading}>{"Let's set up your profile."}</Text>

          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => navigation.navigate('ProfileSetup')}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            activeOpacity={0.8}>
            <ArrowIcon />
          </TouchableOpacity>
        </View>

        {/* Logo — exact Figma position */}
        <View style={[styles.logoContainer, {left: LOGO_LEFT, width: LOGO_BOX_W, height: LOGO_BOX_H}]}>
          <Image
            source={require('../assets/images/ipmlogowelcomescreen.png')}
            style={{position: 'absolute', top: 0, left: 0, width: LOGO_IMG, height: LOGO_IMG}}
            resizeMode="stretch"
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
    paddingHorizontal: 20,
    paddingTop: 107,
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
    width: 28,
    height: 28,
  },

  // Box is clipped (overflow hidden) so the oversized image crops like Figma.
  logoContainer: {position: 'absolute', bottom: 0, overflow: 'hidden'},
});

export default WelcomeScreen;
