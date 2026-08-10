/* eslint-disable prettier/prettier */
// src/screens/CoursesScreen.tsx
//
// Three tabs: My Courses | Upcoming Courses | Search All Courses.
// Upcoming + Search are wired to the confirmed custom/v1/courses/* endpoints
// (coursesApi.ts). My Courses is NOT wired to live data — there is no
// confirmed "enrolled courses" endpoint yet (LearnDash REST still 401s,
// same blocker noted in CourseDetailScreen.tsx). See MISSING block at the
// bottom of this file for everything still open.

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Linking,
} from 'react-native';
import Svg, {Path, Circle} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import CourseCard from '../components/CourseCard';
import EmptyCoursesRecommendation from '../components/EmptyCoursesRecommendation';
import {
  getUpcomingCoursesTabs,
  getUpcomingCourses,
  searchCourses,
  getSearchFilters,
  getMyCourses,
  CourseTab,
  UpcomingCourse,
  SearchCourse,
  EnrolledCourse,
  FilterGroup,
  SortOption,
} from '../api/coursesApi';
import {getUserIdFromToken} from '../api/profileApi';

// ─── Icons ──────────────────────────────────────────────────────────────────

const SearchIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7 1a6 6 0 100 12A6 6 0 007 1zM0 7a7 7 0 1112.45 4.388l3.08 3.08a.75.75 0 11-1.06 1.062l-3.08-3.08A7 7 0 010 7z"
      fill="#192546"
    />
  </Svg>
);

const CloseIcon = () => (
  // Rebuilt from Marium's mask-based SVG as a plain fill — react-native-svg
  // 15.3.0 does not render <mask>. Same X shape, color #8F9098.
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M1.61612 1.61611C2.10427 1.12796 2.89573 1.12796 3.38388 1.61611L18.3839 16.6159C18.872 17.104 18.872 17.8955 18.3839 18.3836C17.8957 18.8718 17.1043 18.8718 16.6161 18.3836L1.61612 3.38385C1.12796 2.8957 1.12796 2.10426 1.61612 1.61611ZM18.3839 1.61611C17.8957 1.12796 17.1043 1.12796 16.6161 1.61611L1.61612 16.6159C1.12796 17.104 1.12796 17.8955 1.61612 18.3836C2.10427 18.8718 2.89573 18.8718 3.38388 18.3836L18.3839 3.38385C18.872 2.8957 18.872 2.10426 18.3839 1.61611Z"
      fill="#8F9098"
    />
  </Svg>
);

const SortIcon = () => (
  // Rebuilt from Marium's mask-based SVG as plain fill — same 3-bar sort
  // glyph, color #192546.
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1.33301 3C1.33301 2.73478 1.43335 2.48043 1.61195 2.29289C1.79056 2.10536 2.0328 2 2.28539 2H13.714C13.9665 2 14.2088 2.10536 14.3874 2.29289C14.566 2.48043 14.6663 2.73478 14.6663 3C14.6663 3.26522 14.566 3.51957 14.3874 3.70711C14.2088 3.89464 13.9665 4 13.714 4H2.28539C2.0328 4 1.79056 3.89464 1.61195 3.70711C1.43335 3.51957 1.33301 3.26522 1.33301 3ZM3.43162 8C3.43162 7.73478 3.53196 7.48043 3.71057 7.29289C3.88918 7.10536 4.13142 7 4.38401 7H11.6617C11.9142 7 12.1565 7.10536 12.3351 7.29289C12.5137 7.48043 12.614 7.73478 12.614 8C12.614 8.26522 12.5137 8.51957 12.3351 8.70711C12.1565 8.89464 11.9142 9 11.6617 9H4.38401C4.13142 9 3.88918 8.89464 3.71057 8.70711C3.53196 8.51957 3.43162 8.26522 3.43162 8ZM5.87944 13.1322C5.87944 12.867 5.97978 12.6127 6.15838 12.4251C6.33699 12.2376 6.57923 12.1322 6.83182 12.1322H9.21571C9.4683 12.1322 9.71054 12.2376 9.88915 12.4251C10.0678 12.6127 10.1681 12.867 10.1681 13.1322C10.1681 13.3974 10.0678 13.6518 9.88915 13.8393C9.71054 14.0269 9.4683 14.1322 9.21571 14.1322H6.83182C6.57923 14.1322 6.33699 14.0269 6.15838 13.8393C5.97978 13.6518 5.87944 13.3974 5.87944 13.1322Z"
      fill="#192546"
    />
  </Svg>
);

const RadioUnselected = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.00033 0.666504C12.0504 0.666504 15.3337 3.94975 15.3337 7.99984C15.3337 12.0499 12.0504 15.3332 8.00033 15.3332C3.95024 15.3332 0.666992 12.0499 0.666992 7.99984C0.666992 3.94975 3.95024 0.666504 8.00033 0.666504ZM8.00033 1.6665C4.50252 1.6665 1.66699 4.50203 1.66699 7.99984C1.66699 11.4976 4.50252 14.3332 8.00033 14.3332C11.4981 14.3332 14.3337 11.4976 14.3337 7.99984C14.3337 4.50203 11.4981 1.6665 8.00033 1.6665Z"
      fill="#0C4D91"
    />
  </Svg>
);

// Mask-based selected-radio SVG from Figma re-built as plain fills — see
// project rule: react-native-svg@15.3.0 does not render <mask> based SVGs.
const RadioSelected = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx={8} cy={8} r={8} fill="#0C4D91" />
    <Path
      d="M11.1943 5.88769C10.9348 5.60819 10.5046 5.60384 10.24 5.87877L7.26005 8.97474L5.75993 7.4162C5.49531 7.14127 5.06512 7.14562 4.80562 7.42512C4.55256 7.69768 4.55606 8.13115 4.81405 8.3992L7.26005 10.9405L11.1858 6.86177C11.4438 6.59373 11.4473 6.16025 11.1943 5.88769Z"
      fill="white"
    />
  </Svg>
);

const CircleArrowBtn = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Circle cx={7.5} cy={7.5} r={6.9} stroke="#192546" strokeWidth={1.2} />
  </Svg>
);

const Chevron = () => (
  <Svg width={9} height={9} viewBox="0 0 9 9" fill="none">
    <Path
      d="M6.34492 5.38164L6.43457 5.28262C6.82532 4.80378 6.82532 4.11146 6.43457 3.63262L6.34492 3.53359L2.9541 0.143359L2.06816 1.02812L2.28027 1.24082L5.45957 4.41953C5.48009 4.44078 5.47989 4.47529 5.45898 4.49629L2.06641 7.89004L2.95176 8.77539L6.34492 5.38164Z"
      fill="#192546"
    />
  </Svg>
);

// NOTE: location.png and uc_price.png are both 149 bytes on disk — that's
// suspiciously small for real artwork (likely a blank/placeholder image,
// not final icons). Wiring them in as-is per what actually exists, but
// flag to Marium/Robby that these two probably need real icon files.
// time.png also exists (confirmed via `dir`, same 149-byte placeholder
// size as location.png/uc_price.png) — using it here instead of time.svg
// (which kept failing to import as a component via the SVG transformer)
// for consistency with the other two icons.
const TimeIcon = () => (
  <Image source={require('../assets/images/time.png')} style={styles.assetIconTime} resizeMode="contain" />
);
const LocationIcon = () => (
  <Image source={require('../assets/images/location.png')} style={styles.assetIconLocation} resizeMode="contain" />
);
const PriceIcon = () => (
  <Image source={require('../assets/images/uc_price.png')} style={styles.assetIconPrice} resizeMode="contain" />
);

// Start date icon — real SVG provided by Marium
const StartDateIcon = () => (
  <Svg width={16.499} height={16.501} viewBox="0 0 17 17" fill="none">
    <Path
      d="M11.2539 0.0917C11.5223 0.0917 11.7393 0.3096 11.7393 0.578C11.739 0.8453 11.5221 1.0623 11.2539 1.0624H3.48926C2.14911 1.0625 1.06262 2.149 1.0625 3.48914V13.1942C1.0625 14.5345 2.14904 15.6209 3.48926 15.621H11.2539C11.5223 15.621 11.7393 15.8389 11.7393 16.1063C11.7392 16.3747 11.5223 16.5926 11.2539 16.5927H3.48926C1.61309 16.5925 0.0917969 15.0704 0.0917969 13.1942V3.48914C0.091902 1.61303 1.61313 0.09178 3.48926 0.0917H11.2539ZM11.8799 4.11609C12.07 3.92712 12.3772 3.9271 12.5664 4.11609L16.4492 7.9989C16.6141 8.16377 16.6357 8.41878 16.5127 8.6073L16.4482 8.68445L12.5664 12.5673C12.3772 12.7565 12.0701 12.7565 11.8799 12.5673C11.6906 12.378 11.6906 12.0709 11.8799 11.8807L14.9346 8.82703H6.40039C6.13197 8.82703 5.91406 8.61009 5.91406 8.34167C5.91417 8.07335 6.13204 7.8573 6.40039 7.8573H14.9346L11.8799 4.80261C11.6906 4.61335 11.6906 4.30535 11.8799 4.11609Z"
      fill="#192546"
      stroke="#192546"
      strokeWidth={0.183}
    />
  </Svg>
);

// ─── Tab bar ──────────────────────────────────────────────────────────────

type TopTab = 'my' | 'upcoming' | 'search';

const TopTabs = ({active, onChange}: {active: TopTab; onChange: (t: TopTab) => void}) => (
  <View style={styles.topTabsRow}>
    {([
      {key: 'my', label: 'My Courses'},
      {key: 'upcoming', label: 'Upcoming Courses'},
      {key: 'search', label: 'Search All Courses'},
    ] as {key: TopTab; label: string}[]).map((t) => (
      <TouchableOpacity key={t.key} onPress={() => onChange(t.key)} style={styles.topTabItem}>
        <Text style={[styles.topTabText, active === t.key && styles.topTabTextActive]}>{t.label}</Text>
        {active === t.key && <View style={styles.topTabUnderline} />}
      </TouchableOpacity>
    ))}
  </View>
);

// ─── My Courses tab ─────────────────────────────────────────────────────
// Wired to getMyCourses() — confirmed endpoint. Same screen handles both
// states: no enrolled courses yet -> recommendation cards (reusing
// EmptyCoursesRecommendation, same component used on the Certifications
// empty state); has enrolled courses -> list of CourseCards. Status text
// ("In-Progress") intentionally NOT shown on the card.

const MyCoursesTab = ({navigation}: {navigation: any}) => {
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const userId = await getUserIdFromToken();
      if (!userId) {
        setLoading(false);
        return;
      }
      const res = await getMyCourses(userId);
      setCourses(res.courses);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <ActivityIndicator color="#0C4D91" style={{marginTop: 40}} />;
  }

  if (courses.length === 0) {
    return (
      <ScrollView style={{width: '100%'}} showsVerticalScrollIndicator={false}>
        <EmptyCoursesRecommendation navigation={navigation} />
      </ScrollView>
    );
  }

  return (
    <FlatList
      style={{width: '100%'}}
      contentContainerStyle={{paddingHorizontal: 16, paddingTop: 24, paddingBottom: 24, gap: 16}}
      data={courses}
      keyExtractor={(item) => String(item.id)}
      renderItem={({item}) => (
        <CourseCard
          variant="enrolled"
          imageUri={item.image}
          title={item.title}
          metaItems={[
            {icon: 'calendar', text: item.enrollment.date_display},
            {icon: 'format', text: item.format_label},
          ]}
          statusText={item.card_status}
          buttonLabel="Continue Course"
          onPressButton={() => navigation?.navigate?.('CourseDetail', {courseId: item.id})}
        />
      )}
      showsVerticalScrollIndicator={false}
    />
  );
};

// ─── Upcoming Courses tab ──────────────────────────────────────────────────

const UpcomingCourseCard = ({course, onPress}: {course: UpcomingCourse; onPress: () => void}) => (
  <View style={styles.upcomingCard}>
    <Text style={styles.upcomingLabel}>{course.format_label}</Text>
    <Text style={styles.upcomingTitle}>{course.title}</Text>
    <View style={styles.detailsGrid}>
      <View style={styles.detailsGridItem}>
        <StartDateIcon />
        <Text style={styles.upcomingDetailText}>{course.date_label || course.start_date || '—'}</Text>
      </View>
      <View style={styles.detailsGridItem}>
        <TimeIcon />
        <Text style={styles.upcomingDetailText}>{course.duration || course.duration_days || '—'}</Text>
      </View>
      <View style={styles.detailsGridItem}>
        <LocationIcon />
        <Text style={styles.upcomingDetailText}>{course.location || '—'}</Text>
      </View>
      <View style={styles.detailsGridItem}>
        <PriceIcon />
        <Text style={styles.upcomingDetailText}>{course.price_label || '—'}</Text>
      </View>
    </View>
    <TouchableOpacity style={styles.viewCourseOutlineBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.viewCourseOutlineText}>{'View Course'}</Text>
    </TouchableOpacity>
  </View>
);

const UpcomingCoursesTab = ({onOpenCourse}: {onOpenCourse: (permalink: string) => void}) => {
  const [tabs, setTabs] = useState<CourseTab[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [courses, setCourses] = useState<UpcomingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    getUpcomingCoursesTabs().then(setTabs);
  }, []);

  const loadCourses = useCallback(async (tab: string, pageNum: number, append: boolean) => {
    setLoading(true);
    const res = await getUpcomingCourses(tab, pageNum, 10);
    setCourses((prev) => (append ? [...prev, ...res.courses] : res.courses));
    setHasMore(res.pagination.has_more);
    if (res.tabs.length) setTabs(res.tabs);
    setLoading(false);
  }, []);

  useEffect(() => {
    setPage(1);
    loadCourses(activeTab, 1, false);
  }, [activeTab, loadCourses]);

  const loadMore = () => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    loadCourses(activeTab, next, true);
  };

  return (
    <View style={styles.tabContent}>
      <Text style={styles.chooseTypeHeading}>{'Choose type of courses:'}</Text>
      <View style={styles.typeTabsRow}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.slug}
            onPress={() => setActiveTab(t.slug)}
            style={[styles.typeTabPill, activeTab === t.slug && styles.typeTabPillActive]}>
            <Text style={[styles.typeTabText, activeTab === t.slug && styles.typeTabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        renderItem={({item}) => (
          <UpcomingCourseCard course={item} onPress={() => onOpenCourse(item.permalink)} />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>{'No courses in this category yet.'}</Text> : null
        }
        ListFooterComponent={loading ? <ActivityIndicator color="#0C4D91" style={{marginVertical: 16}} /> : null}
        contentContainerStyle={{paddingBottom: 24, gap: 16}}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// ─── Search All Courses tab ────────────────────────────────────────────────

const SORT_LABELS: Record<string, string> = {
  popular: 'Most Popular',
  title_asc: 'Title A–Z',
  title_desc: 'Title Z–A',
  price_low: 'Lowest Price',
  price_high: 'Highest Price',
};

const SortSheet = ({
  visible,
  options,
  activeSort,
  onSelect,
  onClose,
}: {
  visible: boolean;
  options: SortOption[];
  activeSort: string;
  onSelect: (slug: string) => void;
  onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose}>
      <View style={styles.sortSheet}>
        <View style={styles.sortSheetHeaderRow}>
          <Text style={styles.sortSheetTitle}>{'Sort Results by'}</Text>
          <TouchableOpacity onPress={onClose}>
            <CloseIcon />
          </TouchableOpacity>
        </View>
        <View style={styles.sortOptionsWrap}>
          {options.map((opt) => (
            <TouchableOpacity key={opt.slug} style={styles.sortOptionRow} onPress={() => onSelect(opt.slug)}>
              <Text style={[styles.sortOptionText, activeSort === opt.slug && styles.sortOptionTextActive]}>
                {SORT_LABELS[opt.slug] || opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  </Modal>
);

// Filters opens as a FULL SCREEN (not a bottom sheet) per spec — presented
// via a fullScreen Modal so it covers the whole tab area like a new screen.
const FiltersSheet = ({
  visible,
  filters,
  activeFilters,
  onSelect,
  onClear,
  onClose,
}: {
  visible: boolean;
  filters: FilterGroup[];
  activeFilters: Record<string, string>;
  onSelect: (taxonomy: string, slug: string) => void;
  onClear: () => void;
  onClose: () => void;
}) => {
  const hasAnyFilter = Object.keys(activeFilters).length > 0;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.filtersScreen}>
        <ScrollView contentContainerStyle={styles.filtersScreenContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.filtersCloseBtn} onPress={onClose}>
            <CloseIcon />
          </TouchableOpacity>

          <View style={styles.filtersHeaderRow}>
            <Text style={styles.filtersTitle}>{'Filters'}</Text>
            <TouchableOpacity onPress={onClear}>
              <Text style={styles.clearFilterText}>{'Clear filters'}</Text>
            </TouchableOpacity>
          </View>

          {filters.map((group) => (
            <View key={group.taxonomy} style={styles.filterGroupBlock}>
              <Text style={styles.filterGroupLabel}>{group.label}</Text>
              {group.options.map((opt) => {
                const isSelected = activeFilters[group.param] === opt.slug;
                return (
                  <TouchableOpacity
                    key={opt.slug}
                    disabled={opt.is_disabled}
                    style={[styles.filterOptionRow, opt.is_disabled && styles.filterOptionDisabled]}
                    onPress={() => onSelect(group.param, opt.slug)}>
                    {isSelected ? <RadioSelected /> : <RadioUnselected />}
                    <Text style={styles.filterOptionText}>
                      {opt.name} {opt.count ? `(${opt.count})` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <View style={styles.filterDivider} />
            </View>
          ))}
        </ScrollView>

        <View style={styles.applyFiltersWrap}>
          <TouchableOpacity
            style={[styles.applyFiltersBtn, !hasAnyFilter && styles.applyFiltersBtnDisabled]}
            disabled={!hasAnyFilter}
            onPress={onClose}>
            <Text style={styles.applyFiltersText}>{'Apply Filters'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Search card icons ──────────────────────────────────────────────────

const QuestionCircleIcon = () => (
  <View style={styles.questionCircle}>
    <Text style={styles.questionCircleText}>{'?'}</Text>
  </View>
);

const PersonIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path
      d="M7.5 2.04541C9.09982 2.04541 10.4092 3.3547 10.4092 4.95459C10.4092 5.96203 9.88938 6.85287 9.10547 7.37549C11.337 8.05903 12.9539 10.1316 12.9541 12.5903L12.9551 12.9546H2.0459V12.5903C2.04608 10.1314 3.6634 8.05909 5.89453 7.37549C5.11093 6.85282 4.59181 5.96179 4.5918 4.95459C4.5918 3.35483 5.90036 2.04563 7.5 2.04541ZM7.46387 7.86377C4.95532 7.86377 2.99203 9.79069 2.77344 12.2271H12.1914C12.0094 9.79058 9.97298 7.86383 7.46387 7.86377ZM7.5 2.77197C6.3002 2.7722 5.31836 3.75464 5.31836 4.95459C5.31838 6.15452 6.30016 7.13601 7.5 7.13623C8.70002 7.13623 9.68259 6.15466 9.68262 4.95459C9.68262 3.7545 8.70004 2.77197 7.5 2.77197Z"
      fill="#192546"
    />
  </Svg>
);

const CertIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.6801 6.32951V7.40907L10.6511 7.94934L10.0577 8.88439H9.90659C9.90659 8.88489 9.90714 8.88539 9.90714 8.88539V12.9136C9.90714 12.9146 9.90659 12.9156 9.90659 12.9166C9.9077 12.9846 9.88058 13.0536 9.82301 13.1054C9.766 13.1573 9.69016 13.1825 9.61487 13.1814L9.61383 13.1816C9.61371 13.1816 9.6136 13.1817 9.61349 13.1817C9.61308 13.1818 9.61266 13.182 9.61211 13.182C9.51745 13.182 9.43719 13.1392 9.3835 13.0757L7.84077 11.6724L6.29805 13.0757C6.24436 13.1392 6.1641 13.182 6.06944 13.182C6.06879 13.182 6.06814 13.1818 6.06761 13.1816L6.06667 13.1814C5.99139 13.1825 5.91556 13.1578 5.85854 13.1054C5.80153 13.0536 5.77385 12.9846 5.77496 12.9166L5.77468 12.9151L5.7744 12.9136V8.88539C5.7744 8.88489 5.77496 8.88439 5.77496 8.88439H5.6255L5.03157 7.94934L4.00311 7.40907V6.32951L3.40918 5.39447L4.00311 4.45892L4.00256 3.37887L5.03101 2.83809L5.62495 1.90405H6.81337L7.84072 1.36377L8.86917 1.90405H10.0576L10.651 2.83809L11.68 3.37887V4.45892L12.2728 5.39447L11.6801 6.32951ZM6.3641 8.88537V12.2741L7.60124 11.1487C7.60453 11.1443 7.60741 11.1397 7.61031 11.135C7.61572 11.1263 7.62119 11.1175 7.62947 11.1099C7.6876 11.057 7.76453 11.0329 7.84037 11.0344C7.91676 11.0329 7.99314 11.057 8.05127 11.1099C8.05868 11.117 8.06383 11.1251 8.06898 11.1333L8.06899 11.1333C8.0723 11.1385 8.0756 11.1438 8.0795 11.1487L9.31664 12.2741V8.88537C9.31664 8.88486 9.31719 8.88436 9.31719 8.88436H8.86938L7.84093 9.42514L6.81358 8.88436H6.36466C6.36426 8.88436 6.36415 8.88462 6.36412 8.88496C6.36411 8.88509 6.36411 8.88523 6.36411 8.88537H6.3641ZM11.0884 3.68847V4.60236L11.5904 5.3944L11.0884 6.18593V7.09881L10.2177 7.55602L9.71619 8.34705H8.71098L7.84139 8.80375L6.97235 8.34705H5.96713L5.46508 7.55602L4.59438 7.09881V6.18593L4.09233 5.3944L4.59438 4.60236V3.68847L5.46508 3.23127L5.96713 2.44124H6.97178L7.84082 1.98454L8.71041 2.44124H9.71618L10.2182 3.23127L11.0884 3.68847Z"
      fill="#192546"
    />
  </Svg>
);

const ClockSmallIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 16 16" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8 1.333A6.667 6.667 0 118 14.667 6.667 6.667 0 018 1.333zm0 1.334a5.333 5.333 0 100 10.666A5.333 5.333 0 008 2.667zm-.667 1.333h1v3.72l2.514 1.451-.5.866-3.014-1.74V4z"
      fill="#192546"
    />
  </Svg>
);

const DeliveryIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M7.588 1.5c.146 0 .264.118.264.265 0 .149-.118.264-.264.264H3.354c-.732 0-1.325.593-1.325 1.325v5.293c0 .73.593 1.324 1.325 1.324h4.234c.147 0 .265.119.265.265 0 .146-.118.264-.265.264H3.354c-1.02 0-1.85-.83-1.854-1.853V3.354C1.5 2.33 2.33 1.5 3.354 1.5h4.234zm.342 2.195c.104-.103.271-.103.375 0l2.117 2.118c.09.09.101.228.034.33l-.034.043-2.117 2.118a.264.264 0 01-.375-.264L9.596 6.265H4.94a.264.264 0 010-.53h4.657L7.93 4.069a.264.264 0 010-.374z"
      fill="#192546"
    />
  </Svg>
);

const SearchCourseCard = ({course, onPress}: {course: SearchCourse; onPress: () => void}) => (
  <View style={styles.searchCard}>
    <View style={styles.searchCardImageFrame}>
      {course.image_url ? (
        <Image source={{uri: course.image_url}} style={styles.searchCardImage} resizeMode="cover" />
      ) : (
        <View style={styles.searchCardImagePlaceholder} />
      )}
    </View>

    <View style={styles.searchCardBody}>
      <Text style={styles.searchCardTitle}>{course.title}</Text>

      {course.certification_logos.length > 0 && (
        <View style={styles.logoRow}>
          {course.certification_logos.map((logo, idx) => (
            <Image
              key={idx}
              source={{uri: logo.logo_small_url || logo.logo_url}}
              style={styles.logoImg}
              resizeMode="contain"
            />
          ))}
        </View>
      )}

      <View style={styles.searchCardDivider} />

      <View style={styles.searchCardInfoRow}>
        <QuestionCircleIcon />
        <Text style={styles.searchCardInfoText} numberOfLines={2}>{course.description}</Text>
      </View>
      <View style={styles.searchCardInfoRow}>
        <PersonIcon />
        <Text style={styles.searchCardInfoText} numberOfLines={2}>{course.for_whom}</Text>
      </View>
      <View style={styles.searchCardInfoRow}>
        <CertIcon />
        <Text style={styles.searchCardInfoText} numberOfLines={2}>{course.certificate}</Text>
      </View>
      <View style={styles.searchCardInfoRow}>
        <ClockSmallIcon />
        <Text style={styles.searchCardInfoText}>{course.course_length}</Text>
        <DeliveryIcon />
        <Text style={styles.searchCardInfoText}>{course.delivery_types_label}</Text>
      </View>
    </View>

    <View style={styles.searchCardBtnFrame}>
      <TouchableOpacity style={styles.searchCardBtn} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.searchCardBtnText}>{'View Course'}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Google Reviews widget — CONFIRMED static link (July 2026) ────────────
// Uses the real asset (assets/images/googlereview) instead of a hand-built
// approximation. Extension assumed .png (matches the pattern of
// time.png/location.png/uc_price.png elsewhere in this project) — confirm
// if it's actually .svg or another format and this require() needs fixing.

const GOOGLE_REVIEWS_URL =
  'https://www.google.com/search?hl=en-PK&gl=pk&q=Institute+of+Project+Management,+25+Mount+Street+Upper,+Dublin+2,+D02+E302,+Ireland&ludocid=11273352623758752740&lsig=AB86z5X_7L6uPydSyf97kGu9QDHQ#lrd=';

const GoogleReviewsWidget = () => (
  <TouchableOpacity
    style={styles.googleReviewsWrap}
    onPress={() => Linking.openURL(GOOGLE_REVIEWS_URL).catch(() => {})}
    activeOpacity={0.7}>
    <View style={styles.googleReviewsTextWrap}>
      <Text style={styles.googleReviewsText}>{'Google Reviews (100+)'}</Text>
    </View>
    <Image
      source={require('../assets/images/googlereview.png')}
      style={styles.googleReviewsImage}
      resizeMode="contain"
    />
  </TouchableOpacity>
);

const SearchAllCoursesTab = () => {
  const [query, setQuery] = useState('');
  // NOTE: was hardcoded to 'popular', which forced &sort=popular on every
  // request regardless of what order the Hub website shows by default —
  // this is very likely why mobile's order didn't match web. Leaving this
  // unset on first load means searchCourses() (which only appends a
  // param when it's truthy) omits &sort= entirely, so the backend falls
  // back to its own default ordering — the same one the website itself
  // gets when no sort is explicitly chosen. Once that first response
  // comes back, we lock the picker to res.sort so subsequent requests
  // (pagination, filter changes) stay consistent with whatever that
  // resolved default turned out to be. Still worth Robby confirming that
  // the web frontend also omits sort by default rather than sending its
  // own implicit value we can't see from the API alone.
  const [sort, setSort] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [results, setResults] = useState<SearchCourse[]>([]);
  const [resultsLabel, setResultsLabel] = useState('');
  const [sortOptions, setSortOptions] = useState<SortOption[]>([]);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);

  const runSearch = useCallback(async () => {
    setLoading(true);
    const res = await searchCourses({
      query,
      ...(sort ? {sort: sort as SortOption['slug']} : {}),
      ...activeFilters,
      page: 1,
      per_page: 10,
    });
    setResults(res.courses);
    setResultsLabel(res.results_label);
    setSortOptions(res.sort_options);
    if (!sort && res.sort) setSort(res.sort); // lock to the backend's resolved default
    setLoading(false);
  }, [query, sort, activeFilters]);

  const loadFilters = useCallback(async () => {
    const res = await getSearchFilters({...activeFilters});
    setFilterGroups(res.filters);
  }, [activeFilters]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  const handleSelectFilter = (taxonomy: string, slug: string) => {
    setActiveFilters((prev) => {
      const next = {...prev};
      if (next[taxonomy] === slug) {
        delete next[taxonomy]; // tap again to deselect
      } else {
        next[taxonomy] = slug;
      }
      return next;
    });
  };

  return (
    <View style={styles.tabContent}>
      {/* Google Reviews widget — CONFIRMED static (July 2026): a fixed
          link, not driven by any endpoint. Opens the business's Google
          listing externally. */}
      <GoogleReviewsWidget />

      <View style={styles.searchBarRow}>
        <View style={styles.searchInputWrap}>
          <SearchIcon />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses"
            placeholderTextColor="#8F9098"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={runSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.sortIconBtn} onPress={() => setSortSheetOpen(true)}>
          <SortIcon />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.showFiltersBtn} onPress={() => setFiltersSheetOpen(true)}>
        <Text style={styles.showFiltersText}>{'Show Filters'}</Text>
      </TouchableOpacity>

      <Text style={styles.resultsLabel}>{resultsLabel || `Search Results: ${results.length}`}</Text>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={({item}) => (
          <SearchCourseCard
            course={item}
            onPress={() => {
              if (item.permalink) Linking.openURL(item.permalink).catch(() => {});
            }}
          />
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>{'No courses matched your filters.'}</Text> : null
        }
        ListFooterComponent={loading ? <ActivityIndicator color="#0C4D91" style={{marginVertical: 16}} /> : null}
        contentContainerStyle={{paddingBottom: 24, gap: 24}}
        showsVerticalScrollIndicator={false}
      />

      <SortSheet
        visible={sortSheetOpen}
        options={sortOptions}
        activeSort={sort}
        onSelect={(slug) => {
          setSort(slug);
          setSortSheetOpen(false);
        }}
        onClose={() => setSortSheetOpen(false)}
      />
      <FiltersSheet
        visible={filtersSheetOpen}
        filters={filterGroups}
        activeFilters={activeFilters}
        onSelect={handleSelectFilter}
        onClear={() => setActiveFilters({})}
        onClose={() => setFiltersSheetOpen(false)}
      />
    </View>
  );
};

// ─── Screen ─────────────────────────────────────────────────────────────────

const CoursesScreen = ({navigation}: any) => {
  const [tab, setTab] = useState<TopTab>('my');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openCourse = (permalink: string) => {
    if (!permalink) return;
    Linking.openURL(permalink).catch((err) => console.error('[CoursesScreen] openCourse', err));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />
      <TopTabs active={tab} onChange={setTab} />
      {tab === 'my' && <MyCoursesTab navigation={navigation} />}
      {tab === 'upcoming' && <UpcomingCoursesTab onOpenCourse={openCourse} />}
      {tab === 'search' && <SearchAllCoursesTab />}
      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </SafeAreaView>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},

  topTabsRow: {
    flexDirection: 'row',
    height: 45,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
  },
  topTabItem: {marginRight: 12, paddingVertical: 4},
  topTabText: {
    color: '#8F9098',
    fontFamily: 'Runda-Medium',
    fontSize: 14,
    lineHeight: 18,
  },
  topTabTextActive: {color: '#192546'},
  topTabUnderline: {height: 2, backgroundColor: '#084D92', marginTop: 4, borderRadius: 1},

  tabContent: {flex: 1, paddingTop: 24, paddingHorizontal: 16, alignItems: 'center'},

  // Upcoming
  chooseTypeHeading: {color: '#192647', fontFamily: 'Runda-Medium', fontSize: 16, letterSpacing: 0.08, marginBottom: 16},
  typeTabsRow: {flexDirection: 'row', gap: 7.33, marginBottom: 24, flexWrap: 'wrap'},
  typeTabPill: {paddingVertical: 8, paddingHorizontal: 12, borderRadius: 5, backgroundColor: '#EEF7FC'},
  typeTabPillActive: {backgroundColor: '#0C4D91'},
  typeTabText: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 12},
  typeTabTextActive: {color: '#FFFFFF'},

  upcomingCard: {
    width: 358,
    height: 220,
    padding: 16,
    alignItems: 'flex-start',
    gap: 16,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
  },
  upcomingLabel: {alignSelf: 'stretch', color: '#192546', fontFamily: 'Runda-Medium', fontSize: 14},
  upcomingTitle: {color: '#192546', fontFamily: 'Runda-Normal', fontSize: 14, lineHeight: 18},
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    columnGap: 61,
  },
  detailsGridItem: {flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'stretch', width: '40%'},
  upcomingDetailText: {color: '#192546', fontFamily: 'Runda-Normal', fontSize: 14, lineHeight: 18},
  assetIconTime: {width: 13.846, height: 13.846},
  assetIconLocation: {width: 12.692, height: 15},
  assetIconPrice: {width: 13.792, height: 13.763},

  viewCourseOutlineBtn: {
    height: 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: '#0C4D91',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  viewCourseOutlineText: {color: '#0C4D91', fontFamily: 'Runda-Medium', fontSize: 12},

  emptyText: {color: '#8F9098', fontFamily: 'Runda-Normal', fontSize: 13, textAlign: 'center', marginTop: 24},

  // Search
  googleReviewsWrap: {
    width: 128.578,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  googleReviewsTextWrap: {justifyContent: 'center', alignSelf: 'stretch'},
  googleReviewsText: {
    color: '#192647',
    textAlign: 'center',
    fontFamily: 'Runda-Medium',
    fontSize: 8.5,
    lineHeight: 22,
  },
  googleReviewsImage: {
    width: 128.578,
    height: 19.568,
  },

  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 358,
    marginBottom: 12,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 5,
    backgroundColor: '#F5F6FA',
  },
  searchInput: {flex: 1, color: '#192546', fontFamily: 'Runda-Normal', fontSize: 14},
  // Sort trigger — reusable "sort button" pattern used elsewhere in the app
  sortIconBtn: {
    height: 36,
    width: 36,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E8E9F1', // TODO: exact border color was cut off in Marium's spec ("1px soli...") — confirm
  },
  showFiltersBtn: {
    width: 358,
    height: 40,
    borderRadius: 5,
    backgroundColor: '#0C4D91',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  showFiltersText: {color: '#FFFFFF', fontFamily: 'Runda-Medium', fontSize: 14},
  resultsLabel: {
    alignSelf: 'flex-start',
    color: '#19366A',
    fontFamily: 'Runda-Medium',
    fontSize: 14,
    marginBottom: 16,
  },

  searchCard: {
    width: 358,
    minHeight: 543.025,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 24,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F1F5',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
    // NOTE: overflow:'hidden' was removed here — on Android, overflow
    // hidden on a View with elevation clips/suppresses the shadow, which
    // is very likely why the card borders looked different from every
    // other card in the emulator screenshot. Clipping now happens only on
    // the image frame below (borderRadius on top corners), not the whole
    // card, so the shadow renders normally.
  },
  searchCardImageFrame: {
    height: 179,
    alignSelf: 'stretch',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: 'hidden',
  },
  // Was: height 215 inside a 179-tall frame, so ~36px of every image got
  // silently clipped at the bottom by the frame's overflow:'hidden'. With
  // resizeMode="cover", how much of a given photo that clip ate depended
  // on that photo's own aspect ratio, so some cards' images looked
  // shifted/cropped differently than others — this is very likely the
  // misalignment being reported. Sizing the image to the frame itself
  // (rather than a taller fixed height) makes every card crop
  // consistently, centered, with nothing clipped off unexpectedly.
  searchCardImage: {width: 151, height: 179},
  searchCardImagePlaceholder: {width: 151, height: 179, backgroundColor: '#EEF7FC'},
  searchCardBody: {paddingHorizontal: 16, alignSelf: 'stretch', gap: 16},
  searchCardTitle: {color: '#192647', fontFamily: 'Runda-Bold', fontSize: 18, letterSpacing: 0.09},
  logoRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  logoImg: {width: 101, aspectRatio: 101 / 36, alignSelf: 'stretch'},
  searchCardDivider: {height: 1, alignSelf: 'stretch', backgroundColor: '#E8E9F1'},
  searchCardInfoRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8},
  searchCardInfoText: {flex: 1, color: '#192647', fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16},
  questionCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 0.75,
    borderColor: '#192546',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionCircleText: {color: '#192546', fontFamily: 'System', fontWeight: '700', fontSize: 8, lineHeight: 9},
  searchCardBtnFrame: {
    alignSelf: 'stretch',
    flex: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#EEF7FC',
  },
  searchCardBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 50,
    backgroundColor: '#0C4D91',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCardBtnText: {color: '#FFFFFF', fontFamily: 'Runda-Medium', fontSize: 14},

  // Bottom sheets
  sheetBackdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end'},
  sortSheet: {backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16},
  sortSheetHeaderRow: {
    height: 56,
    paddingTop: 18,
    paddingRight: 24,
    paddingBottom: 16.5,
    paddingLeft: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
  },
  sortSheetTitle: {
    flex: 1,
    color: '#0C4D91',
    textAlign: 'center',
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    letterSpacing: 0.08,
  },
  sortOptionsWrap: {paddingHorizontal: 16, gap: 6},
  sortOptionRow: {paddingVertical: 12, paddingHorizontal: 20, alignSelf: 'stretch'},
  sortOptionText: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 14},
  sortOptionTextActive: {color: '#0C4D91'},

  // Filters — FULL SCREEN, not a bottom sheet
  filtersScreen: {flex: 1, borderRadius: 8, backgroundColor: '#EEF7FC'},
  filtersScreenContent: {
    padding: 24,
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 25,
  },
  filtersCloseBtn: {alignSelf: 'flex-end'},
  filtersHeaderRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch'},
  filtersTitle: {color: '#192546', fontFamily: 'Runda-Bold', fontSize: 18, letterSpacing: 0.09},
  clearFilterText: {
    color: '#7C86A1',
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  filterGroupBlock: {alignSelf: 'stretch'},
  filterGroupLabel: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 16, letterSpacing: 0.08, marginBottom: 12},
  filterOptionRow: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8},
  filterOptionDisabled: {opacity: 0.35},
  filterOptionText: {color: '#192546', fontFamily: 'Runda-Normal', fontSize: 14, lineHeight: 18},
  filterDivider: {alignSelf: 'stretch', height: 1, backgroundColor: '#7C86A1', marginTop: 8},
  applyFiltersWrap: {padding: 16},
  applyFiltersBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
    borderRadius: 5,
    backgroundColor: '#0C4D91',
  },
  applyFiltersBtnDisabled: {backgroundColor: '#B7C3D6'},
  applyFiltersText: {color: '#FFFFFF', fontFamily: 'Runda-Medium', fontSize: 14},
});

export default CoursesScreen;

/* ─────────────────────────────────────────────────────────────────────────
   STILL MISSING — flagged rather than guessed:

   [Latest pass, July 2026]:
   - My Courses card: fixed via CourseCard.tsx's new 'enrolled' variant —
     16px gap between image/text, circle+arrow icon now sits top-right
     next to the title (not embedded in the button), bottom row is
     status text (left, e.g. "In-Progress") + content-width "Continue
     Course" button (right), matching the corrected screenshot.
   - Upcoming Courses "View Course" button: fixed to full-width, radius 50,
     border 1.5px solid #0C4D91 (was radius 100 / 1px border).
   - Search All Courses card: rebuilt image frame (179 tall, image 151x215
     bleeding past it), logo sizing fixed to 101 width / 101:36 aspect
     ratio (was a fixed 36x36 square — wrong for non-square cert logos),
     CertIcon swapped to the exact final SVG path sent. Removed
     overflow:'hidden' from the elevated card container — on Android that
     combination suppresses/clips the shadow, which was very likely why
     the Search cards' borders looked different from every other card in
     testing. Clipping now happens only on the (non-elevated) image frame.

   1. My Courses tab — now wired to the confirmed getMyCourses() endpoint,
      handles both empty (recommendations) and populated (CourseCard list)
      states. No longer blocked.

   2. Upcoming Courses card icons — start date icon uses the real SVG
      Marium provided. The other three (time, location, uc_price) are
      referenced as existing asset image files rather than inline SVGs —
      wired via require('../assets/images/{name}.png') as a BEST GUESS path.
      Confirm the actual folder/filenames match, or these requires will
      fail to resolve at build time.

   3. Search All Courses card — logo row now uses real
      <Image source={{uri: logo.logo_small_url || logo.logo_url}} />
      per certification logo (IPMA, TU Dublin, etc. — confirmed backend
      data via certification_logos[]).

   4. "Search Results: N" label — pulled directly from the API's own
      results_label field, dynamic per Marium's confirmation, left-aligned.

   5. Google rating widget (G logo + 5 stars + review count) on the Search
      tab — NOT built. No backing data field in any confirmed endpoint
      (courses/search, courses/search/filters, courses/upcoming all lack
      rating/review fields). Need to know if this is a live rating (ask
      Robby for the source) or a static trust badge — flagged inline in
      SearchAllCoursesTab too.

   6. "View Course" (Upcoming + Search All) and "Continue Course" (My
      Courses) all open the relevant permalink via Linking.openURL —
      confirmed working pattern, no in-app WebView route dependency.

   7. Runda-Bold / Runda-Medium / Runda-Normal are used as fontFamily values
      per project convention (linked family names, not fontWeight) — confirm
      these match the exact linked names in android/app/src/main/assets/fonts.

   8. Sort button border color — Marium's spec was cut off mid-message
      ("border: 1px soli..."). Used #E8E9F1 as a placeholder border color;
      confirm the real value.

   9. Search card top image — spec gives padding (10px 93.158px 0 93px)
      implying a centered, fairly small image within the 358px-wide card,
      but SearchCourse has no dedicated small/detail image field beyond
      image_url/phone_image_url (which are full card-width images used
      elsewhere). Rendered at 172x172 as a reasonable interpretation —
      confirm against Figma if this doesn't match.

   10. Filters full-screen — presented via Modal presentationStyle=
       "fullScreen" rather than a real navigator screen/route, since
       CoursesScreen doesn't currently push into the stack for this. Apply
       Filters button is disabled (opacity via #B7C3D6 bg) when no filter
       is active, per spec.
───────────────────────────────────────────────────────────────────────── */
