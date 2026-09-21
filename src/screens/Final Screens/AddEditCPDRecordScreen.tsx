/* eslint-disable prettier/prettier */
/**
 * AddEditCPDRecordScreen.tsx — "Add a new CPD record" / edit variant
 *
 * Route params: { record?: PduRecord } — presence of `record` switches
 * the screen into edit mode (pre-filled fields, POST to
 * /my-pdus/records/{id}, "Update" button copy).
 *
 * IMPLEMENTATION NOTE: the Figma "Select Activity Type" screen is built
 * here as an in-file full-screen Modal (ActivityTypePicker) rather than a
 * new named route in the navigator, since I don't have visibility into
 * App.tsx's navigation stack to safely add a route. If the app already
 * has a route added for this, swap the Modal for navigation.navigate to
 * match the rest of the app's SearchableDropdown/OptionPicker pattern.
 *
 * ⚠️ UNCONFIRMED (see pdusApi.ts for full detail):
 * - The multipart file field name (`file`) hasn't been tested against
 *   the real endpoint with an actual file attached.
 * - Whether leaving the file untouched on an edit preserves the existing
 *   attachment server-side, or clears it. Editing a record that already
 *   has a file, without re-picking one, is a real risk area until this
 *   is confirmed with Robby.
 * - The Add-mode button's exact label wasn't shown in any mockup (only
 *   the Edit-mode "Update" button was) — using "Save Record" for add.
 *   Flag if there's a specific Figma label for this.
 */
import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import Svg, {Path} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import {BackBtn, Dropdown} from '../components/editShared';
import {getMyPdus, createPduRecord, updatePduRecord, PduRecord} from '../api/pdusApi';
import {getUserIdFromToken} from '../api/profileApi';

const C = {
  navy: '#192546',
  blueDark: '#0C4D91',
  red: '#ED3241',
  hint: '#8F9098',
  border: '#C5C6CC',
  cardBorder: '#E8E9F1',
  descBg: '#E8E9F1',
};

const FilterChevron = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path d="M11.0857 2.62081C10.8041 2.33138 10.3475 2.33138 10.0659 2.62081L5.76862 7.03758L1.47132 2.62081C1.18972 2.33138 0.733164 2.33138 0.451566 2.62081C0.169968 2.91024 0.169968 3.37949 0.451566 3.66892L5.76862 9.13379L11.0857 3.66892C11.3673 3.37949 11.3673 2.91024 11.0857 2.62081Z" fill={C.hint} />
  </Svg>
);

const UploadIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
    <Path d="M10.834 7.50033H15.4173L10.834 2.91699V7.50033ZM5.00065 1.66699H11.6673L16.6673 6.66699V16.667C16.6673 17.109 16.4917 17.5329 16.1792 17.8455C15.8666 18.1581 15.4427 18.3337 15.0007 18.3337H5.00065C4.55862 18.3337 4.1347 18.1581 3.82214 17.8455C3.50958 17.5329 3.33398 17.109 3.33398 16.667V3.33366C3.33398 2.89163 3.50958 2.46771 3.82214 2.15515C4.1347 1.84259 4.55862 1.66699 5.00065 1.66699Z" fill={C.hint} />
  </Svg>
);

// ─── Field primitives (exact Figma spec — not reusing editShared's Field,
// whose padding/radius differ slightly from this form's spec) ─────────────
const FieldLabel = ({label, required}: {label: string; required?: boolean}) => (
  <Text style={f.label}>
    {label}{required ? <Text style={f.required}>{' *'}</Text> : null}
  </Text>
);

const TextField = ({
  label, value, onChangeText, placeholder, required, keyboardType, multiline, maxLength,
}: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder?: string;
  required?: boolean; keyboardType?: any; multiline?: boolean; maxLength?: number;
}) => (
  <View style={f.wrap}>
    <FieldLabel label={label} required={required} />
    <TextInput
      style={[f.input, multiline && f.inputMulti]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.hint}
      keyboardType={keyboardType}
      multiline={multiline}
      maxLength={maxLength}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  </View>
);

// ─── Day-Month calendar picker + Year dropdown — mirrors Edit Profile's
// DateRow pattern (calendar for the day/month, Dropdown for the year),
// but outputs the confirmed "DD-MM" + "YYYY" split fields separately.
const YEARS = Array.from({length: 50}, (_, i) => String(new Date().getFullYear() - i));
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
const DAY_HEADERS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const DayMonthCalendar = ({
  visible, initialDay, initialMonth, onSelect, onClose,
}: {
  visible: boolean; initialDay: string; initialMonth: string;
  onSelect: (dd: string, mm: string) => void; onClose: () => void;
}) => {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(
    initialMonth ? parseInt(initialMonth, 10) - 1 : today.getMonth(),
  );
  // Only used to build a valid calendar grid (leap years etc) — the year
  // itself is tracked separately via the Year dropdown, not written here.
  const [viewYear] = useState(today.getFullYear());

  if (!visible) return null;

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedDay = initialDay ? parseInt(initialDay, 10) : null;
  const selectedMonth = initialMonth ? parseInt(initialMonth, 10) - 1 : null;

  const prevMonth = () => setViewMonth(m => (m === 0 ? 11 : m - 1));
  const nextMonth = () => setViewMonth(m => (m === 11 ? 0 : m + 1));

  const handleDay = (d: number) => {
    onSelect(String(d).padStart(2, '0'), String(viewMonth + 1).padStart(2, '0'));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={dc.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={dc.card}>
          <View style={dc.header}>
            <TouchableOpacity onPress={prevMonth} style={dc.navBtn}>
              <Text style={dc.navArrow}>{'\u2039'}</Text>
            </TouchableOpacity>
            <Text style={dc.monthLabel}>{MONTHS[viewMonth]}</Text>
            <TouchableOpacity onPress={nextMonth} style={dc.navBtn}>
              <Text style={dc.navArrow}>{'\u203A'}</Text>
            </TouchableOpacity>
          </View>
          <View style={dc.dayRow}>
            {DAY_HEADERS.map(d => <Text key={d} style={dc.dayHeader}>{d}</Text>)}
          </View>
          <View style={dc.grid}>
            {cells.map((d, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  dc.cell,
                  d && d === selectedDay && viewMonth === selectedMonth && dc.cellSelected,
                ]}
                disabled={!d}
                onPress={() => d && handleDay(d)}>
                <Text style={[
                  dc.cellText,
                  d && d === selectedDay && viewMonth === selectedMonth && dc.cellTextSelected,
                ]}>
                  {d ?? ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const DateField = ({
  label, day, year, onDay, onYear, required,
}: {
  label: string; day: string; year: string; onDay: (v: string) => void; onYear: (v: string) => void; required?: boolean;
}) => {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const monthName = day ? MONTHS[parseInt(day.split('-')[1] || '1', 10) - 1] : '';
  const dayNum = day ? day.split('-')[0] : '';

  return (
    <View style={f.wrap}>
      <FieldLabel label={label} required={required} />
      <View style={{flexDirection: 'row', gap: 12}}>
        <TouchableOpacity style={[f.input, {flex: 1}]} onPress={() => setCalendarOpen(true)}>
          <Text style={[f.dropdownText, !day && {color: C.hint}]}>
            {day ? `${dayNum} ${monthName}` : 'DD-MM'}
          </Text>
        </TouchableOpacity>
        <View style={{flex: 1}}>
          <Dropdown label="" value={year} options={YEARS} onSelect={onYear} placeholder="YYYY" />
        </View>
      </View>
      <DayMonthCalendar
        visible={calendarOpen}
        initialDay={day ? day.split('-')[0] : ''}
        initialMonth={day ? day.split('-')[1] : ''}
        onSelect={(dd, mm) => onDay(`${dd}-${mm}`)}
        onClose={() => setCalendarOpen(false)}
      />
    </View>
  );
};

const ActivityTypePicker = ({
  visible, options, selected, onSelect, onClose,
}: {
  visible: boolean; options: {id: string; label: string}[]; selected: string;
  onSelect: (id: string) => void; onClose: () => void;
}) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={{flex: 1, backgroundColor: '#FFFFFF'}}>
      <View style={{paddingHorizontal: 16, paddingTop: 16}}>
        <BackBtn onPress={onClose} />
        <Text style={ap.title}>{'Select Activity Type'}</Text>
        <Text style={ap.subtitle}>{'Select the category that best describes your professional development activity.'}</Text>
      </View>
      <ScrollView contentContainerStyle={{paddingHorizontal: 16, gap: 6, paddingBottom: 24}}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.id}
            style={[ap.row, opt.id === selected && ap.rowActive]}
            onPress={() => { onSelect(opt.id); onClose(); }}>
            <Text style={ap.rowText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  </Modal>
);

const AddEditCPDRecordScreen = ({navigation, route}: any) => {
  const existing: PduRecord | undefined = route?.params?.record;
  const isEdit = !!existing;

  const [activityTypes, setActivityTypes] = useState<{id: string; label: string}[]>([]);
  const [activityType, setActivityType] = useState(existing?.activity_type || '');
  const [activityName, setActivityName] = useState(existing?.activity_name || '');
  const [startDay, setStartDay] = useState(existing?.start_date || '');
  const [startYear, setStartYear] = useState(existing?.start_year || '');
  const [endDay, setEndDay] = useState(existing?.end_date || '');
  const [endYear, setEndYear] = useState(existing?.end_year || '');
  const [hours, setHours] = useState(existing?.hours != null ? String(existing.hours) : '');
  const [description, setDescription] = useState(existing?.description || '');
  const [file, setFile] = useState<{uri: string; name: string; type: string} | null>(null);
  const [existingFileName] = useState(existing?.file_url ? existing.file_url.split('/').pop() : '');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Activity Types come from the my-pdus response (backend-driven), so
  // load them once for the picker rather than hardcoding the list.
  React.useEffect(() => {
    (async () => {
      try {
        const userId = await getUserIdFromToken();
        if (!userId) return;
        const res = await getMyPdus(userId);
        setActivityTypes(res.activity_types);
      } catch (e) {
        console.log('[AddEditCPDRecord] activity types load error:', e);
      }
    })();
  }, []);

  const handlePickFile = async () => {
    try {
      const DocumentPicker = require('react-native-document-picker').default;
      const result = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images, DocumentPicker.types.doc, DocumentPicker.types.docx],
      });
      if (result.size && result.size > 10 * 1024 * 1024) {
        Alert.alert('File too large', 'Please choose a file under 10MB.');
        return;
      }
      setFile({uri: result.uri, name: result.name || 'attachment', type: result.type || 'application/octet-stream'});
    } catch (err: any) {
      if (!err?.toString?.()?.includes('cancel')) {
        Alert.alert('Error', 'Could not select file. Please try again.');
      }
    }
  };

  const activityTypeLabel = activityTypes.find(t => t.id === activityType)?.label || activityType;

  const validate = (): string | null => {
    if (!activityType) return 'Please select an activity type.';
    if (!activityName.trim()) return 'Please enter an activity name.';
    if (!startDay.trim() || !startYear.trim()) return 'Please enter a start date.';
    if (!endDay.trim() || !endYear.trim()) return 'Please enter an end date.';
    if (!hours.trim()) return 'Please enter hours earned.';
    if (!description.trim()) return 'Please enter a description.';
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Missing information', error);
      return;
    }
    setSaving(true);
    try {
      const input = {
        activity_type: activityType,
        activity_name: activityName.trim(),
        start_date: startDay.trim(),
        start_year: startYear.trim(),
        end_date: endDay.trim(),
        end_year: endYear.trim(),
        hours: hours.trim(),
        description: description.trim(),
        file,
      };
      if (isEdit && existing) {
        await updatePduRecord(existing.id, input);
      } else {
        await createPduRecord(input);
      }
      navigation?.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save this record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#FFFFFF'}} edges={['left', 'right', 'bottom']}>
      <AppHeader navigation={navigation} onDrawerOpen={() => {}} />
      <KeyboardAwareScrollView
        contentContainerStyle={{padding: 16, paddingBottom: 40}}
        enableOnAndroid
        keyboardShouldPersistTaps="handled">
        <BackBtn onPress={() => navigation?.goBack()} />

        <Text style={st.title}>{isEdit ? 'Edit CPD record' : 'Add a new CPD record'}</Text>
        <Text style={st.subtitle}>{'Record your professional development activity, including hours earned and supporting details.'}</Text>

        <View style={st.card}>
          <View style={f.wrap}>
            <FieldLabel label="Activity Types" required />
            <TouchableOpacity style={f.input} onPress={() => setPickerOpen(true)}>
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                <Text style={[f.dropdownText, !activityType && {color: C.hint}]}>
                  {activityTypeLabel || 'Select Type'}
                </Text>
                <FilterChevron />
              </View>
            </TouchableOpacity>
          </View>

          <TextField
            label="Activity Name" required
            value={activityName} onChangeText={setActivityName}
            placeholder="Ex: Article on Risk Management"
          />

          <DateField
            label="Start Date" required
            day={startDay} year={startYear} onDay={setStartDay} onYear={setStartYear}
          />
          <DateField
            label="End Date" required
            day={endDay} year={endYear} onDay={setEndDay} onYear={setEndYear}
          />

          <TextField
            label="Hours Earned" required
            value={hours} onChangeText={setHours}
            placeholder="Type hours earned here..."
            keyboardType="numeric"
          />

          <View style={f.wrap}>
            <FieldLabel label="Add Supporting Document" />
            <TouchableOpacity style={f.fileInput} onPress={handlePickFile}>
              <Text style={[f.dropdownText, !(file || existingFileName) && {color: C.hint}, {flex: 1}]} numberOfLines={1}>
                {file?.name || existingFileName || 'Choose File'}
              </Text>
              <UploadIcon />
            </TouchableOpacity>
          </View>

          <TextField
            label={`Description (Max: 500 characters)`} required
            value={description} onChangeText={setDescription}
            placeholder="Complete your log by writing your reflective statement...."
            multiline maxLength={500}
          />

          <TouchableOpacity style={st.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={st.saveBtnText}>{isEdit ? 'Update' : 'Save Record'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={st.cancelBtn} onPress={() => navigation?.goBack()} disabled={saving}>
            <Text style={st.cancelBtnText}>{'Cancel'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      <ActivityTypePicker
        visible={pickerOpen}
        options={activityTypes}
        selected={activityType}
        onSelect={setActivityType}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  title: {color: C.navy, fontFamily: 'Runda-Bold', fontSize: 18, letterSpacing: 0.09, marginBottom: 6},
  subtitle: {color: C.hint, fontFamily: 'Runda-Normal', fontSize: 14, lineHeight: 18, marginBottom: 20},
  card: {
    padding: 16, gap: 16, borderRadius: 8.201, borderWidth: 1.367,
    borderColor: C.cardBorder, backgroundColor: '#FFFFFF',
  },
  saveBtn: {
    height: 40, borderRadius: 100, backgroundColor: C.blueDark,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: {color: '#FFFFFF', fontFamily: 'Runda-Medium', fontSize: 14},
  cancelBtn: {
    height: 40, borderRadius: 100, borderWidth: 1, borderColor: C.blueDark,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: {color: C.blueDark, fontFamily: 'Runda-Medium', fontSize: 14},
});

const f = StyleSheet.create({
  wrap: {gap: 8},
  label: {color: C.navy, fontFamily: 'Runda-Medium', fontSize: 12},
  required: {color: C.red},
  input: {
    height: 48, paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 5, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', fontSize: 14, fontFamily: 'Runda-Normal', color: C.navy,
  },
  inputMulti: {
    height: 110, paddingTop: 12, textAlignVertical: 'top',
    backgroundColor: C.descBg, borderColor: C.border,
  },
  fileInput: {
    height: 48, paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 5, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  dropdownText: {fontSize: 14, fontFamily: 'Runda-Normal', color: C.navy},
});

const dc = StyleSheet.create({
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center'},
  card: {width: '85%', maxWidth: 320, borderRadius: 12, backgroundColor: '#FFFFFF', padding: 16},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
  navBtn: {width: 32, height: 32, alignItems: 'center', justifyContent: 'center'},
  navArrow: {fontSize: 20, color: C.blueDark},
  monthLabel: {color: C.navy, fontFamily: 'Runda-Bold', fontSize: 15},
  dayRow: {flexDirection: 'row', marginBottom: 4},
  dayHeader: {flex: 1, textAlign: 'center', color: C.hint, fontFamily: 'Runda-Medium', fontSize: 12},
  grid: {flexDirection: 'row', flexWrap: 'wrap'},
  cell: {
    width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
  },
  cellSelected: {backgroundColor: C.blueDark, borderRadius: 999},
  cellText: {color: C.navy, fontFamily: 'Runda-Normal', fontSize: 13},
  cellTextSelected: {color: '#FFFFFF', fontFamily: 'Runda-Bold'},
});

const ap = StyleSheet.create({
  title: {color: C.navy, fontFamily: 'Runda-Bold', fontSize: 16, marginTop: 8, marginBottom: 4},
  subtitle: {color: C.hint, fontFamily: 'Runda-Normal', fontSize: 13, lineHeight: 17, marginBottom: 16},
  row: {height: 41, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 5, backgroundColor: '#FFFFFF'},
  rowActive: {backgroundColor: '#E8E9F1'},
  rowText: {color: C.navy, fontFamily: 'Runda-Medium', fontSize: 14},
});

export default AddEditCPDRecordScreen;
