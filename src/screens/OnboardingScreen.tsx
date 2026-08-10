/* eslint-disable prettier/prettier */
import React, {useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  FlatList,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgGrad,
  Stop,
  Path,
} from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

const {width: W, height: H} = Dimensions.get('window');
const STATUS_H = 0; // status bar is not translucent — layout starts below it
const TOP_H = Math.round(H * 0.57);
const LOGO_TOP = 12;
const LOGO_H = 46;
const LOGO_W = 116;
const IMAGE_TOP = LOGO_TOP + LOGO_H + 4;
const IMAGE_AREA_H = TOP_H - IMAGE_TOP;

// ─── Slide 2 image (Figma dev-mode spec) ─────────────────────────────────────
// CSS: width 335px, height 334px, aspect-ratio 335/334,
//      background: url(...) lightgray 0px 0px / 133.433% 129.042% no-repeat;
// This is NOT a "contain" fit — the visible box shows the source image at
// 133.433%×129.042% of the box size (≈447×431 relative to a 335×334 box),
// anchored top-left (0,0), with the right/bottom overflow clipped off.
//
// Rather than scaling off a guessed/fixed Figma frame width (which can end
// up taller than the actual space available on a given device and overflow
// past the purple section), we fit the 335:334 box into whatever space is
// actually available (contain-style), then scale the inner image by the
// exact same factor. Because both box and image scale together, the crop
// ratio (133.433%/129.042%) stays identical regardless of device size.
const SLIDE2_ASPECT = 335 / 334; // width / height
let SLIDE2_BOX_W = W;
let SLIDE2_BOX_H = SLIDE2_BOX_W / SLIDE2_ASPECT;
if (SLIDE2_BOX_H > IMAGE_AREA_H) {
  SLIDE2_BOX_H = IMAGE_AREA_H;
  SLIDE2_BOX_W = SLIDE2_BOX_H * SLIDE2_ASPECT;
}
const SLIDE2_SCALE_X = 447 / 335; // 133.433%
const SLIDE2_SCALE_Y = 431 / 334; // 129.042%
const SLIDE2_IMG_W = SLIDE2_BOX_W * SLIDE2_SCALE_X;
const SLIDE2_IMG_H = SLIDE2_BOX_H * SLIDE2_SCALE_Y;

// ─── Gradient "IPM Hub" text ─────────────────────────────────────────────────
// Figma: linear-gradient(267deg, #E257E4 8.04%, #005AB4 54.07%)
// Rendered inline next to plain text using MaskedView
const GradientText = ({text, style}: {text: string; style?: any}) => (
  <MaskedView
    style={{height: 32}}
    maskElement={
      <View style={{backgroundColor: 'transparent'}}>
        <Text style={[style, {color: '#000'}]}>{text}</Text>
      </View>
    }>
    <LinearGradient
      colors={['#E257E4', '#005AB4']}
      start={{x: 1, y: 0}}
      end={{x: 0, y: 0}}>
      <Text style={[style, {opacity: 0}]}>{text}</Text>
    </LinearGradient>
  </MaskedView>
);

// ─── Diamond gradient background ─────────────────────────────────────────────
// Figma exports this as 4 rotated rectangles with a shared linearGradient.
// The CSS equivalent is 4 corner-to-center gradients, each in a 50%×50% quadrant.
// In SVG we reproduce this with 4 triangles (TL, TR, BL, BR) each filled with
// a gradient running from the respective corner (purple) to the center (navy).
//
// Figma gradient stops (from SVG export):
//   0%      → #C257DE  (bright purple)
//   26.96%  → #7758CE  (mid purple)
//   72.96%  → #0C4D91  (deep blue)
//   99.52%  → #192546  (dark navy)
//   100%    → #192546
//
// We draw 4 triangles meeting at center (W/2, TOP_H/2).
// Each triangle's gradient goes FROM that corner TOWARD center.

const DiamondBG = () => {
  const w = W;
  const h = TOP_H;
  const cx = w / 2;
  const cy = h / 2;

  // Figma CSS for Diamond 01 gradient:
  // 4 corner gradients each covering exactly 50%×50% of their quadrant — no overlap.
  // Stops (corner→center): #C257DE 0% → #7758CE 13% → #0C4D91 36% → #192546 50%
  // At 50% the gradient reaches center color, so center seam is always #192546.
  //
  // Each quadrant is a rect covering exactly one corner of the full area.
  // Gradient direction points FROM corner TOWARD center.

  // TL quadrant (0,0 → cx,cy): gradient goes top-left → bottom-right (toward center)
  const dTL = `M0,0 L${cx},0 L${cx},${cy} L0,${cy} Z`;
  // TR quadrant (cx,0 → w,cy): gradient goes top-right → bottom-left (toward center)
  const dTR = `M${cx},0 L${w},0 L${w},${cy} L${cx},${cy} Z`;
  // BL quadrant (0,cy → cx,h): gradient goes bottom-left → top-right (toward center)
  const dBL = `M0,${cy} L${cx},${cy} L${cx},${h} L0,${h} Z`;
  // BR quadrant (cx,cy → w,h): gradient goes bottom-right → top-left (toward center)
  const dBR = `M${cx},${cy} L${w},${cy} L${w},${h} L${cx},${h} Z`;

  // Figma stop positions (in the 0→50% space where 50% = center = #192546):
  // 0%=0.0, 13%=0.26, 36%=0.72, 50%=1.0 (normalized within each quadrant's distance)
  // These match: #C257DE(0%) #7758CE(13/50=26%) #0C4D91(36/50=72%) #192546(100%)

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={StyleSheet.absoluteFillObject}>
      <Defs>
        <SvgGrad id="qTL" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
          <Stop offset="0"    stopColor="#C257DE" />
          <Stop offset="0.26" stopColor="#7758CE" />
          <Stop offset="0.72" stopColor="#0C4D91" />
          <Stop offset="1"    stopColor="#192546" />
        </SvgGrad>
        <SvgGrad id="qTR" x1="1" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <Stop offset="0"    stopColor="#C257DE" />
          <Stop offset="0.26" stopColor="#7758CE" />
          <Stop offset="0.72" stopColor="#0C4D91" />
          <Stop offset="1"    stopColor="#192546" />
        </SvgGrad>
        <SvgGrad id="qBL" x1="0" y1="1" x2="1" y2="0" gradientUnits="objectBoundingBox">
          <Stop offset="0"    stopColor="#C257DE" />
          <Stop offset="0.26" stopColor="#7758CE" />
          <Stop offset="0.72" stopColor="#0C4D91" />
          <Stop offset="1"    stopColor="#192546" />
        </SvgGrad>
        <SvgGrad id="qBR" x1="1" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
          <Stop offset="0"    stopColor="#C257DE" />
          <Stop offset="0.26" stopColor="#7758CE" />
          <Stop offset="0.72" stopColor="#0C4D91" />
          <Stop offset="1"    stopColor="#192546" />
        </SvgGrad>
      </Defs>
      <Path d={dTL} fill="url(#qTL)" />
      <Path d={dTR} fill="url(#qTR)" />
      <Path d={dBL} fill="url(#qBL)" />
      <Path d={dBR} fill="url(#qBR)" />
    </Svg>
  );
};

// ─── Slide config ─────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: '1',
    preTitle: 'Welcome to ',
    gradientTitle: 'IPM Hub',
    subtitle: 'Your gateway to continuous growth and success in project management.',
    image: require('../assets/images/onboarding1.png'),
    imageAlign: 'flex-end' as const,
    // Slide 1: phone mockup — full width, sits at bottom, 85% height
    imageWidth: W,
    imageHeight: W * 0.9,
    isLast: false,
  },
  {
    id: '2',
    plainTitle: 'Everything you need to grow',
    subtitle: 'Connect with professionals and access resources to grow in project management.',
    image: require('../assets/images/onboarding2.png'),
    imageAlign: 'center' as const,
    // Slide 2: globe — Figma 447×431 ratio, fills full width
    imageWidth: W,
    imageHeight: W * (431 / 447),
    isLast: false,
  },
  {
    id: '3',
    plainTitle: 'Start your journey with IPM',
    subtitle: 'Join a global community of professionals and unlock your full potential',
    image: require('../assets/images/onboarding3.png'),
    imageAlign: 'center' as const,
    // Slide 3: cards — Figma 350×502, portrait, fits inside image area height
    imageWidth: IMAGE_AREA_H * (350 / 502),
    imageHeight: IMAGE_AREA_H,
    isLast: true,
  },
];

// ─── Dot indicator ────────────────────────────────────────────────────────────
const Dots = ({count, active}: {count: number; active: number}) => (
  <View style={s.dotsRow}>
    {Array.from({length: count}).map((_, i) => (
      <View key={i} style={[s.dot, i === active && s.dotActive]} />
    ))}
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────
const OnboardingScreen = ({navigation}: any) => {
  const [active, setActive] = useState(0);
  const ref = useRef<FlatList>(null);
  const slide = SLIDES[active];

  const goNext = () => {
    if (active < SLIDES.length - 1) {
      ref.current?.scrollToIndex({index: active + 1, animated: true});
      setActive(active + 1);
    } else {
      navigation.replace('SignUp');
    }
  };

  return (
    <View style={s.root}>
      {/* White status bar with dark icons — matches Figma */}
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />

      {/* ── TOP COLORED SECTION ── */}
      <View style={s.topSection}>
        {/* Full-bleed diamond gradient background */}
        <DiamondBG />

        {/* IPM Logo — positioned below status bar */}
        <View style={s.logoWrap}>
          <Image
            source={require('../assets/images/ipmlogowhite2.png')}
            style={s.logo}
            resizeMode="contain"
          />
        </View>

        {/* Illustration carousel */}
        <FlatList
          ref={ref}
          data={SLIDES}
          horizontal
          pagingEnabled
          scrollEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          style={s.flatList}
          onMomentumScrollEnd={e => {
            setActive(Math.round(e.nativeEvent.contentOffset.x / W));
          }}
          renderItem={({item}) => (
            <View
              style={[
                s.imageSlide,
                {
                  justifyContent:
                    item.imageAlign === 'flex-end' ? 'flex-end' : 'center',
                },
              ]}>
              {item.id === '2' ? (
                <View style={s.slide2Box} collapsable={false}>
                  <Image
                    source={item.image}
                    style={s.slide2Img}
                    resizeMode="stretch"
                  />
                </View>
              ) : (
                <Image
                  source={item.image}
                  style={{width: item.imageWidth, height: item.imageHeight}}
                  resizeMode="contain"
                />
              )}
            </View>
          )}
        />
      </View>

      {/* ── BOTTOM WHITE SECTION ── */}
      <View style={s.bottomSection}>
        {/* Dots */}
        <Dots count={SLIDES.length} active={active} />

        {/* Heading */}
        <View style={s.headingWrap}>
          {slide.gradientTitle ? (
            <View style={s.headingRow}>
              <Text style={s.heading}>{slide.preTitle}</Text>
              <GradientText text={slide.gradientTitle} style={s.heading} />
            </View>
          ) : (
            <Text style={s.heading}>{(slide as any).plainTitle}</Text>
          )}
        </View>

        {/* Description */}
        <Text style={s.subtitle}>{slide.subtitle}</Text>

        <View style={{flex: 1}} />

        {/* CTA */}
        {slide.isLast ? (
          <>
            <TouchableOpacity
              style={s.signUpWrap}
              onPress={() => navigation.replace('SignUp')}
              activeOpacity={0.88}>
              <LinearGradient
                colors={['#084D92', '#B033D0', '#E257E4']}
                locations={[0, 0.55, 1]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={s.signUpBtn}>
                <Text style={s.signUpText}>Sign Up For Free</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.replace('SignIn')}
              style={s.signInLinkWrap}>
              <Text style={s.signInLinkText}>
                Already a member?{' '}
                <Text style={s.signInBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={goNext}
            style={s.continueWrap}
            activeOpacity={0.88}>
            <LinearGradient
              colors={['#0C2D6B', '#163580']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={s.continueBtn}>
              <Text style={s.continueText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Top illustration panel — extends to top of screen (under status bar)
  topSection: {
    height: TOP_H,
    overflow: 'hidden',
  },

  // Logo: 116×46, positioned below status bar
  logoWrap: {
    position: 'absolute',
    top: LOGO_TOP,
    left: 20,
    zIndex: 20,
  },
  logo: {
    width: LOGO_W,
    height: LOGO_H,
  },

  // FlatList starts below the logo
  flatList: {
    position: 'absolute',
    top: IMAGE_TOP,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imageSlide: {
    width: W,
    height: IMAGE_AREA_H,
    alignItems: 'center',
    overflow: 'hidden',
  },

  // Slide 2: fixed 335×334 clip box, image shown at native size (447×431)
  // anchored top-left — matches Figma background-size/position spec exactly.
  slide2Box: {
    width: SLIDE2_BOX_W,
    height: SLIDE2_BOX_H,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  slide2Img: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SLIDE2_IMG_W,
    height: SLIDE2_IMG_H,
  },

  // ── White content section ──
  bottomSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    alignItems: 'flex-start',
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0D5E8',
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#192546',
  },

  // Heading: Runda 28/900, #192546, lh 32
  headingWrap: {
    marginBottom: 8,
    width: '100%',
  },
  headingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  heading: {
    fontFamily: 'Runda',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
    color: '#192546',
    includeFontPadding: false,
  },

  // Body: Runda 16/400, #71727A, lh 20
  subtitle: {
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '400',
    color: '#71727A',
    lineHeight: 20,
    width: '100%',
  },

  // Continue button (slides 1+2)
  continueWrap: {
    width: '100%',
    borderRadius: 100,
    overflow: 'hidden',
  },
  continueBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  continueText: {
    fontFamily: 'Runda',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Sign Up button (slide 3)
  signUpWrap: {
    width: '100%',
    height: 52,
    borderRadius: 100,
    overflow: 'hidden',
    marginBottom: 16,
  },
  signUpBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  signUpText: {
    fontFamily: 'Runda',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Sign In link (slide 3)
  signInLinkWrap: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  signInLinkText: {
    fontFamily: 'Runda',
    fontSize: 14,
    color: '#71727A',
  },
  signInBold: {
    fontFamily: 'Runda',
    color: '#192546',
    fontWeight: '700',
  },
});

export default OnboardingScreen;
