/* eslint-disable prettier/prettier */
import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, StatusBar, Platform} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path, Rect, G, Mask, Defs, ClipPath, Circle} from 'react-native-svg';
import {EventItem} from '../api/eventsApi';
import {stripHtml} from '../api/apiClient';

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

interface SpeakerDetail {
  speaker?: string; job_title?: string;
  formatted_date?: string; formatted_time?: string; image_url?: string;
}

// "03/07/2026" or ISO → "Friday, 3 July 2026"

// ─── Tick SVG with background circle ──────────────────────────────────────────
// Figma: 60x60, padding 8px, green circle tick
const TickSvg = () => (
  <Svg width={60} height={60} viewBox="0 0 60 60" fill="none">
    {/* Outer light green circle background */}
    <Circle cx={30} cy={30} r={30} fill="#F0FBF0"/>
    {/* Inner white circle */}
    <Circle cx={30} cy={30} r={22} fill="white"/>
    {/* Green tick ring */}
    <Path d="M30 8C17.85 8 8 17.85 8 30C8 42.15 17.85 52 30 52C42.15 52 52 42.15 52 30C52 17.85 42.15 8 30 8ZM30 49.24C19.53 49.24 11.06 40.63 11.06 30C11.06 19.37 19.53 10.76 30 10.76C40.47 10.76 48.94 19.37 48.94 30C48.94 40.63 40.47 49.24 30 49.24ZM40.97 19.83L24.37 36.49L17.78 29.9C17.24 29.36 16.39 29.36 15.84 29.9C15.3 30.44 15.3 31.29 15.84 31.83L23.37 39.37C23.9 39.9 24.76 39.9 25.3 39.37C25.36 39.31 25.41 39.24 25.46 39.17L42.46 22.11C43 21.57 43 20.72 42.46 20.17C41.91 19.63 41.06 19.63 40.97 19.83Z" fill="#3BBB06"/>
  </Svg>
);

// ─── Email icon with dark blue circle border ───────────────────────────────────
// Figma: 30x30 circle, border 1px #0C4D91, dark blue envelope inside
const EmailCircleIcon = () => (
  <Svg width={30} height={30} viewBox="0 0 30 30" fill="none">
    <Circle cx={15} cy={15} r={14.5} stroke="#0C4D91" strokeWidth={1}/>
    <Mask id="em" maskUnits="userSpaceOnUse" x={6} y={9} width={18} height={12}>
      <Path d="M9.14732 9.92871C8.50322 9.92871 7.88551 10.1846 7.43006 10.64C6.97462 11.0955 6.71875 11.7132 6.71875 12.3573V12.6014L14.0045 16.5247L21.2902 12.6026V12.3573C21.2902 11.7132 21.0343 11.0955 20.5789 10.64C20.1234 10.1846 19.5057 9.92871 18.8616 9.92871H9.14732ZM21.2902 13.9808L14.2923 17.7487C14.2038 17.7963 14.1049 17.8212 14.0045 17.8212C13.904 17.8212 13.8051 17.7963 13.7167 17.7487L6.71875 13.9808V19.643C6.71875 20.2871 6.97462 20.9048 7.43006 21.3603C7.88551 21.8157 8.50322 22.0716 9.14732 22.0716H18.8616C19.5057 22.0716 20.1234 21.8157 20.5789 21.3603C21.0343 20.9048 21.2902 20.2871 21.2902 19.643V13.9808Z" fill="#0C4D91"/>
    </Mask>
    <G mask="url(#em)">
      <Rect x={4} y={7} width={20} height={16} fill="#0C4D91"/>
    </G>
  </Svg>
);

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

// ─── Inline Event Card ─────────────────────────────────────────────────────────
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

// ─── Screen ────────────────────────────────────────────────────────────────────
interface Props {
  navigation: any;
  route: {params: {event: EventItem; email: string; speakerDetail?: SpeakerDetail | null}};
}

const EventThankYouScreen = ({navigation, route}: Props) => {
  const {event, email, speakerDetail} = route.params;
  const [bioExpanded, setBioExpanded] = useState(false);

  const dateLabel    = formatFullDate(speakerDetail?.formatted_date ?? event.rawEvent?.event_date_formatted ?? '') || event.dateLabel;
  const timeLabel    = speakerDetail?.formatted_time ?? '';
  const speakerName  = speakerDetail?.speaker  ?? event.speakerName  ?? '';
  const speakerTitle = speakerDetail?.job_title ?? event.speakerTitle ?? '';
  const cardImage    = speakerDetail?.image_url ?? event.detailsImage ?? event.image ?? null;

  // Speaker bio from rawEvent if available (passed from EventDetailScreen)
  const speakerBio: string = (() => {
    const bio = event.rawEvent?.speaker_bio;
    if (typeof bio === 'string') return stripHtml(bio).trim();
    if (Array.isArray(bio) && bio.length > 0) return stripHtml(bio[0]).trim();
    return '';
  })();

  const BIO_LIMIT  = 280;
  const bioShort   = speakerBio.length > BIO_LIMIT ? speakerBio.slice(0, BIO_LIMIT) + '…' : speakerBio;
  const hasBioMore = speakerBio.length > BIO_LIMIT;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF"/>
      {/* No AppHeader — matches Figma */}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Thank You ── */}
        <View style={s.thankSection}>
          <TickSvg/>
          <Text style={s.tyTitle}>{'Thank You For Registering'}</Text>
          <Text style={s.tySub}>
            {'Your place has been successfully reserved, and the event has been added to your hub.'}
          </Text>

          {/* Confirmation box */}
          <View style={s.confirmBox}>
            <EmailCircleIcon/>
            <View style={s.confirmTextWrap}>
              <Text style={s.confirmLbl}>{'Confirmation Sent'}</Text>
              <Text style={s.confirmBody}>
                {'A confirmation email with your registration details has been sent to: '}
                <Text style={s.confirmEmail}>{email}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* ── Event Details ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{'Event Details'}</Text>
          <InlineEventCard
            event={event}
            dateLabel={dateLabel}
            timeLabel={timeLabel}
            speakerName={speakerName}
            speakerTitle={speakerTitle}
            cardImage={cardImage}
          />
        </View>

        {/* ── About The Speaker ── */}
        {(speakerName || speakerBio) && (
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

      {/* Done → back to Events */}
      <View style={s.btnWrap}>
        <TouchableOpacity style={s.btn}
          onPress={() => navigation.navigate('Events')} activeOpacity={0.85}>
          <Text style={s.btnTxt}>{'Done'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
});

const s = StyleSheet.create({
  container:      {flex:1, backgroundColor:'#F2F4F7'},
  scroll:         {paddingBottom:24},

  thankSection:   {backgroundColor:'#FFFFFF', alignItems:'center', paddingHorizontal:24, paddingTop:32, paddingBottom:24, marginBottom:8},
  tyTitle:        {fontFamily:'Runda', fontSize:18, fontWeight:'700', color:'#192546', letterSpacing:0.09, marginTop:16, marginBottom:8, textAlign:'center'},
  tySub:          {fontFamily:'Runda', fontSize:14, fontWeight:'400', color:'#192546', lineHeight:20, textAlign:'center', marginBottom:20},

  confirmBox:     {width:'100%', flexDirection:'row', alignItems:'flex-start', gap:12, padding:15, borderRadius:5, borderWidth:1, borderColor:'#E8E9F1', backgroundColor:'#EEF7FC'},
  confirmTextWrap:{flex:1, gap:4},
  confirmLbl:     {fontFamily:'Runda', fontSize:12, fontWeight:'500', color:'#192546'},
  confirmBody:    {fontFamily:'Runda', fontSize:12, fontWeight:'400', color:'#192546', lineHeight:16},
  confirmEmail:   {fontWeight:'600'},

  section:        {backgroundColor:'#FFFFFF', paddingHorizontal:16, paddingVertical:20, marginBottom:8},
  sectionTitle:   {fontFamily:'Runda', fontSize:18, fontWeight:'700', color:'#192546', letterSpacing:0.09, marginBottom:16},

  aboutLbl:       {fontFamily:'Runda', fontSize:14, fontWeight:'500', color:'#0C4D91', marginBottom:10},
  bioNameBold:    {fontFamily:'Runda', fontSize:14, fontWeight:'700', color:'#192546'},
  bioText:        {fontFamily:'Runda', fontSize:14, fontWeight:'400', color:'#192546', lineHeight:22, marginBottom:8},
  viewMoreRow:    {flexDirection:'row', alignItems:'center', gap:4, marginBottom:20},
  viewMoreTxt:    {fontFamily:'Runda', fontSize:14, fontWeight:'500', color:'#0C4D91'},
  metaList:       {gap:16, marginTop:16},
  metaRow:        {flexDirection:'row', alignItems:'flex-start', gap:10},
  metaLbl:        {fontFamily:'Runda', fontSize:14, fontWeight:'700', color:'#192546'},
  metaVal:        {fontFamily:'Runda', fontSize:14, fontWeight:'400', color:'#192546', lineHeight:18},

  btnWrap:        {position:'absolute', bottom:0, left:0, right:0, backgroundColor:'#FFFFFF', paddingHorizontal:24, paddingTop:12, paddingBottom:Platform.OS==='ios'?32:16, borderTopWidth:1, borderTopColor:'#F0F0F0'},
  btn:            {backgroundColor:'#0C4D91', borderRadius:30, paddingVertical:14, alignItems:'center'},
  btnTxt:         {color:'#FFFFFF', fontFamily:'Runda', fontSize:15, fontWeight:'700'},
});

export default EventThankYouScreen;
