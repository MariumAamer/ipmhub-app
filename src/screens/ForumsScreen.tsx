/* eslint-disable prettier/prettier */
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Modal,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import ShareLinkedInModal from '../components/ShareLinkedInModal';
import {
  TABS,
  FILTER_SETS,
  FilterItem,
  ForumTopic,
  ForumSortBy,
  getTopics,
  getExploreForums,
  reportForumItem,
  getCurrentUserId,
} from '../api/forumsApi';
import {
  SearchIcon,
  FilterIcon,
  NewDiscussionIcon,
  LinkedInIcon,
  ConversationIcon,
  LatestConversationIcon,
  TrendingIcon,
  ChevronDownIcon,
} from '../components/forumsIcons';
import MaskedView from '@react-native-masked-view/masked-view';

const GRADIENT = ['#E257E4', '#084D92'];
const EXPLORE_GRADIENT = ['#084D92', '#C157DE'];

// ─── Three-dot menu (own post vs others') ────────────────────────────────────
const TopicMenu = ({
  visible,
  isOwn,
  onClose,
  onEdit,
  onDelete,
  onReport,
}: {
  visible: boolean;
  isOwn: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
}) => {
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.menuSheet}>
          {isOwn ? (
            <>
              <TouchableOpacity style={styles.menuRow} onPress={onEdit}>
                <Text style={styles.menuRowText}>{'Edit Discussion'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuRow} onPress={onDelete}>
                <Text style={[styles.menuRowText, styles.menuRowDanger]}>
                  {'Delete Discussion'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.menuRow} onPress={onReport}>
              <Text style={[styles.menuRowText, styles.menuRowDanger]}>
                {'Report Discussion'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.menuRow} onPress={onClose}>
            <Text style={styles.menuRowText}>{'Cancel'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── Multi-step report flow ───────────────────────────────────────────────────
const REPORT_REASONS = [
  'Spam',
  'Harassment or bullying',
  'Misinformation',
  'Inappropriate content',
  'Other',
];

const ReportSheet = ({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reasons: string[]) => void;
}) => {
  const [step, setStep] = useState<'select' | 'done'>('select');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setStep('select');
      setSelected([]);
    }
  }, [visible]);

  const toggle = (reason: string) => {
    setSelected(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason],
    );
  };

  const submit = () => {
    onSubmit(selected);
    setStep('done');
  };

  if (!visible) return null;
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={styles.reportSheet}>
          {step === 'select' ? (
            <>
              <Text style={styles.sheetTitle}>{'Report Forum'}</Text>
              <Text style={styles.sheetSubtitle}>
                {'Tell us why you are reporting this discussion.'}
              </Text>
              {REPORT_REASONS.map(reason => (
                <TouchableOpacity
                  key={reason}
                  style={styles.reportRow}
                  onPress={() => toggle(reason)}>
                  <View
                    style={[
                      styles.checkbox,
                      selected.includes(reason) && styles.checkboxChecked,
                    ]}
                  />
                  <Text style={styles.reportRowText}>{reason}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                disabled={selected.length === 0}
                onPress={submit}
                style={{marginTop: 8, opacity: selected.length === 0 ? 0.5 : 1}}>
                <LinearGradient colors={GRADIENT} style={styles.gradientBtn}>
                  <Text style={styles.gradientBtnText}>{'Submit Report'}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelTextBtn} onPress={onClose}>
                <Text style={styles.cancelTextBtnLabel}>{'Cancel'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.sheetTitle}>{'Report Submitted'}</Text>
              <Text style={styles.sheetSubtitle}>
                {'Thank you. Our moderation team will review this discussion.'}
              </Text>
              <TouchableOpacity onPress={onClose} style={{marginTop: 8}}>
                <LinearGradient colors={GRADIENT} style={styles.gradientBtn}>
                  <Text style={styles.gradientBtnText}>{'Done'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Filter bottom sheet (text-only rows per Figma) ──────────────────────────
const FilterSheet = ({
  visible,
  title,
  items,
  selectedId,
  onSelect,
  onClose,
  onContinue,
}: {
  visible: boolean;
  title: string;
  items: FilterItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onContinue: () => void;
}) => {
  if (!visible) return null;
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={styles.filterSheet}>
          <View style={styles.filterSheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.filterSheetCloseBtn}>
              <Text style={styles.filterSheetCloseIcon}>{'✕'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.filterAlphabetical}>{'Alphabetical'}</Text>
          <FlatList
            data={[...items].sort((a, b) => a.name.localeCompare(b.name))}
            keyExtractor={item => item.id}
            style={{maxHeight: 360}}
            renderItem={({item}) => {
              const isSelected = selectedId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.filterRow, isSelected && styles.filterRowActive]}
                  onPress={() => onSelect(item.id)}>
                  <View style={styles.filterRowTextGroup}>
                    <Text style={[styles.filterRowText, isSelected && styles.filterRowTextActive]}>
                      {item.name}
                    </Text>
                    {item.count != null ? (
                      <Text style={styles.filterRowCount}>{` (${item.count})`}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity onPress={onContinue} style={[styles.continueSolidBtn, {marginTop: 12}]}>
            <Text style={styles.gradientBtnText}>{'Continue'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Sort by sheet ────────────────────────────────────────────────────────────
const SORT_OPTIONS: {id: ForumSortBy; label: string}[] = [
  {id: 'activity', label: 'Latest Activity'},
  {id: 'newest', label: 'Newest Discussion'},
  {id: 'popular', label: 'Most Popular'},
];

const SortSheet = ({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: ForumSortBy;
  onSelect: (sort: ForumSortBy) => void;
  onClose: () => void;
}) => {
  if (!visible) return null;
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={styles.sortSheet}>
          <View style={styles.sortSheetHeader}>
            <Text style={styles.sortSheetTitle}>{'Sort by'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.sortSheetCloseBtn}>
              <Text style={styles.sortSheetCloseIcon}>{'✕'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sortSheetDivider} />
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={styles.sortRow}
              onPress={() => {
                onSelect(opt.id);
                onClose();
              }}>
              <Text
                style={[
                  styles.sortRowText,
                  selected === opt.id && styles.sortRowTextActive,
                ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
};

// ─── Forum topic card ─────────────────────────────────────────────────────────
const TopicCard = ({
  topic,
  onPress,
  onMenuPress,
}: {
  topic: ForumTopic;
  onPress: () => void;
  onMenuPress: () => void;
}) => (
  <TouchableOpacity style={styles.forumCard} onPress={onPress} activeOpacity={0.9}>
    <View style={styles.cardHeader}>
      <Image source={{uri: topic.author.avatar}} style={styles.cardAvatar} />
      <View style={styles.cardAuthorInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.cardAuthorName}>{topic.author.name}</Text>
          {topic.author.flag ? (
            <Text style={styles.flagText}>{topic.author.flag}</Text>
          ) : null}
        </View>
        <Text style={styles.cardMeta}>
          {topic.author.title ? `${topic.author.title}, ${topic.time}` : topic.time}
        </Text>
      </View>
      <TouchableOpacity style={styles.moreBtn} onPress={onMenuPress}>
        <Text style={styles.moreDots}>{'•••'}</Text>
      </TouchableOpacity>
    </View>

    <Text style={styles.cardTitle}>{topic.title}</Text>
    <Text style={styles.cardContent} numberOfLines={4}>
      {topic.content}
    </Text>
    {topic.truncated ? <Text style={styles.readMore}>{'Read more'}</Text> : null}

    {topic.tags.length > 0 ? (
      <View style={styles.tagsRow}>
        {topic.tags.slice(0, 3).map((tag, i) => (
          <View key={i} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    ) : null}

    <View style={styles.cardStats}>
      <View style={styles.statItem}>
        <ConversationIcon size={14} />
        <Text style={styles.statText}>
          {`${topic.replyCount} ${topic.replyCount === 1 ? 'Conversation' : 'Conversations'}`}
        </Text>
      </View>
      <View style={styles.statItem}>
        <LatestConversationIcon size={14} />
        <Text style={styles.statText}>
          {topic.lastActiveTime ? `Latest Reply, ${topic.lastActiveTime}` : 'No replies yet'}
        </Text>
      </View>
    </View>

    <View style={styles.cardDivider} />
    <TouchableOpacity style={styles.cardJoinBtn} onPress={onPress}>
      <Text style={styles.cardJoinBtnText}>{'Join Discussion'}</Text>
    </TouchableOpacity>
  </TouchableOpacity>
);

// ─── Explore Forums card (Trending / Latest — shown only for Most Popular sort) ─
const ExploreCard = ({topic, onJoin}: {topic: ForumTopic; onJoin: () => void}) => (
  <View style={styles.exploreCard}>
    <Image source={{uri: topic.author.avatar}} style={styles.exploreAvatar} />
    <View style={styles.exploreTextCol}>
      <Text style={styles.exploreSnippet} numberOfLines={3}>
        {topic.title}
      </Text>
      <TouchableOpacity onPress={onJoin}>
        <Text style={styles.exploreJoinLink}>{'Join Discussion'}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// Gradient section label ("Trending" / "Latest Forums ↗") — requires
// @react-native-masked-view/masked-view for the true text-gradient clip
// per Figma. If that package isn't installed, this will fail — run
// `npm install @react-native-masked-view/masked-view` (+ pod install on
// iOS) before using this component.
const ExploreSectionLabel = ({label}: {label: string}) => (
  <MaskedView maskElement={<Text style={styles.exploreSectionLabelMask}>{label}</Text>}>
    <LinearGradient colors={EXPLORE_GRADIENT} start={{x: 0, y: 0}} end={{x: 1, y: 0}}>
      <Text style={[styles.exploreSectionLabelMask, {opacity: 0}]}>{label}</Text>
    </LinearGradient>
  </MaskedView>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ForumsScreen = ({navigation}: any) => {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filter sheet state
  const [filterSheetKey, setFilterSheetKey] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>({});

  // Sort sheet state — 'activity' is the default, confirmed to match the
  // web forum's default "Latest Activity" ordering (verified 2026-07-09).
  const [sortBy, setSortBy] = useState<ForumSortBy>('activity');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  // Topic menu state
  const [menuTopic, setMenuTopic] = useState<ForumTopic | null>(null);
  const [reportTopic, setReportTopic] = useState<ForumTopic | null>(null);

  // Explore Forums (Trending/Latest) — only shown when sortBy === 'popular'
  const [trending, setTrending] = useState<ForumTopic[]>([]);
  const [latest, setLatest] = useState<ForumTopic[]>([]);
  const [exploreLoading, setExploreLoading] = useState(false);

  const activeTagTermId = useRef<number | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      setCurrentUserId(uid);
    })();
  }, []);

  const resolveTagTermId = (): number | undefined => {
    const tab = TABS.find(t => t.key === activeTab);
    if (!tab?.filterKey) return undefined;
    const selectedId = selectedFilters[tab.filterKey];
    if (!selectedId) return undefined;
    const item = FILTER_SETS[tab.filterKey]?.find(f => f.id === selectedId);
    return item?.termId;
  };

  const loadTopics = useCallback(
    async (pageNum = 1, reset = false) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      try {
        const tagTermId = resolveTagTermId();
        const {topics: fetched, hasMore: more} = await getTopics(pageNum, {
          search: search || undefined,
          tagTermId,
          currentUserId,
          sortBy,
        });
        setTopics(prev => (reset ? fetched : [...prev, ...fetched]));
        setHasMore(more);
        setPage(pageNum);
      } catch {
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [activeTab, search, selectedFilters, currentUserId, sortBy],
  );

  useEffect(() => {
    loadTopics(1, true);
  }, [loadTopics]);

  // Explore Forums only loads/shows when "Most Popular" sort is active —
  // per spec, not a permanent section.
  useEffect(() => {
    if (sortBy !== 'popular') return;
    setExploreLoading(true);
    getExploreForums(currentUserId)
      .then(({trending: t, latest: l}) => {
        setTrending(t);
        setLatest(l);
      })
      .finally(() => setExploreLoading(false));
  }, [sortBy, currentUserId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTopics(1, true);
  }, [loadTopics]);

  const handleTabPress = (tab: (typeof TABS)[0]) => {
    setActiveTab(tab.key);
    if (tab.filterKey) {
      setPendingFilters({...selectedFilters});
      setFilterSheetKey(tab.filterKey);
    }
  };

  const handleMenuEdit = () => {
    setMenuTopic(null);
    navigation?.navigate('CreatePost', {type: 'discussion', topicId: menuTopic?.id});
  };

  const handleMenuDelete = () => {
    setMenuTopic(null);
    // Deletion handled with confirmation in the topic detail flow;
    // surfacing here as a direct action per Figma's three-dot menu.
    navigation?.navigate('ForumTopic', {topicId: menuTopic?.id, confirmDelete: true});
  };

  const handleMenuReport = () => {
    setReportTopic(menuTopic);
    setMenuTopic(null);
  };

  const submitReport = async (reasons: string[]) => {
    if (reportTopic) {
      await reportForumItem(reportTopic.id, 'topic', reasons);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#084D92']} />
        }
        onScroll={({nativeEvent}) => {
          const {layoutMeasurement, contentOffset, contentSize} = nativeEvent;
          if (
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 200 &&
            !loadingMore &&
            hasMore
          ) {
            loadTopics(page + 1);
          }
        }}
        scrollEventThrottle={400}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{'Join the Discussion & Expand Your Network'}</Text>
          <Text style={styles.heroSubtitle}>
            {'Find answers, ask questions, and connect with our global community.'}
          </Text>
        </View>

        {/* Category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => handleTabPress(tab)}>
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {tab.filterKey ? (
                <View style={{marginLeft: 4}}>
                  <ChevronDownIcon color={activeTab === tab.key ? '#FFFFFF' : '#8F9098'} />
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search + filter */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <SearchIcon />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#8F9098"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => {
              const tab = TABS.find(t => t.key === activeTab);
              if (tab?.filterKey) {
                setPendingFilters({...selectedFilters});
                setFilterSheetKey(tab.filterKey);
              } else {
                // No tag filter for this tab (e.g. "All Forums") — filter
                // icon opens Sort by instead.
                setSortSheetVisible(true);
              }
            }}>
            <FilterIcon />
          </TouchableOpacity>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.newDiscussionBtn}
            onPress={() => navigation?.navigate('NewDiscussion')}>
            <NewDiscussionIcon color="#FFFFFF" />
            <Text style={styles.newDiscussionText}>{'New Discussion'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.linkedInBtnWrap, styles.linkedInBtn]}
            onPress={() => setShareModalVisible(true)}>
            <LinkedInIcon />
            <Text style={styles.linkedInText}>{'Share on LinkedIn'}</Text>
          </TouchableOpacity>
        </View>

        {/* Explore Forums — only when "Most Popular" sort is active, and
            positioned at the TOP of the list, not the bottom */}
        {sortBy === 'popular' ? (
          <View style={styles.exploreSection}>
            <Text style={styles.exploreSectionTitle}>{'Explore Forums'}</Text>

            <View style={styles.exploreSubheaderRow}>
              <ExploreSectionLabel label="Trending" />
              <TrendingIcon size={18} />
            </View>
            {exploreLoading ? (
              <ActivityIndicator color="#084D92" />
            ) : (
              trending.map(t => (
                <ExploreCard
                  key={t.id}
                  topic={t}
                  onJoin={() => navigation?.navigate('ForumTopic', {topicId: t.id})}
                />
              ))
            )}

            <View style={styles.exploreDivider} />

            <View style={styles.exploreSubheaderRow}>
              <ExploreSectionLabel label="Latest Forums" />
              <TrendingIcon size={18} />
            </View>
            {exploreLoading ? (
              <ActivityIndicator color="#084D92" />
            ) : (
              latest.map(t => (
                <ExploreCard
                  key={t.id}
                  topic={t}
                  onJoin={() => navigation?.navigate('ForumTopic', {topicId: t.id})}
                />
              ))
            )}
          </View>
        ) : null}

        {/* Topics list */}
        {loading ? (
          <View style={{paddingVertical: 40, alignItems: 'center'}}>
            <ActivityIndicator color="#084D92" />
          </View>
        ) : topics.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{'No discussions yet'}</Text>
            <Text style={styles.emptySubtitle}>
              {'Start the first discussion in this category!'}
            </Text>
          </View>
        ) : (
          topics.map(topic => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onPress={() => navigation?.navigate('ForumTopic', {topicId: topic.id})}
              onMenuPress={() => setMenuTopic(topic)}
            />
          ))
        )}

        {!loading && hasMore && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={() => loadTopics(page + 1)}
            disabled={loadingMore}>
            {loadingMore ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loadMoreText}>{'Load More'}</Text>
            )}
          </TouchableOpacity>
        )}

        <View style={{height: 40}} />
      </ScrollView>

      {/* Filter sheets, one per category, mounted lazily */}
      {filterSheetKey
        ? (() => {
            const tab = TABS.find(t => t.filterKey === filterSheetKey);
            return (
              <FilterSheet
                visible={!!filterSheetKey}
                title={tab?.label || ''}
                items={FILTER_SETS[filterSheetKey] || []}
                selectedId={pendingFilters[filterSheetKey] || null}
                onSelect={id =>
                  setPendingFilters(prev => ({...prev, [filterSheetKey]: id}))
                }
                onClose={() => setFilterSheetKey(null)}
                onContinue={() => {
                  setSelectedFilters(pendingFilters);
                  setFilterSheetKey(null);
                  loadTopics(1, true);
                }}
              />
            );
          })()
        : null}

      <SortSheet
        visible={sortSheetVisible}
        selected={sortBy}
        onSelect={setSortBy}
        onClose={() => setSortSheetVisible(false)}
      />

      <ShareLinkedInModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        context="allForums"
      />

      <TopicMenu
        visible={!!menuTopic}
        isOwn={!!menuTopic?.isOwn}
        onClose={() => setMenuTopic(null)}
        onEdit={handleMenuEdit}
        onDelete={handleMenuDelete}
        onReport={handleMenuReport}
      />

      <ReportSheet
        visible={!!reportTopic}
        onClose={() => setReportTopic(null)}
        onSubmit={submitReport}
      />

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F2F4F7'},

  hero: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  heroTitle: {
    color: '#192647',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#192647',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    textAlign: 'center',
  },

  tabsScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  tabsContent: {paddingHorizontal: 16, paddingVertical: 12, gap: 8},
  // Figma: display:flex; padding:9px 12px; justify-content:center;
  // align-items:center; gap:8px; border-radius:5px; background:#E8E9F1
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
    borderRadius: 5,
    backgroundColor: '#E8E9F1',
  },
  // Figma: border-radius:5px; background:#0C4D91 (IPM Dark Blue)
  tabActive: {backgroundColor: '#0C4D91'},
  tabText: {fontSize: 13, color: '#192546', fontWeight: '700', fontFamily: 'Runda'},
  tabTextActive: {color: '#FFFFFF', fontWeight: '700'},

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#C5C6CC',
    gap: 8,
  },
  searchInput: {flex: 1, fontSize: 14, color: '#192546', fontFamily: 'Runda'},
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#C5C6CC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  // Figma: display:flex; height:36px; padding:12px 16px; justify-content:center;
  // align-items:center; gap:8px; flex:1 0 0; border-radius:5px; background:#46B0E3
  newDiscussionBtn: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 5,
    paddingHorizontal: 16,
    backgroundColor: '#46B0E3',
  },
  newDiscussionText: {fontSize: 13, color: '#FFFFFF', fontWeight: '700', fontFamily: 'Runda'},
  linkedInBtnWrap: {flex: 1, borderRadius: 5, overflow: 'hidden'},
  // Figma: same frame as New Discussion but solid IPM Dark Blue fill
  linkedInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 36,
    borderRadius: 5,
    paddingHorizontal: 16,
    backgroundColor: '#0C4D91',
  },
  linkedInText: {fontSize: 13, color: '#FFFFFF', fontWeight: '700', fontFamily: 'Runda'},

  forumCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardHeader: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10},
  cardAvatar: {width: 42, height: 42, borderRadius: 21},
  cardAuthorInfo: {flex: 1},
  nameRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  cardAuthorName: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '700',
  },
  flagText: {fontSize: 14},
  cardMeta: {
    color: '#8F9098',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  moreBtn: {padding: 4},
  moreDots: {fontSize: 14, color: '#AAAAAA', letterSpacing: 1},
  cardTitle: {
    color: '#192647',
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: 0.08,
    marginBottom: 8,
  },
  cardContent: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 6,
  },
  readMore: {color: '#084D92', fontSize: 13, fontWeight: '600', marginBottom: 8},
  tagsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10},
  tag: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {fontSize: 11, color: '#555', fontFamily: 'Runda'},
  cardStats: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statItem: {flexDirection: 'row', alignItems: 'center', gap: 5},
  statText: {fontSize: 12, color: '#8F9098', fontFamily: 'Runda', fontWeight: '700'},

  cardDivider: {height: 1, backgroundColor: '#F0F0F0', marginTop: 10},
  // Figma btn frame: height 36, padding 12 16, radius 5, centered, full width
  cardJoinBtn: {
    minHeight: 36,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    alignSelf: 'stretch',
  },
  cardJoinBtnText: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '700',
  },

  emptyState: {alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32},
  emptyTitle: {fontSize: 18, fontWeight: '700', color: '#192647', marginBottom: 8},
  emptySubtitle: {fontSize: 14, color: '#8F9098', textAlign: 'center'},

  loadMoreBtn: {
    backgroundColor: '#084D92',
    marginHorizontal: 16,
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  loadMoreText: {color: '#FFFFFF', fontSize: 15, fontWeight: '600'},

  // Menu / sheets
  menuOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end'},
  menuSheet: {backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingVertical: 8},
  menuRow: {paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0'},
  menuRowText: {fontSize: 15, color: '#192546', fontFamily: 'Runda'},
  menuRowDanger: {color: '#D14343'},

  sheetOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end'},
  filterSheet: {backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: 20},
  reportSheet: {backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20},
  filterSheetHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    color: '#0C4D91',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  filterSheetCloseBtn: {position: 'absolute', right: 0, padding: 4},
  filterSheetCloseIcon: {fontSize: 16, color: '#8F9098'},
  filterAlphabetical: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 41,
    paddingHorizontal: 4,
    borderRadius: 5,
  },
  filterRowActive: {backgroundColor: '#EEF7FC'},
  filterRowTextGroup: {flexDirection: 'row', alignItems: 'baseline'},
  filterRowText: {color: '#192546', fontFamily: 'Runda', fontSize: 14, fontWeight: '400', lineHeight: 18},
  filterRowTextActive: {color: '#0C4D91', fontWeight: '500'},
  filterRowCount: {color: '#8F9098', fontFamily: 'Runda', fontSize: 14},
  sheetSubtitle: {
    color: '#192647',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    marginBottom: 16,
  },

  // Figma: main frame — width 390, padding-bottom 34, radius 20 20 0 0, #FFF
  sortSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
    paddingBottom: 34,
  },
  // Figma: header row — height 56, background #FFF, "Sort by" centered, X on the right
  sortSheetHeader: {
    height: 56,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sortSheetTitle: {
    color: '#0C4D91',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  sortSheetCloseBtn: {position: 'absolute', right: 24, padding: 2},
  sortSheetCloseIcon: {fontSize: 18, color: '#C5C6CC'},
  // Figma: divider — height 1, background #E8E9F1
  sortSheetDivider: {height: 1, width: '100%', backgroundColor: '#E8E9F1'},
  // Figma: each row — height 41, full width
  sortRow: {
    height: 41,
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  // Figma "Action/Action L" spec is weight 500, but per design review all
  // sort options render bold — matching the "Sort by" header treatment.
  sortRowText: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '700',
  },
  sortRowTextActive: {color: '#0C4D91'},

  reportRow: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12},
  checkbox: {width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#C5C6CC'},
  checkboxChecked: {backgroundColor: '#0C4D91', borderColor: '#0C4D91'},
  reportRowText: {color: '#192546', fontFamily: 'Runda', fontSize: 14},

  gradientBtn: {borderRadius: 50, paddingVertical: 14, alignItems: 'center'},
  // Figma: border-radius:50px; background:#0C4D91 (IPM Dark Blue) — used for
  // every filter sheet's Continue button, replacing the prior pink/blue gradient
  continueSolidBtn: {
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#0C4D91',
  },
  gradientBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'Runda'},
  cancelTextBtn: {alignItems: 'center', paddingVertical: 14},
  cancelTextBtnLabel: {color: '#8F9098', fontFamily: 'Runda', fontSize: 14, fontWeight: '500'},

  // Explore Forums — only rendered when sortBy === 'popular'
  exploreSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  exploreSectionTitle: {
    color: '#192647',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
    height: 22,
    alignSelf: 'stretch',
  },
  exploreSubheaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'stretch',
  },
  // Fallback plain style if MaskedView gradient text isn't wired up —
  // ExploreSectionLabel masks this with the Purple-Shade-Variation gradient.
  exploreSectionLabelMask: {
    color: '#084D92',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  exploreDivider: {height: 1, alignSelf: 'stretch', backgroundColor: '#E8E9F1'},
  exploreCard: {flexDirection: 'row', alignItems: 'flex-start', gap: 10, alignSelf: 'stretch'},
  exploreTextCol: {flex: 1, gap: 6},
  exploreAvatar: {width: 38, height: 38, borderRadius: 19},
  exploreSnippet: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  exploreJoinLink: {
    color: '#46B0E3',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ForumsScreen;
