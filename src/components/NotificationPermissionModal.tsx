/* eslint-disable prettier/prettier */
/**
 * NotificationPermissionModal — first-run / reinstall "turn on notifications"
 * prompt. Shown as a bottom sheet over whatever screen triggers it (Figma
 * shows it over Feed, right after signup/onboarding completes).
 *
 * Usage:
 *   <NotificationPermissionModal
 *     visible={showNotifPrompt}
 *     onAllow={handleAllowNotifications}
 *     onSkip={() => setShowNotifPrompt(false)}
 *   />
 *
 * NOTE(Marium): "Allow Notifications" only fires onAllow — it does not call
 * any OS permission API itself. There's no push notification library
 * (Firebase/Notifee/react-native-permissions) confirmed anywhere in the
 * project yet, and the backend push-token endpoint (POST /ipm/v1/push-token)
 * is still pending from Robby per the project notes. Wire the real
 * "request permission + register push token" flow into onAllow once both
 * of those land — this component only handles the UI/copy.
 *
 * Also worth deciding: where this gets triggered from (once, on first
 * successful login after signup — likely CongratulationsScreen or the
 * first Feed mount — gated by an AsyncStorage/Keychain flag so it doesn't
 * reappear on every launch). Not wired yet; left for you to hook in.
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Modal} from 'react-native';
import Svg, {Path} from 'react-native-svg';

const NAVY = '#192546';
const DARK_BLUE = '#0C4D91';
const GREY = '#71727A';
const ICON_BG = '#EEF7FC';

// ─── Bell hero graphic (provided asset, used as-is) ──────────────────────────
const BellHero = () => (
  <Svg width={69.677} height={45} viewBox="0 0 70 45" fill="none">
    <Path d="M49.6414 37.4072L48.4214 32.2283C48.1133 30.8669 48.1133 29.4539 48.4214 28.0925L50.1172 20.7176C50.811 17.5726 50.4353 14.2861 49.0497 11.3789C47.664 8.47163 45.3477 6.11005 42.4678 4.66844C42.5218 4.53275 42.5687 4.39429 42.6081 4.25364C42.7082 3.80625 42.7192 3.34351 42.6405 2.89186C42.5618 2.4402 42.395 2.00846 42.1494 1.6213C41.9039 1.23414 41.5844 0.899136 41.2094 0.635415C40.8344 0.371694 40.4111 0.18442 39.9637 0.0842869C39.5163 -0.0158461 39.0536 -0.0268785 38.6019 0.051821C38.1503 0.130521 37.7186 0.297419 37.3314 0.542969C36.9442 0.78852 36.6092 1.10792 36.3455 1.48294C36.0818 1.85796 35.8945 2.28125 35.7944 2.72864C35.7641 2.87124 35.7457 3.01611 35.7395 3.16175C32.5201 3.23728 29.418 4.38459 26.9243 6.42201C24.4305 8.45943 22.6877 11.2705 21.9718 14.4101L20.3187 21.7912C20.015 23.1501 19.4105 24.4237 18.5497 25.5183L15.2618 29.6968C14.9402 30.1066 14.7276 30.5912 14.6437 31.1054C14.5599 31.6196 14.6076 32.1467 14.7824 32.6375C14.9571 33.1283 15.2533 33.5668 15.6432 33.9123C16.0332 34.2578 16.5042 34.499 17.0125 34.6134L45.9875 41.1038C46.494 41.2132 47.02 41.1931 47.5166 41.0453C48.0133 40.8976 48.4647 40.6269 48.829 40.2583C49.1933 39.8898 49.4587 39.4353 49.6007 38.9369C49.7427 38.4385 49.7567 37.9124 49.6414 37.4072Z" fill={DARK_BLUE} />
    <Path d="M27.7599 39.0058C27.5395 38.9572 27.3105 38.9637 27.0932 39.0248C26.8759 39.0858 26.6771 39.1994 26.5142 39.3557C26.3513 39.5119 26.2295 39.7059 26.1595 39.9204C26.0895 40.135 26.0735 40.3635 26.1129 40.5858C26.2793 41.5659 26.7336 42.4744 27.4181 43.1955C28.1025 43.9165 28.9861 44.4176 29.9563 44.6348C30.9264 44.852 31.9393 44.7755 32.8659 44.4151C33.7924 44.0547 34.5908 43.4266 35.1592 42.6109C35.289 42.4271 35.3717 42.2141 35.3998 41.9908C35.428 41.7675 35.4008 41.5407 35.3206 41.3304C35.2405 41.1201 35.1098 40.9327 34.9402 40.7847C34.7706 40.6368 34.5671 40.5328 34.3479 40.482L27.7599 39.0058Z" fill={DARK_BLUE} />
    <Path d="M5.50633 28.7395C5.35518 28.7406 5.20616 28.7038 5.07293 28.6324C4.93971 28.561 4.82655 28.4573 4.74382 28.3308C1.86276 24.0143 0.814258 18.7302 1.82895 13.6408C2.84363 8.55134 5.83841 4.07337 10.1545 1.19185C10.3568 1.05757 10.604 1.00913 10.842 1.05717C11.0799 1.10522 11.2891 1.24582 11.4233 1.44805C11.5576 1.65028 11.6061 1.89756 11.558 2.13551C11.51 2.37346 11.3694 2.58257 11.1671 2.71685C7.25986 5.33385 4.5512 9.39482 3.63618 14.0076C2.72116 18.6205 3.67463 23.4079 6.28713 27.3182C6.42206 27.5196 6.47152 27.7664 6.42463 28.0043C6.37774 28.2422 6.23833 28.4518 6.03703 28.587C5.87972 28.6905 5.69461 28.7437 5.50633 28.7395Z" fill={DARK_BLUE} />
    <Path d="M9.37988 26.1423C9.22997 26.1414 9.08258 26.1036 8.95069 26.0324C8.81879 25.9611 8.70643 25.8585 8.62348 25.7336C6.4306 22.4455 5.63253 18.4213 6.40456 14.5452C7.17659 10.669 9.45559 7.25775 12.741 5.06072C12.8411 4.99383 12.9534 4.94732 13.0716 4.92385C13.1897 4.90037 13.3112 4.90039 13.4293 4.92389C13.5474 4.9474 13.6598 4.99394 13.7599 5.06085C13.86 5.12776 13.9459 5.21374 14.0128 5.31387C14.0797 5.41401 14.1262 5.52633 14.1497 5.64444C14.1732 5.76255 14.1732 5.88413 14.1497 6.00223C14.1262 6.12033 14.0796 6.23264 14.0127 6.33276C13.9458 6.43288 13.8598 6.51883 13.7597 6.58572C10.876 8.51018 8.87486 11.5013 8.19649 14.9012C7.51812 18.3011 8.21807 21.8311 10.1424 24.7149C10.2773 24.9164 10.3268 25.1632 10.2799 25.4011C10.233 25.639 10.0936 25.8485 9.89228 25.9837C9.74052 26.0853 9.56247 26.1404 9.37988 26.1423Z" fill={DARK_BLUE} />
    <Path d="M13.2594 23.549C13.1098 23.5498 12.9624 23.5134 12.8304 23.4432C12.6984 23.3729 12.5858 23.2709 12.503 23.1464C11.7556 22.0273 11.2362 20.7718 10.9746 19.4518C10.713 18.1317 10.7142 16.7731 10.9782 15.4535C11.2423 14.1339 11.7639 12.8794 12.5133 11.7616C13.2627 10.6439 14.2252 9.68487 15.3456 8.93949C15.547 8.81437 15.7892 8.77235 16.021 8.82227C16.2528 8.87219 16.4562 9.01016 16.5883 9.2071C16.7204 9.40404 16.7708 9.64457 16.7291 9.87799C16.6873 10.1114 16.5565 10.3195 16.3643 10.4584C15.4453 11.0719 14.6562 11.8604 14.042 12.7789C13.4278 13.6974 13.0006 14.7279 12.7848 15.8116C12.569 16.8952 12.5688 18.0108 12.7842 19.0945C12.9996 20.1783 13.4264 21.209 14.0402 22.1277C14.1735 22.3296 14.222 22.5759 14.1752 22.8134C14.1284 23.0508 13.9901 23.2603 13.7901 23.3965C13.6328 23.5001 13.4477 23.5532 13.2594 23.549Z" fill={DARK_BLUE} />
    <Path d="M58.2605 41.605C58.0559 41.6045 57.8573 41.5354 57.6966 41.4089C57.5358 41.2823 57.4222 41.1055 57.3737 40.9067C57.3252 40.7079 57.3448 40.4987 57.4292 40.3123C57.5137 40.126 57.6581 39.9733 57.8396 39.8787C62.0189 37.7193 65.1697 33.9888 66.5995 29.5072C68.0293 25.0256 67.6211 20.1596 65.4646 15.9789C65.399 15.8715 65.3563 15.7518 65.3391 15.6273C65.3218 15.5027 65.3304 15.3759 65.3644 15.2548C65.3984 15.1337 65.4569 15.021 65.5364 14.9235C65.6159 14.8261 65.7147 14.746 65.8265 14.6885C65.9383 14.6309 66.0607 14.597 66.1862 14.5888C66.3117 14.5807 66.4376 14.5985 66.5559 14.6412C66.6742 14.6838 66.7824 14.7504 66.8738 14.8368C66.9652 14.9232 67.0379 15.0275 67.0872 15.1432C68.2652 17.4277 68.9816 19.9219 69.1954 22.4834C69.4093 25.0449 69.1165 27.6234 68.3336 30.0716C67.5507 32.5199 66.2932 34.79 64.6329 36.7521C62.9725 38.7143 60.9419 40.3301 58.657 41.5074C58.5333 41.5678 58.3981 41.6011 58.2605 41.605Z" fill={DARK_BLUE} />
    <Path d="M56.1198 37.4619C55.9152 37.4615 55.7167 37.3924 55.556 37.2658C55.3952 37.1393 55.2815 36.9625 55.2331 36.7637C55.1846 36.5649 55.2042 36.3556 55.2886 36.1693C55.3731 35.9829 55.5175 35.8303 55.6989 35.7357C57.2254 34.9487 58.5817 33.8685 59.6904 32.557C60.799 31.2454 61.6383 29.7281 62.16 28.0919C62.6818 26.4557 62.876 24.7327 62.7313 23.0215C62.5867 21.3102 62.1061 19.6442 61.317 18.1188C61.2054 17.9029 61.1842 17.6514 61.2579 17.4197C61.3317 17.1881 61.4945 16.9952 61.7105 16.8836C61.9265 16.772 62.178 16.7507 62.4096 16.8245C62.6413 16.8983 62.8341 17.0611 62.9457 17.277C63.8448 19.0159 64.3923 20.915 64.557 22.8656C64.7217 24.8162 64.5003 26.7802 63.9054 28.6452C63.3105 30.5102 62.3539 32.2397 61.0903 33.7347C59.8266 35.2298 58.2806 36.4611 56.5407 37.3583C56.4113 37.4274 56.2666 37.4631 56.1198 37.4619Z" fill={DARK_BLUE} />
    <Path d="M53.9783 33.321C53.7745 33.3177 53.5775 33.2468 53.4182 33.1195C53.259 32.9922 53.1464 32.8157 53.0983 32.6175C53.0502 32.4194 53.0691 32.2109 53.1522 32.0247C53.2353 31.8385 53.3778 31.6851 53.5575 31.5886C54.5396 31.0832 55.4123 30.3891 56.1259 29.546C56.8394 28.7028 57.3796 27.7272 57.7156 26.6751C58.0516 25.6229 58.1768 24.5148 58.084 23.4141C57.9912 22.3135 57.6822 21.242 57.1748 20.2609C57.0631 20.045 57.0419 19.7935 57.1157 19.5618C57.1894 19.3302 57.3522 19.1373 57.5682 19.0257C57.7842 18.9141 58.0357 18.8928 58.2673 18.9666C58.499 19.0404 58.6918 19.2032 58.8035 19.4191C60.0449 21.835 60.2771 24.6448 59.4491 27.2317C58.6211 29.8186 56.8006 31.9713 54.3871 33.2173C54.2605 33.2826 54.1207 33.3181 53.9783 33.321Z" fill={DARK_BLUE} />
  </Svg>
);

// ─── Row type icons (17.143×17.143, exact paths from Figma) ─────────────────
const MessageIcon = () => (
  <Svg width={17.143} height={17.143} viewBox="0 0 18 18" fill="none">
    <Path d="M1.07228 7.23193C1.07228 4.12533 3.59068 1.60693 6.69728 1.60693C9.80389 1.60693 12.3223 4.12533 12.3223 7.23193C12.3223 10.3385 9.80443 12.8569 6.69728 12.8569C5.79407 12.8569 4.93961 12.6437 4.18211 12.2644L2.08478 12.8264C1.94854 12.8629 1.8051 12.8629 1.66887 12.8264C1.53263 12.7899 1.40841 12.7181 1.30868 12.6184C1.20895 12.5187 1.13722 12.3944 1.10071 12.2582C1.0642 12.122 1.06419 11.9785 1.10068 11.8423L1.66318 9.74336C1.27242 8.96398 1.07003 8.10378 1.07228 7.23193ZM6.69728 13.6605C7.05443 13.6601 7.40353 13.6319 7.74461 13.5759C8.52681 14.1543 9.47441 14.4658 10.4473 14.4641C11.2434 14.4641 11.9901 14.2605 12.6405 13.9021C12.7616 13.8354 12.9039 13.8181 13.0375 13.8539L14.8889 14.35L14.3928 12.4975C14.3572 12.3641 14.3745 12.222 14.441 12.101C14.8097 11.4299 15.0023 10.6763 15.0009 9.91051C15.0013 9.17392 14.8229 8.44824 14.4809 7.79587C14.1389 7.14349 13.6435 6.58394 13.0375 6.16533C12.9541 5.66833 12.8126 5.18285 12.6159 4.7189C13.6399 5.14676 14.5145 5.86798 15.1295 6.79179C15.7445 7.71559 16.0726 8.80069 16.0723 9.91051C16.0727 10.7821 15.8706 11.6418 15.4819 12.4219L16.0444 14.5209C16.081 14.6572 16.081 14.8007 16.0444 14.937C16.0079 15.0733 15.9361 15.1975 15.8363 15.2973C15.7365 15.397 15.6122 15.4687 15.4759 15.5052C15.3396 15.5417 15.1961 15.5416 15.0598 15.505L12.9625 14.943C12.1817 15.3338 11.3204 15.5367 10.4473 15.5355C8.77371 15.5355 7.2705 14.8048 6.24032 13.6444C6.39139 13.6551 6.54371 13.6605 6.69728 13.6605Z" fill={DARK_BLUE} />
  </Svg>
);

const EventIcon = () => (
  <Svg width={17.143} height={17.143} viewBox="0 0 18 18" fill="none">
    <Path d="M1.42773 13.5716C1.42773 14.7859 2.35631 15.7144 3.57059 15.7144H13.5706C14.7849 15.7144 15.7134 14.7859 15.7134 13.5716V7.85728H1.42773V13.5716ZM13.5706 2.85728H12.142V2.143C12.142 1.71443 11.8563 1.42871 11.4277 1.42871C10.9992 1.42871 10.7134 1.71443 10.7134 2.143V2.85728H6.42773V2.143C6.42773 1.71443 6.14202 1.42871 5.71345 1.42871C5.28488 1.42871 4.99916 1.71443 4.99916 2.143V2.85728H3.57059C2.35631 2.85728 1.42773 3.78585 1.42773 5.00014V6.42871H15.7134V5.00014C15.7134 3.78585 14.7849 2.85728 13.5706 2.85728Z" fill={DARK_BLUE} />
  </Svg>
);

// react-native-svg@15.3.0 doesn't render <mask> — the Figma export used one
// purely to fill this speech-bubble shape solid, so we draw the path with a
// direct fill instead of the mask+rect trick (same visual result).
const DiscussionIcon = () => (
  <Svg width={16.14} height={16.14} viewBox="0 0 16 16" fill="none">
    <Path d="M4.53922 0.933105C2.1334 0.933105 0.167969 2.86623 0.167969 5.26905C0.167969 6.17006 0.349378 7.63421 1.34946 9.36918C2.34678 11.0994 4.1318 13.0531 7.26806 14.9812L7.27135 14.9832C7.51196 15.1296 7.78819 15.2071 8.06984 15.2071C8.35149 15.2071 8.62772 15.1296 8.86833 14.9832L8.87163 14.9812C12.0079 13.0531 13.7929 11.0994 14.7902 9.36918C15.7903 7.63421 15.9717 6.17006 15.9717 5.26905C15.9717 2.86623 14.0063 0.933105 11.6005 0.933105C10.333 0.933105 9.26066 1.61128 8.56761 2.18571C8.38191 2.33962 8.21511 2.49303 8.06984 2.63585C7.92457 2.49303 7.75778 2.33962 7.57207 2.18571C6.87902 1.61128 5.80669 0.933105 4.53922 0.933105Z" fill={DARK_BLUE} />
  </Svg>
);

// Not provided in the Figma spec ("try one on own") — matches the two-person
// glyph already used for the Mentors tab icon (BottomTabNavigator.tsx),
// scaled down to the same 17.143×17.143 box as the other row icons so it
// sits flush with Messages/Events/Discussion.
const MentorActivityIcon = () => (
  <Svg width={17.143} height={17.143} viewBox="0 0 18 18" fill="none">
    <Path
      d="M11.8 5.2C11.8 6.30457 10.9046 7.2 9.8 7.2C8.69543 7.2 7.8 6.30457 7.8 5.2C7.8 4.09543 8.69543 3.2 9.8 3.2C10.9046 3.2 11.8 4.09543 11.8 5.2Z"
      fill={DARK_BLUE}
    />
    <Path
      d="M14.8 12.8C14.8 10.8118 13.2255 9.2 11.2 9.2C10.472 9.2 9.7936 9.408 9.224 9.768C10.056 10.632 10.6 11.696 10.6 12.8H14.8Z"
      fill={DARK_BLUE}
    />
    <Path
      d="M7.4 5.6C7.4 6.81503 6.41503 7.8 5.2 7.8C3.98497 7.8 3 6.81503 3 5.6C3 4.38497 3.98497 3.4 5.2 3.4C6.41503 3.4 7.4 4.38497 7.4 5.6Z"
      fill={DARK_BLUE}
    />
    <Path
      d="M5.2 8.8C2.88 8.8 1 10.412 1 12.4V12.8H9.4V12.4C9.4 10.412 7.52 8.8 5.2 8.8Z"
      fill={DARK_BLUE}
    />
  </Svg>
);

interface NotifRowItem {
  key: string;
  icon: React.FC;
  heading: string;
  detail: string;
}

const ROWS: NotifRowItem[] = [
  {
    key: 'messages',
    icon: MessageIcon,
    heading: 'Messages',
    detail: 'Get notified when you receive new messages',
  },
  {
    key: 'mentor_activity',
    icon: MentorActivityIcon,
    heading: 'Mentor activity',
    detail: 'Know when your mentors reply or share updates',
  },
  {
    key: 'events_webinars',
    icon: EventIcon,
    heading: 'Events & webinars',
    detail: 'Never miss important events and reminders',
  },
  {
    key: 'discussion_replies',
    icon: DiscussionIcon,
    heading: 'Discussion replies',
    detail: 'Be the first to know about replies to your posts',
  },
];

interface NotificationPermissionModalProps {
  visible: boolean;
  onAllow: () => void;
  onSkip: () => void;
}

const NotificationPermissionModal = ({
  visible,
  onAllow,
  onSkip,
}: NotificationPermissionModalProps) => (
  <Modal transparent animationType="slide" visible={visible} onRequestClose={onSkip}>
    <View style={s.overlay}>
      <View style={s.sheet}>
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Notifications</Text>
        </View>

        {/* ── Hero + copy + row list ── */}
        <View style={s.content}>
          <BellHero />
          <Text style={s.title}>Stay connected with IPM Hub</Text>
          <Text style={s.subtitle}>
            Turn on notifications to never miss messages, likes and comments
          </Text>

          <View style={s.rowList}>
            {ROWS.map(row => {
              const Icon = row.icon;
              return (
                <View key={row.key} style={s.row}>
                  <View style={s.iconFrame}>
                    <Icon />
                  </View>
                  <View style={s.rowText}>
                    <Text style={s.rowHeading}>{row.heading}</Text>
                    <Text style={s.rowDetail}>{row.detail}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Buttons ── */}
        <View style={s.btnGroup}>
          <TouchableOpacity style={s.allowBtn} onPress={onAllow} activeOpacity={0.85}>
            <Text style={s.allowBtnText}>Allow Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.skipBtn} onPress={onSkip} activeOpacity={0.7}>
            <Text style={s.skipBtnText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },

  header: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  headerTitle: {
    color: DARK_BLUE,
    textAlign: 'center',
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.08,
  },

  content: {
    paddingHorizontal: 16,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  title: {
    color: NAVY,
    textAlign: 'center',
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.08,
    marginTop: 16,
  },
  subtitle: {
    color: GREY,
    textAlign: 'center',
    fontFamily: 'Runda-Normal',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 8,
  },

  rowList: {alignSelf: 'stretch'},
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    marginBottom: 16, // substitutes for gap:16 on rowList, forbidden on Android/Hermes
  },
  iconFrame: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowText: {flex: 1},
  rowHeading: {
    color: NAVY,
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  rowDetail: {
    color: NAVY,
    fontFamily: 'Runda-Normal',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },

  btnGroup: {
    paddingHorizontal: 16,
    alignSelf: 'stretch',
    marginTop: 16,
  },
  allowBtn: {
    height: 40,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 100,
    backgroundColor: DARK_BLUE,
    marginBottom: 12,
  },
  allowBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Runda-Medium',
    fontSize: 14,
  },
  skipBtn: {
    height: 40,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: DARK_BLUE,
  },
  skipBtnText: {
    color: DARK_BLUE,
    fontFamily: 'Runda-Medium',
    fontSize: 14,
  },
});

export default NotificationPermissionModal;
