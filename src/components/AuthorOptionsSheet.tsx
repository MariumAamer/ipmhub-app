/* eslint-disable prettier/prettier */
/**
 * AuthorOptionsSheet — the "More Options" bottom sheet (Report + Block author)
 * used by comments, forum discussions and forum replies, per Figma. It is the
 * same sheet the Feed post "…" menu uses, minus the post-only rows.
 *
 *   <AuthorOptionsSheet
 *     visible={!!target}
 *     reportLabel="Report comment"
 *     authorName={target?.name}
 *     canBlock={target?.id !== myUserId}
 *     onClose={...} onReport={...} onBlock={...} />
 *
 * `blockAuthor` does the actual POST /blocked-members {user_id} and records the
 * block in the shared blocked list so every screen reflects it.
 */
import React from 'react';
import {Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {BlockIcon} from './MemberModeration';
import {blockMember} from '../api/accountApi';
import {markMemberBlocked} from '../hooks/useMemberBlock';

const NAVY = '#192546';

// Figma "Report" flag icon.
const FlagIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path d="M2.65488 2.22C2.55488 2.32 2.50488 2.435 2.50488 2.565V13.125C2.50488 13.255 2.54988 13.365 2.63988 13.455C2.72988 13.545 2.83988 13.59 2.96988 13.59C3.09988 13.59 3.20988 13.545 3.29988 13.455C3.38988 13.365 3.43488 13.255 3.43488 13.125V8.445H12.1649C12.2949 8.445 12.3899 8.395 12.4499 8.295C12.5099 8.185 12.5049 8.08 12.4349 7.98L12.1649 7.515L10.9349 5.49C10.8749 5.38 10.8449 5.27 10.8449 5.16C10.8449 5.05 10.8749 4.945 10.9349 4.845L12.4349 2.355C12.5049 2.245 12.5099 2.14 12.4499 2.04C12.3899 1.93 12.2949 1.875 12.1649 1.875H3.20988C3.08988 1.875 2.97988 1.91 2.87988 1.98C2.76988 2.04 2.69488 2.12 2.65488 2.22ZM3.52488 2.805H11.0699L10.1399 4.35C9.98988 4.6 9.91488 4.87 9.91488 5.16C9.91488 5.45 9.98988 5.72 10.1399 5.97L11.0699 7.515H3.58488L3.52488 2.805Z" fill={NAVY} />
  </Svg>
);

// Figma close icon (20x20), #C5C6CC.
const CloseIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M5.80012 6.67912L9.02012 9.89907L5.80012 13.099C5.68012 13.219 5.62012 13.3657 5.62012 13.539C5.62012 13.7123 5.68012 13.859 5.80012 13.979C5.92012 14.099 6.06678 14.159 6.24012 14.159C6.41345 14.159 6.56012 14.099 6.68012 13.979L9.90012 10.7791L13.1001 13.979C13.2201 14.099 13.3668 14.159 13.5401 14.159C13.7135 14.159 13.8601 14.099 13.9801 13.979C14.1001 13.859 14.1601 13.7123 14.1601 13.539C14.1601 13.3657 14.1001 13.219 13.9801 13.099L10.7801 9.89907L13.9801 6.67912C14.1001 6.55913 14.1601 6.41246 14.1601 6.23913C14.1601 6.0658 14.1001 5.91914 13.9801 5.79914C13.8601 5.67914 13.7135 5.61914 13.5401 5.61914C13.3668 5.61914 13.2201 5.67914 13.1001 5.79914L9.90012 8.99909L6.68012 5.79914C6.56012 5.67914 6.41345 5.61914 6.24012 5.61914C6.06678 5.61914 5.92012 5.67914 5.80012 5.79914C5.68012 5.91914 5.62012 6.0658 5.62012 6.23913C5.62012 6.41246 5.68012 6.55913 5.80012 6.67912Z"
      fill="#C5C6CC"
    />
  </Svg>
);

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Row label, e.g. "Report comment", "Report discussion", "Report reply". */
  reportLabel: string;
  onReport: () => void;
  authorName?: string;
  /** Hide "Block" for your own content. */
  canBlock?: boolean;
  onBlock: () => void;
}

export const AuthorOptionsSheet = ({
  visible,
  onClose,
  reportLabel,
  onReport,
  authorName,
  canBlock = true,
  onBlock,
}: Props) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
      <View style={s.sheet}>
        <View style={s.header}>
          <Text style={s.title}>{'More Options'}</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <CloseIcon />
          </TouchableOpacity>
        </View>
        <View style={s.options}>
          <TouchableOpacity style={s.row} onPress={onReport}>
            <FlagIcon />
            <Text style={s.rowText}>{reportLabel}</Text>
          </TouchableOpacity>
          {canBlock && (
            <TouchableOpacity style={s.row} onPress={onBlock}>
              <BlockIcon />
              <Text style={s.rowText}>
                {authorName ? `Block ${authorName}` : 'Block member'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  </Modal>
);

/**
 * Block a member by user id (comment / forum author). Resolves to null on
 * success or the server's error message.
 */
export const blockAuthor = async (
  userId: number,
  info: {name: string; avatarUrl?: string; title?: string},
): Promise<string | null> => {
  if (!userId) return 'Member not found.';
  try {
    const m = await blockMember(userId);
    markMemberBlocked({
      id: userId,
      name: m.name || info.name,
      avatarUrl: m.avatarUrl || info.avatarUrl,
      title: info.title,
    });
    return null;
  } catch (e: any) {
    return e?.message || 'Could not block this member.';
  }
};

const s = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end'},
  // Figma: column, gap 24 between header and options box.
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 36,
    gap: 24,
  },
  // Figma header: height 56, padding 18 24 16.5.
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 18,
    paddingBottom: 16.5,
    paddingHorizontal: 24,
  },
  // Figma Heading/H3
  title: {
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.08,
    textAlign: 'center',
    color: '#0C4D91',
    fontFamily: 'Runda-Medium',
  },
  closeBtn: {
    position: 'absolute',
    right: 24,
    top: 18,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Figma options box: padding 0 16, gap 6.
  options: {alignSelf: 'stretch', paddingHorizontal: 16, gap: 6},
  // Figma row: padding 12 20, gap 10.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  // Figma Action/Action L
  rowText: {fontSize: 14, color: NAVY, fontFamily: 'Runda-Medium'},
});

export default AuthorOptionsSheet;
