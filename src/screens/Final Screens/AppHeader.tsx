/**
 * AppHeader — shared top bar for Feed, Forums, Intros, Resources, Mentors.
 *
 * Usage:
 *   <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />
 *
 * The caller is responsible for rendering <ProfileDrawer> as a sibling
 * inside its own SafeAreaView so it sits at the correct z-level.
 */

import React, {useEffect, useState} from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import Svg, {Path, Polygon} from 'react-native-svg';
import * as Keychain from 'react-native-keychain';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {apiRequest} from '../api/apiClient';
import {getUserIdFromToken} from '../api/profileApi';
import {getUnreadNotificationCount} from '../api/notificationsApi';
import {getUnreadMessageCount} from '../api/dmApi';

interface AppHeaderProps {
  navigation: any;
  onDrawerOpen?: () => void;
}

const getStoredUser = async () => {
  try {
    const creds = await Keychain.getGenericPassword();
    if (!creds) return null;
    return JSON.parse(creds.password);
  } catch {
    return null;
  }
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const ChevronIcon = () => (
  <Svg width={16} height={15} viewBox="0 0 16 15" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M15.7695 7.50167C15.7695 7.85162 15.5892 8.03823 15.4053 8.22106C15.215 8.40998 15.0533 8.5729 14.8635 8.76265L11.5944 12.0319C10.8567 12.7697 10.1464 13.4799 9.40875 14.2177C9.09969 14.5266 8.68329 15.1267 8.07461 14.9736C7.70496 14.8805 7.02668 14.3272 7.02668 13.7414C7.02668 13.2692 7.33322 13.08 7.5779 12.8354L12.355 8.04766C12.8476 7.40376 12.3454 6.93576 12.0053 6.59567L7.59656 2.18686C7.27661 1.8669 7.02668 1.75242 7.02668 1.18735C7.02668 0.731095 7.71608 0.117171 8.04337 0.0364461C8.6879 -0.122487 9.05776 0.434826 9.38988 0.76695L14.8449 6.22203C15.0346 6.41158 15.1967 6.57429 15.3867 6.76383C15.5766 6.95317 15.7695 7.13873 15.7695 7.50167Z"
      fill="#8F9098"
    />
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.74512 7.42702C8.74512 7.91241 8.66314 7.93862 8.34339 8.25837L2.34659 14.255C2.02999 14.5719 1.6421 15.1634 0.990654 14.9575C0.71326 14.8698 0.00226593 14.2519 0.00226593 13.7413C0.00226593 13.3128 0.327254 13.0614 0.55328 12.8353L4.94337 8.44519C5.2497 8.13886 5.53191 7.97867 5.53191 7.46434C5.53191 7.04855 5.18428 6.79925 4.96203 6.577C4.35608 5.97083 0.437752 2.09878 0.219904 1.82893C-0.144713 1.37793 -0.0235243 0.928594 0.347803 0.561455C0.533571 0.377571 0.68118 0.166849 0.935511 0.0655768C1.60059 -0.199032 1.99938 0.401055 2.32793 0.729614L8.32473 6.72628C8.51029 6.91185 8.74512 7.07371 8.74512 7.42702Z"
      fill="#8F9098"
    />
  </Svg>
);

const EnvelopeIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 30 30" fill="none">
    <Path
      d="M22.625 7.4248C24.2691 7.4248 25.5749 8.79136 25.5752 10.4424V20.2139C25.5752 21.8651 24.2693 23.2314 22.625 23.2314H8.375C6.73071 23.2314 5.4248 21.8651 5.4248 20.2139V10.4424C5.42505 8.79136 6.73087 7.4248 8.375 7.4248H22.625ZM16.8242 16.5156C16.4138 16.7265 15.9604 16.8369 15.5 16.8369C15.0396 16.8369 14.5862 16.7265 14.1758 16.5156L6.5752 12.6064V20.2139C6.5752 21.2609 7.39592 22.082 8.375 22.082H22.625C23.6041 22.082 24.4248 21.2609 24.4248 20.2139V12.6064L16.8242 16.5156ZM8.375 8.5752C7.39607 8.5752 6.57544 9.39553 6.5752 10.4424V11.3145L14.7012 15.4932L14.8916 15.5781C15.0865 15.6507 15.2925 15.6875 15.5 15.6875C15.7765 15.6875 16.0499 15.621 16.2988 15.4932L24.4248 11.3145V10.4424C24.4246 9.39553 23.6039 8.5752 22.625 8.5752H8.375Z"
      fill="#192546"
    />
  </Svg>
);

const BellIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 30 30" fill="none">
    <Path
      d="M17.2139 20.8994C17.5822 20.9736 17.8208 21.3327 17.7471 21.7012C17.477 23.0488 16.217 23.9998 14.7832 24C13.3494 23.9999 12.0885 23.0488 11.8184 21.7012C11.7447 21.3326 11.984 20.9734 12.3525 20.8994C12.7211 20.8257 13.0803 21.0651 13.1543 21.4336C13.2836 22.0783 13.9282 22.6376 14.7832 22.6377C15.6382 22.6375 16.2829 22.0783 16.4121 21.4336C16.4861 21.065 16.8453 20.8257 17.2139 20.8994ZM14.8809 6C18.1587 6 20.8164 8.65766 20.8164 11.9355V15.1943C21.9265 15.4197 22.7616 16.4015 22.7617 17.5781C22.7617 18.9214 21.6733 20.0106 20.3301 20.0107H9.43262C8.08922 20.0107 7 18.9215 7 17.5781C7.00012 16.4014 7.83609 15.4197 8.94629 15.1943V11.9355C8.94629 8.65774 11.6031 6.00012 14.8809 6ZM14.8809 7.3623C12.3554 7.36242 10.3086 9.41004 10.3086 11.9355V15.5127C10.3086 15.9754 9.98179 16.3737 9.52832 16.4658L9.2168 16.5293C8.72897 16.6284 8.36242 17.0621 8.3623 17.5781C8.3623 18.1692 8.84152 18.6484 9.43262 18.6484H20.3301C20.921 18.6482 21.4004 18.1691 21.4004 17.5781C21.4003 17.062 21.0328 16.6283 20.5449 16.5293L20.2334 16.4658C19.78 16.3737 19.4541 15.9754 19.4541 15.5127V11.9355C19.4541 9.40996 17.4064 7.3623 14.8809 7.3623Z"
      fill="#192546"
    />
  </Svg>
);

// Small red count pill overlaid on the envelope/bell icons. Caps the
// displayed label at "99+" so a large count never blows out the badge —
// matches the pattern used for the design's notification badge.
const CountBadge = ({count}: {count: number}) => {
  if (!count || count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText} numberOfLines={1}>
        {count > 99 ? '99+' : String(count)}
      </Text>
    </View>
  );
};

const Logo = () => (
  <Svg width={100} height={41} viewBox="5 321 1070 438">
    <Polygon points="550.63,469.68 538.24,469.68 538.24,400.37 550.63,400.37" fill="#004C96" />
    <Path d="M563.94 469.68l0 -69.31 14.02 0c14.33,38.29 17.09,45.66 17.91,49.04l0.11 0c-0.51,-8.29 -0.62,-18.53 -0.62,-29.89l0 -19.15 11.16 0 0 69.31 -13.52 0c-14.84,-40.85 -17.39,-48.21 -18.32,-51.39l-0.1 0c0.51,8.6 0.51,18.73 0.51,31.22l0 20.17 -11.15 0z" fill="#004C96" />
    <Path d="M627.81 450.33c0.61,5.73 2.97,10.75 9.32,10.75 6.04,0 8.29,-3.79 8.29,-9.01 0,-5.63 -2.77,-9.01 -11.47,-13.1 -11.87,-5.63 -16.58,-10.65 -16.58,-20.99 0,-11.05 7.17,-18.63 19.66,-18.63 15.66,0 19.45,10.54 19.65,19.55l-12.18 0c-0.31,-3.99 -1.33,-9.82 -7.68,-9.82 -4.92,0 -7.07,3.17 -7.07,7.88 0,5.02 2.26,7.37 10.35,11.16 12.38,5.73 18.01,11.26 18.01,22.82 0,10.96 -6.76,19.97 -21.39,19.97 -15.97,0 -20.78,-10.24 -21.2,-20.58l12.29 0z" fill="#004C96" />
    <Polygon points="677.35,411.23 662.51,411.23 662.51,400.38 704.58,400.38 704.58,411.23 689.74,411.23 689.74,469.67 677.35,469.67" fill="#004C96" />
    <Polygon points="724.85,469.68 712.46,469.68 712.46,400.37 724.85,400.37" fill="#004C96" />
    <Polygon points="747.47,411.23 732.63,411.23 732.63,400.38 774.7,400.38 774.7,411.23 759.86,411.23 759.86,469.67 747.47,469.67" fill="#004C96" />
    <Path d="M794.04 400.38l0 47.7c0,5.63 1.43,12.38 9.11,12.38 7.38,0 8.91,-5.62 8.91,-12.28l0 -47.8 12.39 0 0 48.01c0,12.38 -4.81,22.51 -21.5,22.51 -16.48,0 -21.29,-9.51 -21.29,-22.51l0 -48.01 12.38 0z" fill="#004C96" />
    <Polygon points="846.55,411.23 831.71,411.23 831.71,400.38 873.78,400.38 873.78,411.23 858.94,411.23 858.94,469.67 846.55,469.67" fill="#004C96" />
    <Polygon points="916.16,438.87 893.84,438.87 893.84,459.03 918.82,459.03 917.28,469.67 881.66,469.67 881.66,400.38 917.18,400.38 917.18,411.23 893.84,411.23 893.84,428.12 916.16,428.12" fill="#004C96" />
    <Path d="M538.24 505.55l20.79 0c11.46,0 20.06,6.86 20.06,20.68 0,13.31 -7.78,20.47 -20.99,20.47l-7.47 0 0 28.16 -12.39 0 0 -69.31zm12.39 31.23l6.04 0c6.96,0 9.93,-3.49 9.93,-10.75 0,-6.96 -3.58,-10.44 -9.21,-10.44l-6.76 0 0 21.19z" fill="#004C96" />
    <Path d="M600.38 545.27l0 29.59 -12.29 0 0 -69.31 21.19 0c12.59,0 19.76,6.66 19.76,18.94 0,10.03 -5.43,14.33 -9.01,15.76 5.32,2.57 7.88,7.07 7.88,17.31l0 2.76c0,7.88 0.41,10.85 0.93,14.54l-11.98 0c-1.02,-3.18 -1.13,-8.7 -1.13,-14.64l0 -2.46c0,-9.31 -2.14,-12.49 -10.03,-12.49l-5.32 0zm0 -10.03l5.83 0c7.47,0 10.44,-3.17 10.44,-10.13 0,-6.04 -2.86,-9.52 -9.21,-9.52l-7.06 0 0 19.65z" fill="#004C96" />
    <Path d="M682.58 539.74c0,25.29 -6.86,36.34 -22.83,36.34 -14.95,0 -22.22,-10.85 -22.22,-36.54 0,-24.98 8.5,-35.01 22.73,-35.01 15.15,0 22.32,11.16 22.32,35.21zm-32.36 -0.3c0,16.48 2.57,26.2 9.83,26.2 7.68,0 9.83,-9 9.83,-26.2 0,-16.07 -2.35,-24.47 -9.83,-24.47 -7.47,0 -9.83,9.01 -9.83,24.47z" fill="#004C96" />
    <Path d="M709.91 556.64c0,11.46 -2.77,19.14 -16.59,19.14 -2.66,0 -5.12,-0.31 -6.65,-0.61l0 -10.24c1.13,0.1 2.66,0.3 4.4,0.3 5.53,0 6.35,-2.66 6.35,-7.98l0 -51.7 12.49 0 0 51.09z" fill="#004C96" />
    <Polygon points="756.79,544.04 734.47,544.04 734.47,564.21 759.45,564.21 757.91,574.85 722.28,574.85 722.28,505.56 757.81,505.56 757.81,516.41 734.47,516.41 734.47,533.3 756.79,533.3" fill="#004C96" />
    <Path d="M809.09 554.69c-0.31,3.48 -1.64,21.39 -20.78,21.39 -19.75,0 -22.01,-17.29 -22.01,-35.93 0,-22.41 6.55,-35.62 22.73,-35.62 18.32,0 19.75,15.77 20.06,21.29l-12.29 0c-0.2,-2.35 -0.3,-10.85 -7.98,-10.85 -7.78,0 -9.72,9.52 -9.72,25.39 0,13.1 1.33,25.38 9.42,25.38 7.36,0 7.98,-8.39 8.28,-11.05l12.29 0z" fill="#004C96" />
    <Polygon points="828.74,516.41 813.9,516.41 813.9,505.55 855.97,505.55 855.97,516.41 841.13,516.41 841.13,574.85 828.74,574.85" fill="#004C96" />
    <Path d="M580.83 653.65c0,-11.78 0.2,-25.29 0.4,-33.17l-0.3 0c-2.36,13.2 -6.25,36.54 -10.75,58.96l-11.15 0c-3.39,-20.88 -7.38,-45.76 -9.63,-59.17l-0.41 0c0.41,8.09 0.72,22.63 0.72,34.61l0 24.56 -11.26 0 0 -69.3 18.53 0c3.58,19.14 6.75,38.49 8.18,48.62l0.11 0c1.43,-9.41 5.73,-30.3 9.31,-48.62l18.12 0 0 69.3 -11.87 0 0 -25.79z" fill="#004C96" />
    <Path d="M616.04 662.04l-3.48 17.4 -12.39 0 16.07 -69.3 16.08 0 16.17 69.3 -13 0 -3.38 -17.4 -16.07 0zm13.82 -10.75c-2.56,-13.31 -4.61,-23.03 -5.74,-29.58l-0.3 0c-0.82,6.34 -3.08,16.78 -5.63,29.58l11.67 0z" fill="#004C96" />
    <Path d="M655.55 679.44l0 -69.3 14.03 0c14.33,38.28 17.09,45.65 17.91,49.03l0.1 0c-0.51,-8.29 -0.61,-18.52 -0.61,-29.89l0 -19.14 11.15 0 0 69.3 -13.51 0c-14.84,-40.84 -17.4,-48.21 -18.32,-51.39l-0.11 0c0.51,8.6 0.51,18.74 0.51,31.23l0 20.16 -11.15 0z" fill="#004C96" />
    <Path d="M721.57 662.04l-3.48 17.4 -12.38 0 16.07 -69.3 16.07 0 16.18 69.3 -13.01 0 -3.38 -17.4 -16.07 0zm13.82 -10.75c-2.56,-13.31 -4.6,-23.03 -5.73,-29.58l-0.31 0c-0.81,6.34 -3.07,16.78 -5.63,29.58l11.67 0z" fill="#004C96" />
    <Path d="M802.34 679.44l-9.42 0c-0.3,-2.15 -0.51,-3.69 -0.62,-5.94 -3.06,5.53 -7.87,7.17 -13.71,7.17 -14.54,0 -19.76,-12.9 -19.76,-35.42 0,-25.29 8.6,-36.13 23.45,-36.13 18.73,0 19.75,16.07 19.96,20.16l-12.19 0c-0.2,-2.76 -0.81,-9.72 -8.18,-9.72 -7.99,0 -10.24,10.64 -10.24,25.69 0,16.07 1.94,24.98 9.82,24.98 6.55,0 8.6,-5.02 8.6,-15.25l0 -3.89 -9.31 0 0 -10.55 21.6 0 0 38.9z" fill="#004C96" />
    <Polygon points="848.61,648.63 826.29,648.63 826.29,668.79 851.27,668.79 849.73,679.44 814.11,679.44 814.11,610.14 849.63,610.14 849.63,620.99 826.29,620.99 826.29,637.88 848.61,637.88" fill="#004C96" />
    <Path d="M902.14 653.65c0,-11.78 0.2,-25.29 0.41,-33.17l-0.31 0c-2.35,13.2 -6.24,36.54 -10.75,58.96l-11.15 0c-3.38,-20.88 -7.38,-45.76 -9.63,-59.17l-0.41 0c0.41,8.09 0.72,22.63 0.72,34.61l0 24.56 -11.26 0 0 -69.3 18.53 0c3.58,19.14 6.75,38.49 8.19,48.62l0.1 0c1.43,-9.41 5.74,-30.3 9.31,-48.62l18.13 0 0 69.3 -11.88 0 0 -25.79z" fill="#004C96" />
    <Polygon points="961.51,648.63 939.19,648.63 939.19,668.79 964.17,668.79 962.63,679.44 927.01,679.44 927.01,610.14 962.53,610.14 962.53,620.99 939.19,620.99 939.19,637.88 961.51,637.88" fill="#004C96" />
    <Path d="M972.77 679.44l0 -69.3 14.02 0c14.34,38.28 17.1,45.65 17.92,49.03l0.1 0c-0.51,-8.29 -0.61,-18.52 -0.61,-29.89l0 -19.14 11.15 0 0 69.3 -13.51 0c-14.84,-40.84 -17.4,-48.21 -18.32,-51.39l-0.11 0c0.51,8.6 0.51,18.74 0.51,31.23l0 20.16 -11.15 0z" fill="#004C96" />
    <Polygon points="1037.77,620.99 1022.93,620.99 1022.93,610.14 1065,610.14 1065,620.99 1050.16,620.99 1050.16,679.44 1037.77,679.44" fill="#004C96" />
    <Path d="M433.02 540c0,115.44 -93.58,209.01 -209.01,209.01 -115.43,0 -209.01,-93.57 -209.01,-209.01 0,-115.43 93.58,-209.01 209.01,-209.01 115.43,0 209.01,93.58 209.01,209.01z" fill="#004C96" />
    <Path d="M431.34 535.74c-0.96,-1.03 -92.82,-97.87 -193.67,-107.89 -0.08,-0.01 -0.17,-0.02 -0.25,-0.03 -0.77,-0.09 -1.53,-0.19 -2.3,-0.27 -1.18,-0.12 -2.36,-0.19 -3.55,-0.28 -0.65,-0.04 -1.31,-0.1 -1.98,-0.13 -1.32,-0.07 -2.64,-0.09 -3.97,-0.11l-0.23 0c-0.46,-0.02 -0.92,-0.03 -1.37,-0.03 -0.38,0 -0.75,0.02 -1.12,0.02 -0.61,0 -1.21,-0.02 -1.82,-0.02 -52.48,0 -105.34,29.66 -140.43,54.53 -37.75,26.76 -63.69,53.93 -63.92,54.18 -2.3,2.4 -2.3,6.18 -0.02,8.56 0.25,0.27 26.19,27.44 63.94,54.2 63.59,45.07 111.47,54.53 140.43,54.53 0.61,0 1.22,-0.02 1.82,-0.03 0.38,0.01 0.75,0.03 1.12,0.03 4.58,0 9.1,-0.3 13.54,-0.84 100.9,-9.97 192.82,-106.87 193.78,-107.9 2.24,-2.39 2.24,-6.13 0,-8.52zm-207.33 -96.66c25.48,0 48.74,9.46 66.5,25.04l-66.59 66.73 -66.43 -66.71c17.76,-15.59 41.03,-25.06 66.52,-25.06zm-136.1 149.26c-27.95,-19.8 -49.46,-40.06 -57.89,-48.34 8.43,-8.29 29.94,-28.54 57.89,-48.34 21.76,-15.42 41.5,-26.47 59.13,-34.33 -0.94,0.88 -1.86,1.78 -2.78,2.69 -0.1,0.11 -0.2,0.21 -0.3,0.31 -0.79,0.79 -1.58,1.56 -2.35,2.38 -0.12,0.13 -0.22,0.29 -0.33,0.43 -18.76,20.18 -30.27,47.2 -30.27,76.86 0,1.74 0.05,3.47 0.13,5.2 0.03,0.6 0.08,1.21 0.11,1.82 0.07,1.1 0.16,2.19 0.25,3.28 0.07,0.74 0.14,1.48 0.22,2.21 0.1,0.92 0.23,1.85 0.35,2.77 0.47,3.41 1.09,6.77 1.85,10.09 0.09,0.39 0.18,0.78 0.27,1.18 0.29,1.19 0.6,2.37 0.92,3.54 0.07,0.24 0.15,0.49 0.21,0.74 1.52,5.33 3.41,10.51 5.67,15.49 0.07,0.16 0.14,0.33 0.22,0.49 0.55,1.2 1.11,2.38 1.69,3.56 0.06,0.12 0.13,0.24 0.19,0.37 1.67,3.31 3.51,6.53 5.48,9.64 0.39,0.61 0.76,1.21 1.16,1.81 0.44,0.67 0.89,1.32 1.35,1.98 0.56,0.81 1.13,1.62 1.71,2.42 0.35,0.47 0.69,0.95 1.05,1.42 2.06,2.74 4.25,5.38 6.57,7.93 0,0 0,0.01 0.01,0.01 2.1,2.32 4.3,4.55 6.59,6.68 -22.3,-9.96 -42.7,-22.67 -59.1,-34.29zm35.18 -48.34c0,-25.52 9.49,-48.8 25.11,-66.57l67.98 68.27 -36.14 89.16c-33.71,-16.34 -56.95,-50.88 -56.95,-90.86zm100.92 100.92c-11.11,0 -21.79,-1.82 -31.79,-5.14l37.26 -91.91 70.33 -70.47c15.62,17.77 25.12,41.07 25.12,66.6 0,55.74 -45.18,100.92 -100.92,100.92zm78.54 -19.78c21.24,-20.56 34.47,-49.32 34.47,-81.14 0,-31.81 -13.23,-60.58 -34.47,-81.14 56.4,25.29 102.04,67.85 115.5,81.14 -13.46,13.28 -59.1,55.85 -115.5,81.14z" fill="#FFFFFF" />
  </Svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
const AppHeader: React.FC<AppHeaderProps> = ({navigation, onDrawerOpen}) => {
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  // Real per-device top inset (status bar height, notch/cutout, etc) from
  // SafeAreaProvider (mounted once in AppNavigator).
  //
  // FIXED (Aug 2026): this used to be applied only on Android
  // (`Platform.OS === 'android' ? insets.top + 10 : 10`), on the theory
  // that every screen already wraps AppHeader in its own <SafeAreaView>
  // and that the core react-native SafeAreaView reliably supplies the top
  // inset on iOS by itself. That assumption is what was letting the
  // header render underneath the iOS status bar/notch/Dynamic Island
  // (time/date/battery) on multiple screens even though each of them DID
  // wrap AppHeader in a SafeAreaView — the core, deprecated
  // react-native SafeAreaView does not reliably compute the safe-area
  // inset in every navigation/screen context, so relying on it there was
  // fragile. AppHeader now always sources its own top inset directly from
  // react-native-safe-area-context's useSafeAreaInsets (the reliable,
  // native-backed source used elsewhere in this app, e.g. ProfileDrawer
  // and ForumTopicScreen), on both platforms, so the header is correctly
  // positioned regardless of whether — or how well — the wrapping screen's
  // own SafeAreaView applies an inset. Worst case on a screen where the
  // wrapping SafeAreaView *does* also apply a correct inset is a few extra
  // points of top padding, which is far preferable to content sitting
  // under the status bar.
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadMyProfile();
    loadUnreadCounts();
  }, []);

  // Per Robby: both endpoints return the real total in a response header
  // (X-WP-Total, or bbp-unread-messages for messages) off a single
  // per_page=1 request, so no client-side paging/summing needed.
  const loadUnreadCounts = async () => {
    try {
      const userId = await getUserIdFromToken();
      const [notifCount, msgCount] = await Promise.all([
        getUnreadNotificationCount(),
        userId ? getUnreadMessageCount(userId) : Promise.resolve(0),
      ]);
      setUnreadNotifCount(notifCount);
      setUnreadMsgCount(msgCount);
    } catch {
      // Fail silently — badges just stay hidden.
    }
  };

  const loadMyProfile = async () => {
    try {
      const userId = await getUserIdFromToken();
      if (userId) {
        const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';
        const profile = await apiRequest(
          `${BASE}/buddyboss/v1/members/${userId}`,
        );
        if (profile?.avatar_urls) {
          setMyAvatar(
            profile.avatar_urls?.thumb || profile.avatar_urls?.full || null,
          );
          setMyUserId(profile.id || userId);
          return;
        }
      }
      const stored = await getStoredUser();
      setMyAvatar(stored?.avatar || null);
    } catch {}
  };

  // Chevron = always opens the side drawer.
  const handleDrawerPress = () => {
    onDrawerOpen?.();
  };

  // Logo = always jump back to the Feed/home tab, from anywhere in the app.
  const handleLogoPress = () => {
    navigation?.navigate('MainApp', {screen: 'Feed'});
  };

  // Own avatar = go to my own MemberProfile. Uses push, not navigate:
  // AppHeader renders on top of MemberProfileScreen itself (someone else's
  // profile), so the current route is already named 'MemberProfile' with a
  // different userId param. React Navigation's navigate() to a screen name
  // that's already the focused route just merges params into that same
  // route instead of opening a new instance — which is why tapping this
  // avatar did nothing while viewing someone else's profile. push() always
  // adds a fresh 'MemberProfile' screen onto the stack regardless of what's
  // currently focused (same fix already used for avatar taps elsewhere,
  // e.g. FeedScreen's post author avatar).
  const handleAvatarPress = () => {
    navigation?.push('MemberProfile', {userId: myUserId});
  };

  return (
    <View style={[styles.header, {paddingTop: insets.top + 10}]}>
      {/* Left — chevron (drawer) + logo (home), separate tap targets */}
      <View style={styles.logoRow}>
        <TouchableOpacity
          style={styles.chevronCircle}
          onPress={handleDrawerPress}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <ChevronIcon />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleLogoPress}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Logo />
        </TouchableOpacity>
      </View>

      {/* Right — envelope, bell, avatar */}
      <View style={styles.icons}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation?.navigate('DMList')}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <EnvelopeIcon />
          <CountBadge count={unreadMsgCount} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation?.navigate('Notifications')}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <BellIcon />
          <CountBadge count={unreadNotifCount} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleAvatarPress}>
          {myAvatar ? (
            <Image source={{uri: myAvatar}} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>{'Me'}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    // paddingTop is set inline above using the real safe-area top inset —
    // see the insets.top + 10 usage in the component. Keeping only the
    // static paddingVertical (bottom) here.
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  logoRow: {flexDirection: 'row', alignItems: 'center'},
  chevronCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F4F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  icons: {flexDirection: 'row', alignItems: 'center'},
  iconBtn: {padding: 2, marginRight: 18, position: 'relative'},
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ED3241',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A3A6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {color: '#FFF', fontSize: 11, fontWeight: '700'},
});

export default AppHeader;
