/* eslint-disable prettier/prettier */
import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, StatusBar, ActivityIndicator, FlatList, Modal, Animated, Dimensions, Alert, Linking} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {Path, Circle, G, Defs, ClipPath, Rect} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import {
  getMentors,
  MentorItem,
  FilterOption,
  EXPERIENCE_FILTERS,
  EXPERTISE_FILTERS,
  INDUSTRY_FILTERS,
} from '../api/mentorsApi';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

// ─── Filter Bottom Sheet ──────────────────────────────────────────────────
const FilterSheet = ({
  visible,
  title,
  items,
  selected,
  onSelect,
  onClose,
  onContinue,
}: any) => {
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

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
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none">
      <View style={sheet.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
        />
      </View>
      <Animated.View
        style={[sheet.container, {transform: [{translateY: slideAnim}]}]}>
        <View style={sheet.header}>
          <Text style={sheet.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={sheet.closeBtn}>
            <Text style={sheet.closeIcon}>{'✕'}</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={items}
          keyExtractor={i => i.value}
          style={sheet.list}
          renderItem={({item}) => (
            <TouchableOpacity
              style={sheet.item}
              onPress={() => onSelect(item.value)}>
              <Text
                style={[
                  sheet.itemText,
                  selected === item.value && sheet.itemTextActive,
                ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
        <TouchableOpacity style={sheet.continueBtn} onPress={onContinue}>
          <Text style={sheet.continueBtnText}>{'Continue'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const sheet = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0C4D91',
    fontFamily: 'Runda',
  },
  closeBtn: {position: 'absolute', right: 16, padding: 4},
  closeIcon: {fontSize: 18, color: '#8F9098'},
  list: {flex: 1},
  item: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  // Figma: Action/Action L — 14px/500, #192546
  itemText: {fontSize: 14, fontWeight: '500', color: '#192546', fontFamily: 'Runda'},
  itemTextActive: {color: '#46B0E3'},
  continueBtn: {
    backgroundColor: '#0C4D91',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'Runda'},
});

// ─── Mentor Card — exact Figma spec ───────────────────────────────────────
// ─── Circular call icon for the Request a Call button — exact Figma SVG ──
const CallIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M0 6C0 9.3085 2.6915 12 6 12C9.3085 12 12 9.3085 12 6C12 2.6915 9.3085 0 6 0C2.6915 0 0 2.6915 0 6ZM2.5 4.445C2.5 4.032 2.649 3.618 2.964 3.3035L2.9765 3.291C3.41336 2.85414 4.12164 2.85414 4.5585 3.291L4.7259 3.4584C5.0703 3.8028 5.0703 4.3612 4.7259 4.7056C4.47609 4.95541 4.39296 5.33405 4.55958 5.64557C4.99205 6.45414 5.59674 7.04865 6.35779 7.44943C6.66778 7.61268 7.04198 7.52652 7.28972 7.27878C7.63671 6.93179 8.19929 6.93179 8.54628 7.27878L8.709 7.4415C9.14586 7.87836 9.14586 8.58664 8.709 9.0235L8.6965 9.036C8.382 9.351 7.968 9.5 7.555 9.5C5.435 9.5 2.5 6.728 2.5 4.445Z"
      fill="#FFFFFF"
    />
  </Svg>
);

// ─── Thin white ring drawn over the avatar edge — exact Figma SVG spec ───
const PhotoRing = () => (
  <Svg
    width={73.972}
    height={73.972}
    viewBox="0 0 74 74"
    fill="none"
    style={StyleSheet.absoluteFillObject}>
    <Path
      d="M36.986 0C57.4128 0 73.972 16.5592 73.972 36.986C73.972 57.4128 57.4128 73.972 36.986 73.972C16.5592 73.972 0 57.4128 0 36.986C0 16.5592 16.5592 0 36.986 0ZM36.986 1.72028C17.5093 1.72028 1.72028 17.5093 1.72028 36.986C1.72028 56.4627 17.5093 72.2517 36.986 72.2517C56.4627 72.2517 72.2517 56.4627 72.2517 36.986C72.2517 17.5093 56.4627 1.72028 36.986 1.72028Z"
      fill="#FFFFFF"
    />
  </Svg>
);

// Small blue divider line under the mentor's job title
const TitleDivider = () => (
  <Svg width={27.151} height={1} viewBox="0 0 28 1" fill="none">
    <Path d="M0 0.46814H27.1512" stroke="#46B0E3" strokeWidth={0.936248} />
  </Svg>
);

// Job title and tags are real, confirmed fields from Robby's custom
// /custom/v1/mentors endpoint (the earlier "doesn't exist" finding was
// specific to the raw WP /wp/v2/mentor post type). bio_snippet also exists
// but isn't shown on this compact card — that's reserved for the mentor
// detail screen, which is a separate file to be built later.
const MAX_VISIBLE_TAGS = 3;

const MentorCard = ({mentor, onRequestCall, navigation}: {mentor: MentorItem; onRequestCall: (m: MentorItem) => void; navigation: any}) => {
  const visibleTags = mentor.tags.slice(0, MAX_VISIBLE_TAGS);
  const extraTagCount = mentor.tags.length - visibleTags.length;
  const hasTitle = mentor.title.length > 0;
  const hasBio = mentor.bioSnippet.length > 0;

  // Whole card taps through to the mentor's full profile (MemberProfileScreen,
  // opened straight on the Mentorship tab). Passing both IDs: userId is what
  // MemberProfileScreen normally keys on everywhere else, but the mentor
  // detail endpoint (/custom/v1/mentors/{mentor_id}) needs mentor_id
  // specifically — and there's no confirmed way to look up mentor_id from
  // userId alone. Passing mentor.id (mentor_id) here sidesteps that gap for
  // this entry point; other paths into the Mentorship tab (e.g. viewing a
  // mentor's own profile directly) will still need that lookup solved.
  const openProfile = () => {
    navigation?.push('MemberProfile', {
      userId: mentor.userId,
      mentorId: mentor.id,
      initialTab: 'mentorship',
    });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={openProfile} activeOpacity={0.9}>
      <View style={styles.cardRow}>
        <View style={styles.avatarFrame}>
          <LinearGradient
            colors={['#E257E4', '#005AB4']}
            start={{x: 0.91, y: 0.08}}
            end={{x: 0.09, y: 0.89}}
            style={styles.avatarGradient}>
            <View style={styles.avatarInner}>
              {mentor.avatar ? (
                <Image source={{uri: mentor.avatar}} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarImg, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>
                    {mentor.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <PhotoRing />
            </View>
          </LinearGradient>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.mentorName} numberOfLines={1}>
            {mentor.name}
          </Text>

          {hasTitle && (
            <>
              <View style={styles.titleField}>
                <Text style={styles.titleText} numberOfLines={1}>
                  {mentor.title}
                </Text>
              </View>
              <TitleDivider />
            </>
          )}

          {/* Bio snippet — real, confirmed field from Robby's custom
              endpoint, wasn't being shown on the card at all before. */}
          {hasBio && (
            <View style={styles.bioField}>
              <Text style={styles.bioText} numberOfLines={3}>
                {mentor.bioSnippet}
              </Text>
            </View>
          )}

          {visibleTags.length > 0 && (
            <View style={styles.tagsRow}>
              {visibleTags.map(tag => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText} numberOfLines={1}>
                    {tag}
                  </Text>
                </View>
              ))}
              {extraTagCount > 0 && (
                <View style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{`+${extraTagCount}`}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.requestBtn}
        onPress={() => onRequestCall(mentor)}
        activeOpacity={0.85}>
        <View style={styles.requestBtnIcon}>
          <CallIcon />
        </View>
        <Text style={styles.requestBtnText}>{'Request a Call'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────
const MentorSkeleton = () => (
  <View style={[styles.card, {opacity: 0.6}]}>
    <View style={styles.cardRow}>
      <View style={[styles.avatarFrame, {width: 123, height: 123, backgroundColor: '#E8E9F1', borderRadius: 8.601}]} />
      <View style={{flex: 1}}>
        <View style={{height: 14, borderRadius: 7, backgroundColor: '#E8E9F1', width: '60%', marginBottom: 10}} />
        <View style={{height: 40, justifyContent: 'center', marginBottom: 10}}>
          <View style={{height: 11, borderRadius: 5, backgroundColor: '#E8E9F1', width: '80%'}} />
        </View>
      </View>
    </View>
    <View style={{height: 40, borderRadius: 10, backgroundColor: '#E8E9F1', alignSelf: 'stretch'}} />
  </View>
);

// ─── "Become a Mentor" promo card — exact Figma SVG/CSS spec ─────────────
// Person icon used in the small floating badges around the illustration
const PersonIcon = () => (
  <Svg width={10.922} height={13.653} viewBox="0 0 11 14" fill="none">
    <Path
      d="M9.28398 7.09951C9.7185 7.09951 10.1352 7.27213 10.4425 7.57938C10.7497 7.88663 10.9223 8.30335 10.9223 8.73786V9.28398C10.9223 11.4368 8.89078 13.6529 5.46116 13.6529C2.03155 13.6529 0 11.4368 0 9.28398V8.73786C0 8.30335 0.172611 7.88663 0.479861 7.57938C0.787112 7.27213 1.20383 7.09951 1.63835 7.09951H9.28398ZM5.46116 0C6.25778 0 7.02177 0.316454 7.58506 0.879746C8.14835 1.44304 8.4648 2.20703 8.4648 3.00364C8.4648 3.80026 8.14835 4.56424 7.58506 5.12754C7.02177 5.69083 6.25778 6.00728 5.46116 6.00728C4.66455 6.00728 3.90056 5.69083 3.33727 5.12754C2.77398 4.56424 2.45752 3.80026 2.45752 3.00364C2.45752 2.20703 2.77398 1.44304 3.33727 0.879746C3.90056 0.316454 4.66455 0 5.46116 0Z"
      fill="#FFFFFF"
    />
  </Svg>
);

// Globe icon used in the center badge
const GlobeIcon = () => (
  <Svg width={37.217} height={37.217} viewBox="0 0 38 38" fill="none">
    <Defs>
      <ClipPath id="globeClip">
        <Rect width={37.2168} height={37.2168} fill="#FFFFFF" />
      </ClipPath>
    </Defs>
    <G clipPath="url(#globeClip)">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.5288 0.299166C16.1768 0.435627 15.7767 0.71863 15.3371 1.22493C14.6625 2.00184 14.0019 3.19122 13.4235 4.75433C12.8071 6.41901 12.3101 8.4388 11.9798 10.6935H22.1315C21.8012 8.4388 21.3034 6.41901 20.6878 4.75433C20.1094 3.19122 19.4488 2.00184 18.7742 1.22493C18.3346 0.71863 17.9337 0.435627 17.5825 0.299166C17.2311 0.288299 16.8802 0.288299 16.5288 0.299166ZM9.62971 10.6935H1.53893C3.51065 5.89254 7.64482 2.20885 12.7296 0.854317C12.1667 1.74054 11.6704 2.78882 11.2417 3.94719C10.5322 5.86541 9.9794 8.16277 9.63049 10.6927M0.778312 21.0956H9.3723C9.25989 19.7526 9.20402 18.4054 9.20482 17.0576C9.20482 15.6775 9.26297 14.3253 9.37307 13.0196H0.778312C0.452529 14.3408 0.288247 15.6968 0.289066 17.0576C0.289066 18.4501 0.458867 19.8023 0.778312 21.0956ZM9.62894 23.4217C9.83751 24.9414 10.1197 26.3758 10.4648 27.6962V32.4801C6.41885 30.7444 3.2144 27.4921 1.53893 23.4209L9.62894 23.4217ZM22.8696 3.94719C22.4408 2.78882 21.9438 1.74054 21.3809 0.853541C26.4672 2.20808 30.6014 5.89177 32.5723 10.6927H24.4808C24.1319 8.16277 23.579 5.86541 22.8696 3.94719ZM33.3337 13.0188H24.7382C24.8274 14.0802 24.8824 15.1712 24.8995 16.283C25.6893 16.2924 26.4727 16.4274 27.2201 16.6831C28.3552 17.0708 30.1602 17.7252 32.6351 18.73C33.0063 18.881 33.3585 19.0257 33.6919 19.1642C33.9496 17.1113 33.8282 15.0278 33.3337 13.0188ZM22.4036 13.0196C22.5092 14.2186 22.5674 15.4213 22.5781 16.6249L22.3982 16.6839C21.2623 17.0715 19.4573 17.7259 16.9831 18.7308C15.4402 19.3581 14.2291 19.8806 13.2994 20.3001C12.8494 20.5025 12.4321 20.7709 12.0612 21.0964H11.7069C11.5887 19.7534 11.53 18.4058 11.5309 17.0576C11.5309 15.6674 11.5929 14.3152 11.7077 13.0196H22.4036ZM23.1511 18.4974C24.2263 18.129 25.3936 18.129 26.4688 18.4974C27.562 18.8711 29.3259 19.5093 31.7605 20.4978C32.971 20.987 34.1723 21.4989 35.3636 22.033C36.2832 22.4478 36.829 23.2984 36.829 24.2218C36.829 25.1453 36.2832 25.9958 35.3636 26.4106C34.1723 26.9445 32.971 27.4561 31.7605 27.9451C29.3259 28.9344 27.562 29.5725 26.4688 29.9455C25.3933 30.3141 24.2257 30.3141 23.1503 29.9455C22.0578 29.5725 20.2939 28.9344 17.8593 27.9451C16.9405 27.5729 16.0265 27.1888 15.1176 26.7929V33.5726C15.1176 33.881 14.9951 34.1768 14.777 34.3949C14.5589 34.6131 14.2631 34.7356 13.9546 34.7356C13.6462 34.7356 13.3503 34.6131 13.1322 34.3949C12.9141 34.1768 12.7916 33.881 12.7916 33.5726V24.3048L12.79 24.2211C12.79 23.2976 13.3367 22.4471 14.2555 22.0322C15.4471 21.4981 16.6485 20.9863 17.8593 20.497C20.2939 19.5085 22.0578 18.8711 23.1511 18.4974ZM22.399 32.1459C21.2747 31.7621 19.4937 31.117 17.056 30.1285C17.0599 31.6357 17.1382 32.6251 17.2227 33.2609C17.2783 33.7029 17.4406 34.1248 17.6956 34.49C17.9506 34.8553 18.2908 35.153 18.6866 35.3574C19.7442 35.904 21.7306 36.6267 24.8095 36.6267C27.8884 36.6267 29.8741 35.904 30.9325 35.3574C31.3283 35.1528 31.6683 34.855 31.9232 34.4896C32.1781 34.1241 32.3402 33.7022 32.3956 33.2601C32.4809 32.6251 32.5584 31.6357 32.563 30.1292C30.1253 31.1178 28.3451 31.7621 27.2209 32.1459C25.6547 32.6809 23.9644 32.6809 22.3982 32.1459"
        fill="#FFFFFF"
      />
    </G>
  </Svg>
);

// Small arrow icon pointing into the "Mentorship" tag. The Figma drop-shadow
// filter is skipped — SVG <filter> support is unreliable on Android/Hermes,
// same reasoning as avoiding unsupported native effects elsewhere in the app.
const TagArrowIcon = () => (
  <Svg width={9.507} height={11.408} viewBox="0 0 20 22" fill="none">
    <Path
      d="M4.85447 5.8049C4.85447 5.62835 4.90363 5.45529 4.99644 5.30511C5.08926 5.15493 5.22206 5.03357 5.37997 4.95461C5.53788 4.87566 5.71465 4.84223 5.89049 4.85809C6.06632 4.87394 6.23426 4.93845 6.3755 5.04438L13.9788 10.7502C14.7089 11.2977 14.321 12.4613 13.4084 12.4613H9.65619C9.51052 12.4612 9.36679 12.4946 9.23608 12.5589C9.10537 12.6232 8.99118 12.7167 8.90232 12.8321L6.55803 15.8884C6.0057 16.609 4.85352 16.2183 4.85352 15.3095L4.85447 5.8049Z"
      fill="#FFFFFF"
    />
  </Svg>
);

// Note: the three floating person badges and the "Mentorship" tag are
// positioned using exact coordinates measured via Figma Inspect against
// the 200x200 illustration frame (see promoPersonBadgeA/B/C and
// mentorshipTag styles below).
const MentorshipPromoCard = ({navigation}: {navigation: any}) => (
  <LinearGradient
    colors={['#E257E4', '#084D92']}
    start={{x: 0, y: 0}}
    end={{x: 0.7035, y: 0}}
    style={styles.promoCard}>
    <View style={styles.promoIllustration}>
      <View style={styles.promoOuterCircle}>
        <Svg width={200} height={200} viewBox="0 0 200 200" fill="none">
          <Circle cx={100} cy={100} r={100} fill="#F9E0FF" />
        </Svg>
      </View>

      <View style={styles.promoInnerCircle}>
        <Svg width={119.094} height={119.094} viewBox="0 0 120 120" fill="none">
          <Circle cx={59.5469} cy={59.5469} r={59.5469} fill="#F1B9FF" />
        </Svg>
      </View>

      <LinearGradient
        colors={['#084D92', '#C157DE']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={styles.promoGlobeBadge}>
        <GlobeIcon />
      </LinearGradient>

      <LinearGradient
        colors={['#084D92', '#C157DE']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={[styles.promoPersonBadge, styles.promoPersonBadgeA]}>
        <PersonIcon />
      </LinearGradient>

      <LinearGradient
        colors={['#084D92', '#C157DE']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={[styles.promoPersonBadge, styles.promoPersonBadgeB]}>
        <PersonIcon />
      </LinearGradient>

      <LinearGradient
        colors={['#084D92', '#C157DE']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={[styles.promoPersonBadge, styles.promoPersonBadgeC]}>
        <PersonIcon />
      </LinearGradient>

      <View style={styles.mentorshipTag}>
        <TagArrowIcon />
        <Text style={styles.mentorshipTagText}>{'Mentorship'}</Text>
      </View>
    </View>

    <Text style={styles.promoHeading}>
      {'Ready to give back and shape the next generation of project professionals?'}
    </Text>
    <Text style={styles.promoBody}>
      {"Join IPM's mentorship programme and support aspiring project managers through structured, meaningful guidance. Share your experience, build your professional profile, and contribute to a global community."}
    </Text>

    <TouchableOpacity
      style={styles.becomeMemberBtn}
      onPress={() => navigation.navigate('MentorApplication')}
      activeOpacity={0.85}>
      <Text style={styles.becomeMemberBtnText}>{'Become a Member'}</Text>
    </TouchableOpacity>
  </LinearGradient>
);

// ─── Main Screen ──────────────────────────────────────────────────────────
const MentorsScreen = ({navigation}: any) => {
  const [mentors, setMentors] = useState<MentorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [experienceFilter, setExperienceFilter] = useState('');
  const [expertiseFilter, setExpertiseFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [whoYouHelpFilter, setWhoYouHelpFilter] = useState('');
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    loadMentors(1, true);
  }, [experienceFilter, expertiseFilter, industryFilter, whoYouHelpFilter]);

  const loadMentors = async (pageNum = 1, reset = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    const result = await getMentors(pageNum, {
      experience: experienceFilter,
      expertise: expertiseFilter,
      industry: industryFilter,
      whoYouHelp: whoYouHelpFilter,
    });

    if (reset) setMentors(result.mentors);
    else setMentors(prev => [...prev, ...result.mentors]);
    setHasMore(result.hasMore);
    setPage(pageNum);
    setLoading(false);
    setLoadingMore(false);
  };

  // Request a Call opens the mentor's Calendly link (calendly_link, falling
  // back to request_call_url) once the backend field is populated — both
  // are confirmed real fields but empty for every mentor seen so far.
  const handleRequestCall = (mentor: MentorItem) => {
    const url = mentor.calendlyLink || mentor.requestCallUrl;
    if (url) {
      Linking.openURL(url).catch(() =>
        Alert.alert('Error', "Couldn't open the booking link. Please try again."),
      );
    } else {
      Alert.alert(
        'Coming Soon',
        `A booking link for ${mentor.name} hasn't been set up yet. We're working on this feature.`,
      );
    }
  };

  const getFilterLabel = (list: FilterOption[], value: string) =>
    list.find(i => i.value === value)?.name || 'All';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{'IPM Mentorship Programme'}</Text>
          <Text style={styles.heroSubtitle}>
            {'Find your mentor. Grow your project career.\nPersonalised guidance from industry leaders to accelerate your PM journey.'}
          </Text>
        </View>

        {/* Discover + filters */}
        <View style={styles.discoverSection}>
          <Text style={styles.discoverTitle}>{'Discover Your Perfect Mentor'}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}>
            <View style={styles.filtersRow}>
              <TouchableOpacity
                style={styles.filterPill}
                onPress={() => setActiveSheet('industry')}>
                <Text style={styles.filterPillText}>
                  {`Industry: ${getFilterLabel(INDUSTRY_FILTERS, industryFilter)}`}
                </Text>
                <Text style={styles.filterChevron}>{'  ▾'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterPill}
                onPress={() => setActiveSheet('expertise')}>
                <Text style={styles.filterPillText}>
                  {`Expertise: ${getFilterLabel(EXPERTISE_FILTERS, expertiseFilter)}`}
                </Text>
                <Text style={styles.filterChevron}>{'  ▾'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterPill}
                onPress={() => setActiveSheet('experience')}>
                <Text style={styles.filterPillText}>
                  {`Experience: ${getFilterLabel(EXPERIENCE_FILTERS, experienceFilter)}`}
                </Text>
                <Text style={styles.filterChevron}>{'  ▾'}</Text>
              </TouchableOpacity>

              {/* "Who You Help" removed — confirmed via GET
                  /custom/v1/mentors/filters that this isn't a real
                  filterable taxonomy on the backend (only industry,
                  expertise, and experience exist there). Re-add if/when
                  Robby adds backend support for it. */}
            </View>
          </ScrollView>
        </View>

        {/* Mentor list */}
        <View style={styles.listWrap}>
          {loading ? (
            <>
              <MentorSkeleton />
              <MentorSkeleton />
            </>
          ) : mentors.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{'No mentors found'}</Text>
              <Text style={styles.emptySubtitle}>{'Try adjusting your filters.'}</Text>
            </View>
          ) : (
            mentors.map(mentor => (
              <MentorCard key={mentor.id} mentor={mentor} onRequestCall={handleRequestCall} navigation={navigation} />
            ))
          )}

          {!loading && hasMore && (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => loadMentors(page + 1)}
              disabled={loadingMore}>
              {loadingMore ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.loadMoreText}>{'Load More Mentors'}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <MentorshipPromoCard navigation={navigation} />

        <View style={{height: 40}} />
      </ScrollView>

      <FilterSheet
        visible={activeSheet === 'industry'}
        title="Filter by Industry"
        items={INDUSTRY_FILTERS}
        selected={industryFilter}
        onSelect={setIndustryFilter}
        onClose={() => setActiveSheet(null)}
        onContinue={() => setActiveSheet(null)}
      />
      <FilterSheet
        visible={activeSheet === 'expertise'}
        title="Filter by Expertise"
        items={EXPERTISE_FILTERS}
        selected={expertiseFilter}
        onSelect={setExpertiseFilter}
        onClose={() => setActiveSheet(null)}
        onContinue={() => setActiveSheet(null)}
      />
      <FilterSheet
        visible={activeSheet === 'experience'}
        title="Filter by Experience"
        items={EXPERIENCE_FILTERS}
        selected={experienceFilter}
        onSelect={setExperienceFilter}
        onClose={() => setActiveSheet(null)}
        onContinue={() => setActiveSheet(null)}
      />
      {/* Who You Help FilterSheet removed along with its pill above —
          unreachable now that nothing sets activeSheet to 'whoYouHelp'. */}

      <ProfileDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigation={navigation}
      />
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F2F4F7'},

  hero: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  // Figma: Heading/H2 — 18px/700, #192647, letterSpacing 0.09
  heroTitle: {
    color: '#192647',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
    marginBottom: 8,
  },
  // Figma: Body/Body M — 14px/400, #192647, lineHeight 18
  heroSubtitle: {
    color: '#192647',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },

  discoverSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  discoverTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#192546',
    marginBottom: 14,
    fontFamily: 'Runda',
  },
  filtersScroll: {flexGrow: 0},
  filtersRow: {flexDirection: 'row', gap: 8},
  // Figma: padding 8px 12px, gap 8, radius 5, background #E8E9F1
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: '#E8E9F1',
  },
  // Figma "Action/Action M" — Navy #192546, 12px, bold, normal line-height
  filterPillText: {fontSize: 12, color: '#192546', fontWeight: '700', fontFamily: 'Runda'},
  filterChevron: {fontSize: 10, color: '#8F9098'},

  listWrap: {paddingHorizontal: 16, paddingTop: 8},

  // Figma "main card": padding 16, align-items center, gap 15, align-self
  // stretch, radius 15, bg #FFF, shadow 0 0 15 rgba(70,177,228,0.25).
  // flex-direction: column (the row below and the button each override
  // the centered cross-axis via their own alignSelf: 'stretch').
  card: {
    flexDirection: 'column',
    alignItems: 'center',
    alignSelf: 'stretch',
    padding: 16,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
    shadowColor: '#46B0E3',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 4,
  },
  // Figma "Layout of card": row, align-items flex-start, gap 15, self-stretch.
  // Gap replaced with marginRight on the avatar frame (Android/Hermes gap bug).
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    marginBottom: 15,
  },
  // Figma "Button TEXT" container — height 36, padding 12/16, radius 5,
  // bg Dark-Blue #0C4D91. Gap 8 done via marginRight on the icon instead
  // of the `gap` property (unreliable on Android/Hermes).
  requestBtn: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#0C4D91',
    borderRadius: 5,
  },
  requestBtnIcon: {marginRight: 8},
  // Figma "Action/Action M" — white, 12px/500, normal line-height
  requestBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Runda',
  },

  // Figma outer avatar frame: 123x123, radius 8.601, purple gradient
  // backdrop. The photo + ring sit inset inside via the exact padding
  // below, which is what actually creates the visible colored border.
  avatarFrame: {
    width: 123,
    height: 123,
    marginRight: 15,
  },
  avatarGradient: {
    width: 123,
    height: 123,
    borderRadius: 8.601,
    paddingTop: 24.944,
    paddingRight: 24.083,
    paddingBottom: 24.084,
    paddingLeft: 24.945,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Inner 73.972 x 73.972 box — exactly what's left after the padding above.
  // Holds the circular photo and the ring overlay together.
  // Figma: the visible photo (67.091px) is smaller than the ring (73.972px)
  // — the ring sits with a visible gap around the photo, not flush against
  // its edge. avatarInner centers the smaller photo within that space.
  avatarInner: {
    width: 73.972,
    height: 73.972,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 67.091,
    height: 67.091,
    borderRadius: 86.014,
  },
  avatarFallback: {
    backgroundColor: '#0C4D91',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {color: '#FFFFFF', fontSize: 22, fontWeight: '800', fontFamily: 'Runda'},

  // Figma "Layout for name+desc+fields": column, align-items flex-start,
  // gap 10, flex: 1 0 0. Gap replaced with marginBottom on each child.
  cardInfo: {flex: 1, flexDirection: 'column', alignItems: 'flex-start'},
  // Figma "Name in Bold" — Heading/H4, #192546, 14px, bold
  mentorName: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '700',
    height: 16,
    alignSelf: 'stretch',
    marginBottom: 10,
  },
  // Figma "title box": no fixed height set here — Figma's literal 11px
  // spec was too short to fit 12px/lh16 text without clipping (same
  // auto-hug-snapshot issue as the Mentorship tag width earlier), so this
  // sizes to content instead while keeping the exact color/font/line-height.
  titleField: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginBottom: 6,
  },
  titleText: {
    color: '#71727A',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  // Bio snippet — Figma spec: height 40, Navy #192546, 10px/400, lh 14
  bioField: {
    height: 40,
    flexDirection: 'column',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginBottom: 10,
  },
  bioText: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 14,
  },
  // Figma "Other tags" row — wraps; gap replaced with chip margins
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'stretch',
  },
  // Figma tag chip: radius 3, bg Neutral-Light-Medium #E8E9F1
  tagChip: {
    borderRadius: 3,
    backgroundColor: '#E8E9F1',
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
    maxWidth: 150,
  },
  // Figma tag text was 8px/500, lh 12 — bumped to 10px/lh14 for legibility
  // on device (flagged by Marium as too small).
  tagChipText: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
  },

  emptyState: {alignItems: 'center', paddingVertical: 60},
  emptyTitle: {fontSize: 18, fontWeight: '700', color: '#192546', marginBottom: 8, fontFamily: 'Runda'},
  emptySubtitle: {fontSize: 14, color: '#8F9098', fontFamily: 'Runda'},

  // Figma "Load More Members Button" — height 40, padding 12/16, pill
  // radius 50, bg Navy #192546
  loadMoreBtn: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#192546',
    borderRadius: 50,
    marginBottom: 16,
  },
  // Figma "btn text" — Action/Action M, white, 12px/500, normal line-height
  loadMoreText: {color: '#FFFFFF', fontSize: 12, fontWeight: '500', fontFamily: 'Runda'},

  // ─── Mentorship promo card ────────────────────────────────────────────
  // Figma "frame after the btn" — padding 24, radius 15, purple→blue
  // gradient. Gap 36 (between illustration and text block) replaced with
  // marginBottom on the illustration, per the no-`gap`-on-Android rule.
  promoCard: {
    alignItems: 'center',
    alignSelf: 'stretch',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 24,
    borderRadius: 15,
  },
  // 200x200 relative box holding the concentric circles + badges + tag,
  // all absolutely positioned within it.
  promoIllustration: {
    width: 200,
    height: 200,
    marginBottom: 36,
  },
  // Each layer below gets explicit zIndex + elevation. Android's elevation
  // can override plain JSX paint order for stacking siblings, and the
  // person badges were getting partially covered by the flat-color circles
  // drawn "underneath" them, showing only a sliver of their real gradient
  // colour. Explicit stacking removes the ambiguity on both platforms.
  promoOuterCircle: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 200,
    height: 200,
    zIndex: 1,
    elevation: 1,
  },
  // Centered: (200 - 119.094) / 2 = 40.453
  promoInnerCircle: {
    position: 'absolute',
    top: 40.453,
    left: 40.453,
    width: 119.094,
    height: 119.094,
    zIndex: 2,
    elevation: 2,
  },
  // Centered: (200 - 68.932) / 2 = 65.534. Figma's inset box-shadow isn't
  // reproducible with RN's outer-only shadow support, so it's left off
  // rather than faked with a mismatched effect.
  promoGlobeBadge: {
    position: 'absolute',
    top: 65.534,
    left: 65.534,
    width: 68.932,
    height: 68.932,
    borderRadius: 34.466,
    paddingTop: 9.709,
    paddingRight: 6.472,
    paddingBottom: 6.472,
    paddingLeft: 9.709,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    elevation: 3,
  },
  // Shared badge for the three floating person icons. Positions below are
  // exact — measured via Figma Inspect against the 200x200 illustration
  // frame (each top+height+bottom and left+width+right sums to ~200).
  promoPersonBadge: {
    position: 'absolute',
    width: 23.625,
    height: 23.625,
    borderRadius: 11.812,
    padding: 1.618,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
    elevation: 4,
  },
  promoPersonBadgeA: {top: 10, left: 100}, // top badge, ~12 o'clock
  promoPersonBadgeB: {top: 119, left: 162}, // "mid" badge, near the tag
  // Confirmed via Figma Inspect: top=143, left=30.7, right=146, bottom=33.2
  // (30.7+23.625+146≈200, 143+23.625+33.2≈200) — moved to the left side.
  promoPersonBadgeC: {top: 143, left: 30.7},
  // "Mentorship" tag — solid navy pill with a white glow shadow. Position
  // exact — measured via Figma Inspect against the 200x200 frame.
  mentorshipTag: {
    position: 'absolute',
    top: 95,
    left: 123,
    // No fixed width — 56.945px from Figma was the auto-hug result for
    // this exact text/font combo, not an intended constraint. Locking it
    // in was forcing "Mentorship" to wrap onto two lines. Letting the row
    // size itself to its content (padding + icon + gap + text) instead.
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3.236,
    paddingHorizontal: 6.472,
    borderRadius: 32.362,
    backgroundColor: '#084D92',
    shadowColor: '#FFFFFF',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.65,
    shadowRadius: 4.854,
    elevation: 5,
    zIndex: 5,
  },
  mentorshipTagText: {
    color: '#FFFFFF',
    fontFamily: 'Runda',
    fontSize: 8,
    fontWeight: '500',
    marginLeft: 3.236,
  },
  // Figma "Ready to give..." — Heading/H2, white, 18px, bold, ls 0.09
  promoHeading: {
    color: '#FFFFFF',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  // Figma "Join IPM's mentorship..." — Body/Body M, white, 14px/400, lh 18
  promoBody: {
    color: '#FFFFFF',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  // Figma "Become a Member btn" — height 36, padding 12/16, radius 5, white bg
  becomeMemberBtn: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
  },
  // Figma "btn text" — Action/Action M, Dark-Blue #0C4D91, 12px/500
  becomeMemberBtnText: {
    color: '#0C4D91',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default MentorsScreen;
