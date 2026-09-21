/* eslint-disable prettier/prettier */
import React, {useState, useRef} from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, StatusBar, Modal, FlatList, Dimensions, Animated, Alert, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import {TIMEZONES, submitMentorApplication} from '../api/mentorApplicationApi';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

// ─── Step config ──────────────────────────────────────────────────────────
const STEPS = [
  'Professional',
  'Profile',
  'Expertise',
  'Who You Help',
  'Support',
  'Session',
  'Availability',
  'Motivation',
  'Consent',
];

// ─── Real option lists — matching live web copy exactly ──────────────────
const EXPERTISE_OPTIONS = [
  'Agile & Scrum',
  'AI in Project Management',
  'Budget & Cost Management',
  'Career Development & Transitions',
  'Change Management',
  'Data Analytics & Reporting',
  'Digital Transformation',
  'Leadership & Team Management',
  'Motivation & Resilience',
  'Negotiation & Communication',
  'Programme Management',
  'Project Planning & Scheduling',
  'Stakeholder Management',
];

const WHO_YOU_HELP_OPTIONS = [
  'Early-career PMs',
  'First-time Team Leads',
  'Project Coordinators',
  'Mid-level PMs',
  'Senior PMs',
  'Career Changers',
  'Other',
];

const SUPPORT_OPTIONS = [
  '1:1 Mentorship Session',
  'CV / LinkedIn Review',
  'Career Guidance',
  'Problem-Solving Support',
];

const SESSION_DURATION_OPTIONS = ['30 minutes', '45 minutes', '60 minutes'];
const LANGUAGE_OPTIONS = [
  'Arabic',
  'English',
  'French',
  'Mandarin',
  'Portuguese',
  'Spanish',
  'Other',
];
const RESPONSE_TIME_OPTIONS = ['Within 24 hours', 'Within 48 hours', 'Within 72 hours'];
const SESSIONS_PER_MONTH_OPTIONS = ['01', '02', '03', '04', '05', '06', '07'];
const AVAILABILITY_OPTIONS = ['Once per week', 'A few times per week', 'Flexible'];

const YEARS_EXPERIENCE_OPTIONS = [
  '1–5 years',
  '5–10 years',
  '10–15 years',
  '15+ years',
];

// ─── Icons ─────────────────────────────────────────────────────────────────
const RadioUnselected = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M8 0.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z"
      stroke="#8F9098"
      fill="none"
    />
  </Svg>
);

const RadioSelected = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M8 0.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z"
      stroke="#46B0E3"
      fill="none"
    />
    <Path
      d="M8 3.333a4.667 4.667 0 1 0 0 9.334 4.667 4.667 0 0 0 0-9.334Z"
      fill="#46B0E3"
    />
  </Svg>
);

const CheckMark = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.754 2.301a1.146 1.146 0 0 1-.011 1.214l-7.146 7.029-4.341-4.272a1.146 1.146 0 0 1-.005-1.213c.332-.338.875-.343 1.213-.011l3.14 3.088 5.943-5.847a1.146 1.146 0 0 1 1.207.012Z"
      fill="#FFFFFF"
    />
  </Svg>
);

const UploadIcon = () => (
  <Svg width={11} height={12} viewBox="0 0 11 12" fill="none">
    <Path
      d="M3.2929 3.19895L4.64534 1.86089L4.65556 8.41749C4.65556 8.81593 4.98216 9.13894 5.38503 9.13894C5.78791 9.13894 6.11451 8.81593 6.11451 8.41749L6.10429 1.86908L7.44897 3.19897C7.72886 3.48557 8.19066 3.4935 8.48044 3.21669C8.77023 2.93987 8.77825 2.48315 8.49836 2.19655C8.49248 2.19053 8.48651 2.18462 8.48044 2.17883L6.91839 0.633943C6.06376 -0.211311 4.67813 -0.211311 3.82348 0.63392L3.82345 0.633943L2.26142 2.17881C1.98153 2.4654 1.98955 2.92213 2.27934 3.19895C2.56203 3.46897 3.0102 3.46897 3.2929 3.19895Z"
      fill="#8F9098"
    />
    <Path
      d="M10.1256 7.16943C9.75274 7.16943 9.45052 7.4631 9.45052 7.82534V9.83285C9.45026 9.93152 9.36801 10.0115 9.26646 10.0117H1.53413C1.43258 10.0114 1.35031 9.93152 1.35007 9.83285V7.82534C1.35007 7.4631 1.04785 7.16943 0.675037 7.16943C0.302227 7.16943 0 7.4631 0 7.82534V9.83285C0.00099146 10.6557 0.687272 11.3225 1.53413 11.3235H9.26644C10.1133 11.3225 10.7996 10.6557 10.8006 9.83285V7.82534C10.8006 7.4631 10.4984 7.16943 10.1256 7.16943Z"
      fill="#8F9098"
    />
  </Svg>
);

// ─── Step indicator row ───────────────────────────────────────────────────
const StepIndicator = ({activeIndex}: {activeIndex: number}) => (
  <View style={s.stepRow}>
    {STEPS.map((label, i) => {
      const isDone = i < activeIndex;
      const isActive = i === activeIndex;
      return (
        <View key={label} style={s.stepItem}>
          <View
            style={[
              s.stepCircle,
              (isDone || isActive) && s.stepCircleFilled,
            ]}>
            {isDone ? (
              <CheckMark />
            ) : (
              <Text
                style={[s.stepNumber, isActive && s.stepNumberActive]}>
                {i + 1}
              </Text>
            )}
          </View>
          <Text style={s.stepLabel} numberOfLines={1}>
            {label}
          </Text>
        </View>
      );
    })}
  </View>
);

// ─── Bottom sheet picker (single-select with Continue) ────────────────────
const PickerSheet = ({
  visible,
  title,
  listLabel,
  items,
  selected,
  onSelect,
  onClose,
  onContinue,
}: any) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <View style={ps.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </View>
      <Animated.View style={[ps.sheet, {transform: [{translateY: slideAnim}]}]}>
        <View style={ps.header}>
          <Text style={ps.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={ps.closeBtn}>
            <Text style={ps.closeIcon}>{'✕'}</Text>
          </TouchableOpacity>
        </View>
        {listLabel ? <Text style={ps.listLabel}>{listLabel}</Text> : null}
        <FlatList
          data={items}
          keyExtractor={(item: string) => item}
          style={ps.list}
          renderItem={({item}: {item: string}) => (
            <TouchableOpacity
              style={[ps.item, selected === item && ps.itemActive]}
              onPress={() => onSelect(item)}>
              <Text style={[ps.itemText, selected === item && ps.itemTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
        <TouchableOpacity style={ps.continueBtn} onPress={onContinue}>
          <Text style={ps.continueBtnText}>{'Continue'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const ps = StyleSheet.create({
  backdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)'},
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.75,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {fontSize: 17, fontWeight: '700', color: '#0C4D91', fontFamily: 'Runda'},
  closeBtn: {position: 'absolute', right: 16, padding: 4},
  closeIcon: {fontSize: 18, color: '#8F9098'},
  listLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#192546',
    fontFamily: 'Runda',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  list: {flex: 1},
  item: {paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F8F8F8'},
  itemActive: {backgroundColor: '#EEF3FB'},
  itemText: {fontSize: 14, color: '#192546', fontFamily: 'Runda'},
  itemTextActive: {color: '#0C4D91', fontWeight: '600'},
  continueBtn: {
    backgroundColor: '#0C4D91',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'Runda'},
});

// ─── Multi-select radio list (used for Expertise, Who You Help, Support, Languages) ─
const MultiSelectList = ({
  options,
  selected,
  onToggle,
  maxSelect,
}: {
  options: string[];
  selected: string[];
  onToggle: (opt: string) => void;
  maxSelect?: number;
}) => (
  <View>
    {options.map(opt => {
      const isSelected = selected.includes(opt);
      const disabled = !isSelected && !!maxSelect && selected.length >= maxSelect;
      return (
        <TouchableOpacity
          key={opt}
          style={[s.optionRow, disabled && {opacity: 0.4}]}
          onPress={() => !disabled && onToggle(opt)}
          disabled={disabled}>
          {isSelected ? <RadioSelected /> : <RadioUnselected />}
          <Text style={s.optionText}>{opt}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────
const MentorApplicationScreen = ({navigation}: any) => {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — Professional
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');

  // Step 2 — Profile
  const [shortBio, setShortBio] = useState('');
  const [extendedBio, setExtendedBio] = useState('');
  const [cv, setCv] = useState<any>(null);

  // Step 3 — Expertise
  const [expertise, setExpertise] = useState<string[]>([]);

  // Step 4 — Who You Help
  const [whoYouHelp, setWhoYouHelp] = useState<string[]>([]);

  // Step 5 — Support
  const [support, setSupport] = useState<string[]>([]);

  // Step 6 — Session
  const [sessionDuration, setSessionDuration] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [responseTime, setResponseTime] = useState('');

  // Step 7 — Availability
  const [sessionsPerMonth, setSessionsPerMonth] = useState('');
  const [availability, setAvailability] = useState('');

  // Step 8 — Motivation
  const [motivation, setMotivation] = useState('');

  // Step 9 — Consent
  const [consent1, setConsent1] = useState(false);
  const [consent2, setConsent2] = useState(false);
  const [consent3, setConsent3] = useState(false);
  const [consent4, setConsent4] = useState(false);
  const allConsented = consent1 && consent2 && consent3 && consent4;

  // Active bottom sheet
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  const toggleInList = (
    list: string[],
    setList: (v: string[]) => void,
    item: string,
  ) => {
    setList(
      list.includes(item) ? list.filter(i => i !== item) : [...list, item],
    );
  };

  const handlePickCv = async () => {
    try {
      const DocumentPicker = require('react-native-document-picker').default;
      const result = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.doc, DocumentPicker.types.docx],
      });
      if (result.size && result.size > 5 * 1024 * 1024) {
        Alert.alert('File too large', 'Please choose a file under 5MB.');
        return;
      }
      setCv(result);
    } catch (err: any) {
      if (!err?.toString?.()?.includes('cancel')) {
        Alert.alert('Error', 'Could not select file. Please try again.');
      }
    }
  };

  const goNext = () => setStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const goPrevious = () => {
    if (step === 0) navigation.goBack();
    else setStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!allConsented) return;
    setSubmitting(true);
    const ok = await submitMentorApplication({
      firstName,
      email,
      timezone,
      yearsExperience,
      shortBio,
      extendedBio,
      cvUri: cv?.uri || null,
      cvName: cv?.name || null,
      expertise,
      whoYouHelp,
      support,
      sessionDuration,
      languages,
      responseTime,
      sessionsPerMonth,
      availability,
      motivation,
    });
    setSubmitting(false);
    if (ok) {
      Alert.alert(
        'Application Submitted',
        'Thank you for applying to the IPM Foundation Mentorship Programme. We will review your application and be in touch.',
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } else {
      Alert.alert(
        'Submission Failed',
        'The mentor application endpoint is not live yet on the backend. Please try again later.',
      );
    }
  };

  // ── Step-by-step content ────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 0: // Professional
        return (
          <>
            <Text style={s.fieldLabel}>{'First Name*'}</Text>
            <TextInput
              style={s.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder=""
            />
            <Text style={s.fieldLabel}>{'Email Address*'}</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder=""
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={s.fieldLabel}>{'Time Zone*'}</Text>
            <TouchableOpacity style={s.selectInput} onPress={() => setActiveSheet('timezone')}>
              <Text style={[s.selectInputText, !timezone && s.placeholderText]}>
                {timezone || 'Select your time zone'}
              </Text>
              <Text style={s.chevron}>{'⌄'}</Text>
            </TouchableOpacity>
            <Text style={s.fieldLabel}>{'Years of Experience*'}</Text>
            <TouchableOpacity style={s.selectInput} onPress={() => setActiveSheet('years')}>
              <Text style={[s.selectInputText, !yearsExperience && s.placeholderText]}>
                {yearsExperience || 'Select years of experience'}
              </Text>
              <Text style={s.chevron}>{'⌄'}</Text>
            </TouchableOpacity>
            <Text style={s.helperText}>
              {'Years working in project management roles, not total career length'}
            </Text>
          </>
        );

      case 1: // Profile
        return (
          <>
            <Text style={s.fieldLabel}>{'Short Biography*'}</Text>
            <TextInput
              style={s.textArea}
              value={shortBio}
              onChangeText={setShortBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={s.helperText}>
              {'80–100 words — shown at top of your mentor card'}
            </Text>
            <Text style={s.fieldLabel}>{'Extended Biography*'}</Text>
            <TextInput
              style={s.textArea}
              value={extendedBio}
              onChangeText={setExtendedBio}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={s.helperText}>
              {'200–300 words — shown in About section of full profile'}
            </Text>
            <Text style={s.fieldLabel}>{'Upload Your CV / Resume*'}</Text>
            <TouchableOpacity style={s.uploadBox} onPress={handlePickCv}>
              <Text style={s.uploadBoxText} numberOfLines={1}>
                {cv?.name || 'Choose File'}
              </Text>
              <UploadIcon />
            </TouchableOpacity>
            <Text style={s.helperText}>{'PDF, DOC, or DOCX — max 5MB'}</Text>
          </>
        );

      case 2: // Expertise
        return (
          <>
            <Text style={s.questionText}>{'Select up to 5 areas of expertise*'}</Text>
            <MultiSelectList
              options={EXPERTISE_OPTIONS}
              selected={expertise}
              onToggle={opt => toggleInList(expertise, setExpertise, opt)}
              maxSelect={5}
            />
          </>
        );

      case 3: // Who You Help
        return (
          <>
            <Text style={s.questionText}>{'Select up to 3 mentee profiles*'}</Text>
            <MultiSelectList
              options={WHO_YOU_HELP_OPTIONS}
              selected={whoYouHelp}
              onToggle={opt => toggleInList(whoYouHelp, setWhoYouHelp, opt)}
              maxSelect={3}
            />
          </>
        );

      case 4: // Support
        return (
          <>
            <Text style={s.questionText}>{'What types of support can you offer?'}</Text>
            <MultiSelectList
              options={SUPPORT_OPTIONS}
              selected={support}
              onToggle={opt => toggleInList(support, setSupport, opt)}
            />
          </>
        );

      case 5: // Session
        return (
          <>
            <Text style={s.fieldLabel}>{'Preferred Session Duration*'}</Text>
            <TouchableOpacity style={s.selectInput} onPress={() => setActiveSheet('duration')}>
              <Text style={[s.selectInputText, !sessionDuration && s.placeholderText]}>
                {sessionDuration || 'Select duration'}
              </Text>
              <Text style={s.chevron}>{'⌄'}</Text>
            </TouchableOpacity>

            <Text style={s.fieldLabel}>{'Languages Spoken*'}</Text>
            <MultiSelectList
              options={LANGUAGE_OPTIONS}
              selected={languages}
              onToggle={opt => toggleInList(languages, setLanguages, opt)}
            />

            <Text style={s.fieldLabel}>{'Typical Response Time to Requests*'}</Text>
            <TouchableOpacity style={s.selectInput} onPress={() => setActiveSheet('responseTime')}>
              <Text style={[s.selectInputText, !responseTime && s.placeholderText]}>
                {responseTime || 'Select response time'}
              </Text>
              <Text style={s.chevron}>{'⌄'}</Text>
            </TouchableOpacity>
          </>
        );

      case 6: // Availability
        return (
          <>
            <Text style={s.fieldLabel}>
              {'How many mentoring sessions can you support per month?*'}
            </Text>
            <TouchableOpacity style={s.selectInput} onPress={() => setActiveSheet('sessionsPerMonth')}>
              <Text style={[s.selectInputText, !sessionsPerMonth && s.placeholderText]}>
                {sessionsPerMonth || 'Select number of sessions'}
              </Text>
              <Text style={s.chevron}>{'⌄'}</Text>
            </TouchableOpacity>

            <Text style={s.fieldLabel}>
              {'How often are you generally available for sessions?*'}
            </Text>
            <TouchableOpacity style={s.selectInput} onPress={() => setActiveSheet('availability')}>
              <Text style={[s.selectInputText, !availability && s.placeholderText]}>
                {availability || 'Select availability'}
              </Text>
              <Text style={s.chevron}>{'⌄'}</Text>
            </TouchableOpacity>
          </>
        );

      case 7: // Motivation
        return (
          <>
            <Text style={s.questionText}>
              {'Why would you like to become a mentor in the IPM Mentorship Programme?*'}
            </Text>
            <TextInput
              style={[s.textArea, {height: 160}]}
              value={motivation}
              onChangeText={setMotivation}
              multiline
              textAlignVertical="top"
            />
            <Text style={s.helperText}>{'100–200 words'}</Text>
          </>
        );

      case 8: // Consent
        return (
          <>
            <Text style={s.questionText}>
              {'Please confirm the following before submitting your application*'}
            </Text>
            {[
              {
                value: consent1,
                set: setConsent1,
                label: 'I understand that applications are subject to review and approval by the IPM Foundation team*',
              },
              {
                value: consent2,
                set: setConsent2,
                label: 'I consent to my submitted information being used for mentor evaluation and programme setup*',
              },
              {
                value: consent3,
                set: setConsent3,
                label: 'I understand that participation in the IPM Foundation Mentorship Programme is voluntary and unpaid*',
              },
              {
                value: consent4,
                set: setConsent4,
                label: 'I understand that onboarding materials and next steps will be provided upon approval*',
              },
            ].map((c, i) => (
              <TouchableOpacity
                key={i}
                style={s.consentRow}
                onPress={() => c.set(!c.value)}>
                <View style={[s.checkbox, c.value && s.checkboxChecked]}>
                  {c.value ? <CheckMark /> : null}
                </View>
                <Text style={s.consentText}>{c.label}</Text>
              </TouchableOpacity>
            ))}
            <Text style={s.helperText}>{'All items are required'}</Text>
          </>
        );

      default:
        return null;
    }
  };

  const isFirstStep = step === 0;
  const isLastStep = step === STEPS.length - 1;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goPrevious}>
          <Text style={s.backBtnText}>{'‹'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={s.title}>{'IPM Foundation Mentor Application'}</Text>
        <Text style={s.subtitle}>
          {'Make a meaningful impact by guiding, supporting, and empowering emerging professionals.'}
        </Text>

        <StepIndicator activeIndex={step} />

        {renderStep()}

        <View style={s.navButtonsWrap}>
          {isLastStep ? (
            <TouchableOpacity
              style={[s.primaryBtn, !allConsented && s.primaryBtnDisabled]}
              onPress={handleSubmit}
              disabled={!allConsented || submitting}>
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={s.primaryBtnText}>{'Submit Application'}</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.primaryBtn} onPress={goNext}>
              <Text style={s.primaryBtnText}>{'Next'}</Text>
            </TouchableOpacity>
          )}

          {!isFirstStep && (
            <TouchableOpacity style={s.secondaryBtn} onPress={goPrevious}>
              <Text style={s.secondaryBtnText}>{'Previous'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{height: 40}} />
      </ScrollView>

      <PickerSheet
        visible={activeSheet === 'timezone'}
        title="Time Zone"
        listLabel="Select Time Zone"
        items={TIMEZONES.map(t => t.label)}
        selected={timezone}
        onSelect={setTimezone}
        onClose={() => setActiveSheet(null)}
        onContinue={() => setActiveSheet(null)}
      />
      <PickerSheet
        visible={activeSheet === 'years'}
        title="Years of Experience"
        listLabel="Select Years"
        items={YEARS_EXPERIENCE_OPTIONS}
        selected={yearsExperience}
        onSelect={setYearsExperience}
        onClose={() => setActiveSheet(null)}
        onContinue={() => setActiveSheet(null)}
      />
      <PickerSheet
        visible={activeSheet === 'duration'}
        title="Session Duration"
        listLabel="Select Duration"
        items={SESSION_DURATION_OPTIONS}
        selected={sessionDuration}
        onSelect={setSessionDuration}
        onClose={() => setActiveSheet(null)}
        onContinue={() => setActiveSheet(null)}
      />
      <PickerSheet
        visible={activeSheet === 'responseTime'}
        title="Response Time"
        listLabel="Select Time"
        items={RESPONSE_TIME_OPTIONS}
        selected={responseTime}
        onSelect={setResponseTime}
        onClose={() => setActiveSheet(null)}
        onContinue={() => setActiveSheet(null)}
      />
      <PickerSheet
        visible={activeSheet === 'sessionsPerMonth'}
        title="Session Duration"
        listLabel="Select Sessions"
        items={SESSIONS_PER_MONTH_OPTIONS}
        selected={sessionsPerMonth}
        onSelect={setSessionsPerMonth}
        onClose={() => setActiveSheet(null)}
        onContinue={() => setActiveSheet(null)}
      />
      <PickerSheet
        visible={activeSheet === 'availability'}
        title="Select Availability"
        listLabel={null}
        items={AVAILABILITY_OPTIONS}
        selected={availability}
        onSelect={setAvailability}
        onClose={() => setActiveSheet(null)}
        onContinue={() => setActiveSheet(null)}
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {fontSize: 22, color: '#192546', fontWeight: '300'},
  content: {paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40},

  title: {
    color: '#192647',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#192647',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 18,
  },

  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  stepItem: {alignItems: 'center', flex: 1, gap: 4},
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#C5C6CC',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  stepCircleFilled: {backgroundColor: '#46B0E3', borderColor: '#46B0E3'},
  stepNumber: {
    fontSize: 7,
    fontWeight: '400',
    color: '#192546',
    lineHeight: 11,
    fontFamily: 'Runda',
  },
  stepNumberActive: {color: '#FFFFFF'},
  stepLabel: {
    fontSize: 7,
    fontWeight: '400',
    color: '#192546',
    lineHeight: 11,
    fontFamily: 'Runda',
    textAlign: 'center',
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#192546',
    fontFamily: 'Runda',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#C5C6CC',
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    color: '#192546',
    fontFamily: 'Runda',
    backgroundColor: '#FFFFFF',
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#C5C6CC',
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  selectInputText: {fontSize: 14, color: '#192546', fontFamily: 'Runda'},
  placeholderText: {color: '#8F9098'},
  chevron: {fontSize: 16, color: '#8F9098'},
  helperText: {fontSize: 11, color: '#8F9098', fontFamily: 'Runda', marginTop: 6},

  textArea: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#C5C6CC',
    backgroundColor: '#E8E9F1',
    paddingTop: 12,
    paddingRight: 16.749,
    paddingBottom: 24,
    paddingLeft: 16.749,
    fontSize: 14,
    color: '#192546',
    fontFamily: 'Runda',
    minHeight: 90,
  },

  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 5,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C5C6CC',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  uploadBoxText: {flex: 1, fontSize: 14, color: '#8F9098', fontFamily: 'Runda'},

  questionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#192546',
    fontFamily: 'Runda',
    marginBottom: 14,
    marginTop: 6,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionText: {fontSize: 14, color: '#192546', fontFamily: 'Runda', flex: 1},

  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#C5C6CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {backgroundColor: '#006FFD', borderColor: '#006FFD'},
  consentText: {flex: 1, fontSize: 13, color: '#192546', fontFamily: 'Runda', lineHeight: 18},

  navButtonsWrap: {marginTop: 28, gap: 12},
  primaryBtn: {
    backgroundColor: '#192546',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnDisabled: {backgroundColor: '#C5C6CC'},
  primaryBtnText: {color: '#FFFFFF', fontSize: 15, fontWeight: '700', fontFamily: 'Runda'},
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#192546',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {color: '#192546', fontSize: 15, fontWeight: '700', fontFamily: 'Runda'},
});

export default MentorApplicationScreen;
