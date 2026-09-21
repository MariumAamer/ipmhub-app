/* eslint-disable prettier/prettier */
// src/components/ResumeBanner.tsx
//
// Top banner on the My Courses tab — "Welcome back, {first_name}" + the
// most-recently-visited in-progress course, a Resume button, progress bar,
// and last-visited text. Built from Marium's pasted Figma CSS spec
// (confirmed Sep 2026) and the getResumeBanner() endpoint (coursesApi.ts) —
// only renders when the endpoint returns a real `banner` object; the
// no-active-course case is unconfirmed so callers should simply not render
// this component when banner is null (see CoursesScreen wiring).
//
// STRUCTURE (Sep 2026 — see inline notes below for what changed and why):
//   1. A top ROW: image (left, no button attached) + a right-hand column
//      containing welcome text -> title -> Resume button, stacked in that
//      order (CONFIRMED via live instruction, Sep 2026 — supersedes an
//      intermediate pass that grouped the button with the image based on
//      a Figma inspector "Frame 2085669498" selection, and an even earlier
//      pass that made the button full card width. Both were wrong.)
//   2. Below that row, spanning the FULL card width (not indented to align
//      with the text column): the step_line breadcrumb
//   3. Progress bar (full width)
//   4. Percentage / last-visited row (full width)
//
// CONFIRMED from Figma:
//   - outer card: padding 25, borderRadius 5,
//     background linear-gradient(213deg, #004C96 -3.99%, #001830 100%)
//     (approximated below via LinearGradient start/end — react-native-
//     linear-gradient takes fractional points, not a CSS angle, same
//     convention as CourseCard.tsx/CompletedCourseCard.tsx)
//   - shadow: 0 0 10.023px -1.822px rgba(0,0,0,0.15)
//   - image frame: width 90, borderRadius 5, column, justify flex-end,
//     align items center, self stretch, border 2px solid #FFF — ALL
//     RECONFIRMED via a direct Dev Mode CSS panel read (Sep 2026). Two
//     intermediate passes had changed justify-content to center (to match
//     CourseCard's technique) and removed the border (based on a verbal
//     note) — both reverted once the literal CSS was visible directly.
//     Lesson: prefer a direct Dev Mode CSS read over a verbal description
//     when they conflict.
//   - image frame background: white->light-blue gradient
//     (linear-gradient(2deg, #FFF 39.59%, #AEE5FF 98.96%), CONFIRMED Sep 2026),
//     same technique as CourseCard.tsx's 'enrolled' image (LinearGradient as
//     root of the image stack, oversized/rotated Image on top, overflow:hidden)
//   - image: 123.459 x 200.831, rotate 0.722deg (CONFIRMED Sep 2026 — an
//     earlier pass wrongly changed this to a fixed 90x90 square; the actual
//     square LOOK comes from this oversized/rotated image being clipped by
//     the 90px frame's overflow:hidden, now that the frame sits in the
//     smaller topRow rather than spanning the old full-card height)
//   - top-row gap (image <-> welcome/title column): 15 (corrected Sep 2026;
//     was mistakenly 40, carried over from the original raw CSS dump)
//   - welcome text -> title gap: 15 (confirmed Sep 2026)
//   - resume button: stacked as the third item in the welcome/title column
//     (see STRUCTURE note above), stretches to that column's width —
//     height 38, padding 12/16, radius 5, bg #FFF, gap 8
//   - resume arrow svg: 12x12, fill #0C4D91
//   - resume text: Action M (Runda-Medium 12), color #0C4D91
//   - welcome text: Body S (Runda-Normal 12/16), color #FFF
//   - course title: H3 (Runda-Medium 16/20, letterSpacing 0.08), color #FFF
//   - step_line breadcrumb: Body M (Runda-Normal 14/18), color #FFF, no icon,
//     full card width, positioned below the image row (not beside it)
//   - progress track: height 15, borderRadius 100, bg #EEF7FC, full width
//   - progress fill: bg #46B0E3
//   - percentage/"In-Progress" label: H4 (Runda-Medium 14), color #FFF
//   - last-visited clock icon: 14x14, fill #FFF
//   - last-visited text: H4 (Runda-Medium 14), color #FFF — API's
//     `last_visited` string already reads as a full phrase (e.g. "Last
//     visited 24 days ago"), so it's rendered as one Text node rather than
//     split into a separate "Last visited:" label + relative-time value.
//
// NOT pixel-confirmed (Figma spec didn't give exact numbers for these):
//   - Vertical gap between the top row / breadcrumb / resume button /
//     progress bar / meta row — used 15 as a reasonable value pending a
//     pixel check, since that's the one vertical gap actually confirmed
//     elsewhere in this component (welcome->title).
//   - step_line allowed to wrap to 3 lines (not 2) since real breadcrumbs
//     can run longer than the Figma example ("Module 0 – Welcome to the
//     Course · Topic: Certified Project Management Diploma" didn't fit in 2
//     at the confirmed font size — this is a text-length issue, not a
//     layout bug).

import React from 'react';
import {View, Text, Image, StyleSheet, TouchableOpacity} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {Path} from 'react-native-svg';
import {ResumeBanner as ResumeBannerData} from '../api/coursesApi';

const ResumeArrow = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M6 0C2.688 0 0 2.688 0 6C0 9.312 2.688 12 6 12C9.312 12 12 9.312 12 6C12 2.688 9.312 0 6 0ZM4.8 8.7V3.3L8.4 6L4.8 8.7Z"
      fill="#0C4D91"
    />
  </Svg>
);

const ClockIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path
      d="M6.99967 1.1665C6.38084 1.1665 5.78734 1.41234 5.34976 1.84992C4.91217 2.28751 4.66634 2.881 4.66634 3.49984C4.66634 4.11868 4.91217 4.71217 5.34976 5.14975C5.78734 5.58734 6.38084 5.83317 6.99967 5.83317C7.61851 5.83317 8.21201 5.58734 8.64959 5.14975C9.08717 4.71217 9.33301 4.11868 9.33301 3.49984C9.33301 2.881 9.08717 2.28751 8.64959 1.84992C8.21201 1.41234 7.61851 1.1665 6.99967 1.1665ZM9.91634 6.99984H4.08301C3.61888 6.99984 3.17376 7.18421 2.84557 7.5124C2.51738 7.84059 2.33301 8.28571 2.33301 8.74984C2.33301 10.0518 2.86851 11.0948 3.74701 11.8007C4.61151 12.4948 5.77117 12.8332 6.99967 12.8332C8.22817 12.8332 9.38784 12.4948 10.2523 11.8007C11.1297 11.0948 11.6663 10.0518 11.6663 8.74984C11.6663 8.28571 11.482 7.84059 11.1538 7.5124C10.8256 7.18421 10.3805 6.99984 9.91634 6.99984Z"
      fill="white"
    />
  </Svg>
);

interface Props {
  banner: ResumeBannerData;
  onPressResume: () => void;
}

const ResumeBanner = ({banner, onPressResume}: Props) => {
  const pct = Math.max(0, Math.min(100, banner.progress ?? 0));

  return (
    <LinearGradient
      colors={['#004C96', '#001830']}
      start={{x: 0.85, y: 0.02}}
      end={{x: 0.15, y: 0.98}}
      style={styles.root}>
      {/* CONFIRMED (Sep 2026, live instruction supersedes the earlier
          "Frame 2085669498" inspector grouping): welcome text -> title ->
          Resume button, stacked together in the RIGHT-hand column. The image
          on the left has no button attached to it. */}
      <View style={styles.topRow}>
        <LinearGradient
          colors={['#AEE5FF', '#FFFFFF']}
          start={{x: 0, y: 0}}
          end={{x: 0, y: 1}}
          style={styles.imageFrame}>
          {banner.logo ? (
            <Image source={{uri: banner.logo}} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]} />
          )}
        </LinearGradient>

        <View style={styles.welcomeTitleGroup}>
          <Text style={styles.welcomeText}>{`Welcome back, ${banner.first_name}`}</Text>
          <Text style={styles.courseTitle} numberOfLines={2}>{banner.title}</Text>
          <TouchableOpacity style={styles.resumeBtn} onPress={onPressResume} activeOpacity={0.85}>
            <ResumeArrow />
            <Text style={styles.resumeText}>{'Resume'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Breadcrumb, progress bar, and meta row still span the full card
          width, below the image+title row. */}
      {!!banner.step_line && (
        <Text style={styles.stepLine} numberOfLines={3}>{banner.step_line}</Text>
      )}

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, {width: `${pct}%`}]} />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>{`${pct}% In-Progress`}</Text>
        {!!banner.last_visited && (
          <View style={styles.lastVisitedRow}>
            <ClockIcon />
            {/* CONFIRMED (original spec): "Last visited:" is H4/weight-500,
                the relative time value is Body M/weight-400 — two different
                text styles, not one uniform bold string. The API returns
                these combined as one phrase (e.g. "Last visited 24 days ago",
                no colon), so split it here and insert the colon ourselves. */}
            {(() => {
              const match = banner.last_visited.match(/^(.*?visited)\s*:?\s*(.*)$/i);
              const label = match ? match[1] : 'Last visited';
              const value = match ? match[2] : banner.last_visited;
              return (
                <Text>
                  <Text style={styles.metaLabel}>{`${label}: `}</Text>
                  <Text style={styles.lastVisitedValue}>{value}</Text>
                </Text>
              );
            })()}
          </View>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: {
    // FIX: was a hardcoded width:358 (= 390pt Figma reference width minus
    // 32px of the parent's horizontal padding). That only lines up by
    // coincidence on devices ~390pt wide (e.g. iPhone 14 Pro's 393pt); on
    // an SE/mini (375pt) it would overflow past the screen edge, and on a
    // Pro Max/iPad it would leave a dead gap on the right. alignSelf:
    // 'stretch' fills whatever width the parent (paddingHorizontal:16
    // wrapper in CoursesScreen) actually provides, on any screen size —
    // same fix needed in CourseCard.tsx / CourseDetailScreen.tsx.
    alignSelf: 'stretch',
    flexDirection: 'column',
    padding: 25,
    gap: 15, // NOT pixel-confirmed for this vertical stacking — see file header
    borderRadius: 5,
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 10.023,
    shadowOffset: {width: 0, height: 0},
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start', // CORRECTED (Sep 2026): was 'center', which let the taller 3-item text column (welcome+title+button) push "Welcome back" down instead of flush with the image's top
    gap: 15, // CONFIRMED (Sep 2026): was 40, carried over from an earlier misread of the raw CSS
    alignSelf: 'stretch',
  },
  imageFrame: {
    width: 90,
    height: 114, // CONFIRMED (Sep 2026): this exact "90x114" content-box size has shown up identically across multiple separate Dev Mode screenshots — treating as a fixed size now, not a value derived from alignSelf:'stretch' matching the (now taller, 3-item) text column. Fixes the inconsistent/shifting crop that caused "image is small" / "lower img is hidden".
    flexDirection: 'column',
    justifyContent: 'flex-start', // OVERRIDE (Sep 2026): Figma's confirmed value is flex-end, but real user photos rendered with flex-end clipped the face off entirely (crop anchored to the bottom, showing torso/shoulders instead of the head). Prioritizing a visible face over literal token fidelity here — flag to Marium/design if this needs reconciling with the Figma source asset instead.
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 2, // RECONFIRMED again via direct Dev Mode CSS read (Sep 2026)
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  image: {
    // CONFIRMED (Sep 2026, re-verified) — reverted from a speculative 1.35x
    // scale-up in an earlier pass. These are Marium's actual Figma numbers;
    // the frame is now a FIXED 90x114 (see imageFrame above) rather than a
    // size that changes with sibling content, so this fixed image size
    // should now crop consistently regardless of how tall the text column gets.
    width: 123.459,
    height: 200.831,
    transform: [{rotate: '0.722deg'}],
  },
  imagePlaceholder: {backgroundColor: 'rgba(255,255,255,0.25)'},
  resumeBtn: {
    flexDirection: 'row',
    minHeight: 38,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch', // stretches to welcomeTitleGroup's width — third stacked item after welcome text + title (CONFIRMED Sep 2026, live instruction)
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  resumeText: {
    color: '#0C4D91',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  welcomeTitleGroup: {flex: 1, alignItems: 'flex-start', gap: 15}, // 15 confirmed for welcome->title specifically; reused for title->button since no separate value was given
  welcomeText: {
    color: '#FFFFFF',
    fontFamily: 'Runda-Normal',
    fontSize: 12,
    lineHeight: 16,
  },
  courseTitle: {
    color: '#FFFFFF',
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  stepLine: {
    alignSelf: 'stretch',
    color: '#FFFFFF',
    fontFamily: 'Runda-Normal',
    fontSize: 14,
    lineHeight: 18,
  },
  progressTrack: {
    height: 15,
    alignSelf: 'stretch',
    borderRadius: 100,
    backgroundColor: '#EEF7FC',
    overflow: 'hidden',
  },
  progressFill: {
    height: 15,
    borderRadius: 100,
    backgroundColor: '#46B0E3',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
    rowGap: 4,
  },
  metaLabel: {
    color: '#FFFFFF',
    fontFamily: 'Runda-Medium',
    fontSize: 14,
  },
  lastVisitedValue: {
    color: '#FFFFFF',
    fontFamily: 'Runda-Normal',
    fontSize: 14,
    lineHeight: 18,
  },
  lastVisitedRow: {flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1},
});

export default ResumeBanner;
