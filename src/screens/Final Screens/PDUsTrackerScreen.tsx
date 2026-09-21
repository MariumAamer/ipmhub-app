/* eslint-disable prettier/prettier */
/**
 * PDUsTrackerScreen.tsx — "My PDUs / Your CPD Records"
 *
 * Data comes entirely from GET /wp-json/custom/v1/my-pdus?user_id={id}
 * (confirmed shape — see pdusApi.ts for full notes/caveats).
 *
 * ASSUMPTIONS FLAGGED FOR CONFIRMATION:
 * - Activity Type / Year filtering is done CLIENT-SIDE against the
 *   already-fetched `records` array. The GET endpoint was only ever
 *   tested as `?user_id=52` — no query params for filtering were
 *   confirmed, so this does not assume the backend supports them.
 *   `filters.activity_types` / `filters.start_years` (from the response)
 *   populate the two filter sheets, since those are the values that
 *   actually exist in this user's records — NOT the full `activity_types`
 *   picklist (that one's for the Add/Edit form's type picker).
 * - "Showing X to Y of Z entries" is computed from the local filtered
 *   list (no pagination endpoint was given) — X is always 1, Y/Z is the
 *   filtered count. Revisit if real pagination shows up later.
 * - The IPMA-variant header (donut chart + CPD Requirements block) is
 *   NOT implemented — summary.type is confirmed "NON-IPMA" for the
 *   current test user with summary.ipma: null. This screen always
 *   renders the NON-IPMA header. Flag before this ships if IPMA members
 *   are expected to hit this screen too.
 * - "Download CPD Record (.xls)" has no confirmed endpoint yet — the
 *   button is present per the Figma spec but shows a "coming soon" alert
 *   rather than fabricating a request. Swap in the real endpoint once
 *   Robby confirms it.
 */
import React, {useCallback, useEffect, useState} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Modal, Animated, Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path, Circle} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import {getUserIdFromToken} from '../api/profileApi';
import {
  getMyPdus, deletePduRecord, MyPdusResponse, PduRecord, PduSummary,
} from '../api/pdusApi';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

// Truncates at the last full word within maxChars, instead of relying on
// numberOfLines (which cuts mid-word — e.g. "...Keeping your recor..." —
// regardless of screen width, since line count depends on the device's
// actual rendered width, not a fixed char budget).
const truncateAtWord = (text: string, maxChars: number): string => {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxChars)}\u2026`;
};

// ─── Design tokens ────────────────────────────────────────────────────────
const C = {
  navy: '#192546',
  blue: '#46B0E3',
  blueDark: '#0C4D91',
  lightBlueBg: '#EEF7FC',
  navyLighterText: '#71727A',
  border: '#E8E9F1',
  grey: '#8F9098',
  headerRowBg: '#F8F9FE',
  white: '#FFFFFF',
  errorRed: '#EF5350',
};

// ─── Icons ──────────────────────────────────────────────────────────────────

const UpArrowIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M11.5303 9.27407C11.2374 9.57509 10.7626 9.57509 10.4697 9.27407L6.00013 4.68024L1.53057 9.27407C1.23768 9.57509 0.762819 9.57509 0.469933 9.27407C0.177046 8.97304 0.177046 8.48497 0.469933 8.18394L6.00013 2.5L11.5303 8.18394C11.8232 8.48497 11.8232 8.97304 11.5303 9.27407Z"
      fill={C.blue}
    />
  </Svg>
);

const DownArrowIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M11.5303 2.72593C11.2374 2.42491 10.7626 2.42491 10.4697 2.72593L6.00013 7.31976L1.53057 2.72593C1.23768 2.42491 0.762819 2.42491 0.469933 2.72593C0.177046 3.02696 0.177046 3.51503 0.469933 3.81606L6.00013 9.5L11.5303 3.81606C11.8232 3.51503 11.8232 3.02696 11.5303 2.72593Z"
      fill={C.blue}
    />
  </Svg>
);

const FilterChevron = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M11.0857 2.62081C10.8041 2.33138 10.3475 2.33138 10.0659 2.62081L5.76862 7.03758L1.47132 2.62081C1.18972 2.33138 0.733164 2.33138 0.451566 2.62081C0.169968 2.91024 0.169968 3.37949 0.451566 3.66892L5.76862 9.13379L11.0857 3.66892C11.3673 3.37949 11.3673 2.91024 11.0857 2.62081Z"
      fill={C.grey}
    />
  </Svg>
);

const ActivityTypeIcon = () => (
  <Svg width={23} height={23} viewBox="0 0 23 23" fill="none">
    <Path d="M3.75267 7.50533C4.27083 7.50533 4.69088 7.08528 4.69088 6.56712C4.69088 6.04896 4.27083 5.62891 3.75267 5.62891C3.23451 5.62891 2.81445 6.04896 2.81445 6.56712C2.81445 7.08528 3.23451 7.50533 3.75267 7.50533Z" fill={C.blueDark} />
    <Path d="M3.75267 12.1977C4.27083 12.1977 4.69088 11.7777 4.69088 11.2595C4.69088 10.7413 4.27083 10.3213 3.75267 10.3213C3.23451 10.3213 2.81445 10.7413 2.81445 11.2595C2.81445 11.7777 3.23451 12.1977 3.75267 12.1977Z" fill={C.blueDark} />
    <Path d="M3.75267 16.8872C4.27083 16.8872 4.69088 16.4671 4.69088 15.949C4.69088 15.4308 4.27083 15.0107 3.75267 15.0107C3.23451 15.0107 2.81445 15.4308 2.81445 15.949C2.81445 16.4671 3.23451 16.8872 3.75267 16.8872Z" fill={C.blueDark} />
    <Path fillRule="evenodd" clipRule="evenodd" d="M6.56836 16.1706C6.56836 16.0061 6.63369 15.8484 6.74998 15.7321C6.86627 15.6158 7.024 15.5505 7.18846 15.5505H18.3502C18.5147 15.5505 18.6724 15.6158 18.7887 15.7321C18.905 15.8484 18.9703 16.0061 18.9703 16.1706C18.9703 16.335 18.905 16.4928 18.7887 16.6091C18.6724 16.7254 18.5147 16.7907 18.3502 16.7907H7.18846C7.024 16.7907 6.86627 16.7254 6.74998 16.6091C6.63369 16.4928 6.56836 16.335 6.56836 16.1706ZM6.56836 11.2098C6.56836 11.0453 6.63369 10.8876 6.74998 10.7713C6.86627 10.655 7.024 10.5897 7.18846 10.5897H18.3502C18.5147 10.5897 18.6724 10.655 18.7887 10.7713C18.905 10.8876 18.9703 11.0453 18.9703 11.2098C18.9703 11.3743 18.905 11.532 18.7887 11.6483C18.6724 11.7646 18.5147 11.8299 18.3502 11.8299H7.18846C7.024 11.8299 6.86627 11.7646 6.74998 11.6483C6.63369 11.532 6.56836 11.3743 6.56836 11.2098ZM6.56836 6.24901C6.56836 6.08454 6.63369 5.92682 6.74998 5.81053C6.86627 5.69424 7.024 5.62891 7.18846 5.62891H18.3502C18.5147 5.62891 18.6724 5.69424 18.7887 5.81053C18.905 5.92682 18.9703 6.08454 18.9703 6.24901C18.9703 6.41347 18.905 6.57119 18.7887 6.68748C18.6724 6.80377 18.5147 6.8691 18.3502 6.8691H7.18846C7.024 6.8691 6.86627 6.80377 6.74998 6.68748C6.63369 6.57119 6.56836 6.41347 6.56836 6.24901Z" fill={C.blueDark} />
  </Svg>
);

const YearIcon = () => (
  <Svg width={23} height={23} viewBox="0 0 23 23" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M17.6971 3.36332H16.2108V1.87695H15.2204V3.36332H7.29755V1.87695H6.3072V3.36332H4.82249C3.45746 3.36332 2.3457 4.47417 2.3457 5.84012V17.23C2.3457 18.5951 3.45655 19.7068 4.82249 19.7068H17.6972C19.0623 19.7068 20.174 18.596 20.174 17.23L20.1732 8.31522V5.83842C20.1724 4.47339 19.0615 3.36332 17.6973 3.36332H17.6971ZM19.1822 17.2287C19.1822 18.0474 18.5162 18.7134 17.6975 18.7134H4.82273C4.00239 18.7134 3.33636 18.0474 3.33636 17.2287V8.31536H19.1821L19.1822 17.2287ZM3.33636 7.32548H19.1821L19.1821 5.83908C19.1821 5.01957 18.5161 4.35438 17.6974 4.35438H16.211V5.34474H15.2207V4.35438H7.29781V5.34309H6.3091V4.35274H4.82273C4.00237 4.35274 3.33636 5.01959 3.33636 5.83911V7.32548Z" fill={C.blueDark} />
  </Svg>
);

const TickIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Circle cx={9} cy={9} r={8.25} fill={C.blueDark} />
    <Path d="M12.5934 6.62372C12.3015 6.30928 11.8175 6.30439 11.5198 6.61368L8.16743 10.0966L6.47979 8.34328C6.1821 8.03399 5.69813 8.03889 5.4062 8.35332C5.12151 8.65995 5.12544 9.14761 5.41569 9.44916L8.16743 12.3081L12.5839 7.71956C12.8742 7.418 12.8781 6.93034 12.5934 6.62372Z" fill="#FFFFFF" />
  </Svg>
);

const EditIcon = () => (
  <Svg width={11} height={11} viewBox="0 0 11 11" fill="none">
    <Path
      d="M1.32503 1.79163C1.13176 1.79163 0.975083 1.9483 0.975083 2.14157V8.67391C0.975083 8.86719 1.13176 9.02386 1.32503 9.02386H7.85737C8.05064 9.02386 8.20732 8.86719 8.20732 8.67391V5.40774C8.20732 5.08563 8.46845 4.8245 8.79056 4.8245C9.11268 4.8245 9.37381 5.08563 9.37381 5.40774V8.67391C9.37381 9.51142 8.69488 10.1904 7.85737 10.1904H1.32503C0.487526 10.1904 -0.191406 9.51142 -0.191406 8.67391V2.14157C-0.191406 1.30407 0.487526 0.625136 1.32503 0.625136H4.5912C4.91332 0.625136 5.17445 0.886264 5.17445 1.20838C5.17445 1.5305 4.91332 1.79163 4.5912 1.79163H1.32503Z M5.56857 6.01469L8.90372 2.67954L7.31959 1.09541L3.98444 4.43056C3.93853 4.47653 3.90591 4.53407 3.89005 4.59708L3.5204 6.47873L5.40169 6.10908C5.46486 6.09329 5.52264 6.06063 5.56857 6.01469ZM9.98038 1.60288C10.1149 1.46828 10.1905 1.28574 10.1905 1.09541C10.1905 0.905084 10.1149 0.722548 9.98038 0.587945L9.41119 0.0187488C9.27658 -0.115813 9.09405 -0.191406 8.90372 -0.191406C8.71339 -0.191406 8.53086 -0.115813 8.39625 0.0187488L7.82706 0.587945L9.41119 2.17208L9.98038 1.60288Z"
      fill={C.grey}
    />
  </Svg>
);

const DeleteIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path d="M10.9716 2.77734C11.2017 2.77734 11.3882 2.96389 11.3882 3.19401C11.3882 3.42413 11.2017 3.61068 10.9716 3.61068H2.08268C1.85256 3.61068 1.66602 3.42413 1.66602 3.19401C1.66602 2.96389 1.85256 2.77734 2.08268 2.77734H10.9716Z" fill={C.grey} />
    <Path d="M10.862 2.77734L10.3287 10.777C10.2849 11.4336 9.73946 11.944 9.08138 11.944H3.97396C3.31588 11.944 2.77045 11.4336 2.72667 10.777L2.19336 2.77734H10.862ZM3.55838 10.7217C3.57297 10.9406 3.7546 11.1107 3.97396 11.1107H9.08138C9.30074 11.1107 9.48237 10.9406 9.49696 10.7217L9.97114 3.61068H3.0842L3.55838 10.7217Z" fill={C.grey} />
    <Path d="M5.0001 8.75022V5.97244C5.0001 5.74232 5.18665 5.55577 5.41677 5.55577C5.64689 5.55577 5.83344 5.74232 5.83344 5.97244V8.75022C5.83344 8.98034 5.64689 9.16688 5.41677 9.16688C5.18665 9.16688 5.0001 8.98034 5.0001 8.75022ZM7.22233 8.75022V5.97244C7.22233 5.74232 7.40887 5.55577 7.63899 5.55577C7.86911 5.55577 8.05566 5.74232 8.05566 5.97244V8.75022C8.05566 8.98034 7.86911 9.16688 7.63899 9.16688C7.40887 9.16688 7.22233 8.98034 7.22233 8.75022ZM7.59396 1.11133C8.13193 1.11135 8.60976 1.45549 8.77994 1.96582L9.14561 3.06283C9.21838 3.28114 9.10025 3.5174 8.88194 3.59017C8.66363 3.66294 8.42737 3.54481 8.3546 3.3265L7.98947 2.22949C7.93276 2.05936 7.77329 1.94468 7.59396 1.94466H5.4618C5.28247 1.94468 5.123 2.05936 5.06629 2.22949L4.70117 3.3265C4.6284 3.54481 4.39213 3.66294 4.17382 3.59017C3.95551 3.5174 3.83738 3.28114 3.91015 3.06283L4.27582 1.96582C4.446 1.45549 4.92383 1.11135 5.4618 1.11133H7.59396Z" fill={C.grey} />
  </Svg>
);

const ArticleIcon = () => (
  <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
    <Path d="M15.8534 3.46806V10.8991C15.8534 11.4247 16.0622 11.9287 16.4338 12.3003C16.8054 12.672 17.3095 12.8807 17.835 12.8807H25.2661M25.7615 13.7013V25.7613C25.7615 26.5496 25.4483 27.3056 24.8909 27.8631C24.3334 28.4205 23.5774 28.7337 22.7891 28.7337H8.91774C8.1294 28.7337 7.37335 28.4205 6.81592 27.8631C6.25848 27.3056 5.94531 26.5496 5.94531 25.7613V5.94508C5.94531 5.15675 6.25848 4.4007 6.81592 3.84326C7.37335 3.28582 8.1294 2.97266 8.91774 2.97266H15.0329C15.5583 2.97274 16.0621 3.18144 16.4336 3.5529L25.1812 12.3005C25.5527 12.672 25.7614 13.1759 25.7615 13.7013Z" stroke={C.blueDark} strokeWidth={1.98162} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const StartDateIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path d="M3.375 10.875C2.85 10.875 2.40625 10.6937 2.04375 10.3312C1.68125 9.96875 1.5 9.525 1.5 9C1.5 8.475 1.68125 8.03125 2.04375 7.66875C2.40625 7.30625 2.85 7.125 3.375 7.125C3.7625 7.125 4.1125 7.23125 4.425 7.44375C4.7375 7.65625 4.9625 7.925 5.1 8.25H16.5V9.75H5.1C4.9625 10.075 4.7375 10.3437 4.425 10.5562C4.1125 10.7687 3.7625 10.875 3.375 10.875Z" fill={C.blue} />
  </Svg>
);

const EndDateIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path d="M14.625 10.875C14.2375 10.875 13.8875 10.7687 13.575 10.5562C13.2625 10.3437 13.0375 10.075 12.9 9.75H1.5V8.25H12.9C13.0375 7.925 13.2625 7.65625 13.575 7.44375C13.8875 7.23125 14.2375 7.125 14.625 7.125C15.15 7.125 15.5938 7.30625 15.9562 7.66875C16.3187 8.03125 16.5 8.475 16.5 9C16.5 9.525 16.3187 9.96875 15.9562 10.3312C15.5938 10.6937 15.15 10.875 14.625 10.875Z" fill={C.blue} />
  </Svg>
);

const HoursIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path d="M9 15.75C12.7279 15.75 15.75 12.7279 15.75 9C15.75 5.27208 12.7279 2.25 9 2.25C5.27208 2.25 2.25 5.27208 2.25 9C2.25 12.7279 5.27208 15.75 9 15.75Z" stroke={C.blue} strokeWidth={1.125} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8.25 6V9.75H12" stroke={C.blue} strokeWidth={1.125} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ViewFileIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M10.834 7.50033H15.4173L10.834 2.91699V7.50033ZM5.00065 1.66699H11.6673L16.6673 6.66699V16.667C16.6673 17.109 16.4917 17.5329 16.1792 17.8455C15.8666 18.1581 15.4427 18.3337 15.0007 18.3337H5.00065C4.55862 18.3337 4.1347 18.1581 3.82214 17.8455C3.50958 17.5329 3.33398 17.109 3.33398 16.667V3.33366C3.33398 2.89163 3.50958 2.46771 3.82214 2.15515C4.1347 1.84259 4.55862 1.66699 5.00065 1.66699ZM9.10898 10.367C9.45065 11.117 9.88398 11.7337 10.384 12.1587L10.7257 12.4253C10.0007 12.5587 9.00065 12.792 7.94232 13.2003L7.85065 13.2337L8.26732 12.367C8.64232 11.642 8.91732 10.9837 9.10898 10.367ZM14.509 13.542C14.659 13.392 14.734 13.2003 14.7423 12.992C14.7673 12.8253 14.7257 12.667 14.6423 12.5337C14.4007 12.142 13.7757 11.9587 12.7423 11.9587L11.6673 12.017L10.9423 11.5337C10.4173 11.1003 9.94232 10.342 9.60898 9.40033L9.64232 9.28366C9.91732 8.17533 10.1757 6.83366 9.62565 6.28366C9.55838 6.21833 9.4788 6.16702 9.39154 6.13268C9.30428 6.09835 9.21107 6.08169 9.11732 6.08366H8.91732C8.60898 6.08366 8.33398 6.40866 8.25898 6.72533C7.95065 7.83366 8.13398 8.44199 8.44232 9.45033V9.45866C8.23398 10.192 7.96732 11.042 7.54232 11.9003L6.74232 13.4003L6.00065 13.8087C5.00065 14.4337 4.52565 15.1337 4.43398 15.5753C4.40065 15.7337 4.41732 15.8753 4.47565 16.0253L4.50065 16.067L4.90065 16.3253L5.26732 16.417C5.94232 16.417 6.70898 15.6253 7.74232 13.8587L7.89232 13.8003C8.75065 13.5253 9.81732 13.3337 11.2507 13.1753C12.109 13.6003 13.1173 13.792 13.7507 13.792C14.1173 13.792 14.3673 13.7003 14.509 13.542ZM14.1673 12.9503L14.2423 13.042C14.234 13.1253 14.209 13.1337 14.1673 13.1503H14.134L13.9757 13.167C13.5923 13.167 13.0007 13.0087 12.3923 12.742C12.4673 12.6587 12.5007 12.6587 12.584 12.6587C13.7507 12.6587 14.084 12.867 14.1673 12.9503ZM6.52565 14.167C5.98398 15.1587 5.49232 15.7087 5.11732 15.8337C5.15898 15.517 5.53398 14.967 6.12565 14.4253L6.52565 14.167ZM9.04232 8.40866C8.85065 7.65866 8.84232 7.05033 8.98398 6.70033L9.04232 6.60033L9.16732 6.64199C9.30898 6.84199 9.32565 7.10866 9.24232 7.55866L9.21732 7.69199L9.08398 8.37533L9.04232 8.40866Z" fill={C.errorRed} />
  </Svg>
);

// No SVG was given for the "Description" row specifically (only its size —
// 18x18 — was specced). Using a plain generic lines glyph as a placeholder;
// swap in the real icon once Marium shares it.
const DescriptionIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path d="M3.75 5.25H14.25M3.75 9H14.25M3.75 12.75H10.5" stroke={C.blue} strokeWidth={1.125} strokeLinecap="round" />
  </Svg>
);

const NoRecordsIcon = () => (
  <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
    <Path d="M15.8534 3.46806V10.8991C15.8534 11.4247 16.0622 11.9287 16.4338 12.3003C16.8054 12.672 17.3095 12.8807 17.835 12.8807H25.2661M25.7615 13.7013V25.7613C25.7615 26.5496 25.4483 27.3056 24.8909 27.8631C24.3334 28.4205 23.5774 28.7337 22.7891 28.7337H8.91774C8.1294 28.7337 7.37335 28.4205 6.81592 27.8631C6.25848 27.3056 5.94531 26.5496 5.94531 25.7613V5.94508C5.94531 5.15675 6.25848 4.4007 6.81592 3.84326C7.37335 3.28582 8.1294 2.97266 8.91774 2.97266H15.0329C15.5583 2.97274 16.0621 3.18144 16.4336 3.5529L25.1812 12.3005C25.5527 12.672 25.7614 13.1759 25.7615 13.7013Z" stroke={C.blueDark} strokeWidth={1.98162} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const DeadlineIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 23 23" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M17.6971 3.36332H16.2108V1.87695H15.2204V3.36332H7.29755V1.87695H6.3072V3.36332H4.82249C3.45746 3.36332 2.3457 4.47417 2.3457 5.84012V17.23C2.3457 18.5951 3.45655 19.7068 4.82249 19.7068H17.6972C19.0623 19.7068 20.174 18.596 20.174 17.23L20.1732 8.31522V5.83842C20.1724 4.47339 19.0615 3.36332 17.6973 3.36332H17.6971ZM19.1822 17.2287C19.1822 18.0474 18.5162 18.7134 17.6975 18.7134H4.82273C4.00239 18.7134 3.33636 18.0474 3.33636 17.2287V8.31536H19.1821L19.1822 17.2287ZM3.33636 7.32548H19.1821L19.1821 5.83908C19.1821 5.01957 18.5161 4.35438 17.6974 4.35438H16.211V5.34474H15.2207V4.35438H7.29781V5.34309H6.3091V4.35274H4.82273C4.00237 4.35274 3.33636 5.01959 3.33636 5.83911V7.32548Z" fill={C.blueDark} />
  </Svg>
);

// Simple circular progress ring (percentage-based) for the IPMA "PDU
// Required vs PDU Completed" summary. No exact colors/dimensions were
// given for this — using the existing design tokens (blueDark for
// progress, a light neutral track) at a size that fits comfortably next
// to the legend text. Adjust if Marium shares exact Figma values later.
// Layered donut, scaled from Marium's exact SVG measurements:
//   outer track ring:  diameter 160.657, strokeWidth 25.9835, #E8E9F1
//   base "required" ring (full circle): diameter 131.447, strokeWidth 15.3523, #0C4D91
//   "completed" progress arc: same radius/strokeWidth as the base ring, #46B0E3,
//     drawn as a percentage-driven arc on top (rounded cap, starting at 12 o'clock)
const DONUT_SIZE = 140;
const DONUT_SCALE = DONUT_SIZE / 160.657;
const OUTER_BOUNDARY_R = 80.3286 * DONUT_SCALE;
const OUTER_STROKE = 25.9835 * DONUT_SCALE;
const OUTER_CENTERLINE_R = OUTER_BOUNDARY_R - OUTER_STROKE / 2;
const BASE_BOUNDARY_R = 65.7234 * DONUT_SCALE;
const BASE_STROKE = 15.3523 * DONUT_SCALE;
const BASE_CENTERLINE_R = BASE_BOUNDARY_R - BASE_STROKE / 2;

const DonutChart = ({percentage, centerValue}: {percentage: number; centerValue: number}) => {
  const clamped = Math.max(0, Math.min(100, percentage));
  const outerCircumference = 2 * Math.PI * OUTER_CENTERLINE_R;
  const progressLength = (clamped / 100) * outerCircumference;

  return (
    <View style={{width: DONUT_SIZE, height: DONUT_SIZE, alignItems: 'center', justifyContent: 'center'}}>
      <Svg width={DONUT_SIZE} height={DONUT_SIZE} viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}>
        {/* outer track — the actual progress ring */}
        <Circle
          cx={DONUT_SIZE / 2} cy={DONUT_SIZE / 2} r={OUTER_CENTERLINE_R}
          stroke={C.lightBlueBg} strokeWidth={OUTER_STROKE} fill="none"
        />
        {clamped > 0 && (
          <Circle
            cx={DONUT_SIZE / 2} cy={DONUT_SIZE / 2} r={OUTER_CENTERLINE_R}
            stroke={C.blue} strokeWidth={OUTER_STROKE} fill="none"
            strokeDasharray={`${progressLength}, ${outerCircumference}`}
            strokeLinecap="round"
            rotation={-90}
            origin={`${DONUT_SIZE / 2}, ${DONUT_SIZE / 2}`}
          />
        )}
        {/* inner ring — static "required" baseline, always fully drawn */}
        <Circle
          cx={DONUT_SIZE / 2} cy={DONUT_SIZE / 2} r={BASE_CENTERLINE_R}
          stroke={C.blueDark} strokeWidth={BASE_STROKE} fill="none"
        />
      </Svg>
      <View style={{position: 'absolute', alignItems: 'center'}}>
        <Text style={{color: C.blueDark, fontFamily: 'Runda-Black', fontSize: 22}}>{centerValue}</Text>
        <Text style={{color: C.navyLighterText, fontFamily: 'Runda-Normal', fontSize: 11}}>{'Hours Completed'}</Text>
      </View>
    </View>
  );
};

// ─── IPMA "CPD Requirements" block — shown when summary.type === 'IPMA'.
// Typography and donut geometry per Marium's Figma spec; only the card
// container itself (padding/border/shadow) is still my own reasonable
// default, since that wasn't given. ─────────────────────────────────────
const IpmaRequirementsCard = ({summary}: {summary: PduSummary}) => {
  if (!summary.ipma) return null;
  return (
    <View style={ipma.card}>
      <Text style={ipma.title}>{summary.ipma.title}</Text>
      {summary.ipma.description.map((para, i) => (
        <Text key={i} style={ipma.paragraph}>{para}</Text>
      ))}

      {!!summary.recertification_deadline && (
        <View style={ipma.deadlineRow}>
          <DeadlineIcon />
          <Text style={ipma.deadlineLabel}>{'Recertification Deadline:'}</Text>
          <Text style={ipma.deadlineValue}>{summary.recertification_deadline}</Text>
        </View>
      )}

      <View style={ipma.progressRow}>
        <DonutChart percentage={summary.percentage} centerValue={summary.hours_earned} />
        <View style={{flex: 1, gap: 8}}>
          <View style={ipma.legendRow}>
            <View style={[ipma.legendDot, {backgroundColor: C.blueDark}]} />
            <Text style={ipma.legendLabel}>
              {'Total CPD Required: '}
              <Text style={ipma.legendValueRequired}>{`${summary.hours_required} Hours`}</Text>
            </Text>
          </View>
          <View style={ipma.legendRow}>
            <View style={[ipma.legendDot, {backgroundColor: C.blue}]} />
            <Text style={ipma.legendLabel}>
              {'CPD Completed: '}
              <Text style={ipma.legendValueCompleted}>{`${summary.hours_earned} Hours`}</Text>
            </Text>
          </View>
        </View>
      </View>

      {!!summary.ipma.footer && <Text style={ipma.footer}>{summary.ipma.footer}</Text>}
    </View>
  );
};


// on the right. Options list: 16px horizontal padding, 6px gap, 41px row
// height. ─────────────────────────────────────────────────────────────────
const FilterSheet = ({
  visible, title, options, selected, onSelect, onClose,
}: {
  visible: boolean; title: string; options: string[]; selected: string;
  onSelect: (v: string) => void; onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={fs.backdrop}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      <View style={fs.sheet}>
        <View style={fs.titleRow}>
          <Text style={fs.title}>{title}</Text>
          <TouchableOpacity style={fs.closeBtn} onPress={onClose} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={fs.close}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{maxHeight: SCREEN_HEIGHT * 0.5}} contentContainerStyle={fs.optionsList} showsVerticalScrollIndicator={false}>
          {['All', ...options].map(opt => (
            <TouchableOpacity
              key={opt}
              style={fs.optionRow}
              onPress={() => { onSelect(opt === 'All' ? '' : opt); onClose(); }}>
              <Text style={[fs.optionText, (opt === 'All' ? selected === '' : selected === opt) && fs.optionTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

// ─── Delete confirmation modal ─────────────────────────────────────────────
// ─── Delete confirmation — bottom-anchored sheet (per Figma), not a
// centered dialog. Title bar: height 56, text centered H3 16px/500 dark
// blue. Body: "Are you sure..." as plain bold text (H2 18px/700 navy, no
// border box), a divider rule, then full-width Delete/Cancel buttons. ────
const DeleteConfirmModal = ({
  visible, onCancel, onConfirm, loading,
}: {visible: boolean; onCancel: () => void; onConfirm: () => void; loading: boolean}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
    <View style={dm.backdrop}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />
      <View style={dm.sheet}>
        <View style={dm.titleBar}>
          <Text style={dm.title}>{'Delete CPD Record'}</Text>
        </View>
        <View style={dm.body}>
          <Text style={dm.warningText}>{'Are you sure you want to permanently remove this post?'}</Text>
          <View style={dm.divider} />
          <TouchableOpacity style={dm.deleteBtn} onPress={onConfirm} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={dm.deleteBtnText}>{'Delete'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={dm.cancelBtn} onPress={onCancel} disabled={loading}>
            <Text style={dm.cancelBtnText}>{'Cancel'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// ─── Record card ────────────────────────────────────────────────────────────
const RecordCard = ({
  record, onEdit, onDelete,
}: {record: PduRecord; onEdit: () => void; onDelete: () => void}) => (
  <View style={rc.card}>
    <View style={rc.header}>
      <Text style={rc.headerText}>{`No. ${record.number}`}</Text>
      {record.can_edit && (
        <View style={{flexDirection: 'row', gap: 8}}>
          <TouchableOpacity style={rc.iconBtn} onPress={onEdit}>
            <EditIcon />
          </TouchableOpacity>
          <TouchableOpacity style={rc.iconBtn} onPress={onDelete}>
            <DeleteIcon />
          </TouchableOpacity>
        </View>
      )}
    </View>

    <View style={rc.body}>
      <View style={rc.titleRow}>
        <View style={rc.articleBg}>
          <ArticleIcon />
        </View>
        <View style={{flex: 1}}>
          <Text style={rc.titleText}>{record.activity_name}</Text>
          <Text style={rc.typeText}>{`${record.activity_type} \u00B7 ${record.start_year}`}</Text>
        </View>
      </View>

      <View style={rc.metaRow}>
        <StartDateIcon />
        <Text style={rc.metaLabel}>{'Start Date'}</Text>
        <Text style={rc.metaValue}>{`${record.start_date}-${record.start_year}`}</Text>
      </View>
      <View style={rc.metaRow}>
        <EndDateIcon />
        <Text style={rc.metaLabel}>{'End Date'}</Text>
        <Text style={rc.metaValue}>{`${record.end_date}-${record.end_year}`}</Text>
      </View>
      <View style={rc.metaRow}>
        <HoursIcon />
        <Text style={rc.metaLabel}>{'Hours'}</Text>
        <Text style={rc.metaValue}>{record.hours_label}</Text>
      </View>
      <View style={rc.metaRowDesc}>
        <View style={{marginTop: 2}}><DescriptionIcon /></View>
        <Text style={rc.metaLabel}>{'Description'}</Text>
        <Text style={[rc.metaValue, {flex: 1}]}>{record.description}</Text>
      </View>

      {!!record.file_url && (
        <TouchableOpacity style={rc.viewFileRow}>
          <ViewFileIcon />
          <Text style={rc.viewFileText}>{'View File'}</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ─── Main screen ────────────────────────────────────────────────────────────
const PDUsTrackerScreen = ({navigation}: any) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MyPdusResponse | null>(null);
  const [introExpanded, setIntroExpanded] = useState(false);
  const [activityFilter, setActivityFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const [yearSheetOpen, setYearSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PduRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const userId = await getUserIdFromToken();
      if (!userId) return;
      const res = await getMyPdus(userId);
      setData(res);
    } catch (e) {
      console.log('[PDUsTracker] load error:', e);
      Alert.alert('Error', 'Could not load your PDU records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = navigation?.addListener?.('focus', load);
    return unsub;
  }, [load, navigation]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deletePduRecord(deleteTarget.id);
      setData(prev => prev ? {
        ...prev,
        summary: res.summary,
        records: prev.records.filter(r => r.id !== deleteTarget.id),
        total: prev.total - 1,
      } : prev);
      setDeleteTarget(null);
    } catch (e) {
      Alert.alert('Error', 'Could not delete this record. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredRecords = (data?.records || []).filter(r => {
    if (activityFilter && r.activity_type !== activityFilter) return false;
    if (yearFilter && r.start_year !== yearFilter) return false;
    return true;
  });

  if (loading && !data) {
    return (
      <SafeAreaView style={s.container}>
        <AppHeader navigation={navigation} onDrawerOpen={() => {}} />
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.blueDark} />
        </View>
      </SafeAreaView>
    );
  }

  const summary = data?.summary;

  return (
    <SafeAreaView style={s.container} edges={['left', 'right', 'bottom']}>
      <AppHeader navigation={navigation} onDrawerOpen={() => {}} />
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={s.pageTitle}>{summary?.title || 'My PDUs \u2013 Your Professional Development Tracker'}</Text>

        <View style={s.introRow}>
          <View style={s.numberBox}>
            <Text style={s.numberText} numberOfLines={1}>{summary?.hours_earned ?? 0}</Text>
          </View>
          <View style={{flex: 1}}>
            <Text style={s.introText}>
              {introExpanded ? summary?.intro : truncateAtWord(summary?.intro || '', 120)}
            </Text>
            <TouchableOpacity
              style={s.viewMoreRow}
              onPress={() => setIntroExpanded(v => !v)}>
              <Text style={s.viewMoreText}>{introExpanded ? 'View Less' : 'View More'}</Text>
              {introExpanded ? <UpArrowIcon /> : <DownArrowIcon />}
            </TouchableOpacity>
          </View>
        </View>

        {summary?.type === 'IPMA' && <IpmaRequirementsCard summary={summary} />}

        {/* CPD Records section */}
        <View style={s.recordsSection}>
          <Text style={s.sectionTitle}>{summary?.records_heading || 'Your CPD Records'}</Text>

          <View style={s.filtersRow}>
            <TouchableOpacity style={s.filterCard} onPress={() => setActivitySheetOpen(true)}>
              <View style={s.filterIconWrap}><ActivityTypeIcon /></View>
              <View style={{flex: 1}}>
                <Text style={s.filterLabel}>{'Activity Type'}</Text>
                <View style={s.filterValueRow}>
                  <Text style={s.filterValue}>{activityFilter || 'All'}</Text>
                  <FilterChevron />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={s.filterCard} onPress={() => setYearSheetOpen(true)}>
              <View style={s.filterIconWrap}><YearIcon /></View>
              <View style={{flex: 1}}>
                <Text style={s.filterLabel}>{'Start Year'}</Text>
                <View style={s.filterValueRow}>
                  <Text style={s.filterValue}>{yearFilter || 'All'}</Text>
                  <FilterChevron />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={s.showingBanner}>
            <TickIcon />
            <Text style={s.showingText}>
              {`Showing ${filteredRecords.length ? 1 : 0} to ${filteredRecords.length} of ${filteredRecords.length} entries`}
            </Text>
          </View>

          {filteredRecords.length === 0 ? (
            <View style={s.emptyState}>
              <View style={s.emptyIconWrap}><NoRecordsIcon /></View>
              <Text style={s.emptyTitle}>{'No Records Found'}</Text>
              <Text style={s.emptySubtitle}>{'Start adding your CPD activities to track your professional growth.'}</Text>
              <TouchableOpacity style={s.addBtn} onPress={() => navigation?.navigate('AddEditCPDRecord')}>
                <Text style={s.addBtnText}>{summary?.add_record_label || 'Add a new CPD record'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {filteredRecords.map(r => (
                <RecordCard
                  key={r.id}
                  record={r}
                  onEdit={() => navigation?.navigate('AddEditCPDRecord', {record: r})}
                  onDelete={() => setDeleteTarget(r)}
                />
              ))}
              <TouchableOpacity style={s.addBtn} onPress={() => navigation?.navigate('AddEditCPDRecord')}>
                <Text style={s.addBtnText}>{summary?.add_record_label || 'Add a new CPD record'}</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={s.helpText}>{summary?.records_help}</Text>

          {/* No confirmed endpoint yet for exporting records — placeholder
              action so the button matches the Figma spec without
              fabricating a request. Swap in the real call once Robby
              confirms it. */}
          <TouchableOpacity
            style={s.downloadBtn}
            onPress={() => Alert.alert('Coming soon', 'CPD record export isn\u2019t available yet.')}>
            <Text style={s.downloadBtnText}>{'Download CPD Record (.xls)'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <FilterSheet
        visible={activitySheetOpen}
        title="Filter by Activity Type"
        options={data?.filters.activity_types || []}
        selected={activityFilter}
        onSelect={setActivityFilter}
        onClose={() => setActivitySheetOpen(false)}
      />
      <FilterSheet
        visible={yearSheetOpen}
        title="Filter by Year"
        options={data?.filters.start_years || []}
        selected={yearFilter}
        onSelect={setYearFilter}
        onClose={() => setYearSheetOpen(false)}
      />
      <DeleteConfirmModal
        visible={!!deleteTarget}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </SafeAreaView>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  loadingWrap: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  scrollContent: {paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40, gap: 24},

  pageTitle: {
    color: C.navy, fontFamily: 'Runda-Bold', fontSize: 18, letterSpacing: 0.09,
  },

  introRow: {flexDirection: 'row', gap: 12},
  numberBox: {
    minWidth: 78, paddingVertical: 18, paddingHorizontal: 16,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 5, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15, shadowRadius: 10.023, elevation: 3,
  },
  numberText: {color: C.blue, fontFamily: 'Runda-Black', fontSize: 32, lineHeight: 36},
  introText: {color: C.navy, fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 18, paddingTop: 3},
  viewMoreRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6},
  viewMoreText: {color: C.blue, fontFamily: 'Runda-Medium', fontSize: 12},

  recordsSection: {gap: 24},
  sectionTitle: {
    color: C.blueDark, fontFamily: 'Runda-Bold', fontSize: 18, letterSpacing: 0.09,
  },

  filtersRow: {flexDirection: 'row', gap: 12},
  filterCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14.2, borderRadius: 4.437, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15, shadowRadius: 8.896, elevation: 2,
  },
  filterIconWrap: {
    width: 34, height: 34, borderRadius: 93.821, backgroundColor: C.lightBlueBg,
    alignItems: 'center', justifyContent: 'center',
  },
  filterLabel: {color: C.grey, fontFamily: 'Runda-Normal', fontSize: 11, marginBottom: 2},
  filterValueRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  filterValue: {color: C.navy, fontFamily: 'Runda-Medium', fontSize: 13},

  showingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 16, borderRadius: 8.201, backgroundColor: C.lightBlueBg,
    shadowColor: '#000', shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15, shadowRadius: 10.023, elevation: 1,
  },
  showingText: {color: C.blueDark, fontFamily: 'Runda-Medium', fontSize: 13},

  emptyState: {
    alignItems: 'center', paddingVertical: 32, gap: 8,
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
  },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: C.lightBlueBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: {color: C.navy, fontFamily: 'Runda-Bold', fontSize: 15},
  emptySubtitle: {
    color: C.navyLighterText, fontFamily: 'Runda-Normal', fontSize: 13,
    textAlign: 'center', paddingHorizontal: 24, marginBottom: 12,
  },

  addBtn: {
    height: 40, borderRadius: 100, backgroundColor: C.blueDark,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  addBtnText: {color: '#FFFFFF', fontFamily: 'Runda-Medium', fontSize: 14},

  helpText: {
    color: C.navyLighterText, fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 18,
    paddingTop: 3,
  },

  downloadBtn: {
    height: 40, borderRadius: 100, borderWidth: 1, borderColor: C.blueDark,
    alignItems: 'center', justifyContent: 'center',
  },
  downloadBtnText: {color: C.blueDark, fontFamily: 'Runda-Medium', fontSize: 14},
});

const ipma = StyleSheet.create({
  card: {
    gap: 12, padding: 16, borderRadius: 8, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 1,
  },
  title: {color: C.blueDark, fontFamily: 'Runda-Bold', fontSize: 18, letterSpacing: 0.09},
  paragraph: {color: C.navy, fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16},
  deadlineRow: {flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap'},
  deadlineLabel: {color: C.navy, fontFamily: 'Runda-Medium', fontSize: 10, lineHeight: 14},
  deadlineValue: {color: C.blue, fontFamily: 'Runda-Medium', fontSize: 10, lineHeight: 14},
  progressRow: {flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 4},
  legendRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  legendDot: {width: 12.65, height: 12.65, borderRadius: 2.53},
  legendLabel: {color: C.navy, fontFamily: 'Runda-Normal', fontSize: 10, lineHeight: 14},
  legendValueRequired: {color: C.blueDark, fontFamily: 'Runda-Medium', fontSize: 10, lineHeight: 14},
  legendValueCompleted: {color: C.blue, fontFamily: 'Runda-Medium', fontSize: 10, lineHeight: 14},
  footer: {color: C.navyLighterText, fontFamily: 'Runda-Normal', fontSize: 11, lineHeight: 16},
});

const rc = StyleSheet.create({
  card: {
    borderRadius: 5, backgroundColor: '#FFFFFF', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15, shadowRadius: 10.023, elevation: 2, marginBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 16, backgroundColor: C.headerRowBg,
  },
  headerText: {color: C.navy, fontFamily: 'Runda-Medium', fontSize: 14},
  iconBtn: {
    width: 20, height: 20, borderRadius: 4.167, borderWidth: 0.833,
    borderColor: C.grey, alignItems: 'center', justifyContent: 'center',
  },
  body: {padding: 16, gap: 10},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4},
  articleBg: {
    width: 49, height: 49, borderRadius: 135.213, backgroundColor: C.lightBlueBg,
    alignItems: 'center', justifyContent: 'center',
  },
  titleText: {color: C.navy, fontFamily: 'Runda-Medium', fontSize: 16, lineHeight: 20, letterSpacing: 0.08},
  typeText: {color: C.navyLighterText, fontFamily: 'Runda-Normal', fontSize: 13, lineHeight: 18},
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  metaRowDesc: {flexDirection: 'row', alignItems: 'flex-start', gap: 8},
  metaLabel: {color: C.navy, fontFamily: 'Runda-Medium', fontSize: 14, width: 78},
  metaValue: {color: C.navy, fontFamily: 'Runda-Normal', fontSize: 14, lineHeight: 18},
  viewFileRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4},
  viewFileText: {color: C.errorRed, fontFamily: 'Runda-Medium', fontSize: 13},
});

const fs = StyleSheet.create({
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingBottom: 24, maxHeight: SCREEN_HEIGHT * 0.65, overflow: 'hidden',
  },
  titleRow: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    paddingLeft: 24, paddingRight: 24, backgroundColor: '#FFFFFF',
  },
  title: {
    flex: 1, color: C.blueDark, fontFamily: 'Runda-Bold', fontSize: 16,
    lineHeight: 20, letterSpacing: 0.08, textAlign: 'center',
  },
  closeBtn: {position: 'absolute', right: 24, top: 18},
  close: {color: C.grey, fontSize: 16},
  optionsList: {paddingHorizontal: 16, gap: 6, paddingTop: 4},
  optionRow: {height: 41, justifyContent: 'center'},
  optionText: {color: C.navy, fontFamily: 'Runda-Normal', fontSize: 14},
  optionTextActive: {color: C.blueDark, fontFamily: 'Runda-Medium'},
});

const dm = StyleSheet.create({
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingBottom: 24, overflow: 'hidden',
  },
  titleBar: {
    height: 56, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FFFFFF', paddingHorizontal: 24,
  },
  title: {
    color: C.blueDark, textAlign: 'center', fontFamily: 'Runda-Medium',
    fontSize: 16, lineHeight: 20, letterSpacing: 0.08,
  },
  body: {paddingHorizontal: 16, gap: 16},
  warningText: {
    color: C.navy, fontFamily: 'Runda-Bold', fontSize: 18, letterSpacing: 0.09, lineHeight: 22,
  },
  divider: {height: 1, backgroundColor: C.border},
  deleteBtn: {
    height: 40, paddingHorizontal: 16, borderRadius: 100, backgroundColor: C.blueDark,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: {color: '#FFFFFF', fontFamily: 'Runda-Medium', fontSize: 14},
  cancelBtn: {
    height: 40, paddingHorizontal: 16, borderRadius: 100, borderWidth: 1, borderColor: C.blueDark,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: {color: C.blueDark, fontFamily: 'Runda-Medium', fontSize: 14},
});

export default PDUsTrackerScreen;
