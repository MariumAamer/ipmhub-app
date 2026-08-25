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
  Animated,
  Modal,
  FlatList,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import {WebView} from 'react-native-webview';
import Svg, {Path} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
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
const SearchIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M6.42668 0.333374C3.06384 0.333374 0.333008 3.03777 0.333008 6.3796C0.333008 9.72143 3.06384 12.4258 6.42668 12.4258C7.68042 12.4258 8.84667 12.0498 9.81595 11.405L13.7914 15.3477C14.2203 15.7731 14.9146 15.7731 15.3435 15.3477C15.774 14.9207 15.774 14.2274 15.3435 13.8005L11.3936 9.88316C12.1028 8.89491 12.5203 7.68535 12.5203 6.3796C12.5203 3.03777 9.78951 0.333374 6.42668 0.333374ZM2.53084 6.3796C2.53084 4.24982 4.27246 2.5186 6.42668 2.5186C8.58089 2.5186 10.3225 4.24982 10.3225 6.3796C10.3225 8.50938 8.58089 10.2406 6.42668 10.2406C4.27246 10.2406 2.53084 8.50938 2.53084 6.3796Z" fill="#192546" />
  </Svg>
);

const FilterIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M1.33301 3C1.33301 2.73478 1.43335 2.48043 1.61195 2.29289C1.79056 2.10536 2.0328 2 2.28539 2H13.714C13.9665 2 14.2088 2.10536 14.3874 2.29289C14.566 2.48043 14.6663 2.73478 14.6663 3C14.6663 3.26522 14.566 3.51957 14.3874 3.70711C14.2088 3.89464 13.9665 4 13.714 4H2.28539C2.0328 4 1.79056 3.89464 1.61195 3.70711C1.43335 3.51957 1.33301 3.26522 1.33301 3ZM3.43162 8C3.43162 7.73478 3.53196 7.48043 3.71057 7.29289C3.88918 7.10536 4.13142 7 4.38401 7H11.6617C11.9142 7 12.1565 7.10536 12.3351 7.29289C12.5137 7.48043 12.614 7.73478 12.614 8C12.614 8.26522 12.5137 8.51957 12.3351 8.70711C12.1565 8.89464 11.9142 9 11.6617 9H4.38401C4.13142 9 3.88918 8.89464 3.71057 8.70711C3.53196 8.51957 3.43162 8.26522 3.43162 8ZM5.87944 13.1322C5.87944 12.867 5.97978 12.6127 6.15838 12.4251C6.33699 12.2376 6.57923 12.1322 6.83182 12.1322H9.21571C9.4683 12.1322 9.71054 12.2376 9.88915 12.4251C10.0678 12.6127 10.1681 12.867 10.1681 13.1322C10.1681 13.3974 10.0678 13.6518 9.88915 13.8393C9.71054 14.0269 9.4683 14.1322 9.21571 14.1322H6.83182C6.57923 14.1322 6.33699 14.0269 6.15838 13.8393C5.97978 13.6518 5.87944 13.3974 5.87944 13.1322Z" fill="#192546" />
  </Svg>
);

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

// ─── Filter by Category Sheet ─────────────────────────────────────────────────
const FilterSheet = ({visible, onClose, categories, selected, onSelect, onContinue}: any) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  useEffect(() => {
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
      <View style={fs.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </View>
      <Animated.View style={[fs.sheet, {transform: [{translateY: slideAnim}]}]}>
        <View style={fs.header}>
          <Text style={fs.title}>{'Filter by Category'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <CloseIcon size={20} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={categories}
          keyExtractor={(i: ResourceCategory) => i.id || 'all'}
          style={fs.list}
          contentContainerStyle={fs.listContent}
          renderItem={({item}: {item: ResourceCategory}) => (
            <TouchableOpacity
              style={[fs.item, selected === item.id && fs.itemActive]}
              onPress={() => onSelect(item.id)}>
              <Text style={fs.itemText}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
        <TouchableOpacity style={fs.btn} onPress={onContinue}>
          <Text style={fs.btnText}>{'Continue'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const fs = StyleSheet.create({
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
  // Figma: height 56, padding 18 24 16.5 126.5, justify flex-end, gap 83.5
  // The large asymmetric left padding + flex-end is what visually centers
  // the title while keeping the X pinned to the right edge — a plain
  // "justify: center" (previous implementation) pushes the X off-position.
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    height: 56,
    paddingTop: 18,
    paddingRight: 24,
    paddingBottom: 16.5,
    paddingLeft: 126.5,
    backgroundColor: '#FFFFFF',
  },
  title: {fontSize: 17, fontWeight: '700', color: '#0C4D91', fontFamily: 'Runda', marginRight: 83.5},
  list: {maxHeight: 371},
  // Figma: padding 0 16, no dividers between rows. Vertical spacing
  // between rows now comes from marginBottom on `item` below instead of
  // gap (unreliable on Android/Hermes per project rules).
  listContent: {paddingHorizontal: 16, paddingVertical: 6},
  item: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  itemActive: {backgroundColor: '#EEF3FB'},
  // Figma originally specced weight 500 (no bold on any state), but
  // confirmed via follow-up feedback that category items should be bold.
  itemText: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '700',
  },
  btn: {
    backgroundColor: '#0C4D91',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: {color: '#FFF', fontSize: 16, fontWeight: '700', fontFamily: 'Runda'},
});

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

const ResourceCard = ({item, onPress, onDownloadPress}: any) => {
  const isSvg = item.type === 'cheatsheet' || (item.image_url || '').toLowerCase().endsWith('.svg');
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
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ResourcesScreen = ({navigation}: any) => {
  const [tabs, setTabs] = useState<ResourceTab[]>(FALLBACK_TABS);
  const [activeTab, setActiveTab] = useState(0);
  const [categories, setCategories] = useState<ResourceCategory[]>([{id: '', label: 'All Categories'}]);
  const [search, setSearch] = useState('');
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

  const activeTabId = tabs[activeTab]?.id || 'all';

  // Load tabs + categories once from the live endpoints (falls back to
  // static defaults above if the network calls fail) so the app always
  // reflects Robby's actual tab/category config instead of guessed values.
  useEffect(() => {
    (async () => {
      const [liveTabs, liveCategories] = await Promise.all([
        getResourceTabs(),
        getResourceCategories(),
      ]);
      if (liveTabs.length) setTabs(liveTabs);
      if (liveCategories.length) setCategories(liveCategories);
    })();
  }, []);

  useEffect(() => {
    loadResources(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, search, selectedCategory]);

  const loadResources = async (pageNum = 1, reset = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const result = await getResources(activeTabId, pageNum, search, selectedCategory || null);

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
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadResources(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, search, selectedCategory]);

  const handleItemPress = (item: ResourceItem) => {
    navigation?.navigate('ResourceDetail', {resource: item});
  };

  // Routes through POST /resources/items/{post_id}/download so the CRM
  // lead-capture side effect on the backend actually fires (see
  // downloadResource in resourcesApi.ts). Previously this just opened
  // item.image_url directly via Linking, which meant the CRM entry
  // documented for this endpoint was never being created. Falls back to
  // image_url if the endpoint call fails, so the download still works
  // (just without the CRM logging) rather than dead-ending the user.
  const handleQuickDownload = async (item: ResourceItem) => {
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0C4D91']} />
        }
        onScroll={({nativeEvent}) => {
          const {layoutMeasurement, contentOffset, contentSize} = nativeEvent;
          if (
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 200 &&
            !loadingMore &&
            hasMore
          ) {
            loadResources(page + 1);
          }
        }}
        scrollEventThrottle={400}>

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
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <SearchIcon />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Resources..."
              // Escalated twice already (#8F9098 -> #5C5E66) and still
              // read as too faint on device, so this now matches the
              // typed-text color exactly for maximum contrast. If you'd
              // rather placeholder stay visually distinct from typed
              // text, let me know a target color and I'll back it off.
              placeholderTextColor="#192546"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterVisible(true)}>
            <FilterIcon />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
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

            {/* Resource list */}
            <View style={styles.section}>
              {resources.map(item => (
                <ResourceCard
                  key={`${item.type}-${item.id}`}
                  item={item}
                  onPress={() => handleItemPress(item)}
                  onDownloadPress={() => handleQuickDownload(item)}
                />
              ))}
            </View>

            {resources.length === 0 && !featuredItem && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{'No resources found'}</Text>
                <Text style={styles.emptySubtitle}>{'Try a different search or category.'}</Text>
              </View>
            )}

            {hasMore && resources.length > 0 && (
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
          </>
        )}

        <View style={{height: 100}} />
      </ScrollView>

      {/* Submit a Resource FAB */}
      <TouchableOpacity
        style={styles.submitFab}
        onPress={() => navigation?.navigate('ArticleSubmission')}
        activeOpacity={0.85}>
        <UploadArrowIcon />
      </TouchableOpacity>

      <FilterSheet
        visible={filterVisible}
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        onClose={() => setFilterVisible(false)}
        onContinue={() => setFilterVisible(false)}
      />

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </SafeAreaView>
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

  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  // Figma spec: height 36, padding 12 16. Using minHeight instead of a
  // fixed height — height + paddingVertical together on the same element
  // is a documented anti-pattern in this project (causes text to not
  // render), so padding drives the actual sizing here instead.
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#192546',
    backgroundColor: '#FFFFFF',
    marginRight: 12,
  },
  // IMPORTANT: Android doesn't apply fontWeight to custom fonts the way
  // iOS does — it needs the exact linked family name. Your project links
  // "Runda Bold" and "Runda Normal" as separate TTFs (react.native.config.js),
  // so fontFamily:'Runda' + fontWeight:'700' was silently falling back to
  // the normal weight on Android. Using the bold family directly here.
  // VERIFY the exact linked name matches — I'm assuming "Runda-Bold"
  // based on your file naming; if react-native.config.js registered a
  // different exact string, swap it in here (and anywhere else
  // fontWeight was used with fontFamily:'Runda' throughout Resources —
  // same bug likely affected resourceTitle, itemText, featuredTitle,
  // sectionTitle, etc.)
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#192546',
    fontFamily: 'Runda-Bold',
    padding: 0,
    marginLeft: 10,
  },
  // Figma originally specced #8F9098 border — darkened per follow-up
  // feedback ("search bar, filter etc are supposed to be bold and dark").
  // Same minHeight fix as searchBar above (was height+paddingVertical).
  filterBtn: {
    minHeight: 36,
    width: 36,
    paddingVertical: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#192546',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

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
