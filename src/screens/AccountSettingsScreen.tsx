/* eslint-disable prettier/prettier */
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Svg, {Path, Circle} from 'react-native-svg';
import * as Keychain from 'react-native-keychain';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import {logoutUser} from '../api/authApi';
import {
  getNotificationSettings,
  updateNotificationSettings,
  NOTIFICATION_SETTING_KEYS,
  NotificationSettingsMap,
} from '../api/notificationsApi';

// ─── Brand color ──────────────────────────────────────────────────────────────
const NAVY = '#0C4D91';
const DARK_NAVY = '#192546';

// ─── Bell Icon ────────────────────────────────────────────────────────────────
const BellIcon = ({size = 20, color = NAVY}: {size?: number; color?: string}) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M12.2139 15.8994C12.5824 15.9735 12.8209 16.3325 12.7471 16.7012C12.477 18.049 11.2171 18.9999 9.7832 19C8.34915 19 7.08845 18.0491 6.81836 16.7012C6.74457 16.3324 6.98378 15.9733 7.35254 15.8994C7.72129 15.8256 8.08034 16.0649 8.1543 16.4336C8.28354 17.0784 8.92794 17.6377 9.7832 17.6377C10.6384 17.6376 11.2829 17.0784 11.4121 16.4336C11.4861 16.0649 11.8451 15.8255 12.2139 15.8994ZM9.88086 1C13.1587 1 15.8164 3.65766 15.8164 6.93555V10.1943C16.9265 10.4197 17.7616 11.4015 17.7617 12.5781C17.7617 13.9214 16.6733 15.0106 15.3301 15.0107H4.43262C3.08922 15.0107 2 13.9215 2 12.5781C2.00012 11.4014 2.83609 10.4197 3.94629 10.1943V6.93555C3.94629 3.65774 6.60308 1.00012 9.88086 1ZM9.88086 2.3623C7.35538 2.36242 5.30859 4.41004 5.30859 6.93555V10.5127C5.30859 10.9754 4.98179 11.3737 4.52832 11.4658L4.2168 11.5293C3.72897 11.6284 3.36242 12.0621 3.3623 12.5781C3.3623 13.1692 3.84152 13.6484 4.43262 13.6484H15.3301C15.921 13.6482 16.4004 13.1691 16.4004 12.5781C16.4003 12.062 16.0328 11.6283 15.5449 11.5293L15.2334 11.4658C14.78 11.3737 14.4541 10.9754 14.4541 10.5127V6.93555C14.4541 4.40996 12.4064 2.3623 9.88086 2.3623Z"
      fill={color}
    />
  </Svg>
);

// ─── Mobile Icon ──────────────────────────────────────────────────────────────
const MobileIcon = ({color = NAVY}: {color?: string}) => (
  <Svg width={10} height={16} viewBox="0 0 10 16" fill="none">
    <Path
      d="M8.5 0H1.5C0.671875 0 0 0.671875 0 1.5V14.5C0 15.3281 0.671875 16 1.5 16H8.5C9.32812 16 10 15.3281 10 14.5V1.5C10 0.671875 9.32812 0 8.5 0ZM5 15C4.44688 15 4 14.5531 4 14C4 13.4469 4.44688 13 5 13C5.55312 13 6 13.4469 6 14C6 14.5531 5.55312 15 5 15ZM8.5 11.625C8.5 11.8313 8.33125 12 8.125 12H1.875C1.66875 12 1.5 11.8313 1.5 11.625V1.875C1.5 1.66875 1.66875 1.5 1.875 1.5H8.125C8.33125 1.5 8.5 1.66875 8.5 1.875V11.625Z"
      fill={color}
    />
  </Svg>
);

// ─── Web Icon ─────────────────────────────────────────────────────────────────
const WebIcon = ({color = NAVY}: {color?: string}) => (
  <Svg width={17} height={17} viewBox="0 0 17 17" fill="none">
    <Path
      d="M13.2966 1.85498C14.5773 1.85498 15.6156 2.89324 15.6156 4.174V10.358C15.6156 11.6388 14.5773 12.6771 13.2966 12.6771H9.81487L10.3451 13.7593H12.1371C12.5213 13.7593 12.8328 14.0708 12.8328 14.455C12.8328 14.8392 12.5213 15.1507 12.1371 15.1507H5.0254C4.64118 15.1507 4.3297 14.8392 4.3297 14.455C4.3297 14.0708 4.64118 13.7593 5.0254 13.7593H6.80332L7.34442 12.6771H3.86589C2.58513 12.6771 1.54688 11.6388 1.54688 10.358V4.174C1.54688 2.89324 2.58513 1.85498 3.86589 1.85498H13.2966ZM3.86589 3.40099C3.43897 3.40099 3.09289 3.74708 3.09289 4.174V10.358C3.09289 10.785 3.43897 11.1311 3.86589 11.1311H13.2966C13.7235 11.1311 14.0696 10.785 14.0696 10.358V4.174C14.0696 3.74708 13.7235 3.40099 13.2966 3.40099H3.86589Z"
      fill={color}
    />
  </Svg>
);

// ─── Email Icon ───────────────────────────────────────────────────────────────
const EmailIcon = ({color = NAVY}: {color?: string}) => (
  <Svg width={17} height={17} viewBox="0 0 17 17" fill="none">
    <Path
      d="M4.18763 2.97949C3.5489 2.97949 2.93633 3.23323 2.48468 3.68488C2.03303 4.13653 1.7793 4.7491 1.7793 5.38783V5.62986L9.0043 9.52053L16.2293 5.63107V5.38783C16.2293 4.7491 15.9756 4.13653 15.5239 3.68488C15.0723 3.23323 14.4597 2.97949 13.821 2.97949H4.18763ZM16.2293 6.9978L9.28969 10.7343C9.20197 10.7815 9.10391 10.8063 9.0043 10.8063C8.90468 10.8063 8.80662 10.7815 8.71891 10.7343L1.7793 6.9978V12.6128C1.7793 13.2516 2.03303 13.8641 2.48468 14.3158C2.93633 14.7674 3.5489 15.0212 4.18763 15.0212H13.821C14.4597 15.0212 15.0723 14.7674 15.5239 14.3158C15.9756 13.8641 16.2293 13.2516 16.2293 12.6128V6.9978Z"
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

// ─── Eye Icons ────────────────────────────────────────────────────────────────
const EyeOpenIcon = ({color = '#8F9098'}: {color?: string}) => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path
      d="M9 3.5C5.5 3.5 2.5 6 1 9C2.5 12 5.5 14.5 9 14.5C12.5 14.5 15.5 12 17 9C15.5 6 12.5 3.5 9 3.5Z"
      stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M9 11.5C10.3807 11.5 11.5 10.3807 11.5 9C11.5 7.61929 10.3807 6.5 9 6.5C7.61929 6.5 6.5 7.61929 6.5 9C6.5 10.3807 7.61929 11.5 9 11.5Z"
      stroke={color} strokeWidth="1.3"
    />
  </Svg>
);

const EyeOffIcon = ({color = '#8F9098'}: {color?: string}) => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path d="M1.5 1.5L16.5 16.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    <Path
      d="M7.37 4.03C7.9 3.86 8.44 3.75 9 3.75C12.5 3.75 15.5 6.25 17 9.25C16.47 10.34 15.73 11.3 14.83 12.08M10.95 10.95C10.56 11.33 10.02 11.56 9.43 11.56C8.19 11.56 7.19 10.56 7.19 9.31C7.19 8.7 7.43 8.14 7.83 7.74M12.5 6.5C11.44 5.73 10.26 5.25 9 5.25C7.22 5.25 5.58 6.09 4.25 7.31L1 9.25C2.19 11.69 4.86 13.75 7.84 13.75"
      stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
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

// ─── Checkbox ─────────────────────────────────────────────────────────────────
const Checkbox = ({checked, onToggle}: {checked: boolean; onToggle: () => void}) => (
  <TouchableOpacity
    onPress={onToggle}
    style={[checkboxStyles.box, checked && checkboxStyles.boxChecked]}
    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
    activeOpacity={0.8}>
    {checked && (
      <Svg width={10} height={8} viewBox="0 0 10 8" fill="none">
        <Path d="M1 4L3.5 6.5L9 1" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    )}
  </TouchableOpacity>
);

const checkboxStyles = StyleSheet.create({
  box: {
    width: 18, height: 18, borderRadius: 4,
    borderWidth: 1.5, borderColor: '#D0D5DD',
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  boxChecked: {backgroundColor: NAVY, borderColor: NAVY},
});

// ─── Types ────────────────────────────────────────────────────────────────────
// Each row maps directly to real backend field keys (per Robby, 2026-08-02):
// base key = mobile/push channel, "_web" suffix = web channel, and the one
// exception — intro replies — uses "_email" instead of "_web". A row only
// renders the columns it has a key for, so groups with no web/email field
// just show a single Mobile checkbox.
interface NotifChannelKeys {
  mobile?: string;
  web?: string;
  email?: string;
}

interface NotifSetting {
  key: string; // stable local id, defaults to the mobile key
  label: string;
  keys: NotifChannelKeys;
}

type ChannelId = 'mobile' | 'web' | 'email';
const CHANNEL_ORDER: ChannelId[] = ['email', 'web', 'mobile'];
const CHANNEL_LABEL: Record<ChannelId, string> = {
  email: 'Email',
  web: 'Web',
  mobile: 'Mobile',
};

// ─── Notification Row (each row is its own bordered frame) ───────────────────
const NotifRow = ({
  setting,
  settingsMap,
  onToggle,
}: {
  setting: NotifSetting;
  settingsMap: NotificationSettingsMap;
  onToggle: (backendKey: string) => void;
}) => {
  const availableChannels = CHANNEL_ORDER.filter(ch => setting.keys[ch]);
  return (
    <View style={notifStyles.frame}>
      <View style={notifStyles.row}>
        <Text style={notifStyles.label}>{setting.label}</Text>
        <View style={notifStyles.channelsRow}>
          {availableChannels.map(ch => {
            const backendKey = setting.keys[ch] as string;
            const checked = settingsMap[backendKey] === 'yes';
            return (
              <View key={ch} style={notifStyles.channelCell}>
                <Checkbox checked={checked} onToggle={() => onToggle(backendKey)} />
                <Text style={notifStyles.channelLabel}>{CHANNEL_LABEL[ch]}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const notifStyles = StyleSheet.create({
  frame: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#C5C6CC',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 10,
  },
  label: {
    flex: 1,
    fontFamily: 'Runda',
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 14,
    color: DARK_NAVY,
  },
  channelsRow: {flexDirection: 'row', gap: 10},
  channelCell: {alignItems: 'center', gap: 4, width: 44},
  channelLabel: {fontSize: 10, color: '#888'},
});

// ─── Notification settings groups ─────────────────────────────────────────────
// Wired to the confirmed /custom/v1/notifications/settings field keys.
// Each row only lists the channel keys that actually exist for it — most
// groups are mobile+web, Introductions is mobile+email, and Discussions/Feed
// are mobile-only (no web or email field for those yet).
const GENERAL_GROUP: NotifSetting[] = [
  {
    key: NOTIFICATION_SETTING_KEYS.enableAll,
    label: 'Enable Notifications',
    keys: {
      mobile: NOTIFICATION_SETTING_KEYS.enableAll,
      web: NOTIFICATION_SETTING_KEYS.enableAllWeb,
    },
  },
];

const MENTIONS_GROUP: NotifSetting[] = [
  {
    key: NOTIFICATION_SETTING_KEYS.mention,
    label: 'Notify me when someone mentions me',
    keys: {
      mobile: NOTIFICATION_SETTING_KEYS.mention,
      web: NOTIFICATION_SETTING_KEYS.mentionWeb,
    },
  },
];

const ACTIVITY_GROUP: NotifSetting[] = [
  {
    key: NOTIFICATION_SETTING_KEYS.activityComment,
    label: 'Notify me when someone replies to my post or comment',
    keys: {
      mobile: NOTIFICATION_SETTING_KEYS.activityComment,
      web: NOTIFICATION_SETTING_KEYS.activityCommentWeb,
    },
  },
  {
    key: NOTIFICATION_SETTING_KEYS.newFollower,
    label: 'Notify me when someone starts following me',
    keys: {
      mobile: NOTIFICATION_SETTING_KEYS.newFollower,
      web: NOTIFICATION_SETTING_KEYS.newFollowerWeb,
    },
  },
];

const INTRODUCTIONS_GROUP: NotifSetting[] = [
  {
    key: NOTIFICATION_SETTING_KEYS.replyIntro,
    label: 'Notify me when someone replies to my introduction',
    keys: {
      mobile: NOTIFICATION_SETTING_KEYS.replyIntro,
      email: NOTIFICATION_SETTING_KEYS.replyIntroEmail,
    },
  },
];

// Mobile-only — no web/email field confirmed for these yet.
const DISCUSSIONS_GROUP: NotifSetting[] = [
  {
    key: NOTIFICATION_SETTING_KEYS.newDiscussion,
    label: 'Notify me when a new discussion is created',
    keys: {mobile: NOTIFICATION_SETTING_KEYS.newDiscussion},
  },
  {
    key: NOTIFICATION_SETTING_KEYS.forumReply,
    label: 'Notify me when someone replies to a discussion I follow',
    keys: {mobile: NOTIFICATION_SETTING_KEYS.forumReply},
  },
];

const FEED_GROUP: NotifSetting[] = [
  {
    key: NOTIFICATION_SETTING_KEYS.feedLike,
    label: 'Notify me when someone likes my post or activity',
    keys: {mobile: NOTIFICATION_SETTING_KEYS.feedLike},
  },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
const AccountSettingsScreen = ({navigation}: any) => {
  const [activeTab, setActiveTab] = useState<'login' | 'notifications'>('login');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── Login Info state ──────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(true);

  // ── Notification state ────────────────────────────────────────────────────
  // One flat map of backend key -> 'yes'/'no', loaded straight from
  // GET /custom/v1/notifications/settings. Rows read/write into it directly
  // via their declared keys (see GENERAL_GROUP etc. above) so there's a
  // single source of truth instead of per-group local state going stale.
  const [settingsMap, setSettingsMap] = useState<NotificationSettingsMap>({});
  const [loadingNotif, setLoadingNotif] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);
  const pendingChanges = useRef<Partial<NotificationSettingsMap>>({});

  const newPassRef = useRef<TextInput>(null);
  const repeatPassRef = useRef<TextInput>(null);

  useEffect(() => {
    loadCurrentEmail();
    loadNotifSettings();
  }, []);

  const loadNotifSettings = async () => {
    try {
      const data = await getNotificationSettings();
      setSettingsMap(data);
    } catch (e) {
      console.log('[AccountSettings] loadNotifSettings error:', e);
    } finally {
      setLoadingNotif(false);
    }
  };

  const loadCurrentEmail = async () => {
    try {
      const creds = await Keychain.getGenericPassword();
      const token = creds ? JSON.parse(creds.password)?.token : null;
      if (token) {
        const res = await fetch(
          'https://hub.instituteprojectmanagement.com/wp-json/wp/v2/users/me',
          {headers: {Authorization: `Bearer ${token}`}},
        );
        if (res.ok) {
          const data = await res.json();
          setEmail(data?.email || '');
        }
      }
    } catch {}
    finally {
      setLoadingEmail(false);
    }
  };

  // ── Toggle a single checkbox ───────────────────────────────────────────────
  // Flips the backend key locally and tracks it in pendingChanges so Save
  // only sends what actually changed, per the "send only what changed, or
  // the full map" spec.
  const toggleSetting = (backendKey: string) => {
    setSettingsMap(prev => {
      const nextVal: 'yes' | 'no' = prev[backendKey] === 'yes' ? 'no' : 'yes';
      pendingChanges.current[backendKey] = nextVal;
      return {...prev, [backendKey]: nextVal};
    });
  };

  const handleSaveLoginInfo = async () => {
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
      const creds = await Keychain.getGenericPassword();
      const token = creds ? JSON.parse(creds.password)?.token : null;
      if (!token) throw new Error('Not authenticated');
      const body: any = {};
      if (email.trim()) body.email = email.trim();
      if (newPassword) body.password = newPassword;
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

  // ── Save notification preferences ─────────────────────────────────────────
  // POST /custom/v1/notifications/settings — sends only the keys the user
  // actually touched this session (pendingChanges), per spec ("send only
  // what changed, or the full map"). Falls back to the full map if nothing
  // was tracked (e.g. screen reopened) so Save always has something to send.
  const handleSaveNotifications = async () => {
    setSavingNotif(true);
    try {
      const changed = pendingChanges.current;
      const payload = Object.keys(changed).length > 0 ? changed : settingsMap;
      const ok = await updateNotificationSettings(payload);
      if (ok) {
        pendingChanges.current = {};
        Alert.alert('Saved', 'Notification preferences updated.');
      } else {
        Alert.alert('Error', 'Could not save notification preferences.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    } finally {
      setSavingNotif(false);
    }
  };

  // ── Log out ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logoutUser();
          // TODO(Marium): confirm this matches the actual Auth-stack screen
          // name registered in AppNavigator — using 'SignIn' as a placeholder.
          navigation?.reset?.({index: 0, routes: [{name: 'SignIn'}]});
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ══════════════════ LOGIN TAB ══════════════════ */}
        {/* One continuous layout — fields at top, account actions pinned to
            the bottom via justifyContent: 'space-between', per the Figma
            frame spec (390×694, padding 0 16, column, space-between). */}
        {activeTab === 'login' && (
          <View style={styles.loginWrap}>
          <View>
            <Text style={styles.sectionHeading}>{'Login Information'}</Text>
            <Text style={styles.fieldLabel}>{'Account Email'}</Text>
            {loadingEmail ? (
              <View style={styles.inputSkeleton}>
                <ActivityIndicator size="small" color={NAVY} />
              </View>
            ) : (
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => newPassRef.current?.focus()}
                placeholderTextColor="#C0C0C0"
              />
            )}
            <View style={styles.hintRow}>
              <View style={styles.hintIconBox}>
                <ExclamationIcon />
              </View>
              <Text style={styles.hintText}>{'Leave password fields blank for no change'}</Text>
            </View>
            <Text style={styles.fieldLabel}>{'Add Your New Password'}</Text>
            <View style={styles.passRow}>
              <TextInput
                ref={newPassRef}
                style={styles.passInput}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
                placeholderTextColor="#C0C0C0"
                returnKeyType="next"
                onSubmitEditing={() => repeatPassRef.current?.focus()}
              />
              <TouchableOpacity
                onPress={() => setShowNew(p => !p)}
                style={styles.eyeBtn}
                hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
                {showNew ? <EyeOpenIcon /> : <EyeOffIcon />}
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
                {showRepeat ? <EyeOpenIcon /> : <EyeOffIcon />}
              </TouchableOpacity>
            </View>
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
          </View>

          {/* ── Account actions — Login Information tab only ── */}
          <View style={styles.actionsGroup}>
            <TouchableOpacity style={styles.actionRow} onPress={handleLogout} activeOpacity={0.7}>
              <LogoutIcon />
              <Text style={styles.actionLabel}>{'Log Out'}</Text>
              <Text style={styles.actionEmail} numberOfLines={1}>{email}</Text>
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
        {activeTab === 'notifications' && (
          <View style={styles.formCard}>
            <Text style={styles.sectionHeading}>{'Notification Settings'}</Text>
            <Text style={styles.notifSubtitle}>
              {'Choose which notifications to receive across all your devices.'}
            </Text>

            {loadingNotif ? (
              <ActivityIndicator color={NAVY} style={{marginTop: 20}} />
            ) : (
              <>
                {/* ── Channel legend ── */}
                <View style={styles.channelLegend}>
                  <View style={styles.legendItem}>
                    <EmailIcon color={NAVY} />
                    <Text style={styles.legendTitle}>{'Email'}</Text>
                    <Text style={styles.legendDesc}>{'A notification sent to your inbox'}</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <WebIcon color={NAVY} />
                    <Text style={styles.legendTitle}>{'Web'}</Text>
                    <Text style={styles.legendDesc}>{'A notification in the corner of your screen'}</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <MobileIcon color={NAVY} />
                    <Text style={styles.legendTitle}>{'Mobile'}</Text>
                    <Text style={styles.legendDesc}>{'Push Notifications'}</Text>
                  </View>
                </View>

                {/* ── General ── */}
                <View>
                  {GENERAL_GROUP.map(s => (
                    <NotifRow key={s.key} setting={s} settingsMap={settingsMap} onToggle={toggleSetting} />
                  ))}
                </View>

                {/* ── Mentions ── */}
                <Text style={styles.groupLabel}>{'MENTIONS'}</Text>
                <View>
                  {MENTIONS_GROUP.map(s => (
                    <NotifRow key={s.key} setting={s} settingsMap={settingsMap} onToggle={toggleSetting} />
                  ))}
                </View>

                {/* ── Activity ── */}
                <Text style={styles.groupLabel}>{'ACTIVITY'}</Text>
                <View>
                  {ACTIVITY_GROUP.map(s => (
                    <NotifRow key={s.key} setting={s} settingsMap={settingsMap} onToggle={toggleSetting} />
                  ))}
                </View>

                {/* ── Introductions — Mobile + Email, no Web field yet ── */}
                <Text style={styles.groupLabel}>{'INTRODUCTIONS'}</Text>
                <View>
                  {INTRODUCTIONS_GROUP.map(s => (
                    <NotifRow key={s.key} setting={s} settingsMap={settingsMap} onToggle={toggleSetting} />
                  ))}
                </View>

                {/* ── Discussions (Forums) — Mobile only, no Web/Email field yet ── */}
                <Text style={styles.groupLabel}>{'DISCUSSIONS (FORUMS)'}</Text>
                <View>
                  {DISCUSSIONS_GROUP.map(s => (
                    <NotifRow key={s.key} setting={s} settingsMap={settingsMap} onToggle={toggleSetting} />
                  ))}
                </View>

                {/* ── Feed — Mobile only, no Web/Email field yet ── */}
                <Text style={styles.groupLabel}>{'FEED'}</Text>
                <View>
                  {FEED_GROUP.map(s => (
                    <NotifRow key={s.key} setting={s} settingsMap={settingsMap} onToggle={toggleSetting} />
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, {marginTop: 10}, savingNotif && styles.saveBtnDisabled]}
                  onPress={handleSaveNotifications}
                  disabled={savingNotif}
                  activeOpacity={0.85}>
                  {savingNotif ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>{'Save  Changes'}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        <View style={{height: 40}} />
      </ScrollView>

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </SafeAreaView>
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
  scrollContent: {flexGrow: 1, padding: 16},
  // Notification Settings tab keeps its bordered card look.
  formCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20,
    borderWidth: 1, borderColor: '#EBEBEB',
  },
  // Login Information tab — one continuous layout, no card border, fields
  // at top and account actions pinned to the bottom (space-between), per
  // the Figma frame spec (390×694, padding 0 16, column, space-between).
  loginWrap: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  sectionHeading: {fontSize: 15, fontWeight: '700', color: NAVY, marginBottom: 6},
  notifSubtitle: {fontSize: 12, color: '#888', lineHeight: 17, marginBottom: 16},

  // ── Channel legend ──
  channelLegend: {
    flexDirection: 'row', gap: 8, marginBottom: 16,
    paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  legendItem: {flex: 1, alignItems: 'center', gap: 4},
  legendTitle: {fontSize: 12, fontWeight: '600', color: NAVY, marginTop: 4},
  legendDesc: {fontSize: 10, color: '#888', textAlign: 'center', lineHeight: 13},

  // ── Notification group heading (Heading/H4 spec) ──
  groupLabel: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '500',
    color: DARK_NAVY,
    marginTop: 16,
    marginBottom: 8,
  },

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
    flex: 1,
    fontSize: 12,
    color: '#888',
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
    paddingBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
    alignSelf: 'stretch',
  },
  actionLabel: {
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '500',
    color: DARK_NAVY,
  },
  actionEmail: {
    flex: 1,
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: '#8F9098',
    textAlign: 'right',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#B0B0B0',
    marginTop: 14,
  },
});

export default AccountSettingsScreen;
