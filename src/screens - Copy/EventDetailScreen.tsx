/* eslint-disable prettier/prettier */
import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, StatusBar, ActivityIndicator, Alert} from 'react-native';
import Svg, {Path, Rect, G, Defs, ClipPath} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import BackButton from '../components/BackButton';
import {apiRequest, BASE_URL, stripHtml} from '../api/apiClient';
import {
  EventItem, EventRegistrationPayload, getRegisteredEventIds,
  getStoredUserFields, registerForEvent,
} from '../api/eventsApi';

// "03/07/2026" or ISO -> "Friday, 3 July 2026"

// "03/07/2026" or ISO -> "Friday, 3 July 2026"
const formatFullDate = (raw: string): string => {
  if (!raw) return '';
  let d: Date;
  const parts = raw.split('/');
  if (parts.length === 3) {
    d = new Date(parts[2] + '-' + parts[1].padStart(2, '0') + '-' + parts[0].padStart(2, '0'));
  } else {
    d = new Date(raw);
  }
  if (isNaN(d.getTime())) {return raw;}
  return d.toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
};

interface TimeTableItem {time: string; title: string; description: string;}
interface SpeakerDetail {
  speaker: string; job_title: string;
  speaker_bio: string | string[];
  formatted_date: string; formatted_time: string;
  time_table: TimeTableItem[]; image_url?: string;
}

// "03/07/2026" → "03 Jul 2026"

const DateSvg = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M1.33398 12.6663C1.33398 13.7997 2.20065 14.6663 3.33398 14.6663H12.6673C13.8007 14.6663 14.6673 13.7997 14.6673 12.6663V7.33301H1.33398V12.6663ZM12.6673 2.66634H11.334V1.99967C11.334 1.59967 11.0673 1.33301 10.6673 1.33301C10.2673 1.33301 10.0007 1.59967 10.0007 1.99967V2.66634H6.00065V1.99967C6.00065 1.59967 5.73398 1.33301 5.33398 1.33301C4.93398 1.33301 4.66732 1.59967 4.66732 1.99967V2.66634H3.33398C2.20065 2.66634 1.33398 3.53301 1.33398 4.66634V5.99967H14.6673V4.66634C14.6673 3.53301 13.8007 2.66634 12.6673 2.66634Z" fill="#0C4D91"/>
  </Svg>
);
const TimeSvg = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M8 0C12.4181 0.000100502 16 3.58189 16 8C15.9999 12.418 12.418 15.9999 8 16C3.58189 16 0.000100505 12.4181 0 8C0 3.58182 3.58182 0 8 0ZM7.90137 3.9502C7.57415 3.9502 7.30867 4.21576 7.30859 4.54297V8.49316C7.30859 9.03861 7.75143 9.48144 8.29688 9.48145H11.2598C11.5868 9.4812 11.8515 9.21574 11.8516 8.88867C11.8515 8.56161 11.5868 8.29614 11.2598 8.2959H8.49414V4.54297C8.49407 4.21576 8.22859 3.9502 7.90137 3.9502Z" fill="#0C4D91"/>
  </Svg>
);
const FormatSvg = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Defs><ClipPath id="c0"><Rect width={16} height={16} rx={3.2} fill="white"/></ClipPath></Defs>
    <G clipPath="url(#c0)">
      <Path d="M2.88885 2.55957C2.29258 2.55957 1.72074 2.79644 1.29912 3.21806C0.877491 3.63968 0.640625 4.21153 0.640625 4.8078V11.5525C0.640625 12.1487 0.877491 12.7206 1.29912 13.1422C1.72074 13.5638 2.29258 13.8007 2.88885 13.8007H9.07147C9.66774 13.8007 10.2396 13.5638 10.6612 13.1422C11.0828 12.7206 11.3197 12.1487 11.3197 11.5525V4.8078C11.3197 4.21153 11.0828 3.63968 10.6612 3.21806C10.2396 2.79644 9.66774 2.55957 9.07147 2.55957H2.88885Z" fill="#0C4D91"/>
      <Path d="M14.5398 12.4018L13.0039 10.7202V5.64384L14.5398 3.96215C15.0788 3.37138 16.0015 3.78961 16.0015 4.62483V11.7392C16.0015 12.5744 15.0788 12.9926 14.5398 12.4018Z" fill="#0C4D91"/>
    </G>
  </Svg>
);
const SpeakerSvg = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M8 0C3.58182 0 0 3.58182 0 8C0 12.4182 3.58182 16 8 16C12.4182 16 16 12.4182 16 8C16 3.58182 12.4182 0 8 0ZM8 4C9.1 4 10 4.9 10 6C10 7.1 9.1 8 8 8C6.9 8 6 7.1 6 6C6 4.9 6.9 4 8 4ZM8 13.6C6 13.6 4.24 12.62 3.2 11.1C3.22 9.54 6.4 8.68 8 8.68C9.6 8.68 12.78 9.54 12.8 11.1C11.76 12.62 10 13.6 8 13.6Z" fill="#0C4D91"/>
  </Svg>
);
const ChevronDown = ({up}: {up?: boolean}) => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none"
    style={up ? {transform:[{rotate:'180deg'}]} : undefined}>
    <Path d="M2 4L6 8L10 4" stroke="#0C4D91" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const InlineEventCard = ({event, dateLabel, timeLabel, speakerName, speakerTitle, cardImage}: {
  event: EventItem; dateLabel: string; timeLabel: string;
  speakerName: string; speakerTitle: string; cardImage: string | null;
}) => (
  <View style={cs.card}>
    <View style={cs.imageWrap}>
      {cardImage
        ? <Image source={{uri: cardImage}} style={cs.image} resizeMode="cover"/>
        : <View style={[cs.image, {backgroundColor:'#1A3A6B'}]}/>}
      <View style={cs.speakerOverlay}>
        {!!speakerName  && <Text style={cs.overlayName}  numberOfLines={1}>{speakerName}</Text>}
        {!!speakerTitle && <Text style={cs.overlayTitle} numberOfLines={2}>{speakerTitle}</Text>}
      </View>
    </View>
    <View style={cs.textWrap}>
      <Text style={cs.tag} numberOfLines={2}>{"IPM's EMEA Monthly Event · Live Every First Friday"}</Text>
      <Text style={cs.title} numberOfLines={3}>{event.title}</Text>
      {!!dateLabel && <Text style={cs.meta}>{dateLabel}</Text>}
      {!!timeLabel && <Text style={cs.meta}>{timeLabel}</Text>}
      {!!event.registrationUrl && (
        <View style={cs.regBtn}><Text style={cs.regBtnText}>{'Register Now'}</Text></View>
      )}
    </View>
  </View>
);

interface Props {
  navigation: any;
  route: {params: {event: EventItem; rawEvent?: any; isNearestUpcoming?: boolean}};
}

const EventDetailScreen = ({navigation, route}: Props) => {
  const {event, rawEvent, isNearestUpcoming = true} = route.params;

  const [speakerDetail, setSpeakerDetail]   = useState<SpeakerDetail | null>(null);
  const [loadingSpeaker, setLoadingSpeaker] = useState(true);
  const [bioExpanded, setBioExpanded]       = useState(false);
  const [isRegistered, setIsRegistered]     = useState(false);
  const [registering, setRegistering]       = useState(false);
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [prefill, setPrefill]               = useState<Partial<EventRegistrationPayload>>({});

  const zohoId = rawEvent?.zoho_event_id ?? event.rawEvent?.zoho_event_id ?? '';

  useEffect(() => {
    getRegisteredEventIds().then(ids => setIsRegistered(ids.includes(event.id))).catch(() => {});
    getStoredUserFields().then(setPrefill).catch(() => {});
    if (!zohoId) {setLoadingSpeaker(false); return;}
    apiRequest(`${BASE_URL}/custom/v1/event-speakers/${zohoId}`)
      .then(res => {
        const d = res?.data ?? res;
        if (d && (d.speaker || d.speaker_bio)) {setSpeakerDetail(d);}
      })
      .catch(() => {})
      .finally(() => setLoadingSpeaker(false));
  }, [zohoId]);

  const speakerBio: string = (() => {
    if (!speakerDetail?.speaker_bio) return '';
    if (typeof speakerDetail.speaker_bio === 'string') return stripHtml(speakerDetail.speaker_bio).trim();
    if (Array.isArray(speakerDetail.speaker_bio)) return stripHtml(speakerDetail.speaker_bio[0] ?? '').trim();
    return '';
  })();

  const aboutWebinar: string = event.aboutWebinar ?? '';
  const dateLabel    = formatFullDate(speakerDetail?.formatted_date ?? rawEvent?.event_date_formatted ?? event.dateLabel ?? '');
  const timeLabel    = speakerDetail?.formatted_time ?? '';
  // speakerDetail comes from the raw custom/v1/event-speakers/{zohoId}
  // endpoint (hit directly via apiRequest above, NOT through eventsApi.ts),
  // so unlike speakerBio/aboutWebinar it was never run through stripHtml —
  // an ampersand or apostrophe in a speaker's name/job title (e.g. "R&D
  // Lead") rendered as literal "&#038;"/"&#8217;" on the overlay card, the
  // bio heading, and the Speaker meta row below.
  const speakerName  = stripHtml(speakerDetail?.speaker  ?? event.speakerName  ?? '');
  const speakerTitle = stripHtml(speakerDetail?.job_title ?? event.speakerTitle ?? '');
  const cardImage    = speakerDetail?.image_url ?? event.detailsImage ?? event.image ?? null;

  const BIO_LIMIT  = 280;
  const bioShort   = speakerBio.length > BIO_LIMIT ? speakerBio.slice(0, BIO_LIMIT) + '…' : speakerBio;
  const hasBioMore = speakerBio.length > BIO_LIMIT;

  // Previously this only flipped local state and skipped straight to
  // ThankYou without ever calling the API — that's why "Confirmation Sent"
  // showed but no email went out. Now it actually registers first.
  const handleRegisterNow = async () => {
    if (registering) return;
    setRegistering(true);

    const result = await registerForEvent({
      first_name: prefill.first_name ?? '',
      last_name:  prefill.last_name ?? '',
      email:      prefill.email ?? '',
      company:    prefill.company ?? '',
      job_title:  prefill.job_title ?? '',
      event_id:   zohoId || event.id,
      region:     prefill.region ?? '',
    });

    setRegistering(false);

    if (!result.success) {
      Alert.alert('Registration Failed', result.message);
      return;
    }

    setIsRegistered(true);
    await markEventRegistered(event.id);
    navigation.navigate('EventThankYou', {
      event,
      email: prefill.email ?? '',
      speakerDetail: speakerDetail ? {
        speaker:        speakerDetail.speaker,
        job_title:      speakerDetail.job_title,
        formatted_date: speakerDetail.formatted_date,
        formatted_time: speakerDetail.formatted_time,
        image_url:      speakerDetail.image_url,
      } : null,
    });
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF"/>
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)}/>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <BackButton style={s.backBtn} onPress={() => navigation.goBack()} />

        {/* Event Details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{'Event Details'}</Text>
          {!!aboutWebinar && stripHtml(aboutWebinar).trim().split(/\n\n+/).map((para, i) => (
            <Text key={i} style={[s.descPara, i > 0 && {marginTop:12}]}>{para.trim()}</Text>
          ))}
          {loadingSpeaker ? (
            <ActivityIndicator color="#0C4D91" style={{marginVertical:20}}/>
          ) : (
            <View style={{marginTop: aboutWebinar ? 20 : 0}}>
              <InlineEventCard event={event} dateLabel={dateLabel} timeLabel={timeLabel}
                speakerName={speakerName} speakerTitle={speakerTitle} cardImage={cardImage}/>
            </View>
          )}
        </View>

        {/* About The Speaker */}
        {!loadingSpeaker && (speakerName || speakerBio) && (
          <View style={s.section}>
            <Text style={s.aboutLbl}>{'About The Speaker'}</Text>
            {speakerBio ? (
              <>
                <Text style={s.bioText}>
                  <Text style={s.bioNameBold}>{speakerName} </Text>
                  {bioExpanded ? speakerBio : bioShort}
                </Text>
                {hasBioMore && (
                  <TouchableOpacity onPress={() => setBioExpanded(v => !v)} style={s.viewMoreRow}>
                    <Text style={s.viewMoreTxt}>{bioExpanded ? 'View Less' : 'View More'}</Text>
                    <ChevronDown up={bioExpanded}/>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <Text style={s.bioText}><Text style={s.bioNameBold}>{speakerName}</Text></Text>
            )}
            <View style={s.metaList}>
              {!!dateLabel && <View style={s.metaRow}><DateSvg/><View><Text style={s.metaLbl}>{'Date'}</Text><Text style={s.metaVal}>{dateLabel}</Text></View></View>}
              {!!timeLabel && <View style={s.metaRow}><TimeSvg/><View><Text style={s.metaLbl}>{'Time'}</Text><Text style={s.metaVal}>{timeLabel}</Text></View></View>}
              <View style={s.metaRow}><FormatSvg/><View><Text style={s.metaLbl}>{'Format'}</Text><Text style={s.metaVal}>{'Online'}</Text></View></View>
              {!!speakerName && <View style={s.metaRow}><SpeakerSvg/><View><Text style={s.metaLbl}>{'Speaker'}</Text><Text style={s.metaVal}>{speakerName}</Text></View></View>}
            </View>
          </View>
        )}

        <View style={{height:100}}/>
      </ScrollView>

      {/* Sticky Register Now / Registered / Coming Soon */}
      {!!event.registrationUrl && (
        <View style={s.btnWrap}>
          {isRegistered ? (
            <View style={s.registeredBtn}>
              <Text style={s.registeredBtnTxt}>{'Registered'}</Text>
            </View>
          ) : isNearestUpcoming ? (
            <View
              style={s.btn}
              onStartShouldSetResponder={() => true}
              onResponderGrant={() => !registering && handleRegisterNow()}>
              {registering
                ? <ActivityIndicator color="#FFFFFF" size="small"/>
                : <Text style={s.btnTxt}>{'Register Now'}</Text>}
            </View>
          ) : (
            <View style={s.registeredBtn}>
              <Text style={s.registeredBtnTxt}>{'Coming Soon'}</Text>
            </View>
          )}
        </View>
      )}

      <ProfileDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigation={navigation}
      />
    </View>
  );
};

const cs = StyleSheet.create({
  card:           {flexDirection:'row', borderRadius:8, overflow:'hidden', borderWidth:1, borderColor:'#E8E9F1', height:180, shadowColor:'#000', shadowOffset:{width:0,height:0}, shadowOpacity:0.1, shadowRadius:8, elevation:3},
  imageWrap:      {width:140, position:'relative'},
  image:          {width:140, height:'100%'},
  speakerOverlay: {position:'absolute', bottom:0, left:0, right:0, backgroundColor:'rgba(12,77,145,0.85)', padding:8},
  overlayName:    {fontFamily:'Runda', fontSize:11, fontWeight:'700', color:'#FFFFFF'},
  overlayTitle:   {fontFamily:'Runda', fontSize:9, fontWeight:'400', color:'#FFFFFF', lineHeight:12, marginTop:2},
  textWrap:       {flex:1, padding:12, backgroundColor:'#FFFFFF', justifyContent:'space-between'},
  tag:            {fontFamily:'Runda', fontSize:9, fontWeight:'400', color:'#46B0E3', marginBottom:4},
  title:          {fontFamily:'Runda', fontSize:13, fontWeight:'700', color:'#192546', lineHeight:17, marginBottom:6},
  meta:           {fontFamily:'Runda', fontSize:10, fontWeight:'400', color:'#192546', lineHeight:16},
  regBtn:         {marginTop:8, backgroundColor:'#0C4D91', borderRadius:4, paddingVertical:5, paddingHorizontal:10, alignSelf:'flex-start'},
  regBtnText:     {fontFamily:'Runda', fontSize:10, fontWeight:'700', color:'#FFFFFF'},
});

const s = StyleSheet.create({
  container:   {flex:1, backgroundColor:'#FFFFFF'},
  scroll:      {paddingBottom:40},
  backBtn:     {marginHorizontal:16, marginTop:16, marginBottom:4, alignSelf:'flex-start'},
  section:     {paddingHorizontal:16, paddingVertical:20, borderBottomWidth:1, borderBottomColor:'#F0F0F0'},
  sectionTitle:{fontFamily:'Runda', fontSize:18, fontWeight:'700', color:'#192546', letterSpacing:0.09, marginBottom:16},
  descPara:    {fontFamily:'Runda', fontSize:14, fontWeight:'400', color:'#192546', lineHeight:22},
  aboutLbl:    {fontFamily:'Runda', fontSize:14, fontWeight:'500', color:'#0C4D91', marginBottom:10},
  bioNameBold: {fontFamily:'Runda', fontSize:14, fontWeight:'700', color:'#192546'},
  bioText:     {fontFamily:'Runda', fontSize:14, fontWeight:'400', color:'#192546', lineHeight:22, marginBottom:8},
  viewMoreRow: {flexDirection:'row', alignItems:'center', gap:4, marginBottom:20},
  viewMoreTxt: {fontFamily:'Runda', fontSize:14, fontWeight:'500', color:'#0C4D91'},
  metaList:    {gap:16, marginTop:16},
  metaRow:     {flexDirection:'row', alignItems:'flex-start', gap:10},
  metaLbl:     {fontFamily:'Runda', fontSize:14, fontWeight:'700', color:'#192546'},
  metaVal:     {fontFamily:'Runda', fontSize:14, fontWeight:'400', color:'#192546', lineHeight:18},
  btnWrap:         {position:'absolute', bottom:0, left:0, right:0, backgroundColor:'#FFFFFF', paddingHorizontal:24, paddingTop:12, paddingBottom:16, borderTopWidth:1, borderTopColor:'#F0F0F0'},
  btn:             {backgroundColor:'#0C4D91', borderRadius:30, paddingVertical:14, alignItems:'center'},
  btnTxt:          {color:'#FFFFFF', fontFamily:'Runda', fontSize:15, fontWeight:'700'},
  registeredBtn:   {backgroundColor:'#46B0E3', borderRadius:5, paddingVertical:14, alignItems:'center'},
  registeredBtnTxt:{color:'#FFFFFF', fontFamily:'Runda', fontSize:15, fontWeight:'700'},
});

export default EventDetailScreen;
