/* eslint-disable prettier/prettier */
import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
// The core react-native SafeAreaView is iOS-only (a no-op on Android), which
// is why the header/status bar/notch area was covering the "Badges" title
// and top content on Android. Same fix already applied to StepContentScreen,
// ResourceDetailScreen, DMNewMessageScreen, etc — swap to the real
// cross-platform SafeAreaView.
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop} from 'react-native-svg';
import {getToken} from '../api/apiClient';
import {getUserIdFromToken} from '../api/profileApi';
import BackButton from '../components/BackButton';

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';

// ─── Decode HTML entities ───────────────────────────────────────────────────
// /custom/v1/my-badges never decoded entities at all — profile.full_name/
// position and every badge/activity title, description, label, and
// unlock_hint is a raw WP string (e.g. "Project Leadership &#038;
// Management"), so any ampersand/apostrophe anywhere on this screen rendered
// as literal entity text. Same root cause already fixed elsewhere in this
// project (coursesApi.ts, certificationsApi.ts, etc). The response shape is
// deeply nested and grows over time, so rather than hand-listing every text
// field (and risking missing one), walk the whole response and decode every
// string value found — a no-op for strings with no entities in them.
const decodeEntities = (text?: string | null): string =>
  (text || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/&#8230;/g, '…')
    .trim();

const deepDecodeEntities = <T,>(value: T): T => {
  if (typeof value === 'string') {
    return decodeEntities(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map(v => deepDecodeEntities(v)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const key of Object.keys(value as any)) {
      out[key] = deepDecodeEntities((value as any)[key]);
    }
    return out;
  }
  return value;
};

// ─── API types (mirrors the live /custom/v1/my-badges response) ───────────────

interface ApiProfile {
  user_id: number;
  full_name: string;
  username: string;
  avatar: string;
  position: string;
  country: string;
  flag_url: string;
}

interface ApiProgress {
  current_points: number;
  total_points: number;
  unlock_points: number;
  percentage: number;
  feedback_submitted: boolean;
  member_badge_ready: boolean;
}

interface ApiActivityItem {
  id: string;
  title: string;
  points: number;
  description: string;
  completed: boolean;
  locked: boolean;
  progress_percent: number;
  status: 'pending' | 'in_progress' | 'completed' | 'locked';
  action_url: string | null;
}

interface ApiActivities {
  title: string;
  description: string;
  visible: boolean;
  progress: {current: number; total: number; percentage: number};
  items: ApiActivityItem[];
}

interface ApiEarnedBadge {
  id: number;
  title: string;
  label: string;
  description: string;
  image: string;
  share_url: string;
  is_member: boolean;
  locked: boolean;
  can_download: boolean;
  can_share_linkedin: boolean;
}

interface ApiEarnedBadges {
  title: string;
  description: string;
  has_badges: boolean;
  items: ApiEarnedBadge[];
}

interface ApiEarnMoreBadge {
  id: number;
  title: string;
  label: string;
  description: string;
  image: string;
  locked: boolean;
  status: string;
  unlock_hint: string | null;
  // Optional — not on the endpoint yet (being added). When present, the
  // card shows a filled progress bar + a "current/unlock" points pill
  // (e.g. "10/100") instead of the flat grey "Locked" pill. Naming
  // mirrors ApiProgress's current_points/unlock_points above for
  // consistency. Absent or 0 current_points falls back to the plain
  // "Locked" state.
  current_points?: number;
  unlock_points?: number;
}

interface ApiEarnMoreBadges {
  title: string;
  description: string;
  visible: boolean;
  items: ApiEarnMoreBadge[];
}

interface MyBadgesResponse {
  page_url: string;
  profile: ApiProfile;
  progress: ApiProgress;
  activities: ApiActivities;
  earned_badges: ApiEarnedBadges;
  earn_more_badges: ApiEarnMoreBadges;
}

// userId is optional — omit it to fetch the signed-in user's own badges
// (the original behavior). Pass another member's id to fetch THEIRS
// instead, same ?user_id= param ProfileDrawer's badge-progress fetch
// already uses against this endpoint.
const fetchBadges = async (userId?: number | null): Promise<MyBadgesResponse | null> => {
  try {
    const token = await getToken();
    if (!token) return null;
    const url = userId
      ? `${BASE}/custom/v1/my-badges?user_id=${userId}`
      : `${BASE}/custom/v1/my-badges`;
    const res = await fetch(url, {
      headers: {Authorization: `Bearer ${token}`},
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json ? deepDecodeEntities(json) : null;
  } catch (e) {
    console.log('[BadgesScreen] fetchBadges error:', e);
    return null;
  }
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const TickSvg = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Defs>
      <SvgLinearGradient id="tickGrad" x1="21.3061" y1="1.52" x2="13.7444" y2="23.7568" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#271C7B" />
        <Stop offset="0.50955" stopColor="#1855A4" />
        <Stop offset="1" stopColor="#088ECC" />
      </SvgLinearGradient>
    </Defs>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 24C13.5759 24 15.1363 23.6896 16.5922 23.0866C18.0481 22.4835 19.371 21.5996 20.4853 20.4853C21.5996 19.371 22.4835 18.0481 23.0866 16.5922C23.6896 15.1363 24 13.5759 24 12C24 10.4241 23.6896 8.86371 23.0866 7.4078C22.4835 5.95189 21.5996 4.62902 20.4853 3.51472C19.371 2.40042 18.0481 1.5165 16.5922 0.913445C15.1363 0.310389 13.5759 0 12 0C8.8174 0 5.76516 1.26428 3.51472 3.51472C1.26428 5.76515 0 8.8174 0 12C0 15.1826 1.26428 18.2348 3.51472 20.4853C5.76516 22.7357 8.8174 24 12 24ZM11.6907 16.8533L17.504 9.87738C17.9753 9.31182 17.8989 8.47127 17.3333 7.99996C16.7678 7.52869 15.9273 7.60505 15.4559 8.17054L10.576 14.0253L8.55189 12.0003C8.03137 11.4796 7.18721 11.4795 6.66656 12.0001C6.146 12.5207 6.146 13.3647 6.66656 13.8852L9.724 16.9427C10.2782 17.4969 11.1888 17.4554 11.6907 16.8533Z"
      fill="url(#tickGrad)"
    />
  </Svg>
);

const LockSvg = () => (
  <View style={{
    width: 24, height: 24,
    borderRadius: 39.185,
    backgroundColor: '#E8E9F1',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3.919,
  }}>
    <Svg width={6.531} height={7.837} viewBox="0 0 7 9" fill="none">
      <Path
        d="M1.63477 3.65803V2.02531C1.63477 1.59228 1.80678 1.17699 2.11298 0.870793C2.41918 0.564597 2.83447 0.392578 3.26749 0.392578C3.70052 0.392578 4.11581 0.564597 4.42201 0.870793C4.7282 1.17699 4.90022 1.59228 4.90022 2.02531V3.65803"
        stroke="#8F9098"
        strokeWidth={0.783709}
      />
      <Path
        d="M5.87782 3.6582H0.653091C0.292399 3.6582 0 3.9506 0 4.31129V7.57675C0 7.93744 0.292399 8.22984 0.653091 8.22984H5.87782C6.23851 8.22984 6.53091 7.93744 6.53091 7.57675V4.31129C6.53091 3.9506 6.23851 3.6582 5.87782 3.6582Z"
        fill="#8F9098"
      />
    </Svg>
  </View>
);

const UpArrowSvg = () => (
  <Svg width={13} height={13} viewBox="0 0 13 13" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.4905 10.0476C12.1733 10.3737 11.6588 10.3737 11.3415 10.0476L6.49949 5.07092L1.65746 10.0476C1.34017 10.3737 0.825736 10.3737 0.508442 10.0476C0.191148 9.72144 0.191148 9.19271 0.508442 8.86659L6.49949 2.70898L12.4905 8.86659C12.8078 9.19271 12.8078 9.72144 12.4905 10.0476Z"
      fill="#8F9098"
    />
  </Svg>
);

const DownArrowSvg = () => (
  <Svg width={13} height={13} viewBox="0 0 13 13" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.4905 2.95244C12.1733 2.62633 11.6588 2.62633 11.3415 2.95244L6.49949 7.92908L1.65746 2.95244C1.34017 2.62633 0.825736 2.62633 0.508442 2.95244C0.191148 3.27856 0.191148 3.80729 0.508442 4.13341L6.49949 10.291L12.4905 4.13341C12.8078 3.80729 12.8078 3.27856 12.4905 4.13341Z"
      fill="#8F9098"
    />
  </Svg>
);

// ─── Circular progress (used for in_progress / pending states) ────────────────

const CircularProgress = ({progress, locked}: {progress: number; locked?: boolean}) => {
  if (locked) {
    return <LockSvg />;
  }

  const pct = Math.round(progress * 100);
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * Math.min(progress, 1);

  return (
    <View style={styles.circleWrap}>
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={radius} stroke="#E8E9F1" strokeWidth={2} fill="white" />
        {progress > 0 && (
          <Circle
            cx={12} cy={12} r={radius}
            stroke="#46B0E3"
            strokeWidth={2}
            fill="none"
            strokeDasharray={`${strokeDash} ${circumference}`}
            strokeLinecap="round"
            rotation={-90}
            origin="12,12"
          />
        )}
      </Svg>
      <Text style={styles.circleText}>{pct}%</Text>
    </View>
  );
};

// ─── Activity Row ───────────────────────────────────────────────────────────────
// Per latest direction: rows are NOT interactive beyond expand/collapse.
// No "Go →" button — tapping a row only reveals/hides its description.

const ActivityRow = ({
  activity,
  expanded,
  onToggle,
}: {
  activity: ApiActivityItem;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const progress = (activity.progress_percent ?? 0) / 100;

  return (
    <View style={styles.activityRow}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={styles.activityInner}>
        <View style={styles.scoreFrame}>
          <Text style={styles.scoreText}>+{activity.points}</Text>
        </View>
        <View style={styles.activityBody}>
          <View style={styles.activityTitleRow}>
            <Text style={styles.activityTitle}>{activity.title}</Text>
            <View style={styles.arrowWrap}>
              {expanded ? <UpArrowSvg /> : <DownArrowSvg />}
            </View>
          </View>
          {expanded && (
            <Text style={styles.activityDesc}>{activity.description}</Text>
          )}
        </View>
        <View style={styles.statusWrap}>
          {activity.completed
            ? <TickSvg />
            : <CircularProgress progress={progress} locked={activity.locked} />
          }
        </View>
      </TouchableOpacity>
    </View>
  );
};

// ─── Earned Badge Card ──────────────────────────────────────────────────────────

const EarnedBadgeCard = ({badge}: {badge: ApiEarnedBadge}) => (
  <View style={styles.earnedCard}>
    {/* resizeMode="contain" (not "cover") — badge art comes in different
        natural shapes (wide landscape cards, tall hexagon/shield badges,
        etc). "cover" forces every badge into this box's 163:94 landscape
        ratio and crops whatever doesn't fit — that's why tall/non-landscape
        badges were losing their top and bottom. PublicBadgeCard already
        uses "contain" for the same badge.image field; this just brings
        EarnedBadgeCard in line with it so nothing ever gets cropped,
        letterboxing into the existing #D9D9D9 background instead. */}
    <Image source={{uri: badge.image}} style={styles.earnedImage} resizeMode="contain" />
    <Text style={styles.earnedTitle}>{badge.label}</Text>
    <Text style={styles.earnedDesc}>{badge.description}</Text>
    <View style={styles.earnedBtnRow}>
      {badge.can_download && (
        <TouchableOpacity activeOpacity={0.85} style={styles.downloadBtn}>
          <Text style={styles.downloadBtnText}>Download</Text>
        </TouchableOpacity>
      )}
      {badge.can_share_linkedin && (
        <TouchableOpacity activeOpacity={0.85} style={styles.shareBtnWrap}>
          <LinearGradient
            colors={['#E257E4', '#084D92']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            locations={[0, 0.7035]}
            style={styles.shareBtn}>
            <LinkedInSvg />
            <Text style={styles.shareBtnText}>Share on LinkedIn</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const LinkedInSvg = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M6 0C9.31371 0 12 2.68629 12 6C12 9.31371 9.31371 12 6 12C2.68629 12 0 9.31371 0 6C0 2.68629 2.68629 0 6 0ZM3.08203 4.95166V9H4.47559V4.95166H3.08203ZM7.896 4.85693C7.15659 4.85693 6.82527 5.24954 6.64014 5.52539V4.95166H5.24658C5.26487 5.33152 5.24658 9 5.24658 9H6.64014V6.73926C6.64014 6.61834 6.64929 6.49761 6.68604 6.41113C6.78676 6.1694 7.01598 5.91895 7.40088 5.91895C7.90505 5.91896 8.10693 6.29029 8.10693 6.83447V9H9.5V6.67871C9.49998 5.43537 8.81265 4.85699 7.896 4.85693ZM3.78809 3C3.31168 3.00008 3.00012 3.30217 3 3.69922C3 4.0877 3.30242 4.39893 3.77002 4.39893H3.7793C4.26504 4.39882 4.56738 4.08762 4.56738 3.69922C4.55822 3.30211 4.26468 3 3.78809 3Z"
      fill="#FFF"
    />
  </Svg>
);

// ─── Earn More (locked) Badge Card ──────────────────────────────────────────────

const EarnMoreBadgeCard = ({badge}: {badge: ApiEarnMoreBadge}) => {
  const isSvg = badge.image?.toLowerCase().endsWith('.svg');
  const imageSource = !badge.image || isSvg
    ? require('../assets/images/ipmbadge1.png')
    : {uri: badge.image};

  // Once current_points/unlock_points come through from the API, a badge
  // with some points already earned shows the filled bar + blue "x/y"
  // pill (screenshot 1); anything with no points yet (or the fields
  // simply aren't in the response yet) falls back to the flat grey
  // "Locked" pill + empty bar (screenshot 2).
  const hasProgress = !!badge.current_points && !!badge.unlock_points;
  const pct = hasProgress
    ? Math.min(badge.current_points! / badge.unlock_points!, 1)
    : 0;

  return (
  <View style={styles.lockedCard}>
    <View style={styles.lockedImageWrap}>
      <Image source={imageSource} style={styles.lockedImage} blurRadius={5} resizeMode="cover" />
      <View style={styles.lockIconCenter}>
        <Svg width={36} height={40} viewBox="0 0 36 40" fill="none">
          <Path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M6 12C6 8.8174 7.26428 5.76516 9.51472 3.51472C11.7652 1.26428 14.8174 0 18 0C21.1826 0 24.2348 1.26428 26.4853 3.51472C28.7357 5.76516 30 8.8174 30 12H32C33.0609 12 34.0783 12.4214 34.8284 13.1716C35.5786 13.9217 36 14.9391 36 16V36C36 37.0609 35.5786 38.0783 34.8284 38.8284C34.0783 39.5786 33.0609 40 32 40H4C2.93913 40 1.92172 39.5786 1.17157 38.8284C0.421427 38.0783 0 37.0609 0 36V16C0 14.9391 0.421427 13.9217 1.17157 13.1716C1.92172 12.4214 2.93913 12 4 12H6ZM18 4C20.1217 4 22.1566 4.84285 23.6569 6.34315C25.1571 7.84344 26 9.87827 26 12H10C10 9.87827 10.8429 7.84344 12.3431 6.34315C13.8434 4.84285 15.8783 4 18 4ZM22 24C22 24.7021 21.8151 25.3919 21.4641 25.9999C21.113 26.608 20.6081 27.1129 20 27.464V30C20 30.5304 19.7893 31.0391 19.4142 31.4142C19.0391 31.7893 18.5304 32 18 32C17.4696 32 16.9609 31.7893 16.5858 31.4142C16.2107 31.0391 16 30.5304 16 30V27.464C15.2375 27.0237 14.6415 26.3441 14.3046 25.5306C13.9677 24.7171 13.9086 23.8152 14.1365 22.9647C14.3644 22.1142 14.8665 21.3627 15.5651 20.8266C16.2636 20.2906 17.1195 20 18 20C19.0609 20 20.0783 20.4214 20.8284 21.1716C21.5786 21.9217 22 22.9391 22 24Z"
            fill="white"
          />
        </Svg>
      </View>
    </View>
    <Text style={styles.lockedTitle}>{badge.label}</Text>
    <Text style={styles.lockedDesc}>{badge.description}</Text>
    <View style={styles.lockedProgressRow}>
      <View style={styles.lockedProgressBg}>
        {hasProgress && (
          <View style={[styles.lockedProgressFill, {width: `${pct * 100}%`}]} />
        )}
      </View>
      {hasProgress ? (
        <View style={styles.progressPill}>
          <Text style={styles.progressPillText}>
            {badge.current_points}/{badge.unlock_points}
          </Text>
        </View>
      ) : (
        <View style={styles.lockedPill}>
          <Text style={styles.lockedPillText}>Locked</Text>
        </View>
      )}
    </View>
    {badge.unlock_hint ? <Text style={styles.lockedHint}>{badge.unlock_hint}</Text> : null}
  </View>
  );
};

// ─── Public badge card ──────────────────────────────────────────────────────
// Used only on the "public view" grid below (someone else's earned
// badges) — per Marium's spec: padding 16, column, centered, gap 16,
// radius 5, white bg, shadow "0 0 10.023px -1.822px rgba(0,0,0,.15)".
// Just the badge image + its title underneath, nothing interactive.
const PublicBadgeCard = ({badge}: {badge: ApiEarnedBadge}) => (
  <View style={styles.publicBadgeCard}>
    <Image source={{uri: badge.image}} style={styles.publicBadgeImage} resizeMode="contain" />
    <Text style={styles.publicBadgeTitle}>{badge.label}</Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const BadgesScreen = ({navigation, route}: {navigation: any; route?: any}) => {
  // userId param: passed from MemberProfileScreen's "View Badges" button
  // with THAT profile's own id — see comment there. Omitted (or equal to
  // the signed-in user's own id) means "my badges" and keeps the full,
  // interactive screen below. Any other id means we're looking at
  // someone else's badges and switches to the simplified public grid.
  const paramUserId: number | undefined = route?.params?.userId;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MyBadgesResponse | null>(null);
  const [isOwn, setIsOwn] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const earnMoreY = useRef(0);

  useEffect(() => {
    (async () => {
      const myId = await getUserIdFromToken();
      const own = !paramUserId || String(paramUserId) === String(myId);
      setIsOwn(own);
      const res = await fetchBadges(own ? undefined : paramUserId);
      setData(res);
      setLoading(false);
    })();
  }, [paramUserId]);

  const scrollToEarnMore = () => {
    scrollRef.current?.scrollTo({y: Math.max(earnMoreY.current - 16, 0), animated: true});
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#0C4D91" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.activityDesc}>Couldn't load badges. Pull to refresh.</Text>
      </View>
    );
  }

  // ── Public view: someone else's profile ──────────────────────────────────
  // Just their earned badges as a simple 2-column grid, per Marium's spec —
  // no progress bar, no in-progress activities, no "earn more" section and
  // no download/share actions, since none of those apply to a visitor
  // looking at another member's badges.
  if (!isOwn) {
    const items = data.earned_badges?.items || [];
    return (
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.publicHeaderTitle}>Badges</Text>
          <View style={{width: 32}} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.publicScrollContent}
          showsVerticalScrollIndicator={false}>
          {items.length === 0 ? (
            <Text style={styles.activityDesc}>
              {`${data.profile?.full_name || 'This member'} hasn’t earned any badges yet.`}
            </Text>
          ) : (
            <View style={styles.publicBadgeGrid}>
              {items.map(badge => (
                <PublicBadgeCard key={badge.id} badge={badge} />
              ))}
            </View>
          )}
          <View style={{height: 40}} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const {profile, progress, activities, earned_badges, earn_more_badges} = data;
  const progressPct = progress.total_points > 0
    ? progress.current_points / progress.total_points
    : 0;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Badges</Text>
        <View style={{width: 32}} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Banner ── */}
        <LinearGradient
          colors={['#ECF9FF', '#FFFFFF']}
          start={{x: 0.801, y: 0.9}}
          end={{x: 0.199, y: 0.1}}
          style={styles.banner}>

          <View style={styles.watermarkWrap} pointerEvents="none">
            <Svg width={165} height={165} viewBox="0 0 147 136" fill="none">
              <Path
                d="M96.2508 55.3095C96.2508 62.8925 90.0836 69.0593 82.5 69.0593C74.9164 69.0593 68.7492 62.8925 68.7492 55.3095C68.7492 47.7265 74.9164 41.5598 82.5 41.5598C90.0836 41.5598 96.2508 47.7265 96.2508 55.3095ZM145.534 46.4891C143.89 43.526 141.704 41.2573 139.222 39.6486C134.794 36.7886 132.436 31.5294 133.605 26.3938C134.272 23.4445 134.23 20.2271 133.275 16.8996C131.583 10.9941 126.771 6.18172 120.865 4.4905C117.537 3.53489 114.319 3.49364 111.377 4.16051C106.234 5.32923 100.974 2.97803 98.114 -1.45626C96.5121 -3.93809 94.2363 -6.12429 91.2799 -7.76739C85.9033 -10.7442 79.1036 -10.7442 73.727 -7.76739C70.7637 -6.12429 68.4948 -3.93809 66.8929 -1.45626C64.0327 2.97116 58.773 5.32923 53.6302 4.16051C50.6875 3.49364 47.4699 3.53489 44.1422 4.4905C38.2362 6.18172 33.4234 10.9941 31.7321 16.8996C30.7764 20.2271 30.7351 23.4514 31.4021 26.3938C32.5709 31.5362 30.2126 36.7955 25.7849 39.6486C23.296 41.2504 21.1165 43.526 19.4733 46.4891C17.9675 49.1978 17.2388 52.2777 17.2525 55.3508C17.2388 58.4238 17.9744 61.4969 19.4733 64.2125C21.1165 67.1755 23.3028 69.4442 25.7849 71.053C30.2126 73.9129 32.5709 79.1722 31.4021 84.3077C30.7351 87.257 30.7764 90.4745 31.7321 93.8088C33.4234 99.7143 38.2362 104.527 44.1422 106.218C47.4699 107.174 50.6875 107.215 53.6302 106.548C58.773 105.379 64.0327 107.73 66.8929 112.165C68.4948 114.647 70.7637 116.833 73.727 118.476C79.1036 121.453 85.9102 121.453 91.2799 118.476C94.2432 116.833 96.5121 114.647 98.114 112.165C100.974 107.737 106.234 105.379 111.377 106.548C114.319 107.215 117.537 107.174 120.865 106.218C126.771 104.527 131.583 99.7143 133.275 93.8088C134.23 90.4813 134.272 87.257 133.605 84.3077C132.436 79.1653 134.794 73.906 139.222 71.053C141.711 69.4511 143.89 67.1755 145.534 64.2125C147.039 61.5038 147.768 58.4238 147.754 55.3508C147.768 52.2777 147.032 49.2046 145.534 46.4891ZM82.4244 82.8227C67.2573 82.8227 54.9228 70.4892 54.9228 55.3233C54.9228 40.1573 67.2573 27.8238 82.4244 27.8238C97.5915 27.8238 109.926 40.1573 109.926 55.3233C109.926 70.4892 97.5915 82.8227 82.4244 82.8227ZM55.6928 120.153C50.7013 121.13 45.4072 120.882 40.3538 119.431C30.5701 116.626 22.6222 109.14 19.1707 99.6318L2.42915 116.372C1.1022 117.706 0.256522 119.473 0.0502606 121.356C-0.451643 125.942 2.8623 130.081 7.44819 130.582L22.7184 132.274L24.4029 147.481C24.5954 149.433 25.4686 151.207 26.8024 152.541C27.6756 153.414 28.7413 154.094 29.9445 154.514C32.9972 155.607 36.4142 154.816 38.6281 152.548L63.1801 127.997C60.2375 125.804 57.728 123.185 55.686 120.16L55.6928 120.153ZM164.957 121.35C164.75 119.473 163.905 117.699 162.578 116.365L145.836 99.6249C142.385 109.133 134.43 116.626 124.653 119.425C119.593 120.868 114.312 121.116 109.314 120.146C107.279 123.171 104.763 125.791 101.82 127.984L126.372 152.534C128.593 154.803 132.01 155.593 135.056 154.5C136.259 154.081 137.324 153.4 138.198 152.527C139.531 151.193 140.405 149.413 140.597 147.467L142.282 132.26L157.552 130.569C162.138 130.06 165.452 125.928 164.95 121.343L164.957 121.35Z"
                fill="#084D92"
                fillOpacity={0.08}
              />
            </Svg>
          </View>

          <View style={styles.bannerContent}>
            <View style={styles.avatarWrap}>
              {profile.avatar
                ? <Image source={{uri: profile.avatar}} style={styles.avatar} />
                : <View style={[styles.avatar, styles.avatarPlaceholder]} />
              }
            </View>
            <View style={styles.bannerInfo}>
              <View style={styles.bannerNameRow}>
                <Text style={styles.bannerName}>{profile.full_name || '—'}</Text>
                {!!profile.flag_url && (
                  <Image source={{uri: profile.flag_url}} style={styles.flagIcon} />
                )}
              </View>
              {!!profile.position && (
                <Text style={styles.bannerJob}>{profile.position}</Text>
              )}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.earnBtnOuter}
                onPress={scrollToEarnMore}>
                <LinearGradient
                  colors={['#084D92', '#E257E4']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.earnBtn}>
                  <Text style={styles.earnBtnText}>Earn More Badges</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* ── My Badges ── */}
        {earned_badges.has_badges && (
          <>
            <Text style={styles.sectionTitle}>{earned_badges.title}</Text>
            <Text style={styles.sectionBody}>{earned_badges.description}</Text>
            {earned_badges.items.map(badge => (
              <EarnedBadgeCard key={badge.id} badge={badge} />
            ))}
          </>
        )}

        {/* ── Progress Card ── */}
        {activities.visible && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Your Progress</Text>
              <View style={styles.progressPill}>
                <Text style={styles.progressPillText}>
                  {progress.current_points}/{progress.total_points}
                </Text>
              </View>
            </View>
            <View style={styles.progressBarBg}>
              {progressPct > 0 && (
                <LinearGradient
                  colors={['#46B0E3', '#084D92']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={[styles.progressBarFill, {width: `${progressPct * 100}%`}]}
                />
              )}
            </View>
          </View>
        )}

        {/* ── Activities Card ── */}
        {activities.visible && (
          <View style={styles.activitiesCard}>
            <View style={styles.activitiesHeader}>
              <Text style={styles.activitiesTitle}>Complete Activities</Text>
              <Text style={styles.activitiesCount}>
                {activities.items.filter(a => a.completed).length}/{activities.items.length} Completed
              </Text>
            </View>
            {activities.items.map(item => (
              <ActivityRow
                key={item.id}
                activity={item}
                expanded={expandedId === item.id}
                onToggle={() =>
                  setExpandedId(expandedId === item.id ? null : item.id)
                }
              />
            ))}
          </View>
        )}

        {/* ── Earn More Badges ── */}
        {earn_more_badges.visible && (
          <View onLayout={e => { earnMoreY.current = e.nativeEvent.layout.y; }} style={{marginBottom: 24}}>
            <Text style={styles.sectionTitle}>{earn_more_badges.title}</Text>
            <Text style={styles.sectionBody}>{earn_more_badges.description}</Text>
            {earn_more_badges.items.map(badge => (
              <EarnMoreBadgeCard key={badge.id} badge={badge} />
            ))}
          </View>
        )}

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#FFFFFF'},
  loadingWrap: {flex: 1, justifyContent: 'center', alignItems: 'center'},

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    // Flat padding now — the wrapping SafeAreaView (the real cross-platform
    // one, imported from react-native-safe-area-context above) already
    // reserves the status bar / notch inset on both iOS and Android, so the
    // old iOS-only 52px guess (which also left Android with no inset at
    // all) is no longer needed here.
    paddingTop: 16,
    paddingBottom: 12, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontFamily: 'Runda', fontWeight: '700', fontSize: 18,
    color: '#192647', letterSpacing: 0.09,
  },
  // Public-view header title — per Marium's spec: Heading/H3, 16px/500,
  // lineHeight 20, letterSpacing 0.08 (lighter weight than the "my
  // badges" header since this view has no interactive content below it).
  publicHeaderTitle: {
    fontFamily: 'Runda', fontWeight: '500', fontSize: 16,
    color: '#192546', lineHeight: 20, letterSpacing: 0.08,
  },

  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: 16, paddingTop: 24},

  // Public view grid — screen layout: column, flex-start, gap 16.
  publicScrollContent: {paddingHorizontal: 16, paddingTop: 16, gap: 16},
  publicBadgeGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    columnGap: 16, rowGap: 16,
  },
  // Each badge card — per Marium's spec: padding 16, column, center,
  // gap 16, flex:1 0 0, radius 5, white bg, shadow
  // "0 0 10.023px -1.822px rgba(0,0,0,.15)". Two per row (width ~47%
  // reproduces flex:1 0 0 with wrapping when there are more than two).
  publicBadgeCard: {
    width: '47%',
    padding: 16,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 10.023,
    elevation: 3,
  },
  publicBadgeImage: {
    width: '100%', aspectRatio: 1,
    borderRadius: 8, backgroundColor: '#F5F6FA',
  },
  // Badge title — per Marium's spec: Heading/H4, 14px/500, centered.
  publicBadgeTitle: {
    fontFamily: 'Runda', fontWeight: '500', fontSize: 14,
    color: '#192546', textAlign: 'center',
  },

  // Banner — LinearGradient ROOT, no overflow:hidden
  banner: {
    height: 136,
    borderRadius: 10,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    marginBottom: 24,
  },
  watermarkWrap: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'flex-end',
  },
  bannerContent: {flexDirection: 'row', alignItems: 'center', gap: 16, zIndex: 2, flex: 1, paddingRight: 16},
  avatarWrap: {
    width: 64, height: 64, borderRadius: 32,
    overflow: 'hidden', borderWidth: 2, borderColor: '#FFF',
    flexShrink: 0,
  },
  avatar: {width: 64, height: 64, borderRadius: 32},
  avatarPlaceholder: {backgroundColor: '#C5C6CC'},
  bannerInfo: {gap: 3, flex: 1, minWidth: 0},
  bannerNameRow: {flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6},
  bannerName: {
    fontFamily: 'Runda', fontWeight: '700', fontSize: 16,
    color: '#192546', letterSpacing: 0.08, lineHeight: 20,
    flexShrink: 1, flexWrap: 'wrap',
  },
  flagIcon: {width: 16, height: 12, borderRadius: 2, marginTop: 3},
  bannerJob: {
    fontFamily: 'Runda', fontWeight: '400', fontSize: 14,
    color: '#8F9098', lineHeight: 18, flexShrink: 1, flexWrap: 'wrap',
  },
  earnBtnOuter: {marginTop: 6, alignSelf: 'flex-start'},
  earnBtn: {
    height: 28, paddingHorizontal: 16, borderRadius: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  earnBtnText: {fontFamily: 'Runda', fontWeight: '500', fontSize: 12, color: '#FFF'},

  sectionTitle: {
    fontFamily: 'Runda', fontWeight: '700', fontSize: 18,
    color: '#192647', letterSpacing: 0.09, marginBottom: 4,
  },
  sectionBody: {
    fontFamily: 'Runda', fontWeight: '400', fontSize: 12,
    color: '#192546', lineHeight: 16, marginBottom: 16,
  },

  // ── Earned badge card ──
  // Per Figma spec: height 385, padding 16, flex column, align-items
  // flex-start, gap 24, align-self stretch, flex-shrink 0. Switched from
  // per-element marginBottom to an explicit container gap for the same
  // reason as lockedCard above — one source of truth for the rhythm
  // instead of margins that can drift out of sync.
  earnedCard: {
    backgroundColor: '#FFF', borderRadius: 5,
    padding: 16, height: 385,
    flexDirection: 'column', alignItems: 'flex-start', gap: 24,
    alignSelf: 'stretch', flexShrink: 0,
    shadowColor: '#000', shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15, shadowRadius: 10.023, elevation: 3,
    marginBottom: 24,
  },
  earnedImage: {
    width: '100%', aspectRatio: 163 / 94,
    borderRadius: 8, backgroundColor: '#D9D9D9',
  },
  earnedTitle: {fontFamily: 'Runda', fontWeight: '700', fontSize: 16, color: '#192546'},
  earnedDesc: {fontFamily: 'Runda', fontWeight: '400', fontSize: 12, color: '#192546', lineHeight: 16},
  earnedBtnRow: {flexDirection: 'row', gap: 8, alignSelf: 'stretch'},
  downloadBtn: {
    flex: 1, height: 36, paddingHorizontal: 16, borderRadius: 100, backgroundColor: '#0C4D91',
    justifyContent: 'center', alignItems: 'center',
  },
  downloadBtnText: {fontFamily: 'Runda', fontWeight: '500', fontSize: 14, color: '#FFF'},
  shareBtnWrap: {flex: 1},
  shareBtn: {
    height: 36, paddingHorizontal: 16, borderRadius: 100, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  shareBtnText: {fontFamily: 'Runda', fontWeight: '500', fontSize: 14, color: '#FFF'},

  progressCard: {
    backgroundColor: '#FFF', borderRadius: 8.2, padding: 16,
    shadowColor: '#000', shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 3,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontFamily: 'Runda', fontWeight: '700', fontSize: 14, color: '#192546',
  },
  progressPill: {
    backgroundColor: '#0C4D91', borderRadius: 79, width: 80, height: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  progressPillText: {fontFamily: 'Runda', fontWeight: '500', fontSize: 12, color: '#FFF'},
  progressBarBg: {
    height: 10, backgroundColor: '#E8E9F1', borderRadius: 20, overflow: 'hidden',
  },
  progressBarFill: {height: 10, borderRadius: 20},

  activitiesCard: {
    backgroundColor: '#FFF', borderRadius: 10, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 3,
    marginBottom: 24,
  },
  activitiesHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  activitiesTitle: {
    fontFamily: 'Runda', fontWeight: '700', fontSize: 14, color: '#192546',
  },
  activitiesCount: {
    fontFamily: 'Runda', fontWeight: '400', fontSize: 12,
    color: '#0C4D91', lineHeight: 16,
  },

  // Non-interactive rows: tap only toggles description, no Go button below
  activityRow: {borderTopWidth: 1, borderColor: '#E8E9F1'},
  activityInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16, gap: 10,
  },
  scoreFrame: {
    width: 48, height: 35, borderRadius: 5.5,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(13,154,255,0.06)',
  },
  scoreText: {
    fontFamily: 'Runda', fontWeight: '500', fontSize: 14, color: '#8F9098',
  },
  activityBody: {flex: 1},
  activityTitleRow: {flexDirection: 'row', alignItems: 'center'},
  activityTitle: {
    fontFamily: 'Runda', fontWeight: '700', fontSize: 14,
    color: '#192546', flex: 1, lineHeight: 18,
  },
  arrowWrap: {marginLeft: 6},
  activityDesc: {
    fontFamily: 'Runda', fontWeight: '400', fontSize: 12,
    color: '#8F9098', lineHeight: 16, marginTop: 4,
  },
  statusWrap: {marginLeft: 4},

  circleWrap: {width: 24, height: 24, justifyContent: 'center', alignItems: 'center'},
  circleText: {
    position: 'absolute', fontFamily: 'Runda', fontWeight: '500',
    fontSize: 6.857, color: '#8F9098', textAlign: 'center',
  },

  // ── Locked / "earn more" badge card ──
  // Per updated Figma spec: card radius 5 (was 10), height 423, and a single
  // flex gap:24 between the direct children (image/title/desc/progress row/
  // hint) instead of the old per-element marginBottom values — those had
  // drifted out of sync (a stray marginBottom:8 on the progress row was
  // fighting the 24px rhythm everywhere else, which is why the hint text
  // sat too close to the progress bar).
  lockedCard: {
    backgroundColor: '#FFF', borderRadius: 5,
    padding: 16, height: 423,
    flexDirection: 'column', alignItems: 'flex-start', gap: 24,
    shadowColor: '#000', shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 3,
    marginBottom: 24,
  },
  lockedImageWrap: {
    width: '100%', aspectRatio: 163 / 94,
    borderRadius: 10, overflow: 'hidden',
    backgroundColor: '#D9D9D9',
  },
  lockedImage: {
    width: '100%', height: '100%',
  },
  lockIconCenter: {
    ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center',
  },
  lockedTitle: {fontFamily: 'Runda', fontWeight: '700', fontSize: 16, color: '#192546'},
  lockedDesc: {
    fontFamily: 'Runda', fontWeight: '400', fontSize: 12,
    color: '#192546', lineHeight: 16,
    alignSelf: 'stretch',
  },
  // "progress and btn" row per spec: gap:12, align-self:stretch (no more
  // separate marginBottom — spacing to the hint below now comes from the
  // parent's gap:24).
  lockedProgressRow: {flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch'},
  // Track: height 10 (was 6), fully pill-rounded (rx=5 on a 10px-tall bar
  // == fully round, matches the spec svg).
  lockedProgressBg: {flex: 1, height: 10, backgroundColor: '#E8E9F1', borderRadius: 5, overflow: 'hidden'},
  // Fill: square on the left, rounded only on the right ("0 20px 20px 0" in
  // the spec) so it reads as filling into the track rather than a floating
  // pill — previously this used a uniform borderRadius:20 which rounded
  // all four corners.
  lockedProgressFill: {
    height: 10,
    borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
    borderTopRightRadius: 20, borderBottomRightRadius: 20,
  },
  lockedPill: {
    paddingHorizontal: 14, height: 28, borderRadius: 100,
    backgroundColor: '#E8E9F1', justifyContent: 'center', alignItems: 'center',
  },
  lockedPillText: {fontFamily: 'Runda', fontWeight: '500', fontSize: 12, color: '#8F9098'},
  lockedHint: {
    fontFamily: 'Runda', fontWeight: '400', fontSize: 10,
    color: '#71727A', lineHeight: 14,
  },
});

export default BadgesScreen;
