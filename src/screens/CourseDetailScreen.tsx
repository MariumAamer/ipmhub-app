/* eslint-disable prettier/prettier */
// src/screens/CourseDetailScreen.tsx
//
// Tabs are fully dynamic per course.tabs[] from getCourseDetails() — this
// screen does NOT hardcode a fixed tab list. Different courses can (and do)
// expose different tabs, e.g. course 174238 (PMO Essentials) has Overview/
// Course Content/Certifications/FAQs/About Us/Forums, while "Certified
// Project Management Diploma" has Overview/Modules/Certifications/
// Assessment/Instructors/FAQs/About Us. Both work unmodified.
//
// DATA CONFIDENCE:
//   - Overview header/sidebar/stats, Modules tab (curriculum tree) — fully
//     typed against CONFIRMED Postman responses (getCourseDetails,
//     getCourseActivity). Real navigation, real expand/collapse, real
//     progress.
//   - Everything else a course's tabs[] can point to (Certifications,
//     Assessment, Instructors, FAQs, About Us, and the Overview tab's own
//     "Welcome to the Course / Course Modules / Learning Outcomes /
//     Instructor" block) comes from a per-course, per-tab content endpoint
//     whose RESPONSE SHAPE HAS NOT BEEN CONFIRMED via Postman. Field names
//     below (sections[], faqs[], instructors[], certifications[]) are
//     best-effort guesses at a reasonable shape, clearly marked, and every
//     render path falls back to nothing (not fake content) if a guessed
//     field isn't present. Replace with real types the moment a response
//     is pasted in.

import React, {useState, useEffect, useCallback, useRef} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Linking,
} from 'react-native';
import Svg, {Path, Circle} from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import VideoPlayerModal from '../components/VideoPlayerModal';
import BackButton from '../components/BackButton';
import {
  getCourseDetails,
  getCourseActivity,
  getCourseDetailTabContent,
  getOverviewTabContent,
  getCertificationsTabContent,
  getFaqsTabContent,
  getAboutUsTabContent,
  getAssessmentTabContent,
  getInstructorsTabContent,
  CourseDetailsResponse,
  CourseActivityResponse,
  OverviewTabResponse,
  CertificationsTabResponse,
  FaqsTabResponse,
  AboutUsTabResponse,
  AssessmentTabResponse,
  InstructorItem,
  InstructorsTabResponse,
  CourseLesson,
  CourseTopic,
  CourseQuizStep,
} from '../api/coursesApi';
import {getUserIdFromToken} from '../api/profileApi';
import {parseCourseOverviewHtml, ContentBlock, parseFaqsHtml} from '../utils/parseCourseOverviewHtml';

// ─── Icons (from Figma) ─────────────────────────────────────────────────

// Rebuilt from mask-based SVG (same shape used for the Modules back/next
// pills) as plain fill — see project rule on react-native-svg not
// rendering <mask>.
const SmallChevronLeft = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path
      d="M11.5924 0.587C11.9687 0.953 11.9687 1.547 11.5924 1.913L5.8503 7.5 11.5924 13.087C11.9687 13.453 11.9687 14.046 11.5924 14.412C11.2162 14.779 10.6061 14.779 10.2298 14.412L3.125 7.5 10.2298 0.587C10.6061 0.221 11.2162 0.221 11.5924 0.587Z"
      fill="#192546"
    />
  </Svg>
);
const SmallChevronRight = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path
      d="M3.408 14.413C3.031 14.047 3.031 13.453 3.408 13.087L9.15 7.5 3.408 1.913C3.031 1.547 3.031 0.954 3.408 0.588C3.784 0.221 4.394 0.221 4.77 0.588L11.875 7.5 4.77 14.413C4.394 14.779 3.784 14.779 3.408 14.413Z"
      fill="#192546"
    />
  </Svg>
);

// FAQ accordion indicators — real triangle shapes provided (not mask-based).
// Expanded = points down, white fill (sits on the dark blue header).
// Collapsed = points left, navy fill (sits on the white row).
const FaqTriangleDown = () => (
  <Svg width={8.873} height={6.655} viewBox="0 0 9 7" fill="none">
    <Path
      d="M4.04062 6.44237C4.242 6.72624 4.63107 6.72624 4.83245 6.44237L8.76507 0.898676C9.02373 0.534049 8.78854 0.000473499 8.36916 0.000473499H0.50391C0.0845253 0.000473499 -0.150668 0.534049 0.107994 0.898677L4.04062 6.44237Z"
      fill="#FFFFFF"
    />
  </Svg>
);
const FaqTriangleLeft = () => (
  <Svg width={6.655} height={8.873} viewBox="0 0 7 9" fill="none">
    <Path
      d="M6.44237 4.83243C6.72624 4.63105 6.72624 4.24198 6.44237 4.0406L0.898676 0.107975C0.534049 -0.150687 0.000473499 0.0845051 0.000473499 0.50389V8.36914C0.000473499 8.78852 0.534049 9.02371 0.898677 8.76505L6.44237 4.83243Z"
      fill="#192546"
    />
  </Svg>
);

// List-item bullet — Figma icon (July 2026), replaces the earlier placeholder
// filled circle.
const BulletIcon = () => (
  <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
    <Path
      d="M2.74829 0H10V7.33626C9.97447 7.36694 9.92841 7.3929 9.90009 7.42299C9.64631 7.69242 9.36878 7.93866 9.08885 8.17953C9.00785 8.24922 8.92873 8.33958 8.84677 8.40404C8.39803 8.75697 8.00596 9.17544 7.57081 9.54451C7.53936 9.57118 7.47157 9.59712 7.43222 9.6137L7.43483 6.06021L7.43395 5.38178C7.43264 5.19861 7.41466 4.78377 7.45666 4.63276C7.36968 4.72417 7.29422 4.82865 7.20479 4.91676C7.05122 5.06806 6.91373 5.23537 6.76513 5.39051L2.85612 9.40439C2.76928 9.49285 2.6868 9.57709 2.60624 9.67075C2.54934 9.73689 2.3506 9.98601 2.2826 10C2.14131 9.92762 1.72888 9.48077 1.59088 9.34684L0.800529 8.58287C0.681463 8.46822 0.00802145 7.86195 0 7.76512C0.0501734 7.71762 0.0672748 7.69014 0.107696 7.63695C0.14256 7.59108 0.192014 7.54295 0.231906 7.5002C1.0006 6.67648 1.86939 5.96362 2.63282 5.13526C2.68353 5.08024 2.75964 5.03058 2.81428 4.97799C3.22601 4.60624 3.59263 4.18542 3.99742 3.8059C4.11717 3.69363 4.25434 3.60358 4.3727 3.48925C4.51745 3.34968 4.65902 3.20597 4.79868 3.06114C4.9555 2.89476 5.11869 2.70793 5.31026 2.58217L1.76147 2.5787L0.750068 2.58007C0.671951 2.5801 0.34274 2.58381 0.27586 2.5727C0.253692 2.41277 2.29929 0.529362 2.54502 0.219996C2.59178 0.16113 2.70271 0.0716828 2.74829 0Z"
      fill="#46B0E3"
    />
  </Svg>
);

const CertificateIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M7.667 2.38a1.4 1.4 0 01.328.078l5.772 2.887 1.283.667a.35.35 0 010 .625l-4.05 2.024V10.6a1.4 1.4 0 01-.777 1.257l-3.334 1.583a1.36 1.36 0 01-1.166 0l-3.334-1.583A1.4 1.4 0 011.833 10.6V7.66l-1.1-.55a.35.35 0 010-.625l5.772-2.887A1.4 1.4 0 017.667 2.38zM3.334 7.539v3.069a.75.75 0 00.42.68l3.334 1.583a.75.75 0 00.626 0l3.334-1.583a.75.75 0 00.42-.68V7.539l-4.001 2.003a1.4 1.4 0 01-1.166 0L3.334 7.539z"
      fill="#192546"
    />
  </Svg>
);

const DegreeIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M7.667 2.38a1.4 1.4 0 01.328.078l5.772 2.887 1.283.667a.35.35 0 010 .625l-4.05 2.024V10.6a1.4 1.4 0 01-.777 1.257l-3.334 1.583a1.36 1.36 0 01-1.166 0l-3.334-1.583A1.4 1.4 0 011.833 10.6V7.66l-1.1-.55a.35.35 0 010-.625l5.772-2.887A1.4 1.4 0 017.667 2.38zM3.334 7.539v3.069a.75.75 0 00.42.68l3.334 1.583a.75.75 0 00.626 0l3.334-1.583a.75.75 0 00.42-.68V7.539l-4.001 2.003a1.4 1.4 0 01-1.166 0L3.334 7.539z"
      fill="#192546"
    />
  </Svg>
);

const ClockIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8 1.333A6.667 6.667 0 118 14.667 6.667 6.667 0 018 1.333zm0 1.334a5.333 5.333 0 100 10.666A5.333 5.333 0 008 2.667zm-.667 1.333h1v3.72l2.514 1.451-.5.866-3.014-1.74V4z"
      fill="#192546"
    />
  </Svg>
);

const ModulesIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M15.242 12.115H10.224v-1.002h5.018v1.002z" fill="#0C4D91" />
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M19.208 21.052H5.956c-1.207 0-2.197-.928-2.299-2.11h-.01V4.385a2.51 2.51 0 012.51-2.51h13.05v19.177zm-13.252-3.616a1.307 1.307 0 100 2.613h12.25v-2.613H5.956z"
      fill="#0C4D91"
    />
  </Svg>
);

const TopicsIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.498 11.831a1.36 1.36 0 011.358 1.358v3.024a1.358 1.358 0 01-1.358 1.358H3.115c-.75 0-1.358-.608-1.358-1.358v-3.024a1.36 1.36 0 011.358-1.358h6.383z"
      fill="#0C4D91"
    />
    <Path d="M21.505 17.571H12.607v-1.038h8.898v1.038z" fill="#0C4D91" />
    <Path d="M21.505 15.052H12.607v-1.038h8.898v1.038z" fill="#0C4D91" />
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M19.911 2.761a1.36 1.36 0 011.358 1.358v4.703a1.36 1.36 0 01-1.358 1.359H3.115a1.36 1.36 0 01-1.358-1.359V4.119a1.36 1.36 0 011.358-1.358h16.796z"
      fill="#0C4D91"
    />
  </Svg>
);

// Circle with "?" inside — replaces the plain outlined circle
const QuizzesIcon = () => (
  <View style={{width: 24, height: 24, alignItems: 'center', justifyContent: 'center'}}>
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M8.8 17.1a8.3 8.3 0 100-16.6 8.3 8.3 0 000 16.6z" stroke="#0C4D91" />
    </Svg>
    <Text style={{position: 'absolute', color: '#0C4D91', fontSize: 12, fontWeight: '700'}}>{'?'}</Text>
  </View>
);

// Rebuilt from mask-based SVG — filled checkmark circle for completed steps
const CheckCircleIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx={8} cy={8} r={8} fill="#0C4D91" />
    <Path
      d="M11.1943 5.887C10.9348 5.608 10.5046 5.603 10.24 5.878L7.26 8.974L5.7599 7.416C5.4953 7.141 5.0651 7.145 4.8056 7.425C4.5526 7.698 4.5561 8.131 4.8141 8.399L7.26 10.94L11.1858 6.861C11.4438 6.594 11.4473 6.16 11.1943 5.887Z"
      fill="white"
    />
  </Svg>
);

const EmptyCircleIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8 .667a7.333 7.333 0 110 14.666A7.333 7.333 0 018 .667zM8 1.667a6.333 6.333 0 100 12.666A6.333 6.333 0 008 1.667z"
      fill="#E8E9F1"
    />
  </Svg>
);

const StepListIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path d="M12.839 4.051a.412.412 0 00-.414-.414h-1.658a.412.412 0 00-.414.414v1.658c0 .229.185.414.414.414h1.658a.412.412 0 00.414-.414V4.05zm.83 1.658a1.244 1.244 0 01-1.244 1.243h-1.658a1.244 1.244 0 01-1.244-1.243V4.051c0-.687.557-1.244 1.244-1.244h1.658c.687 0 1.244.557 1.244 1.244v1.658z" fill="#8F9098" />
    <Path d="M7.701 3.056a.414.414 0 010 .829H2.645a.414.414 0 010-.829h5.056z" fill="#8F9098" />
    <Path d="M7.701 6.123a.414.414 0 010 .829H2.645a.414.414 0 010-.829h5.056z" fill="#8F9098" />
    <Path d="M13.088 9.231a.414.414 0 010 .829H2.645a.414.414 0 010-.829h10.443z" fill="#8F9098" />
    <Path d="M13.088 12.215a.414.414 0 010 .828H2.645a.414.414 0 010-.828h10.443z" fill="#8F9098" />
  </Svg>
);

// ─── Progress card (shared: Overview + Modules tab header) ────────────────

const ProgressCard = ({activity}: {activity: CourseActivityResponse}) => {
  const pct = activity.course.progress.percentage;
  return (
    <View style={styles.progressCard}>
      <Text style={styles.progressPercentText}>{`${pct}% Complete`}</Text>
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, {width: `${pct}%`}]} />
      </View>
      {activity.course.activity.last_activity && (
        <Text style={styles.lastActivityText}>
          {`Last activity on ${activity.course.activity.last_activity.display}`}
        </Text>
      )}
    </View>
  );
};

// ─── Modules tab (fully data-backed, confirmed getCourseActivity shape) ───

// CONFIRMED live crash fix (Aug 2026): title fields returned by the
// backend are NOT reliably plain strings. getCourseActivity's
// course.title (and, inconsistently, individual lesson/topic/quiz
// title fields too — this varies per course/backend response, which is
// exactly why this crashed on some courses' modules and not others) can
// come back as WordPress's standard raw/rendered post-title shape
// ({raw: string, rendered: string}) instead. stripEntities() used to call
// .replace() directly on whatever was passed in, assuming it was always a
// string — when a title arrived as an object instead, that .replace()
// threw ("undefined is not a function" / TypeError), crashing this
// screen's Modules tab entirely (and, on iOS specifically, surfacing as a
// hard crash / blank screen rather than a recoverable redbox). This is
// the same class of bug already fixed once in StepContentScreen.tsx (see
// safeTitleText there) — extracting it the same way here so every
// lesson/topic/quiz title on this screen is safe regardless of which
// shape the backend sends for a given course.
const safeTitleText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const obj = value as {rendered?: unknown; raw?: unknown};
    if (typeof obj.rendered === 'string') return obj.rendered;
    if (typeof obj.raw === 'string') return obj.raw;
  }
  return '';
};

// ─── Decode HTML entities ───────────────────────────────────────────────
// This screen pulls text from several different confirmed endpoints
// (getCourseDetails header/sidebar, getCourseActivity lessons/topics/
// quizzes, and the per-tab content endpoints), all backed by the same
// WordPress/LearnDash install that HTML-entity-encodes text everywhere
// else in this app (e.g. "&#038;" for "&", "&#8217;" for a curly
// apostrophe). stripEntities() previously only replaced 3 entities
// (&#8211;, &#038;, &amp;) and was only ever called on title fields —
// every other piece of text on this screen (description snippets, meta
// labels, enrollment status/button labels, stat labels, tab bar labels,
// instructor names/bios, certification/assessment/FAQ text, and the
// generic SectionsRenderer fallback) rendered completely raw. Widened to
// the full entity set already used elsewhere in this project
// (coursesApi.ts/feedApi.ts/etc), including a generic numeric-entity
// fallback, and applied to every user-facing text field below.
const decodeEntities = (text: unknown): string => {
  const s = typeof text === 'string' ? text : safeTitleText(text);
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#034;/g, '"')
    .replace(/&#038;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/&#8230;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
};

const stripEntities = (s: unknown) => decodeEntities(safeTitleText(s));

// Duration was confirmed (via a live crash) to sometimes be an object
// {minutes, display}, not a plain string — this extracts safely rendering
// text regardless of which shape is present.
const getDurationText = (duration: {minutes: number; display: string} | string | null): string | null => {
  if (!duration) return null;
  if (typeof duration === 'string') return duration;
  return duration.display ?? null;
};

const ModuleStepRow = ({
  step,
  kind,
  onPress,
}: {
  step: CourseTopic | CourseQuizStep;
  kind: 'topic' | 'quiz';
  onPress: () => void;
}) => {
  const completed = step.status === 'completed';
  const durationText = getDurationText(step.duration);
  return (
    <TouchableOpacity style={styles.stepRow} onPress={onPress} activeOpacity={0.7}>
      <StepListIcon />
      <Text style={styles.stepTitle} numberOfLines={2}>
        {completed ? (
          <Text style={styles.stepTitleCompleted}>{stripEntities(step.title)}</Text>
        ) : (
          stripEntities(step.title)
        )}
      </Text>
      {/* CONFIRMED bug fix: step.duration can be {minutes, display}, not a
          plain string — rendering it directly crashed the app. Now goes
          through getDurationText(), which handles both shapes safely. */}
      {durationText ? (
        <Text style={[styles.stepDuration, completed && styles.stepDurationCompleted]}>{decodeEntities(durationText)}</Text>
      ) : null}
      {completed ? <CheckCircleIcon /> : <EmptyCircleIcon />}
    </TouchableOpacity>
  );
};

const ModuleRow = ({
  lesson,
  expanded,
  onToggle,
  onStepPress,
}: {
  lesson: CourseLesson;
  expanded: boolean;
  onToggle: () => void;
  onStepPress: (step: CourseTopic | CourseQuizStep, kind: 'topic' | 'quiz') => void;
}) => {
  // Defensive fallback (belt-and-suspenders): coursesApi.ts's
  // getCourseActivity() already normalizes topics/quizzes to real arrays
  // for every lesson (some courses' "activity"-type lessons come back
  // from the backend with these keys missing entirely), but guarding here
  // too means this component stays safe even if it's ever fed data from
  // somewhere that skips that normalization.
  const lessonTopics = lesson.topics ?? [];
  const lessonQuizzes = lesson.quizzes ?? [];
  const hasChildren = lessonTopics.length > 0 || lessonQuizzes.length > 0;
  // Module (lesson) itself has no reliable top-level "completed" status of
  // its own in the confirmed data — so it's derived here from whether
  // every one of its topics AND quizzes is completed, same signal already
  // used per-step below.
  const allModuleSteps = [...lessonTopics, ...lessonQuizzes];
  const moduleCompleted = allModuleSteps.length > 0 && allModuleSteps.every((s) => s.status === 'completed');

  return (
    <View style={styles.moduleBlock}>
      <TouchableOpacity
        style={styles.moduleHeaderRow}
        onPress={hasChildren ? onToggle : undefined}
        activeOpacity={hasChildren ? 0.7 : 1}>
        <View style={{flex: 1}}>
          <Text style={[styles.moduleName, moduleCompleted && styles.moduleNameCompleted]}>
            {stripEntities(lesson.title)}
          </Text>
        </View>
        {lesson.counts?.display ? <Text style={styles.moduleCountText}>{decodeEntities(lesson.counts.display)}</Text> : null}
        {hasChildren ? (
          <View style={expanded ? styles.moduleChevronExpanded : styles.moduleChevronCollapsed}>
            <SmallChevronRight />
          </View>
        ) : (
          lesson.status === 'completed' ? <CheckCircleIcon /> : <EmptyCircleIcon />
        )}
      </TouchableOpacity>

      {expanded && hasChildren && (
        <>
          <View style={styles.moduleContentBar}>
            <Text style={styles.moduleContentLabel}>{'Module Content'}</Text>
            {lesson.progress && (
              <Text style={styles.moduleContentProgress}>{decodeEntities(lesson.progress.display)}</Text>
            )}
          </View>
          {lessonTopics.map((topic) => (
            <ModuleStepRow key={`t-${topic.id}`} step={topic} kind="topic" onPress={() => onStepPress(topic, 'topic')} />
          ))}
          {lessonQuizzes.map((quiz) => (
            <ModuleStepRow key={`q-${quiz.id}`} step={quiz} kind="quiz" onPress={() => onStepPress(quiz, 'quiz')} />
          ))}
        </>
      )}
    </View>
  );
};

const ModulesTab = ({
  courseId,
  courseTitle,
  activity,
  loading,
  navigation,
}: {
  courseId: number;
  courseTitle: string;
  activity: CourseActivityResponse | null;
  loading: boolean;
  navigation: any;
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const toggleModule = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (!activity) return;
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(activity.course.lessons.map((l) => l.id)));
    }
    setAllExpanded((v) => !v);
  };

  const openStep = (step: CourseTopic | CourseQuizStep, kind: 'topic' | 'quiz', lessonId: number, lessonTitle: string) => {
    if (kind === 'quiz') {
      navigation?.navigate?.('Quiz', {courseId, stepId: step.id, courseTitle, lessonTitle});
    } else {
      navigation?.navigate?.('StepContent', {
        courseId,
        stepId: step.id,
        lessonId,
        stepType: kind,
      });
    }
  };

  if (loading) {
    return <ActivityIndicator color="#0C4D91" style={{marginTop: 24}} />;
  }

  if (!activity) {
    // Fetch finished but failed (e.g. 404 on this course/account
    // combination) — was previously indistinguishable from "still
    // loading", leaving this stuck on a spinner forever. Show a real
    // empty state instead.
    return (
      <Text style={styles.emptyStateText}>
        {"Course content couldn't be loaded right now."}
      </Text>
    );
  }

  return (
    <View style={styles.modulesWrap}>
      <View style={styles.expandAllRow}>
        <View style={styles.courseContentPill}>
          <Text style={styles.courseContentPillText}>{'Course Content'}</Text>
        </View>
        <TouchableOpacity style={styles.expandAllBtn} onPress={toggleExpandAll}>
          <Text style={styles.expandAllBtnText}>{allExpanded ? 'Collapse All' : 'Expand All'}</Text>
        </TouchableOpacity>
      </View>

      {activity.course.lessons.map((lesson) => (
        <ModuleRow
          key={lesson.id}
          lesson={lesson}
          expanded={expandedIds.has(lesson.id)}
          onToggle={() => toggleModule(lesson.id)}
          onStepPress={(step, kind) => openStep(step, kind, lesson.id, stripEntities(lesson.title))}
        />
      ))}
    </View>
  );
};

// ─── Generic content-tab renderer (Certifications/Assessment/About Us/
// Overview's own extra sections) — UNCONFIRMED SHAPE, defensive rendering.

interface GuessedSection {
  label?: string;
  body?: string;
  items?: string[]; // rendered as a numbered or bulleted list depending on ordered
  ordered?: boolean;
}
interface GuessedTabContent {
  sections?: GuessedSection[];
}

const PillLabel = ({text}: {text: string}) => (
  <View style={styles.headingTab}>
    <Text style={styles.headingTabText}>{decodeEntities(text)}</Text>
  </View>
);

// Real renderer for the CONFIRMED Overview tab content, via
// parseCourseOverviewHtml. Headings become pill labels (matching the
// "Welcome to the Course" / "Course Modules" / "Learning Outcomes" pill
// treatment already used elsewhere on this screen), paragraphs are plain
// body text, lists render numbered or bulleted per the source ol/ul.
// 'video' blocks (confirmed on About Us — a wp-block-video YouTube embed)
// render as a tappable placeholder that opens the video externally, same
// pattern as StepContentScreen — no video player library is confirmed as
// a project dependency, so nothing is embedded in-app.
//
// FIXED (Aug 2026): video block now opens in-app via VideoPlayerModal
// (onPlayVideo prop) instead of Linking.openURL — the raw player.vimeo.com
// URL 403'd/blocked with a "privacy settings" error when opened bare in an
// external browser tab (no whitelisted origin). See VideoPlayerModal.tsx.
//
// Block text (block.text/items) comes out of parseCourseOverviewHtml(), a
// shared utility whose own entity-decoding hasn't been independently
// verified — decoding again here is a safe no-op if it already decodes
// upstream, and a real fix (same class of bug as everywhere else on this
// screen) if it doesn't.
const ContentBlocksRenderer = ({
  blocks,
  onPlayVideo,
}: {
  blocks: ContentBlock[];
  onPlayVideo: (url: string) => void;
}) => (
  <>
    {blocks.map((block, idx) => {
      if (block.type === 'heading') return <PillLabel key={idx} text={block.text || ''} />;
      if (block.type === 'paragraph') return <Text key={idx} style={styles.bodyText}>{decodeEntities(block.text || '')}</Text>;
      if (block.type === 'list') {
        return (
          <View key={idx} style={{gap: 8}}>
            {block.items?.map((item, itemIdx) =>
              block.ordered ? (
                <Text key={itemIdx} style={styles.bodyText}>{`${itemIdx + 1}. ${decodeEntities(item)}`}</Text>
              ) : (
                <View key={itemIdx} style={styles.bulletRow}>
                  <BulletIcon />
                  <Text style={[styles.bodyText, {flex: 1}]}>{decodeEntities(item)}</Text>
                </View>
              ),
            )}
          </View>
        );
      }
      if (block.type === 'video' && block.videoUrl) {
        return (
          <TouchableOpacity
            key={idx}
            style={styles.videoPlaceholder}
            onPress={() => onPlayVideo(block.videoUrl!)}>
            <Text style={styles.videoPlaceholderText}>{'▶  Play video'}</Text>
          </TouchableOpacity>
        );
      }
      if (block.type === 'image' && block.imageUrl) {
        return (
          <Image
            key={idx}
            source={{uri: block.imageUrl}}
            style={styles.inlineContentImage}
            resizeMode="contain"
          />
        );
      }
      return null;
    })}
  </>
);

const SectionsRenderer = ({content}: {content: GuessedTabContent | null}) => {
  if (!content?.sections?.length) return null;
  return (
    <>
      {content.sections.map((section, idx) => (
        <View key={idx} style={{gap: 12}}>
          {section.label ? <PillLabel text={section.label} /> : null}
          {section.body ? <Text style={styles.bodyText}>{decodeEntities(section.body)}</Text> : null}
          {section.items?.map((item, itemIdx) => (
            <Text key={itemIdx} style={styles.bodyText}>
              {section.ordered ? `${itemIdx + 1}. ${decodeEntities(item)}` : `•  ${decodeEntities(item)}`}
            </Text>
          ))}
        </View>
      ))}
    </>
  );
};

// ─── Instructors tab — CONFIRMED shape: content.{title, items[]}
// {name, designation, image, profile (raw HTML)}. `designation` is the
// "degrees" line (e.g. "PhD, MSc, BA..."). A role title like "Course
// Director" is NOT a separate field — it's an <h3> at the start of some
// instructors' `profile` HTML (only some have one). Extracted as the
// first block if it's a heading; everything else is the bio.

const InstructorRow = ({instructor}: {instructor: InstructorItem}) => {
  const [expanded, setExpanded] = useState(false);
  const blocks = parseCourseOverviewHtml(instructor.profile);
  const hasLeadingRoleTitle = blocks[0]?.type === 'heading';
  const roleTitle = hasLeadingRoleTitle ? blocks[0].text : undefined;
  const bioBlocks = hasLeadingRoleTitle ? blocks.slice(1) : blocks;
  // For the collapsed preview, join paragraph text into one line since
  // numberOfLines truncation needs a single Text, not a list of blocks.
  const bioPreviewText = bioBlocks
    .filter((b) => b.type === 'paragraph')
    .map((b) => b.text)
    .join(' ');

  return (
    <View style={styles.instructorRow}>
      {instructor.image ? (
        <Image source={{uri: instructor.image}} style={styles.instructorImage} />
      ) : (
        <View style={[styles.instructorImage, {backgroundColor: '#E8E9F1'}]} />
      )}
      <View style={{flex: 1}}>
        <Text style={styles.instructorName}>{decodeEntities(instructor.name)}</Text>
        {instructor.designation ? <Text style={styles.instructorDegrees}>{decodeEntities(instructor.designation)}</Text> : null}
        {roleTitle ? <Text style={styles.instructorDesignation}>{decodeEntities(roleTitle)}</Text> : null}
        {bioPreviewText ? (
          <>
            {expanded ? (
              <View style={{marginTop: 4}}>
                {bioBlocks.map((block, idx) => (
                  <ContentBlockInline key={idx} block={block} />
                ))}
              </View>
            ) : (
              <Text style={styles.instructorBio} numberOfLines={2}>{decodeEntities(bioPreviewText)}</Text>
            )}
            <TouchableOpacity onPress={() => setExpanded((v) => !v)}>
              <Text style={styles.readMoreText}>{expanded ? 'Read Less' : 'Read More'}</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </View>
  );
};

// Minimal inline block renderer for expanded instructor bios (paragraph/
// list only — headings inside a bio body are rare and fall back to bold
// text rather than a pill label, since a pill button reads oddly nested
// inside a person's bio).
const ContentBlockInline = ({block}: {block: ContentBlock}) => {
  if (block.type === 'paragraph') return <Text style={styles.instructorBio}>{decodeEntities(block.text || '')}</Text>;
  if (block.type === 'heading') return <Text style={[styles.instructorBio, {fontFamily: 'Runda-Medium'}]}>{decodeEntities(block.text || '')}</Text>;
  if (block.type === 'list') {
    return (
      <View style={{gap: 6}}>
        {block.items?.map((item, idx) =>
          block.ordered ? (
            <Text key={idx} style={styles.instructorBio}>{`${idx + 1}. ${decodeEntities(item)}`}</Text>
          ) : (
            <View key={idx} style={styles.bulletRow}>
              <BulletIcon />
              <Text style={[styles.instructorBio, {flex: 1}]}>{decodeEntities(item)}</Text>
            </View>
          ),
        )}
      </View>
    );
  }
  return null;
};

const InstructorsTab = ({content}: {content: InstructorsTabResponse['content'] | null}) => {
  if (!content?.items?.length) {
    return <Text style={styles.emptyStateText}>{'No instructor information available for this course yet.'}</Text>;
  }
  return (
    <View style={styles.instructorsCard}>
      {content.title ? <PillLabel text={content.title} /> : null}
      {content.items.map((instructor, idx) => (
        <InstructorRow key={idx} instructor={instructor} />
      ))}
    </View>
  );
};

// ─── FAQs tab — shape guessed as { faqs: [{question, answer}] } ───────────

interface GuessedFaq {
  question: string;
  answer: string;
}

const FaqsTab = ({content, pillLabel}: {content: {faqs?: GuessedFaq[]} | null; pillLabel: string}) => {
  const [openIdx, setOpenIdx] = useState(0);
  if (!content?.faqs?.length) {
    return <Text style={styles.emptyStateText}>{'No FAQs available for this course yet.'}</Text>;
  }
  return (
    <View style={styles.faqsCard}>
      <PillLabel text={pillLabel} />
      {content.faqs.map((faq, idx) => {
        const isOpen = openIdx === idx;
        return (
          <View key={idx}>
            <TouchableOpacity
              style={isOpen ? styles.faqHeaderOpen : styles.faqHeaderClosed}
              onPress={() => setOpenIdx(isOpen ? -1 : idx)}
              activeOpacity={0.8}>
              <View style={styles.faqTriangleWrap}>
                {isOpen ? <FaqTriangleDown /> : <FaqTriangleLeft />}
              </View>
              {/* faq.question/answer come from parseFaqsHtml(), the same
                  shared HTML-parsing utility used for headings/paragraphs
                  elsewhere on this screen — decoded here for the same
                  reason (unverified whether that utility decodes entities
                  itself). */}
              <Text style={isOpen ? styles.faqQuestionOpen : styles.faqQuestionClosed}>{decodeEntities(faq.question)}</Text>
            </TouchableOpacity>
            {isOpen && (
              <View style={styles.faqAnswerWrap}>
                <Text style={styles.faqAnswerText}>{decodeEntities(faq.answer)}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

// ─── Certifications tab — CONFIRMED shape: content.items[]
// {image, title, description, description_html}

const CertificationsTab = ({content}: {content: CertificationsTabResponse['content'] | null}) => {
  if (!content?.items?.length) {
    return <Text style={styles.emptyStateText}>{'No certification details available for this course yet.'}</Text>;
  }
  return (
    <View style={styles.certsCard}>
      {content.items.map((cert, idx) => (
        <View key={idx} style={styles.certRow}>
          {cert.image ? (
            <Image source={{uri: cert.image}} style={styles.certImage} resizeMode="contain" />
          ) : (
            <View style={[styles.certImage, {backgroundColor: '#E8E9F1'}]} />
          )}
          <View style={{flex: 1}}>
            <Text style={styles.certTitle}>{decodeEntities(cert.title)}</Text>
            {/* description_html is plain text in this confirmed sample
                (no actual tags), rendering as-is; revisit with a real
                HTML renderer if a future course's value does contain
                markup. */}
            <Text style={styles.certInfo}>{decodeEntities(cert.description)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

// ─── Assessment tab — CONFIRMED shape: content.items[]
// {title, description (raw HTML), description_html}. Same visual pattern
// as Overview: each item's title is a pill label, description is parsed
// into headings/paragraphs/lists via parseCourseOverviewHtml.

const AssessmentTab = ({
  content,
  onPlayVideo,
}: {
  content: AssessmentTabResponse['content'] | null;
  onPlayVideo: (url: string) => void;
}) => {
  if (!content?.items?.length) {
    return <Text style={styles.emptyStateText}>{'No assessment details available for this course yet.'}</Text>;
  }
  return (
    <View style={styles.descriptionCard}>
      {content.items.map((item, idx) => (
        <View key={idx} style={{gap: 12}}>
          <PillLabel text={item.title} />
          <ContentBlocksRenderer blocks={parseCourseOverviewHtml(item.description)} onPlayVideo={onPlayVideo} />
        </View>
      ))}
    </View>
  );
};

// ─── Overview stat boxes ───────────────────────────────────────────────

const StatBox = ({icon, count, label}: {icon: React.ReactNode; count: number; label: string}) => (
  <View style={styles.statBox}>
    {icon}
    <Text style={styles.statCount}>{count}</Text>
    <Text style={styles.statLabel}>{decodeEntities(label)}</Text>
  </View>
);

// ─── Screen ─────────────────────────────────────────────────────────────

const CourseDetailScreen = ({route, navigation}: any) => {
  const courseId: number = route?.params?.courseId;
  // Fallback data (title/tagline/url) — passed only when navigating from a
  // static recommendation card whose live courseId may not resolve for
  // the current account (confirmed: 403/404 depending on account/course).
  // Used to render something useful in-app instead of a dead-end message
  // when the live fetch fails.
  const fallbackTitle: string | undefined = route?.params?.fallbackTitle;
  const fallbackTagline: string | undefined = route?.params?.fallbackTagline;
  const fallbackUrl: string | undefined = route?.params?.fallbackUrl;
  const [userId, setUserId] = useState<number | null>(null);
  const [details, setDetails] = useState<CourseDetailsResponse | null>(null);
  const [activity, setActivity] = useState<CourseActivityResponse | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  // BUG FIX (critical — was causing the screen to feel "stuck for
  // minutes"): every fetch effect below used to guard against re-fetching
  // by checking `if (content) return`. If a request FAILED and returned
  // null, that guard never blocked anything — null is falsy, so the
  // effect kept re-firing on every render, hammering the API in an
  // infinite loop. These *Attempted refs track "did we try" separately
  // from "did we get data back", so a failed fetch is tried exactly once,
  // not forever. (activityAttempted removed — activity now refetches on
  // every focus instead of once-per-course, see fetchActivity above.)
  const overviewAttempted = useRef(false);
  const certificationsAttempted = useRef(false);
  const faqsAttempted = useRef(false);
  const aboutUsAttempted = useRef(false);
  const assessmentAttempted = useRef(false);
  const instructorsAttempted = useRef(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const scrollViewRef = useRef<ScrollView>(null);
  // Switching tabs alone doesn't move the scroll position — since the
  // persistent header (title/logos/image/CTA/stats/progress) is tall,
  // the new tab's content renders far below the fold and it can look like
  // nothing happened unless the person manually scrolls all the way down.
  // Scroll back to top on every tab change so the switch is obvious.
  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);
    scrollViewRef.current?.scrollTo({y: 0, animated: true});
  };
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Generic content-tab cache: {tabId: fetchedContent} — for tabs whose
  // shape is still UNCONFIRMED (certifications, faqs, about_us, assessment,
  // instructors). Overview has its own dedicated typed state below since
  // its shape IS confirmed.
  const [tabContentCache, setTabContentCache] = useState<Record<string, any>>({});
  const [tabContentLoading, setTabContentLoading] = useState<Record<string, boolean>>({});
  const tabContentAttempted = useRef<Record<string, boolean>>({});

  const [overviewContent, setOverviewContent] = useState<OverviewTabResponse | null>(null);
  const [overviewContentLoading, setOverviewContentLoading] = useState(false);
  const [certificationsContent, setCertificationsContent] = useState<CertificationsTabResponse | null>(null);
  const [certificationsLoading, setCertificationsLoading] = useState(false);
  const [faqsContent, setFaqsContent] = useState<FaqsTabResponse | null>(null);
  const [faqsLoading, setFaqsLoading] = useState(false);
  const [aboutUsContent, setAboutUsContent] = useState<AboutUsTabResponse | null>(null);
  const [aboutUsLoading, setAboutUsLoading] = useState(false);
  const [assessmentContent, setAssessmentContent] = useState<AssessmentTabResponse | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [instructorsContent, setInstructorsContent] = useState<InstructorsTabResponse | null>(null);
  const [instructorsLoading, setInstructorsLoading] = useState(false);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);

  // Reset everything when courseId actually changes. Without this, if the
  // same CourseDetailScreen instance ever gets reused for a second course
  // (e.g. navigating back to My Courses and into a different course
  // without this screen fully unmounting), the *Attempted refs from the
  // FIRST course would stay true forever, silently blocking every fetch
  // for the second course — including Assessment/Instructors, which would
  // look like "this course doesn't have those tabs" when really they just
  // never got fetched. This is the most likely explanation for tabs
  // appearing to be missing on a course confirmed via Postman to have them.
  const prevCourseIdRef = useRef<number | undefined>(courseId);
  useEffect(() => {
    if (prevCourseIdRef.current === courseId) return;
    prevCourseIdRef.current = courseId;

    setDetails(null);
    setActivity(null);
    setActivityLoading(false);

    setActiveTab('overview');

    setTabContentCache({});
    setTabContentLoading({});
    tabContentAttempted.current = {};

    setOverviewContent(null);
    setOverviewContentLoading(false);
    overviewAttempted.current = false;

    setCertificationsContent(null);
    setCertificationsLoading(false);
    certificationsAttempted.current = false;

    setFaqsContent(null);
    setFaqsLoading(false);
    faqsAttempted.current = false;

    setAboutUsContent(null);
    setAboutUsLoading(false);
    aboutUsAttempted.current = false;

    setAssessmentContent(null);
    setAssessmentLoading(false);
    assessmentAttempted.current = false;

    setInstructorsContent(null);
    setInstructorsLoading(false);
    instructorsAttempted.current = false;
  }, [courseId]);

  // Extracted so it can run both on initial mount AND every time this
  // screen regains focus (see useFocusEffect below). Needed for course
  // completion: sidebar.enrollment.status.label / button.label are the
  // backend's own authoritative fields — they already say "Completed"
  // once the last step is marked done via markStepComplete on
  // StepContentScreen. We don't compute "completed" ourselves; we just
  // need to actually re-fetch when coming back to this screen instead of
  // showing whatever was loaded before the user finished the course.
  // Returns the resolved uid so fetchActivity below can use it directly
  // instead of waiting on the async setUserId state update to propagate
  // (avoids a stale/race-prone read of `userId` on the same focus pass).
  const fetchCourseDetails = useCallback(async (): Promise<number | null> => {
    if (!courseId) {
      setLoading(false);
      return null;
    }
    setLoading(true);
    const uid = await getUserIdFromToken();
    setUserId(uid);
    // userId is optional on getCourseDetails now — passing undefined
    // (not 0) when logged out routes straight to the confirmed public
    // preview mode. When logged in, it tries with the real uid first
    // and self-heals to preview mode on a 403 (not enrolled in this
    // course) — see coursesApi.ts for details.
    const detailsRes = await getCourseDetails(courseId, uid ?? undefined);
    setDetails(detailsRes);
    setLoading(false);
    return uid;
  }, [courseId]);

  // Progress + curriculum (Overview progress card, Modules tab
  // checkmarks). Previously fetched only once per courseId (guarded by
  // activityAttempted), which is why the Modules tab kept showing stale
  // checkmarks/progress after marking a step complete on StepContentScreen
  // and navigating back. Now refetches on every focus, same as details.
  const fetchActivity = useCallback(
    async (uid: number | null) => {
      if (!courseId || !uid) return;
      setActivityLoading(true);
      const res = await getCourseActivity(courseId, uid);
      setActivity(res);
      setActivityLoading(false);
    },
    [courseId],
  );

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const uid = await fetchCourseDetails();
        await fetchActivity(uid);
      })();
    }, [fetchCourseDetails, fetchActivity]),
  );

  const fetchTabContent = useCallback(
    (tabId: string, endpoint: string | null) => {
      if (!endpoint || tabContentAttempted.current[tabId]) return;
      tabContentAttempted.current[tabId] = true;
      setTabContentLoading((prev) => ({...prev, [tabId]: true}));
      getCourseDetailTabContent(endpoint, userId || 0).then((res) => {
        setTabContentCache((prev) => ({...prev, [tabId]: res}));
        setTabContentLoading((prev) => ({...prev, [tabId]: false}));
      });
    },
    [userId],
  );

  // Fetch content for the active tab if it's a "content" type tab that
  // doesn't have a dedicated confirmed data source (overview, modules,
  // and now certifications all have their own typed fetch paths).
  // NOTE: this hook must run on every render regardless of loading state
  // (Rules of Hooks — no hooks after early returns), so it guards
  // internally on `details` being loaded rather than being skipped by an
  // early return above it.
  useEffect(() => {
    if (!details) return;
    const tabs = details.course.tabs;
    const activeTabMeta = tabs.find((t) => t.id === activeTab);
    if (
      activeTabMeta &&
      activeTabMeta.type === 'content' &&
      activeTabMeta.id !== 'overview' &&
      activeTabMeta.id !== 'certifications' &&
      activeTabMeta.id !== 'faqs' &&
      activeTabMeta.id !== 'about_us' &&
      activeTabMeta.id !== 'assessment' &&
      activeTabMeta.id !== 'instructors'
    ) {
      fetchTabContent(activeTabMeta.id, activeTabMeta.endpoint);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, details]);

  // Overview's supplementary content (About the Course / Course Modules /
  // Learning Outcomes) — CONFIRMED shape, fetched proactively since it
  // renders inline on the Overview tab.
  useEffect(() => {
    if (!details || overviewAttempted.current) return;
    const overviewTabMeta = details.course.tabs.find((t) => t.id === 'overview');
    if (!overviewTabMeta?.endpoint) return;
    overviewAttempted.current = true;
    setOverviewContentLoading(true);
    getOverviewTabContent(overviewTabMeta.endpoint, userId || 0).then((res) => {
      setOverviewContent(res);
      setOverviewContentLoading(false);
    });
  }, [details, userId]);

  // Certifications tab — CONFIRMED shape, fetched lazily when that tab
  // becomes active.
  useEffect(() => {
    if (activeTab !== 'certifications' || !details || certificationsAttempted.current) return;
    const certTabMeta = details.course.tabs.find((t) => t.id === 'certifications');
    if (!certTabMeta?.endpoint) return;
    certificationsAttempted.current = true;
    setCertificationsLoading(true);
    getCertificationsTabContent(certTabMeta.endpoint, userId || 0).then((res) => {
      setCertificationsContent(res);
      setCertificationsLoading(false);
    });
  }, [activeTab, details, userId]);

  // FAQs tab — CONFIRMED shape (raw HTML accordion blob), fetched lazily
  // when that tab becomes active.
  useEffect(() => {
    if (activeTab !== 'faqs' || !details || faqsAttempted.current) return;
    const faqsTabMeta = details.course.tabs.find((t) => t.id === 'faqs');
    if (!faqsTabMeta?.endpoint) return;
    faqsAttempted.current = true;
    setFaqsLoading(true);
    getFaqsTabContent(faqsTabMeta.endpoint, userId || 0).then((res) => {
      setFaqsContent(res);
      setFaqsLoading(false);
    });
  }, [activeTab, details, userId]);

  // About Us tab — CONFIRMED shape (raw HTML, possibly with an embedded
  // video), fetched lazily when that tab becomes active.
  useEffect(() => {
    if (activeTab !== 'about_us' || !details || aboutUsAttempted.current) return;
    const aboutUsTabMeta = details.course.tabs.find((t) => t.id === 'about_us');
    if (!aboutUsTabMeta?.endpoint) return;
    aboutUsAttempted.current = true;
    setAboutUsLoading(true);
    getAboutUsTabContent(aboutUsTabMeta.endpoint, userId || 0).then((res) => {
      setAboutUsContent(res);
      setAboutUsLoading(false);
    });
  }, [activeTab, details, userId]);

  // Assessment tab — CONFIRMED shape, fetched lazily when that tab
  // becomes active.
  useEffect(() => {
    if (activeTab !== 'assessment' || !details || assessmentAttempted.current) return;
    const assessmentTabMeta = details.course.tabs.find((t) => t.id === 'assessment');
    if (!assessmentTabMeta?.endpoint) return;
    assessmentAttempted.current = true;
    setAssessmentLoading(true);
    getAssessmentTabContent(assessmentTabMeta.endpoint, userId || 0).then((res) => {
      setAssessmentContent(res);
      setAssessmentLoading(false);
    });
  }, [activeTab, details, userId]);

  // Instructors tab — CONFIRMED shape, fetched lazily when that tab
  // becomes active.
  useEffect(() => {
    if (activeTab !== 'instructors' || !details || instructorsAttempted.current) return;
    const instructorsTabMeta = details.course.tabs.find((t) => t.id === 'instructors');
    if (!instructorsTabMeta?.endpoint) return;
    instructorsAttempted.current = true;
    setInstructorsLoading(true);
    getInstructorsTabContent(instructorsTabMeta.endpoint, userId || 0).then((res) => {
      setInstructorsContent(res);
      setInstructorsLoading(false);
    });
  }, [activeTab, details, userId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#0C4D91" style={{marginTop: 60}} />
      </SafeAreaView>
    );
  }

  if (!details) {
    // Live fetch failed (confirmed: can be a 403 or 404 depending on the
    // course/account combination — access appears per-account/enrollment-
    // dependent even for not-yet-enrolled recommended courses). Rather
    // than a dead-end message, show whatever static data we have (only
    // present when navigated here from a recommendation card) so the
    // person still sees something useful in-app. Does NOT auto-redirect
    // to the browser — that's an explicit tap only, not a fallback.
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.backRow}>
          <BackButton onPress={() => navigation?.goBack?.()} />
        </View>
        <View style={{padding: 16, gap: 16}}>
          {fallbackTitle ? (
            <>
              <Text style={styles.courseTitle}>{decodeEntities(fallbackTitle)}</Text>
              {fallbackTagline ? <Text style={styles.descriptionText}>{decodeEntities(fallbackTagline)}</Text> : null}
              <Text style={styles.emptyStateText}>
                {"We couldn't load full details for this course on your account right now."}
              </Text>
              {fallbackUrl ? (
                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={() => Linking.openURL(fallbackUrl).catch(() => {})}>
                  <Text style={styles.ctaButtonText}>{'View on Website'}</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <Text style={styles.emptyText}>{'Course not found.'}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const {course} = details;
  const {header, sidebar, tabs} = course;

  const contentTabs = tabs.filter((t) => t.type !== 'link'); // Forums excluded — no in-app forums view
  const activeTabMeta = tabs.find((t) => t.id === activeTab);

  const renderActiveTabContent = () => {
    if (activeTab === 'overview') return null; // rendered inline below, has its own layout
    if (activeTab === 'modules') {
      return (
        <ModulesTab
          courseId={courseId}
          courseTitle={stripEntities(course.title)}
          activity={activity}
          loading={activityLoading}
          navigation={navigation}
        />
      );
    }
    if (activeTab === 'certifications') {
      if (certificationsLoading) return <ActivityIndicator color="#0C4D91" style={{marginTop: 24}} />;
      return <CertificationsTab content={certificationsContent?.content ?? null} />;
    }
    if (activeTab === 'faqs') {
      if (faqsLoading) return <ActivityIndicator color="#0C4D91" style={{marginTop: 24}} />;
      const parsed = faqsContent?.content?.html ? parseFaqsHtml(faqsContent.content.html) : null;
      return (
        <FaqsTab
          content={parsed ? {faqs: parsed.faqs} : null}
          pillLabel={parsed?.heading || `FAQs`}
        />
      );
    }

    if (activeTab === 'about_us') {
      if (aboutUsLoading) return <ActivityIndicator color="#0C4D91" style={{marginTop: 24}} />;
      const aboutBlocks = aboutUsContent?.content?.description
        ? parseCourseOverviewHtml(aboutUsContent.content.description)
        : [];
      if (!aboutBlocks.length) {
        return <Text style={styles.emptyStateText}>{'No "About Us" content available yet for this course.'}</Text>;
      }
      return (
        <View style={styles.aboutUsCard}>
          <ContentBlocksRenderer blocks={aboutBlocks} onPlayVideo={setVideoModalUrl} />
        </View>
      );
    }

    if (activeTab === 'assessment') {
      if (assessmentLoading) return <ActivityIndicator color="#0C4D91" style={{marginTop: 24}} />;
      return (
        <View style={{padding: 16}}>
          <AssessmentTab content={assessmentContent?.content ?? null} onPlayVideo={setVideoModalUrl} />
        </View>
      );
    }

    if (activeTab === 'instructors') {
      if (instructorsLoading) return <ActivityIndicator color="#0C4D91" style={{marginTop: 24}} />;
      return (
        <View style={{padding: 16}}>
          <InstructorsTab content={instructorsContent?.content ?? null} />
        </View>
      );
    }

    const content = tabContentCache[activeTab];
    const isLoading = tabContentLoading[activeTab];
    if (isLoading) return <ActivityIndicator color="#0C4D91" style={{marginTop: 24}} />;

    // any other content tab (unknown to this course set so far) falls
    // back to the generic sections renderer (still a guess — see notes at
    // bottom of file).
    return (
      <View style={{padding: 16, gap: 16}}>
        <SectionsRenderer content={content} />
        {!content?.sections?.length && (
          <Text style={styles.emptyStateText}>
            {`No content available yet for "${activeTabMeta?.label}". Endpoint: ${activeTabMeta?.endpoint}`}
          </Text>
        )}
      </View>
    );
  };

  return (
    <>
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBarScroll}>
        {contentTabs.map((t) => (
          <TouchableOpacity key={t.id} style={styles.tabBarItem} onPress={() => handleTabPress(t.id)}>
            <Text style={[styles.tabBarText, activeTab === t.id && styles.tabBarTextActive]}>{decodeEntities(t.label)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Back + self-paced row */}
      <View style={styles.backRow}>
        <BackButton onPress={() => navigation?.goBack?.()} />
        {header.categories.length > 0 && (
          <View style={styles.selfPacedPill}>
            <Text style={styles.selfPacedText}>{decodeEntities(header.categories[0].name)}</Text>
          </View>
        )}
      </View>

      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false}>
        {/* Persistent across every tab: title + logos ONLY. Description
            and meta rows (certificate/hours/weeks) are Overview-only —
            other tabs stop here and go straight to the Continue button +
            progress card. Confirmed: these were showing on every tab
            (Modules, Certifications, etc.) when they should only show on
            Overview — fixed. */}
        <LinearGradient
          colors={['#BEE6F9', 'rgba(235,249,255,0.26)']}
          start={{x: 0, y: 1}}
          end={{x: 0.18, y: 0}}
          style={styles.infoCard}>
          <Text style={styles.courseTitle}>{stripEntities(course.title)}</Text>

          {header.certification_logos.length > 0 && (
            <View style={styles.logoRow}>
              {header.certification_logos.map((logo, idx) => (
                <Image key={idx} source={{uri: logo.url}} style={styles.logoImg} resizeMode="contain" />
              ))}
            </View>
          )}

          {activeTab === 'overview' && (
            <>
              <Text style={styles.descriptionText}>{decodeEntities(header.about_snippet)}</Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <CertificateIcon />
                  <Text style={styles.metaText}>{decodeEntities(header.meta.certificate_name)}</Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <ClockIcon />
                  <Text style={styles.metaText}>{decodeEntities(header.meta.learning_hours)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <DegreeIcon />
                  <Text style={styles.metaText}>{decodeEntities(header.meta.access_period)}</Text>
                </View>
              </View>
            </>
          )}
        </LinearGradient>

        {activeTab === 'overview' && (
          <>
            {/* Image — Overview only */}
            <View style={styles.picFrame}>
              <Image source={{uri: header.featured_image}} style={styles.featuredImage} resizeMode="cover" />
            </View>

            {/* Avatar stack + status — Overview only. NOTE: no avatar
                IMAGES are rendered — sidebar.enrolled_count is just a
                number (181 in the confirmed sample), there's no list of
                user photos in the API response, so showing fake circles
                here would be invented data. Only the real status label
                (sidebar.enrollment.status.label, e.g. "In Progress" /
                "Not Started") is shown. */}
            <View style={styles.statusRow}>
              <Text style={styles.statusText}>{decodeEntities(sidebar.enrollment.status.label)}</Text>
            </View>
          </>
        )}

        <View style={styles.ctaFrame}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => {
              if (sidebar.enrollment.is_enrolled) {
                // Enrolled: jump into the curriculum in-app rather than
                // out to the website — matches "Continue" opening the
                // same Course Detail screen's Modules tab.
                handleTabPress('modules');
              } else {
                // Use the button's own url, not course.permalink — this
                // is the field the API explicitly built for the
                // "take_course" action (action: "take_course", url: ...).
                // Currently identical to permalink for every course
                // tested, but reading the correct field means this stays
                // right if that ever changes (e.g. if a direct
                // checkout/cart link gets added here later).
                Linking.openURL(sidebar.enrollment.button.url).catch((err) =>
                  console.error('[CourseDetailScreen] CTA', err),
                );
              }
            }}>
            <Text style={styles.ctaButtonText}>{decodeEntities(sidebar.enrollment.button.label)}</Text>
          </TouchableOpacity>

          {header.meta.price_type !== 'closed' && !sidebar.enrollment.is_enrolled && (
            <Text style={styles.priceText}>{decodeEntities(header.meta.price)}</Text>
          )}

          {activeTab === 'overview' && (
            <>
              <Text style={styles.courseIncludesLabel}>{decodeEntities(sidebar.course_includes.title)}</Text>
              <View style={styles.statsRow}>
                <StatBox icon={<ModulesIcon />} count={sidebar.course_includes.totals.modules} label={sidebar.course_includes.totals.labels.modules} />
                <StatBox icon={<TopicsIcon />} count={sidebar.course_includes.totals.topics} label={sidebar.course_includes.totals.labels.topics} />
                <StatBox icon={<QuizzesIcon />} count={sidebar.course_includes.totals.quizzes} label={sidebar.course_includes.totals.labels.quizzes} />
              </View>
            </>
          )}

          {/* Real progress card — only shown once enrolled AND activity
              has loaded (confirmed data, not guessed). Persists across
              every tab. */}
          {sidebar.enrollment.is_enrolled && activity && (
            <ProgressCard activity={activity} />
          )}
        </View>

        {activeTab === 'overview' && (
          <>
            {/* Overview's supplementary content — ONE unified card
                (previously split across multiple separate cards — merged
                per spec). Author/instructor block renders FIRST (photo +
                name above other info, per explicit correction), THEN the
                parsed course_overview HTML blocks (About the Course /
                Course Modules / Learning Outcomes). Previously this was
                reversed — content first, author block last. */}
            {overviewContentLoading && <ActivityIndicator color="#0C4D91" style={{marginTop: 16}} />}
            {(overviewContent?.content?.course_overview || overviewContent?.content?.author?.description) ? (
              <View style={styles.unifiedOverviewCard}>
                {overviewContent?.content?.author?.description ? (
                  <View style={styles.instructorRow}>
                    {overviewContent.content.author.image ? (
                      <Image source={{uri: overviewContent.content.author.image}} style={styles.overviewInstructorImage} />
                    ) : (
                      <View style={[styles.overviewInstructorImage, {backgroundColor: '#E8E9F1'}]} />
                    )}
                    <View style={{flex: 1}}>
                      {/* CONFIRMED bug fix: author.description is raw WordPress
                          HTML (e.g. "<h2>Andrew Bell</h2><p>My name is...</p>"),
                          not plain text — dumping it straight into <Text>
                          rendered the literal tag characters on screen since
                          RN's <Text> doesn't parse HTML. Now parsed the same
                          way as the Instructors tab: the leading heading (the
                          instructor's name) renders bold, everything else
                          renders as normal body blocks. */}
                      {(() => {
                        const authorBlocks = parseCourseOverviewHtml(overviewContent.content.author.description);
                        const hasLeadingName = authorBlocks[0]?.type === 'heading';
                        const authorName = hasLeadingName ? authorBlocks[0].text : undefined;
                        const authorBodyBlocks = hasLeadingName ? authorBlocks.slice(1) : authorBlocks;
                        return (
                          <>
                            {authorName ? <Text style={styles.instructorName}>{decodeEntities(authorName)}</Text> : null}
                            {authorBodyBlocks.map((block, idx) => (
                              <ContentBlockInline key={idx} block={block} />
                            ))}
                          </>
                        );
                      })()}
                    </View>
                  </View>
                ) : null}
                {overviewContent?.content?.course_overview ? (
                  <ContentBlocksRenderer blocks={parseCourseOverviewHtml(overviewContent.content.course_overview)} onPlayVideo={setVideoModalUrl} />
                ) : null}
              </View>
            ) : null}
          </>
        )}

        {activeTab !== 'overview' && renderActiveTabContent()}
      </ScrollView>


      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </SafeAreaView>
    <VideoPlayerModal
      visible={!!videoModalUrl}
      videoUrl={videoModalUrl}
      onClose={() => setVideoModalUrl(null)}
    />
    </>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  emptyText: {color: '#8F9098', fontFamily: 'Runda-Normal', fontSize: 14, textAlign: 'center', marginTop: 40},
  emptyStateText: {color: '#8F9098', fontFamily: 'Runda-Normal', fontSize: 13, lineHeight: 18, padding: 16},
  bodyText: {color: '#192546', fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16},

  tabBarScroll: {height: 45, paddingHorizontal: 16, backgroundColor: '#FFFFFF'},
  tabBarItem: {marginRight: 12, justifyContent: 'center'},
  tabBarText: {color: '#8F9098', fontFamily: 'Runda-Medium', fontSize: 14, lineHeight: 18},
  tabBarTextActive: {
    color: '#192546',
    textDecorationLine: 'underline',
    textDecorationColor: '#084D92',
    textDecorationStyle: 'solid',
    // NOTE: React Native's Text style has no equivalent to CSS
    // text-decoration-thickness/text-underline-offset — the spec's 18%
    // thickness / 100% offset can't be replicated on this platform, this
    // is the closest achievable with the native underline.
  },

  backRow: {flexDirection: 'row', width: '100%', paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'space-between'},
  selfPacedPill: {paddingVertical: 9, paddingHorizontal: 12, borderRadius: 5, backgroundColor: '#EEF7FC'},
  selfPacedText: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 12},

  infoCard: {paddingVertical: 24, paddingHorizontal: 16, gap: 24, alignSelf: 'stretch'},
  courseTitle: {color: '#192647', fontFamily: 'Runda-Bold', fontSize: 18, letterSpacing: 0.09},
  logoRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  logoImg: {width: 111.702, aspectRatio: 101 / 36, alignSelf: 'stretch'},
  descriptionText: {color: '#192647', fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16},
  metaRow: {flexDirection: 'row', gap: 24},
  metaItem: {flexDirection: 'row', alignItems: 'center', gap: 6},
  metaText: {color: '#192546', fontFamily: 'Runda-Normal', fontSize: 12},

  picFrame: {height: 264, paddingHorizontal: 16, paddingTop: 24, alignItems: 'center'},
  featuredImage: {width: '100%', height: '100%', borderRadius: 8, backgroundColor: '#EEF7FC'},

  // Avatar-stack/status area — Overview only. Avatar images themselves are
  // NOT rendered (see comment at the JSX call site — no photo data exists
  // in the API), only the real status label.
  statusRow: {height: 35, alignItems: 'center', justifyContent: 'center', paddingTop: 8},
  statusText: {color: '#192546', textAlign: 'center', fontFamily: 'Runda-Medium', fontSize: 16, lineHeight: 20, letterSpacing: 0.08},

  ctaFrame: {paddingHorizontal: 24, alignItems: 'center', gap: 16, paddingBottom: 24, paddingTop: 16},
  ctaButton: {height: 40, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch', borderRadius: 100, backgroundColor: '#0C4D91'},
  ctaButtonText: {color: '#FFFFFF', fontFamily: 'Runda-Medium', fontSize: 14},
  priceText: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 16, letterSpacing: 0.08},
  courseIncludesLabel: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 16, letterSpacing: 0.08},
  statsRow: {flexDirection: 'row', gap: 8, alignSelf: 'stretch'},
  statBox: {flex: 1, paddingVertical: 10, alignItems: 'center', gap: 4, borderRadius: 5, backgroundColor: '#E8E9F1'},
  statCount: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 12},
  statLabel: {color: '#46B0E3', fontFamily: 'Runda-Medium', fontSize: 12},

  // Progress card — real data (getCourseActivity)
  progressCard: {
    padding: 16,
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
    alignSelf: 'stretch',
    borderRadius: 8.201,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
  },
  progressPercentText: {alignSelf: 'flex-start', color: '#0C4D91', fontFamily: 'Runda-Medium', fontSize: 14},
  progressBarTrack: {height: 10, alignSelf: 'stretch', borderRadius: 20, backgroundColor: '#E8E9F1', marginVertical: 8, overflow: 'hidden'},
  progressBarFill: {height: 10, borderTopRightRadius: 20, borderBottomRightRadius: 20, backgroundColor: '#46B0E3'},
  lastActivityText: {alignSelf: 'flex-start', color: '#8F9098', fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16},

  // Unified Overview card — merges what used to be 2-3 separate cards
  // (About This Course / parsed content / author) into ONE, per spec.
  unifiedOverviewCard: {
    width: 358,
    alignSelf: 'center',
    marginTop: 24,
    padding: 24,
    gap: 16,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
  },
  bulletRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 8},
  faqTriangleWrap: {width: 15, height: 15, alignItems: 'center', justifyContent: 'center'},
  aboutUsCard: {
    width: 358,
    alignSelf: 'center',
    marginTop: 24,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },

  descriptionCard: {
    width: 358,
    alignSelf: 'center',
    marginTop: 24,
    padding: 24,
    gap: 16,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
  },
  headingTab: {alignSelf: 'flex-start', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 5, backgroundColor: '#EEF7FC'},
  headingTabText: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 12},
  descriptionCardText: {color: '#192546', fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16},

  overviewInstructorImage: {width: 65, height: 65, borderRadius: 100, borderWidth: 2, borderColor: '#0C4D91'},

  // Modules tab
  modulesWrap: {padding: 16, gap: 16},
  expandAllRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  courseContentPill: {paddingVertical: 9, paddingHorizontal: 12, borderRadius: 5, backgroundColor: '#EEF7FC'},
  courseContentPillText: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 12},
  expandAllBtn: {paddingVertical: 9, paddingHorizontal: 12, borderRadius: 5, backgroundColor: '#0C4D91', flexDirection: 'row', alignItems: 'center', gap: 6},
  expandAllBtnText: {color: '#FFFFFF', fontFamily: 'Runda-Medium', fontSize: 12},

  moduleBlock: {borderRadius: 5, overflow: 'hidden', backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: {width: 0, height: 0}},
  moduleHeaderRow: {flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12},
  moduleName: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 12},
  moduleCountText: {color: '#192546', textAlign: 'right', fontFamily: 'Runda-Medium', fontSize: 10, lineHeight: 14},
  moduleChevronCollapsed: {width: 16, height: 16, alignItems: 'center', justifyContent: 'center', transform: [{rotate: '90deg'}]},
  moduleChevronExpanded: {width: 16, height: 16, alignItems: 'center', justifyContent: 'center', transform: [{rotate: '270deg'}]},

  moduleContentBar: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    backgroundColor: '#0C4D91',
  },
  moduleContentLabel: {color: '#FFFFFF', fontFamily: 'Runda-Medium', fontSize: 12},
  moduleContentProgress: {color: '#FFFFFF', fontFamily: 'Runda-Medium', fontSize: 12},

  stepRow: {flexDirection: 'row', alignItems: 'center', gap: 25, padding: 12, paddingHorizontal: 16, alignSelf: 'stretch'},
  stepTitle: {flex: 1, color: '#192546', fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16},
  // CONFIRMED live inconsistency (Aug 2026): textDecorationLine alone
  // rendered fine on short (1-line) titles but silently failed to show on
  // longer titles that wrap to numberOfLines={2} — a known Android/Hermes
  // quirk where line-through isn't reliably applied to wrapped multi-line
  // Text. Explicit textDecorationStyle/Color added (some Android versions
  // need these spelled out), AND the render below now nests the completed
  // text in its own inner <Text> rather than relying on the outer
  // numberOfLines-bearing Text to carry the decoration — the combination
  // that reliably fixes this class of bug.
  stepTitleCompleted: {textDecorationLine: 'line-through', textDecorationStyle: 'solid', textDecorationColor: '#192546'},
  moduleNameCompleted: {textDecorationLine: 'line-through'},
  stepDuration: {color: '#0C4D91', fontFamily: 'Runda-Medium', fontSize: 10},
  stepDurationCompleted: {textDecorationLine: 'line-through'},

  // Instructors tab
  instructorsCard: {
    width: 358,
    alignSelf: 'center',
    padding: 16,
    paddingBottom: 24,
    gap: 16,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
  },
  instructorRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 16, alignSelf: 'stretch'},
  instructorImage: {width: 80, height: 80, borderRadius: 100},
  instructorName: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 16, lineHeight: 20, letterSpacing: 0.08},
  instructorDegrees: {color: '#0C4D91', fontFamily: 'Runda-Medium', fontSize: 12},
  instructorDesignation: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 12},
  instructorBio: {color: '#192546', fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16, marginTop: 4},
  readMoreText: {color: '#0C4D91', fontFamily: 'Runda-Medium', fontSize: 12, marginTop: 2},

  // FAQs tab
  faqsCard: {
    width: 358,
    alignSelf: 'center',
    padding: 16,
    paddingBottom: 24,
    gap: 16,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
  },
  faqHeaderOpen: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, alignSelf: 'stretch', backgroundColor: '#0C4D91'},
  faqHeaderClosed: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, alignSelf: 'stretch', borderWidth: 1, borderColor: '#E8E9F1', backgroundColor: '#FFFFFF'},
  faqQuestionOpen: {color: '#FFFFFF', fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16, flex: 1},
  faqQuestionClosed: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 12, flex: 1},
  faqChevronOpen: {width: 15, height: 15, transform: [{rotate: '90deg'}]},
  faqChevronClosed: {width: 15, height: 15},
  faqAnswerWrap: {padding: 12, paddingHorizontal: 16, backgroundColor: '#FFFFFF'},
  faqAnswerText: {color: '#192546', fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16},

  // Certifications tab
  certsCard: {
    width: 358,
    alignSelf: 'center',
    padding: 16,
    paddingBottom: 24,
    gap: 16,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
  },
  certRow: {flexDirection: 'row', alignItems: 'center', gap: 24, alignSelf: 'stretch', padding: 16, borderRadius: 8.201, backgroundColor: '#FFFFFF'},
  certImage: {width: 102, height: 102, borderRadius: 102, borderWidth: 7, borderColor: '#B4C4D9'},
  certTitle: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 12},
  certInfo: {color: '#192546', fontFamily: 'Runda-Normal', fontSize: 10, lineHeight: 14, marginTop: 4},

  videoPlaceholder: {height: 180, borderRadius: 8, backgroundColor: '#192546', alignItems: 'center', justifyContent: 'center'},
  inlineContentImage: {width: '100%', height: 200, borderRadius: 8, backgroundColor: '#F5F6FA'},
  videoPlaceholderText: {color: '#FFFFFF', fontFamily: 'Runda-Medium', fontSize: 16},
});

export default CourseDetailScreen;

/* ─────────────────────────────────────────────────────────────────────────
   STILL OPEN — flagged, not guessed:

   1. ALL SIX dynamic content tabs are now REAL — Overview ("About the
      Course / Course Modules / Learning Outcomes"), Certifications, FAQs,
      About Us, Assessment, and Instructors — every one confirmed via
      Postman (July 2026). Overview, FAQs, About Us, Assessment, and
      Instructors' profile bios all use the purpose-built HTML parser
      (parseCourseOverviewHtml / parseFaqsHtml in
      utils/parseCourseOverviewHtml.ts) since their content is raw
      WordPress HTML, not clean structured fields — Certifications and
      Assessment wrap that HTML in a clean content.items[] array
      ({title, description} pairs), Instructors wraps it in
      content.items[] too ({name, designation, profile}), while
      Overview/FAQs/About Us are a single HTML blob. About Us introduced a
      'video' block type (wp-block-video YouTube embed); Instructors
      required h3 support in the parser (a role title like "Course
      Director" sometimes appears as a leading <h3> inside profile, not as
      a separate field). Both video and role-title extraction render as
      tappable-placeholder / plain-text respectively rather than fake
      content when absent. If a course's content renders incomplete,
      that's the signal the HTML parser needs adjusting for that course's
      specific markup, not that the data is missing.

      NOTE: Assessment and Instructors' confirmed samples came from
      course_id 22814 ("Certified Project Management Diploma"), not 174238
      (used for every other confirmed tab) — 174238 doesn't have either of
      those tabs. Different courses expose different tab sets; this screen
      already handles that correctly since tabs are fully dynamic per
      course.tabs[].

      The author/instructor block on Overview (separate from the
      Instructors tab) uses confirmed field names but was empty for course
      174238 — only renders if a future course populates
      content.author.description.

      The generic SectionsRenderer/getCourseDetailTabContent fallback
      still exists as a safety net for any future unknown tab id a course
      might expose, but every tab actually seen so far has a dedicated,
      fully-typed real path.

   2. The Modules tab's expand/collapse, progress bar, checkmarks, and
      step navigation are fully real — built against the CONFIRMED
      getCourseActivity() response. Tapping a step navigates to a
      'StepContent' route (courseId, stepId, lessonId) — StepContentScreen
      exists and is wired to the CONFIRMED getStepContent() response, but
      the route name is still an assumption pending your confirmation in
      AppNavigator.

   3. Enrolled "Continue" switches to the Modules tab in-app instead of
      opening an external link — matches your confirmation that Continue
      Course should land back on this same screen.

   4. Rich inline formatting (bold, links) inside parsed HTML content gets
      stripped to plain text — the custom parser extracts block structure
      (headings/paragraphs/lists) but not inline emphasis. A real HTML
      renderer (react-native-render-html) would fix this properly if
      needed; not currently a confirmed project dependency.

   5. FIXED (Aug 2026): CONFIRMED live crash — lesson/topic/quiz `title`
      fields (and course.title) can come back from the backend as either
      a plain string OR a WordPress raw/rendered object ({raw, rendered}),
      inconsistently per course. Every title render on this screen now
      goes through stripEntities(), which safely extracts text from
      either shape via the new safeTitleText() helper (same fix already
      applied once in StepContentScreen.tsx). Previously stripEntities()
      called .replace() directly assuming a string, which threw whenever
      a course's title data happened to be object-shaped — this is the
      most likely explanation for the app crashing "in different modules"
      inconsistently across courses, and for the Modules tab going blank
      on iOS (an uncaught render exception there has no redbox in a
      release build, so the screen just goes blank instead of showing an
      error).

   6. FIXED (Aug 2026): stripEntities() previously only decoded 3 entities
      (&#8211;, &#038;, &amp;) and was only ever applied to title fields —
      every other piece of user-facing text on this screen (description
      snippet, meta labels, enrollment status/button labels, stat labels,
      tab bar labels, self-paced pill, instructor names/degrees/bios,
      certification/assessment/FAQ text, and the generic
      SectionsRenderer/ContentBlocksRenderer fallback paths) rendered
      completely raw, so any ampersand/apostrophe/quote anywhere in that
      text showed up as literal "&#038;"/"&#8217;" etc. Replaced with a
      new decodeEntities() helper using the full entity set already
      standard elsewhere in this project, and applied it to every
      user-facing text field on this screen.
──────────────────────────────────────────────────────────────────────── */
