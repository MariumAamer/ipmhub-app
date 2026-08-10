/* eslint-disable prettier/prettier */
// src/screens/QuizScreen.tsx
//
// Opens when a quiz step is tapped from the Modules tab. Wired to
// getQuiz(courseId, stepId, userId) — CONFIRMED shape (re-confirmed July
// 2026, real 20-question paste). quiz.questions[] each have {id, post_id,
// title, question, question_type, points, answers[]} — answers[] have
// {index, answer, html, sort_string, graded, graded_type,
// grading_progression}. CONFIRMED bug fix: this screen previously read
// answer._answer (a field that never existed — options rendered as empty
// rows with only the radio circle visible) — now reads the real
// answer.answer field. There is also NO correctness field anywhere in
// this data (no _correct or equivalent) — see note 2 below.
//
// NOTE: this screen only covers 'single' question_type fully (radio-select,
// matches the Figma). 'cloze_answer' (fill-in-the-blank, confirmed to
// exist in the data — question 2049 in the sample) has a fundamentally
// different UI (a text input, not radio options) that hasn't been
// specced — those questions currently fall back to a plain single-select
// rendering of whatever's in `answers[]`, which will look wrong. Flag if
// a cloze_answer question needs its own real UI.
//
// Scoring/submission: there's no confirmed "submit quiz" or "save answer"
// endpoint — selecting an answer is tracked in local component state only
// and does NOT persist anywhere. The "Review Question" button and
// Answered/Review status dots are real UI states driven by that local
// state, not synced to any backend.

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Svg, {Path, Circle} from 'react-native-svg';
import {
  getQuiz,
  getCourseActivity,
  submitQuiz,
  QuizResponse,
  QuizQuestion,
  QuizSubmitResponse,
  CourseActivityResponse,
  CourseLesson,
} from '../api/coursesApi';
import {getUserIdFromToken} from '../api/profileApi';

// ─── Icons ──────────────────────────────────────────────────────────────

const BackIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
    <Path
      d="M0.7 7C0.7 3.5206 3.5206 0.7 7 0.7H21C24.4794 0.7 27.3 3.5206 27.3 7V21C27.3 24.4794 24.4794 27.3 21 27.3H7C3.5206 27.3 0.7 24.4794 0.7 21V7Z"
      stroke="#8F9098"
      strokeWidth={1.4}
    />
    <Path
      d="M10.4494 12.8438C9.8504 13.4423 9.8504 14.4151 10.4494 15.0136L15.2973 19.8623L16 19.1596L11.1521 14.3104C10.9423 14.0997 10.9423 13.7577 11.1521 13.547L15.9973 8.70277L15.2941 8.00006L10.4494 12.8438Z"
      fill="#8F9098"
      stroke="#8F9098"
      strokeWidth={0.7}
    />
  </Svg>
);

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

// Small breadcrumb separator arrow — rebuilt from mask-based SVG as plain fill
const BreadcrumbArrow = () => (
  <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.27194 0.391062C2.02108 0.635134 2.02108 1.03085 2.27194 1.27492L6.10012 4.99956L2.27194 8.7242C2.02108 8.96827 2.02108 9.36399 2.27194 9.60806C2.5228 9.85214 2.92951 9.85214 3.18037 9.60806L7.91699 4.99956L3.18037 0.391062C2.92951 0.14699 2.5228 0.14699 2.27194 0.391062Z"
      fill="#0C4D91"
    />
  </Svg>
);

// Prev/Next arrow-pair icons — rebuilt from mask-based SVGs as plain fills
const PillArrowLeft = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.5924 0.587077C11.9687 0.953179 11.9687 1.54675 11.5924 1.91285L5.85026 7.49972L11.5924 13.0866C11.9687 13.4527 11.9687 14.0463 11.5924 14.4124C11.2162 14.7785 10.6061 14.7785 10.2298 14.4124L3.125 7.49972L10.2298 0.587077C10.6061 0.220974 11.2162 0.220974 11.5924 0.587077Z"
      fill="#FFFFFF"
    />
  </Svg>
);
const PillArrowRight = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3.40755 0.587077C3.03127 0.953179 3.03127 1.54675 3.40755 1.91285L9.14974 7.49972L3.40755 13.0866C3.03127 13.4527 3.03127 14.0463 3.40755 14.4124C3.78383 14.7785 4.3939 14.7785 4.77018 14.4124L11.875 7.49972L4.77018 0.587077C4.3939 0.220974 3.78383 0.220974 3.40755 0.587077Z"
      fill="#FFFFFF"
    />
  </Svg>
);

// Question-nav-row status dots (Review / Answered legend) — rebuilt from
// mask-based SVGs as plain fills
const AnsweredDotOuter = () => (
  <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
    <Circle cx={4.8} cy={4.8} r={4.5} fill="#E8E9F1" stroke="#0C4D91" strokeWidth={0.6} />
  </Svg>
);
const AnsweredDotInner = () => (
  <Svg width={6} height={6} viewBox="0 0 6 6" fill="none">
    <Circle cx={2.8} cy={2.8} r={2.5} fill="#3BBB06" stroke="#FFFFFF" strokeWidth={0.6} />
  </Svg>
);
const AnsweredIcon = () => (
  <View style={{width: 12, height: 12, alignItems: 'center', justifyContent: 'center'}}>
    <AnsweredDotOuter />
    <View style={{position: 'absolute'}}>
      <AnsweredDotInner />
    </View>
  </View>
);
const ReviewIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Circle cx={6} cy={6} r={6} fill="#0C4D91" />
  </Svg>
);

// Unselected option radio
const RadioUnselected = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx={8} cy={8} r={7.5} stroke="#8F9098" fill="none" />
  </Svg>
);

// Selected option radio — always red per spec (no separate "correct"
// color exists; red is simply what a selected radio looks like,
// regardless of whether the answer is right or wrong).
const RadioSelectedRed = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx={8} cy={8} r={7.5} stroke="#ED3241" fill="none" />
    <Circle cx={8} cy={8} r={4.667} fill="#ED3241" />
  </Svg>
);

// ─── Results / Review icons — per Figma spec (July 2026) ─────────────────

// Small red X shown top-right of a wrong-answer number box
const WrongMarkIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M8.77734 1.27734C9.28087 0.773817 10.0781 0.742791 10.6182 1.18359L10.7227 1.27734L10.8164 1.38184C11.257 1.92184 11.2262 2.71911 10.7227 3.22266H10.7217L7.94434 5.99902L10.7227 8.77734L10.8164 8.88184C11.257 9.42184 11.2262 10.2191 10.7227 10.7227C10.1856 11.2597 9.31425 11.2595 8.77734 10.7227L5.99902 7.94434L3.22266 10.7217V10.7227C2.68565 11.2597 1.81425 11.2595 1.27734 10.7227C0.740373 10.1857 0.740373 9.31431 1.27734 8.77734L4.05371 5.99902L1.27734 3.22266C0.740373 2.68569 0.740373 1.81431 1.27734 1.27734L1.38184 1.18359C1.88602 0.772115 2.61399 0.772084 3.11816 1.18359L3.22266 1.27734L5.99902 4.05371L8.77734 1.27734Z"
      fill="#ED3241"
      stroke="#FFFFFF"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Small green tick shown top-right of a correct-answer number box
const CorrectMarkIcon = () => (
  <Svg width={14} height={11} viewBox="0 0 14 11" fill="none">
    <Path
      d="M10.3711 1.27344C10.9506 0.808911 11.7988 0.850842 12.3301 1.39258C12.8961 1.96986 12.8879 2.89689 12.3115 3.46387L6.35742 9.32129C6.06556 9.60837 5.59655 9.60836 5.30469 9.32129L1.6875 5.7627C1.11134 5.19571 1.10304 4.26861 1.66895 3.69141L1.7793 3.58984C2.31234 3.14625 3.08798 3.13925 3.62891 3.57324L3.74023 3.67285L5.83008 5.72754L10.2588 1.37305L10.3711 1.27344Z"
      fill="#3BBB06"
      stroke="#FFFFFF"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Legend key dots (red/green circle) — rebuilt from mask-based SVGs as
// plain fills, same pattern as the rest of this file.
const IncorrectKeyDot = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Circle cx={7} cy={7} r={7} fill="#ED3241" />
  </Svg>
);
const CorrectKeyDot = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Circle cx={7} cy={7} r={7} fill="#3BBB06" />
  </Svg>
);

// Small filled/outlined circle shown next to each answer option on the
// review screen, marking which option was the correct one / which was
// incorrectly picked.
const CorrectOptionCircle = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx={8} cy={8} r={7.5} stroke="#3BBB06" />
    <Circle cx={8} cy={8} r={4.667} fill="#3BBB06" />
  </Svg>
);
const IncorrectOptionCircle = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx={8} cy={8} r={7.5} stroke="#ED3241" />
    <Circle cx={8} cy={8} r={4.667} fill="#ED3241" />
  </Svg>
);

// Explanation-callout pointer triangle — red/green variants per spec
const ExplanationTriangleRed = () => (
  <Svg width={23} height={18} viewBox="0 0 23 18" fill="none">
    <Path d="M9.52628 1C10.2961 -0.333333 12.2206 -0.333333 12.9904 1L22.5167 17.5H0L9.52628 1Z" fill="#FFE2E5" />
  </Svg>
);
const ExplanationTriangleGreen = () => (
  <Svg width={23} height={18} viewBox="0 0 23 18" fill="none">
    <Path d="M9.52628 1C10.2961 -0.333333 12.2206 -0.333333 12.9904 1L22.5167 17.5H0L9.52628 1Z" fill="#E7F4E8" />
  </Svg>
);

// Restart Quiz button icon — no exact path was given in the spec (only
// the pill container styling), built as a generic circular-arrow reload
// icon consistent with the rest of the icon set. Flag if a real Figma
// path turns up for this one.
const RestartIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M10.5 6a4.5 4.5 0 1 1-1.318-3.182M10.5 1.5v3h-3"
      stroke="#FFFFFF"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const QuizScreen = ({route, navigation}: any) => {
  const {courseId, stepId, courseTitle: routeCourseTitle, lessonTitle: routeLessonTitle} = route?.params || {};
  const [quizData, setQuizData] = useState<QuizResponse | null>(null);
  const [activity, setActivity] = useState<CourseActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  // CONFIRMED bug fix: previously this screen only knew the course/lesson
  // titles if they were passed in via route.params — but StepContentScreen's
  // own prev/next buttons never relayed them (and always routed to
  // 'StepContent' even for a quiz step, a separate bug fixed alongside this
  // one). Now self-sufficient: fetches getCourseActivity itself, same as
  // StepContentScreen already does, and derives titles from real data
  // regardless of how this screen was reached. routeCourseTitle/
  // routeLessonTitle above are kept only as a fallback for the instant
  // before this fetch resolves.
  const [screenMode, setScreenMode] = useState<'landing' | 'quiz' | 'results' | 'review'>('landing'); // per Figma (July 2026)
  const quizStartTimeRef = React.useRef<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<QuizSubmitResponse | null>(null);
  const [reviewIdx, setReviewIdx] = useState(0);
  // Local-only answer tracking — see file header note, nothing persists
  // to a backend since no submit/save-answer endpoint is confirmed.
  // CONFIRMED bug fix: was Record<number, number> (one answer index per
  // question), which made multi-answer questions ("Select all that
  // apply" in the question text) behave as single-select radios — only
  // one option could ever be selected at a time even though the question
  // asked for several. Now stores an array of selected indices per
  // question; single-select questions just happen to have arrays of
  // length 0 or 1.
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number[]>>({}); // questionId -> answerIdx[]
  const [reviewMode, setReviewMode] = useState<Record<number, boolean>>({}); // questionId -> is under review

  useEffect(() => {
    (async () => {
      if (!courseId || !stepId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const uid = await getUserIdFromToken();
      const [quizRes, activityRes] = await Promise.all([
        getQuiz(courseId, stepId, uid || 0),
        getCourseActivity(courseId, uid || 0),
      ]);
      setQuizData(quizRes);
      setActivity(activityRes);
      setLoading(false);
    })();
  }, [courseId, stepId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#0C4D91" style={{marginTop: 60}} />
      </SafeAreaView>
    );
  }

  if (!quizData?.quiz?.questions?.length) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyText}>{'Quiz not found or has no questions.'}</Text>
      </SafeAreaView>
    );
  }

  const {quiz} = quizData;
  const questions = quiz.questions;
  const current: QuizQuestion = questions[currentIdx];
  const selectedForCurrent = selectedAnswers[current.id] || [];
  const isAnswered = selectedForCurrent.length > 0;
  const isUnderReview = !!reviewMode[current.id];

  // CONFIRMED bug fix (see selectedAnswers note above): question_type is
  // only confirmed to be 'single' in the real sample data we have — no
  // real multi-answer question_type value has been confirmed yet, so this
  // also checks the question text itself for "select all that apply" as a
  // second signal, since that's directly visible/confirmed on real
  // questions. Flag to Robby/Marium if a real multi-answer question_type
  // value turns up so this can rely on that instead of a text match.
  const isMultiSelect = (q: QuizQuestion) =>
    (q.question_type && q.question_type !== 'single') ||
    /select all that apply/i.test(q.question || '');

  // Find the lesson (module) this quiz belongs to by searching all lessons
  // for a quiz with a matching id — avoids needing lessonId passed via
  // route params at all, since the quiz's own id uniquely identifies it
  // within the course's curriculum.
  const lesson: CourseLesson | undefined = activity?.course.lessons.find((l) =>
    l.quizzes.some((q) => q.id === stepId),
  );
  const courseTitle = activity?.course.title || routeCourseTitle;
  const lessonTitle = (lesson?.title || routeLessonTitle || '').replace(/&#8211;/g, '–');
  const allSteps = lesson ? [...lesson.topics, ...lesson.quizzes] : [];
  const stepPos = allSteps.findIndex((s) => s.id === stepId);
  const prevSiblingStep = stepPos > 0 ? allSteps[stepPos - 1] : null;
  const nextSiblingStep =
    stepPos >= 0 && stepPos < allSteps.length - 1 ? allSteps[stepPos + 1] : null;
  const isQuizStep = (step: {id: number} | null) => !!step && !!lesson?.quizzes.some((q) => q.id === step.id);

  // CONFIRMED bug fix: routing now checks whether the target step is a
  // quiz or a topic and sends it to the correct screen — StepContentScreen
  // previously always routed prev/next to 'StepContent' even when the
  // target was a quiz.
  const goToSiblingStep = (step: {id: number} | null) => {
    if (!step || !lesson) return;
    if (isQuizStep(step)) {
      navigation?.navigate?.('Quiz', {courseId, stepId: step.id});
    } else {
      navigation?.navigate?.('StepContent', {courseId, stepId: step.id, lessonId: lesson.id});
    }
  };

  const selectAnswer = (answerIdx: number) => {
    setSelectedAnswers((prev) => {
      if (isMultiSelect(current)) {
        const existing = prev[current.id] || [];
        const next = existing.includes(answerIdx)
          ? existing.filter((i) => i !== answerIdx)
          : [...existing, answerIdx];
        return {...prev, [current.id]: next};
      }
      return {...prev, [current.id]: [answerIdx]};
    });
  };

  const toggleReview = () => {
    setReviewMode((prev) => ({...prev, [current.id]: !prev[current.id]}));
  };

  const goPrev = () => setCurrentIdx((i) => Math.max(0, i - 1));
  const goNext = () => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1));

  const handleStartQuiz = () => {
    quizStartTimeRef.current = Date.now();
    setScreenMode('quiz');
  };

  // CONFIRMED endpoint (Robby, July 2026) — see coursesApi.ts submitQuiz
  // for the full contract note. Sends every question's selected indexes
  // (empty array if unanswered) plus elapsed time, gets back full grading
  // in one response.
  const handleFinishQuiz = async () => {
    const uid = await getUserIdFromToken();
    const timespent = quizStartTimeRef.current ? Math.round((Date.now() - quizStartTimeRef.current) / 1000) : 0;
    const answers = questions.map((q) => ({
      question_id: q.id,
      selected_indexes: selectedAnswers[q.id] || [],
    }));
    setSubmitting(true);
    setSubmitError(null);
    const res = await submitQuiz(courseId, stepId, {user_id: uid || 0, timespent, answers});
    setSubmitting(false);
    if (!res?.success) {
      setSubmitError('Could not submit the quiz. Please check your connection and try again.');
      return;
    }
    setSubmitResult(res);
    setScreenMode('results');
  };

  const handleRestartQuiz = () => {
    setSelectedAnswers({});
    setReviewMode({});
    setCurrentIdx(0);
    setReviewIdx(0);
    setSubmitResult(null);
    setSubmitError(null);
    setScreenMode('landing');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()}>
          <BackIcon />
        </TouchableOpacity>
        <TouchableOpacity>
          <ExpandIcon />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Breadcrumb — now derived from this screen's own getCourseActivity
            fetch (see note above), not solely from route params, so it
            shows the full 3-level path regardless of how the screen was
            reached. */}
        <View style={styles.breadcrumbRow}>
          {courseTitle ? (
            <>
              <Text style={styles.breadcrumbText}>{courseTitle}</Text>
              <BreadcrumbArrow />
            </>
          ) : null}
          {lessonTitle ? (
            <>
              <Text style={styles.breadcrumbText}>{lessonTitle}</Text>
              <BreadcrumbArrow />
            </>
          ) : null}
          <Text style={styles.breadcrumbTextActive}>{quiz.title}</Text>
        </View>

        {screenMode === 'landing' ? (
          <>
            {/* Start Quiz landing screen — per Figma (July 2026). Reuses the
                same prev/next pill styling and arrow icons already built for
                the in-quiz question navigation below, and the same
                full-width pill button style used elsewhere on this screen
                (Next/Finish, Review Question). Prev/next here move between
                SIBLING STEPS in the module (mirrors StepContentScreen's
                prev/next pattern), not between quiz questions — that only
                starts once "Start Quiz" is tapped. */}
            <View style={styles.prevNextGroup}>
              <TouchableOpacity
                style={[styles.prevBtn, !prevSiblingStep && styles.navBtnDisabled]}
                disabled={!prevSiblingStep}
                onPress={() => goToSiblingStep(prevSiblingStep)}>
                <PillArrowLeft />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, !nextSiblingStep && styles.navBtnDisabled]}
                disabled={!nextSiblingStep}
                onPress={() => goToSiblingStep(nextSiblingStep)}>
                <PillArrowRight />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.nextQuestionBtn} onPress={handleStartQuiz}>
              <Text style={styles.nextQuestionBtnText}>{'Start Quiz'}</Text>
            </TouchableOpacity>
          </>
        ) : screenMode === 'quiz' ? (
          <>
        {/* Prev/Next pill pair */}
        <View style={styles.prevNextGroup}>
          <TouchableOpacity
            style={[styles.prevBtn, currentIdx === 0 && styles.navBtnDisabled]}
            disabled={currentIdx === 0}
            onPress={goPrev}>
            <PillArrowLeft />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.nextBtn, currentIdx === questions.length - 1 && styles.navBtnDisabled]}
            disabled={currentIdx === questions.length - 1}
            onPress={goNext}>
            <PillArrowRight />
          </TouchableOpacity>
        </View>

        {/* Question number grid */}
        <View style={styles.numberRow}>
          {questions.map((q, idx) => {
            const answered = (selectedAnswers[q.id] || []).length > 0;
            const isCurrent = idx === currentIdx;
            return (
              <TouchableOpacity key={q.id} style={styles.numberBoxWrap} onPress={() => setCurrentIdx(idx)}>
                <View style={[styles.numberBox, isCurrent && styles.numberBoxCurrent]}>
                  <Text style={styles.numberBoxText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                    {idx + 1}
                  </Text>
                </View>
                {/* Answered marker (green, top-right) ONLY reflects real
                    answered state — previously also showed (via a
                    different but visually near-identical green marker)
                    whenever a question was simply the CURRENT one, which
                    made it look like viewing/reviewing a question marked
                    it as answered when it hadn't been. "Current" is now
                    shown as a border highlight on the box instead, fully
                    decoupled from "answered". */}
                {answered && (
                  <View style={styles.numberBoxMarker}>
                    <AnsweredIcon />
                  </View>
                )}
                {/* Review marker (blue, top-left) — matches the "Review"
                    legend dot below. Previously the Review Question toggle
                    updated reviewMode state but nothing ever reflected it
                    on the number box itself — this was the actual missing
                    piece, not a bug in the answered-marker logic. A
                    question can be both under-review AND answered at the
                    same time, so both markers can show simultaneously. */}
                {!!reviewMode[q.id] && (
                  <View style={styles.numberBoxReviewMarker}>
                    <ReviewIcon />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Review / Answered legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <ReviewIcon />
            <Text style={styles.legendText}>{'Review'}</Text>
          </View>
          <View style={styles.legendItem}>
            <AnsweredIcon />
            <Text style={styles.legendText}>{'Answered'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.reviewBtn} onPress={toggleReview}>
          <Text style={styles.reviewBtnText}>{isUnderReview ? 'Unmark Review' : 'Review Question'}</Text>
        </TouchableOpacity>

        {/* Question + options */}
        <Text style={styles.questionText}>{stripHtmlTags(current.question)}</Text>

        <View style={{alignSelf: 'stretch', gap: 12}}>
          {current.answers.map((answer, idx) => {
            const selected = selectedForCurrent.includes(idx);
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.optionFrame, selected && styles.optionFrameSelected]}
                onPress={() => selectAnswer(idx)}
                activeOpacity={0.8}>
                {selected ? <RadioSelectedRed /> : <RadioUnselected />}
                <Text style={styles.optionText}>{answer.answer}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {submitError ? <Text style={styles.submitErrorText}>{submitError}</Text> : null}

        <TouchableOpacity
          style={[styles.nextQuestionBtn, submitting && styles.completeBtnDisabled]}
          disabled={submitting}
          onPress={currentIdx === questions.length - 1 ? handleFinishQuiz : goNext}>
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.nextQuestionBtnText}>
              {currentIdx === questions.length - 1 ? 'Finish' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
          </>
        ) : screenMode === 'results' && submitResult ? (
          <>
            {/* Results screen — per Figma spec (July 2026), now wired to the
                CONFIRMED submitQuiz response. */}
            <Text style={styles.resultsHeading}>{'Results'}</Text>
            <View style={{alignSelf: 'stretch', gap: 16}}>
              <Text style={styles.resultsSubtext}>
                {`${submitResult.results.filter((q) => q.correct).length} of ${questions.length} Questions answered correctly`}
              </Text>
              <View>
                <Text style={styles.yourTimeLabel}>{'YOUR TIME'}</Text>
                <Text style={styles.yourTimeValue}>{submitResult.timespent_formatted}</Text>
              </View>
              <View style={styles.percentageFrame}>
                <Text style={styles.percentageText}>
                  {`You have reached ${submitResult.score} of ${submitResult.points_total} point(s), (${submitResult.percentage.toFixed(2)}%)`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.nextQuestionBtn}
                onPress={() => {
                  setReviewIdx(0);
                  setScreenMode('review');
                }}>
                <Text style={styles.nextQuestionBtnText}>{'View Questions'}</Text>
              </TouchableOpacity>
              {submitResult.can_retake ? (
                <TouchableOpacity style={styles.nextQuestionBtn} onPress={handleRestartQuiz}>
                  <RestartIcon />
                  <Text style={styles.nextQuestionBtnText}>{'Restart Quiz'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        ) : screenMode === 'review' && submitResult ? (
          <>
            {/* View Questions review screen — per Figma spec (July 2026).
                UPDATED (Aug 2026) per Robby: the submit response IS the
                review data, self-contained (question text, type, and
                per-option answers all included) — no second call needed
                for this attempt. Still matches graded results back to the
                original questions list by question_id for the number-row
                ordering (kept as the safer option in case results[] order
                ever differs from questions[] order), but question text
                and answer options now come from the graded response
                itself (graded.question / graded.answers) rather than
                cross-referencing the original quiz's questions[]. */}
            {(() => {
              const gradedByQid: Record<number, typeof submitResult.results[number]> = {};
              submitResult.results.forEach((gq) => {
                gradedByQid[gq.question_id] = gq;
              });
              const reviewQ = questions[reviewIdx];
              const graded = reviewQ ? gradedByQid[reviewQ.id] : undefined;

              return (
                <>
                  <View style={styles.numberRow}>
                    {questions.map((q, idx) => {
                      const gq = gradedByQid[q.id];
                      const isCurrent = idx === reviewIdx;
                      return (
                        <TouchableOpacity key={q.id} style={styles.numberBoxWrap} onPress={() => setReviewIdx(idx)}>
                          <View
                            style={[
                              styles.numberBox,
                              gq?.correct ? styles.numberBoxCorrect : styles.numberBoxIncorrect,
                              isCurrent && styles.numberBoxCurrent,
                            ]}>
                            <Text style={styles.numberBoxText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                              {idx + 1}
                            </Text>
                          </View>
                          <View style={styles.numberBoxMarker}>
                            {gq?.correct ? <CorrectMarkIcon /> : <WrongMarkIcon />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <IncorrectKeyDot />
                      <Text style={styles.legendText}>{'Incorrect'}</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <CorrectKeyDot />
                      <Text style={styles.legendText}>{'Correct'}</Text>
                    </View>
                  </View>

                  {reviewQ && graded ? (
                    <>
                      <Text style={styles.questionText}>{stripHtmlTags(graded.question || reviewQ.question)}</Text>
                      <View style={{alignSelf: 'stretch', gap: 16}}>
                        {graded.answers.map((answer, idx) => {
                          const wasSelected = answer.selected;
                          const isCorrectOption = answer.is_correct;
                          if (isCorrectOption) {
                            return (
                              <View key={idx} style={styles.correctOptionBox}>
                                <View style={styles.optionLabelRow}>
                                  <CorrectOptionCircle />
                                  <Text style={styles.correctOptionLabel}>{'Correct Answer'}</Text>
                                </View>
                                <Text style={styles.optionReviewText}>{answer.answer}</Text>
                              </View>
                            );
                          }
                          if (wasSelected) {
                            return (
                              <View key={idx} style={styles.incorrectOptionBox}>
                                <View style={styles.optionLabelRow}>
                                  <IncorrectOptionCircle />
                                  <Text style={styles.incorrectOptionLabel}>{'Incorrect Answer'}</Text>
                                </View>
                                <Text style={styles.optionReviewText}>{answer.answer}</Text>
                              </View>
                            );
                          }
                          return null;
                        })}
                      </View>

                      {graded.explanation ? (
                        <View style={{alignSelf: 'stretch', alignItems: 'center'}}>
                          <View style={{marginBottom: -1}}>
                            {graded.correct ? <ExplanationTriangleGreen /> : <ExplanationTriangleRed />}
                          </View>
                          <View
                            style={[
                              styles.explanationBox,
                              graded.correct ? styles.explanationBoxCorrect : styles.explanationBoxIncorrect,
                            ]}>
                            <Text style={[styles.explanationLabel, {color: graded.correct ? '#3BBB06' : '#ED3241'}]}>
                              {graded.correct ? 'CORRECT' : 'INCORRECT'}
                            </Text>
                            <Text style={styles.explanationText}>{graded.explanation}</Text>
                            {graded.reference ? (
                              <Text style={styles.referenceText}>{`Reference: ${graded.reference}`}</Text>
                            ) : null}
                          </View>
                        </View>
                      ) : null}
                    </>
                  ) : null}
                </>
              );
            })()}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

// Strip any inline HTML in question text (confirmed: at least one question
// type, cloze_answer, wraps its prompt in <p> tags — e.g. "<p>Fill in the
// blanks.</p>")
const stripHtmlTags = (s: string) => s.replace(/<[^>]+>/g, '').trim();

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  emptyText: {color: '#8F9098', fontFamily: 'Runda-Normal', fontSize: 14, textAlign: 'center', marginTop: 40},
  headerRow: {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12},
  scrollContent: {paddingHorizontal: 16, paddingBottom: 24, gap: 24, alignItems: 'flex-start'},

  breadcrumbRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 6, alignSelf: 'stretch', flexWrap: 'wrap'},
  breadcrumbText: {color: '#0C4D91', fontFamily: 'Runda-Medium', fontSize: 12, width: 104},
  breadcrumbTextActive: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 12, width: 104},

  prevNextGroup: {flexDirection: 'row', alignSelf: 'flex-start'},
  prevBtn: {
    width: 61,
    height: 32,
    paddingTop: 9,
    paddingBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 50,
    borderBottomLeftRadius: 50,
    backgroundColor: '#7C86A1',
  },
  nextBtn: {
    width: 61,
    height: 32,
    paddingTop: 9,
    paddingBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 50,
    borderBottomRightRadius: 50,
    backgroundColor: '#7C86A1',
  },
  navBtnDisabled: {opacity: 0.4},

  numberRow: {flexDirection: 'row', justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch', flexWrap: 'wrap', gap: 9},
  numberBoxWrap: {position: 'relative'},
  numberBox: {
    minWidth: 25,
    height: 25,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#8F9098',
  },
  numberBoxCurrent: {borderColor: '#0C4D91', borderWidth: 2},
  numberBoxText: {color: '#192546', textAlign: 'center', fontFamily: 'Runda-Medium', fontSize: 12},
  numberBoxMarker: {position: 'absolute', top: -2, right: -2},
  numberBoxReviewMarker: {position: 'absolute', top: -2, left: -2},

  legendRow: {flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, alignSelf: 'stretch'},
  legendItem: {flexDirection: 'row', alignItems: 'center', gap: 6},
  legendText: {color: '#192546', textAlign: 'center', fontFamily: 'Runda-Medium', fontSize: 12},

  reviewBtn: {
    height: 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 100,
    backgroundColor: '#0C4D91',
  },
  reviewBtnText: {color: '#FFFFFF', fontFamily: 'Runda-Medium', fontSize: 14},

  questionText: {color: '#192546', fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16, alignSelf: 'stretch'},

  optionFrame: {
    width: 358,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E8E9F1',
    backgroundColor: '#FFFFFF',
  },
  optionFrameSelected: {borderColor: '#0C4D91'},
  optionText: {flex: 1, color: '#192546', fontFamily: 'Runda-Medium', fontSize: 12},

  nextQuestionBtn: {
    flexDirection: 'row',
    height: 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
    borderRadius: 100,
    backgroundColor: '#0C4D91',
  },
  nextQuestionBtnText: {color: '#FFFFFF', fontFamily: 'Runda-Medium', fontSize: 14},
  completeBtnDisabled: {opacity: 0.6},
  submitErrorText: {color: '#ED3241', fontFamily: 'Runda-Normal', fontSize: 12, alignSelf: 'stretch'},

  // ─── Results screen ─────────────────────────────────────────────────
  resultsHeading: {
    color: '#192546',
    textAlign: 'center',
    fontFamily: 'Runda-Bold',
    fontSize: 18,
    letterSpacing: 0.09,
    alignSelf: 'stretch',
  },
  resultsSubtext: {color: '#192546', textAlign: 'center', fontFamily: 'Runda-Normal', fontSize: 16, lineHeight: 20},
  yourTimeLabel: {color: '#192546', textAlign: 'center', fontFamily: 'Runda-Medium', fontSize: 16, lineHeight: 20, letterSpacing: 0.08},
  yourTimeValue: {color: '#8F9098', textAlign: 'center', fontFamily: 'Runda-Medium', fontSize: 16, lineHeight: 20, letterSpacing: 0.08},
  percentageFrame: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#8F9098',
  },
  percentageText: {color: '#192546', textAlign: 'center', fontFamily: 'Runda-Normal', fontSize: 16, lineHeight: 20},

  // ─── Review screen ──────────────────────────────────────────────────
  numberBoxCorrect: {borderColor: '#3BBB06', backgroundColor: '#E7F4E8'},
  numberBoxIncorrect: {borderColor: '#ED3241', backgroundColor: '#FFE2E5'},
  correctOptionBox: {width: 358, padding: 12, alignItems: 'flex-start', gap: 5, alignSelf: 'stretch'},
  incorrectOptionBox: {
    width: 358,
    padding: 12,
    alignItems: 'flex-start',
    gap: 10,
    alignSelf: 'stretch',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ED3241',
    backgroundColor: '#FFE2E5',
  },
  optionLabelRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  correctOptionLabel: {color: '#3BBB06', fontFamily: 'Runda-Medium', fontSize: 10},
  incorrectOptionLabel: {color: '#ED3241', fontFamily: 'Runda-Medium', fontSize: 10},
  optionReviewText: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 12},
  explanationBox: {
    width: 358,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    borderRadius: 5,
  },
  explanationBoxIncorrect: {backgroundColor: '#FFE2E5'},
  explanationBoxCorrect: {backgroundColor: '#E7F4E8'},
  explanationLabel: {fontFamily: 'Runda-Bold', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase'},
  explanationText: {color: '#192546', fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16, textAlign: 'center'},
  referenceText: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 12, textAlign: 'center', textDecorationLine: 'underline'},
});

export default QuizScreen;

/* ─────────────────────────────────────────────────────────────────────────
   STILL OPEN — flagged, not guessed:

   1. Only 'single' question_type is fully handled (radio-select, matches
      the Figma). 'cloze_answer' (confirmed to exist — fill-in-the-blank
      style, e.g. "Stakeholder Engagement is the practice of... {relationship}
      building") falls back to rendering its answers[] as radio options too,
      which is almost certainly wrong for that question type — no fill-in-
      the-blank UI has been specced. Flag before this ships if any real
      quiz has cloze_answer questions (the sample data does).

   2. UPDATED (Aug 2026): field names revised per Robby's more specific
      confirmation — the earlier July 2026 description used is_correct/
      selected_indexes/correct_indexes at the question level; those were
      wrong and have been replaced with correct/user_answer/correct_answer
      (see coursesApi.ts's GradedQuestionResult). Question text and type
      are now included directly in each graded result too — the Review
      screen no longer needs quiz.questions[] for question text/answer
      options, only for the number-row's question count/ordering.
      REMAINING CAVEAT: user_answer/correct_answer's exact shape (string?
      index? array?) is still NOT Postman-verified — this screen
      deliberately doesn't use either field; it renders entirely from the
      reconfirmed per-option `answers[].selected`/`is_correct` array
      instead, which IS safe to build against. Get a real submit response
      pasted before trusting user_answer/correct_answer for anything.

   3. RESOLVED (July 2026): breadcrumb now derives course/lesson titles
      from this screen's own getCourseActivity fetch rather than depending
      on route params.

   4. "Review Question" toggle and the Review/Answered dots (on the
      in-quiz question grid, before submission) are real, working local UI
      state — but since nothing persists, they reset if the screen
      unmounts/remounts. This is separate from the post-submit Review
      screen, which is driven by the real graded response instead.

   5. This screen needs registering in AppNavigator as route 'Quiz'
      (assumed name, not confirmed) — expects {courseId, stepId} params.
      The Modules tab's step-press handler currently routes quiz-type
      steps to 'StepContent', not this new screen — needs updating to
      distinguish quiz steps and route them here instead.

   6. getQuizResults (viewing past results without resubmitting, e.g.
      revisiting a completed quiz's step and seeing prior results
      immediately rather than needing to retake it) is added to
      coursesApi.ts but not yet wired into this screen — currently only
      reachable via a fresh submit. Worth wiring on initial load: if the
      step is already completed, fetch results instead of/alongside the
      quiz and go straight to the Results screen. UPDATED (Aug 2026):
      getQuizResults now takes an optional quiz_key (returned as
      submitResult.quiz_key from a fresh submit) instead of user_id —
      omit it to get the latest attempt. If wiring this for "revisit a
      completed quiz," omitting quiz_key is almost certainly the right
      call here, since there's no prior quiz_key to pass in that flow.
──────────────────────────────────────────────────────────────────────── */
