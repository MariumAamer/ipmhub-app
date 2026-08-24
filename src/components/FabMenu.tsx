/* eslint-disable prettier/prettier */
import React, {useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, {Path, Circle, Defs, LinearGradient as SvgGrad, Stop} from 'react-native-svg';

const {width: W, height: H} = Dimensions.get('window');

// ─── SVG Icons — exact from Figma ────────────────────────────────────────────

/** Write Article — dark blue circle, pencil path */
const WriteArticleIcon = () => (
  <Svg width={45} height={45} viewBox="0 0 45 45" fill="none">
    <Circle cx="22.5" cy="22.5" r="22.5" fill="#0C4D91" />
    <Path
      d="M31.9155 12.8841L32.4811 13.4436C33.2604 14.2154 33.1425 15.5838 32.2156 16.4998L20.5526 28.037L16.7739 29.4043C16.2994 29.5769 15.8374 29.3531 15.7434 28.9065C15.7118 28.7445 15.7267 28.5769 15.7866 28.4229L17.1957 24.6527L28.8261 13.1468C29.753 12.2308 31.1362 12.1123 31.9155 12.8841ZM20.0436 14.0315C20.1695 14.0315 20.2941 14.056 20.4104 14.1037C20.5267 14.1513 20.6324 14.2212 20.7214 14.3092C20.8104 14.3973 20.881 14.5018 20.9292 14.6168C20.9774 14.7319 21.0022 14.8552 21.0022 14.9797C21.0022 15.1042 20.9774 15.2276 20.9292 15.3426C20.881 15.4576 20.8104 15.5622 20.7214 15.6502C20.6324 15.7383 20.5267 15.8081 20.4104 15.8558C20.2941 15.9034 20.1695 15.928 20.0436 15.928H16.2093C15.7008 15.928 15.2132 16.1278 14.8537 16.4834C14.4941 16.8391 14.2921 17.3215 14.2921 17.8244V29.2033C14.2921 29.7063 14.4941 30.1887 14.8537 30.5443C15.2132 30.9 15.7008 31.0998 16.2093 31.0998H27.7122C28.2207 31.0998 28.7083 30.9 29.0678 30.5443C29.4274 30.1887 29.6293 29.7063 29.6293 29.2033V25.4103C29.6293 25.1589 29.7303 24.9177 29.9101 24.7398C30.0899 24.562 30.3337 24.4621 30.5879 24.4621C30.8421 24.4621 31.086 24.562 31.2657 24.7398C31.4455 24.9177 31.5465 25.1589 31.5465 25.4103V29.2033C31.5465 30.2093 31.1425 31.174 30.4235 31.8853C29.7044 32.5966 28.7291 32.9963 27.7122 32.9963H16.2093C15.1924 32.9963 14.2171 32.5966 13.498 31.8853C12.779 31.174 12.375 30.2093 12.375 29.2033V17.8244C12.375 16.8185 12.779 15.8537 13.498 15.1424C14.2171 14.4311 15.1924 14.0315 16.2093 14.0315H20.0436Z"
      fill="white"
    />
  </Svg>
);

/** Create Discussion — solid purple/magenta circle, + icon */
const CreateDiscussionIcon = () => (
  <Svg width={45} height={45} viewBox="0 0 45 45" fill="none">
    <Circle cx="22.5" cy="22.5" r="22.5" fill="#C157DE" />
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M22.3096 11.999C23.2586 11.999 24.0281 12.7688 24.0283 13.7178V20.5908H30.9062C31.8553 20.591 32.625 21.3605 32.625 22.3096C32.625 23.2587 31.8553 24.0281 30.9062 24.0283H24.0283V30.9062C24.0281 31.8553 23.2586 32.625 22.3096 32.625C21.3605 32.6249 20.5911 31.8552 20.5908 30.9062V24.0283H13.7188C12.7695 24.0283 12 23.2588 12 22.3096C12 21.3603 12.7695 20.5908 13.7188 20.5908H20.5908V13.7178C20.5911 12.7688 21.3605 11.9991 22.3096 11.999Z"
      fill="white"
    />
  </Svg>
);

/** Create Post — light blue circle, compose/pencil icon. Rebuilt from the
 * DMListScreen ComposeIcon (which used a <Mask>) as two plain white Path
 * fills — react-native-svg@15.3.0 can't render <mask>, and since the mask's
 * source paths were themselves opaque white, rendering them directly as
 * fills is visually identical to the masked version. */
const CreatePostIcon = () => (
  <Svg width={45} height={45} viewBox="0 0 45 45" fill="none">
    <Circle cx="22.5" cy="22.5" r="22.5" fill="#46B0E3" />
    {/* Original icon is a 24x24 box; scale 0.875x and center on the 45px circle */}
    <Path
      transform="translate(12 12) scale(0.875)"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4 5.25C3.58579 5.25 3.25 5.58579 3.25 6V20C3.25 20.4142 3.58579 20.75 4 20.75H18C18.4142 20.75 18.75 20.4142 18.75 20V13C18.75 12.3096 19.3096 11.75 20 11.75C20.6904 11.75 21.25 12.3096 21.25 13V20C21.25 21.7949 19.7949 23.25 18 23.25H4C2.20507 23.25 0.75 21.7949 0.75 20V6C0.75 4.20507 2.20507 2.75 4 2.75H11C11.6904 2.75 12.25 3.30964 12.25 4C12.25 4.69036 11.6904 5.25 11 5.25H4Z"
      fill="white"
    />
    <Path
      transform="translate(12 12) scale(0.875)"
      d="M13.0947 14.3008L20.2425 7.15297L16.8474 3.75789L9.6996 10.9057C9.6012 11.0042 9.5313 11.1276 9.49732 11.2626L8.70508 15.2953L12.737 14.5031C12.8724 14.4692 12.9962 14.3992 13.0947 14.3008ZM22.55 4.84548C22.8384 4.557 23.0004 4.1658 23.0004 3.75789C23.0004 3.34998 22.8384 2.95877 22.55 2.67029L21.3301 1.4504C21.0416 1.16201 20.6504 1 20.2425 1C19.8346 1 19.4434 1.16201 19.1549 1.4504L17.935 2.67029L21.3301 6.06537L22.55 4.84548Z"
      fill="white"
    />
  </Svg>
);

/** Close X — gradient circle */
const CloseFabIcon = () => (
  <Svg width={45} height={45} viewBox="0 0 45 45" fill="none">
    <Defs>
      <SvgGrad id="closeGrad" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#084D92" />
        <Stop offset="1" stopColor="#C157DE" />
      </SvgGrad>
    </Defs>
    <Circle cx="22.5" cy="22.5" r="22.5" fill="url(#closeGrad)" />
    <Path
      d="M30 16L16 30M16 16L30 30"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </Svg>
);

// ─── FabMenu ──────────────────────────────────────────────────────────────────
interface FabMenuProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

const FabMenu = ({visible, onClose, navigation}: FabMenuProps) => {
  // On iOS, Modal's dismissal is an animated native transition. Calling
  // navigation.navigate() in the same tick as the setState that unmounts
  // the Modal races that transition — iOS's UIKit transition coordinator
  // drops the navigate() while the modal is still mid-dismiss, so nothing
  // happens. Android tears the modal down immediately so the same code
  // works there by accident.
  //
  // Fix: stash the pending navigation action and fire it from Modal's
  // onDismiss, which only fires (iOS-only) once the native dismiss
  // animation has actually completed. Android doesn't reliably call
  // onDismiss, so there we still navigate immediately.
  const pendingActionRef = useRef<(() => void) | null>(null);

  const runOrDefer = (action: () => void) => {
    onClose();
    if (Platform.OS === 'ios') {
      pendingActionRef.current = action;
    } else {
      action();
    }
  };

  const handleModalDismiss = () => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  };

  const handleWriteArticle = () => {
    runOrDefer(() => navigation?.navigate('ArticleSubmission'));
  };

  const handleCreatePost = () => {
    runOrDefer(() => navigation?.navigate('CreatePost'));
  };

  const handleCreateDiscussion = () => {
    runOrDefer(() => navigation?.navigate('NewDiscussion'));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onDismiss={handleModalDismiss}
      onRequestClose={onClose}>
      <TouchableOpacity
        style={fab.backdrop}
        activeOpacity={1}
        onPress={onClose}>
        <View style={fab.container}>
          {/* Write Article */}
          <View style={fab.row}>
            <TouchableOpacity style={fab.labelWrap} onPress={handleWriteArticle}>
              <Text style={fab.labelText}>{'Write Article'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={fab.iconBtn} onPress={handleWriteArticle}>
              <WriteArticleIcon />
            </TouchableOpacity>
          </View>

          {/* Create Discussion */}
          <View style={fab.row}>
            <TouchableOpacity style={fab.labelWrap} onPress={handleCreateDiscussion}>
              <Text style={fab.labelText}>{'Create Discussion'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={fab.iconBtn} onPress={handleCreateDiscussion}>
              <CreateDiscussionIcon />
            </TouchableOpacity>
          </View>

          {/* Create a Post */}
          <View style={fab.row}>
            <TouchableOpacity style={fab.labelWrap} onPress={handleCreatePost}>
              <Text style={fab.labelText}>{'Create a Post'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={fab.iconBtn} onPress={handleCreatePost}>
              <CreatePostIcon />
            </TouchableOpacity>
          </View>

          {/* Close button */}
          <View style={[fab.row, {justifyContent: 'flex-end'}]}>
            <TouchableOpacity style={fab.iconBtn} onPress={onClose}>
              <CloseFabIcon />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const fab = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 90,
    paddingTop: 20,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  // Figma: pill label — dark gray bg, Runda 14 500
  labelWrap: {
    borderRadius: 50,
    backgroundColor: '#71727A',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Runda',
  },
  iconBtn: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default FabMenu;
