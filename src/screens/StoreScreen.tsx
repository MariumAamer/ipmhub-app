/* eslint-disable prettier/prettier */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  Animated,
  Platform,
  Linking,
} from 'react-native';
import Svg, { Path, Mask, Rect, G, ClipPath, Defs } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import * as Keychain from 'react-native-keychain';
import AppHeader from '../components/AppHeader';

// ─── Token ───────────────────────────────────────────────────────────────────

const getSavedToken = async (): Promise<string | null> => {
  try {
    const creds = await Keychain.getGenericPassword();
    if (!creds?.password) return null;
    const parsed = JSON.parse(creds.password);
    return parsed?.token ?? null;
  } catch { return null; }
};

// ─── API ─────────────────────────────────────────────────────────────────────

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';
type SortValue = 'popular' | 'low' | 'high';
type CategorySlug = 'all' | 'core-certification' | 'specialised-certifications' | 'academy-short-courses';

async function apiFetch(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// Confirmed via Postman: the real courses endpoint is "store-courses"
// (hyphenated, no "/courses" suffix) — the old "store/courses" path was
// wrong and always returned the same fixed 4-item slice. This endpoint
// returns all matching items in a single response, so there's no
// separate page param.
const fetchCourses = (token: string, category: CategorySlug = 'all', sort: SortValue = 'popular', _page = 1) =>
  apiFetch(`${BASE}/custom/v1/store-courses?category=${category}&sort=${sort}`, token);

const fetchCertifications = (token: string, category: CategorySlug = 'all', sort: SortValue = 'popular', page = 1) =>
  apiFetch(`${BASE}/custom/v1/store/certifications?category=${category}&sort=${sort}&page=${page}`, token);

const fetchSoftwares = (token: string) =>
  apiFetch(`${BASE}/custom/v1/pm-softwares/pm-softwares?category=all`, token);

async function fetchAllStore(token: string) {
  const [courses, certifications, softwares] = await Promise.all([
    fetchCourses(token).catch(() => ({ items: [], pagination: null })),
    fetchCertifications(token).catch(() => ({ items: [], pagination: null })),
    fetchSoftwares(token).catch(() => ({ items: [], pagination: null })),
  ]);
  return { courses, certifications, softwares };
}

// ─── Types ───────────────────────────────────────────────────────────────────

type MainTab = 'All' | 'Courses' | 'Certifications' | 'PM Softwares';
type SortOption = 'Most Popular' | 'Lowest Price' | 'Highest Price';
type CardType = 'course' | 'certification' | 'software';

const SORT_VALUE_MAP: Record<SortOption, SortValue> = {
  'Most Popular': 'popular',
  'Lowest Price': 'low',
  'Highest Price': 'high',
};

interface StoreItem {
  id: number;
  title: string;
  description: string;
  category?: string;
  price?: number;
  price_label?: string;
  image: { url: string; alt: string };
  book_call?: { url: string; title: string };
  view_course?: { url: string; title: string };
  view_link?: { url: string; title: string };
}

interface Pagination {
  total: number; page: number; per_page: number;
  total_pages: number; showing_start: number; showing_end: number;
}

interface StoreResponse {
  items: StoreItem[];
  filters?: { slug: string; label: string }[];
  pagination: Pagination | null;
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const FilterIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Mask id="m1" maskUnits="userSpaceOnUse" x={1} y={2} width={14} height={13}>
      <Path fillRule="evenodd" clipRule="evenodd"
        d="M1.334 3c0-.265.1-.52.279-.707C1.792 2.105 2.034 2 2.286 2h11.429c.253 0 .495.105.674.293C14.567 2.48 14.667 2.735 14.667 3s-.1.52-.278.707C14.21 3.895 13.967 4 13.715 4H2.286c-.253 0-.495-.105-.674-.293C1.433 3.52 1.334 3.265 1.334 3ZM3.433 8c0-.265.1-.52.279-.707C3.89 7.105 4.132 7 4.385 7h7.278c.253 0 .495.105.674.293.178.187.278.442.278.707s-.1.52-.278.707C12.157 8.895 11.915 9 11.663 9H4.385c-.253 0-.495-.105-.674-.293C3.533 8.52 3.433 8.265 3.433 8ZM5.88 13.132c0-.265.1-.52.279-.707.178-.188.42-.293.673-.293h2.384c.253 0 .495.105.673.293.179.187.279.442.279.707s-.1.52-.279.707c-.178.187-.42.293-.673.293H6.832c-.253 0-.495-.105-.673-.293-.179-.188-.279-.442-.279-.707Z"
        fill="#006FFD" />
    </Mask>
    <G mask="url(#m1)"><Rect x={0.002} y={-0.001} width={16} height={16} fill="#192546" /></G>
  </Svg>
);

const ArrowIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path d="M6.5 3L9.5 6L6.5 9M9.5 6H2.5" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CallIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
    <Path d="M0 14C0 21.7198 6.28017 28 14 28C21.7198 28 28 21.7198 28 14C28 6.28017 21.7198 0 14 0C6.28017 0 0 6.28017 0 14ZM5.83333 10.3717C5.83333 9.408 6.181 8.442 6.916 7.70817L6.94517 7.679C7.9645 6.65967 9.61717 6.65967 10.6365 7.679L11.0271 8.06959C11.8307 8.87321 11.8307 10.1761 11.0271 10.9797C10.4442 11.5626 10.2502 12.4461 10.639 13.173C11.6481 15.0596 13.0591 16.4468 14.8348 17.382C15.5581 17.7629 16.4313 17.5619 17.0093 16.9838C17.819 16.1742 19.1317 16.1742 19.9413 16.9838L20.321 17.3635C21.3403 18.3828 21.3403 20.0355 20.321 21.0548L20.2918 21.084C19.558 21.819 18.592 22.1667 17.6283 22.1667C12.6817 22.1667 5.83333 15.6987 5.83333 10.3717Z" fill="#0C4D91" />
  </Svg>
);

const BackIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
    <Defs>
      <ClipPath id="clip0"><Rect width={28} height={27.9996} fill="white" /></ClipPath>
    </Defs>
    <G clipPath="url(#clip0)">
      <Rect x={0.7} y={0.7} width={26.6} height={26.5996} rx={6.3} stroke="#8F9098" strokeWidth={1.4} />
      <Path d="M10.4494 12.8438C9.8504 13.4423 9.8504 14.4151 10.4494 15.0136L15.2973 19.8623L16 19.1596L11.1521 14.3104C10.9423 14.0997 10.9423 13.7577 11.1521 13.547L15.9973 8.70277L15.2941 8.00006L10.4494 12.8438Z"
        fill="#8F9098" stroke="#8F9098" strokeWidth={0.7} />
    </G>
  </Svg>
);

const BlueLine = () => (
  <Svg width={43} height={2} viewBox="0 0 43 2" fill="none">
    <Path d="M0 0.75H42.954" stroke="#46B0E3" strokeWidth={1.5} />
  </Svg>
);

// ─── Shared button components ─────────────────────────────────────────────────

function ActionButtons({ callUrl, btnUrl, btnLabel }: { callUrl: string; btnUrl: string; btnLabel: string }) {
  return (
    <View style={styles.cardActions}>
      <TouchableOpacity onPress={() => { if (callUrl) Linking.openURL(callUrl); }} activeOpacity={0.8}>
        <CallIcon />
      </TouchableOpacity>
      <LinearGradient
        colors={['#E257E4', '#084D92']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7035, y: 0 }}
        style={styles.gradientBtn}>
        <TouchableOpacity
          style={styles.gradientBtnInner}
          onPress={() => { if (btnUrl) Linking.openURL(btnUrl); }}
          activeOpacity={0.85}>
          <Text style={styles.gradientBtnText}>{btnLabel}</Text>
          <ArrowIcon />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={[styles.card, { opacity, marginBottom: 16 }]}>
      <View style={[styles.courseImgFrame, { backgroundColor: '#D5EEFA' }]} />
      <View style={styles.textFrame}>
        <View style={{ height: 14, backgroundColor: '#E8E9F1', borderRadius: 4, width: '90%' }} />
        <View style={{ height: 2, backgroundColor: '#46B0E3', width: 43 }} />
        <View style={{ height: 12, backgroundColor: '#E8E9F1', borderRadius: 4, width: '80%' }} />
        <View style={{ height: 12, backgroundColor: '#E8E9F1', borderRadius: 4, width: '70%' }} />
        <View style={{ flex: 1 }} />
        <View style={{ height: 28, backgroundColor: '#E8E9F1', borderRadius: 100 }} />
      </View>
    </Animated.View>
  );
}

// ─── Sort Sheet ───────────────────────────────────────────────────────────────

function SortSheet({ visible, selected, onSelect, onClose }: {
  visible: boolean; selected: SortOption;
  onSelect: (o: SortOption) => void; onClose: () => void;
}) {
  const translateY = useRef(new Animated.Value(300)).current;
  const OPTIONS: SortOption[] = ['Most Popular', 'Lowest Price', 'Highest Price'];
  useEffect(() => {
    Animated.timing(translateY, { toValue: visible ? 0 : 300, duration: 260, useNativeDriver: true }).start();
  }, [visible]);
  if (!visible) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Sort Results by</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.sheetClose}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.sheetOptions}>
          {OPTIONS.map(opt => (
            <TouchableOpacity key={opt} style={styles.sheetRow}
              onPress={() => { onSelect(opt); onClose(); }} activeOpacity={0.7}>
              <Text style={[styles.sheetOptionText, selected === opt && styles.sheetOptionActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Sort Bar ─────────────────────────────────────────────────────────────────

function SortBar({ sort, onPress }: { sort: SortOption; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.sortBar} onPress={onPress} activeOpacity={0.8}>
      <FilterIcon />
      <Text style={styles.sortBarLabel}>Sort by: </Text>
      <Text style={styles.sortBarValue}>{sort}</Text>
    </TouchableOpacity>
  );
}

// ─── Sub-tab Row ──────────────────────────────────────────────────────────────

function SubTabRow({ filters, active, onPress }: {
  filters: { slug: string; label: string }[];
  active: string;
  onPress: (slug: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.subTabScrollContent} style={styles.subTabScroll}>
      {filters.map(f => (
        <TouchableOpacity key={f.slug}
          style={[styles.subTab, active === f.slug && styles.subTabActive]}
          onPress={() => onPress(f.slug)} activeOpacity={0.7}>
          <Text style={[styles.subTabText, active === f.slug && styles.subTabTextActive]}>{f.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── COURSE CARD ─────────────────────────────────────────────────────────────

function CourseCard({ item }: { item: StoreItem }) {
  const btnUrl = item.view_course?.url || item.view_link?.url || '';
  const callUrl = item.book_call?.url || '';
  return (
    <View style={[styles.card, { marginBottom: 16 }]}>
      {/* Left: LinearGradient MUST be root per project rules */}
      <LinearGradient
        colors={['#ABE4FF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.courseImgFrame}>
        {item.image?.url
          ? <Image source={{ uri: item.image.url }} style={styles.coursePhoto} resizeMode="cover" />
          : <View style={{ flex: 1 }} />}
      </LinearGradient>

      {/* Right: explicit height so Android doesn't clip */}
      <View style={styles.textFrame}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.blueLineWrap}><BlueLine /></View>
        <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text>
        <View style={styles.cardSpacer} />
        {!!item.price_label && <Text style={styles.cardPrice}>{item.price_label}</Text>}
        <ActionButtons callUrl={callUrl} btnUrl={btnUrl} btnLabel="View Course" />
      </View>
    </View>
  );
}

// ─── CERTIFICATION CARD ───────────────────────────────────────────────────────

function CertCard({ item }: { item: StoreItem }) {
  const btnUrl = item.view_course?.url || item.view_link?.url || '';
  const callUrl = item.book_call?.url || '';
  return (
    <View style={[styles.card, { marginBottom: 16 }]}>
      {/* Left: gradient fills entire left column, image centered on top */}
      <LinearGradient
        colors={['#ABE4FF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.leftFrame}>
        <Image
          source={{ uri: item.image?.url || '' }}
          style={styles.certImg}
          resizeMode="cover"
        />
      </LinearGradient>
      {/* Right */}
      <View style={styles.textFrame}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.blueLineWrap}><BlueLine /></View>
        <Text style={styles.cardDesc} numberOfLines={4}>{item.description}</Text>
        <View style={styles.cardSpacer} />
        <ActionButtons callUrl={callUrl} btnUrl={btnUrl} btnLabel="Learn More" />
      </View>
    </View>
  );
}

// ─── PM SOFTWARE CARD ─────────────────────────────────────────────────────────

function SoftwareCard({ item }: { item: StoreItem }) {
  const btnUrl = item.view_course?.url || item.view_link?.url || '';
  const callUrl = item.book_call?.url || '';
  return (
    <View style={[styles.card, { marginBottom: 16 }]}>
      {/* Left: gradient fills entire left column, logo centered on top */}
      <LinearGradient
        colors={['#ABE4FF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.leftFrame}>
        <Image
          source={{ uri: item.image?.url || '' }}
          style={styles.swImg}
          resizeMode="contain"
        />
      </LinearGradient>
      {/* Right */}
      <View style={styles.textFrame}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.blueLineWrap}><BlueLine /></View>
        <Text style={styles.cardDesc} numberOfLines={5}>{item.description}</Text>
        <View style={styles.cardSpacer} />
        <ActionButtons callUrl={callUrl} btnUrl={btnUrl} btnLabel="Learn More" />
      </View>
    </View>
  );
}

// ─── Sticky Header ────────────────────────────────────────────────────────────

function StickyHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={styles.stickyHeader}>
      <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
        <BackIcon />
      </TouchableOpacity>
      <Text style={styles.stickyTitle}>{title}</Text>
    </View>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COURSE_FILTERS = [
  { slug: 'all', label: 'All Courses' },
  { slug: 'core-certification', label: 'Core' },
  { slug: 'specialised-certifications', label: 'Specialised' },
  { slug: 'academy-short-courses', label: 'Academy' },
];

const CERT_FILTERS = [
  { slug: 'all', label: 'All Certifications' },
  { slug: 'core-certification', label: 'Core' },
  { slug: 'specialised-certifications', label: 'Specialised' },
  { slug: 'academy-short-courses', label: 'Academy' },
];

// ─── Full paginated tab ───────────────────────────────────────────────────────

function FullTab({ type, token, defaultFilters, onBack }: {
  type: 'course' | 'certification'; token: string;
  defaultFilters: { slug: string; label: string }[]; onBack: () => void;
}) {
  const [category, setCategory] = useState<CategorySlug>('all');
  const [sort, setSort] = useState<SortOption>('Most Popular');
  const [sortVisible, setSortVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<StoreResponse>({ items: [], filters: defaultFilters, pagination: null });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const label = type === 'course' ? 'Courses' : 'Certifications';

  const load = useCallback(async (cat: CategorySlug, srt: SortOption, pg: number, append = false) => {
    if (!token) return;
    pg === 1 ? setLoading(true) : setLoadingMore(true);
    try {
      const res: StoreResponse = type === 'course'
        ? await fetchCourses(token, cat, SORT_VALUE_MAP[srt], pg)
        : await fetchCertifications(token, cat, SORT_VALUE_MAP[srt], pg);
      setData(prev => {
        if (!append) return { ...res, items: res.items };
        // Some backend pages repeat the same items instead of advancing
        // (page param not honored), which made the list look like it was
        // stuck on the same 4 cards. Guard against that by skipping any
        // item id we've already loaded.
        const seen = new Set(prev.items.map(it => it.id));
        const newItems = res.items.filter(it => !seen.has(it.id));
        if (newItems.length === 0) {
          // Nothing new came back — treat this as the last page so we
          // stop requesting more and stop re-rendering duplicates.
          const cappedPagination = prev.pagination
            ? { ...prev.pagination, total_pages: Math.max(1, pg - 1) }
            : res.pagination;
          return { ...prev, pagination: cappedPagination };
        }
        return { ...res, items: [...prev.items, ...newItems] };
      });
    } catch (e) { if (__DEV__) console.log(`[Store] ${label} error:`, e); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [token, type]);

  useEffect(() => { setPage(1); load(category, sort, 1, false); }, [category, sort]);

  const handleLoadMore = () => {
    if (!data.pagination || page >= data.pagination.total_pages || loadingMore) return;
    const next = page + 1; setPage(next); load(category, sort, next, true);
  };

  const filters = data.filters || defaultFilters;

  const renderItem = useCallback(({ item }: { item: StoreItem }) =>
    type === 'course' ? <CourseCard item={item} /> : <CertCard item={item} />, [type]);
  const keyExtractor = useCallback((item: StoreItem, i: number) =>
    item.id ? `${type}-${item.id}` : `${type}-idx-${i}`, [type]);

  const ListHeader = (
    <View>
      <SubTabRow filters={filters} active={category}
        onPress={slug => { setCategory(slug as CategorySlug); setPage(1); }} />
      <SortBar sort={sort} onPress={() => setSortVisible(true)} />
      {data.pagination && (
        <Text style={styles.showingText}>
          Showing {data.pagination.showing_start}–{data.pagination.showing_end} of {data.pagination.total} {label}
        </Text>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <StickyHeader title={label} onBack={onBack} />
      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {ListHeader}
          {[1, 2, 3].map(k => <SkeletonCard key={k} />)}
        </ScrollView>
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          removeClippedSubviews={false}
          initialNumToRender={6}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<Text style={styles.emptyText}>No {label} found.</Text>}
          ListFooterComponent={loadingMore ? <SkeletonCard /> : null}
        />
      )}
      <SortSheet visible={sortVisible} selected={sort}
        onSelect={s => { setSort(s); setPage(1); }} onClose={() => setSortVisible(false)} />
    </View>
  );
}

// ─── Software Tab ─────────────────────────────────────────────────────────────

function SoftwareTab({ token, preloadedItems, preloadedPagination, onBack }: {
  token: string; preloadedItems: StoreItem[];
  preloadedPagination: Pagination | null; onBack: () => void;
}) {
  const [items, setItems] = useState<StoreItem[]>(preloadedItems);
  const [pagination, setPagination] = useState<Pagination | null>(preloadedPagination);
  const [loading, setLoading] = useState(preloadedItems.length === 0);

  useEffect(() => {
    if (preloadedItems.length > 0) { setItems(preloadedItems); setPagination(preloadedPagination); return; }
    if (!token) return;
    setLoading(true);
    fetchSoftwares(token)
      .then((res: StoreResponse) => { setItems(res.items || []); setPagination(res.pagination || null); })
      .catch(e => { if (__DEV__) console.log('[Store] sw error:', e); })
      .finally(() => setLoading(false));
  }, [token, preloadedItems]);

  const renderItem = useCallback(({ item }: { item: StoreItem }) => <SoftwareCard item={item} />, []);
  const keyExtractor = useCallback((item: StoreItem, i: number) =>
    item.id ? String(item.id) : String(i), []);

  return (
    <View style={{ flex: 1 }}>
      <StickyHeader title="PM Software" onBack={onBack} />
      {pagination && (
        <Text style={styles.showingText}>
          Showing {pagination.showing_start}–{pagination.showing_end} of {pagination.total} PM Software
        </Text>
      )}
      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {[1, 2, 3].map(k => <SkeletonCard key={k} />)}
        </ScrollView>
      ) : (
        <FlatList
          data={items} keyExtractor={keyExtractor} renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          removeClippedSubviews={false} initialNumToRender={6}
        />
      )}
    </View>
  );
}

// ─── All Tab ─────────────────────────────────────────────────────────────────

function AllSection({ title, items, type, loading, pagination }: {
  title: string; items: StoreItem[]; type: CardType;
  loading: boolean; pagination: Pagination | null;
}) {
  const preview = items.slice(0, 4);
  const renderCard = (item: StoreItem, i: number) => {
    if (type === 'course') return <CourseCard key={`course-${item.id}-${i}`} item={item} />;
    if (type === 'certification') return <CertCard key={`cert-${item.id}-${i}`} item={item} />;
    return <SoftwareCard key={`sw-${item.id}-${i}`} item={item} />;
  };
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {pagination && (
        <Text style={styles.showingText}>
          Showing 1–{preview.length} of {pagination.total} {title}
        </Text>
      )}
      {loading ? [1, 2].map(k => <SkeletonCard key={k} />) : preview.map(renderCard)}
    </View>
  );
}

function AllTab({ coursesData, certsData, swData, loading }: {
  coursesData: StoreResponse; certsData: StoreResponse;
  swData: StoreResponse; loading: boolean;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Advance Your PM Skills & Tools</Text>
        <View style={styles.heroBlue} />
        <Text style={styles.heroSub}>
          Curated software, courses, and certification resources to strengthen your project
          management practice and accelerate your career.
        </Text>
      </View>
      <View style={styles.divider} />
      <AllSection title="Courses" items={coursesData.items} type="course" loading={loading} pagination={coursesData.pagination} />
      <View style={styles.divider} />
      <AllSection title="Certifications" items={certsData.items} type="certification" loading={loading} pagination={certsData.pagination} />
      <View style={styles.divider} />
      <AllSection title="PM Software" items={swData.items} type="software" loading={loading} pagination={swData.pagination} />
    </ScrollView>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function StoreScreen({ navigation }: any) {
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('All');
  const [coursesData, setCoursesData] = useState<StoreResponse>({ items: [], pagination: null });
  const [certsData, setCertsData] = useState<StoreResponse>({ items: [], pagination: null });
  const [swData, setSwData] = useState<StoreResponse>({ items: [], pagination: null });
  const [allLoading, setAllLoading] = useState(true);

  useEffect(() => { getSavedToken().then(t => setToken(t)); }, []);

  useEffect(() => {
    if (!token) return;
    setAllLoading(true);
    fetchAllStore(token)
      .then(({ courses, certifications, softwares }) => {
        setCoursesData(courses); setCertsData(certifications); setSwData(softwares);
      })
      .catch(e => console.log('[StoreScreen] error:', e))
      .finally(() => setAllLoading(false));
  }, [token]);

  const MAIN_TABS: MainTab[] = ['All', 'Courses', 'Certifications', 'PM Softwares'];

  return (
    <View style={styles.container}>
      <AppHeader navigation={navigation} />

      {/* Main tab bar */}
      <View style={styles.mainTabBar}>
        {MAIN_TABS.map(tab => (
          <TouchableOpacity key={tab} style={styles.mainTabItem}
            onPress={() => setActiveTab(tab)} activeOpacity={0.7}>
            <Text style={[styles.mainTabText, activeTab === tab && styles.mainTabTextActive]}>
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.mainTabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.topDivider} />

      <View style={styles.content}>
        {activeTab === 'All' && (
          <AllTab coursesData={coursesData} certsData={certsData} swData={swData} loading={allLoading} />
        )}
        {activeTab === 'Courses' && token && (
          <FullTab type="course" token={token} defaultFilters={COURSE_FILTERS} onBack={() => setActiveTab('All')} />
        )}
        {activeTab === 'Certifications' && token && (
          <FullTab type="certification" token={token} defaultFilters={CERT_FILTERS} onBack={() => setActiveTab('All')} />
        )}
        {activeTab === 'PM Softwares' && token && (
          <SoftwareTab token={token} preloadedItems={swData.items}
            preloadedPagination={swData.pagination} onBack={() => setActiveTab('All')} />
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_H = 218;
const IMG_W = 145;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  // ── Main tab bar ──
  mainTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    width: 390,
    height: 45,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  mainTabItem: {
    paddingVertical: 10,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mainTabText: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '500',
    color: '#192546',
    textAlign: 'center',
    lineHeight: 18,
  },
  mainTabTextActive: { color: '#0C4D91', fontWeight: '700' },
  mainTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#0C4D91',
    borderRadius: 1,
  },
  topDivider: { height: 1, backgroundColor: '#E8E9F1' },

  // ── Content area ──
  content: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  // ── Hero ──
  hero: { alignItems: 'center', marginBottom: 20 },
  heroTitle: {
    fontFamily: 'Runda', fontSize: 18, fontWeight: '700',
    color: '#192647', textAlign: 'center', letterSpacing: 0.09,
  },
  heroBlue: { width: 43, height: 2, backgroundColor: '#46B0E3', marginTop: 8, marginBottom: 12 },
  heroSub: {
    fontFamily: 'Runda', fontSize: 14, fontWeight: '400',
    color: '#192647', textAlign: 'center', lineHeight: 18,
  },
  divider: { height: 1, backgroundColor: '#E8E9F1', marginVertical: 8 },

  // ── Section ──
  section: { paddingVertical: 16 },
  sectionTitle: {
    fontFamily: 'Runda', fontSize: 18, fontWeight: '700',
    color: '#192647', letterSpacing: 0.09, marginBottom: 12,
  },

  // ── Sticky header ──
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  stickyTitle: {
    fontFamily: 'Runda', fontSize: 18, fontWeight: '700',
    color: '#192647', letterSpacing: 0.09,
  },

  // ── Sub-tabs ──
  subTabScroll: { marginBottom: 10 },
  subTabScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  subTab: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginRight: 4,
  },
  subTabActive: { backgroundColor: '#0C4D91' },
  subTabText: { fontFamily: 'Runda', fontSize: 12, fontWeight: '500', color: '#192546' },
  subTabTextActive: { color: '#FFF' },

  // ── Sort bar ──
  sortBar: {
    flexDirection: 'row', height: 36, paddingHorizontal: 16,
    justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch',
    borderRadius: 5, borderWidth: 1, borderColor: '#8F9098',
    backgroundColor: '#FFF', marginBottom: 10,
  },
  sortBarLabel: { fontFamily: 'Runda', fontSize: 12, fontWeight: '400', color: '#192546', lineHeight: 16 },
  sortBarValue: { fontFamily: 'Runda', fontSize: 12, fontWeight: '500', color: '#192546' },

  showingText: { fontFamily: 'Runda', fontSize: 12, fontWeight: '500', color: '#192647', marginBottom: 12 },
  emptyText: { fontFamily: 'Runda', fontSize: 14, color: '#8F9098', textAlign: 'center', marginTop: 40 },

  // ── Card base — NO overflow:hidden (kills LinearGradient on Android) ──
  card: {
    flexDirection: 'row',
    width: 358,
    height: CARD_H,
    borderRadius: 5,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10.023,
    elevation: 3,
    alignSelf: 'center',
  },

  // ── Course image frame ──
  courseImgFrame: {
    width: IMG_W,
    height: CARD_H,
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    paddingTop: 5.697,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  coursePhoto: {
    width: 159.899,
    height: 238.265,
    transform: [{ rotate: '0.864deg' }],
  },

  // ── Shared left gradient frame (cert + software) ──
  // LinearGradient fills the full 145×218 column — no padding here
  // Image is positioned/sized via certImg / swImg styles
  leftFrame: {
    width: IMG_W,
    height: CARD_H,
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  // Cert badge — large, cover fills the frame nicely
  // backgroundColor blends white PNG bg with gradient midpoint
  certImg: {
    width: IMG_W,
    height: IMG_W,
    backgroundColor: '#C8ECFF',
  },
  // Software logo — same size, contain keeps logo proportions
  swImg: {
    width: IMG_W,
    height: IMG_W,
    backgroundColor: 'transparent',
  },

  // ── Text frame — right side, border radius on right corners ──
  textFrame: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 12,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },

  // Spacer between description and buttons — pushes buttons to bottom
  cardSpacer: { flex: 1, minHeight: 4 },

  // ── Blue line spacing ──
  blueLineWrap: { marginTop: 6, marginBottom: 8 },

  // ── Card text ──
  cardTitle: {
    fontFamily: 'Runda', fontSize: 14, fontWeight: '700',
    color: '#192546', lineHeight: 20,
  },
  cardDesc: {
    fontFamily: 'Runda', fontSize: 12, fontWeight: '400',
    color: '#192546', lineHeight: 16,
  },
  cardPrice: {
    fontFamily: 'Runda', fontSize: 18, fontWeight: '700',
    color: '#0C4D91', letterSpacing: 0.09, marginBottom: 6,
  },

  // ── Buttons ──
  cardActions: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  gradientBtn: { flex: 1, borderRadius: 100, marginLeft: 8, overflow: 'hidden' },
  gradientBtnInner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  gradientBtnText: { fontFamily: 'Runda', fontSize: 12, fontWeight: '500', color: '#FFF', marginRight: 8 },

  // ── Sort sheet ──
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  sheetHeader: {
    flexDirection: 'row', height: 56, paddingLeft: 136, paddingRight: 24,
    justifyContent: 'space-between', alignItems: 'center',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  sheetTitle: {
    fontFamily: 'Runda', fontSize: 16, fontWeight: '700',
    color: '#0C4D91', letterSpacing: 0.08, lineHeight: 20,
  },
  sheetClose: { fontSize: 18, color: '#192546', fontWeight: '700' },
  sheetOptions: { paddingHorizontal: 16 },
  sheetRow: { height: 41, justifyContent: 'center' },
  sheetOptionText: {
    fontFamily: 'Runda', fontSize: 14, fontWeight: '700',
    color: '#192546', paddingHorizontal: 20,
  },
  sheetOptionActive: { color: '#0C4D91' },
});
