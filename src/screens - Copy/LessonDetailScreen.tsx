/* eslint-disable prettier/prettier */
import React, {useRef, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, StatusBar, Linking, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import {markStepComplete} from '../api/coursesApi';
import {getUserIdFromToken} from '../api/profileApi';

// ─── Confirmed APIs ─────────────────────────────────────────────────────
// Same blocker as CourseDetailScreen — LearnDash REST still 401ing as of
// June 18 2026. Quiz questions, eBook access links, materials/PDF URLs,
// and comments are all placeholder-shaped here, not yet verified against
// the live backend. Swap in real fetches once Robby resolves permissions.
//
// Likely real endpoints once unblocked:
//   GET /ldlms/v1/sfwd-quiz/{id}              → quiz questions + options
//   POST /ldlms/v1/sfwd-quiz/{id}/attempts     → submit quiz answer
//   GET /wp/v2/comments?post={topicId}         → topic comments
//   POST /wp/v2/comments                       → post a new comment
//   PDF/eBook delivery — likely VitalSource SSO link or media URL, unconfirmed.

const CHEV_LEFT = (active: boolean) => (
  <Svg width={8} height={8} viewBox="0 0 9 9" fill="none">
    <Path
      d="M2.65508 3.61836L2.56543 3.71738C2.17468 4.19622 2.17468 4.88854 2.56543 5.36738L2.65508 5.46641L6.0459 8.85664L6.93184 7.97188L6.71973 7.75918L3.54043 4.58047C3.51991 4.55922 3.52011 4.52471 3.54102 4.50371L6.93359 1.10996L6.04824 0.224609L2.65508 3.61836Z"
      fill={active ? '#192546' : '#C4C8D6'}
    />
  </Svg>
);

const CHEV_RIGHT = (active: boolean) => (
  <Svg width={8} height={8} viewBox="0 0 9 9" fill="none">
    <Path
      d="M6.34492 5.38164L6.43457 5.28262C6.82532 4.80378 6.82532 4.11146 6.43457 3.63262L6.34492 3.53359L2.9541 0.143359L2.06816 1.02812L2.28027 1.24082L5.45957 4.41953C5.48009 4.44078 5.47989 4.47529 5.45898 4.49629L2.06641 7.89004L2.95176 8.77539L6.34492 5.38164Z"
      fill={active ? '#192546' : '#C4C8D6'}
    />
  </Svg>
);

const CHEVRON_DOWN = (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path d="M3 5L7 9L11 5" stroke="#8F9098" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CHEVRON_UP = (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path d="M3 9L7 5L11 9" stroke="#0C4D91" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EXPAND_ICON = (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M6 2H2V6M10 14H14V10M14 6V2H10M2 10V14H6" stroke="#192546" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PDF_ICON = (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M4 2h8l4 4v12H4V2z" stroke="#E5484D" strokeWidth={1.4} fill="#FDEAEA" />
    <Path d="M12 2v4h4" stroke="#E5484D" strokeWidth={1.4} fill="none" />
  </Svg>
);

// ─── Placeholder data ─────────────────────────────────────────────────────
const PLACEHOLDER_QUIZ_QUESTIONS = [
  {
    id: 'q1',
    number: 1,
    answered: true,
    text: 'A ……. is a collection of projects or programs grouped together for strategic business needs.',
    options: [
      {id: 'o1', label: 'Portfolio'},
      {id: 'o2', label: 'Management System'},
      {id: 'o3', label: 'Enterprise'},
      {id: 'o4', label: 'Array'},
    ],
    selectedOptionId: 'o1',
  },
  {
    id: 'q2',
    number: 2,
    answered: false,
    text: 'Which of the following statements is correct?',
    options: [
      {id: 'o1', label: 'A collection of unrelated programs can constitute a portfolio'},
      {id: 'o2', label: 'The scope of a portfolio is typically smaller than that of a program'},
      {id: 'o3', label: 'A program is a group of unrelated projects'},
      {id: 'o4', label: 'A program need not consist of projects'},
    ],
    selectedOptionId: null,
  },
];

const PLACEHOLDER_COMMENTS = [
  {
    id: 'c1',
    name: 'Camila Cabello',
    avatar: null,
    date: '3 Feb 2024 at 4:20 pm',
    text: 'Hi, I\u2019m having trouble understanding the materials.',
  },
  {
    id: 'c2',
    name: 'Andrew Bell',
    avatar: null,
    date: '4 Feb 2024 at 9:05 am',
    text: 'Happy to help \u2014 which section is giving you trouble?',
  },
];

const PLACEHOLDER_EBOOK_STEPS = [
  'Click on the link for your Certified Project Management Diploma eBook. You will be taken to a VitalSource Screen asking you to sign in, create an account, or skip this step.',
  'If you already have a VitalSource account, enter your Email and password (password used for the alternative login if available). Otherwise, skip this step and proceed to access your eBook without an account.',
  'You should be able to access your course materials via the VitalSource Bookshelf e-reader.',
];

// ─── Breadcrumb + nav header ────────────────────────────────────────────
const BreadcrumbHeader = ({trail, onBack, onExpand, onPrev, onNext, canPrev, canNext}: any) => (
  <View style={bc.wrap}>
    <View style={bc.trailRow}>
      <Text style={bc.trailText} numberOfLines={1}>
        {trail.map((t: string, i: number) => (
          <Text key={i}>
            <Text style={i === trail.length - 1 ? bc.trailCurrent : bc.trailLink}>{t}</Text>
            {i < trail.length - 1 ? '  >  ' : ''}
          </Text>
        ))}
      </Text>
      <TouchableOpacity onPress={onExpand} style={bc.expandBtn}>
        {EXPAND_ICON}
      </TouchableOpacity>
    </View>
    <View style={bc.navRow}>
      <TouchableOpacity
        style={[bc.navBtn, !canPrev && bc.navBtnDisabled]}
        disabled={!canPrev}
        onPress={onPrev}>
        {CHEV_LEFT(canPrev)}
      </TouchableOpacity>
      <TouchableOpacity
        style={[bc.navBtn, !canNext && bc.navBtnDisabled]}
        disabled={!canNext}
        onPress={onNext}>
        {CHEV_RIGHT(canNext)}
      </TouchableOpacity>
    </View>
  </View>
);

const bc = StyleSheet.create({
  wrap: {marginBottom: 16},
  trailRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12},
  trailText: {flex: 1, fontFamily: 'Runda', fontSize: 11, lineHeight: 16},
  trailLink: {color: '#0C4D91'},
  trailCurrent: {color: '#192546', fontWeight: '700'},
  expandBtn: {padding: 4},
  navRow: {flexDirection: 'row', gap: 8},
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E8E9F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {opacity: 0.5},
});

// ─── Status pill (In Progress / Complete) ──────────────────────────────────
const StatusPill = ({status}: {status: 'in_progress' | 'complete'}) => (
  <View style={[pill.base, status === 'complete' && pill.complete]}>
    <Text style={pill.text}>{status === 'complete' ? 'Complete' : 'In Progress'}</Text>
    {status === 'complete' && <Text style={pill.check}>{'✓'}</Text>}
  </View>
);

const pill = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#192546',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  complete: {backgroundColor: '#0C4D91'},
  text: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 12, fontWeight: '700'},
  check: {color: '#FFFFFF', fontSize: 12, fontWeight: '800'},
});

// ─── Module progress bar (used on Scenario / generic content lessons) ──────
const ModuleProgress = ({percent}: {percent: number}) => (
  <View style={mp.wrap}>
    <Text style={mp.label}>{'MODULE PROGRESS'}</Text>
    <View style={mp.track}>
      <View style={[mp.fill, {width: `${percent}%`}]} />
    </View>
    <Text style={mp.percent}>{`${percent}% Complete`}</Text>
  </View>
);

const mp = StyleSheet.create({
  wrap: {marginBottom: 16},
  label: {fontFamily: 'Runda', fontSize: 11, fontWeight: '700', color: '#8F9098', letterSpacing: 0.5, marginBottom: 8},
  track: {height: 10, borderRadius: 20, backgroundColor: '#E8E9F1', overflow: 'hidden', marginBottom: 6},
  fill: {height: '100%', borderRadius: 20, backgroundColor: '#46B0E3'},
  percent: {fontFamily: 'Runda', fontSize: 11, color: '#8F9098'},
});

// ─── SCENARIO / rich-text lesson content ───────────────────────────────────
const ScenarioContent = ({lesson}: any) => (
  <View>
    {lesson.bannerImage ? (
      <Image source={{uri: lesson.bannerImage}} style={sceneS.banner} />
    ) : (
      <View style={[sceneS.banner, sceneS.bannerFallback]} />
    )}
    <Text style={sceneS.body}>
      {'Welcome to the '}
      <Text style={sceneS.bold}>{'Certified Project Management Diploma'}</Text>
      {' course. This self-directed learning program is designed to help you develop new skills at your own pace. We are pleased you chose this course and look forward to the next few weeks with you.'}
    </Text>
    <Text style={sceneS.body}>
      {'The Institute of Project Management in Dublin is dedicated to excellence in training and is passionate about project management. Projects are becoming a megatrend, with research funded by the '}
      <Text style={sceneS.bold}>{'International Project Management Association (IPMA)'}</Text>
      {'. The increasing use of projects makes organizations less rigid, more flexible, innovative, and capable of solving complex problems.'}
    </Text>
    <Text style={sceneS.heading}>{'Study at any time of day (or night)'}</Text>
    <Text style={sceneS.body}>
      {'You will have access to the course content for '}
      <Text style={sceneS.bold}>{'6 Months'}</Text>
      {', allowing you to learn at a pace that suits your schedule.'}
    </Text>
  </View>
);

const sceneS = StyleSheet.create({
  banner: {width: '100%', height: 160, borderRadius: 10, marginBottom: 16},
  bannerFallback: {backgroundColor: '#1A2B5C'},
  body: {fontFamily: 'Runda', fontSize: 13, color: '#4B5563', lineHeight: 21, marginBottom: 14},
  bold: {fontWeight: '700', color: '#192546'},
  heading: {fontFamily: 'Runda', fontSize: 15, fontWeight: '700', color: '#0C4D91', marginBottom: 10},
});

// ─── QUIZ content ───────────────────────────────────────────────────────
const QuestionNav = ({questions, currentIndex, onSelect}: any) => (
  <View style={quizS.navWrap}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={quizS.navScroll}>
      {questions.map((q: any, i: number) => (
        <TouchableOpacity
          key={q.id}
          onPress={() => onSelect(i)}
          style={[
            quizS.navPill,
            i === currentIndex && quizS.navPillCurrent,
            q.answered && i !== currentIndex && quizS.navPillAnswered,
          ]}>
          <Text
            style={[
              quizS.navPillText,
              (i === currentIndex || q.answered) && quizS.navPillTextLight,
            ]}>
            {q.number}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
    <View style={quizS.legendRow}>
      <View style={quizS.legendItem}>
        <View style={[quizS.legendDot, {backgroundColor: '#192546'}]} />
        <Text style={quizS.legendText}>{'Review'}</Text>
      </View>
      <View style={quizS.legendItem}>
        <View style={[quizS.legendDot, {backgroundColor: '#46B0E3'}]} />
        <Text style={quizS.legendText}>{'Answered'}</Text>
      </View>
    </View>
  </View>
);

const QuizContent = ({questions: initialQuestions}: any) => {
  const [questions, setQuestions] = useState(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [started, setStarted] = useState(
    initialQuestions.some((q: any) => q.answered),
  );
  const current = questions[currentIndex];

  const selectOption = (optionId: string) => {
    setQuestions((prev: any[]) =>
      prev.map((q, i) => (i === currentIndex ? {...q, selectedOptionId: optionId, answered: true} : q)),
    );
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  if (!started) {
    return (
      <View>
        <TouchableOpacity style={quizS.startBtn} onPress={() => setStarted(true)} activeOpacity={0.85}>
          <Text style={quizS.startBtnText}>{'Start Quiz'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <QuestionNav questions={questions} currentIndex={currentIndex} onSelect={setCurrentIndex} />
      <TouchableOpacity style={quizS.reviewBtn} activeOpacity={0.85}>
        <Text style={quizS.reviewBtnText}>{'Review Question'}</Text>
      </TouchableOpacity>
      <Text style={quizS.questionText}>{current.text}</Text>
      <View style={quizS.optionsList}>
        {current.options.map((opt: any) => {
          const selected = current.selectedOptionId === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[quizS.optionRow, selected && quizS.optionRowSelected]}
              onPress={() => selectOption(opt.id)}
              activeOpacity={0.7}>
              <View style={[quizS.radio, selected && quizS.radioSelected]}>
                {selected && <View style={quizS.radioDot} />}
              </View>
              <Text style={quizS.optionText}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity style={quizS.nextBtn} onPress={goNext} activeOpacity={0.85}>
        <Text style={quizS.nextBtnText}>{'Next'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const quizS = StyleSheet.create({
  startBtn: {backgroundColor: '#0C4D91', borderRadius: 30, paddingVertical: 15, alignItems: 'center'},
  startBtnText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 15, fontWeight: '700'},
  navWrap: {marginBottom: 14},
  navScroll: {gap: 8, paddingBottom: 10},
  navPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E8E9F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPillCurrent: {backgroundColor: '#192546'},
  navPillAnswered: {backgroundColor: '#46B0E3'},
  navPillText: {fontFamily: 'Runda', fontSize: 12, color: '#8F9098', fontWeight: '600'},
  navPillTextLight: {color: '#FFFFFF'},
  legendRow: {flexDirection: 'row', gap: 16},
  legendItem: {flexDirection: 'row', alignItems: 'center', gap: 6},
  legendDot: {width: 8, height: 8, borderRadius: 4},
  legendText: {fontFamily: 'Runda', fontSize: 11, color: '#8F9098'},
  reviewBtn: {
    backgroundColor: '#0C4D91',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 18,
  },
  reviewBtnText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 13, fontWeight: '700'},
  questionText: {fontFamily: 'Runda', fontSize: 14, fontWeight: '600', color: '#192546', lineHeight: 21, marginBottom: 16},
  optionsList: {gap: 10, marginBottom: 20},
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E8E9F1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  optionRowSelected: {borderColor: '#E5484D'},
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#C4C8D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {borderColor: '#E5484D'},
  radioDot: {width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#E5484D'},
  optionText: {flex: 1, fontFamily: 'Runda', fontSize: 13, color: '#192546'},
  nextBtn: {backgroundColor: '#0C4D91', borderRadius: 30, paddingVertical: 15, alignItems: 'center'},
  nextBtnText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 15, fontWeight: '700'},
});

// ─── EBOOK / MATERIALS content ──────────────────────────────────────────
const CommentRow = ({comment}: any) => (
  <View style={commS.row}>
    <View style={commS.avatarWrap}>
      {comment.avatar ? (
        <Image source={{uri: comment.avatar}} style={commS.avatar} />
      ) : (
        <View style={[commS.avatar, commS.avatarFallback]} />
      )}
    </View>
    <View style={commS.body}>
      <View style={commS.headerRow}>
        <Text style={commS.name}>{comment.name}</Text>
        <Text style={commS.date}>{comment.date}</Text>
      </View>
      <Text style={commS.text}>{comment.text}</Text>
    </View>
  </View>
);

const commS = StyleSheet.create({
  row: {flexDirection: 'row', gap: 10, marginBottom: 16},
  avatarWrap: {width: 32, height: 32, borderRadius: 16, overflow: 'hidden'},
  avatar: {width: '100%', height: '100%'},
  avatarFallback: {backgroundColor: '#0C4D91'},
  body: {flex: 1},
  headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4},
  name: {fontFamily: 'Runda', fontSize: 12, fontWeight: '700', color: '#192546'},
  date: {fontFamily: 'Runda', fontSize: 10, color: '#8F9098'},
  text: {fontFamily: 'Runda', fontSize: 12, color: '#4B5563', lineHeight: 18},
});

const EbookContent = ({lesson}: any) => {
  const [subTab, setSubTab] = useState<'topic' | 'materials'>('topic');
  const [commentsExpanded, setCommentsExpanded] = useState(true);

  return (
    <View>
      <View style={ebookS.subTabs}>
        <TouchableOpacity
          style={[ebookS.subTab, subTab === 'topic' && ebookS.subTabActive]}
          onPress={() => setSubTab('topic')}>
          <Text style={[ebookS.subTabText, subTab === 'topic' && ebookS.subTabTextActive]}>{'Topic'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ebookS.subTab, subTab === 'materials' && ebookS.subTabActive]}
          onPress={() => setSubTab('materials')}>
          <Text style={[ebookS.subTabText, subTab === 'materials' && ebookS.subTabTextActive]}>{'Materials'}</Text>
        </TouchableOpacity>
      </View>

      {subTab === 'topic' ? (
        <View>
          <Text style={ebookS.intro}>{'How to access your eBook via VitalSource'}</Text>
          {PLACEHOLDER_EBOOK_STEPS.map((step, i) => (
            <View key={i} style={ebookS.stepRow}>
              <Text style={ebookS.stepNumber}>{`${i + 1}.`}</Text>
              <Text style={ebookS.stepText}>{step}</Text>
            </View>
          ))}
          <TouchableOpacity
            style={ebookS.readBtn}
            activeOpacity={0.85}
            onPress={() => lesson.ebookLink && Linking.openURL(lesson.ebookLink).catch(() => {})}>
            <Text style={ebookS.readBtnText}>{'Click here to Read eBook'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <TouchableOpacity
            style={ebookS.pdfRow}
            activeOpacity={0.7}
            onPress={() => lesson.pdfLink && Linking.openURL(lesson.pdfLink).catch(() => {})}>
            {PDF_ICON}
            <Text style={ebookS.pdfText}>{'Download pdf'}</Text>
          </TouchableOpacity>

          <View style={ebookS.commentsHeader}>
            <Text style={ebookS.commentsCount}>{`${PLACEHOLDER_COMMENTS.length} Comments`}</Text>
            <TouchableOpacity
              style={ebookS.collapseBtn}
              onPress={() => setCommentsExpanded(v => !v)}>
              <Text style={ebookS.collapseBtnText}>
                {commentsExpanded ? 'Collapse Comments' : 'Show Comments'}
              </Text>
            </TouchableOpacity>
          </View>

          {commentsExpanded && (
            <View style={ebookS.commentsList}>
              {PLACEHOLDER_COMMENTS.map(c => (
                <CommentRow key={c.id} comment={c} />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const ebookS = StyleSheet.create({
  subTabs: {flexDirection: 'row', gap: 24, borderBottomWidth: 1, borderBottomColor: '#E8E9F1', marginBottom: 16},
  subTab: {paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent'},
  subTabActive: {borderBottomColor: '#0C4D91'},
  subTabText: {fontFamily: 'Runda', fontSize: 13, color: '#8F9098', fontWeight: '500'},
  subTabTextActive: {color: '#0C4D91', fontWeight: '700'},
  intro: {fontFamily: 'Runda', fontSize: 13, fontWeight: '700', color: '#192546', marginBottom: 12},
  stepRow: {flexDirection: 'row', gap: 8, marginBottom: 12},
  stepNumber: {fontFamily: 'Runda', fontSize: 12, fontWeight: '700', color: '#0C4D91'},
  stepText: {flex: 1, fontFamily: 'Runda', fontSize: 12, color: '#4B5563', lineHeight: 18},
  readBtn: {backgroundColor: '#0C4D91', borderRadius: 30, paddingVertical: 15, alignItems: 'center', marginTop: 8},
  readBtnText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 14, fontWeight: '700'},
  pdfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  pdfText: {fontFamily: 'Runda', fontSize: 13, fontWeight: '600', color: '#192546'},
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  commentsCount: {fontFamily: 'Runda', fontSize: 13, fontWeight: '700', color: '#192546'},
  collapseBtn: {
    borderWidth: 1,
    borderColor: '#E8E9F1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  collapseBtnText: {fontFamily: 'Runda', fontSize: 11, color: '#0C4D91', fontWeight: '600'},
  commentsList: {},
});

// ─── Mark Complete bar ──────────────────────────────────────────────────
// Sits before the comments/"Post a Comment" area at the bottom of every
// module, per web parity. Calling markStepComplete() is still against an
// UNCONFIRMED endpoint (see coursesApi.ts) — swap in the real
// request/response shape once Robby has built and confirmed it in Postman.
const MarkCompleteBar = ({completed, saving, onPress}: {completed: boolean; saving: boolean; onPress: () => void}) => (
  <TouchableOpacity
    style={[markS.btn, completed && markS.btnDone]}
    onPress={onPress}
    disabled={completed || saving}
    activeOpacity={0.85}>
    {saving ? (
      <ActivityIndicator color="#FFFFFF" />
    ) : (
      <Text style={markS.btnText}>{completed ? 'Completed  ✓' : 'Mark Complete  ✓'}</Text>
    )}
  </TouchableOpacity>
);

const markS = StyleSheet.create({
  btn: {
    backgroundColor: '#0C4D91',
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  btnDone: {backgroundColor: '#46B0E3'},
  btnText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 14, fontWeight: '700'},
});

// ─── Main Screen ─────────────────────────────────────────────────────────
const LessonDetailScreen = ({navigation, route}: any) => {
  const {lesson = {}, course = {}, breadcrumb = []} = route?.params || {};
  const lessonType = lesson.type || 'scenario'; // 'scenario' | 'quiz' | 'ebook'

  const trail = [...breadcrumb, lesson.title || 'Lesson'];

  const scrollRef = useRef<ScrollView>(null);
  const [completed, setCompleted] = useState<boolean>(!!lesson.done);
  const [saving, setSaving] = useState(false);

  const status: 'in_progress' | 'complete' = completed ? 'complete' : 'in_progress';

  const handleMarkComplete = async () => {
    if (completed || saving) return;
    setSaving(true);
    try {
      // NOTE: course.id / lesson.stepId param names are assumed to match
      // what the Modules tab passes when navigating here — no navigation
      // call into this screen exists yet in the files reviewed, so this
      // should be double-checked against whatever route.params shape the
      // Modules tab actually sends once that wiring is built.
      const userId = await getUserIdFromToken();
      const res = userId && course.id && lesson.stepId
        ? await markStepComplete(course.id, lesson.stepId, userId)
        : null;

      // Backend not confirmed yet — fall back to a local-only status flip
      // so the UI is still testable/usable while Robby builds the real
      // endpoint. Once confirmed, this should only flip on res?.success.
      setCompleted(true);

      // "Page reload" per spec = jump back to the top of the module so
      // the Next Module chevron in the breadcrumb header is immediately
      // reachable, without the learner having to scroll up manually.
      scrollRef.current?.scrollTo({y: 0, animated: true});

      if (!res) {
        console.warn('[LessonDetailScreen] markStepComplete: endpoint unconfirmed, applied local-only status');
      }
    } catch (err) {
      console.error('[LessonDetailScreen] handleMarkComplete', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F4F7" />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <BreadcrumbHeader
          trail={trail}
          onBack={() => navigation.goBack()}
          onExpand={() => {}}
          onPrev={() => {}}
          onNext={() => {}}
          canPrev={false}
          canNext={true}
        />

        {lessonType !== 'scenario' && <StatusPill status={status} />}

        <Text style={styles.lessonTitle}>{lesson.title}</Text>

        {lessonType === 'quiz' ? null : <ModuleProgress percent={completed ? 100 : lesson.moduleProgress ?? 0} />}

        {lessonType === 'ebook' && <EbookContent lesson={lesson} />}
        {lessonType === 'quiz' && <QuizContent questions={lesson.questions || PLACEHOLDER_QUIZ_QUESTIONS} />}
        {lessonType === 'scenario' && <ScenarioContent lesson={lesson} />}

        {lessonType !== 'quiz' && (
          <MarkCompleteBar completed={completed} saving={saving} onPress={handleMarkComplete} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F2F4F7'},
  scroll: {flex: 1},
  scrollContent: {padding: 16, paddingBottom: 40},
  lessonTitle: {
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '800',
    color: '#192546',
    marginBottom: 16,
    lineHeight: 24,
  },
});

export default LessonDetailScreen;
