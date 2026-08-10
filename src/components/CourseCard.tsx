/* eslint-disable prettier/prettier */
// src/components/CourseCard.tsx
//
// Shared course card — two variants:
//   - 'default'  (EmptyCoursesRecommendation): full-width "View Course"
//     button, no status text.
//   - 'enrolled' (CoursesScreen My Courses tab): status text (left) + a
//     content-width "Continue Course" button (right).
// The circle+chevron icon ALWAYS sits top-right next to the title for
// BOTH variants — confirmed from Marium's screenshot of the recommendation
// cards (icon top-right, plain full-width button underneath with no icon
// inside it). Previously the 'default' variant embedded the icon inside
// the button instead — fixed.
// 16px gap between the image and the text box per spec.

import React from 'react';
import {View, Text, Image, StyleSheet, TouchableOpacity} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {Path, G} from 'react-native-svg';

// ─── Icons ──────────────────────────────────────────────────────────────

const CircleArrowBtn = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path d="M7.5.6a6.9 6.9 0 100 13.8 6.9 6.9 0 000-13.8z" stroke="#192546" strokeWidth={1.2} fill="none" />
  </Svg>
);

const Chevron = () => (
  <Svg width={9} height={9} viewBox="0 0 9 9" fill="none">
    <G>
      <Path
        d="M6.34492 5.38164L6.43457 5.28262C6.82532 4.80378 6.82532 4.11146 6.43457 3.63262L6.34492 3.53359L2.9541 0.143359L2.06816 1.02812L2.28027 1.24082L5.45957 4.41953C5.48009 4.44078 5.47989 4.47529 5.45898 4.49629L2.06641 7.89004L2.95176 8.77539L6.34492 5.38164Z"
        fill="#192546"
      />
    </G>
  </Svg>
);

const CircleArrowIcon = () => (
  <View style={styles.circleIconWrap}>
    <CircleArrowBtn />
    <View style={styles.chevronOverlay}>
      <Chevron />
    </View>
  </View>
);

// Calendar icon — from Marium's attached SVG (12x12 viewBox, scaled to 9.5x9.5 per spec)
const CalendarIcon = () => (
  <Svg width={9.5} height={9.5} viewBox="0 0 12 12" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.5473 2.9683H9.75532V2.17627H9.2276V2.9683H5.00583V2.17627H4.47811V2.9683H3.68697C2.9596 2.9683 2.36719 3.56022 2.36719 4.28808V10.3573C2.36719 11.0847 2.95911 11.6771 3.68697 11.6771H10.5474C11.2748 11.6771 11.8672 11.0852 11.8672 10.3573L11.8667 5.60696V4.28718C11.8663 3.55981 11.2744 2.9683 10.5474 2.9683H10.5473ZM11.3387 10.3566C11.3387 10.7928 10.9838 11.1477 10.5475 11.1477H3.6871C3.24997 11.1477 2.89507 10.7928 2.89507 10.3566V5.60704H11.3386L11.3387 10.3566ZM2.89507 5.07957H11.3386L11.3386 4.28753C11.3386 3.85084 10.9837 3.49639 10.5475 3.49639H9.75546V4.02411H9.22774V3.49639H5.00597V4.02324H4.47912V3.49551H3.6871C3.24996 3.49551 2.89507 3.85085 2.89507 4.28754V5.07957Z"
      fill="#8F9098"
      stroke="#8F9098"
      strokeWidth={0.109}
    />
  </Svg>
);

// "Live online" style icon — from Marium's second attached SVG
const FormatIcon = () => (
  <Svg width={9.5} height={9.5} viewBox="0 0 12 12" fill="none">
    <Path
      d="M7.58789 1.5C7.73417 1.5 7.85233 1.61841 7.85254 1.76465C7.85254 1.91059 7.7343 2.0293 7.58789 2.0293H3.35352C2.62244 2.0293 2.0293 2.62244 2.0293 3.35352V8.64746C2.02954 9.37834 2.62258 9.9707 3.35352 9.9707H7.58789C7.7343 9.9707 7.85254 10.0894 7.85254 10.2354C7.85248 10.3817 7.73426 10.5 7.58789 10.5H3.35352C2.33025 10.5 1.50025 9.67068 1.5 8.64746V3.35352C1.5 2.3301 2.33009 1.5 3.35352 1.5H7.58789ZM7.92969 3.69531C8.03342 3.59208 8.20145 3.59208 8.30469 3.69531L10.4219 5.8125C10.5119 5.90248 10.5233 6.04169 10.4561 6.14453L10.4219 6.18652L8.30469 8.30469C8.20148 8.4079 8.03342 8.40785 7.92969 8.30469C7.82645 8.20145 7.82645 8.03342 7.92969 7.92969L9.5957 6.26465H4.94043C4.79413 6.26457 4.67585 6.1463 4.67578 6C4.67578 5.85364 4.79409 5.73543 4.94043 5.73535H9.5957L7.92969 4.06934C7.82647 3.96612 7.82651 3.79855 7.92969 3.69531Z"
      fill="#8F9098"
    />
  </Svg>
);

export interface CourseCardMetaItem {
  icon: 'calendar' | 'format';
  text: string;
}

interface Props {
  imageUri?: string;
  title: string;
  /** Short tagline/description shown under the title, above the divider's
   * meta rows — e.g. "Learn everything about how to execute projects
   * succesfully." Was previously silently dropped even when passed in. */
  description?: string;
  metaItems?: CourseCardMetaItem[];
  buttonLabel: string;
  onPressButton: () => void;
  /** 'enrolled' = My Courses layout (status text + content-width button).
   *  'default'  = recommendation card layout (full-width button). Icon
   *  placement (top-right, next to title) is the same for both. */
  variant?: 'default' | 'enrolled';
  /** Only used/shown when variant='enrolled', e.g. "In-Progress" */
  statusText?: string;
}

const CourseCard = ({
  imageUri,
  title,
  description,
  metaItems,
  buttonLabel,
  onPressButton,
  variant = 'default',
  statusText,
}: Props) => {
  // 'default' (recommendation cards, e.g. EmptyCoursesRecommendation) —
  // per Figma: plain straight photo filling the 75x180 frame exactly, no
  // rotation, no bleed past the frame's edges. Do NOT change this to
  // match 'enrolled' — confirmed via side-by-side Figma comparison.
  //
  // 'enrolled' (My Courses tab) — keeps the existing rotated/bleed
  // treatment confirmed separately for that screen. Untouched.
  const imageStyle = variant === 'default' ? styles.imageStraight : styles.image;

  return (
    <View style={styles.card}>
      {/* start/end explicitly set to straight top-to-bottom per Figma spec
          (linear-gradient(180deg, #ABE4FF 0%, #FFF 100%)) — react-native-
          linear-gradient defaults to a diagonal angle when start/end are
          omitted, which was reading as an off/unclear wash across the
          photo instead of a clean vertical fade. */}
      <LinearGradient
        colors={['#ABE4FF', '#FFFFFF']}
        start={{x: 0, y: 0}}
        end={{x: 0, y: 1}}
        style={styles.imageGradientRoot}>
        {imageUri ? (
          <Image source={{uri: imageUri}} style={imageStyle} resizeMode="cover" />
        ) : (
          <View style={[imageStyle, styles.imagePlaceholder]} />
        )}
      </LinearGradient>

      <View style={styles.textBox}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            <TouchableOpacity onPress={onPressButton} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <CircleArrowIcon />
            </TouchableOpacity>
          </View>
          <View style={styles.titleDivider} />
          {description ? (
            <Text style={styles.descriptionText} numberOfLines={2}>{description}</Text>
          ) : null}
          {metaItems?.map((item, idx) => (
            <View key={idx} style={styles.metaRow}>
              {item.icon === 'calendar' ? <CalendarIcon /> : <FormatIcon />}
              <Text style={styles.metaText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {variant === 'enrolled' ? (
          <View style={styles.enrolledBtnRow}>
            <Text style={styles.statusText}>{statusText}</Text>
            <TouchableOpacity style={styles.contentButton} onPress={onPressButton} activeOpacity={0.85}>
              <Text style={styles.buttonText}>{buttonLabel}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.fullButton} onPress={onPressButton} activeOpacity={0.85}>
              <Text style={styles.buttonText}>{buttonLabel}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 358,
    height: 180,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
  },
  // LinearGradient kept as the root of the image stack per project rule
  // (LinearGradient must be the root element to avoid Android clipping
  // nested gradients when overflow: hidden is set on a parent).
  //
  // Figma-confirmed: the frame (75x180) is intentionally NARROWER than
  // the photo itself (127.155x189.473, rotated 0.864deg) — the photo is
  // meant to bleed past the frame's edges, with the frame's own
  // overflow:hidden clipping it to reveal a soft angled sliver + gradient
  // glow around the rotated corners. Previously the frame was sized to
  // match the photo (127.155 wide) instead of its own 75px spec, which
  // is what made the image look off/misaligned against the card.
  imageGradientRoot: {
    width: 75,
    height: 180,
    // 'center' so the 127px-wide rotated photo bleeds equally on both
    // sides of the 75px frame — previously 'flex-start' was pushing the
    // image hard-left, making the gradient visible as a blue block on the
    // left and clipping the photo subject off-center.
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
  },
  image: {
    width: 127.155,
    height: 189.473,
    transform: [{rotate: '0.864deg'}],
  },
  // 'default' variant (recommendation cards) — plain straight photo,
  // sized to fill the 75x180 frame exactly. No rotation, no bleed past
  // the frame edges. Confirmed via side-by-side Figma comparison against
  // the rotated/bleed treatment used on 'enrolled' cards above — the two
  // variants are intentionally different, not a shared bug.
  imageStraight: {
    width: 75,
    height: 180,
  },
  imagePlaceholder: {backgroundColor: '#D9D9D9'},
  textBox: {
    flex: 1,
    alignSelf: 'stretch',
    paddingVertical: 16,
    paddingRight: 16,
    justifyContent: 'space-between',
  },
  titleRow: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8},
  title: {
    flex: 1,
    color: '#192546',
    fontFamily: 'Runda-Medium',
    fontSize: 14,
  },
  titleDivider: {
    width: 42.954,
    height: 1.5,
    backgroundColor: '#46B0E3',
    marginTop: 6,
    marginBottom: 8,
  },
  descriptionText: {
    // Body/Body S per spec: color #192647 (was #8F9098 muted gray)
    color: '#192647',
    fontFamily: 'Runda-Normal',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4},
  metaText: {
    color: '#8F9098',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  // Default (recommendation) variant — full-width button, no icon inside
  btnRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch'},
  fullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 5,
    backgroundColor: '#0C4D91',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'stretch',
    flex: 1,
  },
  // Enrolled (My Courses) variant — status left, content-width button right
  enrolledBtnRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch'},
  statusText: {
    color: '#46B0E3',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  contentButton: {
    flexDirection: 'row',
    borderRadius: 5,
    backgroundColor: '#0C4D91',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  circleIconWrap: {
    width: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronOverlay: {position: 'absolute'},
});

export default CourseCard;

/* NOTE on the 'enrolled' variant's image+gradient treatment: CONFIRMED
   against Figma spec — the gradient frame is 75x180, intentionally
   narrower than the 127.155x189.473 rotated photo sitting inside it. The
   frame's own overflow:hidden clips the oversized photo down to a soft
   angled sliver with the gradient showing through around its rotated
   edges. Earlier versions of this file had the frame matched to the
   photo's own size instead of its own 75px spec width, which is what
   made the image read as misaligned against the card.

   The 'default' (recommendation) variant does NOT use this treatment —
   it uses `imageStraight` instead: a plain photo sized to exactly fill
   the 75x180 frame, no rotation, no bleed. Confirmed via a side-by-side
   Figma comparison (Aug 2026) that the two variants are intentionally
   different, not a shared bug — do not merge them back into one style. */

