/* eslint-disable prettier/prettier */
// src/screens/WebinarDetailScreen.tsx
//
// Full webinar detail screen. Every section's CSS was confirmed against
// Figma by Marium across several messages (Sep 2026) before this was
// written — see eventsApi.ts's WebinarDetail type/mapWebinarDetail for the
// confirmed API field mapping this screen consumes.
//
// Bottom nav bar (Feed/Forums/Intros/Resources/Mentors): Marium confirmed
// this is the app's EXISTING global BottomNavigationBar, not something to
// build here — it renders automatically once this screen is registered in
// the same tab/stack navigator as the rest of the app. Nothing rendered
// for it in this file.
//
// A few things built without an exact pixel spec (flagged inline below):
//   - Save button has no visual "saved" state given — toggles icon/text
//     color as a reasonable default (see SAVE_ACTIVE_COLOR).
//   - Watch on YouTube opens webinar.videoWatchUrl directly via Linking,
//     rather than ResourceDetailScreen's youtube://-deep-link-then-
//     fallback pattern — that pattern regexes a watch?v= id out of the
//     URL, but these webinar URLs come in more than one shape (youtube.com
//     /live/{id}, watch?v={id}), so a plain Linking.openURL is simpler and
//     still lets the OS offer the YouTube app via its own universal link
//     handling on most devices.
//   - "View all related courses" / "View all recordings" open their
//     confirmed URLs externally (Linking) rather than an in-app route —
//     no confirmed in-app destination for either.

import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  StatusBar, ActivityIndicator, Linking,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';
import Svg, {Path} from 'react-native-svg';
import BackButton from '../components/BackButton';
import CourseCard from '../components/CourseCard';
import ShareSheet from '../components/ShareSheet';
import {
  getSingleWebinar, getSpeakerLinkedIn, toggleSavedWebinar, getSavedWebinarIds,
  WebinarDetail, RelatedWebinarItem, SidebarCardData,
} from '../api/eventsApi';

// ─── Byline icons (13x13, clipPath — NOT mask, renders fine as-is) ──────────
const CalendarIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 13 13" fill="none">
    <Path d="M4.33333 1.08301V3.24985M8.66667 1.08301V3.24985M1.625 5.41669H11.375M2.70833 2.16643H10.2917C10.89 2.16643 11.375 2.65149 11.375 3.24985V10.8338C11.375 11.4321 10.89 11.9172 10.2917 11.9172H2.70833C2.11002 11.9172 1.625 11.4321 1.625 10.8338V3.24985C1.625 2.65149 2.11002 2.16643 2.70833 2.16643Z" stroke="#979797" strokeWidth={1.21875} strokeLinecap="round"/>
  </Svg>
);
const ClockIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 13 13" fill="none">
    <Path d="M6.49913 3.24985V6.50011L8.66597 7.58353M11.9162 6.50011C11.9162 9.49189 9.49091 11.9172 6.49913 11.9172C3.50735 11.9172 1.08203 9.49189 1.08203 6.50011C1.08203 3.50833 3.50735 1.08301 6.49913 1.08301C9.49091 1.08301 11.9162 3.50833 11.9162 6.50011Z" stroke="#979797" strokeWidth={1.21875} strokeLinecap="round"/>
  </Svg>
);
const TagIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 13 13" fill="none">
    <Path d="M6.05061 1.08301C6.33793 1.08307 6.61346 1.19726 6.81659 1.40045L11.5317 6.11551C11.7763 6.36173 11.9136 6.69473 11.9136 7.04184C11.9136 7.38894 11.7763 7.72195 11.5317 7.96816L7.96719 11.5326C7.72097 11.7773 7.38796 11.9146 7.04086 11.9146C6.69376 11.9146 6.36075 11.7773 6.11453 11.5326L1.39947 6.81757C1.19628 6.61444 1.08209 6.33891 1.08203 6.05159V2.16643C1.08203 1.87909 1.19618 1.60352 1.39936 1.40034C1.60254 1.19715 1.87811 1.08301 2.16545 1.08301H6.05061Z" stroke="#979797" strokeWidth={1.21875} strokeLinecap="round"/>
  </Svg>
);

// ─── Watch / Share / Save row icons (13x13) ─────────────────────────────────
const YouTubeIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 13 13" fill="none">
    <Path d="M11.375 4.875V1.625H8.125M11.375 1.625L5.41667 7.58333M9.75 7.04167V10.2917C9.75 10.579 9.63586 10.8545 9.4327 11.0577C9.22953 11.2609 8.95398 11.375 8.66667 11.375H2.70833C2.42102 11.375 2.14547 11.2609 1.9423 11.0577C1.73914 10.8545 1.625 10.579 1.625 10.2917V4.33333C1.625 4.04602 1.73914 3.77047 1.9423 3.5673C2.14547 3.36414 2.42102 3.25 2.70833 3.25H5.95833" stroke="#0C4D91" strokeWidth={1.08333} strokeLinecap="round"/>
  </Svg>
);
const ShareIcon = ({color = '#192647'}: {color?: string}) => (
  <Svg width={13} height={13} viewBox="0 0 13 13" fill="none">
    <Path d="M4.65283 7.31796L8.35242 9.47397M8.347 3.52599L4.65283 5.682M11.375 2.70814C11.375 3.60567 10.6475 4.33327 9.75 4.33327C8.85254 4.33327 8.125 3.60567 8.125 2.70814C8.125 1.8106 8.85254 1.08301 9.75 1.08301C10.6475 1.08301 11.375 1.8106 11.375 2.70814ZM4.875 6.50011C4.875 7.39764 4.14746 8.12524 3.25 8.12524C2.35254 8.12524 1.625 7.39764 1.625 6.50011C1.625 5.60257 2.35254 4.87498 3.25 4.87498C4.14746 4.87498 4.875 5.60257 4.875 6.50011ZM11.375 10.2921C11.375 11.1896 10.6475 11.9172 9.75 11.9172C8.85254 11.9172 8.125 11.1896 8.125 10.2921C8.125 9.39454 8.85254 8.66695 9.75 8.66695C10.6475 8.66695 11.375 9.39454 11.375 10.2921Z" stroke={color} strokeWidth={1.21875} strokeLinecap="round"/>
  </Svg>
);
const SaveIcon = ({color = '#192647'}: {color?: string}) => (
  <Svg width={13} height={13} viewBox="0 0 13 13" fill="none">
    <Path d="M9.97389 1.94231C9.77071 1.73914 9.49512 1.625 9.20777 1.625H3.79049C3.50314 1.625 3.22756 1.73914 3.02437 1.94231C2.82118 2.14547 2.70703 2.42103 2.70703 2.70835V10.8335C2.70706 10.9284 2.732 11.0215 2.77936 11.1037C2.82672 11.1859 2.89483 11.2542 2.97689 11.3018C3.05894 11.3495 3.15206 11.3747 3.24693 11.375C3.3418 11.3753 3.43508 11.3507 3.51746 11.3037L5.96174 9.90723C6.12541 9.81375 6.31064 9.76458 6.49913 9.76458C6.68762 9.76458 6.87285 9.81375 7.03653 9.90723L9.4808 11.3037C9.56318 11.3507 9.65647 11.3753 9.75133 11.375C9.8462 11.3747 9.93932 11.3495 10.0214 11.3018C10.1034 11.2542 10.1715 11.1859 10.2189 11.1037C10.2663 11.0215 10.2912 10.9284 10.2912 10.8335V2.70835C10.2912 2.42103 10.1771 2.14547 9.97389 1.94231Z" stroke={color} strokeWidth={1.21875} strokeLinecap="round"/>
  </Svg>
);

// ─── LinkedIn icon (16x16, plain fill) ──────────────────────────────────────
const LinkedInIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M8 0C12.4183 0 16 3.58172 16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0ZM4.10938 6.60221V12H5.96745V6.60221H4.10938ZM10.528 6.47591C9.54211 6.47591 9.10036 6.99939 8.85352 7.36719V6.60221H6.99544C7.01982 7.10869 6.99544 12 6.99544 12H8.85352V8.98568C8.85352 8.82445 8.86572 8.66348 8.91471 8.54818C9.04902 8.22587 9.35464 7.89193 9.86784 7.89193C10.5401 7.89195 10.8092 8.38705 10.8092 9.11263V12H12.6667V8.90495C12.6666 7.24716 11.7502 6.47599 10.528 6.47591ZM5.05078 4C4.41557 4.00011 4.00016 4.40289 4 4.93229C4 5.45027 4.40323 5.86523 5.02669 5.86523H5.03906C5.68672 5.8651 6.08984 5.45016 6.08984 4.93229C6.07763 4.40281 5.68623 4 5.05078 4Z" fill="#084D92"/>
  </Svg>
);

// ─── Corner arrow icon (Join the Community / Explore Resources) ───────────
// Reusing the exact confirmed-working pattern from CourseCard.tsx's
// CircleArrowIcon (used on the Recommended Course card above) rather than
// a hand-rolled version — that one uses a stroked <Path> for the circle
// (not react-native-svg's <Circle>) and a plain position:'absolute'
// overlay for the chevron, which is what actually renders correctly;
// recolored white for this navy button vs. CourseCard's navy-on-white.
const CornerArrowIcon = () => (
  <View style={{width: 15, height: 15, alignItems: 'center', justifyContent: 'center'}}>
    <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
      <Path d="M7.5.6a6.9 6.9 0 100 13.8 6.9 6.9 0 000-13.8z" stroke="#FFFFFF" strokeWidth={1.2} fill="none"/>
    </Svg>
    <View style={{position: 'absolute'}}>
      <Svg width={9} height={9} viewBox="0 0 9 9" fill="none">
        <Path d="M6.34492 5.38164L6.43457 5.28262C6.82532 4.80378 6.82532 4.11146 6.43457 3.63262L6.34492 3.53359L2.9541 0.143359L2.06816 1.02812L2.28027 1.24082L5.45957 4.41953C5.48009 4.44078 5.47989 4.47529 5.45898 4.49629L2.06641 7.89004L2.95176 8.77539L6.34492 5.38164Z" fill="#FFFFFF"/>
      </Svg>
    </View>
  </View>
);

// ─── "View all..." link arrow (14x14, plain stroke) ────────────────────────
const ViewAllArrow = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path d="M2.91602 6.99982H11.0836M6.99982 11.0836L11.0836 6.99982L6.99982 2.91602" stroke="#46B0E3" strokeWidth={2} strokeLinecap="round"/>
  </Svg>
);

// ─── Related-webinar row card (Latest Webinars) ────────────────────────────
// Deliberately mirrors EventsScreen's RecordingCard styling values rather
// than importing it — that component is screen-local/unexported, and the
// project already duplicates small presentational pieces per-file (see
// icons throughout) rather than cross-importing between screens.
const REL_THUMB_W = 60;
const REL_THUMB_H = 60;
const RelatedWebinarCard = ({item, onPress}: {item: RelatedWebinarItem; onPress: () => void}) => (
  <TouchableOpacity style={s.relCard} activeOpacity={0.85} onPress={onPress}>
    <View style={s.relThumbWrap}>
      {item.image
        ? <Image source={{uri: item.image}} style={s.relThumb} resizeMode="cover"/>
        : <View style={[s.relThumb, {backgroundColor: '#E8E9F1'}]}/>}
    </View>
    <View style={s.relTextFrame}>
      <Text style={s.relTitle} numberOfLines={2}>{item.title}</Text>
      <View style={s.relStroke}/>
      {!!item.speakerName && <Text style={s.relName} numberOfLines={1}>{item.speakerName}</Text>}
      {!!item.speakerTitle && <Text style={s.relJobTitle} numberOfLines={1}>{item.speakerTitle}</Text>}
    </View>
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path d="M8.03125 12.824V7.17649C8.03137 7.10583 8.05049 7.0365 8.08661 6.97577C8.12273 6.91504 8.17452 6.86514 8.23655 6.8313C8.29858 6.79747 8.36857 6.78094 8.43919 6.78345C8.5098 6.78596 8.57844 6.80742 8.63792 6.84558L13.0311 9.66855C13.0868 9.70419 13.1325 9.75325 13.1642 9.81121C13.1959 9.86917 13.2125 9.93418 13.2125 10.0002C13.2125 10.0663 13.1959 10.1313 13.1642 10.1893C13.1325 10.2472 13.0868 10.2963 13.0311 10.3319L8.63792 13.1557C8.57844 13.1939 8.5098 13.2153 8.43919 13.2178C8.36857 13.2203 8.29858 13.2038 8.23655 13.17C8.17452 13.1361 8.12273 13.0862 8.08661 13.0255C8.05049 12.9648 8.03137 12.8955 8.03125 12.8248V12.824Z" fill="#192546"/>
      <Path d="M1.33398 10.0002C1.33398 5.2138 5.21429 1.3335 10.0007 1.3335C14.787 1.3335 18.6673 5.2138 18.6673 10.0002C18.6673 14.7865 14.787 18.6668 10.0007 18.6668C5.21429 18.6668 1.33398 14.7865 1.33398 10.0002ZM10.0007 2.51531C8.01555 2.51531 6.11175 3.30389 4.70806 4.70758C3.30438 6.11126 2.5158 8.01506 2.5158 10.0002C2.5158 11.9853 3.30438 13.8891 4.70806 15.2928C6.11175 16.6964 8.01555 17.485 10.0007 17.485C11.9858 17.485 13.8896 16.6964 15.2932 15.2928C16.6969 13.8891 17.4855 11.9853 17.4855 10.0002C17.4855 8.01506 16.6969 6.11126 15.2932 4.70758C13.8896 3.30389 11.9858 2.51531 10.0007 2.51531Z" fill="#192546"/>
    </Svg>
  </TouchableOpacity>
);

// ─── Sidebar card (Join the Community / Explore Resources) ────────────────
const SidebarCard = ({data, onPress}: {data: SidebarCardData; onPress: () => void}) => (
  <View style={s.sidebarCard}>
    <View>
      <Text style={s.sidebarHeading}>{data.title}</Text>
      <View style={s.sidebarUnderline}/>
      <Text style={s.sidebarDescription}>{data.description}</Text>
    </View>
    <TouchableOpacity style={s.sidebarArrowBtn} activeOpacity={0.85} onPress={onPress}>
      <CornerArrowIcon/>
    </TouchableOpacity>
  </View>
);

// Not given a distinct "saved" icon/state — tinting icon+label as the
// simplest reasonable default. Easy to swap for a filled-bookmark icon
// later if Marium has one.
const SAVE_ACTIVE_COLOR = '#0C4D91';

const WebinarDetailScreen = ({navigation, route}: any) => {
  const eventId = route?.params?.eventId;

  const [webinar, setWebinar]         = useState<WebinarDetail | null>(null);
  const [loading, setLoading]         = useState(true);
  const [readMore, setReadMore]       = useState(false);
  const [linkedInUrl, setLinkedInUrl] = useState<string | null>(null);
  const [isSaved, setIsSaved]         = useState(false);
  const [shareVisible, setShareVisible] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) { setLoading(false); return; }
    setLoading(true);
    const data = await getSingleWebinar(eventId);
    setWebinar(data);
    setLoading(false);

    if (data?.speakerUserId) {
      getSpeakerLinkedIn(data.speakerUserId).then(setLinkedInUrl);
    }
    const savedIds = await getSavedWebinarIds();
    setIsSaved(savedIds.includes(String(eventId)));
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const handleToggleSave = async () => {
    if (!webinar) return;
    const nowSaved = await toggleSavedWebinar(webinar.id);
    setIsSaved(nowSaved);
  };

  const handleRelatedPress = (item: RelatedWebinarItem) => {
    // push (not navigate) so a chain of "related webinar" taps keeps
    // stacking back-able screens instead of replacing the current one.
    if (navigation?.push) navigation.push('WebinarDetail', {eventId: item.id});
    else navigation?.navigate('WebinarDetail', {eventId: item.id});
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF"/>
        <View style={s.navBar}><BackButton navigation={navigation}/></View>
        <View style={s.loadingWrap}><ActivityIndicator color="#0C4D91"/></View>
      </SafeAreaView>
    );
  }

  if (!webinar) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF"/>
        <View style={s.navBar}><BackButton navigation={navigation}/></View>
        <View style={s.loadingWrap}>
          <Text style={{color: '#8F9098', fontFamily: 'Runda-Normal'}}>{'Webinar not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF"/>
      <View style={s.navBar}><BackButton navigation={navigation}/></View>

      <ScrollView style={s.mainWrap} showsVerticalScrollIndicator={false} contentContainerStyle={s.mainContent}>
        <Text style={s.title}>{webinar.title}</Text>

        <View style={s.bylineRow}>
          {webinar.speakerImage ? (
            <Image source={{uri: webinar.speakerImage}} style={s.avatar}/>
          ) : (
            <View style={[s.avatar, {backgroundColor: '#E8E9F1'}]}/>
          )}
          <Text style={s.bylineName} numberOfLines={1}>{webinar.speakerName}</Text>

          {!!webinar.dateLabel && (
            <View style={s.bylineItem}>
              <CalendarIcon/>
              <Text style={s.bylineText} numberOfLines={1}>{webinar.dateLabel}</Text>
            </View>
          )}
          {!!webinar.durationLabel && (
            <View style={s.bylineItem}>
              <ClockIcon/>
              <Text style={s.bylineText} numberOfLines={1}>{webinar.durationLabel}</Text>
            </View>
          )}
          {!!webinar.tagName && (
            <View style={s.bylineItem}>
              <TagIcon/>
              <Text style={s.bylineText} numberOfLines={1}>{webinar.tagName}</Text>
            </View>
          )}
        </View>

        <View style={s.videoBox}>
          {webinar.videoEmbedUrl ? (
            <WebView
              // FIXED: loading video_embed_url directly as `uri` produced
              // YouTube's "Video player configuration error / Error 153"
              // on-device — YouTube's iframe player checks the embedding
              // page's origin/referrer, and a bare WebView has none that
              // matches what's whitelisted for this content. Same root
              // cause and same fix VideoPlayerModal.tsx already uses for
              // Vimeo: wrap the embed in a tiny local HTML page and set
              // `baseUrl` to the site's own domain so the WebView's
              // effective origin matches what the website's own embed
              // already gets away with.
              source={{
                html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><style>html,body{margin:0;padding:0;background:#000;height:100%;}iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0;}</style></head><body><iframe src="${webinar.videoEmbedUrl}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></body></html>`,
                baseUrl: 'https://hub.instituteprojectmanagement.com/',
              }}
              style={s.videoWebview}
              allowsFullscreenVideo
              javaScriptEnabled
              domStorageEnabled
              mediaPlaybackRequiresUserAction={false}
              mixedContentMode="always"
              originWhitelist={['*']}
              allowsInlineMediaPlayback
            />
          ) : (
            <View style={[s.videoWebview, {backgroundColor: '#192647'}]}/>
          )}
        </View>

        <View style={s.actionsRow}>
          <TouchableOpacity
            style={s.actionItem}
            activeOpacity={0.7}
            onPress={() => webinar.videoWatchUrl && Linking.openURL(webinar.videoWatchUrl)}>
            <YouTubeIcon/>
            <Text style={s.actionTextYoutube}>{'Watch on YouTube'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionItem} activeOpacity={0.7} onPress={() => setShareVisible(true)}>
            <ShareIcon/>
            <Text style={s.actionText}>{'Share'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionItem} activeOpacity={0.7} onPress={handleToggleSave}>
            <SaveIcon color={isSaved ? SAVE_ACTIVE_COLOR : '#192647'}/>
            <Text style={[s.actionText, isSaved && {color: SAVE_ACTIVE_COLOR}]}>{isSaved ? 'Saved' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.divider}/>

        <View style={s.textSection}>
          <View style={s.descriptionBlock}>
            <Text style={s.sectionHeading}>{'Webinar Description'}</Text>
            <Text style={s.bodyText}>{webinar.aboutVisible.join('\n\n')}</Text>
            {readMore && webinar.aboutHidden.length > 0 && (
              <Text style={[s.bodyText, {marginTop: 8}]}>{webinar.aboutHidden.join('\n\n')}</Text>
            )}
            {webinar.aboutHidden.length > 0 && (
              <TouchableOpacity onPress={() => setReadMore(v => !v)} activeOpacity={0.7}>
                <Text style={s.readMore}>{readMore ? ' Show Less' : ' Read More'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {!!webinar.speakerName && (
            <View>
              <Text style={s.sectionHeading}>{'About the Speaker'}</Text>
              <View style={{height: 16}}/>
              <View style={s.speakerCard}>
                <View style={s.speakerRow}>
                  {webinar.speakerImage ? (
                    <Image source={{uri: webinar.speakerImage}} style={s.speakerPhoto}/>
                  ) : (
                    <View style={[s.speakerPhoto, {backgroundColor: '#E8E9F1'}]}/>
                  )}
                  <View style={{flex: 1}}>
                    <Text style={s.speakerName}>{webinar.speakerName}</Text>
                    {!!webinar.speakerTitle && <Text style={s.speakerTitle}>{webinar.speakerTitle}</Text>}
                    {!!webinar.speakerBioText && <Text style={s.speakerBio}>{webinar.speakerBioText}</Text>}
                    {!!linkedInUrl && (
                      <TouchableOpacity
                        style={s.linkedInRow}
                        activeOpacity={0.7}
                        onPress={() => Linking.openURL(linkedInUrl)}>
                        <LinkedInIcon/>
                        <Text style={s.linkedInText}>{'Connect on LinkedIn'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}

          {webinar.recommendedCourse && (
            <View>
              <Text style={s.sectionHeading}>{'Recommended Course'}</Text>
              <View style={{height: 16}}/>
              <CourseCard
                variant="default"
                imageUri={webinar.recommendedCourse.image}
                title={webinar.recommendedCourse.title}
                description={webinar.recommendedCourse.description}
                buttonLabel="View Course"
                onPressButton={() => {
                  const rc = webinar.recommendedCourse!;
                  navigation?.navigate?.('CourseDetail', {
                    courseId: rc.id,
                    fallbackTitle: rc.title,
                    fallbackTagline: rc.description,
                    fallbackUrl: rc.permalink,
                  });
                }}
              />
              <TouchableOpacity
                style={s.viewAllRow}
                activeOpacity={0.7}
                onPress={() => navigation?.navigate?.('Courses')}>
                <Text style={s.viewAllText}>{'View all related courses'}</Text>
                <ViewAllArrow/>
              </TouchableOpacity>
            </View>
          )}

          {(webinar.sidebarForums || webinar.sidebarResources) && (
            <View style={s.sidebarRow}>
              {webinar.sidebarForums && (
                <SidebarCard data={webinar.sidebarForums} onPress={() => navigation?.navigate?.('Forums')}/>
              )}
              {webinar.sidebarResources && (
                <SidebarCard data={webinar.sidebarResources} onPress={() => navigation?.navigate?.('Resources')}/>
              )}
            </View>
          )}

          {webinar.latestWebinars.length > 0 && (
            <View style={{alignSelf: 'stretch'}}>
              <Text style={s.sectionHeading}>{'Latest Webinars'}</Text>
              <View style={{height: 16}}/>
              {webinar.latestWebinars.map(item => (
                <RelatedWebinarCard key={item.id} item={item} onPress={() => handleRelatedPress(item)}/>
              ))}
              {!!webinar.recordingsUrl && (
                <TouchableOpacity
                  style={s.viewAllRow}
                  activeOpacity={0.7}
                  onPress={() => webinar.recordingsUrl && Linking.openURL(webinar.recordingsUrl)}>
                  <Text style={s.viewAllText}>{'View all recordings'}</Text>
                  <ViewAllArrow/>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={{height: 32}}/>
      </ScrollView>

      <ShareSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        url={webinar.shareUrl ?? ''}
        title={webinar.title}
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  navBar: {height: 56, paddingLeft: 20, paddingVertical: 14, justifyContent: 'center'},
  loadingWrap: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  mainWrap: {flex: 1},
  mainContent: {paddingHorizontal: 16, alignItems: 'center'},

  title: {
    alignSelf: 'stretch',
    color: '#192647',
    fontFamily: 'Runda-Bold',
    fontSize: 18,
    letterSpacing: 0.09,
    marginBottom: 16,
  },

  bylineRow: {flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', flexWrap: 'wrap', marginBottom: 16},
  avatar: {width: 20, height: 20, borderRadius: 20, marginRight: 6},
  bylineName: {color: '#192647', fontFamily: 'Runda-Medium', fontSize: 10, lineHeight: 14, marginRight: 12},
  bylineItem: {flexDirection: 'row', alignItems: 'center', marginRight: 12},
  bylineText: {color: '#979797', fontFamily: 'Runda-Medium', fontSize: 10, marginLeft: 4, maxWidth: 60},

  videoBox: {
    alignSelf: 'stretch',
    height: 201.375,
    borderTopLeftRadius: 9.179,
    borderTopRightRadius: 9.179,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  videoWebview: {flex: 1},

  actionsRow: {flexDirection: 'row', alignSelf: 'stretch', marginBottom: 16},
  actionItem: {flexDirection: 'row', alignItems: 'center', marginRight: 20},
  actionText: {color: '#192647', fontFamily: 'Runda-Medium', fontSize: 14, marginLeft: 6},
  actionTextYoutube: {color: '#0C4D91', fontFamily: 'Runda-Medium', fontSize: 14, marginLeft: 6},
  divider: {height: 1, alignSelf: 'stretch', backgroundColor: '#E8E9F1', marginBottom: 20},

  textSection: {alignSelf: 'stretch'},
  descriptionBlock: {marginBottom: 20},
  sectionHeading: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 16, lineHeight: 20, letterSpacing: 0.08, marginBottom: 12},
  bodyText: {color: '#192647', fontFamily: 'Runda-Normal', fontSize: 14, lineHeight: 18, textAlign: 'justify'},
  readMore: {color: '#46B1E4', fontFamily: 'Runda-Medium', fontSize: 14, marginTop: 4},

  speakerCard: {
    alignSelf: 'stretch',
    padding: 20,
    borderRadius: 10.186,
    backgroundColor: '#EEF7FC',
    marginBottom: 20,
  },
  speakerRow: {flexDirection: 'row', alignSelf: 'stretch'},
  speakerPhoto: {width: 45, height: 45, borderRadius: 45, marginRight: 16},
  speakerName: {color: '#111C3A', fontFamily: 'Runda-Medium', fontSize: 14, marginBottom: 2},
  speakerTitle: {color: '#0038A8', fontFamily: 'Runda-Medium', fontSize: 12, marginBottom: 8},
  speakerBio: {color: '#7C86A1', fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16, marginBottom: 10},
  linkedInRow: {flexDirection: 'row', alignItems: 'center'},
  linkedInText: {color: '#0038A8', fontFamily: 'Runda-Medium', fontSize: 12, marginLeft: 6},

  viewAllRow: {flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 16, marginBottom: 20},
  viewAllText: {color: '#46B0E3', fontFamily: 'Runda-Medium', fontSize: 14, marginRight: 8},

  sidebarRow: {flexDirection: 'row', alignSelf: 'stretch', marginBottom: 20},
  sidebarCard: {
    width: 171,
    height: 164,
    padding: 16,
    borderRadius: 7.726,
    backgroundColor: '#FFFFFF',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 10.023,
    elevation: 3,
    justifyContent: 'space-between',
  },
  sidebarHeading: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 14},
  sidebarUnderline: {width: 39.532, height: 1, backgroundColor: '#005AB4', marginTop: 6, marginBottom: 8},
  sidebarDescription: {color: '#8F9098', fontFamily: 'Runda-Normal', fontSize: 10, lineHeight: 14},
  sidebarArrowBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 34.717,
    height: 34.34,
    borderBottomRightRadius: 7.726,
    backgroundColor: '#0C4D91',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Latest Webinars row card
  relCard: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch',
    padding: 12, borderRadius: 5, backgroundColor: '#FFFFFF', marginBottom: 12,
    shadowColor: '#000', shadowOffset: {width: 0, height: 0}, shadowOpacity: 0.15, shadowRadius: 9, elevation: 3,
  },
  relThumbWrap: {width: REL_THUMB_W, height: REL_THUMB_H, borderRadius: 4, overflow: 'hidden', marginRight: 12},
  relThumb: {width: REL_THUMB_W, height: REL_THUMB_H},
  relTextFrame: {flex: 1, marginRight: 8},
  relTitle: {color: '#192546', fontFamily: 'Runda-Bold', fontSize: 13, lineHeight: 16},
  relStroke: {width: 24, height: 1, backgroundColor: '#46B0E3', marginTop: 4, marginBottom: 4},
  relName: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 11},
  relJobTitle: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 9.5},
});

export default WebinarDetailScreen;
