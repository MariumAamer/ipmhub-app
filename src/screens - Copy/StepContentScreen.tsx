/* eslint-disable prettier/prettier */
// src/screens/StepContentScreen.tsx
//
// Opens when a lesson/topic/quiz step is tapped from the Modules tab.
// Wired to getStepContent(courseId, stepId, userId) — CONFIRMED shape
// (July 2026 Postman paste): step.content.{html, excerpt, video_url,
// short_description, materials}. All four content fields were empty
// strings in the sample (that lesson has no populated content yet), so
// every render path below shows nothing rather than fake placeholder
// content when a field is empty — this is real data, just currently
// unpopulated for the tested step.
//
// step.content.html is assumed to be the same raw-WordPress-HTML pattern
// already confirmed for Overview/About Us/FAQs (h2/p/ul, possibly a
// wp-block-video figure) and is parsed with the same
// parseCourseOverviewHtml() utility. This is an assumption carried over
// from the established pattern, not independently confirmed for this
// specific field — flag if a populated step's html renders incorrectly.
//
// step.content.materials is a plain STRING, not an array (contrary to the
// original guess) — format unconfirmed since no populated sample exists.
// Rendered defensively: parsed as HTML blocks if it contains tags,
// otherwise shown as plain text.

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
// FIXED (Aug 2026): was importing SafeAreaView from 'react-native' — that
// core component only applies the safe-area inset on iOS and is a no-op on
// Android, which is why the status bar's clock/battery icons overlapped
// the back arrow and breadcrumb on Android devices. Swapped to the real
// cross-platform SafeAreaView, same fix already applied to
// DMNewMessageScreen.tsx and used via useSafeAreaInsets in AppHeader.tsx.
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import BackButton from '../components/BackButton';
import VideoPlayerModal from '../components/VideoPlayerModal';
import {
  getCourseActivity,
  getStepContent,
  markStepComplete,
  getStepComments,
  postStepComment,
  CourseActivityResponse,
  CourseLesson,
  StepComment,
} from '../api/coursesApi';
import {getUserIdFromToken} from '../api/profileApi';
import {parseCourseOverviewHtml, ContentBlock} from '../utils/parseCourseOverviewHtml';

// ─── Icons ──────────────────────────────────────────────────────────────

const ExpandIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M6 10L2 14M2 14H5.333M2 14v-3.333M10 6l4-4M14 2h-3.333M14 2v3.333"
      stroke="#192546"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronLeft = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path
      d="M11.5924 0.587C11.9687 0.953 11.9687 1.547 11.5924 1.913L5.8503 7.5 11.5924 13.087C11.9687 13.453 11.9687 14.046 11.5924 14.412C11.2162 14.779 10.6061 14.779 10.2298 14.412L3.125 7.5 10.2298 0.587C10.6061 0.221 11.2162 0.221 11.5924 0.587Z"
      fill="#192546"
    />
  </Svg>
);
const ChevronRight = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path
      d="M3.408 14.413C3.031 14.047 3.031 13.453 3.408 13.087L9.15 7.5 3.408 1.913C3.031 1.547 3.031 0.954 3.408 0.588C3.784 0.221 4.394 0.221 4.77 0.588L11.875 7.5 4.77 14.413C4.394 14.779 3.784 14.779 3.408 14.413Z"
      fill="#192546"
    />
  </Svg>
);

// Rebuilt from mask-based SVG as plain fill (project rule: react-native-svg
// doesn't render <mask>). Diagonal arrow used next to Ireland/UK phone lines.
const SupportArrowIcon = () => (
  <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
    <Path
      d="M2.74829 0H10V7.33626C9.97447 7.36694 9.92841 7.3929 9.90009 7.42299C9.64631 7.69242 9.36878 7.93866 9.08885 8.17953C9.00785 8.24922 8.92873 8.33958 8.84677 8.40404C8.39803 8.75697 8.00596 9.17544 7.57081 9.54451C7.53936 9.57118 7.47157 9.59712 7.43222 9.6137L7.43483 6.06021L7.43395 5.38178C7.43264 5.19861 7.41466 4.78377 7.45666 4.63276C7.36968 4.72417 7.29422 4.82865 7.20479 4.91676C7.05122 5.06806 6.91373 5.23537 6.76513 5.39051L2.85612 9.40439C2.76928 9.49285 2.6868 9.57709 2.60624 9.67075C2.54934 9.73689 2.3506 9.98601 2.2826 10C2.14131 9.92762 1.72888 9.48077 1.59088 9.34684L0.800529 8.58287C0.681463 8.46822 0.00802145 7.86195 0 7.76512C0.0501734 7.71762 0.0672748 7.69014 0.107696 7.63695C0.14256 7.59108 0.192014 7.54295 0.231906 7.5002C1.0006 6.67648 1.86939 5.96362 2.63282 5.13526C2.68353 5.08024 2.75964 5.03058 2.81428 4.97799C3.22601 4.60624 3.59263 4.18542 3.99742 3.8059C4.11717 3.69363 4.25434 3.60358 4.3727 3.48925C4.51745 3.34968 4.65902 3.20597 4.79868 3.06114C4.9555 2.89476 5.11869 2.70793 5.31026 2.58217L1.76147 2.5787L0.750068 2.58007C0.671951 2.5801 0.34274 2.58381 0.27586 2.5727C0.253692 2.41277 2.29929 0.529362 2.54502 0.219996C2.59178 0.16113 2.70271 0.0716828 2.74829 0Z"
      fill="#46B0E3"
    />
  </Svg>
);

// Rebuilt from mask-based SVG as plain fill — comment bubble for the
// Post a Comment button.
const CommentIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7.82646 1.44141C9.8528 1.44141 11.4956 3.08421 11.4956 5.11055V5.23629C11.4956 7.26258 9.85276 8.90544 7.82646 8.90544H6.05906L4.70436 10.2601C4.33964 10.6247 3.71624 10.3664 3.71614 9.85066V8.87696C1.9034 8.65364 0.50005 7.10925 0.5 5.23629V5.11055C0.5 3.08421 2.14281 1.44141 4.16914 1.44141H7.82646ZM4.16914 2.34741C2.64304 2.34741 1.406 3.58444 1.406 5.11055V5.23629C1.40605 6.72586 2.58468 7.94076 4.06006 7.99782C4.35993 8.00944 4.62211 8.25319 4.62214 8.57872V9.06127L5.51686 8.16709L5.53298 8.15205L5.53513 8.14936C5.64127 8.05327 5.77978 8.00004 5.92365 7.99997H7.82646C9.35253 7.99997 10.5896 6.76235 10.5896 5.23629V5.11055C10.5896 3.58444 9.35257 2.34741 7.82646 2.34741H4.16914Z"
      fill="#0C4D91"
    />
  </Svg>
);

// Rebuilt from mask-based SVG as plain fill (project rule: react-native-svg
// doesn't render <mask>) — the checkmark shown on the Mark Complete button.
// "Collapse Comments" button icon — per Figma spec.
const CollapseCommentsIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7.82646 1.44141C9.8528 1.44141 11.4956 3.08421 11.4956 5.11055V5.23629C11.4956 7.26258 9.85276 8.90544 7.82646 8.90544H6.05906L4.70436 10.2601C4.33964 10.6247 3.71624 10.3664 3.71614 9.85066V8.87696C1.9034 8.65364 0.50005 7.10925 0.5 5.23629V5.11055C0.5 3.08421 2.14281 1.44141 4.16914 1.44141H7.82646ZM4.16914 2.34741C2.64304 2.34741 1.406 3.58444 1.406 5.11055V5.23629C1.40605 6.72586 2.58468 7.94076 4.06006 7.99782C4.35993 8.00944 4.62211 8.25319 4.62214 8.57872V9.06127L5.51686 8.16709L5.53298 8.15205L5.53513 8.14936C5.64127 8.05327 5.77978 8.00004 5.92365 7.99997H7.82646C9.35253 7.99997 10.5895 6.76235 10.5896 5.23629V5.11055C10.5896 3.58444 9.35257 2.34741 7.82646 2.34741H4.16914Z"
      fill="#0C4D91"
    />
  </Svg>
);

const MarkCompleteTickIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M11.7539 2.30086C12.0856 2.63911 12.0807 3.18261 11.743 3.51481L4.59722 10.5437L0.256526 6.27403C-0.0811977 5.94183 -0.0860865 5.39832 0.245606 5.06008C0.577299 4.72184 1.11997 4.71694 1.45769 5.04915L4.59722 8.13734L10.5418 2.28993C10.8796 1.95773 11.4222 1.96262 11.7539 2.30086Z"
      fill="#FFFFFF"
    />
  </Svg>
);

// CONFIRMED bug fix: the hardcoded Student Support card below already
// covers this content, but at least some steps' own content.html ALSO
// includes a "Student Support" section as plain WordPress paragraphs —
// rendering both back to back duplicated it on screen. This strips a
// heading-led section titled "Student Support" (and everything under it,
// up to the next heading or end of content) out of a parsed block list
// before it's rendered, so only the properly-styled card shows.
const stripRedundantSection = (blocks: ContentBlock[], headingMatch: string): ContentBlock[] => {
  const startIdx = blocks.findIndex(
    (b) => b.type === 'heading' && b.text?.trim().toLowerCase() === headingMatch.toLowerCase(),
  );
  if (startIdx === -1) return blocks;
  let endIdx = blocks.findIndex((b, i) => i > startIdx && b.type === 'heading');
  if (endIdx === -1) endIdx = blocks.length;
  return [...blocks.slice(0, startIdx), ...blocks.slice(endIdx)];
};

type SubTab = 'topic' | 'materials';

// Best-effort: treat materials as HTML if it contains a tag, else plain text
const looksLikeHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s);

// ─── Decode HTML entities ───────────────────────────────────────────────
// This step-content endpoint (titles, short_description, plain-text
// materials, and step comments) is HTML-entity-encoded the same way every
// other WP-backed field in this app is (e.g. "&#038;" for "&", "&#8217;"
// for a curly apostrophe). safeTitleText() previously only replaced the
// single &#8211; en-dash entity, and short_description/materials/comment
// author/content had NO decoding at all — so any ampersand, apostrophe,
// or quote in those fields rendered as literal entity text. Widened to
// the full entity set already used elsewhere in this project
// (coursesApi.ts/feedApi.ts/etc), including a generic numeric-entity
// fallback for anything not explicitly listed.
//
// CONFIRMED live crash fix (Aug 2026): "(text || '').replace is not a
// function (it is undefined)" — crashed inside CommentCard when a step
// comment's author_name/content came back as something other than a
// plain string (e.g. the same {raw, rendered} object shape already seen
// on course/lesson titles, or a number). `text || ''` only substitutes
// the fallback when `text` is falsy; a truthy non-string sails through
// and has no .replace method. Now explicitly checks typeof text ===
// 'string' before doing any replacing, so any non-string input safely
// renders as empty instead of crashing the screen.
const decodeEntities = (text: unknown): string =>
  (typeof text === 'string' ? text : '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#034;/g, '"')
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

// CONFIRMED live crash fix (Aug 2026): "Objects are not valid as a React
// child (found: object with keys {raw, rendered})". getCourseActivity's
// course.title came back as WordPress's standard raw/rendered post-title
// shape ({raw: string, rendered: string}) for this course, not the plain
// string every other confirmed course/lesson/topic title field has been.
// Rather than assume every title field is always a plain string, extract
// safely everywhere a title renders in this screen: handles a plain
// string, the {rendered, raw} shape, or anything else without crashing.
const safeTitleText = (value: unknown): string => {
  if (typeof value === 'string') return decodeEntities(value);
  if (value && typeof value === 'object') {
    const obj = value as {rendered?: unknown; raw?: unknown};
    if (typeof obj.rendered === 'string') return decodeEntities(obj.rendered);
    if (typeof obj.raw === 'string') return decodeEntities(obj.raw);
  }
  return '';
};

// Comment content comes back as WP post HTML (e.g. "<p>Hi there</p><p>Second
// paragraph</p>"), same raw markup WP stores for post_content generally —
// confirmed live (Aug 2026) via the comments endpoint rendering literal
// "<p>...</p>" tags on screen. safeTitleText() only decodes entities, it
// doesn't touch tags, so it's not enough here on its own. This strips tags
// while turning block boundaries (</p>, <br>, </div>) into newlines first,
// so multi-paragraph comments don't get squashed into one run-on line.
const safeCommentText = (value: unknown): string => {
  const withTags = typeof value === 'string'
    ? value
    : value && typeof value === 'object' && typeof (value as any).rendered === 'string'
      ? (value as any).rendered
      : value && typeof value === 'object' && typeof (value as any).raw === 'string'
        ? (value as any).raw
        : '';
  const withBreaks = withTags
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(withBreaks).trim();
};

const StepContentScreen = ({route, navigation}: any) => {
  const {courseId, stepId, lessonId} = route?.params || {};
  // TEMP DEBUG — remove after grabbing IDs for Postman
  console.log('IDs:', courseId, stepId);
  const [activity, setActivity] = useState<CourseActivityResponse | null>(null);
  const [stepContent, setStepContent] = useState<StepContentResponseStep | null>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>('topic');
  const [userId, setUserId] = useState<number>(0);
  const [completing, setCompleting] = useState(false);
  const [comments, setComments] = useState<StepComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!courseId || !stepId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const uid = await getUserIdFromToken();
      setUserId(uid || 0);
      const [activityRes, contentRes] = await Promise.all([
        getCourseActivity(courseId, uid || 0),
        getStepContent(courseId, stepId, uid || 0),
      ]);
      setActivity(activityRes);
      setStepContent(contentRes?.step ?? null);
      setLoading(false);

      setCommentsLoading(true);
      const commentsRes = await getStepComments(courseId, stepId, uid || 0);
      setComments(commentsRes?.comments ?? []);
      setCommentsLoading(false);
    })();
  }, [courseId, stepId]);

  const countComments = (list: StepComment[]): number =>
    list.reduce((sum, c) => sum + 1 + (c.replies ? countComments(c.replies) : 0), 0);

  const handlePostComment = async () => {
    if (!courseId || !stepId || !userId || !commentText.trim() || postingComment) return;
    setPostingComment(true);
    const parentId = replyingTo ?? 0;
    const newComment = await postStepComment(courseId, stepId, userId, commentText.trim(), parentId);
    setPostingComment(false);
    if (!newComment) return;
    setCommentText('');
    setReplyingTo(null);
    if (parentId === 0) {
      setComments((prev) => [...prev, newComment]);
    } else {
      // Attach as a reply on the matching parent comment (one level deep,
      // matching what the Figma spec shows — no confirmed data yet for
      // deeper nesting).
      setComments((prev) =>
        prev.map((c) => (c.id === parentId ? {...c, replies: [...(c.replies || []), newComment]} : c)),
      );
    }
  };

  // Wired to the now-CONFIRMED markStepComplete endpoint. It returns the
  // updated step + course progress in one response, so both the button
  // state and the module progress bar update from this single call rather
  // than needing a separate re-fetch of getCourseActivity.
  const handleMarkComplete = async () => {
    if (!courseId || !stepId || !userId || completing) return;
    setCompleting(true);
    try {
      const res = await markStepComplete(courseId, stepId, userId);
      setCompleting(false);
      if (!res?.success) return;
      setStepContent((prev) => (prev ? {...prev, status: res.step_status} : prev));
      setActivity((prev) => {
        if (!prev) return prev;
        const lessons = prev.course.lessons.map((l) => ({
          ...l,
          topics: (l.topics ?? []).map((t) => (t.id === stepId ? {...t, status: res.step_status} : t)),
          quizzes: (l.quizzes ?? []).map((q) => (q.id === stepId ? {...q, status: res.step_status} : q)),
        }));
        return {
          ...prev,
          course: {
            ...prev.course,
            lessons,
            progress: {...prev.course.progress, percentage: res.progress.percentage},
          },
        };
      });
    } catch (err) {
      // markStepComplete now THROWS the backend's real message (e.g.
      // "This step cannot be completed yet. Finish earlier required steps
      // first.") instead of swallowing it — CONFIRMED live case (Aug
      // 2026) where a 409 is the backend correctly enforcing sequential
      // completion, not a random failure. Show that real reason instead
      // of a generic "try again" that hides what's actually going on.
      setCompleting(false);
      const message = err instanceof Error ? err.message : 'This step could not be marked as complete right now.';
      Alert.alert('Could not mark complete', message);
      // Re-fetch the step's real current status too, in case it turns out
      // the backend already considers it complete for some other reason
      // (a 409 doesn't always mean "blocked" — could mean "already done")
      // — either way the button ends up showing the TRUE state.
      const refreshed = await getStepContent(courseId, stepId, userId);
      if (refreshed?.step) {
        setStepContent(refreshed.step);
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#0C4D91" style={{marginTop: 60}} />
      </SafeAreaView>
    );
  }

  const lesson: CourseLesson | undefined = activity?.course.lessons.find((l) => l.id === lessonId);
  // Defensive fallback: getCourseActivity() normalizes topics/quizzes to
  // real arrays (some courses' "activity"-type lessons previously came
  // back without these keys at all, which crashed this exact spread) —
  // guarding here too so this screen stays safe regardless of the source.
  const allSteps = lesson ? [...(lesson.topics ?? []), ...(lesson.quizzes ?? [])] : [];
  const stepIndex = allSteps.findIndex((s) => s.id === stepId);
  const currentStep = stepIndex >= 0 ? allSteps[stepIndex] : null;
  const prevStep = stepIndex > 0 ? allSteps[stepIndex - 1] : null;
  const nextStep = stepIndex >= 0 && stepIndex < allSteps.length - 1 ? allSteps[stepIndex + 1] : null;

  // CONFIRMED bug fix: this previously always navigated to 'StepContent'
  // even when the next/prev step was a quiz (a quiz step has no
  // content.html/video/materials — StepContent would render blank for it).
  // Now checks which array (topics vs quizzes) the step actually came from
  // and routes accordingly.
  const goToStep = (step: {id: number} | null) => {
    if (!step || !lesson) return;
    const isQuiz = (lesson.quizzes ?? []).some((q) => q.id === step.id);
    if (isQuiz) {
      navigation?.navigate?.('Quiz', {courseId, stepId: step.id});
    } else {
      navigation?.navigate?.('StepContent', {courseId, stepId: step.id, lessonId});
    }
  };

  const stepTitle = safeTitleText(stepContent?.title || currentStep?.title);
  const modulePct = lesson?.progress?.percentage;

  const htmlBlocks: ContentBlock[] = stepContent?.content?.html
    ? stripRedundantSection(parseCourseOverviewHtml(stepContent.content.html), 'Student Support')
    : [];
  const hasMaterials = !!stepContent?.content?.materials;
  const materialsIsHtml = hasMaterials && looksLikeHtml(stepContent!.content.materials);
  const materialsBlocks: ContentBlock[] = materialsIsHtml
    ? stripRedundantSection(parseCourseOverviewHtml(stepContent!.content.materials), 'Student Support')
    : [];

  return (
    <>
      <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.headerRow}>
        <BackButton onPress={() => navigation?.goBack?.()} />
        <TouchableOpacity>
          <ExpandIcon />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Breadcrumb — confirmed data via getCourseActivity */}
        <View style={styles.breadcrumbRow}>
          <Text style={styles.breadcrumbText}>{safeTitleText(activity?.course.title)}</Text>
          <ChevronRight />
          <Text style={styles.breadcrumbText}>{safeTitleText(lesson?.title)}</Text>
          <ChevronRight />
          <Text style={styles.breadcrumbTextActive}>{stepTitle}</Text>
        </View>

        {/* Prev/next — Mark Complete moved to the end of the screen,
            below the content, per Figma. */}
        <View style={styles.controlsRow}>
          <View style={styles.prevNextGroup}>
            <TouchableOpacity
              style={[styles.prevBtn, !prevStep && styles.navBtnDisabled]}
              disabled={!prevStep}
              onPress={() => goToStep(prevStep)}>
              <ChevronLeft />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, !nextStep && styles.navBtnDisabled]}
              disabled={!nextStep}
              onPress={() => goToStep(nextStep)}>
              <ChevronRight />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.stepTitle}>{stepTitle}</Text>

        {/* Module progress — confirmed data */}
        {modulePct !== undefined && (
          <View style={{alignSelf: 'stretch'}}>
            <Text style={styles.moduleProgressLabel}>{'MODULE PROGRESS'}</Text>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, {width: `${modulePct}%`}]} />
            </View>
            <Text style={styles.modulePercentText}>{`${modulePct}% Complete`}</Text>
          </View>
        )}

        {stepContent?.content?.short_description ? (
          <Text style={styles.bodyText}>{decodeEntities(stepContent.content.short_description)}</Text>
        ) : null}

        {/* Topic/Materials sub-tabs — only shown if there's actually
            something to switch between */}
        {(htmlBlocks.length > 0 || hasMaterials) && (
          <View style={styles.subTabRow}>
            <TouchableOpacity onPress={() => setSubTab('topic')}>
              <Text style={[styles.subTabText, subTab === 'topic' && styles.subTabTextActive]}>{'Topic'}</Text>
            </TouchableOpacity>
            {hasMaterials && (
              <TouchableOpacity onPress={() => setSubTab('materials')}>
                <Text style={[styles.subTabText, subTab === 'materials' && styles.subTabTextActive]}>{'Materials'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {subTab === 'topic' && stepContent?.content?.video_url ? (
          // Format unconfirmed (no populated sample seen) — treated as an
          // embeddable video URL, same in-app player used for the
          // html-parsed video block below. FIXED (Aug 2026): was
          // Linking.openURL, which broke on player.vimeo.com URLs (see
          // VideoPlayerModal.tsx for why).
          <TouchableOpacity
            style={styles.videoPlaceholder}
            onPress={() => setVideoModalUrl(stepContent.content.video_url)}>
            <Text style={styles.videoPlaceholderText}>{'▶  Play video'}</Text>
          </TouchableOpacity>
        ) : null}

        {subTab === 'topic' &&
          htmlBlocks.map((block, idx) => (
            <ContentBlockView key={idx} block={block} onPlayVideo={setVideoModalUrl} />
          ))}

        {subTab === 'materials' && hasMaterials && (
          materialsIsHtml ? (
            materialsBlocks.map((block, idx) => (
              <ContentBlockView key={idx} block={block} onPlayVideo={setVideoModalUrl} />
            ))
          ) : (
            <Text style={styles.bodyText}>{decodeEntities(stepContent!.content.materials)}</Text>
          )
        )}

        {!stepContent?.content?.html && !hasMaterials && !stepContent?.content?.video_url && (
          <Text style={styles.emptyStateText}>
            {'This step has no content populated yet.'}
          </Text>
        )}

        {stepContent?.assignments?.has_assignments && (
          <View style={styles.assignmentBadge}>
            <Text style={styles.assignmentText}>
              {stepContent.assignments.points_enabled
                ? `This step has an assignment worth ${stepContent.assignments.points} points.`
                : 'This step has an assignment.'}
            </Text>
          </View>
        )}

        {/* Mark Complete — moved here (end of content) from the top
            controls row, per Figma. Still wired to the CONFIRMED
            markStepComplete endpoint. */}
        <TouchableOpacity
          style={[styles.completeBtn, (completing || stepContent?.status === 'completed') && styles.completeBtnDisabled]}
          onPress={handleMarkComplete}
          disabled={completing || stepContent?.status === 'completed'}>
          {completing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.completeBtnText}>
                {stepContent?.status === 'completed' ? 'Completed' : 'Mark Complete'}
              </Text>
              <MarkCompleteTickIcon />
            </>
          )}
        </TouchableOpacity>

        {/* Student Support — STATIC content, not from any confirmed
            per-step API field (getStepContent has no student_support key).
            The email here matches what's already confirmed in the FAQs
            "Who can I contact..." answer text, so it's real contact info,
            just not dynamic/per-course — same block on every step. */}
        <View style={styles.supportCard}>
          <Text style={styles.supportHeading}>{'Student Support'}</Text>
          <View style={styles.supportDivider} />
          <Text style={styles.supportLabel}>{'Email:'}</Text>
          <Text style={styles.supportValue}>{'courses@projectmanagement.ie'}</Text>
          <Text style={styles.supportLabel}>{'Phone:'}</Text>
          <View style={styles.supportPhoneRow}>
            <SupportArrowIcon />
            <Text style={styles.supportLabel}>{'Ireland: '}</Text>
            <Text style={styles.supportValue}>{'+353 1 661 4677'}</Text>
          </View>
          <View style={styles.supportPhoneRow}>
            <SupportArrowIcon />
            <Text style={styles.supportLabel}>{'UK: '}</Text>
            <Text style={styles.supportValue}>{'+44 2045 321469'}</Text>
          </View>
          <Text style={styles.supportValue}>{'Available Monday–Friday, 9:00 am to 5:00 pm (Irish time zone).'}</Text>
        </View>

        {/* Comments — wired to the CONFIRMED getStepComments/postStepComment
            endpoints (July 2026). Renders per Figma spec: count header +
            Collapse toggle, each comment in a bordered card with
            avatar/name/date, replies indented, and a reply box at the
            bottom. */}
        <View style={styles.commentsHeaderRow}>
          <Text style={styles.commentsCountText}>{`${countComments(comments)} Comments`}</Text>
          <TouchableOpacity style={styles.collapseCommentsBtn} onPress={() => setCommentsExpanded((v) => !v)}>
            <Text style={styles.collapseCommentsBtnText}>
              {commentsExpanded ? 'Collapse Comments' : 'Show Comments'}
            </Text>
            <CollapseCommentsIcon />
          </TouchableOpacity>
        </View>

        {commentsExpanded && (
          <>
            {commentsLoading ? (
              <ActivityIndicator size="small" color="#0C4D91" />
            ) : (
              comments.map((c) => (
                <CommentCard
                  key={c.id}
                  comment={c}
                  onReply={() => setReplyingTo(c.id)}
                />
              ))
            )}

            <View style={styles.commentsHeaderRow}>
              <Text style={styles.leaveCommentHeading}>
                {replyingTo ? 'Reply to Comment' : 'Leave a Comment'}
              </Text>
              {replyingTo ? (
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Text style={styles.cancelReplyText}>{'Cancel'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TextInput
              style={styles.commentInput}
              placeholder="Comment*"
              placeholderTextColor="#8F9098"
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity
              style={[styles.postCommentBtn, (!commentText.trim() || postingComment) && styles.completeBtnDisabled]}
              disabled={!commentText.trim() || postingComment}
              onPress={handlePostComment}>
              {postingComment ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <CommentIcon />
                  <Text style={styles.postCommentText}>{replyingTo ? 'Post Reply' : 'Post a Comment'}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
      </SafeAreaView>
      <VideoPlayerModal
        visible={!!videoModalUrl}
        videoUrl={videoModalUrl}
        onClose={() => setVideoModalUrl(null)}
      />
    </>
  );
};

// Single comment card — per Figma spec (bordered box, avatar, name, date,
// text, Reply link). Renders its own replies indented one level, same
// styling. No confirmed data yet for deeper nesting than one level.
const CommentCard = ({comment, onReply}: {comment: StepComment; onReply: () => void}) => (
  <View>
    <View style={styles.commentCard}>
      <View style={styles.commentAuthorRow}>
        {comment.author?.avatar ? (
          <Image source={{uri: comment.author.avatar}} style={styles.commentAvatar} />
        ) : (
          <View style={[styles.commentAvatar, {backgroundColor: '#E8E9F1'}]} />
        )}
        <View>
          {/* CONFIRMED via Postman (Aug 2026): the comments endpoint nests
              author under an `author` object ({user_id, full_name, avatar,
              profile_url}), not flat author_name/author_avatar fields as
              previously assumed — that's why names/avatars weren't
              showing. safeTitleText() still needed since full_name comes
              through the same WP entity-encoding as everything else. */}
          <Text style={styles.commentAuthorName}>{safeTitleText(comment.author?.full_name)}</Text>
          <Text style={styles.commentDate}>{decodeEntities(comment.date_formatted)}</Text>
        </View>
      </View>
      <View style={styles.commentBody}>
        <Text style={styles.commentText}>{safeCommentText(comment.content)}</Text>
        <TouchableOpacity onPress={onReply}>
          <Text style={styles.commentReplyText}>{'Reply'}</Text>
        </TouchableOpacity>
      </View>
    </View>
    {comment.replies?.map((reply) => (
      <View key={reply.id} style={{marginLeft: 24, marginTop: 8}}>
        <CommentCard comment={reply} onReply={onReply} />
      </View>
    ))}
  </View>
);

// Minimal inline block renderer (heading/paragraph/list/video) — mirrors
// ContentBlocksRenderer in CourseDetailScreen.tsx; duplicated here rather
// than shared to keep this screen's imports self-contained. If this
// pattern gets used a third time, worth extracting to a shared component.
const ContentBlockView = ({block, onPlayVideo}: {block: ContentBlock; onPlayVideo: (url: string) => void}) => {
  if (block.type === 'heading') {
    // block.text/items come out of parseCourseOverviewHtml(), a shared
    // utility whose own entity-decoding hasn't been independently
    // verified for this field — decoding here too is a safe no-op if it
    // already decodes upstream, and a real fix if it doesn't.
    return <Text style={styles.blockHeading}>{decodeEntities(block.text || '')}</Text>;
  }
  if (block.type === 'paragraph') {
    return <Text style={styles.bodyText}>{decodeEntities(block.text || '')}</Text>;
  }
  if (block.type === 'list') {
    return (
      <View style={{gap: 4}}>
        {block.items?.map((item, idx) => (
          <Text key={idx} style={styles.bodyText}>
            {block.ordered ? `${idx + 1}. ${decodeEntities(item)}` : `•  ${decodeEntities(item)}`}
          </Text>
        ))}
      </View>
    );
  }
  if (block.type === 'video' && block.videoUrl) {
    // CONFIRMED (July 2026): the video is a bare URL embedded inside
    // content.html (e.g. a lone <p>https://vimeo.com/...</p>), not
    // something that arrives via the separate top-level content.video_url
    // field — that field was empty in every sample seen. This now
    // actually renders instead of deferring to a field that may never be
    // populated in practice.
    //
    // FIXED (Aug 2026): opens in-app via VideoPlayerModal instead of
    // Linking.openURL — the raw player.vimeo.com URL 403'd/blocked with a
    // "privacy settings" error when opened bare in an external browser tab
    // (no whitelisted origin). See VideoPlayerModal.tsx for details.
    return (
      <TouchableOpacity
        style={styles.videoPlaceholder}
        onPress={() => onPlayVideo(block.videoUrl!)}>
        <Text style={styles.videoPlaceholderText}>{'▶  Play video'}</Text>
      </TouchableOpacity>
    );
  }
  if (block.type === 'image' && block.imageUrl) {
    return <Image source={{uri: block.imageUrl}} style={styles.inlineContentImage} resizeMode="contain" />;
  }
  return null;
};

// Local alias matching coursesApi's StepContentResponse['step'] shape,
// avoided importing the full response wrapper type since this screen only
// needs the inner `step` object.
type StepContentResponseStep = {
  id: number;
  course_id: number;
  title: string;
  slug: string;
  type: string;
  post_type: string;
  permalink: string;
  status: string;
  duration: string | null;
  access: {is_locked: boolean; available_at: string | null};
  content: {
    html: string;
    excerpt: string;
    video_url: string;
    short_description: string;
    materials: string;
  };
  assignments: {has_assignments: boolean; points_enabled: boolean; points: number};
  is_sample: boolean;
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  headerRow: {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12},
  // FIXED (Aug 2026): screen content (Topic tab body, images, headings,
  // Student Support card, comments) was rendering with only 16px of
  // horizontal breathing room, tight enough to read as edge-to-edge on
  // device — bumped to 20px to match the padding this app already uses on
  // comparable detail screens (PrivacyPolicyScreen, ResourceDetailScreen),
  // and added paddingTop so the Topic/Materials sub-tab row doesn't sit
  // flush under the header.
  scrollContent: {paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 16},

  breadcrumbRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 4, flexWrap: 'wrap'},
  breadcrumbText: {color: '#0C4D91', fontFamily: 'Runda-Medium', fontSize: 12, width: 104},
  breadcrumbTextActive: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 12, width: 104},

  controlsRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  completeBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 100,
    backgroundColor: '#0C4D91',
  },
  completeBtnDisabled: {opacity: 0.6},
  completeBtnText: {color: '#FFFFFF', fontFamily: 'Runda-Medium', fontSize: 14},
  prevNextGroup: {flexDirection: 'row'},
  prevBtn: {width: 61, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 50, borderTopRightRadius: 0, borderBottomRightRadius: 0, backgroundColor: '#E8E9F1'},
  nextBtn: {width: 61, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 50, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, backgroundColor: '#E8E9F1'},
  navBtnDisabled: {opacity: 0.4},

  stepTitle: {color: '#192647', fontFamily: 'Runda-Bold', fontSize: 22},
  blockHeading: {color: '#0C4D91', fontFamily: 'Runda-Bold', fontSize: 16, marginTop: 8},

  moduleProgressLabel: {color: '#0C4D91', fontFamily: 'Runda-Bold', fontSize: 14, marginBottom: 8},
  progressBarTrack: {height: 6, borderRadius: 20, backgroundColor: '#E8E9F1', overflow: 'hidden'},
  progressBarFill: {height: 6, backgroundColor: '#46B0E3'},
  modulePercentText: {color: '#0C4D91', fontFamily: 'Runda-Medium', fontSize: 14, marginTop: 8},

  emptyStateText: {color: '#8F9098', fontFamily: 'Runda-Normal', fontSize: 13, lineHeight: 18},
  bodyText: {color: '#192546', fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16},

  subTabRow: {flexDirection: 'row', gap: 24, borderBottomWidth: 1, borderBottomColor: '#E8E9F1', paddingBottom: 8},
  subTabText: {color: '#8F9098', fontFamily: 'Runda-Medium', fontSize: 14},
  subTabTextActive: {color: '#0C4D91', textDecorationLine: 'underline'},

  videoPlaceholder: {height: 180, borderRadius: 8, backgroundColor: '#192546', alignItems: 'center', justifyContent: 'center'},
  inlineContentImage: {width: '100%', height: 200, borderRadius: 8, backgroundColor: '#F5F6FA'},
  videoPlaceholderText: {color: '#FFFFFF', fontFamily: 'Runda-Medium', fontSize: 16},

  assignmentBadge: {padding: 12, borderRadius: 8, backgroundColor: '#EEF7FC'},
  assignmentText: {color: '#0C4D91', fontFamily: 'Runda-Medium', fontSize: 12},

  postCommentBtn: {
    flexDirection: 'row',
    height: 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: '#0C4D91',
    backgroundColor: '#FFFFFF',
  },
  postCommentText: {color: '#0C4D91', fontFamily: 'Runda-Medium', fontSize: 10},

  commentsHeaderRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch'},
  commentsCountText: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 16, letterSpacing: 0.08},
  collapseCommentsBtn: {
    flexDirection: 'row',
    height: 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: '#0C4D91',
  },
  collapseCommentsBtnText: {color: '#0C4D91', fontFamily: 'Runda-Medium', fontSize: 12},

  commentCard: {
    padding: 16,
    alignSelf: 'stretch',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#8F9098',
    backgroundColor: '#EEF7FC',
    gap: 8,
  },
  commentAuthorRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  commentAvatar: {width: 38, height: 38, borderRadius: 100},
  commentAuthorName: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 14},
  commentDate: {color: '#8F9098', fontFamily: 'Runda', fontSize: 12, marginTop: 2},
  commentBody: {paddingLeft: 50, gap: 8},
  commentText: {color: '#192546', fontFamily: 'Runda', fontSize: 12, lineHeight: 16},
  commentReplyText: {color: '#46B0E3', fontFamily: 'Runda-Medium', fontSize: 12},

  leaveCommentHeading: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 16, letterSpacing: 0.08},
  cancelReplyText: {color: '#ED3241', fontFamily: 'Runda-Medium', fontSize: 12},
  commentInput: {
    alignSelf: 'stretch',
    minHeight: 80,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#8F9098',
    padding: 12,
    fontFamily: 'Runda',
    fontSize: 12,
    color: '#192546',
    textAlignVertical: 'top',
  },

  supportCard: {
    width: 358,
    alignSelf: 'center',
    padding: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 16,
    borderRadius: 5,
    backgroundColor: '#EEF7FC',
  },
  supportHeading: {color: '#0C4D91', fontFamily: 'Runda-Medium', fontSize: 16, lineHeight: 20, letterSpacing: 0.08},
  supportDivider: {height: 1, alignSelf: 'stretch', backgroundColor: '#8F9098'},
  supportLabel: {color: '#0C4D91', fontFamily: 'Runda-Medium', fontSize: 12},
  supportValue: {color: '#192546', fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16},
  supportPhoneRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
});

export default StepContentScreen;

/* ─────────────────────────────────────────────────────────────────────────
   STILL OPEN — flagged, not guessed:

   1. The response ENVELOPE and field names are now fully confirmed via
      Postman (July 2026): step.content.{html, excerpt, video_url,
      short_description, materials}, step.assignments.{has_assignments,
      points_enabled, points}. Every field was an empty string/false in the
      tested sample (that lesson has no populated content), so this screen
      currently can't be visually verified end-to-end — it'll render mostly
      empty states until a step WITH real content is fetched. Test against
      a populated step/topic to confirm the render actually looks right.

   2. step.content.html is ASSUMED to follow the same raw-WordPress-HTML
      pattern already confirmed for Overview/About Us/FAQs (parsed with
      parseCourseOverviewHtml) — reasonable given the established pattern,
      but not independently confirmed for this specific field since the
      sample was empty.

   3. step.content.materials is a plain STRING (confirmed), not the
      {label,url}[] array originally guessed. Format when populated is
      unknown — rendered defensively (as HTML blocks if it contains a tag,
      otherwise plain text) until a real value is seen.

   4. step.content.video_url format is unconfirmed (empty in the sample) —
      treated as an externally-openable URL via Linking, consistent with
      the confirmed About Us video pattern, but not verified for this
      field specifically (could be a raw YouTube URL, an embed URL, an
      mp4 URL, etc. — VideoPlayerModal's iframe wrapper should handle any
      of those reasonably; Vimeo specifically needs the domain-whitelisted
      in-app embed rather than an external browser tab — see
      VideoPlayerModal.tsx).

   5. "Complete" button is now wired to the CONFIRMED markStepComplete
      endpoint (July 2026) — updates local step/activity state from the
      single response (no separate re-fetch needed). "Post a Comment"
      still has no handler behind it beyond navigating to a 'Comments'
      route — there is NO comments endpoint anywhere in coursesApi.ts, and
      this screen does not fetch or display any existing comments at all.
      The Figma spec (inline comment thread with avatars/replies right on
      this screen) can't be built until a real list+post comments-per-step
      endpoint is confirmed — flagged to Robby.

   6. Breadcrumb, Complete/Prev/Next state, and Module Progress remain
      built on the already-confirmed getCourseActivity() response —
      unaffected by this rewrite, still real.

   7. FIXED (Aug 2026): stepTitle/breadcrumb titles, short_description,
      plain-text materials, and step comments (author name/content/date)
      are HTML-entity-encoded by the backend the same way every other
      WP-backed field in this app is — previously only titles got a
      single-entity (&#8211;) fix via safeTitleText(), and every other
      field rendered completely raw. All of the above now go through the
      new decodeEntities() helper (same entity set used elsewhere in this
      project). Block text coming out of parseCourseOverviewHtml() is also
      now decoded defensively here, since that shared utility's own
      entity-handling hasn't been independently verified.

   8. FIXED (Aug 2026): live crash "(text || '').replace is not a
      function (it is undefined)" at StepContentScreen.tsx:171, thrown
      from inside CommentCard when rendering a comment. decodeEntities()
      previously assumed its input was either a string or falsy
      (`(text || '')`); a truthy non-string value (an object, a number —
      the same {raw, rendered} shape already confirmed on titles is one
      candidate) passed straight through and had no .replace method.
      decodeEntities() now explicitly checks `typeof text === 'string'`
      before replacing, so any non-string field renders as empty text
      instead of crashing the whole screen. If a populated comment later
      shows blank author/content where text was expected, that's the
      signal the backend is sending a non-string shape here too and it
      needs the same {raw,rendered}-style extraction safeTitleText()
      already has for titles.
──────────────────────────────────────────────────────────────────────── */
