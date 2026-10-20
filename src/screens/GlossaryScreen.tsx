/* eslint-disable prettier/prettier */
import React, {useMemo, useRef, useState, useEffect, useCallback} from 'react';
import {
  Keyboard,
  View,
  Text,
  StyleSheet,
  SectionList,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {Path, Circle} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import {GlossaryTerm, getGlossary, searchGlossary} from '../api/supportHubApi';
import {useDebouncedValue} from '../hooks/useDebouncedValue';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// ─── Icons ──────────────────────────────────────────────────────────────────

const SearchIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.42765 0.333496C3.06482 0.333496 0.333984 3.03789 0.333984 6.37972C0.333984 9.72155 3.06482 12.4259 6.42765 12.4259C7.6814 12.4259 8.84764 12.0499 9.81693 11.4052L13.7923 15.3478C14.2213 15.7732 14.9156 15.7732 15.3445 15.3478C15.7749 14.9209 15.7749 14.2276 15.3445 13.8007L11.3945 9.88328C12.1038 8.89503 12.5213 7.68547 12.5213 6.37972C12.5213 3.03789 9.79049 0.333496 6.42765 0.333496ZM2.53182 6.37972C2.53182 4.24994 4.27344 2.51872 6.42765 2.51872C8.58187 2.51872 10.3235 4.24994 10.3235 6.37972C10.3235 8.5095 8.58187 10.2407 6.42765 10.2407C4.27344 10.2407 2.53182 8.5095 2.53182 6.37972Z"
      fill="#8F9098"
    />
  </Svg>
);

const ScrollTopIcon = () => (
  <Svg width={45} height={45} viewBox="0 0 45 45" fill="none">
    <Circle cx={22.5} cy={22.5} r={22.5} fill="#0C4D91" />
    <Path
      d="M15 20L21 14L27 20M21 14V28"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── Screen ─────────────────────────────────────────────────────────────────

const ItemSep = () => <View style={{height: 12}} />;

const GlossaryScreen = ({navigation}: any) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [query, setQuery] = useState('');

  // Measured height of the hero's real content — see HelpSupportScreen for
  // why this is needed: `bottom: 0` auto-stretch against an auto-sized
  // parent resolves to zero height for this LinearGradient/iOS combo, so
  // it's given an explicit numeric height once measured instead.
  const [heroHeight, setHeroHeight] = useState(0);

  // PERF: ~470 terms used to be rendered at once inside a ScrollView. It is
  // now a virtualized SectionList; letter jumps use scrollToLocation.
  const listRef = useRef<SectionList<GlossaryTerm>>(null);
  const pendingJump = useRef<number | null>(null);
  // PERF: filtering/regrouping every term on every keystroke is debounced.
  const debouncedQuery = useDebouncedValue(query, 250);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await getGlossary();
      setTerms(data);
      setLoading(false);
    })();
  }, []);

  const filteredTerms = useMemo(() => {
    if (!debouncedQuery.trim()) return terms;
    return searchGlossary(debouncedQuery, terms);
  }, [debouncedQuery, terms]);

  const grouped = useMemo(() => {
    const map: Record<string, GlossaryTerm[]> = {};
    filteredTerms.forEach(t => {
      const letter = (t.letter || t.title.charAt(0) || '#').toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(t);
    });
    return Object.keys(map)
      .sort()
      .map(letter => ({letter, data: map[letter]}));
  }, [filteredTerms]);

  const activeLetters = useMemo(() => new Set(grouped.map(g => g.letter)), [grouped]);

  const handleGoBack = () => navigation.goBack();

  const handleLetterPress = (letter: string) => {
    const sectionIndex = grouped.findIndex(g => g.letter === letter);
    if (sectionIndex < 0) return;
    pendingJump.current = sectionIndex;
    // itemIndex 0 targets the section header.
    listRef.current?.scrollToLocation({sectionIndex, itemIndex: 0, viewOffset: 0, animated: true});
  };

  // Rows far below the rendered window have no measured height yet: jump to
  // an estimated offset first, then retry the exact scroll once they render.
  const handleScrollToIndexFailed = (info: {index: number; averageItemLength: number}) => {
    (listRef.current as any)
      ?.getScrollResponder?.()
      ?.scrollTo({y: info.averageItemLength * info.index, animated: false});
    setTimeout(() => {
      const idx = pendingJump.current;
      if (idx == null) return;
      listRef.current?.scrollToLocation({sectionIndex: idx, itemIndex: 0, viewOffset: 0, animated: true});
    }, 120);
  };

  const handleScrollToTop = () => {
    pendingJump.current = null;
    (listRef.current as any)?.getScrollResponder?.()?.scrollTo({y: 0, animated: true});
  };

  const renderTerm = useCallback(
    ({item}: {item: GlossaryTerm}) => (
      <View style={s.termCard}>
        <Text style={s.termHeading}>{item.title}</Text>
        <Text style={s.termDetail}>{item.content_text}</Text>
      </View>
    ),
    [],
  );

  const renderSectionHeader = useCallback(
    ({section}: {section: any}) => (
      <View style={s.sectionHeader}>
        <View style={s.letterHeaderRow}>
          <View style={s.letterBadge}>
            <Text style={s.letterBadgeText}>{section.letter}</Text>
          </View>
          <View style={s.letterDivider} />
        </View>
      </View>
    ),
    [],
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      {/* ── Hero (breadcrumb + title + search) — fixed ──────────────────── */}
      {/* Same fix as HelpSupportScreen's hero: LinearGradient no longer
          carries layout styles directly. On iOS it can compute its box
          before children finish reporting their intrinsic size, cropping
          the bottom of the hero (Android doesn't have this issue). It's
          now a background layer positioned behind a plain View that owns
          the padding/sizing, with an explicit measured height (via
          onLayout below) rather than `bottom: 0` auto-stretch — that
          resolves to zero height on this library/iOS combo and the
          gradient never paints.
          See: https://github.com/react-native-community/react-native-linear-gradient/issues/195 */}
      <View style={s.hero} onLayout={e => setHeroHeight(e.nativeEvent.layout.height)}>
        <LinearGradient
          colors={['#004C96', '#001830']}
          start={{x: 1, y: 0}}
          end={{x: 0, y: 1}}
          style={[s.heroGradient, heroHeight ? {height: heroHeight} : null]}
        />
        <View style={s.heroContent}>
          <View style={s.breadcrumbRow}>
            <TouchableOpacity onPress={handleGoBack} activeOpacity={0.7}>
              <Text style={s.breadcrumbHome}>{'Support Hub'}</Text>
            </TouchableOpacity>
            <Text style={s.breadcrumbHome}>{' / '}</Text>
            <Text style={s.breadcrumbCurrent}>{'Glossary'}</Text>
          </View>
          <Text style={[s.heroTitle, s.heroSpacing]}>{"IPM's Glossary"}</Text>
          <Text style={[s.heroSubtitle, s.heroSpacing]}>
            {"Definitions of the core project management terms and concepts you'll encounter throughout your study journey."}
          </Text>
          <View style={[s.searchOuter, s.heroSpacing]}>
            <View style={s.searchInputRow}>
              <SearchIcon />
              <TextInput
                style={s.searchInput}
                placeholder="Search glossary..."
                placeholderTextColor="#979797"
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
              />
            </View>
            {/* Results already filter as the user types; Search just closes the keyboard. */}
            <TouchableOpacity style={s.searchBtn} activeOpacity={0.85} onPress={Keyboard.dismiss}>
              <Text style={s.searchBtnText}>{'Search'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={s.centerFill}>
          <ActivityIndicator size="large" color="#0C4D91" />
        </View>
      ) : (
        <View style={s.flexFill}>
          <SectionList
            ref={listRef}
            sections={grouped}
            keyExtractor={item => String(item.id)}
            renderItem={renderTerm}
            renderSectionHeader={renderSectionHeader}
            ItemSeparatorComponent={ItemSep}
            stickySectionHeadersEnabled={false}
            onScrollToIndexFailed={handleScrollToIndexFailed}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={9}
            style={s.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.listContent}
            ListHeaderComponent={
              <View style={s.listHeader}>
                {/* ── A–Z jump grid ─────────────────────────────────────── */}
              <View style={s.letterGrid}>
                {ALPHABET.map(letter => {
                  const active = activeLetters.has(letter);
                  return (
                    <TouchableOpacity
                      key={letter}
                      style={[s.letterChip, active ? s.letterChipActive : s.letterChipInactive]}
                      onPress={() => active && handleLetterPress(letter)}
                      activeOpacity={active ? 0.7 : 1}
                      disabled={!active}>
                      <Text style={[s.letterChipText, active ? s.letterChipTextActive : s.letterChipTextInactive]}>
                        {letter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

                <Text style={s.termsCount}>
                  {`${filteredTerms.length} of ${terms.length} Terms`}
                </Text>
              </View>
            }
            ListEmptyComponent={<Text style={s.emptyText}>{'No glossary terms found.'}</Text>}
          />

          {/* ── Back-to-top floating button ──────────────────────────── */}
          <TouchableOpacity style={s.scrollTopBtn} onPress={handleScrollToTop} activeOpacity={0.85}>
            <ScrollTopIcon />
          </TouchableOpacity>
        </View>
      )}

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#FFFFFF'},
  flexFill: {flex: 1},
  scroll: {flex: 1},
  scrollContent: {flexGrow: 1, paddingBottom: 40},
  listContent: {paddingHorizontal: 16, paddingBottom: 40},
  listHeader: {paddingTop: 24, gap: 24},
  sectionHeader: {paddingTop: 24, paddingBottom: 12, backgroundColor: '#FFFFFF'},
  centerFill: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyText: {color: '#8F9098', fontFamily: 'Runda', fontSize: 13, textAlign: 'center', paddingVertical: 12},

  // ── Hero ──
  // Now a plain View (was LinearGradient directly) — see the comment above
  // the JSX for why. It owns the padding/sizing; the gradient behind it is
  // absolutely positioned and purely decorative.
  hero: {
    paddingHorizontal: 16,
    paddingTop: 29,
    paddingBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // No `bottom: 0` — height is set explicitly at render time from the
  // measured `heroHeight` instead of relying on auto-stretch.
  heroGradient: {position: 'absolute', top: 0, left: 0, right: 0},
  heroContent: {
    width: '100%',
    maxWidth: 358,
    alignItems: 'flex-start',
    // `gap` removed — see HelpSupportScreen for why; spacing is explicit
    // via `heroSpacing` (marginTop) on every child after the first instead.
  },
  heroSpacing: {marginTop: 12},
  breadcrumbRow: {flexDirection: 'row', alignItems: 'center'},
  breadcrumbHome: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 10, fontWeight: '400', lineHeight: 14},
  breadcrumbCurrent: {color: '#46B1E4', fontFamily: 'Runda', fontSize: 10, fontWeight: '500', lineHeight: 14},
  heroTitle: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 18, fontWeight: '700', letterSpacing: 0.09},
  heroSubtitle: {color: 'rgba(255,255,255,0.88)', fontFamily: 'Runda', fontSize: 12, fontWeight: '400', lineHeight: 16},

  searchOuter: {width: '100%', flexDirection: 'row', borderRadius: 8, overflow: 'hidden'},
  searchInputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    height: 16,
    lineHeight: 16,
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 12,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  searchBtn: {width: 92.895, alignItems: 'center', justifyContent: 'center', backgroundColor: '#46B1E4'},
  searchBtnText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 14, fontWeight: '700'},

  body: {paddingHorizontal: 16, paddingTop: 24, gap: 24, alignItems: 'center'},

  // ── A–Z grid ──
  letterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    alignContent: 'flex-start',
    gap: 6,
    alignSelf: 'stretch',
  },
  letterChip: {width: 22, height: 22, justifyContent: 'center', alignItems: 'center', borderRadius: 5},
  letterChipActive: {borderWidth: 1, borderColor: '#0C4D91', backgroundColor: '#FFFFFF'},
  letterChipInactive: {borderWidth: 1, borderColor: '#E8E9F1', backgroundColor: '#FFFFFF'},
  letterChipText: {fontFamily: 'Runda', fontSize: 10, fontWeight: '500', lineHeight: 14},
  letterChipTextActive: {color: '#192546'},
  letterChipTextInactive: {color: '#8F9098'},

  termsCount: {
    alignSelf: 'stretch',
    color: '#8F9098',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Letter groups ──
  letterGroup: {alignSelf: 'stretch', gap: 12},
  letterHeaderRow: {flexDirection: 'row', alignItems: 'center', gap: 11.5, alignSelf: 'stretch'},
  letterBadge: {
    width: 34.6,
    height: 34.6,
    borderRadius: 6.5,
    backgroundColor: '#0C4D91',
    justifyContent: 'center',
    alignItems: 'center',
  },
  letterBadgeText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 14, fontWeight: '500'},
  letterDivider: {flex: 1, height: 1, backgroundColor: '#8F9098'},

  termCard: {
    alignSelf: 'stretch',
    padding: 17,
    borderRadius: 6.5,
    backgroundColor: '#FFFFFF',
    gap: 9,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.25,
    shadowRadius: 7.9,
    elevation: 3,
  },
  termHeading: {color: '#192546', fontFamily: 'Runda', fontSize: 14, fontWeight: '700'},
  termDetail: {color: '#192546', fontFamily: 'Runda', fontSize: 12, fontWeight: '400', lineHeight: 16},

  // ── Back-to-top FAB ──
  scrollTopBtn: {position: 'absolute', right: 16, bottom: 24, width: 45, height: 45},
});

export default GlossaryScreen;
