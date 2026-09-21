/* eslint-disable prettier/prettier */
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Modal,
  FlatList,
  Dimensions,
  Animated,
  Linking,
  ActivityIndicator,
} from 'react-native';
// Was importing SafeAreaView from 'react-native' — that core component is
// iOS-only (a no-op on Android), which is why the back button on both the
// article and video layouts sat under the Android status bar. Swapped to
// the real cross-platform SafeAreaView.
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import {WebView} from 'react-native-webview';
import BackButton from '../components/BackButton';
import {
  getResources,
  getResourceById,
  ResourceItem,
  ResourceDetail,
  splitIntoSections,
} from '../api/resourcesApi';
import ShareSheet, {ShareButton} from '../components/ShareSheet';
import InfographicViewer from '../components/InfographicViewer';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

// Close (X) icon — exact from Figma, 20x20, mask-based, #C5C6CC fill.
// Same icon used across every sheet in Resources (Filter by Category, Share,
// Table of Contents).
const CloseIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M1.61612 1.61611C2.10427 1.12796 2.89573 1.12796 3.38388 1.61611L18.3839 16.6159C18.872 17.104 18.872 17.8955 18.3839 18.3836C17.8957 18.8718 17.1043 18.8718 16.6161 18.3836L1.61612 3.38385C1.12796 2.8957 1.12796 2.10426 1.61612 1.61611Z" fill="#C5C6CC" />
    <Path fillRule="evenodd" clipRule="evenodd" d="M18.3839 1.61611C17.8957 1.12796 17.1043 1.12796 16.6161 1.61611L1.61612 16.6159C1.12796 17.104 1.12796 17.8955 1.61612 18.3836C2.10427 18.8718 2.89573 18.8718 3.38388 18.3836L18.3839 3.38385C18.872 2.8957 18.872 2.10426 18.3839 1.61611Z" fill="#C5C6CC" />
  </Svg>
);

// ─── Table of Contents dropdown sheet ─────────────────────────────────────────
const TOCSheet = ({visible, onClose, items, onSelect}: any) => {
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
      <View style={toc.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </View>
      <Animated.View style={[toc.sheet, {transform: [{translateY: slideAnim}]}]}>
        <View style={toc.header}>
          <Text style={toc.title}>{'Table of Contents'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <CloseIcon />
          </TouchableOpacity>
        </View>
        <FlatList
          data={items}
          keyExtractor={(item: any) => item.id}
          renderItem={({item, index}: any) => (
            <TouchableOpacity
              style={[toc.item, index === 0 && toc.itemFirst]}
              onPress={() => {
                onSelect(item, index);
                onClose();
              }}>
              <Text style={[toc.itemText, index === 0 && toc.itemTextActive]}>
                {item.text}
              </Text>
            </TouchableOpacity>
          )}
        />
      </Animated.View>
    </Modal>
  );
};

const toc = StyleSheet.create({
  backdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)'},
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.6,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {fontSize: 17, fontWeight: '700', color: '#0C4D91', fontFamily: 'Runda'},
  item: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  itemFirst: {backgroundColor: '#EEF3FB'},
  itemText: {fontSize: 14, color: '#192546', fontFamily: 'Runda'},
  itemTextActive: {color: '#0C4D91', fontWeight: '600'},
});

// ─── Up Next video card ───────────────────────────────────────────────────────
const UpNextCard = ({item, onPress}: any) => (
  <TouchableOpacity style={s.upNextCard} onPress={onPress} activeOpacity={0.85}>
    {item.image_url ? (
      <Image source={{uri: item.image_url}} style={s.upNextThumb} width={100} height={60} resizeMode="cover" />
    ) : (
      <View style={[s.upNextThumb, {backgroundColor: '#192647'}]} />
    )}
    <View style={s.upNextText}>
      <Text style={s.upNextTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={s.upNextMeta}>{item.duration || item.type_label}</Text>
    </View>
    <Text style={s.upNextChevron}>{'›'}</Text>
  </TouchableOpacity>
);

// ─── Main Resource Detail Screen ──────────────────────────────────────────────
const ResourceDetailScreen = ({navigation, route}: any) => {
  // The list item is passed in for the thumbnail/type/permalink we already
  // have; full content (body, TOC, category/tag) is fetched fresh below.
  const listItem: ResourceItem = route?.params?.resource || {};
  const isVideo = listItem.type === 'video';
  const isCheatsheet = listItem.type === 'cheatsheet';

  const [detail, setDetail] = useState<ResourceDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(!isVideo);
  const [tocVisible, setTocVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [upNext, setUpNext] = useState<ResourceItem[]>([]);

  const tocItems = detail?.tableOfContents || [];
  const [renderedSections, setRenderedSections] = useState<ReturnType<typeof splitIntoSections>>([]);

  const scrollViewRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<string, number>>({});

  const handleSectionLayout = (id: string, y: number) => {
    sectionPositions.current[id] = y;
  };

  const scrollToSection = (item: any) => {
    const y = sectionPositions.current[item.id];
    if (y !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({y: Math.max(y - 12, 0), animated: true});
    }
  };

  useEffect(() => {
    if (isVideo) {
      loadUpNext();
    } else {
      loadDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDetail = async () => {
    setLoadingDetail(true);
    const data = await getResourceById(listItem.id);
    setDetail(data);
    setRenderedSections(splitIntoSections(data?.content || ''));
    setLoadingDetail(false);
  };

  const loadUpNext = async () => {
    try {
      const result = await getResources('videos', 1, '');
      setUpNext(result.items.filter(v => v.id !== listItem.id).slice(0, 4));
    } catch {}
  };

  const handleSubmitResource = () => {
    setShareVisible(false);
    navigation?.navigate('ArticleSubmission');
  };

  // Tries the native YouTube app first (youtube://), falls back to the
  // regular web URL if the app isn't installed or the deep link fails.
  const handleOpenYouTube = () => {
    const videoId = listItem.video_id;
    if (!videoId) return;
    const appUrl = `youtube://www.youtube.com/watch?v=${videoId}`;
    const webUrl = `https://www.youtube.com/watch?v=${videoId}`;
    Linking.canOpenURL(appUrl)
      .then(supported => {
        if (supported) return Linking.openURL(appUrl);
        return Linking.openURL(webUrl);
      })
      .catch(() => Linking.openURL(webUrl));
  };

  if (isCheatsheet) {
    // Cheat sheets are always a single .svg image, and the shared
    // /items/{id} detail endpoint currently returns an empty placeholder
    // for this content type (confirmed — flagged to Robby separately).
    // The list item already has everything needed (image_url, title,
    // permalink), so this skips the detail fetch entirely.
    return (
      <InfographicViewer
        visible
        onClose={() => navigation.goBack()}
        title={listItem.title}
        imageUrl={listItem.image_url || ''}
        resourceId={listItem.id}
      />
    );
  }

  if (isVideo) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.videoHeader}>
            <BackButton onPress={() => navigation.goBack()} />
          </View>

          <Text style={s.videoTitle}>{listItem.title}</Text>

          <View style={s.videoPlayerWrap}>
            {listItem.video_embed_url ? (
              <WebView
                source={{uri: listItem.video_embed_url}}
                style={s.videoPlayer}
                allowsFullscreenVideo
                javaScriptEnabled
              />
            ) : (
              <View style={[s.videoPlayer, s.videoPlaceholder]}>
                <Text style={s.videoPlaceholderText}>{'Video unavailable'}</Text>
              </View>
            )}
          </View>

          <View style={s.publisherRow}>
            <View style={s.publisherLogo}>
              <Text style={s.publisherLogoText}>{'IPM'}</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={s.publisherName}>{'Institute of Project Management'}</Text>
              {listItem.duration ? (
                <Text style={s.publisherDate}>{listItem.duration}</Text>
              ) : null}
            </View>
            {listItem.video_id ? (
              <TouchableOpacity style={s.youtubeBtn} onPress={handleOpenYouTube} activeOpacity={0.85}>
                <Text style={s.youtubeBtnText}>{'▶  YouTube'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={s.divider} />

          <View style={s.upNextSection}>
            <Text style={s.upNextHeading}>{'Up Next'}</Text>
            {upNext.map(item => (
              <UpNextCard
                key={item.id}
                item={item}
                onPress={() => navigation.push('ResourceDetail', {resource: item})}
              />
            ))}
          </View>

          <View style={{height: 40}} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (loadingDetail) {
    return (
      <SafeAreaView style={[s.container, {alignItems: 'center', justifyContent: 'center'}]}>
        <ActivityIndicator size="large" color="#0C4D91" />
      </SafeAreaView>
    );
  }

  const heroImage = detail?.header_image_url || listItem.header_image_url || listItem.image_url;
  const title = detail?.title || listItem.title;
  const categoryLabel = detail?.category?.name || listItem.category_label || listItem.type_label;
  const dateLabel = detail?.date_formatted || listItem.date_formatted;
  // Share/Open-in-Browser both use the permalink straight from the API —
  // never build this URL manually (see Robby re: .COM vs Hub for detail pages).
  const shareUrl = detail?.permalink || listItem.permalink || 'https://hub.instituteprojectmanagement.com';

  // ─── Article layout ──────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Was the first child inside the ScrollView, so it scrolled away
          with the rest of the content instead of staying put. Now a
          fixed header sibling above the ScrollView — always visible
          regardless of scroll position. */}
      <View style={s.topBar}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false}>
        <View style={s.heroWrap}>
          {heroImage ? (
            <Image source={{uri: heroImage}} style={s.heroImage} resizeMode="cover" />
          ) : (
            <View style={[s.heroImage, {backgroundColor: '#192647'}]} />
          )}
          <View style={s.heroDarkOverlay} pointerEvents="none" />

          <View style={s.heroContent}>
            <Text style={s.heroCategoryText}>
              {`${listItem.type_label || 'Articles'} • ${categoryLabel || 'Resources'}`}
            </Text>
            <Text style={s.heroTitle}>{title}</Text>
            {dateLabel ? <Text style={s.heroDate}>{dateLabel}</Text> : null}
          </View>
        </View>

        <View style={s.actionsRow}>
          <TouchableOpacity
            style={s.tocBtn}
            onPress={() => setTocVisible(true)}
            disabled={tocItems.length === 0}>
            <Text style={s.tocBtnText}>{'Table of Contents'}</Text>
            <Text style={s.tocChevron}>{'⌄'}</Text>
          </TouchableOpacity>
          <ShareButton onPress={() => setShareVisible(true)} />
        </View>

        <View style={s.contentWrap}>
          {renderedSections.map(section => (
            <View
              key={section.id}
              onLayout={e => handleSectionLayout(section.id, e.nativeEvent.layout.y)}>
              {section.heading ? (
                <Text style={s.sectionHeading}>{section.heading}</Text>
              ) : section.id === 'toc-intro' && tocItems.length > 0 ? (
                <Text style={s.sectionHeading}>{'Introduction'}</Text>
              ) : null}
              {section.blocks.map((block, i) => {
                if (block.type === 'course') {
                  return (
                    <View key={`${section.id}-${i}`} style={s.courseCard}>
                      <View style={s.courseTop}>
                        <View style={s.courseTextWrap}>
                          <Text style={s.courseTitle}>{block.title}</Text>
                          {block.description ? (
                            <Text style={s.courseDescription}>{block.description}</Text>
                          ) : null}
                        </View>
                        {block.imageSrc ? (
                          <Image source={{uri: block.imageSrc}} style={s.courseIcon} resizeMode="cover" />
                        ) : null}
                      </View>
                      {block.primaryUrl ? (
                        <TouchableOpacity
                          style={s.courseBtnPrimary}
                          onPress={() => Linking.openURL(block.primaryUrl as string)}
                          activeOpacity={0.85}>
                          <Text style={s.courseBtnPrimaryText}>{block.primaryLabel}</Text>
                        </TouchableOpacity>
                      ) : null}
                      {block.secondaryUrl ? (
                        <TouchableOpacity
                          style={s.courseBtnSecondary}
                          onPress={() => Linking.openURL(block.secondaryUrl as string)}
                          activeOpacity={0.85}>
                          <Text style={s.courseBtnSecondaryText}>{block.secondaryLabel}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                }
                if (block.type === 'table' && block.rows?.length) {
                  const [headerRow, ...bodyRows] = block.rows;
                  return (
                    <View key={`${section.id}-${i}`} style={s.table}>
                      <View style={s.tableRow}>
                        {headerRow.map((cell, ci) => (
                          <View key={ci} style={[s.tableCell, s.tableHeaderCell]}>
                            <Text style={s.tableHeaderText}>{cell}</Text>
                          </View>
                        ))}
                      </View>
                      {bodyRows.map((row, ri) => (
                        <View key={ri} style={s.tableRow}>
                          {row.map((cell, ci) => (
                            <View key={ci} style={s.tableCell}>
                              <Text style={s.tableCellText}>{cell}</Text>
                            </View>
                          ))}
                        </View>
                      ))}
                    </View>
                  );
                }
                if (block.type === 'list' && block.items?.length) {
                  return (
                    <View key={`${section.id}-${i}`} style={s.listWrap}>
                      {block.items.map((segments, li) => (
                        <View key={li} style={s.listRow}>
                          <Text style={s.listMarker}>
                            {block.ordered ? `${(block.startNumber || 1) + li}.` : '•'}
                          </Text>
                          <Text style={s.listItemText}>
                            {segments.map((seg, si) =>
                              seg.url ? (
                                <Text
                                  key={si}
                                  style={s.inlineLink}
                                  onPress={() => Linking.openURL(seg.url as string)}>
                                  {seg.text}
                                </Text>
                              ) : (
                                <Text key={si}>{seg.text}</Text>
                              ),
                            )}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                }
                if (block.type === 'image' && block.src) {
                  return (
                    <Image
                      key={`${section.id}-${i}`}
                      source={{uri: block.src}}
                      style={s.contentImage}
                      resizeMode="cover"
                    />
                  );
                }
                if (block.type === 'button' && block.url) {
                  return (
                    <TouchableOpacity
                      key={`${section.id}-${i}`}
                      style={s.ctaBtn}
                      onPress={() => Linking.openURL(block.url as string)}
                      activeOpacity={0.85}>
                      <Text style={s.ctaBtnText}>{block.text}</Text>
                    </TouchableOpacity>
                  );
                }
                if (block.type === 'video' && block.url) {
                  return (
                    <TouchableOpacity
                      key={`${section.id}-${i}`}
                      style={s.videoLinkBtn}
                      onPress={() => Linking.openURL(block.url as string)}
                      activeOpacity={0.85}>
                      <Text style={s.videoLinkText}>{`▶  ${block.text || 'Watch video'}`}</Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <Text key={`${section.id}-${i}`} style={s.paragraph}>
                    {(block.segments || [{text: block.text || ''}]).map((seg, si) =>
                      seg.url ? (
                        <Text
                          key={si}
                          style={s.inlineLink}
                          onPress={() => Linking.openURL(seg.url as string)}>
                          {seg.text}
                        </Text>
                      ) : (
                        <Text key={si}>{seg.text}</Text>
                      ),
                    )}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>

        <View style={{height: 60}} />
      </ScrollView>

      <TOCSheet
        visible={tocVisible}
        onClose={() => setTocVisible(false)}
        items={tocItems}
        onSelect={scrollToSection}
      />

      <ShareSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        url={shareUrl}
        title={title}
        onSubmitResource={handleSubmitResource}
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},

  // ── Article layout ──
  topBar: {
    minHeight: 56,
    paddingLeft: 20,
    paddingVertical: 14,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  heroWrap: {position: 'relative', height: 280},
  heroImage: {width: '100%', height: '100%'},
  heroDarkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(25,38,71,0.45)',
  },
  heroContent: {position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18},
  heroCategoryText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 6,
    fontFamily: 'Runda',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 27,
    marginBottom: 8,
    fontFamily: 'Runda',
  },
  heroDate: {fontSize: 12, color: 'rgba(255,255,255,0.8)', fontFamily: 'Runda'},

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tocBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
  },
  tocBtnText: {fontSize: 13, color: '#192546', fontFamily: 'Runda', fontWeight: '600'},
  tocChevron: {fontSize: 16, color: '#8F9098'},

  contentWrap: {padding: 20},
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#192546',
    marginBottom: 8,
    marginTop: 4,
    fontFamily: 'Runda',
  },
  paragraph: {fontSize: 15, color: '#444', lineHeight: 21, marginBottom: 14, fontFamily: 'Runda'},
  courseCard: {
    backgroundColor: '#EEF7FC',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  courseTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  courseTextWrap: {flex: 1, marginRight: 16},
  courseTitle: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  courseDescription: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  courseIcon: {width: 95, height: 95, borderRadius: 200, backgroundColor: '#FFFFFF'},
  courseBtnPrimary: {
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    backgroundColor: '#0C4D91',
    marginBottom: 12,
  },
  courseBtnPrimaryText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'Runda'},
  courseBtnSecondary: {
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#0C4D91',
  },
  courseBtnSecondaryText: {color: '#0C4D91', fontSize: 14, fontWeight: '700', fontFamily: 'Runda'},
  table: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableRow: {flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0E0E0'},
  tableCell: {
    flex: 1,
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    justifyContent: 'center',
  },
  tableHeaderCell: {backgroundColor: '#F5F6FA'},
  tableHeaderText: {fontSize: 13, fontWeight: '700', color: '#192546', fontFamily: 'Runda'},
  tableCellText: {fontSize: 13, color: '#444', fontFamily: 'Runda', lineHeight: 18},
  contentImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#F5F6FA',
  },
  ctaBtn: {
    backgroundColor: '#0C4D91',
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  ctaBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'Runda'},
  inlineLink: {color: '#0C4D91', textDecorationLine: 'underline'},
  listWrap: {marginBottom: 16},
  listRow: {flexDirection: 'row', marginBottom: 10, paddingRight: 4},
  listMarker: {
    color: '#46B0E3',
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'Runda',
    width: 24,
  },
  listItemText: {flex: 1, fontSize: 15, color: '#444', lineHeight: 22, fontFamily: 'Runda'},
  videoLinkBtn: {
    backgroundColor: '#F5F6FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  videoLinkText: {color: '#0C4D91', fontSize: 14, fontWeight: '700', fontFamily: 'Runda'},

  // ── Video layout ──
  videoHeader: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4},
  videoTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#192546',
    lineHeight: 25,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontFamily: 'Runda',
  },
  videoPlayerWrap: {
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
    aspectRatio: 16 / 9,
    marginBottom: 16,
  },
  videoPlayer: {width: '100%', height: '100%'},
  videoPlaceholder: {
    backgroundColor: '#192647',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholderText: {color: '#FFF', fontFamily: 'Runda'},
  publisherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  publisherLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0C4D91',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  publisherLogoText: {color: '#FFF', fontSize: 11, fontWeight: '800'},
  publisherName: {fontSize: 14, fontWeight: '700', color: '#192546', fontFamily: 'Runda'},
  publisherDate: {fontSize: 12, color: '#8F9098', fontFamily: 'Runda'},
  youtubeBtn: {
    backgroundColor: '#FF0000',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  youtubeBtnText: {color: '#FFFFFF', fontSize: 12, fontWeight: '700', fontFamily: 'Runda'},
  divider: {height: 1, backgroundColor: '#F0F0F0', marginBottom: 16},
  upNextSection: {paddingHorizontal: 16},
  upNextHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#192546',
    marginBottom: 14,
    fontFamily: 'Runda',
  },
  upNextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  upNextThumb: {width: 100, height: 60, borderRadius: 6, marginRight: 12},
  upNextText: {flex: 1},
  upNextTitle: {fontSize: 13, fontWeight: '600', color: '#192546', lineHeight: 17, fontFamily: 'Runda', marginBottom: 6},
  upNextMeta: {fontSize: 11, color: '#8F9098', fontFamily: 'Runda'},
  upNextChevron: {fontSize: 22, color: '#0C4D91'},
});

export default ResourceDetailScreen;
