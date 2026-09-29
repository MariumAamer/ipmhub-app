/* eslint-disable prettier/prettier */
// src/components/CourseCard.tsx
//
// Shared course card — two variants:
//   - 'default'  (EmptyCoursesRecommendation): full-width "View Course"
//     button, no status text.
//   - 'enrolled' (CoursesScreen My Courses tab): taller card (250 vs 180)
//     with a status row ("In-Progress" + live percentage), a bar, a
//     current-module row, and a full-width "Continue Course" button
//     underneath. Redesigned per Marium's Sept 2026 Figma spec + reference
//     screenshot (Certified Project Management Diploma / IPM PMO Project
//     Professional / IPM AI Project Professional cards) — this REPLACES
//     the previous statusText + content-width-button row layout entirely;
//     nothing else in the app used that old layout.
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

// Same icon used on both variants — confirmed unchanged ("same as old
// course") in Marium's latest spec message.
const CircleArrowIcon = () => (
  <View style={styles.circleIconWrap}>
    <CircleArrowBtn />
    <View style={styles.chevronOverlay}>
      <Chevron />
    </View>
  </View>
);

// Calendar icon — swapped to the fresh SVG Marium pasted with the in-progress
// card spec (viewBox 0 0 12 12, path re-exported from Figma — same glyph as
// before, cleaner coordinates). Render size kept at the previously-confirmed
// 9.5x9.5 rather than the raw 12x12 export size, to avoid disturbing the
// meta-row spacing already confirmed on the 'default' variant, which shares
// this icon. Flag to Marium if the in-progress card actually wants a bigger
// (~12x12) icon here — nothing in her message called out a size change
// explicitly, only a fresh SVG export.
const CalendarIcon = () => (
  <Svg width={9.5} height={9.5} viewBox="0 0 12 12" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.43016 1.79203H8.63814V1H8.11041V1.79203H3.88864V1H3.36092V1.79203H2.56978C1.84241 1.79203 1.25 2.38395 1.25 3.11181V9.18103C1.25 9.9084 1.84193 10.5008 2.56978 10.5008H9.43022C10.1576 10.5008 10.75 9.90889 10.75 9.18103L10.7496 4.43069V3.11091C10.7491 2.38354 10.1572 1.79203 9.43023 1.79203H9.43016ZM10.2215 9.18032C10.2215 9.61657 9.86659 9.97145 9.43034 9.97145H2.56991C2.13278 9.97145 1.77788 9.61657 1.77788 9.18032V4.43077H10.2214L10.2215 9.18032ZM1.77788 3.9033H10.2214L10.2214 3.11126C10.2214 2.67457 9.86655 2.32012 9.4303 2.32012H8.63827V2.84784H8.11055V2.32012H3.88878V2.84697H3.36193V2.31924H2.56991C2.13277 2.31924 1.77788 2.67458 1.77788 3.11127V3.9033Z"
      fill="#8F9098"
      stroke="#8F9098"
      strokeWidth={0.109}
    />
  </Svg>
);

// "Live online / format" icon — from Marium's second attached SVG. Path is
// byte-for-byte identical to the icon she originally sent for this same
// meta row, so this is unchanged, just confirmed still current.
const FormatIcon = () => (
  <Svg width={9.5} height={9.5} viewBox="0 0 12 12" fill="none">
    <Path
      d="M7.58789 1.5C7.73417 1.5 7.85233 1.61841 7.85254 1.76465C7.85254 1.91059 7.7343 2.0293 7.58789 2.0293H3.35352C2.62244 2.0293 2.0293 2.62244 2.0293 3.35352V8.64746C2.02954 9.37834 2.62258 9.9707 3.35352 9.9707H7.58789C7.7343 9.9707 7.85254 10.0894 7.85254 10.2354C7.85248 10.3817 7.73426 10.5 7.58789 10.5H3.35352C2.33025 10.5 1.50025 9.67068 1.5 8.64746V3.35352C1.5 2.3301 2.33009 1.5 3.35352 1.5H7.58789ZM7.92969 3.69531C8.03342 3.59208 8.20145 3.59208 8.30469 3.69531L10.4219 5.8125C10.5119 5.90248 10.5233 6.04169 10.4561 6.14453L10.4219 6.18652L8.30469 8.30469C8.20148 8.4079 8.03342 8.40785 7.92969 8.30469C7.82645 8.20145 7.82645 8.03342 7.92969 7.92969L9.5957 6.26465H4.94043C4.79413 6.26457 4.67585 6.1463 4.67578 6C4.67578 5.85364 4.79409 5.73543 4.94043 5.73535H9.5957L7.92969 4.06934C7.82647 3.96612 7.82651 3.79855 7.92969 3.69531Z"
      fill="#8F9098"
    />
  </Svg>
);

// Module/bookmark icon — new, only used on the 'enrolled' card's "current
// module" row. From Marium's in-progress card spec.
const ModuleIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 13 13" fill="none">
    <Path
      d="M2.59961 2.5998C2.59961 1.88277 3.18258 1.2998 3.89961 1.2998H9.09961C9.81664 1.2998 10.3996 1.88277 10.3996 2.5998V11.0721C10.3996 11.5921 9.8207 11.9009 9.38805 11.6125L6.49961 9.6848L3.61117 11.6125C3.17852 11.9009 2.59961 11.5901 2.59961 11.0721V2.5998ZM3.89961 2.2748C3.72086 2.2748 3.57461 2.42105 3.57461 2.5998V10.4648L5.9593 8.87637C6.28633 8.65902 6.71289 8.65902 7.03992 8.87637L9.42461 10.4648V2.5998C9.42461 2.42105 9.27836 2.2748 9.09961 2.2748H3.89961Z"
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
  /** 'enrolled' = My Courses layout (progress bar + module row + full-width
   *  button). 'default' = recommendation card layout (full-width button,
   *  no progress). Icon placement (top-right, next to title) is the same
   *  for both. */
  variant?: 'default' | 'enrolled';
  /** 'enrolled' only — 0-100. Comes straight from the API's
   * progress.percentage (EnrolledCourse), no client-side calculation. */
  progressPercentage?: number;
  /** 'enrolled' only — current module/lesson name, e.g.
   * "Module 2 – Setting up a PMO". Comes from the API's
   * current_step.lesson_title (already HTML-entity-decoded in
   * coursesApi.ts's getMyCourses()). */
  moduleText?: string;
  /** 'enrolled' only — label shown above the progress bar, e.g.
   * "In-Progress". Bound to the API's card_status field (same field
   * that would pick CompletedCourseCard instead, once status flips) —
   * defaults to 'In-Progress' if not passed. */
  statusLabel?: string;
}

const CourseCard = ({
  imageUri,
  title,
  description,
  metaItems,
  buttonLabel,
  onPressButton,
  variant = 'default',
  progressPercentage,
  moduleText,
  statusLabel,
}: Props) => {
  const isEnrolled = variant === 'enrolled';

  // 'default' (recommendation cards, e.g. EmptyCoursesRecommendation) —
  // per Figma: plain straight photo filling the 75x180 frame exactly, no
  // rotation, no bleed past the frame's edges. Do NOT change this to
  // match 'enrolled' — confirmed via side-by-side Figma comparison.
  //
  // 'enrolled' (My Courses tab) — taller frame (75x250) with the photo
  // bleeding past it, rotated 0.643deg per the Sept 2026 spec (previously
  // 0.864deg on the shorter 180-tall card — the rotation was re-tuned
  // slightly for the new proportions, not a typo).
  const imageStyle = isEnrolled ? styles.imageEnrolled : styles.imageStraight;

  // Clamp defensively — API is trusted per Marium's confirmation ("course
  // progress will be from backend"), but a stray >100 or negative value
  // shouldn't blow the bar past the card's edge.
  const clampedPct = Math.max(0, Math.min(100, progressPercentage ?? 0));

  return (
    <View style={[styles.card, isEnrolled && styles.cardEnrolled]}>
      {/* start/end explicitly set to straight top-to-bottom per Figma spec
          (linear-gradient(180deg, #ABE4FF 0%, #FFF 100%)) — react-native-
          linear-gradient defaults to a diagonal angle when start/end are
          omitted, which was reading as an off/unclear wash across the
          photo instead of a clean vertical fade. */}
      <LinearGradient
        colors={['#ABE4FF', '#FFFFFF']}
        start={{x: 0, y: 0}}
        end={{x: 0, y: 1}}
        style={[styles.imageGradientRoot, isEnrolled && styles.imageGradientRootEnrolled]}>
        {imageUri ? (
          <Image source={{uri: imageUri}} style={imageStyle} resizeMode="cover" />
        ) : (
          <View style={[imageStyle, styles.imagePlaceholder]} />
        )}
      </LinearGradient>

      <View style={styles.textBox}>
        <View>
          <View style={styles.titleRow}>
            {/* No line clamp on the 'enrolled' card — the taller 250px
                frame has room for a full 3-line title (confirmed against
                Marium's reference screenshot: "Certified Project
                Management Diploma (Scope)" wraps to 3 full lines, not
                truncated). 'default' keeps its existing 2-line clamp. */}
            <Text style={styles.title} numberOfLines={isEnrolled ? undefined : 2}>
              {title}
            </Text>
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

        {isEnrolled ? (
          <View style={styles.enrolledBottomBlock}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressLabel}>{statusLabel ?? 'In-Progress'}</Text>
              <Text style={styles.progressPercentText}>{clampedPct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {width: `${clampedPct}%`}]} />
            </View>
            {moduleText ? (
              <View style={styles.moduleRow}>
                <View style={styles.moduleIconWrap}>
                  <ModuleIcon />
                </View>
                <Text style={styles.moduleText} numberOfLines={2}>{moduleText}</Text>
              </View>
            ) : null}
            {/* BUGFIX: fullButton's `flex: 1` is correct in the 'default'
                variant's btnRow (a ROW — flex:1 there fills remaining
                WIDTH). Reused as-is here, it was sitting inside
                enrolledBottomBlock, a COLUMN with no defined height —
                flex:1 there means "flexBasis:0, grow to fill remaining
                HEIGHT", and with no bounded space to grow into, Yoga
                collapsed the button toward zero height on-device. Text
                was still in the tree, just clipped into an invisible
                sliver — hence "blurry/cropped". alignSelf:'stretch'
                (already on fullButton) is what actually gives it full
                width in this column context; flex:1 was never needed
                here and is overridden back to 0 via fullButtonInColumn. */}
            <TouchableOpacity
              style={[styles.fullButton, styles.fullButtonInColumn]}
              onPress={onPressButton}
              activeOpacity={0.85}>
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
  // 'enrolled' card is taller (250 vs 180) per the Sept 2026 spec —
  // overridden on top of the base `card` style rather than duplicating it.
  cardEnrolled: {
    height: 250,
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
  // 'enrolled' frame is 75x250 (same 75px width, taller to match the
  // taller card) — same centering/clip treatment as the base frame above.
  imageGradientRootEnrolled: {
    height: 250,
  },
  image: {
    width: 127.155,
    height: 189.473,
    transform: [{rotate: '0.864deg'}],
  },
  // 'enrolled' photo — 127.167x254.656, rotated 0.643deg per the Sept 2026
  // spec (re-tuned rotation for the new 250-tall frame, not the same value
  // as the 180-tall card above).
  imageEnrolled: {
    width: 127.167,
    height: 254.656,
    transform: [{rotate: '0.643deg'}],
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
  // Default (recommendation) variant — full-width button, no icon inside.
  // Also reused as-is for the 'enrolled' card's Continue Course button
  // (same exact spec: flex 1 0 0, alignSelf stretch, radius 5, bg #0C4D91).
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
  buttonText: {
    color: '#FFFFFF',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  // Cancels fullButton's flex:1 specifically for the 'enrolled' placement
  // (inside the column enrolledBottomBlock) — see BUGFIX comment above
  // where this is used. Width is unaffected: alignSelf:'stretch' on
  // fullButton already fills the column's full width on its own.
  fullButtonInColumn: {
    flex: 0,
  },
  // ─── 'enrolled' bottom block: Progress row + bar + module row + button ──
  // Deliberately NOT using `gap` here (project rule: gap is unreliable on
  // Android/Hermes — explicit margins on children instead). marginTop on
  // the whole block gives breathing room below the calendar/format meta
  // rows above it.
  enrolledBottomBlock: {
    alignSelf: 'stretch',
    marginTop: 14,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 6,
  },
  // CORRECTED (this pass): Marium's exported PNG mockup rendered this
  // label as "Progress", but the actual Figma file (checked directly,
  // not the export) shows "In-Progress" on every card — which is also
  // just card_status's real value. Bound to the statusLabel prop now
  // instead of hardcoded, defaulting to 'In-Progress' if not passed.
  progressLabel: {
    color: '#192647',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  progressPercentText: {
    color: '#8F9098',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: 100,
    backgroundColor: '#EEF7FC',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: 8,
    borderRadius: 100,
    backgroundColor: '#46B0E3',
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  moduleIconWrap: {
    marginRight: 6,
    // Nudge down slightly so the bookmark icon optically aligns with the
    // first line of (possibly 2-line) module text, matching the reference
    // screenshot, instead of sitting dead-center against the whole block.
    marginTop: 1,
  },
  moduleText: {
    flex: 1,
    color: '#8F9098',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
    lineHeight: 16,
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
   against Figma spec — the gradient frame is 75px wide (180 tall on
   'default', 250 tall on 'enrolled'), intentionally narrower than the
   rotated photo sitting inside it. The frame's own overflow:hidden clips
   the oversized photo down to a soft angled sliver with the gradient
   showing through around its rotated edges.

   The 'default' (recommendation) variant does NOT use this treatment —
   it uses `imageStraight` instead: a plain photo sized to exactly fill
   the 75x180 frame, no rotation, no bleed. Confirmed via a side-by-side
   Figma comparison (Aug 2026) that the two variants are intentionally
   different, not a shared bug — do not merge them back into one style.

   HISTORY: 'enrolled' previously rendered a statusText (e.g.
   "In-Progress") next to a content-width Continue Course button, with no
   progress bar or module row at all. That whole layout is REPLACED as of
   the Sept 2026 spec — the card is now 250 tall with a Progress row/bar,
   a current-module row, and a full-width Continue Course button. Nothing
   else in the app consumed the old statusText prop, so it's been removed
   from Props entirely rather than kept dead. */
