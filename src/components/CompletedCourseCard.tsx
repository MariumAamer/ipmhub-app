/* eslint-disable prettier/prettier */
// src/components/CompletedCourseCard.tsx
//
// Card for the "Completed" section of the My Courses tab. Distinct from
// CourseCard's 'enrolled'/'default' variants — Figma spec (confirmed Sep
// 2026) uses a taller card (~342 vs 180) and a diagonal purple->blue badge
// frame instead of the sky-blue vertical wash used elsewhere, so this is
// its own component rather than a third CourseCard variant.
//
// STRUCTURE (CORRECTED Sep 2026 — see BUGFIX notes below): this is NOT one
// row of [image | everything]. It's:
//   1. A COMPACT top row (~106px tall, per the "layout for img and title
//      etc: height: 105.948px" spec): badge/icon frame + title/date/format
//      block, side by side.
//   2. Below that row, spanning the FULL card width (not indented to align
//      with the title column): the "Completed"/percentage progress bar.
//   3. TWO separate buttons, stacked: "View Certificate" (gradient, shown
//      whenever certificate_url exists, regardless of expired state) and
//      below it either "Revisit Course" (grey outline) or "Expired Course"
//      (red outline) depending on is_access_expired. An earlier pass
//      wrongly rendered ONE button that swapped its label instead of two
//      separate buttons — confirmed wrong by the PRINCE2 (expired) reference
//      screenshot, which shows BOTH buttons together.
//   4. The primary_recommended pill, full width.
// An earlier pass made the badge frame stretch to the FULL card height
// (alignSelf:'stretch' against the whole card), producing a comically tall
// gradient sliver with a tiny centered icon — wrong. The frame should only
// stretch to match the compact top row's ~106px height.
//
// CONFIRMED from Figma:
//   - card: 358 wide, ~342 tall, padding 16, gap ~15, borderRadius 7.706,
//     white bg, shadow 0 0 11px rgba(0,0,0,0.25)
//   - top row: height ~105.948, gap 10
//   - badge frame: column, center, self-stretch (to the top row, not the
//     whole card), borderRadius 5, background
//     linear-gradient(123deg, #E257E4 -7.02%, #005AB4 103.39%)
//     (approximated below via LinearGradient start/end — react-native-
//     linear-gradient takes fractional start/end points, not a CSS angle)
//   - image: 63.938 x 66 (aspect-ratio 31/32), cover
//   - title: H3, 16px/weight 500, color #192546, letterSpacing 0.08
//   - progress rectangle: height 8, self-stretch, background #46B0E3
//   - "View Certificate" button: linear-gradient(90deg, #E257E4 0%,
//     #084D92 70.35%), white text — CONFIRMED (Sep 2026); an earlier pass
//     used a flat navy background instead of this gradient — wrong.
//   - "Revisit Course" button: white bg, 1px #7C86A1 border, #7C86A1 text
//   - "Expired Course" button: white bg, 1px #ED3241 border, #ED3241 text
//
// NOT yet pixel-confirmed (no exact CSS given for this one):
//   - primary_recommended pill ("Certified Project Management Diploma →")
//     — reused the connecting-pill CSS Marium pasted for the Welcome-back
//     banner (borderRadius:100, background #B4C4D9, padding 10x20, arrow).

import React from 'react';
import {View, Text, Image, StyleSheet, TouchableOpacity, Linking} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {Path, Defs, LinearGradient as SvgLinearGradient, Stop, Rect} from 'react-native-svg';
import {EnrolledCourse} from '../api/coursesApi';

// ─── Icons (duplicated locally per project convention — see CourseCard.tsx) ─

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

const FormatIcon = () => (
  <Svg width={9.5} height={9.5} viewBox="0 0 12 12" fill="none">
    <Path
      d="M7.58789 1.5C7.73417 1.5 7.85233 1.61841 7.85254 1.76465C7.85254 1.91059 7.7343 2.0293 7.58789 2.0293H3.35352C2.62244 2.0293 2.0293 2.62244 2.0293 3.35352V8.64746C2.02954 9.37834 2.62258 9.9707 3.35352 9.9707H7.58789C7.7343 9.9707 7.85254 10.0894 7.85254 10.2354C7.85248 10.3817 7.73426 10.5 7.58789 10.5H3.35352C2.33025 10.5 1.50025 9.67068 1.5 8.64746V3.35352C1.5 2.3301 2.33009 1.5 3.35352 1.5H7.58789ZM7.92969 3.69531C8.03342 3.59208 8.20145 3.59208 8.30469 3.69531L10.4219 5.8125C10.5119 5.90248 10.5233 6.04169 10.4561 6.14453L10.4219 6.18652L8.30469 8.30469C8.20148 8.4079 8.03342 8.40785 7.92969 8.30469C7.82645 8.20145 7.82645 8.03342 7.92969 7.92969L9.5957 6.26465H4.94043C4.79413 6.26457 4.67585 6.1463 4.67578 6C4.67578 5.85364 4.79409 5.73543 4.94043 5.73535H9.5957L7.92969 4.06934C7.82647 3.96612 7.82651 3.79855 7.92969 3.69531Z"
      fill="#8F9098"
    />
  </Svg>
);

// Connecting-pill arrow — from the Welcome-back banner's course pill spec
const PillArrow = () => (
  <Svg width={9} height={9} viewBox="0 0 9 9" fill="none">
    <Path
      d="M6.34492 5.38164L6.43457 5.28262C6.82532 4.80378 6.82532 4.11146 6.43457 3.63262L6.34492 3.53359L2.9541 0.143359L2.06816 1.02812L2.28027 1.24082L5.45957 4.41953C5.48009 4.44078 5.47989 4.47529 5.45898 4.49629L2.06641 7.89004L2.95176 8.77539L6.34492 5.38164Z"
      fill="#192546"
    />
  </Svg>
);

// "Revisit Course" refresh icon — from the earlier confirmed spec
const RevisitIcon = ({color}: {color: string}) => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.18259 1.5293C9.28205 1.5293 9.37743 1.56881 9.44776 1.63913C9.51808 1.70946 9.55759 1.80484 9.55759 1.9043V4.0253C9.55759 4.12475 9.51808 4.22014 9.44776 4.29046C9.37743 4.36079 9.28205 4.4003 9.18259 4.4003H7.06109C6.96163 4.4003 6.86625 4.36079 6.79593 4.29046C6.7256 4.22014 6.68609 4.12475 6.68609 4.0253C6.68609 3.92584 6.7256 3.83046 6.79593 3.76013C6.86625 3.68981 6.96163 3.6503 7.06109 3.6503H8.24109C7.56409 3.11829 6.71986 2.84459 5.85949 2.87819C4.99913 2.91179 4.17881 3.2505 3.54536 3.83368C2.91192 4.41686 2.5067 5.20645 2.40225 6.0611C2.29779 6.91576 2.50092 7.7797 2.97527 8.49827C3.44962 9.21685 4.16422 9.74314 4.99117 9.98296C5.81811 10.2228 6.70342 10.1605 7.48861 9.80716C8.27381 9.45386 8.90764 8.83264 9.27664 8.05471C9.64565 7.27677 9.72574 6.39289 9.50259 5.5613C9.48988 5.51369 9.48668 5.46405 9.49316 5.41521C9.49964 5.36637 9.51567 5.31928 9.54035 5.27663C9.56503 5.23399 9.59786 5.19662 9.63698 5.16667C9.6761 5.13671 9.72074 5.11475 9.76834 5.10205C9.81594 5.08934 9.86559 5.08614 9.91443 5.09262C9.96327 5.09909 10.0104 5.11513 10.053 5.13981C10.0956 5.16449 10.133 5.19732 10.163 5.23644C10.1929 5.27556 10.2149 5.32019 10.2276 5.3678C10.4982 6.37679 10.3989 7.44933 9.94755 8.39146C9.4962 9.3336 8.72264 10.0831 7.76673 10.5045C6.81082 10.9259 5.73569 10.9913 4.73573 10.689C3.73578 10.3866 2.87702 9.73646 2.31474 8.85602C1.75246 7.97559 1.52379 6.92301 1.67006 5.88864C1.81634 4.85426 2.32792 3.90637 3.11228 3.21637C3.89664 2.52637 4.90202 2.13981 5.9466 2.12659C6.99118 2.11337 8.00602 2.47437 8.80759 3.1443V1.9043C8.80759 1.80484 8.8471 1.70946 8.91743 1.63913C8.98775 1.56881 9.08313 1.5293 9.18259 1.5293Z"
      fill={color}
    />
  </Svg>
);

// "Expired Course" circle-X icon
const ExpiredIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path d="M6 11C8.76143 11 11 8.76143 11 6C11 3.23857 8.76143 1 6 1C3.23857 1 1 3.23857 1 6C1 8.76143 3.23857 11 6 11Z" stroke="#ED3241" strokeLinejoin="round" />
    <Path d="M7.41436 4.58594L4.58594 7.41436" stroke="#ED3241" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M4.58594 4.58594L7.41436 7.41436" stroke="#ED3241" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

interface Props {
  course: EnrolledCourse;
  /** Fallback used only if certificate_url is empty and Revisit Course is
   * pressed — navigates into the course itself. */
  onPressFallback: () => void;
}

const CompletedCourseCard = ({course, onPressFallback}: Props) => {
  const dateLabel = course.date_range?.display ?? course.enrollment?.date_display ?? '';
  const pill = course.primary_recommended;
  const percentage = course.progress?.percentage ?? course.progress_pct ?? 100;
  const hasCertificate = !!course.certificate_url;

  return (
    <View style={styles.card}>
      {/* TEMP DEBUG: fresh unique marker, round 2 of build verification */}
      <Text style={{fontSize: 22, color: 'red', backgroundColor: 'lime'}}>
        {'VERIFY_ROUND2_QWERTY'}
      </Text>
      {/* Compact top row: badge/icon + title block, side by side. */}
      <View style={styles.topRow}>
        {/* LinearGradient kept as root of the image stack — project rule:
            Android clips nested gradients when a parent has overflow:hidden. */}
        <LinearGradient
          colors={['#E257E4', '#005AB4']}
          start={{x: 0.08, y: 0.23}}
          end={{x: 0.92, y: 0.77}}
          style={styles.badgeFrame}>
          {course.image ? (
            <Image source={{uri: course.image}} style={styles.badgeImage} resizeMode="cover" />
          ) : (
            <View style={[styles.badgeImage, styles.badgeImagePlaceholder]} />
          )}
        </LinearGradient>

        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={2}>{course.title}</Text>
          <View style={styles.titleDivider} />
          {!!dateLabel && (
            <View style={styles.metaRow}>
              <CalendarIcon />
              <Text style={styles.metaText}>{dateLabel}</Text>
            </View>
          )}
          {!!course.format_label && (
            <View style={styles.metaRow}>
              <FormatIcon />
              <Text style={styles.metaText}>{course.format_label}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Everything below spans the FULL card width. */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>{'Completed'}</Text>
          <Text style={styles.progressPercent}>{`${percentage}%`}</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, {width: `${percentage}%`}]} />
        </View>
      </View>

      <View style={styles.bottomStack}>
        {hasCertificate && (
          // FIX (iOS), round 4 — rounds 1-3 and disabling the New
          // Architecture all failed to resolve this. The gradient (colors
          // matching this button's ['#E257E4','#084D92']) was consistently
          // rendering in the WRONG position — visually overlapping the
          // progress bar above instead of its own slot here — while this
          // slot itself appeared empty. That pointed at
          // react-native-linear-gradient's native layer specifically, not
          // layout or architecture. This version drops LinearGradient
          // entirely for this button and draws the gradient fill with
          // react-native-svg instead — a completely different native
          // rendering pipeline, already proven correct elsewhere in this
          // file (the badge icons use it).
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => Linking.openURL(course.certificate_url!)}
            style={styles.actionBtnTouchable}>
            <View style={styles.actionBtn}>
              <Svg
                style={StyleSheet.absoluteFillObject}
                width="100%"
                height="100%">
                <Defs>
                  <SvgLinearGradient
                    id="certBtnGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%">
                    <Stop offset="0%" stopColor="#E257E4" />
                    <Stop offset="70.35%" stopColor="#084D92" />
                    <Stop offset="100%" stopColor="#084D92" />
                  </SvgLinearGradient>
                </Defs>
                <Rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  rx={5}
                  fill="url(#certBtnGradient)"
                />
              </Svg>
              <Text style={styles.actionBtnText}>{'View Certificate'}</Text>
            </View>
          </TouchableOpacity>
        )}

        {course.is_access_expired ? (
          <View style={[styles.outlineBtn, styles.expiredBtn]}>
            <ExpiredIcon />
            <Text style={styles.expiredBtnText}>{'Expired Course'}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={onPressFallback}
            activeOpacity={0.85}>
            <RevisitIcon color="#7C86A1" />
            <Text style={styles.revisitBtnText}>{course.cta_label ?? 'Revisit Course'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {pill?.title ? (
        <TouchableOpacity
          style={styles.pill}
          activeOpacity={0.85}
          onPress={() => pill.link && Linking.openURL(pill.link)}>
          <Text style={styles.pillText} numberOfLines={1}>{pill.label || pill.title}</Text>
          <PillArrow />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 358,
    minHeight: 341.948,
    flexDirection: 'column',
    padding: 16,
    gap: 15.034,
    borderRadius: 7.706,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 11,
    shadowOffset: {width: 0, height: 0},
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    alignSelf: 'stretch',
  },
  badgeFrame: {
    paddingTop: 19.97,
    paddingRight: 8.563,
    paddingBottom: 19.978,
    paddingLeft: 14.5,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    // BUGFIX (Sep 2026): was alignSelf:'stretch' against the WHOLE card
    // (flexDirection:'row' at the card level), producing a comically tall
    // gradient sliver spanning ~300px with a tiny centered icon. Now stretches
    // only to match topRow's own compact height (~106px per the confirmed
    // "layout for img and title etc" spec), matching the Figma reference.
    alignSelf: 'stretch',
    borderRadius: 5,
    overflow: 'hidden',
  },
  badgeImage: {
    width: 63.938,
    height: 66,
  },
  badgeImagePlaceholder: {backgroundColor: 'rgba(255,255,255,0.35)'},
  titleBlock: {
    flex: 1,
  },
  title: {
    color: '#192546',
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  titleDivider: {
    width: 42.954,
    height: 1.5,
    backgroundColor: '#46B0E3',
    marginTop: 6,
    marginBottom: 8,
  },
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4},
  metaText: {
    color: '#8F9098',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  progressSection: {gap: 8, alignSelf: 'stretch'},
  progressLabelRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch'},
  progressLabel: {
    color: '#192647',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  progressPercent: {
    color: '#8F9098',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  progressBarTrack: {
    height: 8,
    alignSelf: 'stretch',
    borderRadius: 100, // NOT specified for this exact element — reused for consistency with every other progress bar in the app
    backgroundColor: '#EEF7FC',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 100,
    backgroundColor: '#46B0E3',
  },
  bottomStack: {gap: 10, alignSelf: 'stretch'},
  // Outer TouchableOpacity — just enough style to get a real width context
  // from its parent (bottomStack). Deliberately non-empty: the ORIGINAL
  // bug had this element completely unstyled, which is worth avoiding even
  // though the confirmed fix was actually about removing position:absolute
  // from the child, not this alone.
  actionBtnTouchable: {
    alignSelf: 'stretch',
    height: 40,
  },
  // Now applied directly to the LinearGradient as a normal (non-absolute)
  // flex child — same technique as the working badgeFrame gradients.
  actionBtn: {
    flexDirection: 'row',
    height: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'stretch',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  outlineBtn: {
    flexDirection: 'row',
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#7C86A1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'stretch',
  },
  revisitBtnText: {
    color: '#7C86A1',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  expiredBtn: {
    borderColor: '#ED3241',
  },
  expiredBtnText: {
    color: '#ED3241',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderRadius: 100,
    backgroundColor: '#B4C4D9',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  pillText: {
    color: '#192546',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
    letterSpacing: 0.09,
  },
});

export default CompletedCourseCard;
