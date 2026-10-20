/* eslint-disable prettier/prettier */
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {useDebouncedValue} from '../hooks/useDebouncedValue';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Modal,
  FlatList,
  Dimensions,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import {WebView} from 'react-native-webview';
import Svg, {Path} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import {SearchFilterRow, FilterSheet} from '../components/forumStyleControls';
import {
  getResources,
  getResourceTabs,
  getResourceCategories,
  downloadResource,
  ResourceItem,
  ResourceTab,
  ResourceCategory,
} from '../api/resourcesApi';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

// PERF: stable empty array so FlatList `data` identity doesn't change while loading.
const EMPTY_RESOURCES: ResourceItem[] = [];

// Fallback tabs — used only if the /resources/tabs endpoint is unreachable,
// so the screen still renders something instead of going blank.
const FALLBACK_TABS: ResourceTab[] = [
  {id: 'all', label: 'All Resources', category_ids: [], tab_type: '', hash: ''},
  {id: 'articles', label: 'Articles', category_ids: [], tab_type: 'Articles', hash: 'articles'},
  {id: 'ebooks', label: 'E-books', category_ids: [], tab_type: 'Ebooks', hash: 'e-books'},
  {id: 'templates', label: 'Templates', category_ids: [], tab_type: 'Templates', hash: 'templates'},
  {id: 'videos', label: 'Videos', category_ids: [], tab_type: '', hash: 'videos'},
  {id: 'cheatsheets', label: 'Cheat Sheets', category_ids: [], tab_type: '', hash: 'cheetsheet'},
];

// ─── SVG Icons — exact from Figma ─────────────────────────────────────────────
// Close (X) icon — exact from Figma. Used consistently across every sheet
// in Resources (Filter by Category, Share, Table of Contents) so the same
// icon/position/size doesn't have to be re-solved per screen.
export const CloseIcon = ({size = 20}: {size?: number}) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M1.61612 1.61611C2.10427 1.12796 2.89573 1.12796 3.38388 1.61611L18.3839 16.6159C18.872 17.104 18.872 17.8955 18.3839 18.3836C17.8957 18.8718 17.1043 18.8718 16.6161 18.3836L1.61612 3.38385C1.12796 2.8957 1.12796 2.10426 1.61612 1.61611Z" fill="#C5C6CC" />
    <Path fillRule="evenodd" clipRule="evenodd" d="M18.3839 1.61611C17.8957 1.12796 17.1043 1.12796 16.6161 1.61611L1.61612 16.6159C1.12796 17.104 1.12796 17.8955 1.61612 18.3836C2.10427 18.8718 2.89573 18.8718 3.38388 18.3836L18.3839 3.38385C18.872 2.8957 18.872 2.10426 18.3839 1.61611Z" fill="#C5C6CC" />
  </Svg>
);

const UploadArrowIcon = () => (
  <Svg width={20.631} height={20.63} viewBox="0 0 21 22" fill="none">
    <Path d="M6.29117 6.11058L8.87459 3.55465L8.8941 16.079C8.8941 16.8401 9.51797 17.4571 10.2875 17.4571C11.0571 17.4571 11.681 16.8401 11.681 16.079L11.6615 3.57028L14.23 6.11062C14.7647 6.65808 15.6468 6.67324 16.2003 6.14447C16.7539 5.61571 16.7692 4.74327 16.2346 4.19582C16.2233 4.18432 16.2119 4.17303 16.2003 4.16197L13.2165 1.21095C11.584 -0.403642 8.93721 -0.403642 7.30467 1.21091L7.30463 1.21095L4.32085 4.16192C3.78621 4.70938 3.80154 5.58181 4.35508 6.11058C4.89508 6.62638 5.75117 6.62638 6.29117 6.11058Z" fill="#FFFFFF" />
    <Path d="M19.3417 13.6948C18.6295 13.6948 18.0522 14.2558 18.0522 14.9477V18.7824C18.0518 18.9709 17.8946 19.1236 17.7007 19.124H2.93047C2.73649 19.1236 2.57933 18.9709 2.57889 18.7824V14.9477C2.57889 14.2558 2.00158 13.6948 1.28945 13.6948C0.577309 13.6948 0 14.2558 0 14.9477V18.7824C0.00189387 20.3543 1.31282 21.628 2.93047 21.6299H17.7006C19.3183 21.628 20.6292 20.3542 20.6311 18.7824V14.9477C20.6311 14.2558 20.0538 13.6948 19.3417 13.6948Z" fill="#FFFFFF" />
  </Svg>
);

const ChevronRightIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M6 4L10 8L6 12" stroke="#0C4D91" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Round download button shown on Cheat Sheet cards (web reference showed
// a circular download icon in place of the usual chevron for this type).
const DownloadCircleIcon = () => (
  <View style={styles.downloadCircle}>
    <Svg width={12} height={11} viewBox="0 0 9 8" fill="none">
      <Path d="M3.4534 6.91796C3.86379 7.2528 4.47018 7.22886 4.85262 6.84624L7.5648 4.13311L6.85652 3.42483L4.64168 5.64014V0.171237C4.64168 -0.12037 4.40547 -0.356576 4.11387 -0.356576C3.82226 -0.356576 3.58605 -0.12037 3.58605 0.171237V5.64202L1.36746 3.42342L0.65918 4.13171L3.37418 6.84624L3.4534 6.91796Z" fill="#0C4D91" />
    </Svg>
  </View>
);

// ─── Featured Article Card ────────────────────────────────────────────────────
const FeaturedCard = ({item, onPress}: any) => (
  <TouchableOpacity style={styles.featuredCard} onPress={onPress} activeOpacity={0.9}>
    {item.image_url ? (
      <Image
        source={{uri: item.image_url}}
        style={styles.featuredImage}
        width={358}
        height={255}
        resizeMode="cover"
      />
    ) : (
      <View style={[styles.featuredImage, {backgroundColor: '#192647'}]} />
    )}
    {/* Radial gradient overlay approximated with semi-opaque navy wash */}
    <View style={styles.featuredGradientOverlay} pointerEvents="none" />
    <View style={styles.featuredOverlay}>
      {item.author?.avatar ? (
        <Image
          source={{uri: item.author.avatar}}
          style={styles.featuredAuthorAvatar}
          width={36}
          height={36}
        />
      ) : (
        <View style={[styles.featuredAuthorAvatar, {backgroundColor: '#6B4EFF'}]} />
      )}
      <View style={styles.featuredMeta}>
        <Text style={styles.featuredAuthorName}>{item.author?.full_name || 'IPM'}</Text>
        <Text style={styles.featuredAuthorRole}>{item.category_label || item.type_label}</Text>
      </View>
    </View>
    <View style={styles.featuredContent}>
      <Text style={styles.featuredTitle} numberOfLines={3}>{item.title}</Text>
      <Text style={styles.readMore}>{'Read more'}</Text>
    </View>
  </TouchableOpacity>
);

// ─── Resource List Card ───────────────────────────────────────────────────────
// Cheat sheet thumbnails are always .svg — plain <Image> can't render
// those. SvgUri (react-native-svg) was tried and came back blank on
// device, so this uses WebView instead. Explicit width/height are
// passed in (rather than relying on flex:1) because Android WebView can
// render at 0x0 if it doesn't get a concrete measured size, which would
// silently produce a "blank" result identical to a failed network load.
const SvgThumbnail = ({uri, width, height}: {uri: string; width: number; height: number}) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <View style={[styles.resourceThumb, {width, height, backgroundColor: '#192647'}]} />
    );
  }
  return (
    <WebView
      source={{
        html: `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style>html,body{margin:0;padding:0;width:100%;height:100%;background:transparent;overflow:hidden;}
        img{width:100%;height:100%;object-fit:cover;display:block;}</style></head>
        <body><img src="${uri}" /></body></html>`,
      }}
      style={{width, height, backgroundColor: 'transparent'}}
      scrollEnabled={false}
      javaScriptEnabled={false}
      domStorageEnabled
      originWhitelist={['*']}
      mixedContentMode="always"
      allowUniversalAccessFromFileURLs
      allowFileAccessFromFileURLs
      onError={() => setFailed(true)}
      onHttpError={() => setFailed(true)}
    />
  );
};

// PERF: memoized, and takes stable (item) => void handlers instead of a fresh
// inline closure per row, so rows don't re-render on every keystroke/state
// change in the parent — only when their own `item` changes.
const ResourceCard = React.memo(({item, onItemPress, onItemDownload}: any) => {
  const isSvg = item.type === 'cheatsheet' || (item.image_url || '').toLowerCase().endsWith('.svg');
  const onPress = () => onItemPress(item);
  const onDownloadPress = () => onItemDownload(item);
  return (
    <TouchableOpacity style={styles.resourceCard} onPress={onPress} activeOpacity={0.85}>
      {item.image_url ? (
        isSvg ? (
          <View style={styles.resourceThumb}>
            <SvgThumbnail uri={item.image_url} width={145} height={75} />
          </View>
        ) : (
          <Image
            source={{uri: item.image_url}}
            style={styles.resourceThumb}
            width={145}
            height={75}
            resizeMode="cover"
          />
        )
      ) : (
        <View style={[styles.resourceThumb, {backgroundColor: '#192647'}]} />
      )}
      <View style={styles.resourceTextFrame}>
        <Text style={styles.resourceTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.resourceMeta}>
          {`${item.date_formatted || ''}${item.date_formatted ? '  •  ' : ''}${item.type_label || item.category_label || ''}`}
        </Text>
      </View>
      {item.type === 'video' && <ChevronRightIcon />}
      {item.type === 'cheatsheet' && (
        <TouchableOpacity onPress={onDownloadPress} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <DownloadCircleIcon />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ResourcesScreen = ({navigation}: any) => {
  const [tabs, setTabs] = useState<ResourceTab[]>(FALLBACK_TABS);
  const [activeTab, setActiveTab] = useState(0);
  const [categories, setCategories] = useState<ResourceCategory[]>([{id: '', label: 'All Categories'}]);
  const [search, setSearch] = useState('');
  // PERF: requests were firing on every keystroke; wait for typing to pause.
  const debouncedSearch = useDebouncedValue(search, 400);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [featuredItem, setFeaturedItem] = useState<ResourceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const endReachedLock = useRef(false);

  const activeTabId = tabs[activeTab]?.id || 'all';

  // Load tabs + categories once from the live endpoints (falls back to
  // static defaults above if the network calls fail) so the app always
  // reflects Robby's actual tab/category config instead of guessed values.
  // PERF: static defaults are already showing, so wait for the first list to
  // load instead of racing it (and each other) on the server at screen open.
  const metaLoadedRef = useRef(false);
  useEffect(() => {
    if (loading || metaLoadedRef.current) return;
    metaLoadedRef.current = true;
    (async () => {
      const [liveTabs, liveCategories] = await Promise.all([
        getResourceTabs(),
        getResourceCategories(),
      ]);
      if (liveTabs.length) setTabs(liveTabs);
      if (liveCategories.length) setCategories(liveCategories);
    })();
  }, [loading]);

  useEffect(() => {
    loadResources(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, debouncedSearch, selectedCategory]);

  const loadResources = async (pageNum = 1, reset = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const result = await getResources(activeTabId, pageNum, debouncedSearch, selectedCategory || null);

      if (reset) {
        // Was only checking result.items[0].is_featured — meant the
        // Featured Article section vanished entirely any time the
        // newest item on page 1 wasn't the featured one, even if a
        // featured item existed elsewhere on the page. Now searches the
        // whole page for the first featured item instead of assuming
        // it's always first.
        const featuredIndex = activeTabId === 'all'
          ? result.items.findIndex(i => i.is_featured)
          : -1;
        if (featuredIndex !== -1) {
          setFeaturedItem(result.items[featuredIndex]);
          setResources(result.items.filter((_, i) => i !== featuredIndex));
        } else {
          setFeaturedItem(null);
          setResources(result.items);
        }
      } else {
        setResources(prev => [...prev, ...result.items]);
      }
      setHasMore(!!result.pagination.has_more);
      setPage(pageNum);
    } catch {
    } finally {
      endReachedLock.current = false;
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // PERF: replaces the manual onScroll pagination. Same loader, same guards
  // (!loadingMore && hasMore) plus: not while the list is (re)loading / empty
  // (onEndReached can fire on an empty list right after layout, which onScroll
  // never did), and a synchronous ref lock so two calls in the same tick
  // can't both start a fetch before `loadingMore` state has re-rendered.
  // Not memoized on purpose: re-created each render so it always sees the
  // latest page/hasMore/filters (no stale closure).
  const handleEndReached = () => {
    if (endReachedLock.current || loading || loadingMore || !hasMore || resources.length === 0) return;
    endReachedLock.current = true;
    loadResources(page + 1);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadResources(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, debouncedSearch, selectedCategory]);

  // PERF: stable identity (only changes if `navigation` does) so memoized
  // ResourceCard rows aren't invalidated by unrelated re-renders.
  const handleItemPress = useCallback(
    (item: ResourceItem) => {
      navigation?.navigate('ResourceDetail', {resource: item});
    },
    [navigation],
  );

  // Routes through POST /resources/items/{post_id}/download so the CRM
  // lead-capture side effect on the backend actually fires (see
  // downloadResource in resourcesApi.ts). Previously this just opened
  // item.image_url directly via Linking, which meant the CRM entry
  // documented for this endpoint was never being created. Falls back to
  // image_url if the endpoint call fails, so the download still works
  // (just without the CRM logging) rather than dead-ending the user.
  // PERF: useCallback with [] — only touches its `item` arg and module imports.
  const handleQuickDownload = useCallback(async (item: ResourceItem) => {
    try {
      const result = await downloadResource(item.id);
      const url = result?.downloadUrl || result?.fileUrl || item.image_url;
      if (!url) return;
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert('Unable to open', 'This file could not be opened.');
    } catch {
      Alert.alert('Download failed', 'Please try again.');
    }
  }, []);

  const keyExtractor = useCallback((item: ResourceItem) => `${item.type}-${item.id}`, []);

  // PERF: row renderer for the virtualized list (was resources.map inside a ScrollView).
  const renderItem = useCallback(
    ({item}: {item: ResourceItem}) => (
      <View style={styles.resourceRow}>
        <ResourceCard item={item} onItemPress={handleItemPress} onItemDownload={handleQuickDownload} />
      </View>
    ),
    [handleItemPress, handleQuickDownload],
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      {/* PERF: was <ScrollView> + resources.map(...). Now a virtualized FlatList.
          Everything above the rows lives in ListHeaderComponent, below in
          ListFooterComponent. Both are passed as ELEMENTS (not inline
          component functions), so React sees the same element type at the
          same position on every render and the search TextInput below is
          NOT remounted — it keeps focus/keyboard while typing. */}
      <FlatList
        data={loading ? EMPTY_RESOURCES : resources}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0C4D91']} />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        ListHeaderComponent={
          <>
            {/* Hero — Figma: Heading/H2, 18px 700, #192647, letterSpacing 0.09 */}
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>
                {'Stay Current with the Latest Project Management Insights'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {'Find the resources you need to broaden your knowledge and boost your career.'}
              </Text>
            </View>

            {/* Search + Filter — Figma: height 36, padding 12 16/12, radius 5, border #8F9098 */}
            <SearchFilterRow
              style={{paddingHorizontal: 16}}
              value={search}
              onChangeText={setSearch}
              placeholder="Search Resources..."
              buttons={[{onPress: () => setFilterVisible(true)}]}
            />

            {/* Tabs (horizontal — not a vertical list, fine inside the header) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabsScroll}
              contentContainerStyle={styles.tabsContent}>
              {tabs.map((tab, i) => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(i)}
                  style={[styles.tab, i === activeTab && styles.tabActive]}>
                  <Text style={[styles.tabText, i === activeTab && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#0C4D91" />
              </View>
            ) : (
              <>
                {/* Featured Article — only on All Resources tab */}
                {featuredItem && activeTabId === 'all' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{'Featured Article'}</Text>
                    <FeaturedCard item={featuredItem} onPress={() => handleItemPress(featuredItem)} />
                  </View>
                )}

                {/* Top padding of the old `section` wrapper around the list
                    (it was rendered even when the list was empty). */}
                <View style={styles.sectionTopSpacer} />

                {resources.length === 0 && !featuredItem && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>{'No resources found'}</Text>
                    <Text style={styles.emptySubtitle}>{'Try a different search or category.'}</Text>
                  </View>
                )}
              </>
            )}
          </>
        }
        ListFooterComponent={
          <>
            {!loading && hasMore && resources.length > 0 && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => loadResources(page + 1)}
                disabled={loadingMore}>
                {loadingMore ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.loadMoreText}>{'Load More'}</Text>
                )}
              </TouchableOpacity>
            )}

            <View style={{height: 100}} />
          </>
        }
      />

      {/* Submit a Resource FAB */}
      <TouchableOpacity
        style={styles.submitFab}
        onPress={() => navigation?.navigate('ArticleSubmission')}
        activeOpacity={0.85}>
        <UploadArrowIcon />
      </TouchableOpacity>

      <FilterSheet
        visible={filterVisible}
        title="Filter by Category"
        items={categories.map((c: ResourceCategory) => ({id: c.id, label: c.label}))}
        selectedId={selectedCategory}
        onApply={setSelectedCategory}
        onClose={() => setFilterVisible(false)}
      />

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F2F4F7'},

  hero: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  heroTitle: {
    color: '#192647',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: 0.09,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#8F9098',
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: 'Runda',
  },

  // Matches ForumsScreen search row exactly (Forums is the reference UI).
  tabsScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  tabsContent: {paddingHorizontal: 16, paddingVertical: 10},
  tab: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, marginRight: 4},
  tabActive: {borderBottomWidth: 2, borderBottomColor: '#0C4D91'},
  tabText: {fontSize: 13, color: '#8F9098', fontWeight: '500', fontFamily: 'Runda'},
  tabTextActive: {color: '#0C4D91', fontWeight: '700'},

  loadingWrap: {paddingVertical: 60, alignItems: 'center'},
  section: {paddingHorizontal: 16, paddingTop: 16},
  // Row wrapper for virtualized list items (horizontal gutter of the old `section`).
  resourceRow: {paddingHorizontal: 16},
  // Replaces the old list `section`'s paddingTop: 16 (always rendered, even if empty).
  sectionTopSpacer: {height: 16},
  sectionTitle: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
    marginBottom: 12,
  },

  // Featured card — Figma: 358x255, borderRadius 5, radial gradient overlay
  featuredCard: {
    width: '100%',
    height: 255,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  featuredImage: {width: '100%', height: '100%', position: 'absolute'},
  featuredGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(25,38,71,0.55)',
  },
  featuredOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredAuthorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFF',
    marginRight: 8,
  },
  featuredMeta: {},
  featuredAuthorName: {fontSize: 13, fontWeight: '700', color: '#FFF', fontFamily: 'Runda'},
  featuredAuthorRole: {fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: 'Runda'},
  featuredContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  // Figma: Heading/H2 — #FFF, 18px, weight 700, letterSpacing 0.09
  featuredTitle: {
    color: '#FFFFFF',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
    lineHeight: 23,
    marginBottom: 6,
  },
  readMore: {fontSize: 13, color: '#46B0E3', fontWeight: '600', fontFamily: 'Runda'},

  // Resource card
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  resourceThumb: {
    width: 145,
    height: 75,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#F5F6FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resourceTextFrame: {flex: 1},
  // Figma originally specced weight 500, but confirmed via follow-up
  // feedback that titles should be bold across every type (Articles,
  // Templates, E-books, Videos, Cheat Sheets) — this overrides that.
  resourceTitle: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 8,
  },
  resourceMeta: {fontSize: 11, color: '#8F9098', fontFamily: 'Runda'},
  downloadCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#0C4D91',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyState: {alignItems: 'center', paddingVertical: 50, paddingHorizontal: 32},
  emptyTitle: {fontSize: 16, fontWeight: '700', color: '#192546', marginBottom: 6, fontFamily: 'Runda'},
  emptySubtitle: {fontSize: 13, color: '#8F9098', textAlign: 'center', fontFamily: 'Runda'},

  loadMoreBtn: {
    backgroundColor: '#1A1A3E',
    marginHorizontal: 16,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  loadMoreText: {color: '#FFF', fontSize: 15, fontWeight: '600', fontFamily: 'Runda'},

  // Was bottom:90 (too far above the tab bar). Figma: 16px gap above
  // the bottom navigation.
  submitFab: {
    position: 'absolute',
    bottom: 16,
    right: 20,
    width: 45,
    height: 45,
    borderRadius: 45,
    backgroundColor: '#0C4D91',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#084D92',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default ResourcesScreen;
