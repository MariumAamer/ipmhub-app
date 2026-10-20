/* eslint-disable prettier/prettier */
/**
 * StatusSheet — generic status bottom sheet, per Figma
 * ("Account verified" = success, "Link expired" = error).
 *
 * Rendered as a plain in-screen overlay (not a native <Modal>), same
 * reasoning as LogoutConfirmDialog. Mount it as the LAST child of a
 * full-screen container so it sits above siblings.
 *
 * Usage:
 *   <StatusSheet
 *     visible={show}
 *     variant="error"
 *     headerTitle="Link expired"
 *     title="This link is no longer valid"
 *     message="..."
 *     primaryLabel="Resend link"
 *     onPrimary={handleResend}
 *     secondaryLabel="Back to Sign In"
 *     onSecondary={close}
 *     onClose={close}
 *   />
 *
 * The X and a tap on the dimmed backdrop call onClose. `gap` is avoided on
 * purpose (unreliable on Android/Hermes) — spacing is done with margins.
 */

import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {Circle, Line, Path} from 'react-native-svg';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const NAVY = '#192546';
const DARK_BLUE = '#0C4D91';
const LINK_BLUE = '#1A7FD4';
const SUCCESS = '#3BBB06';
const ERROR = '#ED3241';
const OFFSCREEN = 520;

// Figma: 42x42 circle, white fill, 2px coloured stroke + glyph.
const SuccessIcon = () => (
  <Svg width={42} height={42} viewBox="0 0 42 42" fill="none">
    <Circle cx={21} cy={21} r={20} fill="#FFFFFF" />
    <Path
      d="M12.5 21.5L18 27L29.5 15.5M21 41C32.046 41 41 32.046 41 21C41 9.954 32.046 1 21 1C9.954 1 1 9.954 1 21C1 32.046 9.954 41 21 41Z"
      stroke={SUCCESS}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ErrorIcon = () => (
  <Svg width={42} height={42} viewBox="0 0 42 42" fill="none">
    <Circle cx={21} cy={21} r={20} fill="#FFFFFF" />
    <Path
      d="M21 11.5V23.5M21 30V30.1M21 41C32.046 41 41 32.046 41 21C41 9.954 32.046 1 21 1C9.954 1 1 9.954 1 21C1 32.046 9.954 41 21 41Z"
      stroke={ERROR}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CloseIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Line x1={4} y1={4} x2={16} y2={16} stroke="#C5C6CC" strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={16} y1={4} x2={4} y2={16} stroke="#C5C6CC" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

export interface StatusSheetProps {
  visible: boolean;
  variant: 'success' | 'error';
  headerTitle: string;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
  /** Optional text link under the primary button. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  onClose: () => void;
  /** Disable the primary button + dim it (e.g. while a request is running). */
  primaryDisabled?: boolean;
}

const StatusSheet = ({
  visible,
  variant,
  headerTitle,
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onClose,
  primaryDisabled = false,
}: StatusSheetProps) => {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({finished}) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [OFFSCREEN, 0],
  });

  return (
    <View style={s.overlay}>
      {/* Tapping the dimmed backdrop = dismiss. */}
      <Animated.View style={[s.backdrop, {opacity: progress}]}>
        <TouchableOpacity style={s.fill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          s.sheet,
          {paddingBottom: Math.max(insets.bottom, 16), transform: [{translateY}]},
        ]}>
        {/* Header — title centred, X on the right */}
        <View style={s.header}>
          <Text style={s.headerTitle}>{headerTitle}</Text>
          <TouchableOpacity
            style={s.closeBtn}
            onPress={onClose}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
            accessibilityLabel="Close">
            <CloseIcon />
          </TouchableOpacity>
        </View>

        {/* Body */}
        <View style={s.body}>
          <View style={s.iconCircle}>
            {variant === 'error' ? <ErrorIcon /> : <SuccessIcon />}
          </View>

          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>

          <TouchableOpacity
            style={[s.btn, primaryDisabled && s.btnDisabled]}
            onPress={onPrimary}
            disabled={primaryDisabled}
            activeOpacity={0.85}>
            <Text style={s.btnText}>{primaryLabel}</Text>
          </TouchableOpacity>

          {secondaryLabel ? (
            <TouchableOpacity
              style={s.linkBtn}
              onPress={onSecondary || onClose}
              hitSlop={{top: 8, bottom: 8, left: 12, right: 12}}>
              <Text style={s.linkText}>{secondaryLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    elevation: 10000,
    justifyContent: 'flex-end',
  },
  fill: {flex: 1},
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  sheet: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10001,
  },

  // height 56; title centred; X pinned right; hairline divider below
  header: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E9F1',
  },
  headerTitle: {
    color: DARK_BLUE,
    textAlign: 'center',
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  closeBtn: {position: 'absolute', right: 24, top: 18},

  // padding 24/20; centred column; gap 16
  body: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  // 60x60 circle, #E8E9F1
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 100,
    backgroundColor: '#E8E9F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 16,
    color: NAVY,
    textAlign: 'center',
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  message: {
    marginTop: 16,
    color: NAVY,
    textAlign: 'center',
    fontFamily: 'Runda-Normal',
    fontSize: 14,
    lineHeight: 18,
  },
  btn: {
    alignSelf: 'stretch',
    marginTop: 16,
    height: 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 50,
    backgroundColor: DARK_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {opacity: 0.6},
  btnText: {
    color: '#FFFFFF',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  linkBtn: {marginTop: 16, alignItems: 'center'},
  linkText: {
    color: LINK_BLUE,
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
});

export default StatusSheet;
