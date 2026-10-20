/* eslint-disable prettier/prettier */
import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import BackButton from '../components/BackButton';
import {getMentorshipFaqs, MentorshipFaq} from '../api/mentorshipFaqApi';
import {parseFaqHtml, FaqContentBlock, FaqTextSegment} from '../api/supportHubApi';

// Mentorship Help Center. Frame: 390x844, background #FFF.
// Hero: bg #0C4D91, padding 63.5 24 62.5 24, centered. FAQ list/cards/answer
// detail mirror HelpSupportScreen. Data: GET /custom/v1/mentors/page (both the
// Mentors and Mentees FAQ lists, merged into one list — the design has no tabs).
// Search is client-side (title + answer text); the endpoint has no search param.

const SearchIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.42765 0.333252C3.06482 0.333252 0.333984 3.03764 0.333984 6.37948C0.333984 9.72131 3.06482 12.4257 6.42765 12.4257C7.6814 12.4257 8.84764 12.0497 9.81693 11.4049L13.7923 15.3475C14.2213 15.7729 14.9156 15.7729 15.3445 15.3475C15.7749 14.9206 15.7749 14.2273 15.3445 13.8004L11.3945 9.88304C12.1038 8.89479 12.5213 7.68523 12.5213 6.37948C12.5213 3.03764 9.79049 0.333252 6.42765 0.333252ZM2.53182 6.37948C2.53182 4.2497 4.27344 2.51847 6.42765 2.51847C8.58187 2.51847 10.3235 4.2497 10.3235 6.37948C10.3235 8.50925 8.58187 10.2405 6.42765 10.2405C4.27344 10.2405 2.53182 8.50925 2.53182 6.37948Z"
      fill="#8F9098"
    />
  </Svg>
);

const PlusIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M3.42438e-08 4.73271H4.70544V0L7.31707 2.52881e-07V4.73271L12 4.73271V7.28972L7.31707 7.28972V12H4.70544V7.28972H0L3.42438e-08 4.73271Z"
      fill="#46B0E3"
    />
  </Svg>
);

const BulletDot = () => <View style={s.bulletDot} />;

type ViewState = 'home' | 'detail' | 'search';

const renderSegments = (segments: FaqTextSegment[]) =>
  segments.map((seg, si) =>
    seg.url ? (
      <Text key={si} style={s.answerLink} onPress={() => Linking.openURL(seg.url as string)}>
        {seg.text}
      </Text>
    ) : (
      <Text key={si}>{seg.text}</Text>
    ),
  );

const MentorshipSupportScreen = ({navigation}: any) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [view, setView] = useState<ViewState>('home');
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [faqs, setFaqs] = useState<MentorshipFaq[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MentorshipFaq[]>([]);

  const [activeFaq, setActiveFaq] = useState<MentorshipFaq | null>(null);
  const [activeBlocks, setActiveBlocks] = useState<FaqContentBlock[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setErrored(false);
    const list = await getMentorshipFaqs(true);
    if (list) {
      setFaqs(list);
    } else {
      setErrored(true);
    }
    setLoading(false);
  };

  const handleSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setView('home');
      return;
    }
    setSearchResults(faqs.filter(f => f.title.toLowerCase().includes(q) || f.text.toLowerCase().includes(q)));
    setView('search');
  };

  const openFaq = (faq: MentorshipFaq) => {
    setActiveFaq(faq);
    setActiveBlocks(parseFaqHtml(faq.html));
    setView('detail');
  };

  const goHome = () => {
    setView('home');
    setActiveFaq(null);
  };

  const handleBack = () => {
    if (view === 'home') navigation.goBack();
    else goHome();
  };

  const related = useMemo(
    () => (activeFaq ? faqs.filter(f => f.group === activeFaq.group && f.id !== activeFaq.id).slice(0, 3) : []),
    [activeFaq, faqs],
  );

  const renderFaqCard = (f: MentorshipFaq, withToggle: boolean) => {
    const expanded = withToggle && expandedId === f.id;
    return (
      <View key={f.id} style={s.faqCard}>
        <TouchableOpacity
          style={s.faqCardRow}
          activeOpacity={0.7}
          onPress={() => (withToggle ? setExpandedId(expanded ? null : f.id) : openFaq(f))}>
          <Text style={s.faqQuestion}>{f.title}</Text>
          {withToggle && <PlusIcon />}
        </TouchableOpacity>
        {(expanded || !withToggle) && (
          <TouchableOpacity style={s.viewAnswerBtn} onPress={() => openFaq(f)} activeOpacity={0.85}>
            <Text style={s.viewAnswerText}>{'View Answer'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      {/* Figma: padding 10px 16px, align-items center, gap 10, bg #FFF */}
      <View style={s.topBar}>
        <BackButton onPress={handleBack} />
      </View>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.scrollContent}>
        {/* ── Hero ── */}
        <View style={s.hero}>
          <View style={s.heroInner}>
            <Text style={s.heroTitle}>{'Mentorship Help Center'}</Text>
            <View style={s.searchOuter}>
              <View style={s.searchInputRow}>
                <SearchIcon />
                <TextInput
                  style={s.searchInput}
                  placeholder="Keyword search..."
                  placeholderTextColor="#8F9098"
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                />
              </View>
              <TouchableOpacity style={s.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
                <Text style={s.searchBtnText}>{'Search'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={s.centerFill}>
            <ActivityIndicator size="large" color="#0C4D91" />
          </View>
        ) : errored ? (
          <View style={s.centerFill}>
            <Text style={s.errorText}>{"Couldn't load the Mentorship FAQs."}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={load} activeOpacity={0.85}>
              <Text style={s.viewAnswerText}>{'Retry'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.body}>
            {/* ── Home: FAQ list ── */}
            {view === 'home' && (
              <View style={s.faqSection}>
                <Text style={s.faqHeading}>{'Frequently Asked Questions'}</Text>
                <Text style={s.faqSubheading}>
                  {'Find answers about mentoring, applications, sessions and matching.'}
                </Text>
                {faqs.map(f => renderFaqCard(f, true))}
              </View>
            )}

            {/* ── Detail: answer + related ── */}
            {view === 'detail' && activeFaq && (
              <>
                <View style={s.answerCard}>
                  <Text style={s.answerHeading}>{activeFaq.title}</Text>
                  {activeBlocks.map((block, i) =>
                    block.type === 'bullet' ? (
                      <View key={i} style={s.bulletRow}>
                        <BulletDot />
                        <Text style={s.answerText}>{renderSegments(block.segments)}</Text>
                      </View>
                    ) : (
                      <Text key={i} style={s.answerText}>
                        {renderSegments(block.segments)}
                      </Text>
                    ),
                  )}
                </View>
                {!!related.length && (
                  <>
                    <Text style={s.relatedHeading}>{'Related FAQ'}</Text>
                    {related.map(rf => renderFaqCard(rf, false))}
                  </>
                )}
              </>
            )}

            {/* ── Search results ── */}
            {view === 'search' && (
              <>
                <Text style={s.faqHeading}>{'Search Results:'}</Text>
                {searchResults.length ? (
                  searchResults.map(f => renderFaqCard(f, false))
                ) : (
                  <Text style={s.emptyText}>{'No results found.'}</Text>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </View>
  );
};

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#FFFFFF'},
  scroll: {flex: 1},
  scrollContent: {flexGrow: 1, paddingBottom: 40},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  centerFill: {alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48, gap: 16},
  errorText: {color: '#192546', fontFamily: 'Runda', fontSize: 14, textAlign: 'center'},
  retryBtn: {paddingVertical: 12, paddingHorizontal: 24, borderRadius: 5, backgroundColor: '#46B0E3'},
  emptyText: {color: '#8F9098', fontFamily: 'Runda', fontSize: 13, textAlign: 'center', paddingVertical: 12},

  // ── Hero (Figma: padding 63.5 24 62.5 24, bg --IPM-Color-Palette-Dark-Blue #0C4D91) ──
  hero: {
    alignSelf: 'stretch',
    paddingTop: 63.5,
    paddingBottom: 62.5,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0C4D91',
  },
  heroInner: {width: '100%', alignItems: 'center', gap: 24},
  heroTitle: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.24,
  },
  searchOuter: {
    width: '100%',
    flexDirection: 'row',
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  searchInputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 32,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    height: 20,
    lineHeight: 20,
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '400',
    padding: 0,
    margin: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  searchBtn: {
    paddingLeft: 21,
    paddingRight: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F6FBF',
  },
  // Spec lists #8F9098 for this label but the Figma render shows white on blue.
  searchBtnText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 16, fontWeight: '400', lineHeight: 20},

  body: {paddingHorizontal: 16, paddingTop: 24, gap: 12},

  // ── FAQ section (same as HelpSupportScreen) ──
  faqSection: {gap: 12},
  faqHeading: {color: '#192546', fontFamily: 'Runda', fontSize: 18, fontWeight: '700', letterSpacing: 0.09},
  faqSubheading: {
    color: '#979797',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    marginTop: -8,
  },
  faqCard: {
    padding: 16,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 9.4,
    elevation: 2,
  },
  faqCardRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10},
  faqQuestion: {flex: 1, color: '#192546', fontFamily: 'Runda', fontSize: 12, fontWeight: '700'},
  viewAnswerBtn: {
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 5,
    backgroundColor: '#46B0E3',
  },
  viewAnswerText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 13, fontWeight: '700'},

  // ── Answer detail ──
  answerCard: {
    padding: 16,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 9.4,
    elevation: 2,
  },
  answerHeading: {color: '#192546', fontFamily: 'Runda', fontSize: 12, fontWeight: '700'},
  answerText: {color: '#192546', fontFamily: 'Runda', fontSize: 12, fontWeight: '400', lineHeight: 16, flex: 1},
  answerLink: {color: '#0C4D91', textDecorationLine: 'underline'},
  bulletRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 8},
  bulletDot: {width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#46B0E3', marginTop: 5.5},
  relatedHeading: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
    marginTop: 12,
  },
});

export default MentorshipSupportScreen;
