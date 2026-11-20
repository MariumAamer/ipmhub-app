/* eslint-disable prettier/prettier */
/**
 * ReportModal — "Report" bottom sheet (intro → pick reason(s) → confirm → done),
 * shared by feed posts, comments, forum discussions/replies and members.
 * Submits through onSubmit and waits for the result, so a server error is shown
 * instead of a false "Report Submitted".
 *
 * Look follows the Figma "Report This Member" frames and reuses the Block
 * member sheet's shell (56px header with divider, 34px bottom padding, 40px
 * pill buttons) so both sheets read as one family.
 *
 * `gap` is avoided on purpose (unreliable on Android/Hermes) — Figma gaps are
 * done with margins.
 */
import React, {useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {Circle, Path} from 'react-native-svg';

const NAVY = '#192546';
const DARK_BLUE = '#0C4D91';
const DIVIDER = '#E8E9F1';
const CAPTION = '#7C86A1';

// ─── Report issues ────────────────────────────────────────────────────────────
const REPORT_ISSUES = [
  {key: 'harassment', label: 'Harassment', description: 'Harassment or bullying behavior'},
  {key: 'fraud', label: 'Fraud or scam', description: 'Contains spam, fake content or potential malware'},
  {key: 'violence', label: 'Threats or violence', description: 'Contains abusive or derogatory content'},
  {key: 'misinformation', label: 'Misinformation', description: 'False or misleading information'},
  {key: 'hate', label: 'Hateful Speech', description: 'Promotes hatred or discrimination'},
  {key: 'selfharm', label: 'Self-harm', description: 'Content that encourages self-harm'},
  {key: 'extremism', label: 'Dangerous or extremist organisations', description: 'Promotes dangerous groups'},
  {key: 'other', label: 'Other', description: 'Something else, tell us more'},
];

const NOTE_MAX = 500;

// ─── Icons ────────────────────────────────────────────────────────────────────
// Figma plus (12x12). The minus is the plus's horizontal bar.
const PlusIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M0 4.73271H4.70544V0H7.31707V4.73271H12V7.28972H7.31707V12H4.70544V7.28972H0V4.73271Z"
      fill={NAVY}
    />
  </Svg>
);

const MinusIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path d="M0 4.73271H12V7.28972H0V4.73271Z" fill={NAVY} />
  </Svg>
);

// Figma close icon (20x20) — same as the Block member sheet.
const CloseIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M5.80012 6.67912L9.02012 9.89907L5.80012 13.099C5.68012 13.219 5.62012 13.3657 5.62012 13.539C5.62012 13.7123 5.68012 13.859 5.80012 13.979C5.92012 14.099 6.06678 14.159 6.24012 14.159C6.41345 14.159 6.56012 14.099 6.68012 13.979L9.90012 10.7791L13.1001 13.979C13.2201 14.099 13.3668 14.159 13.5401 14.159C13.7135 14.159 13.8601 14.099 13.9801 13.979C14.1001 13.859 14.1601 13.7123 14.1601 13.539C14.1601 13.3657 14.1001 13.219 13.9801 13.099L10.7801 9.89907L13.9801 6.67912C14.1001 6.55913 14.1601 6.41246 14.1601 6.23913C14.1601 6.0658 14.1001 5.91914 13.9801 5.79914C13.8601 5.67914 13.7135 5.61914 13.5401 5.61914C13.3668 5.61914 13.2201 5.67914 13.1001 5.79914L9.90012 8.99909L6.68012 5.79914C6.56012 5.67914 6.41345 5.61914 6.24012 5.61914C6.06678 5.61914 5.92012 5.67914 5.80012 5.79914C5.68012 5.91914 5.62012 6.0658 5.62012 6.23913C5.62012 6.41246 5.68012 6.55913 5.80012 6.67912Z"
      fill="#C5C6CC"
    />
  </Svg>
);

// Gray ring + green check (Figma "Report Submitted").
const CheckCircleIcon = () => (
  <Svg width={56} height={56} viewBox="0 0 56 56" fill="none">
    <Circle cx="28" cy="28" r="28" fill="#ECEDF2" />
    <Circle cx="28" cy="28" r="19" fill="#FFFFFF" stroke="#22C55E" strokeWidth="2" />
    <Path d="M20.5 28.5L25.5 33.5L36 23" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Header: 56 tall, title centred, close 24px from the right, hairline ─────
const SheetHeader = ({title, onClose}: {title: string; onClose: () => void}) => (
  <View style={rs.header}>
    <Text style={rs.title}>{title}</Text>
    <TouchableOpacity
      onPress={onClose}
      style={rs.closeBtn}
      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
      <CloseIcon />
    </TouchableOpacity>
  </View>
);

type ReportStep = 'intro' | 'select' | 'confirm' | 'done';

export const ReportModal = ({
  visible,
  onClose,
  onSubmit,
  noun = 'Post',
  showIntro = true,
}: {
  visible: boolean;
  onClose: () => void;
  /**
   * Receives the selected reason labels (without "Other") and the note the
   * member typed for "Other" (empty when not selected). Reject/throw to show
   * an error.
   */
  onSubmit: (reasons: string[], note: string) => Promise<void>;
  /** What is being reported: 'Post' | 'Member' | 'Discussion' | 'Comment' | 'Reply' … */
  noun?: string;
  /** false = open straight on the reason list (member report, per Figma). */
  showIntro?: boolean;
}) => {
  const firstStep: ReportStep = showIntro ? 'intro' : 'select';
  const [step, setStep] = useState<ReportStep>(firstStep);
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setStep(firstStep);
    setSelected([]);
    setNote('');
    setSubmitting(false);
    setError('');
  };

  const otherSelected = selected.includes('other');
  const trimmedNote = note.trim();
  // "Other" needs a few words so the moderators know what to look at.
  const canContinue = selected.length > 0 && (!otherSelected || trimmedNote.length > 0);

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleIssue = (key: string) => {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    );
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(
        REPORT_ISSUES.filter(i => i.key !== 'other' && selected.includes(i.key)).map(
          i => i.label,
        ),
        otherSelected ? trimmedNote : '',
      );
      setStep('done');
    } catch (e: any) {
      setError(e?.message || 'Could not send your report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={rs.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={rs.sheet}>
          {/* ── Step: intro ── */}
          {step === 'intro' && (
            <>
              <SheetHeader title={`Report ${noun}`} onClose={handleClose} />
              <View style={rs.centerBody}>
                <Text style={rs.bodyText}>
                  {'Help us maintain a professional and respectful community.'}
                </Text>
                <TouchableOpacity
                  style={rs.primaryBtn}
                  activeOpacity={0.85}
                  onPress={() => setStep('select')}>
                  <Text style={rs.primaryBtnText}>{'Continue'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Step: select ── */}
          {step === 'select' && (
            <>
              <SheetHeader title={`Report This ${noun}`} onClose={handleClose} />
              <View style={rs.body}>
                <Text style={rs.heading}>{'Please select any report issue'}</Text>
                <ScrollView
                  style={rs.issueList}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}>
                  {REPORT_ISSUES.map(issue => (
                    <React.Fragment key={issue.key}>
                      <TouchableOpacity
                        style={rs.issueRow}
                        activeOpacity={0.6}
                        onPress={() => toggleIssue(issue.key)}>
                        <Text style={rs.issueLabel}>{issue.label}</Text>
                        {selected.includes(issue.key) ? <MinusIcon /> : <PlusIcon />}
                      </TouchableOpacity>
                      {issue.key === 'other' && otherSelected && (
                        <View style={rs.noteWrap}>
                          <TextInput
                            style={rs.noteInput}
                            value={note}
                            onChangeText={setNote}
                            placeholder="Tell us what's wrong"
                            placeholderTextColor={CAPTION}
                            multiline
                            maxLength={NOTE_MAX}
                            textAlignVertical="top"
                          />
                          <Text style={rs.noteCount}>{`${note.length}/${NOTE_MAX}`}</Text>
                        </View>
                      )}
                    </React.Fragment>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={[rs.primaryBtn, !canContinue && rs.primaryBtnDisabled]}
                  activeOpacity={0.85}
                  disabled={!canContinue}
                  onPress={() => setStep('confirm')}>
                  <Text style={rs.primaryBtnText}>{'Continue'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Step: confirm ── */}
          {step === 'confirm' && (
            <>
              <SheetHeader title={`Report This ${noun}`} onClose={handleClose} />
              <View style={rs.body}>
                <Text style={rs.heading}>{"You've selected the following reason"}</Text>
                <ScrollView style={rs.selectedList} showsVerticalScrollIndicator={false}>
                  {REPORT_ISSUES.filter(i => selected.includes(i.key)).map(issue => (
                    <View key={issue.key} style={rs.selectedItem}>
                      <Text style={rs.selectedItemLabel}>{issue.label}</Text>
                      <Text style={rs.selectedItemDesc}>
                        {issue.key === 'other' ? trimmedNote : issue.description}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
                {!!error && <Text style={rs.errorText}>{error}</Text>}
                <TouchableOpacity
                  style={[rs.primaryBtn, submitting && rs.primaryBtnDisabled]}
                  activeOpacity={0.85}
                  disabled={submitting}
                  onPress={handleSubmit}>
                  {submitting ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={rs.primaryBtnText}>{'Submit Report'}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={rs.outlineBtn}
                  activeOpacity={0.6}
                  onPress={() => setStep('select')}>
                  <Text style={rs.outlineBtnText}>{'Back'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Step: done — same layout as the Block member sheet ── */}
          {step === 'done' && (
            <>
              <SheetHeader title="Report Submitted" onClose={handleClose} />
              <View style={rs.centerBody}>
                <View style={rs.doneIcon}>
                  <CheckCircleIcon />
                </View>
                <Text style={rs.bodyText}>
                  {noun === 'Member'
                    ? 'Thank you for helping keep IPM Hub professional and respectful. Our team will review this member and take action if they break our Community Guidelines.'
                    : 'Thank you for helping us maintain a professional and respectful community.'}
                </Text>
                <TouchableOpacity
                  style={rs.primaryBtn}
                  activeOpacity={0.85}
                  onPress={handleClose}>
                  <Text style={rs.primaryBtnText}>{'Done'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const rs = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end'},
  // Figma: radius 20 20 0 0, white, padding-bottom 34
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: '90%',
  },

  // Figma: height 56, padding 18 24 16.5 (title centred, close at right)
  header: {
    height: 56,
    paddingTop: 18,
    paddingBottom: 16.5,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  // Figma Heading/H3: Runda 500, 16/20, letter-spacing 0.08, #0C4D91
  title: {
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.08,
    color: DARK_BLUE,
    textAlign: 'center',
  },
  closeBtn: {position: 'absolute', top: 18, right: 24},

  // Figma frame: padding 0 16, column, gap 16
  body: {paddingHorizontal: 16, paddingTop: 16},
  // Figma Heading/H2: Runda 700, 18, letter-spacing 0.09, Navy. Hairline under it.
  heading: {
    fontFamily: 'Runda-Bold',
    fontSize: 18,
    letterSpacing: 0.09,
    color: NAVY,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    marginBottom: 8,
  },
  issueList: {maxHeight: 340, marginBottom: 16},
  // Figma row: height 41, padding 8 20, align center, label then + at the right
  issueRow: {
    height: 41,
    paddingVertical: 8,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Label size isn't in the CSS: Body M (Runda 400, 14/18, Navy) used.
  issueLabel: {fontFamily: 'Runda-Normal', fontSize: 14, lineHeight: 18, color: NAVY, flex: 1, marginRight: 14},

  noteWrap: {paddingHorizontal: 20, paddingBottom: 12},
  noteInput: {
    minHeight: 88,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontFamily: 'Runda-Normal',
    fontSize: 14,
    color: NAVY,
  },
  noteCount: {fontFamily: 'Runda-Normal', fontSize: 11, color: CAPTION, textAlign: 'right', marginTop: 4},

  selectedList: {maxHeight: 260, marginBottom: 16},
  selectedItem: {backgroundColor: '#F5F6FA', borderRadius: 8, padding: 12, marginBottom: 8},
  selectedItemLabel: {fontFamily: 'Runda-Medium', fontSize: 14, color: NAVY, marginBottom: 3},
  selectedItemDesc: {fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16, color: CAPTION},
  errorText: {fontFamily: 'Runda-Normal', fontSize: 12, color: '#ED3241', marginBottom: 12},

  // Figma button: height 40, padding 12 16, radius 50, #0C4D91; label Runda 500, 12, white
  primaryBtn: {
    height: 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 50,
    backgroundColor: DARK_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {opacity: 0.4},
  primaryBtnText: {fontFamily: 'Runda-Medium', fontSize: 12, color: '#FFFFFF'},
  outlineBtn: {
    height: 40,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: DARK_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {fontFamily: 'Runda-Medium', fontSize: 12, color: DARK_BLUE},

  // Intro + done: same body padding as the Block member sheet (24)
  centerBody: {paddingHorizontal: 24, paddingTop: 16},
  doneIcon: {alignItems: 'center', marginTop: 8, marginBottom: 16},
  // Body M: Runda 400, 14/18, Navy
  bodyText: {
    fontFamily: 'Runda-Normal',
    fontSize: 14,
    lineHeight: 18,
    color: NAVY,
    textAlign: 'center',
    marginBottom: 24,
  },
});

export default ReportModal;
