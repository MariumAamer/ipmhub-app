/* eslint-disable prettier/prettier */
import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Linking, Platform} from 'react-native';
import Svg, {Path, Circle} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import BackButton from '../components/BackButton';
import {getStoredUser} from '../api/authApi';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const NAVY = '#192546'; // --IPM-Color-Palette-Navy-Blue
const DARK_BLUE = '#0C4D91';
const LIGHT_BLUE = '#46B0E3'; // --IPM-Color-Palette-Light-Blue
const GREY = '#8F9098'; // --Neutral-Dark-Lightest
const ERROR_LIGHT = '#FFE2E5'; // --Support-Error-Light
const SUCCESS_LIGHT = '#E7F4E8'; // --Support-Success-Light
const WARNING_LIGHT = '#FFF4E4'; // --Support-Warning-Light
const WARNING_MEDIUM = '#FFB37C'; // --Support-Warning-Medium
const WARNING_ORANGE = '#E86339';
// TODO: confirm exact blue-banner tokens from Figma (not in the CSS shared).
const INFO_BG = '#EEF8FD';
const INFO_BORDER = '#8FD0F0';

// ─── Row icons (20×20, navy stroke) ───────────────────────────────────────────
const strokeProps = {
  stroke: NAVY,
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const ChatIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M17.5 12.5C17.5 12.942 17.3244 13.366 17.0118 13.6785C16.6993 13.9911 16.2754 14.1667 15.8333 14.1667H5.83333L2.5 17.5V4.16667C2.5 3.72464 2.67559 3.30072 2.98816 2.98816C3.30072 2.67559 3.72464 2.5 4.16667 2.5H15.8333C16.2754 2.5 16.6993 2.67559 17.0118 2.98816C17.3244 3.30072 17.5 3.72464 17.5 4.16667V12.5Z" {...strokeProps} />
    <Path d="M5.83398 6.66699H14.1673" {...strokeProps} />
    <Path d="M5.83398 10H10.834" {...strokeProps} />
  </Svg>
);

const UsersIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M13.3327 17.5V15.8333C13.3327 14.9493 12.9815 14.1014 12.3564 13.4763C11.7313 12.8512 10.8834 12.5 9.99935 12.5H4.99935C4.11529 12.5 3.26745 12.8512 2.64233 13.4763C2.01721 14.1014 1.66602 14.9493 1.66602 15.8333V17.5" {...strokeProps} />
    <Path d="M7.49935 9.16667C9.3403 9.16667 10.8327 7.67428 10.8327 5.83333C10.8327 3.99238 9.3403 2.5 7.49935 2.5C5.6584 2.5 4.16602 3.99238 4.16602 5.83333C4.16602 7.67428 5.6584 9.16667 7.49935 9.16667Z" {...strokeProps} />
    <Path d="M18.334 17.5001V15.8334C18.3334 15.0948 18.0876 14.3774 17.6351 13.7937C17.1826 13.2099 16.5491 12.793 15.834 12.6084" {...strokeProps} />
    <Path d="M13.334 2.6084C14.051 2.79198 14.6865 3.20898 15.1403 3.79366C15.5942 4.37833 15.8405 5.09742 15.8405 5.83757C15.8405 6.57771 15.5942 7.2968 15.1403 7.88147C14.6865 8.46615 14.051 8.88315 13.334 9.06673" {...strokeProps} />
  </Svg>
);

const CapIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M18.334 8.33301V13.333" {...strokeProps} />
    <Path d="M1.66602 8.33366L9.99935 4.16699L18.3327 8.33366L9.99935 12.5003L1.66602 8.33366Z" {...strokeProps} />
    <Path d="M5 10V14.1667C7.5 16.6667 12.5 16.6667 15 14.1667V10" {...strokeProps} />
  </Svg>
);

const AwardIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M10 11.667C12.7614 11.667 15 9.42842 15 6.66699C15 3.90557 12.7614 1.66699 10 1.66699C7.23858 1.66699 5 3.90557 5 6.66699C5 9.42842 7.23858 11.667 10 11.667Z" {...strokeProps} />
    <Path d="M12.8982 10.7412L14.1673 18.3329L10.0007 15.8329L5.83398 18.3329L7.10315 10.7412" {...strokeProps} />
  </Svg>
);

const FileIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M12.5007 1.66699H5.00065C4.55862 1.66699 4.1347 1.84259 3.82214 2.15515C3.50958 2.46771 3.33398 2.89163 3.33398 3.33366V16.667C3.33398 17.109 3.50958 17.5329 3.82214 17.8455C4.1347 18.1581 4.55862 18.3337 5.00065 18.3337H15.0007C15.4427 18.3337 15.8666 18.1581 16.1792 17.8455C16.4917 17.5329 16.6673 17.109 16.6673 16.667V5.83366L12.5007 1.66699Z" {...strokeProps} />
    <Path d="M11.666 1.66699V5.00033C11.666 5.44235 11.8416 5.86628 12.1542 6.17884C12.4667 6.4914 12.8907 6.66699 13.3327 6.66699H16.666" {...strokeProps} />
    <Path d="M8.33268 7.5H6.66602" {...strokeProps} />
    <Path d="M13.3327 10.833H6.66602" {...strokeProps} />
    <Path d="M13.3327 14.167H6.66602" {...strokeProps} />
  </Svg>
);

// ─── Banner icons ─────────────────────────────────────────────────────────────
// Rebuilt without <mask> (react-native-svg@15.3.0 doesn't render it): a solid
// circle with the white glyph on top gives the identical result.
const WarningIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx="8.0013" cy="8.00033" r="7.33333" fill={WARNING_ORANGE} />
    <Path d="M7.63098 4.04032C7.74717 3.98915 7.87276 3.96278 7.99972 3.96289C8.12659 3.96292 8.25207 3.9894 8.36814 4.04063C8.48422 4.09185 8.58834 4.16671 8.67387 4.26043C8.7594 4.35414 8.82445 4.46465 8.86489 4.58491C8.90533 4.70517 8.92025 4.83254 8.90872 4.95889L8.54472 8.96489C8.53057 9.09957 8.46705 9.22425 8.36641 9.31487C8.26577 9.40548 8.13514 9.45563 7.99972 9.45563C7.86429 9.45563 7.73367 9.40548 7.63303 9.31487C7.53239 9.22425 7.46887 9.09957 7.45472 8.96489L7.08972 4.95889C7.07818 4.83246 7.09313 4.705 7.13363 4.58468C7.17412 4.46435 7.23927 4.35379 7.32491 4.26006C7.41054 4.16633 7.51479 4.09149 7.63098 4.04032Z" fill="#FFFFFF" />
    <Path d="M8.87208 11.1654C8.87208 11.6472 8.48153 12.0377 7.99976 12.0377C7.51798 12.0377 7.12743 11.6472 7.12743 11.1654C7.12743 10.6836 7.51798 10.2931 7.99976 10.2931C8.48153 10.2931 8.87208 10.6836 8.87208 11.1654Z" fill="#FFFFFF" />
  </Svg>
);

const InfoIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx="8.0013" cy="8.00033" r="7.33333" fill={LIGHT_BLUE} />
    <Path fillRule="evenodd" clipRule="evenodd" d="M6.42267 7.20901C6.42267 6.84082 6.72115 6.54235 7.08934 6.54235H8.00053C8.36872 6.54235 8.6672 6.84082 8.6672 7.20901V10.3135H9.47111C9.8393 10.3135 10.1378 10.612 10.1378 10.9802C10.1378 11.3484 9.8393 11.6469 9.47111 11.6469H6.52995C6.16176 11.6469 5.86328 11.3484 5.86328 10.9802C5.86328 10.612 6.16176 10.3135 6.52995 10.3135H7.33386V7.87568H7.08934C6.72115 7.87568 6.42267 7.5772 6.42267 7.20901Z" fill="#FFFFFF" />
    <Path d="M8.82227 5.22584C8.82227 5.70761 8.43172 6.09816 7.94995 6.09816C7.46818 6.09816 7.07763 5.70761 7.07763 5.22584C7.07763 4.74407 7.46818 4.35352 7.94995 4.35352C8.43172 4.35352 8.82227 4.74407 8.82227 5.22584Z" fill="#FFFFFF" />
  </Svg>
);

// ─── Content ──────────────────────────────────────────────────────────────────
interface InfoRow {
  key: string;
  title: string;
  body: string;
  Icon: React.FC;
  tile: string;
}

const LOSE_ROWS: InfoRow[] = [
  {
    key: 'profile',
    title: 'Profile, posts & discussions',
    body: 'Your profile, Feed posts, forum discussions and comments are permanently deleted.',
    Icon: ChatIcon,
    tile: ERROR_LIGHT,
  },
  {
    key: 'connections',
    title: 'Connections & messages',
    body: 'Your followers, following and direct messages are deleted.',
    Icon: UsersIcon,
    tile: ERROR_LIGHT,
  },
  {
    key: 'progress',
    title: 'Course progress, badges & PDUs',
    body: 'Your learning progress, badges and PDU records are removed.',
    Icon: CapIcon,
    tile: ERROR_LIGHT,
  },
];

const STAY_ROWS: InfoRow[] = [
  {
    key: 'certs',
    title: 'Issued certificates',
    body: 'Certificates already issued stay valid and verifiable.',
    Icon: AwardIcon,
    tile: SUCCESS_LIGHT,
  },
  {
    key: 'invoices',
    title: 'Invoices & payment records',
    body: 'Kept only as long as the law requires.',
    Icon: FileIcon,
    tile: SUCCESS_LIGHT,
  },
];

const Row = ({row}: {row: InfoRow}) => (
  <View style={styles.row}>
    <View style={[styles.tile, {backgroundColor: row.tile}]}>
      <row.Icon />
    </View>
    <View style={styles.rowText}>
      <Text style={styles.rowTitle}>{row.title}</Text>
      <Text style={styles.bodyS}>{row.body}</Text>
    </View>
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────
const DeleteAccountScreen = ({navigation}: any) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    (async () => {
      const user = await getStoredUser();
      const name = (user?.displayName || user?.username || '').trim();
      setFirstName(name.split(/\s+/)[0] || '');
    })();
  }, []);

  const handleContinue = () => {
    navigation?.navigate?.('ConfirmDelete');
  };

  const handleManageSubscription = () => {
    // Opens the store's own subscription-management page.
    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';
    Linking.openURL(url).catch(() => {});
  };

  const handleDownloadData = () => {
    navigation?.navigate?.('DownloadMyData');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <BackButton style={styles.backBtn} onPress={() => navigation?.goBack()} />

        <Text style={styles.pageTitle}>{'Delete Account'}</Text>

        <Text style={styles.bodyM}>
          {`We're sorry to see you go${firstName ? `, ${firstName}` : ''}. Before you continue, here's what deleting your IPM Hub account means.`}
        </Text>

        {/* ── What you'll lose ── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>{"What you'll lose"}</Text>
          {LOSE_ROWS.map(r => (
            <Row key={r.key} row={r} />
          ))}
        </View>

        {/* ── What stays ── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>{'What stays'}</Text>
          {STAY_ROWS.map(r => (
            <Row key={r.key} row={r} />
          ))}
        </View>

        {/* ── Membership notice ── */}
        <View style={styles.warnBanner}>
          <WarningIcon />
          <View style={styles.bannerText}>
            <Text style={styles.rowTitle}>{"Your membership isn't cancelled"}</Text>
            <Text style={styles.bodySNavy}>
              {'Cancel any active membership or subscription separately. Store subscriptions are managed in your App Store or Google Play account.'}
            </Text>
            <TouchableOpacity onPress={handleManageSubscription} activeOpacity={0.7}>
              <Text style={styles.actionM}>{'Manage subscription'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 30 days notice ── */}
        <View style={styles.infoBanner}>
          <InfoIcon />
          <View style={styles.bannerText}>
            <Text style={styles.rowTitle}>{'30 days to change your mind'}</Text>
            <Text style={styles.bodySNavy}>
              {'Your account is deactivated now and permanently deleted after 30 days, unless you choose to delete it immediately in the next step. Sign in before then and choose Restore account to keep it.'}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleDownloadData} activeOpacity={0.7}>
          <Text style={styles.actionL}>{'Download a copy of my data'}</Text>
        </TouchableOpacity>

        {/* ── Actions ── */}
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.85}>
            <Text style={styles.continueText}>{'Continue'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation?.goBack()} activeOpacity={0.85}>
            <Text style={styles.cancelText}>{'Cancel'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{height: 24}} />
      </ScrollView>

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  // Screen layout spec: column, align flex-start, gap 16.
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 16,
  },
  backBtn: {alignSelf: 'flex-start'},
  // Heading/H2 — same as other screen titles.
  pageTitle: {
    fontFamily: 'Runda-Bold',
    fontSize: 18,
    color: NAVY,
    letterSpacing: 0.09,
  },
  // Body/Body M
  bodyM: {
    fontFamily: 'Runda-Normal',
    fontSize: 14,
    lineHeight: 18,
    color: NAVY,
  },
  section: {alignSelf: 'stretch', gap: 12},
  // TODO: confirm section-heading spec (assumed Heading/H3: 16/500).
  sectionHeading: {
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    lineHeight: 20,
    color: NAVY,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    gap: 12,
  },
  tile: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowText: {flex: 1, gap: 2},
  // Heading/H4
  rowTitle: {
    fontFamily: 'Runda-Medium',
    fontSize: 14,
    color: NAVY,
  },
  // Body/Body S
  bodyS: {
    fontFamily: 'Runda-Normal',
    fontSize: 12,
    lineHeight: 16,
    color: GREY,
  },
  bodySNavy: {
    fontFamily: 'Runda-Normal',
    fontSize: 12,
    lineHeight: 16,
    color: NAVY,
  },
  // Banners
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    padding: 16,
    gap: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: WARNING_MEDIUM,
    backgroundColor: WARNING_LIGHT,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    padding: 16,
    gap: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: INFO_BORDER,
    backgroundColor: INFO_BG,
  },
  bannerText: {flex: 1, gap: 4},
  // Action/Action M
  actionM: {
    fontFamily: 'Runda-Medium',
    fontSize: 12,
    color: LIGHT_BLUE,
  },
  // Action/Action L
  actionL: {
    fontFamily: 'Runda-Medium',
    fontSize: 14,
    color: LIGHT_BLUE,
  },
  // Buttons
  buttons: {alignSelf: 'stretch', gap: 12, marginTop: 8},
  continueBtn: {
    height: 40,
    borderRadius: 30,
    backgroundColor: DARK_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {fontFamily: 'Runda-Medium', fontSize: 12, color: '#FFFFFF'},
  cancelBtn: {
    height: 40,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: DARK_BLUE,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {fontFamily: 'Runda-Medium', fontSize: 12, color: DARK_BLUE},
});

export default DeleteAccountScreen;
