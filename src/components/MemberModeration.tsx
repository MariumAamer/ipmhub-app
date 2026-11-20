/* eslint-disable prettier/prettier */
/**
 * MemberModeration — the "More Options" sheet opened from the three dots on
 * another member's profile cover, per Figma:
 *  - MemberMoreOptionsSheet : "Report {name}" and "Block {name}".
 *  - BlockMemberSheet       : "Block member" confirmation (UI only — the
 *                             block call isn't wired, backend not built yet).
 *
 * The Report follow-up screen is NOT built yet — waiting on its Figma spec.
 *
 * Rendered as a plain in-screen overlay (not a native <Modal>) — same
 * reasoning as StatusSheet / LogoutConfirmDialog: RN's iOS Modal can throw
 * when presented mid-transition. Mount it as the LAST child of a
 * full-screen container so it sits above siblings.
 *
 * `gap` is avoided on purpose (unreliable on Android/Hermes) — the Figma
 * gaps are done with margins.
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
import Svg, {Path} from 'react-native-svg';

const NAVY = '#192546';
const DARK_BLUE = '#0C4D91';
const OFFSCREEN = 400;

// ─── Icons (Figma exports, 15x15) ─────────────────────────────────────────────
export const ReportIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path
      d="M2.65488 2.22C2.55488 2.32 2.50488 2.435 2.50488 2.565V13.125C2.50488 13.255 2.54988 13.365 2.63988 13.455C2.72988 13.545 2.83988 13.59 2.96988 13.59C3.09988 13.59 3.20988 13.545 3.29988 13.455C3.38988 13.365 3.43488 13.255 3.43488 13.125V8.445H12.1649C12.2949 8.445 12.3899 8.395 12.4499 8.295C12.5099 8.185 12.5049 8.08 12.4349 7.98L12.1649 7.515L10.9349 5.49C10.8749 5.38 10.8449 5.27 10.8449 5.16C10.8449 5.05 10.8749 4.945 10.9349 4.845L12.4349 2.355C12.5049 2.245 12.5099 2.14 12.4499 2.04C12.3899 1.93 12.2949 1.875 12.1649 1.875H3.20988C3.08988 1.875 2.97988 1.91 2.87988 1.98C2.76988 2.04 2.69488 2.12 2.65488 2.22ZM3.52488 2.805H11.0699L10.1399 4.35C9.98988 4.6 9.91488 4.87 9.91488 5.16C9.91488 5.45 9.98988 5.72 10.1399 5.97L11.0699 7.515H3.58488L3.52488 2.805Z"
      fill={NAVY}
    />
  </Svg>
);

export const BlockIcon = ({size = 15}: {size?: number}) => (
  <Svg width={size} height={size} viewBox="0 0 15 15" fill="none">
    <Path
      d="M7.5 12.18C6.65 12.18 5.86 11.97 5.13 11.55C4.43 11.13 3.87 10.57 3.45 9.87C3.03 9.14 2.82 8.35 2.82 7.5C2.82 6.95 2.91 6.42 3.09 5.91C3.27 5.4 3.53 4.94 3.87 4.53L10.305 11.265C9.905 11.555 9.4675 11.78 8.9925 11.94C8.5175 12.1 8.02 12.18 7.5 12.18ZM10.995 10.62L4.53 3.87C4.94 3.53 5.395 3.27 5.895 3.09C6.415 2.9 6.95 2.805 7.5 2.805C8.35 2.805 9.14 3.02 9.87 3.45C10.58 3.86 11.14 4.42 11.55 5.13C11.98 5.86 12.195 6.65 12.195 7.5C12.195 8.09 12.085 8.655 11.865 9.195C11.665 9.725 11.375 10.2 10.995 10.62ZM1.875 7.5C1.875 8.52 2.13 9.465 2.64 10.335C3.14 11.185 3.815 11.86 4.665 12.36C5.535 12.87 6.48 13.125 7.5 13.125C8.52 13.125 9.465 12.87 10.335 12.36C11.185 11.86 11.86 11.185 12.36 10.335C12.87 9.465 13.125 8.52 13.125 7.5C13.125 6.48 12.87 5.535 12.36 4.665C11.86 3.815 11.185 3.14 10.335 2.64C9.465 2.13 8.52 1.875 7.5 1.875C6.48 1.875 5.535 2.13 4.665 2.64C3.815 3.14 3.14 3.815 2.64 4.665C2.13 5.535 1.875 6.48 1.875 7.5Z"
      fill={NAVY}
    />
  </Svg>
);

// Figma close icon (20x20). The export draws the X as a mask over a
// #C5C6CC rect — same result as filling the X path directly.
const CloseIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M5.80012 6.67912L9.02012 9.89907L5.80012 13.099C5.68012 13.219 5.62012 13.3657 5.62012 13.539C5.62012 13.7123 5.68012 13.859 5.80012 13.979C5.92012 14.099 6.06678 14.159 6.24012 14.159C6.41345 14.159 6.56012 14.099 6.68012 13.979L9.90012 10.7791L13.1001 13.979C13.2201 14.099 13.3668 14.159 13.5401 14.159C13.7135 14.159 13.8601 14.099 13.9801 13.979C14.1001 13.859 14.1601 13.7123 14.1601 13.539C14.1601 13.3657 14.1001 13.219 13.9801 13.099L10.7801 9.89907L13.9801 6.67912C14.1001 6.55913 14.1601 6.41246 14.1601 6.23913C14.1601 6.0658 14.1001 5.91914 13.9801 5.79914C13.8601 5.67914 13.7135 5.61914 13.5401 5.61914C13.3668 5.61914 13.2201 5.67914 13.1001 5.79914L9.90012 8.99909L6.68012 5.79914C6.56012 5.67914 6.41345 5.61914 6.24012 5.61914C6.06678 5.61914 5.92012 5.67914 5.80012 5.79914C5.68012 5.91914 5.62012 6.0658 5.62012 6.23913C5.62012 6.41246 5.68012 6.55913 5.80012 6.67912Z"
      fill="#C5C6CC"
    />
  </Svg>
);

// ─── Shared sheet shell: backdrop + slide-up card + Figma header ──────────────
const SheetShell = ({
  visible,
  title,
  onClose,
  divider = false,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Hairline under the header (Block member sheet). */
  divider?: boolean;
  children: React.ReactNode;
}) => {
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

      <Animated.View style={[s.sheet, {transform: [{translateY}]}]}>
        {/* Header: 56 tall, title centred, close at the right (24px in) */}
        <View style={[s.header, divider && s.headerDivider]}>
          <Text style={s.title}>{title}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={s.closeBtn}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <CloseIcon />
          </TouchableOpacity>
        </View>
        {children}
      </Animated.View>
    </View>
  );
};

// ─── More Options sheet (Figma) ───────────────────────────────────────────────
export const MemberMoreOptionsSheet = ({
  visible,
  name,
  onClose,
  onReport,
  onBlock,
}: {
  visible: boolean;
  name: string;
  onClose: () => void;
  onReport: () => void;
  onBlock: () => void;
}) => (
  <SheetShell visible={visible} title="More Options" onClose={onClose}>
    {/* List: padding 0 16, 6px between rows */}
    <View style={s.list}>
      <TouchableOpacity style={s.row} onPress={onReport} activeOpacity={0.6}>
        <ReportIcon />
        <Text style={s.rowText}>{`Report ${name}`}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.row, s.rowSpaced]} onPress={onBlock} activeOpacity={0.6}>
        <BlockIcon />
        <Text style={s.rowText}>{`Block ${name}`}</Text>
      </TouchableOpacity>
    </View>
  </SheetShell>
);

// ─── Block member sheet (Figma "Member Profile - Public View - Block") ────────
const BLOCK_RESTRICTIONS = [
  'See their posts and comments',
  'Mention them in posts',
  'Invite them to groups',
  'Message them',
  'Follow them',
];

export const BlockMemberSheet = ({
  visible,
  name,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  name: string;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <SheetShell visible={visible} title="Block member" onClose={onClose} divider>
    <View style={s.blockBody}>
      <Text style={s.blockHeading}>{`Block ${name}?`}</Text>
      <Text style={s.blockText}>
        {'Please confirm you want to block this member. You will no longer be able to:'}
      </Text>
      <View style={s.bullets}>
        {BLOCK_RESTRICTIONS.map(item => (
          <Text key={item} style={s.bullet}>{`\u00B7  ${item}`}</Text>
        ))}
      </View>
      <Text style={s.blockNote}>
        {"This also removes the follow between you. They won't be notified."}
      </Text>

      <TouchableOpacity style={s.blockBtn} onPress={onConfirm} activeOpacity={0.85}>
        <Text style={s.blockBtnText}>{'Block member'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.6}>
        <Text style={s.cancelText}>{'Cancel'}</Text>
      </TouchableOpacity>
    </View>
  </SheetShell>
);

// ─── Blocked state (Figma: shown in place of the tabs once blocked) ──────────
export const BlockedGlyph = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 19.488C10.64 19.488 9.376 19.152 8.208 18.48C7.088 17.808 6.192 16.912 5.52 15.792C4.848 14.624 4.512 13.36 4.512 12C4.512 11.12 4.656 10.272 4.944 9.456C5.232 8.64 5.648 7.904 6.192 7.248L16.488 18.024C15.848 18.488 15.148 18.848 14.388 19.104C13.628 19.36 12.832 19.488 12 19.488ZM17.592 16.992L7.248 6.192C7.904 5.648 8.632 5.232 9.432 4.944C10.264 4.64 11.12 4.488 12 4.488C13.36 4.488 14.624 4.832 15.792 5.52C16.928 6.176 17.824 7.072 18.48 8.208C19.168 9.376 19.512 10.64 19.512 12C19.512 12.944 19.336 13.848 18.984 14.712C18.664 15.56 18.2 16.32 17.592 16.992ZM3 12C3 13.632 3.408 15.144 4.224 16.536C5.024 17.896 6.104 18.976 7.464 19.776C8.856 20.592 10.368 21 12 21C13.632 21 15.144 20.592 16.536 19.776C17.896 18.976 18.976 17.896 19.776 16.536C20.592 15.144 21 13.632 21 12C21 10.368 20.592 8.856 19.776 7.464C18.976 6.104 17.896 5.024 16.536 4.224C15.144 3.408 13.632 3 12 3C10.368 3 8.856 3.408 7.464 4.224C6.104 5.024 5.024 6.104 4.224 7.464C3.408 8.856 3 10.368 3 12Z"
      fill={NAVY}
    />
  </Svg>
);

export const BlockedMemberPanel = ({
  name,
  onUnblock,
}: {
  name: string;
  onUnblock: () => void;
}) => (
  <View style={s.blockedWrap}>
    <View style={s.blockedIconCircle}>
      <BlockedGlyph />
    </View>
    <Text style={s.blockedTitle}>{`You blocked ${name}`}</Text>
    <Text style={s.blockedText}>
      {"You won't see their posts, and they can't message you, mention you or see your activity."}
    </Text>
    <TouchableOpacity style={s.unblockBtn} onPress={onUnblock} activeOpacity={0.7}>
      <Text style={s.unblockText}>{'Unblock'}</Text>
    </TouchableOpacity>
  </View>
);

// ─── Unblock member sheet (Figma) ─────────────────────────────────────────────
// Wording read from the screenshot; fonts/sizes are estimates (no CSS yet).
export const UnblockMemberSheet = ({
  visible,
  name,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  name: string;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <SheetShell visible={visible} title="Unblock member" onClose={onClose} divider>
    <View style={s.unblockBody}>
      <Text style={s.unblockHeading}>{`Unblock ${name}?`}</Text>
      <Text style={s.unblockText2}>
        {"They'll be able to see your posts, message you and connect with you again. They won't be notified."}
      </Text>
      <Text style={s.unblockNote}>{'You can block them again at any time from their profile'}</Text>

      <TouchableOpacity style={s.blockBtn} onPress={onConfirm} activeOpacity={0.85}>
        <Text style={s.blockBtnText}>{'Unblock'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.6}>
        <Text style={s.cancelText}>{'Cancel'}</Text>
      </TouchableOpacity>
    </View>
  </SheetShell>
);

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
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  // Figma: width 390, padding-bottom 34, radius 20 20 0 0, white
  sheet: {
    alignSelf: 'stretch',
    paddingBottom: 34,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#FFFFFF',
    elevation: 10001,
  },

  // Figma: height 56, padding 18 24 16.5 142.5 (title centred, close right)
  header: {
    height: 56,
    paddingTop: 18,
    paddingBottom: 16.5,
    alignItems: 'center',
  },
  // Figma Heading/H3: Runda 500, 16/20, letter-spacing 0.08, #0C4D91
  title: {
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.08,
    color: DARK_BLUE,
    textAlign: 'center',
  },
  closeBtn: {position: 'absolute', top: 18, right: 24},
  headerDivider: {borderBottomWidth: 1, borderBottomColor: '#E8E9F1'},

  list: {paddingHorizontal: 16},
  // Figma row: padding 12 20, gap 10, align center
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  rowSpaced: {marginTop: 6},
  // Figma Action/Action L: Runda 500, 14, #192546
  rowText: {fontFamily: 'Runda-Medium', fontSize: 14, color: NAVY, marginLeft: 10},

  // ── Block member sheet — confirm text, bullets, note and button use the Figma
  // CSS; heading, spacing between blocks and Cancel are still screenshot estimates.
  blockBody: {paddingHorizontal: 24, paddingTop: 16},
  // Figma Heading/H3: Runda 500, 16/20, letter-spacing 0.08, #192546
  blockHeading: {
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.08,
    color: NAVY,
    marginBottom: 12,
  },
  // Figma Body/Body M: Runda 400, 14/18, #192546
  blockText: {fontFamily: 'Runda-Normal', fontSize: 14, lineHeight: 18, color: NAVY},
  bullets: {marginTop: 8},
  // Figma Body/Body S: Runda 400, 12/16, #192546
  bullet: {fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16, color: NAVY},
  blockNote: {
    fontFamily: 'Runda-Normal',
    fontSize: 12,
    lineHeight: 16,
    // Figma Caption: Runda 400, 12/16, Dark Grey #7C86A1
    color: '#7C86A1',
    marginTop: 16,
    marginBottom: 24,
  },
  blockBtn: {
    // Figma: height 40, padding 12 16, radius 50, #0C4D91
    height: 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 50,
    backgroundColor: DARK_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Figma Action/Action M: Runda 500, 12, #FFF
  blockBtnText: {fontFamily: 'Runda-Medium', fontSize: 12, color: '#FFFFFF'},
  // Figma Cancel: height 40, padding 12 16, radius 50, stretch; label is
  // Action/Action M (Runda 500, 12) in #0C4D91. No fill/border in the CSS.
  cancelBtn: {
    alignSelf: 'stretch',
    height: 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelText: {fontFamily: 'Runda-Medium', fontSize: 12, color: DARK_BLUE},

  // Blocked state panel — Figma: padding 32/24, column, centred, gap 12
  blockedWrap: {alignSelf: 'stretch', alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24},
  // 48x48, radius 24, #F8F9FE
  blockedIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Figma Heading/H4: Runda 500, 14, #192546
  blockedTitle: {fontFamily: 'Runda-Medium', fontSize: 14, color: NAVY, textAlign: 'center', marginTop: 12},
  // Figma Body/Body S: Runda 400, 12/16, Dark Grey #7C86A1
  blockedText: {
    fontFamily: 'Runda-Normal',
    fontSize: 12,
    lineHeight: 16,
    color: '#7C86A1',
    textAlign: 'center',
    marginTop: 12,
  },
  // Figma: height 36, padding 12/16, radius 50, 1px #0C4D91; Action M 12/500
  unblockBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: DARK_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  unblockText: {fontFamily: 'Runda-Medium', fontSize: 12, lineHeight: 16, color: DARK_BLUE},

  // Unblock member sheet (centred text; sizes estimated from screenshot)
  unblockBody: {paddingHorizontal: 24, paddingTop: 16},
  unblockHeading: {
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.08,
    color: NAVY,
    textAlign: 'center',
    marginBottom: 12,
  },
  unblockText2: {fontFamily: 'Runda-Normal', fontSize: 14, lineHeight: 18, color: NAVY, textAlign: 'center'},
  unblockNote: {
    fontFamily: 'Runda-Normal',
    fontSize: 12,
    lineHeight: 16,
    color: '#7C86A1',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
});
