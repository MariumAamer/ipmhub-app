/* eslint-disable prettier/prettier */
// src/components/EmptyCoursesRecommendation.tsx
//
// "You don't have any courses yet" empty state + recommended course cards,
// used on the Courses screen's My Courses tab when the user has no
// enrolled courses. Uses the shared CourseCard component.
//
// LIVE ENDPOINT WIRED (Aug 2026): custom/v1/my-courses/recommended?
// user_id={userId} — CONFIRMED via Postman. Returns real per-course
// images, its own empty_title/empty_message copy, and two flags that now
// drive whether this component renders at all:
//   has_courses: false, should_show: true  -> show recommendations
//   has_courses: true,  should_show: false -> render nothing
// (Previously this screen only used the SEPARATE getMyCourses() enrolled
// list to decide whether to show the empty state at all — should_show
// here is the recommended endpoint's own say on whether IT should render,
// so it's checked independently rather than assumed from that other call.)
//
// "View Course" navigates in-app to CourseDetailScreen (route
// 'CourseDetail') for live API courses. This previously 403'd — FIXED
// (Aug 2026) at the getCourseDetails() layer in coursesApi.ts: that
// endpoint has a confirmed public preview mode when user_id is omitted
// (is_enrolled: false + working "Take this Course" button), and
// getCourseDetails() now automatically retries that way on a 403. See
// the HISTORY note at the bottom of this file for the full story.
//
// RECOMMENDED_COURSES (hardcoded fallback) still opens externally via
// Linking.openURL — its courseIds were never individually re-verified
// against getCourseDetails() the way the live API's ids now are.

import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Linking, ActivityIndicator} from 'react-native';
import CourseCard from './CourseCard';
import {
  RECOMMENDED_COURSES,
  getRecommendedCourses,
  RecommendedCourseAPI,
} from '../api/coursesApi';
import {getUserIdFromToken} from '../api/profileApi';

interface Props {
  navigation?: any;
  onViewCourse?: (course: RecommendedCourseAPI) => void;
}

// Common shape the render list is normalized to, whether it came from the
// live endpoint or the hardcoded fallback.
interface DisplayCourse {
  id: string;
  title: string;
  description: string;
  image?: string;
  permalink: string;
  buttonLabel: string;
}

const DEFAULT_EMPTY_TITLE = "You don't have any courses yet";
const DEFAULT_EMPTY_MESSAGE = 'Below are our top course recommendations for you.';

const EmptyCoursesRecommendation = ({navigation, onViewCourse}: Props) => {
  const [loading, setLoading] = useState(true);
  const [emptyTitle, setEmptyTitle] = useState(DEFAULT_EMPTY_TITLE);
  const [emptyMessage, setEmptyMessage] = useState(DEFAULT_EMPTY_MESSAGE);
  const [apiCourses, setApiCourses] = useState<RecommendedCourseAPI[] | null>(null);
  // null = endpoint didn't answer (network/auth failure) -> fall back to
  // the hardcoded list. false = endpoint explicitly said don't show this
  // component at all (should_show: false) -> render nothing.
  const [shouldShow, setShouldShow] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const userId = await getUserIdFromToken();
        if (!userId) {
          setApiCourses(null); // falls back to RECOMMENDED_COURSES below
          setLoading(false);
          return;
        }
        const res = await getRecommendedCourses(userId);
        if (res) {
          setShouldShow(res.should_show);
          if (res.empty_title) setEmptyTitle(res.empty_title);
          if (res.empty_message) setEmptyMessage(res.empty_message);
          if (Array.isArray(res.courses) && res.courses.length > 0) {
            setApiCourses(res.courses);
          } else {
            setApiCourses(null); // falls back to RECOMMENDED_COURSES below
          }
        } else {
          setApiCourses(null); // request failed -> fall back
        }
      } catch (err) {
        console.error('[EmptyCoursesRecommendation] load', err);
        setApiCourses(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePress = (course: DisplayCourse, apiCourse?: RecommendedCourseAPI) => {
    if (onViewCourse && apiCourse) {
      onViewCourse(apiCourse);
      return;
    }
    // RE-ENABLED (Aug 2026) — getCourseDetails() now self-heals on the
    // 403 that broke this before: it retries without user_id, which is a
    // CONFIRMED public preview mode on the backend (is_enrolled: false +
    // a working "Take this Course" button). Safe to navigate in-app again
    // for API-sourced recommended courses.
    if (apiCourse && navigation?.navigate) {
      navigation.navigate('CourseDetail', {courseId: apiCourse.id});
      return;
    }
    // Fallback list only — courseIds never individually re-verified the
    // same way, keep external/permalink-only for that path.
    Linking.openURL(course.permalink).catch(() => {});
  };

  // Normalize whichever source we have into the same render shape.
  const displayCourses: {display: DisplayCourse; apiCourse?: RecommendedCourseAPI}[] = apiCourses
    ? apiCourses.map((c) => ({
        display: {
          id: String(c.id),
          title: c.title,
          description: c.description,
          image: c.image,
          permalink: c.permalink,
          buttonLabel: c.cta_label || 'View Course',
        },
        apiCourse: c,
      }))
    : RECOMMENDED_COURSES.map((c) => ({
        display: {
          id: c.id,
          title: c.title,
          description: c.tagline,
          image: undefined,
          permalink: c.url,
          buttonLabel: 'View Course',
          // Deliberately omitted: fallback courseIds were only
          // individually re-verified for one entry (22814) — keep this
          // path external/permalink-only per the history note below.
        },
      }));

  if (loading) {
    return <ActivityIndicator color="#0C4D91" style={{marginTop: 40}} />;
  }

  // Endpoint explicitly said not to render this component (e.g. the
  // account actually has courses per this endpoint's own check, even if
  // the caller's separate enrolled-list check briefly disagreed).
  if (shouldShow === false) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headingBlock}>
        <Text style={styles.heading}>{emptyTitle}</Text>
        <View style={styles.headingUnderline} />
        <Text style={styles.subtext}>{emptyMessage}</Text>
      </View>
      {displayCourses.map(({display, apiCourse}) => (
        <View key={display.id} style={styles.cardWrap}>
          <CourseCard
            imageUri={display.image}
            title={display.title}
            description={display.description}
            buttonLabel={display.buttonLabel}
            onPressButton={() => handlePress(display, apiCourse)}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headingBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heading: {
    color: '#192647',
    textAlign: 'center',
    fontFamily: 'Runda-Bold',
    fontSize: 18,
    letterSpacing: 0.09,
  },
  headingUnderline: {
    width: 85,
    height: 1,
    backgroundColor: '#46B1E4',
    marginTop: 8,
  },
  subtext: {
    color: '#192647',
    textAlign: 'center',
    fontFamily: 'Runda-Normal',
    fontSize: 14,
    lineHeight: 18,
    marginTop: 8,
  },
  cardWrap: {marginBottom: 16},
});

export default EmptyCoursesRecommendation;

/* ─────────────────────────────────────────────────────────────────────────
   HISTORY (kept for context):
   Getting a recommended course to open in-app via CourseDetail took a few
   attempts:
     1. Matched cards to the courses/search catalog's numeric `id`
        (37996/37997/37998) — 404, wrong ID space vs ld-courses/{id}.
     2. Used the my-courses/in-progress list's id (22814) — 403. That id
        was pulled from one specific account's own enrolled list, so it
        was only guaranteed accessible to that account.
     3. Used the my-courses/recommended endpoint's own numeric `id` field
        — ALSO 403'd on a live device test
        (/ld-courses/22814/details?user_id=14074), because
        ld-courses/{id}/details checks enrollment for whichever user_id is
        passed, and this account isn't enrolled in that course. Briefly
        reverted to external-only as a result.
   RESOLVED (Aug 2026): a Postman test of the SAME endpoint with NO
   user_id param at all (not even 0) returned full course data with
   is_enrolled: false and a working sidebar.enrollment.button (label
   "Take this Course", action "take_course", url = permalink) — a genuine
   public preview mode, confirmed separate from the enrollment-gated mode.
   getCourseDetails() in coursesApi.ts now tries with the real userId
   first, and automatically retries without it if that specifically 403s
   — so recommended (not-yet-enrolled) courses open in-app correctly,
   while enrolled courses still get their real personalized progress data
   on the first try. No navigation/screen changes needed elsewhere.
───────────────────────────────────────────────────────────────────────── */
