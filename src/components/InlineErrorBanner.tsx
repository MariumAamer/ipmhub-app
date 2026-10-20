/* eslint-disable prettier/prettier */
/**
 * InlineErrorBanner — pink in-form error card with a red "!" icon, title,
 * message, optional action link and a dismiss X, per Figma
 * (Sign In – Incorrect password).
 *
 * Usage:
 *   <InlineErrorBanner
 *     title="Incorrect email or password"
 *     message="Check your details and try again."
 *     actionLabel="Reset password"
 *     onAction={() => navigation.navigate('ForgotPassword')}
 *     onDismiss={() => setCredError(false)}
 *   />
 *
 * `gap` is avoided on purpose (unreliable on Android/Hermes) — spacing is
 * done with margins to match the Figma gap values (12 icon→text, 8 between
 * stacked text rows' spacing handled per row).
 */

import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Svg, {Circle, Line, Path} from 'react-native-svg';

const NAVY = '#192546';
const LIGHT_BLUE = '#46B0E3';

// Figma: 16x16 red circle (#ED3241) with a white "!".
const AlertIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx={8.0013} cy={8.00008} r={7.33333} fill="#ED3241" />
    <Path
      d="M7.63098 4.04008C7.74717 3.98891 7.87276 3.96254 7.99972 3.96265C8.12659 3.96268 8.25207 3.98915 8.36814 4.04038C8.48422 4.09161 8.58834 4.16647 8.67387 4.26018C8.7594 4.3539 8.82445 4.46441 8.86489 4.58467C8.90533 4.70493 8.92025 4.8323 8.90872 4.95865L8.54472 8.96465C8.53057 9.09933 8.46705 9.224 8.36641 9.31462C8.26577 9.40524 8.13514 9.45539 7.99972 9.45539C7.86429 9.45539 7.73367 9.40524 7.63303 9.31462C7.53239 9.224 7.46887 9.09933 7.45472 8.96465L7.08972 4.95865C7.07818 4.83221 7.09313 4.70476 7.13363 4.58443C7.17412 4.4641 7.23927 4.35354 7.32491 4.25981C7.41054 4.16608 7.51479 4.09125 7.63098 4.04008Z"
      fill="#FFFFFF"
    />
    <Circle cx={7.99976} cy={11.1652} r={0.8723} fill="#FFFFFF" />
  </Svg>
);

const CloseIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Line x1={3.5} y1={3.5} x2={12.5} y2={12.5} stroke="#8F9098" strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={12.5} y1={3.5} x2={3.5} y2={12.5} stroke="#8F9098" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

interface InlineErrorBannerProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

const InlineErrorBanner = ({
  title,
  message,
  actionLabel,
  onAction,
  onDismiss,
}: InlineErrorBannerProps) => (
  <View style={s.card}>
    <View style={s.iconWrap}>
      <AlertIcon />
    </View>

    <View style={s.textCol}>
      <Text style={s.title}>{title}</Text>
      {message ? <Text style={s.message}>{message}</Text> : null}
      {actionLabel ? (
        <TouchableOpacity
          style={s.actionBtn}
          onPress={onAction}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Text style={s.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>

    {onDismiss ? (
      <TouchableOpacity
        style={s.closeBtn}
        onPress={onDismiss}
        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        accessibilityLabel="Dismiss">
        <CloseIcon />
      </TouchableOpacity>
    ) : null}
  </View>
);

const s = StyleSheet.create({
  // padding 16; row; radius 5; 1px #FF616D; bg #FFE2E5
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    padding: 16,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#FF616D',
    backgroundColor: '#FFE2E5',
  },
  iconWrap: {marginTop: 2, marginRight: 12},
  textCol: {flex: 1},
  title: {
    color: NAVY,
    fontFamily: 'Runda-Medium',
    fontSize: 14,
  },
  message: {
    marginTop: 4,
    color: NAVY,
    fontFamily: 'Runda-Normal',
    fontSize: 12,
    lineHeight: 16,
  },
  actionBtn: {marginTop: 4, alignSelf: 'flex-start'},
  actionText: {
    color: LIGHT_BLUE,
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  closeBtn: {marginLeft: 12, marginTop: 1},
});

export default InlineErrorBanner;
