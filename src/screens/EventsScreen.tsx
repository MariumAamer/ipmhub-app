/* eslint-disable prettier/prettier */
import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  StatusBar, ActivityIndicator, Linking, Alert, TextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import WebinarFilterSheet from '../components/WebinarFilterSheet';
import WebinarSortSheet from '../components/WebinarSortSheet';
import {
  getEvents, getWebinarRecordings, getStoredUserFields,
  getRegisteredEventIds, markEventRegistered, registerForEvent,
  EventItem, WebinarRecordingItem, EventRegistrationPayload,
  WEBINAR_TAGS, WEBINAR_SORT_OPTIONS, WebinarSort,
} from '../api/eventsApi';

// ─── Search / Filter Icons ──────────────────────────────────────────────────
// Both given by Marium as <mask>-based SVGs (a path used as an alpha mask
// over a solid-color rect) — react-native-svg@15.3.0 doesn't render <mask>,
// so both are rebuilt as a single plain filled <Path> (mask silhouette +
// rect fill collapses to exactly that), per technical-learnings.md.
const SearchIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      fillRule="evenodd" clipRule="evenodd"
      d="M6.42765 0.333496C3.06482 0.333496 0.333984 3.03789 0.333984 6.37972C0.333984 9.72155 3.06482 12.4259 6.42765 12.4259C7.6814 12.4259 8.84764 12.0499 9.81693 11.4052L13.7923 15.3478C14.2213 15.7732 14.9156 15.7732 15.3445 15.3478C15.7749 14.9209 15.7749 14.2276 15.3445 13.8007L11.3945 9.88328C12.1038 8.89503 12.5213 7.68547 12.5213 6.37972C12.5213 3.03789 9.79049 0.333496 6.42765 0.333496ZM2.53182 6.37972C2.53182 4.24994 4.27344 2.51872 6.42765 2.51872C8.58187 2.51872 10.3235 4.24994 10.3235 6.37972C10.3235 8.5095 8.58187 10.2407 6.42765 10.2407C4.27344 10.2407 2.53182 8.5095 2.53182 6.37972Z"
      fill="#8F9098"
    />
  </Svg>
);

const FilterIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M1.33398 3C1.33398 2.73478 1.43432 2.48043 1.61293 2.29289C1.79154 2.10536 2.03378 2 2.28637 2H13.7149C13.9675 2 14.2098 2.10536 14.3884 2.29289C14.567 2.48043 14.6673 2.73478 14.6673 3C14.6673 3.26522 14.567 3.51957 14.3884 3.70711C14.2098 3.89464 13.9675 4 13.7149 4H2.28637C2.03378 4 1.79154 3.89464 1.61293 3.70711C1.43432 3.51957 1.33398 3.26522 1.33398 3ZM3.4326 8C3.4326 7.73478 3.53294 7.48043 3.71155 7.29289C3.89015 7.10536 4.1324 7 4.38498 7H11.6626C11.9152 7 12.1575 7.10536 12.3361 7.29289C12.5147 7.48043 12.615 7.73478 12.615 8C12.615 8.26522 12.5147 8.51957 12.3361 8.70711C12.1575 8.89464 11.9152 9 11.6626 9H4.38498C4.1324 9 3.89015 8.89464 3.71155 8.70711C3.53294 8.51957 3.4326 8.26522 3.4326 8ZM5.88041 13.1322C5.88041 12.867 5.98075 12.6127 6.15936 12.4251C6.33796 12.2376 6.58021 12.1322 6.83279 12.1322H9.21669C9.46927 12.1322 9.71152 12.2376 9.89012 12.4251C10.0687 12.6127 10.1691 12.867 10.1691 13.1322C10.1691 13.3974 10.0687 13.6518 9.89012 13.8393C9.71152 14.0269 9.46927 14.1322 9.21669 14.1322H6.83279C6.58021 14.1322 6.33796 14.0269 6.15936 13.8393C5.98075 13.6518 5.88041 13.3974 5.88041 13.1322Z"
      fill="#192546"
    />
  </Svg>
);

// Small "x" for a selected-filter chip — plain, no mask involved.
const ChipCloseIcon = () => (
  <Svg width={8} height={8} viewBox="0 0 10 10" fill="none">
    <Path d="M1 1L9 9M9 1L1 9" stroke="#192647" strokeWidth={1.2} strokeLinecap="round" />
  </Svg>
);

// ─── Calendar Icon ─────────────────────────────────────────────────────────────
const CalendarIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd"
      d="M11.2877 2.74003H10.2977V1.75H9.63802V2.74003H4.3608V1.75H3.70115V2.74003H2.71223C1.80301 2.74003 1.0625 3.47994 1.0625 4.38976V11.9763C1.0625 12.8855 1.80241 13.626 2.71223 13.626H11.2878C12.197 13.626 12.9375 12.8861 12.9375 11.9763L12.9369 6.03836V4.38864C12.9364 3.47942 12.1965 2.74003 11.2878 2.74003H11.2877ZM12.2769 11.9754C12.2769 12.5207 11.8332 12.9643 11.2879 12.9643H2.71238C2.16597 12.9643 1.72235 12.5207 1.72235 11.9754V6.03846H12.2768L12.2769 11.9754ZM1.72235 5.37912H12.2768L12.2768 4.38908C12.2768 3.84321 11.8332 3.40015 11.2879 3.40015H10.2978V4.05981H9.63819V3.40015H4.36097V4.05871H3.70242V3.39906H2.71238C2.16596 3.39906 1.72235 3.84323 1.72235 4.38909V5.37912Z"
      fill="#46B0E3"/>
  </Svg>
);

// ─── Play Icon ─────────────────────────────────────────────────────────────────
const PlayIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M8.03125 12.824V7.17649C8.03137 7.10583 8.05049 7.0365 8.08661 6.97577C8.12273 6.91504 8.17452 6.86514 8.23655 6.8313C8.29858 6.79747 8.36857 6.78094 8.43919 6.78345C8.5098 6.78596 8.57844 6.80742 8.63792 6.84558L13.0311 9.66855C13.0868 9.70419 13.1325 9.75325 13.1642 9.81121C13.1959 9.86917 13.2125 9.93418 13.2125 10.0002C13.2125 10.0663 13.1959 10.1313 13.1642 10.1893C13.1325 10.2472 13.0868 10.2963 13.0311 10.3319L8.63792 13.1557C8.57844 13.1939 8.5098 13.2153 8.43919 13.2178C8.36857 13.2203 8.29858 13.2038 8.23655 13.17C8.17452 13.1361 8.12273 13.0862 8.08661 13.0255C8.05049 12.9648 8.03137 12.8955 8.03125 12.8248V12.824Z" fill="#192546"/>
    <Path d="M1.33398 10.0002C1.33398 5.2138 5.21429 1.3335 10.0007 1.3335C14.787 1.3335 18.6673 5.2138 18.6673 10.0002C18.6673 14.7865 14.787 18.6668 10.0007 18.6668C5.21429 18.6668 1.33398 14.7865 1.33398 10.0002ZM10.0007 2.51531C8.01555 2.51531 6.11175 3.30389 4.70806 4.70758C3.30438 6.11126 2.5158 8.01506 2.5158 10.0002C2.5158 11.9853 3.30438 13.8891 4.70806 15.2928C6.11175 16.6964 8.01555 17.485 10.0007 17.485C11.9858 17.485 13.8896 16.6964 15.2932 15.2928C16.6969 13.8891 17.4855 11.9853 17.4855 10.0002C17.4855 8.01506 16.6969 6.11126 15.2932 4.70758C13.8896 3.30389 11.9858 2.51531 10.0007 2.51531Z" fill="#192546"/>
  </Svg>
);

// ─── Tabs ──────────────────────────────────────────────────────────────────────
type TabKey = 'myEvents' | 'webinars';
const RECORDINGS_PAGE_SIZE = 10;

const Tabs = ({active, onChange}: {active: TabKey; onChange: (t: TabKey) => void}) => (
  <View style={styles.tabsRow}>
    <TouchableOpacity onPress={() => onChange('myEvents')} style={styles.tabItem}>
      <Text style={[styles.tabText, active === 'myEvents' && styles.tabTextActive]}>{'My Events'}</Text>
      {active === 'myEvents' && <View style={styles.tabUnderline}/>}
    </TouchableOpacity>
    <TouchableOpacity onPress={() => onChange('webinars')} style={styles.tabItem}>
      <Text style={[styles.tabText, active === 'webinars' && styles.tabTextActive]}>{'Webinar Recordings'}</Text>
      {active === 'webinars' && <View style={styles.tabUnderline}/>}
    </TouchableOpacity>
  </View>
);

// ─── Event Card ────────────────────────────────────────────────────────────────
const EventCard = ({event, onCardPress, onRegisterPress, isRegistered, isRegistering, isNearestUpcoming}: {
  event: EventItem;
  onCardPress: (e: EventItem) => void;
  onRegisterPress: (e: EventItem) => void;
  isRegistered: boolean;
  isRegistering: boolean;
  isNearestUpcoming: boolean;
}) => (
  <TouchableOpacity style={cardStyles.card} onPress={() => onCardPress(event)} activeOpacity={0.92}>
    <View style={cardStyles.imageWrap}>
      {event.image
        ? <Image source={{uri: event.image}} style={cardStyles.image}/>
        : <View style={[cardStyles.image, cardStyles.imageFallback]}/>}
    </View>
    <View style={cardStyles.textWrap}>
      <View>
        {!!event.dateLabel && (
          <View style={cardStyles.dateRow}>
            <CalendarIcon/>
            <Text style={cardStyles.dateText}>{event.dateLabel}</Text>
          </View>
        )}
        <Text style={cardStyles.title} numberOfLines={3}>{event.title}</Text>
        <View style={cardStyles.underline}/>
        {!!event.speakerName  && <Text style={cardStyles.speakerName}  numberOfLines={1}>{event.speakerName}</Text>}
        {!!event.speakerTitle && <Text style={cardStyles.speakerTitle} numberOfLines={2}>{event.speakerTitle}</Text>}
      </View>

      {event.isPast ? (
        event.registrationUrl
          ? <TouchableOpacity style={cardStyles.registerBtn}
              onPress={() => Linking.openURL(event.registrationUrl!)} activeOpacity={0.85}>
              <Text style={cardStyles.registerBtnText}>{'Watch Recording'}</Text>
            </TouchableOpacity>
          : <View style={cardStyles.comingSoonBtn}>
              <Text style={cardStyles.comingSoonText}>{'Recording Coming Soon'}</Text>
            </View>
      ) : isRegistered ? (
        <View style={cardStyles.registeredBtn}>
          <Text style={cardStyles.registeredBtnText}>{'Registered'}</Text>
        </View>
      ) : event.registrationUrl && isNearestUpcoming ? (
        // Use View with onStartShouldSetResponder to avoid nested touchable conflict on Android
        <View
          style={cardStyles.registerBtn}
          onStartShouldSetResponder={() => true}
          onResponderGrant={() => !isRegistering && onRegisterPress(event)}>
          {isRegistering
            ? <ActivityIndicator color="#FFFFFF" size="small"/>
            : <Text style={cardStyles.registerBtnText}>{'Register Now'}</Text>}
        </View>
      ) : (
        <View style={cardStyles.comingSoonBtn}>
          <Text style={cardStyles.comingSoonText}>{'Coming Soon'}</Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);

// ─── Webinar Recording Card ────────────────────────────────────────────────────
const RecordingCard = ({recording, onPress}: {recording: WebinarRecordingItem; onPress: (r: WebinarRecordingItem) => void}) => (
  <TouchableOpacity style={recStyles.card} activeOpacity={0.85} onPress={() => onPress(recording)}>
    <View style={recStyles.thumbWrap}>
      {recording.image
        ? <Image source={{uri: recording.image}} style={recStyles.thumbTopAnchored} resizeMode="cover"/>
        : <View style={[recStyles.thumb, recStyles.thumbFallback]}/>}
    </View>

    <View style={recStyles.textFrame}>
      <Text style={recStyles.title} numberOfLines={2}>{recording.title}</Text>

      <View style={recStyles.stroke}/>

      <View style={recStyles.hostFrame}>
        {!!recording.speakerName  && <Text style={recStyles.hostName}  numberOfLines={1}>{recording.speakerName}</Text>}
        {!!recording.speakerTitle && <Text style={recStyles.hostTitle} numberOfLines={2}>{recording.speakerTitle}</Text>}
      </View>
    </View>

    <View style={recStyles.playWrap}><PlayIcon/></View>
  </TouchableOpacity>
);

// ─── Skeletons ─────────────────────────────────────────────────────────────────
const EventSkeleton = () => (
  <View style={[cardStyles.card, {opacity:0.55}]}>
    <View style={[cardStyles.imageWrap, {backgroundColor:'#E8E9F1', width:130}]}/>
    <View style={[cardStyles.textWrap, {gap:8}]}>
      <View style={{gap:8}}>
        <View style={{height:12, width:80, borderRadius:6, backgroundColor:'#E8E9F1'}}/>
        <View style={{height:14, width:'90%', borderRadius:6, backgroundColor:'#E8E9F1'}}/>
        <View style={{height:14, width:'70%', borderRadius:6, backgroundColor:'#E8E9F1'}}/>
      </View>
      <View style={{height:36, borderRadius:5, backgroundColor:'#E8E9F1'}}/>
    </View>
  </View>
);

const RecordingSkeleton = () => (
  <View style={[recStyles.card, {opacity:0.55}]}>
    <View style={[recStyles.thumbWrap, {backgroundColor:'#E8E9F1'}]}/>
    <View style={{flex:1, gap:8}}>
      <View style={{height:14, width:'80%', borderRadius:6, backgroundColor:'#E8E9F1'}}/>
      <View style={{height:14, width:'60%', borderRadius:6, backgroundColor:'#E8E9F1'}}/>
    </View>
  </View>
);

// ─── Shared small components ───────────────────────────────────────────────────
const SectionHeader = ({left, accent}: {left: string; accent: string}) => (
  <View style={styles.sectionTitleWrap}>
    <Text style={styles.sectionTitle}>{left}<Text style={styles.sectionTitleAccent}>{accent}</Text></Text>
  </View>
);
const EmptyState = ({title, subtitle}: {title: string; subtitle: string}) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySubtitle}>{subtitle}</Text>
  </View>
);
const LoadMoreBtn = ({loading: l, onPress}: {loading: boolean; onPress: () => void}) => (
  <TouchableOpacity style={styles.loadMoreBtn} onPress={onPress} disabled={l}>
    {l ? <ActivityIndicator color="#FFF"/> : <Text style={styles.loadMoreText}>{'Load More'}</Text>}
  </TouchableOpacity>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────
const EventsScreen = ({navigation}: any) => {
  const [activeTab, setActiveTab]           = useState<TabKey>('myEvents');
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [pastEvents, setPastEvents]         = useState<EventItem[]>([]);
  // Webinar Recordings: search/tags/sort now filter server-side (CONFIRMED
  // Sep 2026) — fetch matching results in one call per filter change, still
  // revealing them client-side in pages (per_page's real behavior on this
  // endpoint wasn't confirmed, so not relied on — see eventsApi comment).
  const [allRecordings, setAllRecordings]         = useState<WebinarRecordingItem[]>([]);
  const [recordingsTotal, setRecordingsTotal]     = useState(0);
  const [recordingsVisibleCount, setRecordingsVisibleCount] = useState(RECORDINGS_PAGE_SIZE);
  const recordings = useMemo(() => allRecordings.slice(0, recordingsVisibleCount), [allRecordings, recordingsVisibleCount]);
  const [webinarSearchInput, setWebinarSearchInput] = useState('');
  const [webinarSearch, setWebinarSearch]         = useState(''); // debounced value actually sent to the API
  const [webinarTags, setWebinarTags]             = useState<string[]>([]);
  const [webinarSort, setWebinarSort]             = useState<WebinarSort>('recent');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [sortSheetVisible, setSortSheetVisible]     = useState(false);
  const [loading, setLoading]               = useState(true);
  const [page, setPage]                     = useState(1);
  const [hasMore, setHasMore]               = useState(false);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [prefill, setPrefill]               = useState<Partial<EventRegistrationPayload>>({});
  const [registeredIds, setRegisteredIds]   = useState<Set<string>>(new Set());
  const [registeringId, setRegisteringId]   = useState<string | null>(null);

  useEffect(() => {
    getStoredUserFields().then(setPrefill).catch(() => {});
    getRegisteredEventIds().then(ids => setRegisteredIds(new Set(ids))).catch(() => {});
  }, []);

  // Only the chronologically nearest upcoming event should show "Register
  // Now" — every other upcoming event shows "Coming Soon" regardless of
  // whether the backend happens to send a cta_url for it too. Sorting
  // defensively by event_time here rather than trusting API array order,
  // since we've already seen the backend return the same cta_url on all
  // three upcoming events at once.
  const nearestUpcomingId = useMemo(() => {
    const withDates = upcomingEvents
      .map(e => ({id: e.id, time: e.rawEvent?.event_time ? new Date(e.rawEvent.event_time).getTime() : NaN}))
      .filter(e => !isNaN(e.time));
    if (withDates.length === 0) return upcomingEvents[0]?.id ?? null;
    withDates.sort((a, b) => a.time - b.time);
    return withDates[0].id;
  }, [upcomingEvents]);

  // Refresh registered IDs on focus (after returning from EventDetailScreen)
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      getRegisteredEventIds().then(ids => setRegisteredIds(new Set(ids))).catch(() => {});
    });
    return unsub;
  }, [navigation]);

  const loadEvents = useCallback(async (pageNum = 1, reset = false) => {
    reset ? setLoading(true) : setLoadingMore(true);
    const result = await getEvents(pageNum);
    if (reset) {setUpcomingEvents(result.events); setPastEvents(result.pastEvents);}
    else {setUpcomingEvents(p => [...p, ...result.events]); setPastEvents(p => [...p, ...result.pastEvents]);}
    setHasMore(result.hasMore);
    setPage(pageNum);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  const loadRecordings = useCallback(async () => {
    setLoading(true);
    const result = await getWebinarRecordings({search: webinarSearch, tags: webinarTags, sort: webinarSort});
    setAllRecordings(result.recordings);
    setRecordingsTotal(result.total);
    setRecordingsVisibleCount(RECORDINGS_PAGE_SIZE);
    setLoading(false);
  }, [webinarSearch, webinarTags, webinarSort]);

  useEffect(() => {
    if (activeTab === 'myEvents') {loadEvents(1, true);}
    else {loadRecordings();}
  }, [activeTab, loadEvents, loadRecordings]);

  // Debounce the search box → API call (400ms), separate from the raw
  // input state so every keystroke doesn't fire a request.
  useEffect(() => {
    const t = setTimeout(() => setWebinarSearch(webinarSearchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [webinarSearchInput]);

  const handleRemoveTag = (slug: string) => setWebinarTags(prev => prev.filter(t => t !== slug));

  // Tap card → EventDetailScreen (read-only)
  const handleCardPress = (event: EventItem) => {
    navigation.navigate('EventDetail', {
      event,
      rawEvent: event.rawEvent,
      isNearestUpcoming: event.id === nearestUpcomingId,
    });
  };

  // Tap a webinar recording card → the new WebinarDetail screen (full
  // detail page), NOT Linking.openURL anymore — recording.id is the WP
  // post id, same value used as event_id on /single-webinar.
  const handleRecordingPress = (recording: WebinarRecordingItem) => {
    navigation.navigate('WebinarDetail', {eventId: recording.id});
  };

  // Tap "Register Now" → actually register via the API, then go to ThankYou.
  // (Previously this only wrote to AsyncStorage and skipped the API call
  // entirely, which is why "Confirmation Sent" showed but no email went out.)
  const handleRegisterPress = async (event: EventItem) => {
    if (registeringId) return; // prevent double-tap while a request is in flight
    setRegisteringId(event.id);

    const result = await registerForEvent({
      first_name: prefill.first_name ?? '',
      last_name:  prefill.last_name ?? '',
      email:      prefill.email ?? '',
      company:    prefill.company ?? '',
      job_title:  prefill.job_title ?? '',
      event_id:   event.rawEvent?.zoho_event_id ?? event.id,
      region:     prefill.region ?? '',
    });

    setRegisteringId(null);

    if (!result.success) {
      Alert.alert('Registration Failed', result.message);
      return;
    }

    setRegisteredIds(prev => new Set([...prev, event.id]));
    await markEventRegistered(event.id);
    navigation.navigate('EventThankYou', {
      event,
      email: prefill.email ?? '',
      speakerDetail: {
        speaker:        event.speakerName,
        job_title:      event.speakerTitle,
        formatted_date: event.rawEvent?.event_date_formatted ?? event.dateLabel,
        formatted_time: '',
        image_url:      event.bannerImage ?? event.image ?? undefined,
      },
    });
  };

  const loadMore = () => {
    if (activeTab === 'myEvents') {
      if (loadingMore || !hasMore) return;
      loadEvents(page + 1);
    } else {
      setRecordingsVisibleCount(c => Math.min(c + RECORDINGS_PAGE_SIZE, allRecordings.length));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF"/>
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)}/>
      <Tabs active={activeTab} onChange={setActiveTab}/>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>

        {activeTab === 'myEvents' && (
          <>
            <SectionHeader left="Recommended " accent="Upcoming Events"/>
            <View style={styles.listWrap}>
              {loading ? (
                <><EventSkeleton/><EventSkeleton/></>
              ) : upcomingEvents.length === 0 ? (
                <EmptyState title="No upcoming events" subtitle="Check back soon for upcoming events."/>
              ) : upcomingEvents.map(e => (
                <EventCard
                  key={e.id} event={e}
                  onCardPress={handleCardPress}
                  onRegisterPress={handleRegisterPress}
                  isRegistered={registeredIds.has(e.id)}
                  isRegistering={registeringId === e.id}
                  isNearestUpcoming={e.id === nearestUpcomingId}
                />
              ))}
            </View>

            {!loading && pastEvents.length > 0 && (
              <>
                <SectionHeader left="Watch recordings of your " accent="Past Events"/>
                <View style={styles.listWrap}>
                  {pastEvents.map(e => (
                    <EventCard
                      key={e.id} event={e}
                      onCardPress={handleCardPress}
                      onRegisterPress={handleRegisterPress}
                      isRegistered={registeredIds.has(e.id)}
                      isRegistering={registeringId === e.id}
                      isNearestUpcoming={false}
                    />
                  ))}
                </View>
              </>
            )}

            {!loading && hasMore && (upcomingEvents.length + pastEvents.length) > 0 && (
              <View style={styles.listWrap}>
                <LoadMoreBtn loading={loadingMore} onPress={loadMore}/>
              </View>
            )}
          </>
        )}

        {activeTab === 'webinars' && (
          <>
            <View style={styles.webinarControlsWrap}>
              <View style={styles.searchFilterRow}>
                <View style={styles.searchBar}>
                  <SearchIcon/>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search"
                    placeholderTextColor="#8F9098"
                    value={webinarSearchInput}
                    onChangeText={setWebinarSearchInput}
                  />
                </View>
                <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterSheetVisible(true)} activeOpacity={0.8}>
                  <FilterIcon/>
                  {webinarTags.length > 0 && (
                    <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{webinarTags.length}</Text></View>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.sortRow} onPress={() => setSortSheetVisible(true)} activeOpacity={0.8}>
                <Text style={styles.sortRowText}>
                  {'Sort by : '}
                  {WEBINAR_SORT_OPTIONS.find(o => o.value === webinarSort)?.label ?? 'Most Recent'}
                </Text>
              </TouchableOpacity>

              {webinarTags.length > 0 && (
                <View style={styles.chipsRow}>
                  {webinarTags.map(slug => {
                    const tag = WEBINAR_TAGS.find(t => t.slug === slug);
                    if (!tag) return null;
                    return (
                      <TouchableOpacity key={slug} style={styles.chip} onPress={() => handleRemoveTag(slug)} activeOpacity={0.7}>
                        <Text style={styles.chipText}>{tag.name}</Text>
                        <ChipCloseIcon/>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {!loading && <Text style={styles.webinarCountText}>{`${recordingsTotal} Webinars`}</Text>}
            </View>

            <View style={styles.recListWrap}>
              {loading ? (
                <><RecordingSkeleton/><RecordingSkeleton/><RecordingSkeleton/></>
              ) : recordings.length === 0 ? (
                <EmptyState title="No recordings found" subtitle="Try a different search or filter."/>
              ) : recordings.map((r, i) => (
                <RecordingCard key={`${r.id}-${i}`} recording={r} onPress={handleRecordingPress}/>
              ))}
            </View>
            {!loading && recordingsVisibleCount < allRecordings.length && (
              <View style={styles.listWrap}>
                <LoadMoreBtn loading={false} onPress={loadMore}/>
              </View>
            )}
          </>
        )}

        <View style={{height:40}}/>
      </ScrollView>

      <WebinarFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        selectedTags={webinarTags}
        onApply={setWebinarTags}
      />
      <WebinarSortSheet
        visible={sortSheetVisible}
        onClose={() => setSortSheetVisible(false)}
        selected={webinarSort}
        onSelect={setWebinarSort}
      />

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation}/>
    </SafeAreaView>
  );
};

// ─── Card Styles ──────────────────────────────────────────────────────────────
const cardStyles = StyleSheet.create({
  card: {
    width:358, height:254, flexDirection:'row', paddingRight:15, alignItems:'flex-start', gap:15,
    borderRadius:7.706, backgroundColor:'#FFFFFF', marginBottom:16,
    shadowColor:'#000', shadowOffset:{width:0,height:0}, shadowOpacity:0.15, shadowRadius:10.023,
    elevation:4, overflow:'hidden',
  },
  imageWrap:     {alignSelf:'stretch'},
  image:         {width:130, height:'100%'},
  imageFallback: {backgroundColor:'#E8E9F1'},
  textWrap:      {flex:1, alignSelf:'stretch', paddingVertical:16, paddingRight:4, flexDirection:'column', justifyContent:'space-between'},
  dateRow:       {flexDirection:'row', alignItems:'center', gap:6, marginBottom:8},
  dateText:      {color:'#46B0E3', fontFamily:'Runda', fontSize:12, fontWeight:'400'},
  title:         {color:'#192546', fontFamily:'Runda', fontSize:18, fontWeight:'700', letterSpacing:0.09, lineHeight:23, marginBottom:8},
  underline:     {width:28, height:2, backgroundColor:'#46B0E3', borderRadius:1, marginBottom:8},
  speakerName:   {color:'#192546', fontFamily:'Runda', fontSize:14, fontWeight:'700', letterSpacing:0.07},
  speakerTitle:  {color:'#192546', fontFamily:'Runda', fontSize:12, fontWeight:'400', lineHeight:16, marginTop:2},
  registerBtn:      {backgroundColor:'#0C4D91', borderRadius:5, height:36, justifyContent:'center', alignItems:'center'},
  registerBtnText:  {color:'#FFFFFF', fontFamily:'Runda', fontSize:12, fontWeight:'700'},
  registeredBtn:    {backgroundColor:'#46B0E3', borderRadius:5, height:36, justifyContent:'center', alignItems:'center'},
  registeredBtnText:{color:'#FFFFFF', fontFamily:'Runda', fontSize:12, fontWeight:'700'},
  comingSoonBtn:    {borderWidth:1, borderColor:'#0C4D91', borderRadius:5, height:36, justifyContent:'center', alignItems:'center'},
  comingSoonText:   {color:'#0C4D91', fontFamily:'Runda', fontSize:12, fontWeight:'700'},
});

// ─── Recording Card Styles ────────────────────────────────────────────────────
const THUMB_W = 144.906;
// Bumped 75→92 so the fixed-height card has enough room for a 2-line title
// + divider + name + designation without cramming — this height now drives
// the whole row (see textFrame below), which is what keeps every card the
// same height and everything lined up card-to-card.
const THUMB_H = 92;
// Scale factor for the top-anchored crop below — taller than the box so
// only the bottom gets clipped by thumbWrap's overflow:hidden, never the
// top. ~1.4x keeps most headshots' full head+shoulders in frame without
// over-cropping the sides. Not photo-specific (unlike the exact px offsets
// in the original Figma export, which were computed for one image and
// wouldn't generalize to other speakers' photos).
const THUMB_SCALE = 1.4;

const recStyles = StyleSheet.create({
  // alignItems back to 'center': now that textFrame has the same FIXED
  // height as the thumbnail (not minHeight, not variable), centering the
  // row keeps the thumb, text block, and play icon on identical horizontal
  // bands on every card — that's what makes the list look symmetric/aligned
  // instead of each card's content sitting at a different height depending
  // on how many lines the title wrapped to.
  card:         {flexDirection:'row', alignItems:'center', padding:16, gap:16, borderRadius:5, backgroundColor:'#FFFFFF', marginBottom:12, shadowColor:'#000', shadowOffset:{width:0,height:0}, shadowOpacity:0.15, shadowRadius:9.418, elevation:3},
  // alignSelf:'center' added directly on the thumbnail (not just relying on
  // the row's alignItems) so the space above and below it stays equal and
  // it stays vertically centered even if the row's own alignment ever
  // changes for some other reason.
  thumbWrap:    {width:THUMB_W, height:THUMB_H, borderRadius:4, overflow:'hidden', flexShrink:0, position:'relative', alignSelf:'center'},
  thumb:        {width:THUMB_W, height:THUMB_H},
  // Positioned absolute + pinned to top:0, sized taller than the visible
  // box. Because the crop anchors at the top instead of centering, heads
  // stay fully visible — only extra height below the shoulders gets clipped.
  thumbTopAnchored: {position:'absolute', top:0, left:0, width:THUMB_W, height:THUMB_H * THUMB_SCALE},
  thumbFallback:{backgroundColor:'#E8E9F1'},
  // Fixed height again (not minHeight) — every card is now exactly THUMB_H
  // tall regardless of title length. Titles beyond 2 lines truncate with
  // an ellipsis instead of pushing the card taller, trading "always show
  // the full title" for "every card lines up the same way," per feedback.
  textFrame:    {flex:1, height:THUMB_H, flexDirection:'column', justifyContent:'flex-start', alignItems:'flex-start'},
  title:        {color:'#192546', fontFamily:'Runda', fontSize:15.5, fontWeight:'700', lineHeight:19},
  // Margins trimmed (6/10 → 4/6) to close the gap between the title and
  // the speaker name per earlier feedback.
  stroke:       {width:27, height:1, backgroundColor:'#46B0E3', marginTop:4, marginBottom:6},
  hostFrame:    {flexDirection:'column', alignItems:'flex-start', alignSelf:'stretch', gap:2},
  // Name kept at 13 / weight 500 (not bold) per feedback.
  hostName:     {color:'#192546', fontFamily:'Runda', fontSize:13, fontWeight:'500', lineHeight:16},
  // Designation moved one step smaller (11.5 → 10.5) per feedback, still
  // navy to stay legible, one size below the name so it reads as secondary.
  hostTitle:    {color:'#192546', fontFamily:'Runda', fontSize:10.5, fontWeight:'600', lineHeight:14},
  playWrap:     {flexShrink:0},
});

// ─── Screen Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:          {flex:1, backgroundColor:'#F2F4F7'},
  scroll:             {flex:1},
  tabsRow:            {flexDirection:'row', backgroundColor:'#FFFFFF', paddingHorizontal:24, gap:28, borderBottomWidth:1, borderBottomColor:'#F0F0F0'},
  tabItem:            {paddingVertical:14, alignItems:'center'},
  tabText:            {fontFamily:'Runda', fontSize:14, fontWeight:'500', color:'#8F9098'},
  tabTextActive:      {color:'#0C4D91', fontWeight:'700'},
  tabUnderline:       {marginTop:8, height:2, width:'100%', backgroundColor:'#0C4D91', borderRadius:1},
  sectionTitleWrap:   {paddingHorizontal:24, paddingTop:20, paddingBottom:16},
  sectionTitle:       {color:'#192546', fontFamily:'Runda', fontSize:18, fontWeight:'700', letterSpacing:0.09},
  sectionTitleAccent: {color:'#46B0E3'},
  listWrap:           {paddingHorizontal:16, alignItems:'center'},
  recListWrap:        {paddingHorizontal:16},

  // ── Webinar Recordings: search / filter / sort / chips ──
  webinarControlsWrap: {paddingHorizontal:16, paddingTop:24},
  searchFilterRow:    {flexDirection:'row', alignItems:'center', marginBottom:16},
  searchBar:          {
    flex:1, flexDirection:'row', alignItems:'center', height:36,
    paddingHorizontal:16, borderRadius:5, backgroundColor:'#FFFFFF',
    borderWidth:1, borderColor:'#E8E9F1', marginRight:8,
  },
  searchInput:        {flex:1, marginLeft:16, color:'#192546', fontFamily:'Runda-Normal', fontSize:14},
  filterBtn:          {
    width:36, height:36, borderRadius:5, borderWidth:1, borderColor:'#8F9098',
    alignItems:'center', justifyContent:'center', position:'relative',
  },
  filterBadge:        {
    position:'absolute', top:-6, right:-6, width:20, height:20, borderRadius:100,
    backgroundColor:'#46B1E4', alignItems:'center', justifyContent:'center',
  },
  filterBadgeText:    {color:'#FFFFFF', fontFamily:'Runda-Medium', fontSize:11},
  sortRow:            {
    paddingVertical:12, paddingHorizontal:16, borderRadius:5, backgroundColor:'#FFFFFF',
    shadowColor:'#000', shadowOffset:{width:0,height:0}, shadowOpacity:0.15, shadowRadius:10.023, elevation:3,
    alignItems:'center', marginBottom:16,
  },
  sortRowText:        {color:'#192546', fontFamily:'Runda-Medium', fontSize:14},
  chipsRow:           {flexDirection:'row', flexWrap:'wrap', marginBottom:8},
  chip:               {
    flexDirection:'row', alignItems:'center', height:27.773, paddingVertical:3.561, paddingHorizontal:10.682,
    borderRadius:3.561, borderWidth:0.855, borderColor:'#CECDCD', backgroundColor:'#FAFAFA',
    marginRight:8, marginBottom:8,
  },
  chipText:           {color:'#192647', fontFamily:'Runda-Medium', fontSize:12, marginRight:7.121},
  webinarCountText:   {color:'#192546', fontFamily:'Runda-Medium', fontSize:14, marginBottom:16},

  emptyState:         {alignItems:'center', paddingVertical:60},
  emptyTitle:         {fontSize:18, fontWeight:'700', color:'#192546', marginBottom:8, fontFamily:'Runda'},
  emptySubtitle:      {fontSize:14, color:'#8F9098', fontFamily:'Runda', textAlign:'center'},
  loadMoreBtn:        {width:358, backgroundColor:'#192647', borderRadius:30, paddingVertical:14, alignItems:'center', marginBottom:16},
  loadMoreText:       {color:'#FFFFFF', fontSize:15, fontWeight:'600', fontFamily:'Runda'},
});

export default EventsScreen;
