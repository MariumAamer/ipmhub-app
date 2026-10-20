/* eslint-disable prettier/prettier */
/**
 * SuccessToast — navy bottom toast with a green check, per Figma
 * ("Verification email sent. Check your inbox.").
 *
 * Rendered as a plain in-screen overlay (not a native <Modal>), same
 * reasoning as LogoutConfirmDialog. Mount it as the LAST child of a
 * full-screen container so it sits above siblings.
 *
 * Usage:
 *   const [toast, setToast] = useState(false);
 *   ...
 *   <SuccessToast
 *     visible={toast}
 *     message="Verification email sent. Check your inbox."
 *     onHide={() => setToast(false)}
 *   />
 *
 * Auto-hides after `duration` ms (default 3000) and calls onHide.
 * `gap` is avoided on purpose (unreliable on Android/Hermes) — spacing is
 * done with margins to match the Figma gap of 8.
 */

import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, Path} from 'react-native-svg';

const NAVY = '#192546';

// Figma: 16x16 green circle (#3BBB06) with a white tick.
const CheckIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx={7.9974} cy={8.00008} r={7.33333} fill="#3BBB06" />
    <Path
      d="M11.1933 5.88769C10.9338 5.60819 10.5036 5.60384 10.239 5.87877L7.25907 8.97474L5.75895 7.4162C5.49433 7.14127 5.06414 7.14562 4.80464 7.42512C4.55159 7.69768 4.55508 8.13115 4.81308 8.3992L7.25907 10.9405L11.1849 6.86177C11.4429 6.59373 11.4464 6.16025 11.1933 5.88769Z"
      fill="#FFFFFF"
    />
  </Svg>
);

interface SuccessToastProps {
  visible: boolean;
  message: string;
  onHide?: () => void;
  duration?: number;
  /** Distance from the bottom edge. Default 24. Ignored when `inline`. */
  bottomOffset?: number;
  /**
   * Render in normal layout flow (full width of its parent) instead of
   * floating at the bottom of the screen. The parent should reserve the
   * height (~44) so content doesn't jump when the toast appears.
   */
  inline?: boolean;
}

const SuccessToast = ({
  visible,
  message,
  onHide,
  duration = 3000,
  bottomOffset = 24,
  inline = false,
}: SuccessToastProps) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      return;
    }
    const anim = Animated.sequence([
      Animated.timing(opacity, {toValue: 1, duration: 200, useNativeDriver: true}),
      Animated.delay(duration),
      Animated.timing(opacity, {toValue: 0, duration: 300, useNativeDriver: true}),
    ]);
    anim.start(({finished}) => {
      if (finished) onHideRef.current?.();
    });
    return () => anim.stop();
  }, [visible, duration, opacity]);

  if (!visible) return null;

  const body = (
    <Animated.View style={[s.toast, {opacity}]}>
      <View style={s.icon}>
        <CheckIcon />
      </View>
      <Text style={s.text}>{message}</Text>
    </Animated.View>
  );

  if (inline) {
    return (
      <View style={s.inline} pointerEvents="none">
        {body}
      </View>
    );
  }

  return (
    <View style={[s.overlay, {bottom: bottomOffset}]} pointerEvents="none">
      {body}
    </View>
  );
};

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10000,
    elevation: 10000,
  },
  inline: {alignSelf: 'stretch'},
  // padding 12/16; radius 5; navy; shadow 0 0 9.418 -1.712 rgba(0,0,0,.15)
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 5,
    backgroundColor: NAVY,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 10001,
  },
  icon: {width: 16, height: 16, marginRight: 8},
  text: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
});

export default SuccessToast;
