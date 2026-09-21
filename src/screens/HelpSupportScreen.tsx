/* eslint-disable prettier/prettier */
import React, {useState, useEffect} from 'react';
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
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {Path, Circle, Mask, G, Rect} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import BackButton from '../components/BackButton';
import {
  Faq,
  SupportCategory,
  getHubPage,
  getSupportCategories,
  getSupportHubTab,
  searchSupportHub,
  getFaqDetail,
  getRelatedFaqs,
  parseFaqHtml,
  FaqContentBlock,
} from '../api/supportHubApi';

// Fallbacks only — real values come from page.contact.call/email (confirmed
// via Postman 2026-09-15: page.contact.{call,email}.{display,href}), used
// only if that ever comes back empty.
const FALLBACK_CALL_HREF = 'tel:+35316614677';
const FALLBACK_EMAIL_HREF = 'mailto:info@instituteprojectmanagement.com';

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

// Masked funnel icon — mirrors the Figma export's alpha-mask + fill-rect
// approach exactly (mask shape below, solid navy rect clipped through it).
const FilterIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Mask id="filterMask" maskUnits="userSpaceOnUse" x={1} y={2} width={14} height={13}>
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.33398 3C1.33398 2.73478 1.43432 2.48043 1.61293 2.29289C1.79154 2.10536 2.03378 2 2.28637 2H13.7149C13.9675 2 14.2098 2.10536 14.3884 2.29289C14.567 2.48043 14.6673 2.73478 14.6673 3C14.6673 3.26522 14.567 3.51957 14.3884 3.70711C14.2098 3.89464 13.9675 4 13.7149 4H2.28637C2.03378 4 1.79154 3.89464 1.61293 3.70711C1.43432 3.51957 1.33398 3.26522 1.33398 3ZM3.4326 8C3.4326 7.73478 3.53294 7.48043 3.71155 7.29289C3.89015 7.10536 4.1324 7 4.38498 7H11.6626C11.9152 7 12.1575 7.10536 12.3361 7.29289C12.5147 7.48043 12.615 7.73478 12.615 8C12.615 8.26522 12.5147 8.51957 12.3361 8.70711C12.1575 8.89464 11.9152 9 11.6626 9H4.38498C4.1324 9 3.89015 8.89464 3.71155 8.70711C3.53294 8.51957 3.4326 8.26522 3.4326 8ZM5.88041 13.1322C5.88041 12.867 5.98075 12.6127 6.15936 12.4251C6.33796 12.2376 6.58021 12.1322 6.83279 12.1322H9.21669C9.46927 12.1322 9.71152 12.2376 9.89012 12.4251C10.0687 12.6127 10.1691 12.867 10.1691 13.1322C10.1691 13.3974 10.0687 13.6518 9.89012 13.8393C9.71152 14.0269 9.46927 14.1322 9.21669 14.1322H6.83279C6.58021 14.1322 6.33796 14.0269 6.15936 13.8393C5.98075 13.6518 5.88041 13.3974 5.88041 13.1322Z"
        fill="#fff"
      />
    </Mask>
    <G mask="url(#filterMask)">
      <Rect x={0} y={0} width={16} height={16} fill="#192546" />
    </G>
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

const BulletArrowIcon = () => (
  <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
    <Path
      d="M2.74829 0H10V7.33626C9.97447 7.36694 9.92841 7.3929 9.90009 7.42299C9.64631 7.69242 9.36878 7.93866 9.08885 8.17953C9.00785 8.24922 8.92873 8.33958 8.84677 8.40404C8.39803 8.75697 8.00596 9.17544 7.57081 9.54451C7.53936 9.57118 7.47157 9.59712 7.43222 9.6137L7.43483 6.06021L7.43395 5.38178C7.43264 5.19861 7.41466 4.78377 7.45666 4.63276C7.36968 4.72417 7.29422 4.82865 7.20479 4.91676C7.05122 5.06806 6.91373 5.23537 6.76513 5.39051L2.85612 9.40439C2.76928 9.49285 2.6868 9.57709 2.60624 9.67075C2.54934 9.73689 2.3506 9.98601 2.2826 10C2.14131 9.92762 1.72888 9.48077 1.59088 9.34684L0.800529 8.58287C0.681463 8.46822 0.00802145 7.86195 0 7.76512C0.0501734 7.71762 0.0672748 7.69014 0.107696 7.63695C0.14256 7.59108 0.192014 7.54295 0.231906 7.5002C1.0006 6.67648 1.86939 5.96362 2.63282 5.13526C2.68353 5.08024 2.75964 5.03058 2.81428 4.97799C3.22601 4.60624 3.59263 4.18542 3.99742 3.8059C4.11717 3.69363 4.25434 3.60358 4.3727 3.48925C4.51745 3.34968 4.65902 3.20597 4.79868 3.06114C4.9555 2.89476 5.11869 2.70793 5.31026 2.58217L1.76147 2.5787L0.750068 2.58007C0.671951 2.5801 0.34274 2.58381 0.27586 2.5727C0.253692 2.41277 2.29929 0.529362 2.54502 0.219996C2.59178 0.16113 2.70271 0.0716828 2.74829 0Z"
      fill="#46B0E3"
    />
  </Svg>
);

const GreenDotIcon = () => (
  <Svg width={5} height={5} viewBox="0 0 5 5" fill="none">
    <Circle cx={2.32238} cy={2.32238} r={2.32238} fill="#3BBB06" />
  </Svg>
);

const CallIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M6.49999 0.500799C6.49999 0.36819 6.55267 0.241013 6.64644 0.147245C6.74021 0.0534769 6.86739 0.000798484 6.99999 0.000798484C8.32563 0.00225428 9.59655 0.529506 10.5339 1.46687C11.4713 2.40424 11.9985 3.67516 12 5.0008C12 5.13341 11.9473 5.26058 11.8535 5.35435C11.7598 5.44812 11.6326 5.5008 11.5 5.5008C11.3674 5.5008 11.2402 5.44812 11.1464 5.35435C11.0527 5.26058 11 5.13341 11 5.0008C10.9988 3.9403 10.577 2.92357 9.8271 2.17369C9.07722 1.4238 8.06049 1.00199 6.99999 1.0008C6.86739 1.0008 6.74021 0.94812 6.64644 0.854352C6.55267 0.760584 6.49999 0.633407 6.49999 0.500799V0.500799ZM6.99999 3.0008C7.53043 3.0008 8.03913 3.21151 8.41421 3.58659C8.78928 3.96166 8.99999 4.47037 8.99999 5.0008C8.99999 5.13341 9.05267 5.26058 9.14644 5.35435C9.24021 5.44812 9.36739 5.5008 9.49999 5.5008C9.6326 5.5008 9.75978 5.44812 9.85355 5.35435C9.94732 5.26058 9.99999 5.13341 9.99999 5.0008C9.9992 4.20539 9.68287 3.44279 9.12044 2.88036C8.558 2.31792 7.7954 2.00159 6.99999 2.0008C6.86739 2.0008 6.74021 2.05348 6.64644 2.14725C6.55267 2.24101 6.49999 2.36819 6.49999 2.5008C6.49999 2.63341 6.55267 2.76058 6.64644 2.85435C6.74021 2.94812 6.86739 3.0008 6.99999 3.0008V3.0008ZM11.5465 8.3703C11.8362 8.66086 11.999 9.05446 11.999 9.4648C11.999 9.87514 11.8362 10.2687 11.5465 10.5593L11.0915 11.0838C6.99649 15.0043 -2.96851 5.0418 0.891493 0.933799L1.46649 0.433799C1.75738 0.152137 2.14746 -0.00367698 2.55235 6.59048e-05C2.95723 0.00380879 3.34437 0.166808 3.62999 0.453799C3.64549 0.469299 4.57199 1.6728 4.57199 1.6728C4.84691 1.96161 4.99995 2.34526 4.99929 2.744C4.99864 3.14274 4.84435 3.52589 4.56849 3.8138L3.98949 4.5418C4.30992 5.32036 4.78102 6.02792 5.37575 6.62385C5.97047 7.21977 6.67709 7.6923 7.45499 8.0143L8.18749 7.4318C8.47545 7.15616 8.85852 7.00205 9.25714 7.00149C9.65576 7.00093 10.0393 7.15396 10.328 7.4288C10.328 7.4288 11.531 8.3548 11.5465 8.3703ZM10.8585 9.0973C10.8585 9.0973 9.66199 8.1768 9.64649 8.1613C9.54349 8.05916 9.4043 8.00186 9.25924 8.00186C9.11419 8.00186 8.975 8.05916 8.87199 8.1613C8.85849 8.1753 7.84999 8.9788 7.84999 8.9788C7.78203 9.03289 7.70115 9.06835 7.61532 9.08168C7.52948 9.09501 7.44166 9.08574 7.36049 9.0548C6.35272 8.67958 5.43736 8.09217 4.67641 7.33234C3.91546 6.57251 3.32669 5.65802 2.94999 4.6508C2.91659 4.56853 2.9057 4.47884 2.91844 4.39097C2.93119 4.30309 2.9671 4.2202 3.02249 4.1508C3.02249 4.1508 3.82599 3.1418 3.83949 3.1288C3.94163 3.02579 3.99893 2.88661 3.99893 2.74155C3.99893 2.59649 3.94163 2.45731 3.83949 2.3543C3.82399 2.3393 2.90349 1.1418 2.90349 1.1418C2.79894 1.04805 2.66249 0.997846 2.52212 1.00147C2.38174 1.0051 2.24806 1.06228 2.14849 1.1613L1.57349 1.6613C-1.24751 5.0533 7.38799 13.2098 10.3605 10.4008L10.816 9.8758C10.9227 9.77693 10.9868 9.64043 10.9948 9.49515C11.0027 9.34987 10.9538 9.2072 10.8585 9.0973V9.0973Z"
      fill="#FFFFFF"
    />
  </Svg>
);

const EmailIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M9.5 0.5H2.5C1.8372 0.500794 1.20178 0.764441 0.73311 1.23311C0.264441 1.70178 0.000793929 2.3372 0 3L0 9C0.000793929 9.6628 0.264441 10.2982 0.73311 10.7669C1.20178 11.2356 1.8372 11.4992 2.5 11.5H9.5C10.1628 11.4992 10.7982 11.2356 11.2669 10.7669C11.7356 10.2982 11.9992 9.6628 12 9V3C11.9992 2.3372 11.7356 1.70178 11.2669 1.23311C10.7982 0.764441 10.1628 0.500794 9.5 0.5V0.5ZM2.5 1.5H9.5C9.79939 1.50059 10.0918 1.59076 10.3395 1.7589C10.5872 1.92705 10.7789 2.16547 10.89 2.4435L7.061 6.273C6.77921 6.55366 6.39771 6.71123 6 6.71123C5.60229 6.71123 5.22079 6.55366 4.939 6.273L1.11 2.4435C1.22107 2.16547 1.41281 1.92705 1.66052 1.7589C1.90824 1.59076 2.20061 1.50059 2.5 1.5V1.5ZM9.5 10.5H2.5C2.10218 10.5 1.72064 10.342 1.43934 10.0607C1.15804 9.77936 1 9.39782 1 9V3.75L4.232 6.98C4.70131 7.44813 5.33713 7.71102 6 7.71102C6.66287 7.71102 7.29869 7.44813 7.768 6.98L11 3.75V9C11 9.39782 10.842 9.77936 10.5607 10.0607C10.2794 10.342 9.89782 10.5 9.5 10.5Z"
      fill="#192546"
    />
  </Svg>
);

type ViewState = 'home' | 'detail' | 'search';

// ─── Screen ─────────────────────────────────────────────────────────────────

const HelpSupportScreen = ({navigation}: any) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [view, setView] = useState<ViewState>('home');
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  const [heroTitle, setHeroTitle] = useState('How can we help you?');
  const [heroSubtitle, setHeroSubtitle] = useState(
    'Search our help articles, or reach the student support team directly by phone or email.',
  );
  const [callHref, setCallHref] = useState(FALLBACK_CALL_HREF);
  const [emailHref, setEmailHref] = useState(FALLBACK_EMAIL_HREF);

  const [categories, setCategories] = useState<SupportCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<SupportCategory | null>(null);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [expandedFaqId, setExpandedFaqId] = useState<number | null>(null);

  const [faqFilterQuery, setFaqFilterQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [pendingFilterCategoryId, setPendingFilterCategoryId] = useState<number | null>(null);

  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Faq[]>([]);

  const [activeFaq, setActiveFaq] = useState<Faq | null>(null);
  const [activeFaqBlocks, setActiveFaqBlocks] = useState<FaqContentBlock[]>([]);
  const [relatedFaqs, setRelatedFaqs] = useState<Faq[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInitial = async () => {
    setLoading(true);
    setErrored(false);
    const page = await getHubPage();
    const cats = await getSupportCategories();
    if (page) {
      setHeroTitle(page.banner_title || page.title || 'How can we help you?');
      if (page.banner_subtitle) setHeroSubtitle(page.banner_subtitle);
      if (page.contact?.call?.href) setCallHref(page.contact.call.href);
      if (page.contact?.email?.href) setEmailHref(page.contact.email.href);
    }
    setCategories(cats);
    const defaultCategory = cats.find(c => c.is_default) || cats[0] || null;
    if (defaultCategory) {
      await selectCategory(defaultCategory);
    } else {
      setErrored(true);
    }
    setLoading(false);
  };

  const selectCategory = async (category: SupportCategory) => {
    setActiveCategory(category);
    setExpandedFaqId(null);
    setFaqFilterQuery('');
    const data = await getSupportHubTab(category.faqs_endpoint);
    setFaqs(data?.faqs ?? []);
  };

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearchLoading(true);
    setView('search');
    const result = await searchSupportHub(q);
    setSearchResults(result.faqs);
    setSearchLoading(false);
  };

  const openFaq = async (faq: Faq) => {
    setDetailLoading(true);
    setView('detail');
    const full = await getFaqDetail(faq);
    setActiveFaq(full);
    setActiveFaqBlocks(parseFaqHtml(full.content_html || ''));
    // Related = other FAQs from the same list currently loaded (search
    // results or the active category's list) sharing a category.
    const pool = view === 'search' ? searchResults : faqs;
    const related = getRelatedFaqs(
      full,
      pool.filter(f => f.categories?.some(c => full.categories?.some(fc => fc.slug === c.slug))),
    );
    setRelatedFaqs(related);
    setDetailLoading(false);
  };

  const goHome = () => {
    setView('home');
    setActiveFaq(null);
  };

  const handleLinkPress = (url?: string) => {
    if (url) Linking.openURL(url);
  };

  // Dial pad pre-filled with the support number — tel: opens the native
  // dialer on both iOS and Android without placing the call automatically.
  const handleCall = () => {
    Linking.openURL(callHref);
  };

  // Opens the device's default mail client with the To: field pre-filled.
  const handleEmail = () => {
    Linking.openURL(emailHref);
  };

  // Glossary screen isn't built yet — wire this up once it exists in the
  // navigator (route name TBD).
  const handleBrowseGlossary = () => {
    navigation.navigate('Glossary');
  };

  const openFilterModal = () => {
    setPendingFilterCategoryId(activeCategory?.id ?? categories[0]?.id ?? null);
    setFilterModalVisible(true);
  };

  const closeFilterModal = () => setFilterModalVisible(false);

  const applyFilter = async () => {
    const category = categories.find(c => c.id === pendingFilterCategoryId);
    setFilterModalVisible(false);
    if (category && category.id !== activeCategory?.id) {
      await selectCategory(category);
    }
  };

  const filteredFaqs = faqFilterQuery.trim()
    ? faqs.filter(f => f.title.toLowerCase().includes(faqFilterQuery.trim().toLowerCase()))
    : faqs;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* Fixed siblings above the ScrollView — neither the shared app header
          nor the back button should scroll away with the content. */}
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      {view !== 'home' && (
        <View style={s.topBar}>
          <BackButton onPress={goHome} />
        </View>
      )}

      {/* ── Hero (badge + title + search + glossary link) — fixed ──────── */}
      <LinearGradient
        colors={['#004C96', '#001830']}
        start={{x: 1, y: 0}}
        end={{x: 0, y: 1}}
        style={s.hero}>
        <View style={s.heroContent}>
          <View style={s.hubPill}>
            <GreenDotIcon />
            <Text style={s.hubPillText}>{'Support Hub'}</Text>
          </View>
          <Text style={s.heroTitle}>{heroTitle}</Text>
          <Text style={s.heroSubtitle}>{heroSubtitle}</Text>
          <View style={s.searchOuter}>
            <View style={s.searchInputRow}>
              <SearchIcon />
              <TextInput
                style={s.searchInput}
                placeholder="Keyword search..."
                placeholderTextColor="#979797"
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
          <TouchableOpacity onPress={handleBrowseGlossary} activeOpacity={0.7}>
            <Text style={s.glossaryLink}>{"Browse IPM's Glossary →"}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={s.centerFill}>
          <ActivityIndicator size="large" color="#0C4D91" />
        </View>
      ) : errored ? (
        <View style={s.centerFill}>
          <Text style={s.errorText}>{"Couldn't load Help & Support. Pull down to try again."}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadInitial} activeOpacity={0.85}>
            <Text style={s.viewAnswerText}>{'Retry'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
          {/* ── Home: call/email + FAQ list ──────────────────────────────── */}
          {view === 'home' && (
            <View style={s.body}>
              <View style={s.ctaRow}>
                <TouchableOpacity style={s.callBtn} onPress={handleCall} activeOpacity={0.85}>
                  <CallIcon />
                  <Text style={s.callBtnText}>{'Call Us'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.emailBtn} onPress={handleEmail} activeOpacity={0.85}>
                  <EmailIcon />
                  <Text style={s.emailBtnText}>{'Email Us'}</Text>
                </TouchableOpacity>
              </View>

              <View style={s.faqSection}>
                <Text style={s.faqHeading}>{'Frequently Asked Questions'}</Text>
                <Text style={s.faqSubheading}>
                  {'Get in depth information about the hub and answers to frequently asked questions.'}
                </Text>

                <View style={s.filterRow}>
                  <View style={s.filterSearchBox}>
                    <SearchIcon />
                    <TextInput
                      style={s.filterSearchInput}
                      placeholder="Filter questions..."
                      placeholderTextColor="#8F9098"
                      value={faqFilterQuery}
                      onChangeText={setFaqFilterQuery}
                    />
                  </View>
                  <TouchableOpacity style={s.filterIconBtn} onPress={openFilterModal} activeOpacity={0.7}>
                    <FilterIcon />
                  </TouchableOpacity>
                </View>

                {filteredFaqs.map(f => {
                  const expanded = expandedFaqId === f.id;
                  return (
                    <View key={f.id} style={s.faqCard}>
                      <TouchableOpacity
                        style={s.faqCardRow}
                        activeOpacity={0.7}
                        onPress={() => setExpandedFaqId(expanded ? null : f.id)}>
                        <Text style={s.faqQuestion}>{f.title}</Text>
                        <PlusIcon />
                      </TouchableOpacity>
                      {expanded && (
                        <TouchableOpacity style={s.viewAnswerBtn} onPress={() => openFaq(f)} activeOpacity={0.85}>
                          <Text style={s.viewAnswerText}>{'View Answer'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
                {!filteredFaqs.length && (
                  <Text style={s.emptyText}>
                    {faqs.length ? 'No matching questions.' : 'No FAQs in this category yet.'}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* ── Detail: answer + related FAQ ────────────────────────────── */}
          {view === 'detail' && (
            <View style={s.body}>
              {detailLoading || !activeFaq ? (
                <ActivityIndicator size="small" color="#0C4D91" />
              ) : (
                <>
                  <View style={s.answerCard}>
                    <Text style={s.answerHeading}>{activeFaq.title}</Text>
                    {activeFaqBlocks.map((block, i) =>
                      block.type === 'bullet' ? (
                        <View key={i} style={s.bulletRow}>
                          <BulletArrowIcon />
                          <Text style={s.answerText}>
                            {block.segments.map((seg, si) =>
                              seg.url ? (
                                <Text key={si} style={s.answerLink} onPress={() => handleLinkPress(seg.url)}>
                                  {seg.text}
                                </Text>
                              ) : (
                                <Text key={si}>{seg.text}</Text>
                              ),
                            )}
                          </Text>
                        </View>
                      ) : (
                        <Text key={i} style={s.answerText}>
                          {block.segments.map((seg, si) =>
                            seg.url ? (
                              <Text key={si} style={s.answerLink} onPress={() => handleLinkPress(seg.url)}>
                                {seg.text}
                              </Text>
                            ) : (
                              <Text key={si}>{seg.text}</Text>
                            ),
                          )}
                        </Text>
                      ),
                    )}
                  </View>

                  {!!relatedFaqs.length && (
                    <>
                      <Text style={s.relatedHeading}>{'Related FAQ'}</Text>
                      {relatedFaqs.map(rf => (
                        <View key={rf.id} style={s.relatedCard}>
                          <Text style={s.relatedQuestion}>{rf.title}</Text>
                          <TouchableOpacity style={s.viewAnswerBtn} onPress={() => openFaq(rf)} activeOpacity={0.85}>
                            <Text style={s.viewAnswerText}>{'View Answer'}</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </>
                  )}
                </>
              )}
            </View>
          )}

          {/* ── Search results ───────────────────────────────────────────── */}
          {view === 'search' && (
            <View style={s.body}>
              <Text style={s.sectionHeading}>{'Search Results:'}</Text>

              {searchLoading ? (
                <ActivityIndicator size="small" color="#0C4D91" />
              ) : searchResults.length ? (
                searchResults.map(f => (
                  <View key={f.id} style={s.relatedCard}>
                    <Text style={s.relatedQuestion}>{f.title}</Text>
                    <TouchableOpacity style={s.viewAnswerBtn} onPress={() => openFaq(f)} activeOpacity={0.85}>
                      <Text style={s.viewAnswerText}>{'View Answer'}</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={s.emptyText}>{'No results found.'}</Text>
              )}
            </View>
          )}
        </ScrollView>
      )}

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />

      {/* ── Filter modal (category picker) ───────────────────────────────── */}
      <Modal transparent visible={filterModalVisible} animationType="slide" onRequestClose={closeFilterModal}>
        <View style={s.modalBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeFilterModal} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{'Filter'}</Text>
              <TouchableOpacity style={s.modalClose} onPress={closeFilterModal} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Text style={s.modalCloseIcon}>{'\u00D7'}</Text>
              </TouchableOpacity>
            </View>

            {categories.map(category => {
              const isSelected = pendingFilterCategoryId === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[s.filterOption, isSelected && s.filterOptionSelected]}
                  onPress={() => setPendingFilterCategoryId(category.id)}
                  activeOpacity={0.7}>
                  <Text style={[s.filterOptionText, isSelected && s.filterOptionTextSelected]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={s.modalContinueBtn} onPress={applyFilter} activeOpacity={0.85}>
              <Text style={s.modalContinueText}>{'Continue'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#FFFFFF'},
  scroll: {flex: 1},
  scrollContent: {flexGrow: 1, paddingBottom: 40},
  centerFill: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16},
  errorText: {color: '#192546', fontFamily: 'Runda', fontSize: 14, textAlign: 'center'},
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 5,
    backgroundColor: '#46B0E3',
  },
  emptyText: {color: '#8F9098', fontFamily: 'Runda', fontSize: 13, textAlign: 'center', paddingVertical: 12},

  topBar: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, backgroundColor: '#FFFFFF'},

  // ── Hero ──
  hero: {
    paddingHorizontal: 16,
    paddingTop: 29,
    paddingBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    width: '100%',
    maxWidth: 358,
    alignItems: 'flex-start',
    gap: 12,
  },
  hubPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4.645,
    paddingHorizontal: 12.386,
    gap: 6.193,
    borderRadius: 15.483,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  hubPillText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 10, fontWeight: '500', lineHeight: 14},
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  glossaryLink: {color: '#46B1E4', fontFamily: 'Runda', fontSize: 12, fontWeight: '500'},

  searchOuter: {
    width: '100%',
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
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
  searchBtn: {
    width: 92.895,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#46B1E4',
  },
  searchBtnText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 14, fontWeight: '700'},

  body: {paddingHorizontal: 16, paddingTop: 24, gap: 24},

  // ── Call / Email ──
  ctaRow: {flexDirection: 'row', gap: 12, alignSelf: 'stretch'},
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 5,
    backgroundColor: '#192546',
  },
  callBtnText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 14, fontWeight: '600'},
  emailBtn: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#192546',
    backgroundColor: '#FFFFFF',
  },
  emailBtnText: {color: '#192546', fontFamily: 'Runda', fontSize: 14, fontWeight: '600'},

  // ── FAQ section ──
  faqSection: {gap: 12},
  faqHeading: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
  },
  faqSubheading: {
    color: '#979797',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    marginTop: -8,
  },
  sectionHeading: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
    marginBottom: 4,
  },

  filterRow: {flexDirection: 'row', gap: 12, alignSelf: 'stretch'},
  filterSearchBox: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#8F9098',
    overflow: 'hidden',
  },
  filterSearchInput: {
    flex: 1,
    height: 18,
    lineHeight: 18,
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 13,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  filterIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#8F9098',
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
  faqCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  faqQuestion: {
    flex: 1,
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '700',
  },

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
  answerHeading: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '700',
  },
  answerText: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    flex: 1,
  },
  answerLink: {color: '#0C4D91', textDecorationLine: 'underline'},
  bulletRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 8},

  relatedHeading: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
    marginTop: 4,
    marginBottom: -8,
  },
  relatedCard: {
    padding: 16,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 9.4,
    elevation: 2,
    marginTop: 12,
  },
  relatedQuestion: {
    alignSelf: 'stretch',
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '700',
  },
  // minHeight instead of a fixed height — height + paddingVertical together
  // fight each other and clip the label (same fix as ResourceDetailScreen's
  // courseBtnPrimary/tocBtn).
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

  // ── Filter modal ──
  modalBackdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D9D9D9',
    alignSelf: 'center',
    marginVertical: 8,
  },
  modalHeader: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 8,
  },
  modalTitle: {
    color: '#0C4D91',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  modalClose: {position: 'absolute', right: 0, top: 14},
  modalCloseIcon: {fontSize: 20, color: '#8F9098'},
  filterOption: {
    minHeight: 41,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 5,
    marginBottom: 4,
  },
  filterOptionSelected: {backgroundColor: '#E8E9F1'},
  filterOptionText: {color: '#192546', fontFamily: 'Runda', fontSize: 14, fontWeight: '700'},
  filterOptionTextSelected: {color: '#46B0E3'},
  modalContinueBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0C4D91',
  },
  modalContinueText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 15, fontWeight: '700'},
});

export default HelpSupportScreen;
