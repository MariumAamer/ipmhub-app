/* eslint-disable prettier/prettier */
/**
 * BackButton — shared "back" control for screen headers.
 *
 * Canonical back chevron, exact from Figma: 28x28, bordered rounded-square,
 * #8F9098 stroke. This is the ONE back icon every screen should use — it
 * replaces several near-identical (and one outright broken) local
 * implementations that had drifted apart across the app:
 *   - a duplicated copy of this exact SVG (sometimes wrapped in an extra
 *     Defs/ClipPath) in LikedByScreen, HelpSupportScreen,
 *     ResourceDetailScreen, StoreScreen, DMConversationScreen,
 *     DMNewMessageScreen, CourseDetailScreen, QuizScreen
 *   - a no-box variant missing the Rect border (StepContentScreen)
 *   - a different, unboxed #192546 chevron at various sizes
 *     (EventDetailScreen, ForgotPasswordScreen, DMMembersScreen)
 *   - a plain '‹' text glyph (ResourceArticleScreen) that was already
 *     confirmed to render as an empty box on some devices/fonts
 *
 * Usage:
 *   <BackButton onPress={() => navigation.goBack()} />
 *   <BackButton navigation={navigation} />   // defaults to navigation.goBack()
 *
 * If a screen needs just the icon — e.g. inside a differently-styled header
 * row that already supplies its own TouchableOpacity — import BackIcon
 * instead of the default export.
 */
import React from 'react';
import {TouchableOpacity, StyleProp, ViewStyle} from 'react-native';
import Svg, {Path, Rect} from 'react-native-svg';

export const BackIcon = ({size = 28}: {size?: number}) => (
  <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <Rect x={0.7} y={0.7} width={26.6} height={26.5996} rx={6.3} stroke="#8F9098" strokeWidth={1.4} />
    <Path
      d="M10.4494 12.8438C9.8504 13.4423 9.8504 14.4151 10.4494 15.0136L15.2973 19.8623L16 19.1596L11.1521 14.3104C10.9423 14.0997 10.9423 13.7577 11.1521 13.547L15.9973 8.70277L15.2941 8.00006L10.4494 12.8438Z"
      fill="#8F9098"
      stroke="#8F9098"
      strokeWidth={0.7}
    />
  </Svg>
);

interface BackButtonProps {
  /** Explicit press handler. If omitted, falls back to navigation.goBack(). */
  onPress?: () => void;
  /** Navigation object — only used to call goBack() when onPress isn't given. */
  navigation?: any;
  /** Icon size in px (square). Defaults to the Figma-exact 28. */
  size?: number;
  /** Extra style for the TouchableOpacity wrapper (e.g. margins/positioning). */
  style?: StyleProp<ViewStyle>;
}

const BackButton: React.FC<BackButtonProps> = ({onPress, navigation, size = 28, style}) => (
  <TouchableOpacity
    onPress={onPress || (() => navigation?.goBack())}
    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
    style={style}>
    <BackIcon size={size} />
  </TouchableOpacity>
);

export default BackButton;
