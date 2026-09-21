/* eslint-disable prettier/prettier */
import React, {useMemo, useRef, useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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

const GlossaryScreen = ({navigation}: any) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [query, setQuery] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const letterOffsets = useRef<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await getGlossary();
      setTerms(data);
      setLoading(false);
    })();
  }, []);

  const filteredTerms = useMemo(() => {
    if (!query.trim()) return terms;
    return searchGlossary(query, terms);
  }, [query, terms]);

  const grouped = useMemo(() => {
    const map: Record<string, GlossaryTerm[]> = {};
    filteredTerms.forEach(t => {
      const letter = (t.letter || t.title.charAt(0) || '#').toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(t);
    });
    return Object.keys(map)
      .sort()
      .map(letter => ({letter, items: map[letter]}));
  }, [filteredTerms]);

  const activeLetters = useMemo(() => new Set(grouped.map(g => g.letter)), [grouped]);

  const handleGoBack = () => navigation.goBack();

  const handleLetterPress = (letter: string) => {
    const y = letterOffsets.current[letter];
    if (y === undefined) return;
    scrollRef.current?.scrollTo({y: Math.max(y - 12, 0), animated: true});
  };

  const handleScrollToTop = () => {
    scrollRef.current?.scrollTo({y: 0, animated: true});
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#004C96" />

      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      {/* ── Hero (breadcrumb + title + search) — fixed ──────────────────── */}
      <LinearGradient colors={['#004C96', '#001830']} start={{x: 1, y: 0}} end={{x: 0, y: 1}} style={s.hero}>
        <View style={s.heroContent}>
          <View style={s.breadcrumbRow}>
            <TouchableOpacity onPress={handleGoBack} activeOpacity={0.7}>
              <Text style={s.breadcrumbHome}>{'Support Hub'}</Text>
            </TouchableOpacity>
            <Text style={s.breadcrumbHome}>{' / '}</Text>
            <Text style={s.breadcrumbCurrent}>{'Glossary'}</Text>
          </View>
          <Text style={s.heroTitle}>{"IPM's Glossary"}</Text>
          <Text style={s.heroSubtitle}>
            {"Definitions of the core project management terms and concepts you'll encounter throughout your study journey."}
          </Text>
          <View style={s.searchOuter}>
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
            <TouchableOpacity style={s.searchBtn} activeOpacity={0.85}>
              <Text style={s.searchBtnText}>{'Search'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={s.centerFill}>
          <ActivityIndicator size="large" color="#0C4D91" />
        </View>
      ) : (
        <View style={s.flexFill}>
          <ScrollView
            ref={scrollRef}
            style={s.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}>
            <View style={s.body}>
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

              {/* ── Letter groups ─────────────────────────────────────── */}
              {grouped.map(group => (
                <View key={group.letter} style={s.letterGroup}>
                  <View
                    style={s.letterHeaderRow}
                    onLayout={e => {
                      letterOffsets.current[group.letter] = e.nativeEvent.layout.y;
                    }}>
                    <View style={s.letterBadge}>
                      <Text style={s.letterBadgeText}>{group.letter}</Text>
                    </View>
                    <View style={s.letterDivider} />
                  </View>

                  {group.items.map(term => (
                    <View key={term.id} style={s.termCard}>
                      <Text style={s.termHeading}>{term.title}</Text>
                      <Text style={s.termDetail}>{term.content_text}</Text>
                    </View>
                  ))}
                </View>
              ))}

              {!grouped.length && <Text style={s.emptyText}>{'No glossary terms found.'}</Text>}
            </View>
          </ScrollView>

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
  centerFill: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyText: {color: '#8F9098', fontFamily: 'Runda', fontSize: 13, textAlign: 'center', paddingVertical: 12},

  // ── Hero ──
  hero: {
    paddingHorizontal: 16,
    paddingTop: 29,
    paddingBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {width: '100%', maxWidth: 358, alignItems: 'flex-start', gap: 12},
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
