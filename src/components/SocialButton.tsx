/* eslint-disable prettier/prettier */
import React from 'react';
import {TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform} from 'react-native';
import Svg, {Path, G, Defs, ClipPath, Rect} from 'react-native-svg';

// Outlined full-width "Continue with …" button (Google / LinkedIn) per Figma.
// Apple uses the official AppleButton (AppleSignInButton).

export const GoogleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <G clipPath="url(#clip0_5733_69595)">
      <Path d="M8.99996 3.5625C10.3275 3.5625 11.5162 4.02 12.4537 4.9125L15.0225 2.34375C13.4625 0.8925 11.4262 0 8.99996 0C5.48246 0 2.44121 2.0175 0.959961 4.9575L3.95246 7.27875C4.66121 5.145 6.65246 3.5625 8.99996 3.5625Z" fill="#EA4335" />
      <Path d="M17.6175 9.20625C17.6175 8.6175 17.5612 8.0475 17.475 7.5H9V10.8825H13.8525C13.635 11.9925 13.005 12.9375 12.06 13.575L14.9588 15.825C16.65 14.2575 17.6175 11.94 17.6175 9.20625Z" fill="#4285F4" />
      <Path d="M3.94875 10.7213C3.76875 10.1775 3.66375 9.60002 3.66375 9.00002C3.66375 8.40002 3.765 7.82252 3.94875 7.27877L0.95625 4.95752C0.345 6.17252 0 7.54502 0 9.00002C0 10.455 0.345 11.8275 0.96 13.0425L3.94875 10.7213Z" fill="#FBBC05" />
      <Path d="M9.00005 18C11.43 18 13.4738 17.2013 14.9588 15.8213L12.06 13.5713C11.2538 14.115 10.215 14.4338 9.00005 14.4338C6.65255 14.4338 4.6613 12.8513 3.9488 10.7175L0.956299 13.0388C2.4413 15.9825 5.48255 18 9.00005 18Z" fill="#34A853" />
    </G>
    <Defs>
      <ClipPath id="clip0_5733_69595">
        <Rect width={18} height={18} fill="white" />
      </ClipPath>
    </Defs>
  </Svg>
);

export const LinkedInSquareIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path
      d="M15.3353 15.339H12.6698V11.1623C12.6698 10.1663 12.6495 8.8845 11.2808 8.8845C9.891 8.8845 9.67875 9.96825 9.67875 11.0887V15.339H7.01325V6.75H9.57375V7.92075H9.60825C9.966 7.24575 10.836 6.53325 12.1357 6.53325C14.8365 6.53325 15.336 8.31075 15.336 10.6245L15.3353 15.339ZM4.00275 5.57475C3.14475 5.57475 2.4555 4.88025 2.4555 4.026C2.4555 3.1725 3.1455 2.47875 4.00275 2.47875C4.85775 2.47875 5.55075 3.1725 5.55075 4.026C5.55075 4.88025 4.857 5.57475 4.00275 5.57475ZM5.33925 15.339H2.66625V6.75H5.33925V15.339ZM16.6688 0H1.32825C0.594 0 0 0.5805 0 1.29675V16.7033C0 17.4202 0.594 18 1.32825 18H16.6665C17.4 18 18 17.4202 18 16.7033V1.29675C18 0.5805 17.4 0 16.6665 0H16.6688Z"
      fill="#0A66C2"
    />
  </Svg>
);

interface Props {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const SocialButton = ({label, icon, onPress, loading, disabled}: Props) => (
  <TouchableOpacity
    style={[styles.btn, disabled && styles.disabled]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel={label}>
    {loading ? (
      <ActivityIndicator color="#0A66C2" size="small" />
    ) : (
      <>
        {icon}
        <Text style={styles.label}>{label}</Text>
      </>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    alignSelf: 'stretch',
    height: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#747775',
    backgroundColor: '#FFFFFF',
  },
  disabled: {opacity: 0.6},
  // Roboto isn't bundled; Android's system font is Roboto, iOS falls back to
  // the system font.
  label: {
    color: '#1F1F1F',
    fontFamily: Platform.select({android: 'Roboto', default: undefined}),
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});

export default SocialButton;
