/* eslint-disable prettier/prettier */
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

// ─── SVG Icons — exact from Figma ────────────────────────────────────────────
const TimeIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 13 13" fill="none">
    <Path d="M6.5 0C10.0899 0 13 2.91015 13 6.5C13 10.0899 10.0899 13 6.5 13C2.91015 13 0 10.0899 0 6.5C0 2.91015 2.91015 0 6.5 0ZM6.41992 2.96875C6.02109 2.9688 5.69727 3.29257 5.69727 3.69141V6.74121C5.69752 7.40574 6.2368 7.94426 6.90137 7.94434H9.14844C9.54711 7.94427 9.86988 7.62129 9.87012 7.22266C9.87012 6.82382 9.54725 6.50007 9.14844 6.5H7.14258V3.69141C7.14258 3.29253 6.81879 2.96875 6.41992 2.96875Z" fill="#8F9098" />
  </Svg>
);

const CalendarIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 13 13" fill="none">
    <Path d="M1.08301 10.2917C1.08301 11.2125 1.78717 11.9167 2.70801 11.9167H10.2913C11.2122 11.9167 11.9163 11.2125 11.9163 10.2917V5.95837H1.08301V10.2917ZM10.2913 2.16671H9.20801V1.62504C9.20801 1.30004 8.99134 1.08337 8.66634 1.08337C8.34134 1.08337 8.12467 1.30004 8.12467 1.62504V2.16671H4.87467V1.62504C4.87467 1.30004 4.65801 1.08337 4.33301 1.08337C4.00801 1.08337 3.79134 1.30004 3.79134 1.62504V2.16671H2.70801C1.78717 2.16671 1.08301 2.87087 1.08301 3.79171V4.87504H11.9163V3.79171C11.9163 2.87087 11.2122 2.16671 10.2913 2.16671Z" fill="#8F9098" />
  </Svg>
);

// ─── Calendar grid helpers ────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

const getFirstDayOfMonth = (year: number, month: number) =>
  new Date(year, month, 1).getDay();

// ─── Mini Calendar ────────────────────────────────────────────────────────────
const MiniCalendar = ({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (d: string) => void;
  onClose: () => void;
}) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const selected = value ? new Date(value + 'T00:00:00') : null;

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const handleDay = (d: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    onClose();
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const isToday = (d: number) =>
    d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const isSelected = (d: number) =>
    selected &&
    d === selected.getDate() &&
    viewMonth === selected.getMonth() &&
    viewYear === selected.getFullYear();

  const isPast = (d: number) => {
    const date = new Date(viewYear, viewMonth, d);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date < todayStart;
  };

  return (
    <View style={cal.wrap}>
      <View style={cal.header}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
          <Text style={cal.navArrow}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={cal.monthLabel}>{`${MONTHS[viewMonth]} ${viewYear}`}</Text>
        <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
          <Text style={cal.navArrow}>{'›'}</Text>
        </TouchableOpacity>
      </View>
      <View style={cal.dayRow}>
        {DAYS.map(d => (
          <Text key={d} style={cal.dayHeader}>{d}</Text>
        ))}
      </View>
      <View style={cal.grid}>
        {cells.map((d, i) => (
          <TouchableOpacity
            key={i}
            style={[
              cal.cell,
              d && isSelected(d) && cal.cellSelected,
              d && isToday(d) && !isSelected(d) && cal.cellToday,
            ]}
            onPress={() => d && !isPast(d) && handleDay(d)}
            disabled={!d || isPast(d)}
            activeOpacity={d && !isPast(d) ? 0.7 : 1}>
            <Text style={[
              cal.cellText,
              d && isSelected(d) && cal.cellTextSelected,
              d && isPast(d) && cal.cellTextPast,
            ]}>
              {d ?? ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const cal = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E9F1',
    padding: 12,
    marginTop: 6,
  },
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8},
  navBtn: {padding: 6},
  navArrow: {fontSize: 20, color: '#192546', fontWeight: '600'},
  monthLabel: {fontSize: 14, fontWeight: '700', color: '#192546', fontFamily: 'Runda'},
  dayRow: {flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4},
  dayHeader: {width: 32, textAlign: 'center', fontSize: 11, color: '#8F9098', fontFamily: 'Runda'},
  grid: {flexDirection: 'row', flexWrap: 'wrap'},
  cell: {width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 16},
  cellSelected: {backgroundColor: '#0C4D91'},
  cellToday: {borderWidth: 1, borderColor: '#0C4D91'},
  cellText: {fontSize: 13, color: '#192546', fontFamily: 'Runda'},
  cellTextSelected: {color: '#FFF', fontWeight: '700'},
  cellTextPast: {color: '#C5C6CC'},
});

// ─── ScheduleModal ────────────────────────────────────────────────────────────
interface ScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onContinue: (date: string, time: string, meridiem: 'AM' | 'PM') => void;
  onViewAll?: () => void;
  isSubmitting?: boolean;
}

const ScheduleModal = ({
  visible,
  onClose,
  onContinue,
  onViewAll,
  isSubmitting,
}: ScheduleModalProps) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const defaultDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const [date, setDate] = useState(defaultDate);
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [meridiem, setMeridiem] = useState<'AM' | 'PM'>('PM');
  const [showCal, setShowCal] = useState(false);

  // Current date/time display (matches original — friendly context line)
  const currentDisplay =
    today.toLocaleDateString('en-IE', {year: 'numeric', month: 'short', day: 'numeric'}) +
    ' at ' +
    today.toLocaleTimeString('en-IE', {hour: '2-digit', minute: '2-digit', hour12: true});

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      setShowCal(false);
    }
  }, [visible]);

  const formatDisplayDate = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(day, 10)}, ${y}`;
  };

  // Numbers-only restriction, valid ranges enforced live
  const handleHourChange = (v: string) => {
    const num = v.replace(/[^0-9]/g, '').slice(0, 2);
    if (num === '' || (parseInt(num, 10) >= 1 && parseInt(num, 10) <= 12)) {
      setHour(num);
    }
  };

  const handleMinuteChange = (v: string) => {
    const num = v.replace(/[^0-9]/g, '').slice(0, 2);
    if (num === '' || (parseInt(num, 10) >= 0 && parseInt(num, 10) <= 59)) {
      setMinute(num);
    }
  };

  const handleContinue = () => {
    const h = hour.padStart(2, '0') || '12';
    const m = minute.padStart(2, '0') || '00';
    onContinue(date, `${h}:${m}`, meridiem);
  };

  const canContinue = !!date && !!hour && !!minute;

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, {opacity: backdropAnim}]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, {transform: [{translateY: slideAnim}]}]}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{'Schedule a post'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>{'✕'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.currentTime}>{currentDisplay}</Text>

          {/* Date field */}
          <Text style={styles.fieldLabel}>{'Date'}</Text>
          <TouchableOpacity
            style={styles.fieldRow}
            onPress={() => setShowCal(v => !v)}
            activeOpacity={0.8}>
            <Text style={[styles.fieldText, !date && styles.fieldPlaceholder]}>
              {date ? formatDisplayDate(date) : 'Select date'}
            </Text>
            <CalendarIcon />
          </TouchableOpacity>

          {showCal && (
            <MiniCalendar
              value={date}
              onChange={d => { setDate(d); setShowCal(false); }}
              onClose={() => setShowCal(false)}
            />
          )}

          {/* Time field */}
          <Text style={[styles.fieldLabel, {marginTop: 16}]}>{'Time'}</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeInputWrap}>
              <TextInput
                style={styles.timeInput}
                value={hour}
                onChangeText={handleHourChange}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="12"
                placeholderTextColor="#C5C6CC"
              />
              <Text style={styles.timeColon}>{':'}</Text>
              <TextInput
                style={styles.timeInput}
                value={minute}
                onChangeText={handleMinuteChange}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="00"
                placeholderTextColor="#C5C6CC"
              />
              <TimeIcon />
            </View>

            {/* AM / PM circles */}
            <View style={styles.meridiemRow}>
              <TouchableOpacity
                style={[styles.meridiemBtn, meridiem === 'AM' && styles.meridiemActive]}
                onPress={() => setMeridiem('AM')}>
                <Text style={[styles.meridiemText, meridiem === 'AM' && styles.meridiemTextActive]}>
                  {'AM'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.meridiemBtn, meridiem === 'PM' && styles.meridiemActive]}
                onPress={() => setMeridiem('PM')}>
                <Text style={[styles.meridiemText, meridiem === 'PM' && styles.meridiemTextActive]}>
                  {'PM'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* View all scheduled posts — arrow style from original */}
          {onViewAll && (
            <TouchableOpacity style={styles.viewAllRow} onPress={onViewAll}>
              <Text style={styles.viewAllText}>{'View all scheduled posts'}</Text>
              <Text style={styles.viewAllArrow}>{' →'}</Text>
            </TouchableOpacity>
          )}

          {/* Continue button */}
          <TouchableOpacity
            style={[styles.continueBtn, (!canContinue || isSubmitting) && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={!canContinue || isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.continueBtnText}>{'Continue'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 36,
    paddingHorizontal: 20,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 16,
  },
  sheetTitle: {fontSize: 17, fontWeight: '700', color: '#192546', fontFamily: 'Runda'},
  closeBtn: {position: 'absolute', right: 0, padding: 4},
  closeIcon: {fontSize: 18, color: '#8F9098'},
  currentTime: {fontSize: 13, color: '#8F9098', marginBottom: 20, fontFamily: 'Runda'},

  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#192546',
    marginBottom: 8,
    fontFamily: 'Runda',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#C5C6CC',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F5F6FA',
  },
  fieldText: {fontSize: 14, color: '#192546', fontFamily: 'Runda'},
  fieldPlaceholder: {color: '#8F9098'},

  // Time row
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C5C6CC',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F5F6FA',
    gap: 6,
  },
  timeInput: {
    fontSize: 16,
    color: '#192546',
    fontFamily: 'Runda',
    fontWeight: '600',
    width: 32,
    textAlign: 'center',
    padding: 0,
  },
  timeColon: {fontSize: 16, color: '#192546', fontWeight: '700'},

  // AM/PM circles
  meridiemRow: {
    flexDirection: 'row',
    gap: 8,
  },
  meridiemBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#C5C6CC',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6FA',
  },
  meridiemActive: {
    backgroundColor: '#0C4D91',
    borderColor: '#0C4D91',
  },
  meridiemText: {fontSize: 13, fontWeight: '600', color: '#8F9098', fontFamily: 'Runda'},
  meridiemTextActive: {color: '#FFF'},

  // View all — arrow style ported from original
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  viewAllText: {fontSize: 14, color: '#0C4D91', fontWeight: '600', fontFamily: 'Runda'},
  viewAllArrow: {fontSize: 16, color: '#0C4D91', fontFamily: 'Runda'},

  continueBtn: {
    backgroundColor: '#0C4D91',
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  continueBtnDisabled: {opacity: 0.5},
  continueBtnText: {color: '#FFF', fontSize: 15, fontWeight: '700', fontFamily: 'Runda'},
});

export default ScheduleModal;
