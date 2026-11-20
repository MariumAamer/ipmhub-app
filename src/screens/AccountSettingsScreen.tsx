/* eslint-disable prettier/prettier */
import React, {useState, useRef, useEffect} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar, ActivityIndicator, Alert} from 'react-native';
import Svg, {Path, Circle} from 'react-native-svg';
import {getCachedCredentials} from '../api/credentialsCache';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import LogoutConfirmDialog from '../components/LogoutConfirmDialog';
import EyeClosedIcon from '../components/EyeClosedIcon';
import EyeOpenIcon from '../components/EyeOpenIcon';
import {logoutUser} from '../api/authApi';
import {emailForDisplay, isApplePrivateRelay} from '../utils/displayEmail';
import {
  getNotificationSettings,
  updateNotificationSettings,
  NOTIFICATION_SETTING_KEYS,
  NotificationSettingsMap,
  NotifSettingValue,
} from '../api/notificationsApi';
import {getLoginInfo, resendEmailChange, cancelEmailChange} from '../api/accountApi';
import type {LoginInfo} from '../api/accountApi';
import {takePendingToast} from '../utils/pendingToast';
import SuccessToast from '../components/SuccessToast';
import {GoogleIcon, LinkedInSquareIcon} from '../components/SocialButton';
import AppleMark from '../components/AppleMark';

// ─── Brand color ──────────────────────────────────────────────────────────────
const NAVY = '#0C4D91';
const DARK_NAVY = '#192546';
const ERROR_RED = '#ED3241'; // --Support-Error-Dark

// ─── Bell Icon ────────────────────────────────────────────────────────────────
const BellIcon = ({size = 20, color = NAVY}: {size?: number; color?: string}) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M12.2139 15.8994C12.5824 15.9735 12.8209 16.3325 12.7471 16.7012C12.477 18.049 11.2171 18.9999 9.7832 19C8.34915 19 7.08845 18.0491 6.81836 16.7012C6.74457 16.3324 6.98378 15.9733 7.35254 15.8994C7.72129 15.8256 8.08034 16.0649 8.1543 16.4336C8.28354 17.0784 8.92794 17.6377 9.7832 17.6377C10.6384 17.6376 11.2829 17.0784 11.4121 16.4336C11.4861 16.0649 11.8451 15.8255 12.2139 15.8994ZM9.88086 1C13.1587 1 15.8164 3.65766 15.8164 6.93555V10.1943C16.9265 10.4197 17.7616 11.4015 17.7617 12.5781C17.7617 13.9214 16.6733 15.0106 15.3301 15.0107H4.43262C3.08922 15.0107 2 13.9215 2 12.5781C2.00012 11.4014 2.83609 10.4197 3.94629 10.1943V6.93555C3.94629 3.65774 6.60308 1.00012 9.88086 1ZM9.88086 2.3623C7.35538 2.36242 5.30859 4.41004 5.30859 6.93555V10.5127C5.30859 10.9754 4.98179 11.3737 4.52832 11.4658L4.2168 11.5293C3.72897 11.6284 3.36242 12.0621 3.3623 12.5781C3.3623 13.1692 3.84152 13.6484 4.43262 13.6484H15.3301C15.921 13.6482 16.4004 13.1691 16.4004 12.5781C16.4003 12.062 16.0328 11.6283 15.5449 11.5293L15.2334 11.4658C14.78 11.3737 14.4541 10.9754 14.4541 10.5127V6.93555C14.4541 4.40996 12.4064 2.3623 9.88086 2.3623Z"
      fill={color}
    />
  </Svg>
);

// ─── Channel icons (Email / In-app / Push) ────────────────────────────────────
// Rebuilt from the Figma exports. The email export used a <mask>, which
// react-native-svg@15.3.0 doesn't render, so it's drawn as a direct-fill path.

// ─── Push (phone) Icon ────────────────────────────────────────────────────────
const MobileIcon = ({color = NAVY}: {color?: string}) => (
  <Svg width={11} height={16} viewBox="0 0 11 16" fill="none">
    <Path
      d="M2.75 14.3721C2.45 14.3721 2.192 14.2641 1.976 14.0481C1.748 13.8201 1.634 13.5561 1.634 13.2561V2.74414C1.634 2.43214 1.748 2.16814 1.976 1.95214C2.192 1.73614 2.45 1.62814 2.75 1.62814H8.006C8.318 1.62814 8.582 1.73614 8.798 1.95214C9.014 2.16814 9.122 2.43214 9.122 2.74414V13.2561C9.122 13.5561 9.014 13.8201 8.798 14.0481C8.582 14.2641 8.318 14.3721 8.006 14.3721H2.75ZM8.006 15.5061C8.414 15.5061 8.792 15.4041 9.14 15.2001C9.476 14.9961 9.746 14.7261 9.95 14.3901C10.154 14.0421 10.256 13.6641 10.256 13.2561V2.74414C10.256 2.33614 10.154 1.96414 9.95 1.62814C9.746 1.28014 9.476 1.00414 9.14 0.800141C8.792 0.596141 8.414 0.494141 8.006 0.494141H2.75C2.342 0.494141 1.97 0.596141 1.634 0.800141C1.286 1.00414 1.01 1.28014 0.806 1.62814C0.602 1.96414 0.5 2.33614 0.5 2.74414V13.2561C0.5 13.6641 0.602 14.0421 0.806 14.3901C1.01 14.7261 1.286 14.9961 1.634 15.2001C1.97 15.4041 2.342 15.5061 2.75 15.5061H8.006ZM3.794 12.7161C3.794 12.8721 3.854 13.0101 3.974 13.1301C4.082 13.2381 4.214 13.2921 4.37 13.2921H6.386C6.542 13.2921 6.674 13.2381 6.782 13.1301C6.89 13.0101 6.944 12.8721 6.944 12.7161C6.944 12.5601 6.89 12.4281 6.782 12.3201C6.674 12.2121 6.542 12.1581 6.386 12.1581H4.37C4.214 12.1581 4.082 12.2121 3.974 12.3201C3.854 12.4281 3.794 12.5601 3.794 12.7161Z"
      fill={color}
    />
  </Svg>
);

// ─── In-app (monitor) Icon ────────────────────────────────────────────────────
const WebIcon = ({color = NAVY}: {color?: string}) => (
  <Svg width={17.006} height={17.006} viewBox="0 0 17 17" fill="none">
    <Path
      d="M3.53788 12.0916C3.2431 12.0916 2.99368 11.9895 2.78961 11.7855C2.58553 11.5701 2.4835 11.315 2.4835 11.0202V4.25174C2.4835 3.95697 2.58553 3.70755 2.78961 3.50347C2.99368 3.28806 3.2431 3.18036 3.53788 3.18036H13.4695C13.7642 3.18036 14.0137 3.28806 14.2177 3.50347C14.4218 3.70755 14.5238 3.95697 14.5238 4.25174V11.0202C14.5238 11.315 14.4218 11.5701 14.2177 11.7855C14.0137 11.9895 13.7642 12.0916 13.4695 12.0916H3.53788ZM13.4695 13.146C13.8549 13.146 14.2121 13.0496 14.5408 12.8568C14.8583 12.6641 15.1134 12.409 15.3061 12.0916C15.4989 11.7628 15.5952 11.4057 15.5952 11.0202V4.25174C15.5952 3.86627 15.4989 3.51481 15.3061 3.19736C15.1134 2.86858 14.8583 2.60782 14.5408 2.41508C14.2121 2.22234 13.8549 2.12598 13.4695 2.12598H3.53788C3.1524 2.12598 2.80094 2.22234 2.4835 2.41508C2.15471 2.60782 1.89395 2.86858 1.70121 3.19736C1.50848 3.51481 1.41211 3.86627 1.41211 4.25174V11.0202C1.41211 11.4057 1.50848 11.7628 1.70121 12.0916C1.89395 12.409 2.15471 12.6641 2.4835 12.8568C2.80094 13.0496 3.1524 13.146 3.53788 13.146H6.88808L6.0888 14.3534H4.79633C4.64894 14.3534 4.52423 14.4044 4.4222 14.5064C4.32016 14.6085 4.26914 14.7332 4.26914 14.8806C4.26914 15.028 4.32016 15.1527 4.4222 15.2547C4.52423 15.3567 4.64894 15.4078 4.79633 15.4078H12.211C12.3584 15.4078 12.4831 15.3567 12.5851 15.2547C12.6872 15.1527 12.7382 15.028 12.7382 14.8806C12.7382 14.7332 12.6872 14.6085 12.5851 14.5064C12.4831 14.4044 12.3584 14.3534 12.211 14.3534H10.9185L10.1193 13.146H13.4695ZM9.64308 14.3534H7.36426L8.07851 13.282H8.92882L9.64308 14.3534Z"
      fill={color}
    />
  </Svg>
);

// ─── Email Icon ───────────────────────────────────────────────────────────────
const EmailIcon = ({color = NAVY}: {color?: string}) => (
  <Svg width={17} height={17} viewBox="0 0 17 17" fill="none">
    <Path
      d="M1.91016 6.12687V12.3999C1.91016 12.9099 2.03482 13.3802 2.28416 13.8109C2.53349 14.2415 2.87349 14.5815 3.30416 14.8309C3.73482 15.0802 4.19949 15.2049 4.69816 15.2049H13.3002C13.7988 15.2049 14.2635 15.0802 14.6942 14.8309C15.1248 14.5815 15.4648 14.2415 15.7142 13.8109C15.9635 13.3802 16.0882 12.9099 16.0882 12.3999V6.12687C16.0882 5.61687 15.9635 5.1522 15.7142 4.73287C15.4648 4.3022 15.1248 3.9622 14.6942 3.71287C14.2635 3.46353 13.7988 3.33887 13.3002 3.33887H4.69816C4.19949 3.33887 3.73482 3.46353 3.30416 3.71287C2.87349 3.9622 2.53349 4.3022 2.28416 4.73287C2.03482 5.1522 1.91016 5.61687 1.91016 6.12687ZM4.69816 4.39287H13.3002C13.6175 4.39287 13.9065 4.4722 14.1672 4.63087C14.4278 4.78953 14.6375 4.9992 14.7962 5.25987C14.9435 5.52053 15.0172 5.80953 15.0172 6.12687V12.3999C15.0172 12.7172 14.9435 13.0119 14.7962 13.2839C14.6375 13.5445 14.4278 13.7542 14.1672 13.9129C13.9065 14.0602 13.6175 14.1339 13.3002 14.1339H4.69816C4.38082 14.1339 4.09182 14.0602 3.83116 13.9129C3.57049 13.7542 3.36649 13.5445 3.21916 13.2839C3.06049 13.0119 2.98116 12.7172 2.98116 12.3999V6.12687C2.98116 5.80953 3.06049 5.52053 3.21916 5.25987C3.36649 4.9992 3.57049 4.78953 3.83116 4.63087C4.09182 4.4722 4.38082 4.39287 4.69816 4.39287ZM4.20516 6.44987C4.11449 6.5632 4.08049 6.69353 4.10316 6.84087C4.11449 6.9882 4.18249 7.1072 4.30716 7.19787L7.65616 9.71387C8.05282 9.9972 8.50049 10.1389 8.99916 10.1389C9.48649 10.1389 9.92282 9.9972 10.3082 9.71387L13.6402 7.21487C13.7535 7.1242 13.8215 7.01087 13.8442 6.87487C13.8668 6.72753 13.8328 6.59153 13.7422 6.46687C13.6515 6.3422 13.5325 6.2742 13.3852 6.26287C13.2378 6.2402 13.1075 6.2742 12.9942 6.36487L9.66216 8.86387C9.45816 9.0112 9.23149 9.08487 8.98216 9.08487C8.72149 9.08487 8.49482 9.0112 8.30216 8.86387L4.95316 6.34787C4.82849 6.2572 4.69249 6.2232 4.54516 6.24587C4.39782 6.26853 4.28449 6.33653 4.20516 6.44987Z"
      fill={color}
    />
  </Svg>
);

// ─── Settings Gear Icon ───────────────────────────────────────────────────────
const GearIcon = ({color = NAVY}: {color?: string}) => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.29793 3.22395L8.84847 3.38565C8.22931 3.59568 7.63643 3.50662 7.21336 2.99017C6.97609 2.70049 6.94781 2.52203 6.88722 2.16923C6.87314 2.08786 6.83527 1.9257 6.83314 1.83606H5.16347C5.16146 1.92466 5.12916 2.05538 5.11235 2.15271C5.0501 2.51365 5.0294 2.68959 4.78325 2.99017C4.36373 3.50226 3.77913 3.59396 3.16305 3.39047L2.69869 3.22395C2.46851 3.64595 2.09562 4.20636 1.8638 4.63122C1.97823 4.66083 2.39301 5.04657 2.48449 5.14745C2.90199 5.60755 2.89927 6.38108 2.49384 6.84222C2.26379 7.10389 2.20769 7.09287 1.95918 7.30691C1.90675 7.35213 1.93586 7.34995 1.8638 7.36866C1.92734 7.48515 1.9948 7.59636 2.06639 7.71193L2.48863 8.4205C2.56236 8.53848 2.63549 8.66002 2.69869 8.77594C2.75703 8.76274 2.85998 8.72073 2.91726 8.69881C3.20128 8.59013 3.40458 8.506 3.73227 8.506C4.36527 8.506 4.88762 8.94946 5.04691 9.50586L5.16347 10.1638H6.83314C6.83527 10.0752 6.86757 9.9445 6.88426 9.84718C6.94639 9.48692 6.96828 9.31592 7.2104 9.00685C7.42945 8.72727 7.83607 8.506 8.32399 8.506C8.71427 8.506 9.06882 8.72406 9.29793 8.77594C9.53626 8.33913 9.89543 7.80374 10.1328 7.36866C10.0733 7.35316 9.62738 6.99073 9.57591 6.92554C9.38076 6.67856 9.19864 6.4706 9.19864 5.99994C9.19864 5.34611 9.54679 5.07641 9.96016 4.75299C9.99448 4.72614 10.0054 4.72063 10.0374 4.69297C10.0899 4.64775 10.0607 4.64993 10.1328 4.63122C10.0693 4.51474 10.0019 4.40353 9.93022 4.28796C9.85495 4.16653 9.79448 4.05498 9.71922 3.93355L9.29793 3.22395ZM6.03661 4.0918C6.80878 4.0918 7.45208 4.56475 7.77952 5.19678C7.8742 5.37949 7.96484 5.69487 7.96484 5.9617C7.96484 7.9815 5.19651 8.6996 4.21429 6.80375C3.62815 5.67226 4.45535 4.0918 6.03661 4.0918Z"
      fill={color}
    />
  </Svg>
);

// ─── Hint / warning exclamation icon ──────────────────────────────────────────
// Rebuilt as plain fills — react-native-svg@15.3.0 doesn't render <mask>.
// Original design was a navy circle badge with white "!" cut out via mask;
// here we just draw a white circle first, then the navy "!" glyph on top,
// which produces the identical result without needing a mask.
const ExclamationIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Circle cx="7.00065" cy="7.00016" r="6.41667" fill="#FFFFFF" />
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.62033 6.30764C5.62033 5.98548 5.8815 5.72431 6.20366 5.72431H7.00095C7.32312 5.72431 7.58428 5.98548 7.58428 6.30764V9.02409H8.28771C8.60988 9.02409 8.87104 9.28525 8.87104 9.60742C8.87104 9.92959 8.60988 10.1908 8.28771 10.1908H5.71419C5.39203 10.1908 5.13086 9.92959 5.13086 9.60742C5.13086 9.28525 5.39203 9.02409 5.71419 9.02409H6.41762V6.89098H6.20366C5.8815 6.89098 5.62033 6.62981 5.62033 6.30764Z"
      fill="#192546"
    />
    <Path
      d="M7.71998 4.57236C7.71998 4.99391 7.37825 5.33565 6.9567 5.33565C6.53515 5.33565 6.19341 4.99391 6.19341 4.57236C6.19341 4.15082 6.53515 3.80908 6.9567 3.80908C7.37825 3.80908 7.71998 4.15082 7.71998 4.57236Z"
      fill="#192546"
    />
  </Svg>
);

// ─── Log Out / Privacy Policy row icons ───────────────────────────────────────
const LogoutIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path
      d="M7.5 1.875C7.99728 1.875 8.47405 2.07269 8.82568 2.42432C9.17731 2.77595 9.375 3.25272 9.375 3.75V5C9.375 5.34518 9.09518 5.625 8.75 5.625C8.40482 5.625 8.125 5.34518 8.125 5V3.75C8.125 3.58424 8.0591 3.42532 7.94189 3.30811C7.82468 3.1909 7.66576 3.125 7.5 3.125H3.125C2.95924 3.125 2.80032 3.1909 2.68311 3.30811C2.5659 3.42532 2.5 3.58424 2.5 3.75V11.25C2.5 11.4158 2.5659 11.5747 2.68311 11.6919C2.80032 11.8091 2.95924 11.875 3.125 11.875H7.5C7.66576 11.875 7.82468 11.8091 7.94189 11.6919C8.0591 11.5747 8.125 11.4158 8.125 11.25V10C8.125 9.65482 8.40482 9.375 8.75 9.375C9.09518 9.375 9.375 9.65482 9.375 10V11.25C9.375 11.7473 9.17731 12.2241 8.82568 12.5757C8.47405 12.9273 7.99728 13.125 7.5 13.125H3.125C2.62772 13.125 2.15095 12.9273 1.79932 12.5757C1.44769 12.2241 1.25 11.7473 1.25 11.25V3.75C1.25 3.25272 1.44769 2.77595 1.79932 2.42432C2.15095 2.07269 2.62772 1.875 3.125 1.875H7.5Z"
      fill="#192546"
    />
    <Path
      d="M10.8081 5.18311C11.0522 4.93903 11.4478 4.93903 11.6919 5.18311L13.5669 7.05811C13.811 7.30218 13.811 7.69782 13.5669 7.94189L11.6919 9.81689C11.4478 10.061 11.0522 10.061 10.8081 9.81689C10.564 9.57282 10.564 9.17718 10.8081 8.93311L11.6162 8.125H5.625C5.27982 8.125 5 7.84518 5 7.5C5 7.15482 5.27982 6.875 5.625 6.875H11.6162L10.8081 6.06689C10.564 5.82282 10.564 5.42718 10.8081 5.18311Z"
      fill="#192546"
    />
  </Svg>
);

const PrivacyIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path
      d="M3.75 13.75H11.25C11.9375 13.75 12.5 13.1875 12.5 12.5V6.875C12.5 6.1875 11.9375 5.625 11.25 5.625H10.625V4.375C10.625 2.65 9.225 1.25 7.5 1.25C5.775 1.25 4.375 2.65 4.375 4.375V5.625H3.75C3.0625 5.625 2.5 6.1875 2.5 6.875V12.5C2.5 13.1875 3.0625 13.75 3.75 13.75ZM5.625 4.375C5.625 3.34375 6.46875 2.5 7.5 2.5C8.53125 2.5 9.375 3.34375 9.375 4.375V5.625H5.625V4.375ZM3.75 6.875H11.25V12.5H3.75V6.875Z"
      fill="#192546"
    />
  </Svg>
);

const DeleteIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path d="M12.3438 3.125C12.6026 3.125 12.8125 3.33487 12.8125 3.59375C12.8125 3.85263 12.6026 4.0625 12.3438 4.0625H2.34375C2.08487 4.0625 1.875 3.85263 1.875 3.59375C1.875 3.33487 2.08487 3.125 2.34375 3.125H12.3438Z" fill={ERROR_RED} />
    <Path fillRule="evenodd" clipRule="evenodd" d="M12.219 3.125L11.619 12.1246C11.5698 12.8633 10.9562 13.4375 10.2158 13.4375H4.46997C3.72963 13.4375 3.11602 12.8633 3.06677 12.1246L2.4668 3.125H12.219ZM4.00244 12.0624C4.01886 12.3086 4.22319 12.5 4.46997 12.5H10.2158C10.4626 12.5 10.6669 12.3086 10.6833 12.0624L11.2168 4.0625H3.46899L4.00244 12.0624Z" fill={ERROR_RED} />
    <Path fillRule="evenodd" clipRule="evenodd" d="M5.62536 9.84375V6.71875C5.62536 6.45987 5.83523 6.25 6.09411 6.25C6.35299 6.25 6.56286 6.45987 6.56286 6.71875V9.84375C6.56286 10.1026 6.35299 10.3125 6.09411 10.3125C5.83523 10.3125 5.62536 10.1026 5.62536 9.84375ZM8.12536 9.84375V6.71875C8.12536 6.45987 8.33523 6.25 8.59411 6.25C8.85299 6.25 9.06286 6.45987 9.06286 6.71875V9.84375C9.06286 10.1026 8.85299 10.3125 8.59411 10.3125C8.33523 10.3125 8.12536 10.1026 8.12536 9.84375ZM8.54345 1.25C9.14866 1.25002 9.68623 1.63718 9.87768 2.2113L10.2891 3.44543C10.3709 3.69103 10.238 3.95683 9.99243 4.0387C9.74683 4.12056 9.48103 3.98766 9.39916 3.74207L8.9884 2.50793C8.9246 2.31654 8.74519 2.18752 8.54345 2.1875H6.14477C5.94303 2.18752 5.76362 2.31654 5.69982 2.50793L5.28906 3.74207C5.20719 3.98766 4.94139 4.12056 4.6958 4.0387C4.4502 3.95683 4.3173 3.69103 4.39916 3.44543L4.81054 2.2113C5.00199 1.63718 5.53956 1.25002 6.14477 1.25H8.54345Z" fill={ERROR_RED} />
  </Svg>
);

const BlockIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M5.625 10.305C4.775 10.305 3.985 10.095 3.255 9.675C2.555 9.255 1.995 8.695 1.575 7.995C1.155 7.265 0.945 6.475 0.945 5.625C0.945 5.075 1.035 4.545 1.215 4.035C1.395 3.525 1.655 3.065 1.995 2.655L8.43 9.39C8.03 9.68 7.5925 9.905 7.1175 10.065C6.6425 10.225 6.145 10.305 5.625 10.305ZM9.12 8.745L2.655 1.995C3.065 1.655 3.52 1.395 4.02 1.215C4.54 1.025 5.075 0.93 5.625 0.93C6.475 0.93 7.265 1.145 7.995 1.575C8.705 1.985 9.265 2.545 9.675 3.255C10.105 3.985 10.32 4.775 10.32 5.625C10.32 6.215 10.21 6.78 9.99 7.32C9.79 7.85 9.5 8.325 9.12 8.745ZM0 5.625C0 6.645 0.255 7.59 0.765 8.46C1.265 9.31 1.94 9.985 2.79 10.485C3.66 10.995 4.605 11.25 5.625 11.25C6.645 11.25 7.59 10.995 8.46 10.485C9.31 9.985 9.985 9.31 10.485 8.46C10.995 7.59 11.25 6.645 11.25 5.625C11.25 4.605 10.995 3.66 10.485 2.79C9.985 1.94 9.31 1.265 8.46 0.765C7.59 0.255 6.645 0 5.625 0C4.605 0 3.66 0.255 2.79 0.765C1.94 1.265 1.265 1.94 0.765 2.79C0.255 3.66 0 4.605 0 5.625Z"
      fill="#192546"
    />
  </Svg>
);

// ─── Toggle (pill switch) ─────────────────────────────────────────────────────
const Toggle = ({value, onToggle, label}: {value: boolean; onToggle: () => void; label: string}) => (
  <TouchableOpacity
    onPress={onToggle}
    activeOpacity={0.8}
    hitSlop={{top: 8, bottom: 8, left: 6, right: 6}}
    accessibilityRole="switch"
    accessibilityLabel={label}
    accessibilityState={{checked: value}}
    style={[toggleStyles.track, value ? toggleStyles.trackOn : toggleStyles.trackOff]}>
    <View style={[toggleStyles.thumb, value ? toggleStyles.thumbOn : toggleStyles.thumbOff]} />
  </TouchableOpacity>
);

const toggleStyles = StyleSheet.create({
  track: {width: 44, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center'},
  trackOn: {backgroundColor: NAVY},
  trackOff: {backgroundColor: '#C5C6CC'},
  thumb: {width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF'},
  thumbOn: {alignSelf: 'flex-end'},
  thumbOff: {alignSelf: 'flex-start'},
});

// ─── Notification settings config ─────────────────────────────────────────────
// Channels match the Figma columns: Email / In-app / Push. Backend mapping
// (per Robby, 2026-08-02): base key = push, "_web" suffix = in-app,
// "_email" suffix = email. NOTE: "_web" = in-app is an assumption — confirm
// with Robby.
//
// A channel is ONLY shown when it has a real backend key. A row with no keys
// at all, and a group with no rows, are hidden entirely. To light something
// up once an endpoint exists, just add its key here — no other change needed.
type ChannelId = 'email' | 'inapp' | 'push';
const CHANNEL_ORDER: ChannelId[] = ['email', 'inapp', 'push'];
const CHANNEL_LABEL: Record<ChannelId, string> = {email: 'Email', inapp: 'In-app', push: 'Push'};
const CHANNEL_DESC: Record<ChannelId, string> = {
  email: 'A notification sent to your inbox',
  inapp: 'In your IPM Hub notifications',
  push: 'On your phone',
};
const CHANNEL_ICON: Record<ChannelId, () => React.ReactElement> = {
  email: () => <EmailIcon color={NAVY} />,
  inapp: () => <WebIcon color={NAVY} />,
  push: () => <MobileIcon color={NAVY} />,
};

interface NotifSetting {
  id: string;
  title: string;
  description: string;
  keys: Partial<Record<ChannelId, string>>; // backend field key per channel
}
interface NotifGroup {
  id: string;
  title: string;
  settings: NotifSetting[];
}

const K = NOTIFICATION_SETTING_KEYS;

// Master "Email notifications" switch — no endpoint yet, so `key` is unset and
// the card is hidden. Set `key` once the backend adds it.
const EMAIL_MASTER: {title: string; description: string; key?: string} = {
  title: 'Email notifications',
  description: "Turn off to stop all emails from IPM Hub. In-app and push aren't affected.",
  key: undefined,
};

const NOTIFICATION_GROUPS: NotifGroup[] = [
  {
    id: 'mentions',
    title: 'MENTIONS',
    settings: [
      {
        id: 'mention',
        title: 'Mentions',
        description: 'When someone mentions you, like @camilatorres',
        keys: {inapp: K.mentionWeb, push: K.mention},
      },
    ],
  },
  {
    id: 'activity',
    title: 'ACTIVITY',
    settings: [
      {
        id: 'activityComment',
        title: 'Replies to your posts',
        description: 'When someone replies to your post or comment',
        keys: {inapp: K.activityCommentWeb, push: K.activityComment},
      },
      {
        id: 'newFollower',
        title: 'New followers', // title cut off in the Figma frame — confirm
        description: 'When someone starts following you',
        keys: {inapp: K.newFollowerWeb, push: K.newFollower},
      },
    ],
  },
  {
    id: 'introductions',
    title: 'INTRODUCTIONS',
    settings: [
      {
        id: 'replyIntro',
        title: 'Replies to your introduction',
        description: 'When someone replies to your introduction',
        keys: {email: K.replyIntroEmail, push: K.replyIntro},
      },
    ],
  },
  {
    id: 'discussions',
    title: 'DISCUSSIONS (FORUMS)',
    settings: [
      {
        id: 'newDiscussion',
        title: 'New discussions',
        description: 'When a new discussion is created',
        keys: {push: K.newDiscussion},
      },
      {
        id: 'forumReply',
        title: 'Replies to your discussions',
        description: 'When someone replies to your discussion',
        keys: {push: K.forumReply},
      },
    ],
  },
  {
    id: 'feed',
    title: 'FEED',
    settings: [
      {
        id: 'feedLike',
        title: 'Likes',
        description: 'When someone likes your post or activity',
        keys: {push: K.feedLike},
      },
    ],
  },
  {
    // No endpoint yet — hidden automatically until keys are added.
    id: 'events',
    title: 'EVENTS & WEBINARS',
    settings: [
      {
        id: 'events',
        title: 'Events & webinars',
        description: 'Announcements of upcoming IPM events and webinars',
        keys: {},
      },
    ],
  },
];

const channelsUsed = (settings: NotifSetting[]): ChannelId[] =>
  CHANNEL_ORDER.filter(ch => settings.some(s => !!s.keys[ch]));

// Drop rows with no keys, then groups with no rows.
const VISIBLE_GROUPS: NotifGroup[] = NOTIFICATION_GROUPS.map(g => ({
  ...g,
  settings: g.settings.filter(s => channelsUsed([s]).length > 0),
})).filter(g => g.settings.length > 0);

const LEGEND_CHANNELS: ChannelId[] = channelsUsed(VISIBLE_GROUPS.flatMap(g => g.settings));

// ─── Group card (header + column labels + rows) ───────────────────────────────
const NotifGroupCard = ({
  group,
  settingsMap,
  onToggle,
}: {
  group: NotifGroup;
  settingsMap: NotificationSettingsMap;
  onToggle: (backendKey: string) => void;
}) => {
  // Only the channels this group actually has keys for get a column.
  const channels = channelsUsed(group.settings);
  return (
    <View style={notifStyles.card}>
      <View style={notifStyles.cardHeader}>
        <Text style={notifStyles.groupTitle}>{group.title}</Text>
        <View style={notifStyles.colLabels}>
          {channels.map(ch => (
            <Text key={ch} style={notifStyles.colLabel}>{CHANNEL_LABEL[ch]}</Text>
          ))}
        </View>
      </View>
      {group.settings.map(s => (
        <React.Fragment key={s.id}>
        <View style={notifStyles.divider} />
        <View style={notifStyles.row}>
          <View style={notifStyles.rowText}>
            <Text style={notifStyles.rowTitle}>{s.title}</Text>
            <Text style={notifStyles.rowDesc}>{s.description}</Text>
          </View>
          {channels.map(ch => {
            const backendKey = s.keys[ch];
            return (
              <View key={ch} style={notifStyles.cell}>
                {backendKey ? (
                  <Toggle
                    value={settingsMap[backendKey] === 'yes'}
                    onToggle={() => onToggle(backendKey)}
                    label={`${s.title} — ${CHANNEL_LABEL[ch]}`}
                  />
                ) : (
                  <Text style={notifStyles.dash}>{'—'}</Text>
                )}
              </View>
            );
          })}
        </View>
        </React.Fragment>
      ))}
    </View>
  );
};

const COL_W = 56;
const notifStyles = StyleSheet.create({
  // Box for each notification group (Introductions, Discussions, ...):
  // padding 4/12, column, flex-start, stretch, radius 5, 1px #C5C6CC border.
  card: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#C5C6CC',
    backgroundColor: '#FFFFFF',
  },
  // Top text box: padding 10/0, centered row, gap 8, stretch.
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 8,
    paddingVertical: 10,
  },
  // Heading/H5: Runda 12 / 500, Navy Blue.
  groupTitle: {flex: 1, fontFamily: 'Runda-Medium', fontSize: 12, fontWeight: '500', color: DARK_NAVY},
  colLabels: {flexDirection: 'row'},
  // Caption: Runda 12 / 400 / 16, Dark Grey.
  colLabel: {width: COL_W, textAlign: 'center', fontFamily: 'Runda-Normal', fontSize: 12, fontWeight: '400', lineHeight: 16, color: '#7C86A1'},
  row: {flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', paddingVertical: 8},
  // 1px line after the heading and after each notification (Neutral Light Medium).
  divider: {height: 1, alignSelf: 'stretch', backgroundColor: '#E8E9F1'},
  rowText: {flex: 1, paddingRight: 8},
  // Notification heading — Heading/H4: Runda 14 / 500, Navy Blue.
  rowTitle: {fontFamily: 'Runda-Medium', fontSize: 14, fontWeight: '500', color: DARK_NAVY, marginBottom: 2},
  // Description — Body S: Runda 12 / 400, Neutral Dark Lightest.
  rowDesc: {fontFamily: 'Runda-Normal', fontSize: 12, fontWeight: '400', color: '#8F9098'},
  cell: {width: COL_W, alignItems: 'center', justifyContent: 'center'},
  dash: {fontSize: 12, color: '#8F9098'},
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
// Backend: provider accounts (Google/LinkedIn/Apple) can't set a password yet —
// the "set password" endpoint comes after the iOS submission. Flip this to true
// once it exists; SetPasswordScreen and its route are already in place.
const SET_PASSWORD_SUPPORTED = false;

const PROVIDER_LABEL: Record<string, string> = {google: 'Google', linkedin: 'LinkedIn', apple: 'Apple'};

const AccountSettingsScreen = ({navigation}: any) => {
  const [activeTab, setActiveTab] = useState<'login' | 'notifications'>('login');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  // ── Login Info state ──────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(true);
  // Read-only card + "Change" buttons (per Figma): the email shown in the card
  // is the last saved value; `email` is the live edit buffer.
  const [savedEmail, setSavedEmail] = useState('');
  // Address a confirmation link was sent to (Change Email flow); null if none.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  // GET /account/login-info — drives the email/password rows and the banner.
  const [loginInfo, setLoginInfo] = useState<LoginInfo | null>(null);
  const [pendingBusy, setPendingBusy] = useState<'resend' | 'cancel' | null>(null);
  // One-line confirmation handed over by another screen (e.g. "Password set").
  const [toast, setToast] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);

  // ── Notification state ────────────────────────────────────────────────────
  // One flat map of backend key -> 'yes'/'no', loaded straight from
  // GET /custom/v1/notifications/settings. Rows read/write into it directly
  // via their declared keys (see GENERAL_GROUP etc. above) so there's a
  // single source of truth instead of per-group local state going stale.
  const [settingsMap, setSettingsMap] = useState<NotificationSettingsMap>({});
  const [loadingNotif, setLoadingNotif] = useState(true);
  // Mirror of settingsMap so rapid toggles read the latest value, plus a
  // per-key save queue so quick taps on one toggle reach the server in order.
  const settingsRef = useRef<NotificationSettingsMap>({});
  const saveQueue = useRef<Record<string, Promise<unknown>>>({});

  const newPassRef = useRef<TextInput>(null);
  const repeatPassRef = useRef<TextInput>(null);

  useEffect(() => {
    loadCurrentEmail();
    loadNotifSettings();
  }, []);

  // Read login-info on mount and each time we come back from Change Email /
  // Change Password, so the pending-email banner and the row buttons follow
  // the server. If it can't be read we keep whatever was shown before.
  const refreshLoginInfo = () =>
    getLoginInfo()
      .then(info => {
        setLoginInfo(info);
        setPendingEmail(info.pendingEmail);
        if (info.email) setSavedEmail(info.email);
      })
      .catch(() => {});

  useEffect(() => {
    const onFocus = () => {
      refreshLoginInfo();
      const t = takePendingToast();
      if (t) setToast(t);
    };
    onFocus();
    const unsubscribe = navigation?.addListener?.('focus', onFocus);
    return unsubscribe;
  }, [navigation]);


  const handleResendPending = async () => {
    setPendingBusy('resend');
    try {
      await resendEmailChange();
      Alert.alert('Link sent', `We sent a new confirmation link to ${pendingEmail}.`);
    } catch (e: any) {
      if (e?.code === 'nothing_pending') refreshLoginInfo(); // it expired meanwhile
      Alert.alert('Could not resend', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setPendingBusy(null);
    }
  };

  const handleCancelPending = async () => {
    setPendingBusy('cancel');
    try {
      await cancelEmailChange();
      setPendingEmail(null);
      refreshLoginInfo();
    } catch (e: any) {
      if (e?.code === 'nothing_pending') {
        setPendingEmail(null);
        refreshLoginInfo();
      } else {
        Alert.alert('Could not cancel', e?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setPendingBusy(null);
    }
  };

  // Accounts created with Google/LinkedIn/Apple that can't change a password
  // (they have none) get "Set" instead of "Change".
  const needsPasswordSetup = !!loginInfo && !loginInfo.canChangePassword && loginInfo.provider !== 'password';
  const canSetPassword = needsPasswordSetup && SET_PASSWORD_SUPPORTED;
  // Buttons follow the server flags (can_change_email / can_change_password);
  // hidden until login-info has loaded so they don't flash for provider accounts.
  const showEmailChange = !!loginInfo && loginInfo.canChangeEmail;
  const showPasswordButton = !!loginInfo && (loginInfo.canChangePassword || canSetPassword);

  const loadNotifSettings = async () => {
    try {
      const data = await getNotificationSettings();
      settingsRef.current = data;
      setSettingsMap(data);
    } catch (e) {
      console.log('[AccountSettings] loadNotifSettings error:', e);
    } finally {
      setLoadingNotif(false);
    }
  };

  const loadCurrentEmail = async () => {
    try {
      // PERF: in-memory cached credentials instead of a native Keychain read.
      const creds = await getCachedCredentials();
      const stored = creds ? JSON.parse(creds.password) : null;
      const token = stored?.token ?? null;
      // Show the stored email immediately as a fallback.
      if (stored?.email) { setEmail(stored.email); setSavedEmail(stored.email); }
      if (token) {
        // context=edit is required — WP omits "email" from /users/me otherwise.
        const res = await fetch(
          'https://hub.instituteprojectmanagement.com/wp-json/wp/v2/users/me?context=edit',
          {headers: {Authorization: `Bearer ${token}`}},
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.email) { setEmail(data.email); setSavedEmail(data.email); }
        }
      }
    } catch {}
    finally {
      setLoadingEmail(false);
    }
  };

  // ── Toggle a setting — saved immediately ("Changes are saved automatically") ─
  // Optimistic: flips the value locally, POSTs only that key, and reverts it
  // if the save fails. Saves for the same key are chained so rapid taps reach
  // the server in order.
  const applySetting = (backendKey: string, value: NotifSettingValue) => {
    settingsRef.current = {...settingsRef.current, [backendKey]: value};
    setSettingsMap(settingsRef.current);
  };

  const toggleSetting = (backendKey: string) => {
    const previous: NotifSettingValue = settingsRef.current[backendKey] === 'yes' ? 'yes' : 'no';
    const next: NotifSettingValue = previous === 'yes' ? 'no' : 'yes';
    applySetting(backendKey, next);
    saveQueue.current[backendKey] = (saveQueue.current[backendKey] ?? Promise.resolve()).then(async () => {
      let ok = false;
      try {
        ok = await updateNotificationSettings({[backendKey]: next});
      } catch {}
      // Only revert if no newer tap has changed this key in the meantime.
      if (!ok && settingsRef.current[backendKey] === next) {
        applySetting(backendKey, previous);
        Alert.alert('Error', 'Could not save your notification preference. Please try again.');
      }
    });
  };

  const resetPasswordFields = () => {
    setNewPassword('');
    setRepeatPassword('');
    setShowNew(false);
    setShowRepeat(false);
  };
  const cancelEditEmail = () => {
    setEmail(savedEmail);
    setEditingEmail(false);
  };
  const cancelEditPassword = () => {
    resetPasswordFields();
    setEditingPassword(false);
  };
  // Only one row is editable at a time.
  const toggleEditEmail = () => {
    if (editingEmail) {
      cancelEditEmail();
      return;
    }
    cancelEditPassword();
    setEditingEmail(true);
  };
  const toggleEditPassword = () => {
    if (editingPassword) {
      cancelEditPassword();
      return;
    }
    cancelEditEmail();
    setEditingPassword(true);
  };

  const handleSaveLoginInfo = async () => {
    if (editingPassword && !newPassword) {
      Alert.alert('Error', 'Please enter a new password.');
      return;
    }
    if (newPassword && newPassword !== repeatPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (newPassword && newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      // PERF: in-memory cached credentials instead of a native Keychain read.
      const creds = await getCachedCredentials();
      const token = creds ? JSON.parse(creds.password)?.token : null;
      if (!token) throw new Error('Not authenticated');
      const body: any = {};
      if (editingEmail && email.trim()) body.email = email.trim();
      if (editingPassword && newPassword) body.password = newPassword;
      if (Object.keys(body).length === 0) return;
      const res = await fetch(
        'https://hub.instituteprojectmanagement.com/wp-json/wp/v2/users/me',
        {
          method: 'POST',
          headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
          body: JSON.stringify(body),
        },
      );
      if (res.ok) {
        setNewPassword('');
        setRepeatPassword('');
        if (editingEmail && email.trim()) setSavedEmail(email.trim());
        setEditingEmail(false);
        setEditingPassword(false);
        setShowNew(false);
        setShowRepeat(false);
        Alert.alert('Success', 'Your login information has been updated.');
      } else {
        const err = await res.json();
        Alert.alert('Error', err?.message || 'Could not save changes.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  // ── Log out ────────────────────────────────────────────────────────────────
  const handleLogout = () => setLogoutConfirmOpen(true);

  const handleBlockedMembers = () => navigation?.navigate?.('BlockedMembers');

  const handleConfirmLogout = async () => {
    setLogoutConfirmOpen(false);
    await logoutUser();
    navigation?.reset?.({index: 0, routes: [{name: 'SignIn'}]});
  };

  const loginSaveButton = (
    <TouchableOpacity
      style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
      onPress={handleSaveLoginInfo}
      disabled={saving}
      activeOpacity={0.85}>
      {saving ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <Text style={styles.saveBtnText}>{'Save  Changes'}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── App-wide header (chevrons, logo, envelope, bell, avatar) ── */}
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      {/* ── Page title ── */}
      <View style={styles.pageTitleWrap}>
        <Text style={styles.pageTitle}>{'Account Settings'}</Text>
      </View>

      {/* ── Tab Bar ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'login' && styles.tabActive]}
          onPress={() => setActiveTab('login')}
          activeOpacity={0.8}>
          <View style={styles.tabInner}>
            <GearIcon color={activeTab === 'login' ? '#FFFFFF' : NAVY} />
            <Text style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}>
              {'Login Information'}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.tabActive]}
          onPress={() => setActiveTab('notifications')}
          activeOpacity={0.8}>
          <View style={styles.tabInner}>
            <BellIcon size={12} color={activeTab === 'notifications' ? '#FFFFFF' : NAVY} />
            <Text style={[styles.tabText, activeTab === 'notifications' && styles.tabTextActive]}>
              {'Notification Settings'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[styles.scroll, styles.scrollWhite]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ══════════════════ LOGIN TAB ══════════════════ */}
        {/* One continuous layout — fields at top, account actions pinned to
            the bottom via justifyContent: 'space-between', per the Figma
            frame spec (390×694, padding 0 16, column, space-between). */}
        {activeTab === 'login' && (
          <View style={styles.loginWrap}>
            {/* ── Login Information card (read-only rows + Change buttons) ── */}
            <View style={styles.loginCard}>
              <Text style={styles.cardTitle}>{'Login Information'}</Text>
              <Text style={styles.cardSubtitle}>
                {'Manage the email and password you use to sign in.'}
              </Text>
              {pendingEmail ? (
                <View style={styles.pendingBanner}>
                  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={styles.pendingIcon}>
                    <Circle cx={8.0013} cy={8.00033} r={7.33333} fill="#46B0E3" />
                    <Path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M6.42267 7.20901C6.42267 6.84082 6.72115 6.54235 7.08934 6.54235H8.00053C8.36872 6.54235 8.6672 6.84082 8.6672 7.20901V10.3135H9.47111C9.8393 10.3135 10.1378 10.612 10.1378 10.9802C10.1378 11.3484 9.8393 11.6469 9.47111 11.6469H6.52995C6.16176 11.6469 5.86328 11.3484 5.86328 10.9802C5.86328 10.612 6.16176 10.3135 6.52995 10.3135H7.33386V7.87568H7.08934C6.72115 7.87568 6.42267 7.5772 6.42267 7.20901Z"
                      fill="#FFFFFF"
                    />
                    <Path
                      d="M8.82227 5.22584C8.82227 5.70761 8.43172 6.09816 7.94995 6.09816C7.46818 6.09816 7.07763 5.70761 7.07763 5.22584C7.07763 4.74407 7.46818 4.35352 7.94995 4.35352C8.43172 4.35352 8.82227 4.74407 8.82227 5.22584Z"
                      fill="#FFFFFF"
                    />
                  </Svg>
                  <View style={styles.pendingTextWrap}>
                    <Text style={styles.pendingTitle}>{'Confirm your new email'}</Text>
                    <Text style={styles.pendingBody}>
                      {`We sent a link to ${pendingEmail}. Your current email keeps working until you confirm.`}
                    </Text>
                    <View style={styles.pendingActions}>
                      <TouchableOpacity
                        onPress={handleResendPending}
                        disabled={!!pendingBusy}
                        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                        <Text style={styles.pendingAction}>{pendingBusy === 'resend' ? 'Sending…' : 'Resend link'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleCancelPending}
                        disabled={!!pendingBusy}
                        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                        <Text style={styles.pendingAction}>{pendingBusy === 'cancel' ? 'Cancelling…' : 'Cancel change'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.cardDivider} />
              )}

              {/* Email address */}
              <View style={styles.infoRow}>
                <View style={styles.infoRowTop}>
                  <View style={styles.infoTextWrap}>
                    <Text style={styles.infoLabel}>{'Email address'}</Text>
                    {!editingEmail &&
                      (loadingEmail ? (
                        <ActivityIndicator size="small" color={NAVY} style={styles.infoLoader} />
                      ) : (
                        <>
                          <Text style={styles.infoValue} numberOfLines={1}>{savedEmail}</Text>
                          {!!pendingEmail && (
                            <Text style={styles.infoPending} numberOfLines={1}>{`Pending: ${pendingEmail}`}</Text>
                          )}
                        </>
                      ))}
                  </View>
                  {showEmailChange && (
                    <TouchableOpacity
                      style={styles.changeBtn}
                      onPress={() => navigation?.navigate?.('ChangeEmail', {currentEmail: savedEmail})}
                      disabled={loadingEmail}
                      activeOpacity={0.8}>
                      <Text style={styles.changeBtnText}>{'Change'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {isApplePrivateRelay(savedEmail) && (
                  <Text style={styles.hintText}>
                    {'Hidden by Apple. Manage it in iPhone Settings › your name › Sign in with Apple.'}
                  </Text>
                )}
                {editingEmail && (
                  <View style={styles.editArea}>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleSaveLoginInfo}
                      placeholderTextColor="#C0C0C0"
                    />
                    {loginSaveButton}
                  </View>
                )}
              </View>

              {needsPasswordSetup ? (
                // Design D: the account signs in with a social provider and has no
                // IPM Hub password yet.
                <View style={styles.providerBox}>
                  {loginInfo?.provider === 'google' && <GoogleIcon />}
                  {loginInfo?.provider === 'linkedin' && <LinkedInSquareIcon />}
                  {loginInfo?.provider === 'apple' && <AppleMark />}
                  <View style={styles.providerTextWrap}>
                    <Text style={styles.providerTitle}>
                      {`You sign in with ${PROVIDER_LABEL[loginInfo?.provider || ''] || 'a social account'}`}
                    </Text>
                    <Text style={styles.providerBody}>
                      {`Your IPM Hub account uses your ${PROVIDER_LABEL[loginInfo?.provider || ''] || 'social'} sign-in, so you don't have an IPM Hub password.`}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.cardDivider} />
              )}

              {/* Password — hidden for provider accounts until the set-password endpoint exists (Design H) */}
              {(!needsPasswordSetup || canSetPassword) && (
              <View style={styles.infoRow}>
                <View style={styles.infoRowTop}>
                  <View style={styles.infoTextWrap}>
                    <Text style={styles.infoLabel}>{'Password'}</Text>
                    {!editingPassword && (
                      <Text style={styles.infoValue}>{needsPasswordSetup ? 'No password yet' : '••••••••'}</Text>
                    )}
                    {canSetPassword && (
                      <Text style={styles.passwordHint}>{'Set one to also sign in with your email.'}</Text>
                    )}
                  </View>
                  {showPasswordButton && (
                    <TouchableOpacity
                      style={styles.changeBtn}
                      onPress={() =>
                        canSetPassword
                          ? navigation?.navigate?.('SetPassword', {provider: loginInfo?.provider})
                          : navigation?.navigate?.('ChangePassword')
                      }
                      activeOpacity={0.8}>
                      <Text style={styles.changeBtnText}>{canSetPassword ? 'Set Password' : 'Change'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {editingPassword && (
                  <View style={styles.editArea}>
                    <Text style={styles.fieldLabel}>{'Add Your New Password'}</Text>
                    <View style={styles.passRow}>
                      <TextInput
                        ref={newPassRef}
                        style={styles.passInput}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNew}
                        autoFocus
                        placeholderTextColor="#C0C0C0"
                        returnKeyType="next"
                        onSubmitEditing={() => repeatPassRef.current?.focus()}
                      />
                      <TouchableOpacity
                        onPress={() => setShowNew(p => !p)}
                        style={styles.eyeBtn}
                        hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
                        {showNew ? <EyeOpenIcon /> : <EyeClosedIcon />}
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.fieldLabel}>{'Repeat Your New Password'}</Text>
                    <View style={styles.passRow}>
                      <TextInput
                        ref={repeatPassRef}
                        style={styles.passInput}
                        value={repeatPassword}
                        onChangeText={setRepeatPassword}
                        secureTextEntry={!showRepeat}
                        placeholderTextColor="#C0C0C0"
                        returnKeyType="done"
                        onSubmitEditing={handleSaveLoginInfo}
                      />
                      <TouchableOpacity
                        onPress={() => setShowRepeat(p => !p)}
                        style={styles.eyeBtn}
                        hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
                        {showRepeat ? <EyeOpenIcon /> : <EyeClosedIcon />}
                      </TouchableOpacity>
                    </View>
                    {loginSaveButton}
                  </View>
                )}
              </View>
              )}
            </View>

            {/* ── Account actions (design order) ── */}
            <View style={styles.actionsGroup}>
              <TouchableOpacity style={styles.actionRow} onPress={handleBlockedMembers} activeOpacity={0.7}>
                <BlockIcon />
                <Text style={styles.actionLabel}>{'Blocked Members'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => navigation?.navigate?.('DeleteAccount')}
                activeOpacity={0.7}>
                <DeleteIcon />
                <Text style={styles.deleteLabel}>{'Delete Account'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionRow} onPress={handleLogout} activeOpacity={0.7}>
                <LogoutIcon />
                <Text style={styles.actionLabel}>{'Log Out'}</Text>
                <Text style={styles.actionEmail} numberOfLines={1}>{emailForDisplay(savedEmail)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => navigation?.navigate?.('PrivacyPolicy')}
                activeOpacity={0.7}>
                <PrivacyIcon />
                <Text style={styles.actionLabel}>{'Privacy Policy'}</Text>
              </TouchableOpacity>
              <Text style={styles.versionText}>{'1.01.01 VERSION'}</Text>
            </View>
          </View>
        )}

        {/* ══════════════════ NOTIFICATIONS TAB ══════════════════ */}
        {/* Channels / rows / groups with no backend key are hidden — see
            NOTIFICATION_GROUPS above. Toggles save on tap (no Save button). */}
        {activeTab === 'notifications' && (
          <View style={styles.notifCard}>
            <View>
              <Text style={styles.sectionHeading}>{'Notification Settings'}</Text>
              <Text style={styles.notifSubtitle}>
                {'Choose how IPM Hub keeps you posted. Changes are saved automatically.'}
              </Text>
            </View>

            {loadingNotif ? (
              <ActivityIndicator color={NAVY} style={{marginVertical: 20}} />
            ) : (
              <>
                {/* ── Channel legend (only channels that exist) ── */}
                <View style={styles.channelLegend}>
                  {LEGEND_CHANNELS.map(ch => (
                    <View key={ch} style={styles.legendItem}>
                      <View style={styles.legendIconCircle}>{CHANNEL_ICON[ch]()}</View>
                      <View style={styles.legendText}>
                        <Text style={styles.legendTitle}>{CHANNEL_LABEL[ch]}</Text>
                        <Text style={styles.legendDesc}>{CHANNEL_DESC[ch]}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* ── Master email switch (hidden until backend adds a key) ── */}
                {EMAIL_MASTER.key ? (
                  <View style={notifStyles.card}>
                    <View style={notifStyles.row}>
                      <View style={notifStyles.rowText}>
                        <Text style={notifStyles.rowTitle}>{EMAIL_MASTER.title}</Text>
                        <Text style={notifStyles.rowDesc}>{EMAIL_MASTER.description}</Text>
                      </View>
                      <Toggle
                        value={settingsMap[EMAIL_MASTER.key] === 'yes'}
                        onToggle={() => toggleSetting(EMAIL_MASTER.key as string)}
                        label={EMAIL_MASTER.title}
                      />
                    </View>
                  </View>
                ) : null}

                {VISIBLE_GROUPS.map(g => (
                  <NotifGroupCard key={g.id} group={g} settingsMap={settingsMap} onToggle={toggleSetting} />
                ))}
              </>
            )}
          </View>
        )}

        <View style={{height: 40}} />
      </ScrollView>

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />

      <LogoutConfirmDialog
        visible={logoutConfirmOpen}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={handleConfirmLogout}
      />

      {/* App-wide navy toast; keep it the last child so it sits on top. */}
      <SuccessToast visible={!!toast} message={toast || ''} onHide={() => setToast(null)} />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F2F4F7'},
  pageTitleWrap: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
  },
  pageTitle: {fontSize: 18, fontWeight: '700', color: '#192546', letterSpacing: 0.09},
  tabBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
  },
  tab: {
    flex: 1, paddingVertical: 9, paddingHorizontal: 6, borderRadius: 8,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D0D5DD',
    alignItems: 'center', justifyContent: 'center',
  },
  tabActive: {backgroundColor: NAVY, borderColor: NAVY},
  tabInner: {flexDirection: 'row', alignItems: 'center', gap: 5},
  tabText: {fontSize: 11, fontWeight: '600', color: NAVY},
  tabTextActive: {color: '#FFFFFF'},
  scroll: {flex: 1},
  scrollWhite: {backgroundColor: '#FFFFFF'},
  scrollContent: {flexGrow: 1, paddingVertical: 16},
  // Login Information tab — one continuous layout, no card border, fields
  // at top and account actions pinned to the bottom (space-between), per
  // the Figma frame spec (node 1502-21386: 390×694, padding 0 16, column,
  // space-between). paddingHorizontal now lives here (not on scrollContent)
  // so this frame's white background spans the full device width edge to
  // edge — previously scrollContent's own padding:16 boxed it in on both
  // sides, leaving visible grey gutters down the left/right of the screen.
  loginWrap: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  // ── Login Information card ──
  loginCard: {
    alignSelf: 'stretch',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
    padding: 16,
    borderRadius: 8.201,
    borderWidth: 1.367,
    borderColor: '#E8E9F1', // Neutral-Light-Medium
    backgroundColor: '#FFFFFF',
  },
  // Heading/H3 — IPM Dark Blue
  cardTitle: {
    alignSelf: 'stretch',
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.08,
    color: '#0C4D91',
  },
  // Body/Body S
  cardSubtitle: {
    alignSelf: 'stretch',
    fontFamily: 'Runda-Normal',
    fontSize: 12,
    lineHeight: 16,
    color: '#8F9098', // Neutral-Dark-Lightest
  },
  cardDivider: {alignSelf: 'stretch', height: 1, backgroundColor: '#E8E9F1'},
  infoRow: {alignSelf: 'stretch'},
  // Email / Password heading row: padding 12 0, gap 12, centered
  infoRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 12,
    paddingVertical: 12,
  },
  infoTextWrap: {flex: 1},
  infoLabel: {fontFamily: 'Runda-Medium', fontSize: 14, lineHeight: 18, color: DARK_NAVY},
  // Body/Body M, IPM Dark Grey
  infoValue: {fontFamily: 'Runda-Normal', fontSize: 14, lineHeight: 18, color: '#7C86A1', marginTop: 4},
  infoLoader: {alignSelf: 'flex-start', marginTop: 4},
  infoPending: {fontFamily: 'Runda-Normal', fontSize: 10, lineHeight: 14, color: '#8F9098', marginTop: 2}, // ESTIMATE
  // "Confirm your new email" banner — Figma spec: padding 16, row, flex-start,
  // gap 12, radius 5, 1px IPM Light Blue border, #EEF7FC fill.
  // (title/body text styles below are still ESTIMATES)
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    gap: 12,
    padding: 16,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#46B0E3',
    backgroundColor: '#EEF7FC',
  },
  pendingIcon: {marginTop: 1},
  pendingTextWrap: {flex: 1, gap: 2},
  // "You sign in with Google" box (Figma D): padding 12, row, flex-start, gap 12,
  // stretch, radius 5, Neutral-Light-Light #F8F9FE.
  providerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    gap: 12,
    padding: 12,
    borderRadius: 5,
    backgroundColor: '#F8F9FE',
  },
  providerTextWrap: {flex: 1, gap: 4},
  // Heading/H4 — Runda 14 / 500, Navy
  providerTitle: {fontFamily: 'Runda-Medium', fontSize: 14, fontWeight: '500', color: DARK_NAVY},
  // Body/Body S — Runda 12 / 400 / 16, Neutral Dark Lightest
  providerBody: {fontFamily: 'Runda-Normal', fontSize: 12, fontWeight: '400', lineHeight: 16, color: '#8F9098'},
  // Body/Body S under "No password yet"
  passwordHint: {fontFamily: 'Runda-Normal', fontSize: 12, fontWeight: '400', lineHeight: 16, color: '#8F9098', marginTop: 2},
  // Resend / Cancel links under the banner text — ESTIMATE (Action M link blue)
  pendingActions: {flexDirection: 'row', gap: 16, marginTop: 8},
  pendingAction: {fontFamily: 'Runda-Medium', fontSize: 12, lineHeight: 16, color: '#46B0E3'},
  pendingTitle: {fontFamily: 'Runda-Medium', fontSize: 12, lineHeight: 16, color: DARK_NAVY},
  pendingBody: {fontFamily: 'Runda-Normal', fontSize: 10, lineHeight: 14, color: '#5B6475'},
  changeBtn: {
    height: 36,
    paddingVertical: 0,
    paddingHorizontal: 16,
    gap: 8,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: NAVY,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBtnText: {fontFamily: 'Runda-Medium', fontSize: 12, lineHeight: 16, color: NAVY, includeFontPadding: false, textAlignVertical: 'center'},
  editArea: {paddingBottom: 12},
  sectionHeading: {fontSize: 15, fontWeight: '700', color: NAVY, marginBottom: 6},
  // Outer card from the Figma spec: padding 16, column, gap 16, 8.2 radius,
  // 1.367 #E8E9F1 border, white. Everything on the tab sits inside it.
  notifCard: {
    marginHorizontal: 16,
    padding: 16,
    gap: 16,
    alignSelf: 'stretch',
    borderRadius: 8.201,
    borderWidth: 1.367,
    borderColor: '#E8E9F1',
    backgroundColor: '#FFFFFF',
  },
  notifSubtitle: {fontSize: 12, color: '#555', lineHeight: 17},

  // ── Channel legend ──
  // Card + row + item tokens straight from the Figma spec.
  channelLegend: {flexDirection: 'row', alignItems: 'flex-start', alignSelf: 'stretch', gap: 16},
  legendItem: {flex: 1, flexDirection: 'row', alignItems: 'flex-start', alignSelf: 'stretch', gap: 9.276},
  legendIconCircle: {
    width: 23.19,
    height: 23.19,
    padding: 3.092,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 82.822,
    backgroundColor: '#EEF7FC',
  },
  legendText: {flex: 1},
  legendTitle: {fontSize: 12, fontWeight: '600', color: NAVY},
  legendDesc: {fontSize: 10, color: '#888', lineHeight: 13, marginTop: 2},

  // ── Login fields ──
  fieldLabel: {fontSize: 13, fontWeight: '500', color: '#333', marginBottom: 6},
  input: {
    backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, color: '#222', marginBottom: 12,
  },
  inputSkeleton: {
    backgroundColor: '#F5F5F5', borderRadius: 10, height: 46,
    marginBottom: 12, alignItems: 'center', justifyContent: 'center',
  },

  // ── Hint row (exclamation icon block + text) — no border, per spec ──
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  hintIconBox: {
    width: 30,
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DARK_NAVY,
  },
  hintText: {
    fontFamily: 'Runda-Normal',
    fontSize: 12,
    lineHeight: 16,
    color: '#8F9098',
    marginTop: 4,
    marginBottom: 12,
  },

  passRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA',
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    paddingHorizontal: 14, marginBottom: 14,
  },
  passInput: {flex: 1, paddingVertical: 13, fontSize: 14, color: '#222'},
  eyeBtn: {padding: 4, justifyContent: 'center', alignItems: 'center'},
  saveBtn: {
    backgroundColor: NAVY, borderRadius: 30,
    paddingVertical: 15, alignItems: 'center', marginTop: 6,
  },
  saveBtnDisabled: {opacity: 0.6},
  saveBtnText: {color: '#FFFFFF', fontSize: 15, fontWeight: '700'},

  // ── Log Out / Privacy Policy rows — no borders, pinned to screen bottom ──
  actionsGroup: {
    alignSelf: 'stretch',
    marginTop: 8,
    paddingBottom: 8,
  },
  actionRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
  },
  actionLabel: {
    fontFamily: 'Runda-Medium',
    fontSize: 12,
    color: DARK_NAVY,
  },
  actionEmail: {
    flex: 1,
    fontFamily: 'Runda-Normal',
    fontSize: 12,
    lineHeight: 16,
    color: '#8F9098',
    textAlign: 'right',
  },
  deleteLabel: {
    fontFamily: 'Runda-Medium',
    fontSize: 12,
    color: ERROR_RED,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#B0B0B0',
    marginTop: 14,
  },
});

export default AccountSettingsScreen;
