/* eslint-disable prettier/prettier */
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
// Was importing SafeAreaView from 'react-native' — that core component is
// iOS-only (a no-op on Android), so the close (X) button and Post button
// sat under the Android status bar. Swapped to the real cross-platform
// SafeAreaView, which measures the actual device inset on both platforms.
import {SafeAreaView} from 'react-native-safe-area-context';
import {launchImageLibrary} from 'react-native-image-picker';
import * as Keychain from 'react-native-keychain';
import Svg, {Path, Circle} from 'react-native-svg';
import ScheduleModal from '../components/ScheduleModal';
import {updateActivity, resolveFullName} from '../api/feedApi';

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getToken = async (): Promise<string | null> => {
  try {
    const c = await Keychain.getGenericPassword();
    if (!c?.password) return null;
    return JSON.parse(c.password)?.token ?? null;
  } catch {
    return null;
  }
};

// Custom base64 decode — NEVER use atob(), unavailable in Hermes
const b64decode = (str: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  str = str.replace(/[^A-Za-z0-9+/=]/g, '');
  for (let bc = 0, bs = 0, buffer, i = 0; (buffer = str.charAt(i++)); ) {
    buffer = chars.indexOf(buffer);
    if (buffer === -1) continue;
    bs = bc % 4 ? bs * 64 + buffer : buffer;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return output;
};

// Decodes JWT payload to extract real user ID — matches profileApi.ts logic.
// Never trust a separately-stored "userId" field; always derive from the token.
const getUserId = async (): Promise<number | null> => {
  try {
    const c = await Keychain.getGenericPassword();
    if (!c?.password) return null;
    const stored = JSON.parse(c.password);
    if (stored?.userId) return Number(stored.userId);
    const token = stored?.token;
    if (!token) return null;
    const payload = JSON.parse(b64decode(token.split('.')[1]));
    return Number(payload?.data?.user?.id) || null;
  } catch {
    return null;
  }
};

const buildScheduledISO = (date: string, time: string, meridiem: 'AM' | 'PM'): string => {
  let [hours, minutes] = time.split(':').map(Number);
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${date}T${hh}:${mm}:00`;
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const ClockIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M8 0C12.4183 0 16 3.58172 16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0ZM7.90137 3.9502C7.57417 3.9502 7.30873 4.2158 7.30859 4.54297V8.49316C7.30859 9.03863 7.75141 9.48145 8.29688 9.48145H11.2598C11.5868 9.48119 11.8515 9.21578 11.8516 8.88867C11.8514 8.56166 11.5867 8.29616 11.2598 8.2959H8.49414V4.54297C8.49401 4.21584 8.22852 3.95025 7.90137 3.9502Z" fill="#7C86A1" />
  </Svg>
);

const ChevronDownIcon = () => (
  <Svg width={7} height={5} viewBox="0 0 7 5" fill="none">
    <Path d="M2.86343 4.57303C3.00895 4.77855 3.29401 4.77855 3.43953 4.57303L6.22683 0.636272C6.41084 0.37638 6.24044 -4.81606e-05 5.93878 -4.81606e-05H0.364181C0.0625254 -4.81606e-05 -0.107876 0.37638 0.0761323 0.636272L2.86343 4.57303Z" fill="#7C86A1" />
  </Svg>
);

const SmileyIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M0.999941 8C0.999941 4.13401 4.13395 0.999971 7.99994 0.999971C11.8659 0.999971 14.9999 4.13401 14.9999 8C14.9999 11.866 11.8659 15 7.99994 15C4.13395 15 0.999941 11.866 0.999941 8ZM3.7207 10.1245C3.7207 10.4995 4.1511 11.0413 4.39996 11.2889C5.52502 12.4094 7.22501 13.0178 8.77425 12.8028C10.011 12.6224 10.7599 12.1233 11.5883 11.3044C11.8428 11.0527 12.2834 10.5059 12.2834 10.1245C12.2834 9.82383 11.7184 9.37105 11.3078 9.99271C10.5234 11.1808 9.43707 11.8431 7.97073 11.8431C6.82601 11.8431 5.70775 11.3168 5.00596 10.433C4.27397 9.35086 3.7207 9.83839 3.7207 10.1245ZM10.2803 5.99891C10.2803 7.32987 12.1942 7.40015 12.3041 6.05338C12.3428 5.57915 11.8573 5.03027 11.4053 5.03027C10.5531 5.03027 10.2803 5.47398 10.2803 5.99891ZM3.68555 6.03021C3.68555 6.81795 4.11626 7.03016 4.65419 7.03016C5.67432 7.03016 6.00127 5.96417 5.44378 5.33437C5.19665 5.05516 4.91446 5.03027 4.59174 5.03027C4.11626 5.03027 3.68555 5.57962 3.68555 6.03021Z" fill="#8F9098" />
  </Svg>
);

const CameraIconSmall = () => (
  <Svg width={16} height={15} viewBox="0 0 16 15" fill="none">
    <Path d="M10.0364 7.82057C10.0364 8.51196 9.77205 9.17502 9.3015 9.6639C8.83096 10.1528 8.19276 10.4274 7.5273 10.4274C6.86185 10.4274 6.22365 10.1528 5.7531 9.6639C5.28255 9.17502 5.0182 8.51196 5.0182 7.82057C5.0182 7.12919 5.28255 6.46613 5.7531 5.97725C6.22365 5.48837 6.86185 5.21372 7.5273 5.21372C8.19276 5.21372 8.83096 5.48837 9.3015 5.97725C9.77205 6.46613 10.0364 7.12919 10.0364 7.82057ZM4.10991 1.08185C4.26609 0.756814 4.50635 0.483421 4.80373 0.292331C5.10111 0.101241 5.44385 1.22718e-05 5.79351 0H9.26109C9.61075 1.22718e-05 9.9535 0.101241 10.2509 0.292331C10.5483 0.483421 10.7885 0.756814 10.9447 1.08185L11.6786 2.60686H12.5455C13.211 2.60686 13.8492 2.88151 14.3197 3.37039C14.7903 3.85927 15.0546 4.52233 15.0546 5.21372V11.7309C15.0546 12.4222 14.7903 13.0853 14.3197 13.5742C13.8492 14.0631 13.211 14.3377 12.5455 14.3377H2.5091C1.84365 14.3377 1.20545 14.0631 0.734899 13.5742C0.264351 13.0853 0 12.4222 0 11.7309V5.21372C0 4.52233 0.264351 3.85927 0.734899 3.37039C1.20545 2.88151 1.84365 2.60686 2.5091 2.60686H3.376L4.10991 1.08185ZM11.291 7.82057C11.291 6.7835 10.8944 5.78891 10.1886 5.05558C9.48278 4.32226 8.52549 3.91029 7.5273 3.91029C6.52912 3.91029 5.57182 4.32226 4.866 5.05558C4.16018 5.78891 3.76365 6.7835 3.76365 7.82057C3.76365 8.85765 4.16018 9.85224 4.866 10.5856C5.57182 11.3189 6.52912 11.7309 7.5273 11.7309C8.52549 11.7309 9.48278 11.3189 10.1886 10.5856C10.8944 9.85224 11.291 8.85765 11.291 7.82057Z" fill="#8F9098" />
  </Svg>
);

// Camera toolbar icon (square with rounded corners)
const CameraBoxIcon = () => (
  <Svg width={25} height={25} viewBox="0 0 25 25" fill="none">
    <Path d="M5 8.58079C5 6.91102 6.24818 5.66284 7.78789 5.66284H12.2743C11.8822 6.25429 11.658 6.9493 11.5645 7.6927L11.5769 12.1763C11.5802 12.5617 11.7238 12.9275 11.9787 13.2086L12.086 13.3155C12.367 13.5703 12.7325 13.7139 13.1136 13.7173C13.2349 13.718 13.3557 13.7044 13.4734 13.6772L13.4804 13.9223C13.5643 14.7837 13.8941 15.5456 14.4998 16.1513C15.2391 16.8905 16.106 17.1727 16.9878 17.1672V17.1679C17.8369 17.1631 18.6092 16.8255 19.3377 16.1524V17.2127C19.3377 18.7524 18.0895 20.0006 16.5498 20.0006H7.78789C6.24818 20.0006 5 18.7524 5 17.2127V8.45073V8.58079Z" fill="#8F9098" />
    <Path d="M13.6797 5.84768C13.1688 6.30933 12.8615 6.97898 12.7529 7.84157L12.7744 12.1698C12.7752 12.263 12.8127 12.3522 12.8786 12.4182C12.9445 12.4841 13.0337 12.5216 13.127 12.5224C13.2182 12.5228 13.303 12.4836 13.3739 12.4212L13.4493 12.1742L13.4251 7.89272C13.5371 7.22935 13.7746 6.71182 14.1531 6.37049C14.6646 5.90888 15.2173 5.7188 15.8499 5.70165C16.4694 5.68487 17.1048 5.9082 17.634 6.43732C18.042 6.84538 18.2741 7.30781 18.3391 7.83332L18.4296 13.9198C18.3924 14.2739 18.2477 14.5791 17.9953 14.8122C17.6384 15.1406 17.3082 15.271 16.9709 15.2729C16.5475 15.2757 16.1803 15.155 15.8397 14.8144C15.5688 14.5434 15.4135 14.2023 15.3714 13.7768L15.3161 8.39986C15.3065 8.09105 15.349 7.89065 15.4225 7.79069C15.5487 7.63414 15.7156 7.55527 15.9011 7.55527C16.0839 7.56027 16.2236 7.6314 16.3521 7.78849C16.433 7.88732 16.4801 8.0093 16.4926 8.16444L16.5518 13.1129C16.5532 13.206 16.5911 13.2949 16.6574 13.3604C16.7237 13.4258 16.8131 13.4627 16.9063 13.463C17.0006 13.463 17.0852 13.4233 17.1524 13.3604L17.2269 13.2468C17.244 13.2043 17.2524 13.1589 17.2517 13.1131L17.1917 8.14024C17.1664 7.82223 17.0668 7.56346 16.892 7.34928C16.6353 7.03545 16.303 6.86614 15.9121 6.85508C15.5046 6.84872 15.1369 6.98213 14.8571 7.37101C14.6758 7.61807 14.6019 7.9635 14.6162 8.40618L14.672 13.8062C14.732 14.4217 14.9576 14.9163 15.3475 15.3061C15.8376 15.7962 16.3863 15.9764 16.9835 15.9725C17.4941 15.9696 17.9894 15.7746 18.4728 15.3298C18.853 14.9788 19.0725 14.5156 19.1279 13.9569L19.0363 7.79344C18.9495 7.07045 18.6438 6.46318 18.1254 5.94476C17.4499 5.26931 16.6254 4.97904 15.8221 5.00117C15.0342 5.02296 14.3238 5.26653 13.6797 5.84768Z" fill="#8F9098" />
  </Svg>
);

const VideoIcon = () => (
  <Svg width={25} height={25} viewBox="0 0 25 25" fill="none">
    <Path d="M6.58079 6C5.89632 6 5.23989 6.2719 4.7559 6.7559C4.2719 7.23989 4 7.89632 4 8.58079V16.3232C4 17.0076 4.2719 17.6641 4.7559 18.1481C5.23989 18.632 5.89632 18.9039 6.58079 18.9039H13.678C14.3624 18.9039 15.0189 18.632 15.5029 18.1481C15.9868 17.6641 16.2588 17.0076 16.2588 16.3232V8.58079C16.2588 7.89632 15.9868 7.23989 15.5029 6.7559C15.0189 6.2719 14.3624 6 13.678 6H6.58079Z" fill="#8F9098" />
    <Path d="M19.9545 17.2984L18.1914 15.3679V9.54069L19.9545 7.61025C20.5733 6.93208 21.6325 7.41218 21.6325 8.37094V16.5377C21.6325 17.4964 20.5733 17.9765 19.9545 17.2984Z" fill="#8F9098" />
  </Svg>
);

const AttachIcon = () => (
  <Svg width={25} height={25} viewBox="0 0 25 25" fill="none">
    <Path d="M15.0333 12.8182C15.0333 13.5094 14.7691 14.1722 14.2987 14.6609C13.8283 15.1497 13.1903 15.4242 12.525 15.4242C11.8597 15.4242 11.2217 15.1497 10.7513 14.6609C10.2809 14.1722 10.0167 13.5094 10.0167 12.8182C10.0167 12.127 10.2809 11.4642 10.7513 10.9754C11.2217 10.4867 11.8597 10.2121 12.525 10.2121C13.1903 10.2121 13.8283 10.4867 14.2987 10.9754C14.7691 11.4642 15.0333 12.127 15.0333 12.8182ZM9.10865 6.08152C9.26478 5.75658 9.50497 5.48327 9.80226 5.29224C10.0995 5.10121 10.4422 5.00001 10.7917 5H14.2583C14.6078 5.00001 14.9505 5.10121 15.2477 5.29224C15.545 5.48327 15.7852 5.75658 15.9413 6.08152L16.675 7.60606H17.5417C18.2069 7.60606 18.8449 7.88063 19.3153 8.36936C19.7857 8.85809 20.05 9.52095 20.05 10.2121V16.7273C20.05 17.4184 19.7857 18.0813 19.3153 18.57C18.8449 19.0588 18.2069 19.3333 17.5417 19.3333H7.50833C6.84308 19.3333 6.20508 19.0588 5.73467 18.57C5.26427 18.0813 5 17.4184 5 16.7273V10.2121C5 9.52095 5.26427 8.85809 5.73467 8.36936C6.20508 7.88063 6.84308 7.60606 7.50833 7.60606H8.37496L9.10865 6.08152Z" fill="#8F9098" />
  </Svg>
);

// ─── Add Photos large icon ────────────────────────────────────────────────────
const AddPhotosIcon = () => (
  <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <Circle cx="20" cy="20" r="20" fill="#E8E9F1" />
    <Path d="M25.0364 19.8206C25.0364 20.512 24.7721 21.175 24.3015 21.6639C23.831 22.1528 23.1928 22.4274 22.5273 22.4274C21.8619 22.4274 21.2237 22.1528 20.7531 21.6639C20.2826 21.175 20.0182 20.512 20.0182 19.8206C20.0182 19.1292 20.2826 18.4661 20.7531 17.9773C21.2237 17.4884 21.8619 17.2137 22.5273 17.2137C23.1928 17.2137 23.831 17.4884 24.3015 17.9773C24.7721 18.4661 25.0364 19.1292 25.0364 19.8206ZM19.1099 13.0819C19.2661 12.7568 19.5063 12.4834 19.8037 12.2923C20.1011 12.1012 20.4439 12 20.7935 12H24.2611C24.6108 12 24.9535 12.1012 25.2509 12.2923C25.5483 12.4834 25.7885 12.7568 25.9447 13.0819L26.6786 14.6069H27.5455C28.211 14.6069 28.8492 14.8815 29.3197 15.3704C29.7903 15.8593 30.0546 16.5223 30.0546 17.2137V23.7309C30.0546 24.4222 29.7903 25.0853 29.3197 25.5742C28.8492 26.0631 28.211 26.3377 27.5455 26.3377H17.5091C16.8437 26.3377 16.2055 26.0631 15.7349 25.5742C15.2644 25.0853 15 24.4222 15 23.7309V17.2137C15 16.5223 15.2644 15.8593 15.7349 15.3704C16.2055 14.8815 16.8437 14.6069 17.5091 14.6069H18.376L19.1099 13.0819ZM26.291 19.8206C26.291 18.7835 25.8944 17.7889 25.1886 17.0556C24.4828 16.3223 23.5255 15.9103 22.5273 15.9103C21.5291 15.9103 20.5718 16.3223 19.866 17.0556C19.1602 17.7889 18.7637 18.7835 18.7637 19.8206C18.7637 20.8577 19.1602 21.8522 19.866 22.5856C20.5718 23.3189 21.5291 23.7309 22.5273 23.7309C23.5255 23.7309 24.4828 23.3189 25.1886 22.5856C25.8944 21.8522 26.291 20.8577 26.291 19.8206Z" fill="#8F9098" />
  </Svg>
);

interface PickedImage {
  uri: string;
  type: string;
  fileName: string;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
const CreatePostScreen = ({navigation, route}: any) => {
  const editMode = route?.params?.editMode ?? false;
  const editPostId = route?.params?.postId ?? null;
  const initialContent = route?.params?.initialContent ?? '';
  const postType = route?.params?.type || 'post';

  const [content, setContent] = useState(editMode ? initialContent : '');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [posting, setPosting] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showSchedule, setShowSchedule] = useState(false);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadProfile();
    setTimeout(() => inputRef.current?.focus(), 400);
  }, []);

  const loadProfile = async () => {
    try {
      const token = await getToken();
      const userId = await getUserId();
      if (!token || !userId) return;
      const res = await fetch(
        `${BASE}/buddyboss/v1/members/${userId}?xprofile=1`,
        {headers: {Authorization: `Bearer ${token}`}},
      );
      if (res.ok) {
        const data = await res.json();
        setProfile({...data, name: resolveFullName(data, data?.name)});
      }
    } catch {}
  };

  const handlePickImage = () => {
    launchImageLibrary(
      {mediaType: 'photo', selectionLimit: 4, quality: 0.8},
      res => {
        if (res.errorCode) {
          Alert.alert(
            'Could not open photos',
            res.errorMessage ||
              'Please allow access to your photos in Android Settings and try again.',
          );
          return;
        }
        if (res.assets) {
          const picked: PickedImage[] = res.assets
            .filter(a => !!a.uri)
            .map(a => ({
              uri: a.uri as string,
              type: a.type || 'image/jpeg',
              fileName:
                a.fileName ||
                `photo_${Date.now()}.${(a.type || 'image/jpeg').split('/')[1] || 'jpg'}`,
            }));
          setImages(prev => [...prev, ...picked].slice(0, 4));
        }
      },
    );
  };

  const uploadImages = async (token: string): Promise<{ids: number[]; failed: number}> => {
    const ids: number[] = [];
    let failed = 0;
    for (const img of images) {
      try {
        const formData = new FormData();
        formData.append('file', {uri: img.uri, type: img.type, name: img.fileName} as any);
        formData.append('upload_privacy', 'public');
        const res = await fetch(`${BASE}/buddyboss/v1/media`, {
          method: 'POST',
          headers: {Authorization: `Bearer ${token}`},
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.id) {
            ids.push(data.id);
          } else {
            failed++;
            console.log('uploadImages: no media id in response', img.fileName, data);
          }
        } else {
          failed++;
          const body = await res.text().catch(() => '');
          console.log(`uploadImages: upload failed for ${img.fileName} (${res.status})`, body);
        }
      } catch (err: any) {
        failed++;
        console.log(`uploadImages: exception uploading ${img.fileName}`, err?.message || err);
      }
    }
    return {ids, failed};
  };

  const handlePost = async () => {
    if (!content.trim()) {
      Alert.alert('Empty Post', 'Please write something before posting.');
      return;
    }
    setPosting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not logged in');

      if (editMode && editPostId) {
        const ok = await updateActivity(editPostId, content.trim());
        if (ok) {
          navigation.goBack();
        } else {
          Alert.alert('Error', 'Could not update post. Try again.');
        }
        return;
      }

      const {ids: mediaIds, failed} = await uploadImages(token);
      if (failed > 0) {
        const proceed = await new Promise<boolean>(resolve => {
          Alert.alert(
            'Photo upload problem',
            failed === images.length
              ? "Your photo(s) couldn't be uploaded. Post without them anyway?"
              : `${failed} of ${images.length} photo(s) couldn't be uploaded. Post with just the rest?`,
            [
              {text: 'Cancel', style: 'cancel', onPress: () => resolve(false)},
              {text: 'Post Anyway', onPress: () => resolve(true)},
            ],
          );
        });
        if (!proceed) {
          setPosting(false);
          return;
        }
      }
      const body: any = {
        content: content.trim(),
        type: 'activity_update',
        component: 'activity',
      };
      if (mediaIds.length > 0) body.bp_media_ids = mediaIds;

      const res = await fetch(`${BASE}/buddyboss/v1/activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        navigation.goBack();
      } else {
        const err = await res.json();
        Alert.alert('Error', err?.message || 'Could not post. Try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setPosting(false);
    }
  };

  const handleSchedule = async (date: string, time: string, meridiem: 'AM' | 'PM') => {
    if (!content.trim()) {
      Alert.alert('Empty Post', 'Please write something before scheduling.');
      setShowSchedule(false);
      return;
    }
    setScheduling(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not logged in');

      const scheduledISO = buildScheduledISO(date, time, meridiem);
      const {ids: mediaIds} = await uploadImages(token);

      const body: any = {
        content: content.trim(),
        type: 'activity_update',
        component: 'activity',
        scheduled_date: scheduledISO,
      };
      if (mediaIds.length > 0) body.bp_media_ids = mediaIds;

      const res = await fetch(`${BASE}/buddyboss/v1/activity`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowSchedule(false);
        Alert.alert(
          'Post Scheduled! ✅',
          `Your post has been scheduled for ${date} at ${time} ${meridiem}`,
          [{text: 'OK', onPress: () => navigation.goBack()}],
        );
        return;
      }

      // Fallback: WordPress scheduled post
      const wpRes = await fetch(`${BASE}/wp/v2/posts`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify({
          title: content.trim().slice(0, 80),
          content: content.trim(),
          status: 'future',
          date: scheduledISO,
        }),
      });

      if (wpRes.ok) {
        setShowSchedule(false);
        Alert.alert(
          'Post Scheduled! ✅',
          `Your post has been scheduled for ${date} at ${time} ${meridiem}`,
          [{text: 'OK', onPress: () => navigation.goBack()}],
        );
      } else {
        const err = await wpRes.json();
        Alert.alert('Error', err?.message || 'Could not schedule post.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setScheduling(false);
    }
  };

  const canPost = content.trim().length > 0;
  const firstName = profile?.name?.split(' ')[0] || '';
  const placeholder = `Any PM insights or recent projects to share, ${firstName}...`;

  const jobTitle = profile?.xprofile?.groups?.['1']?.fields?.['1097']?.value?.raw || '';
  const company = profile?.xprofile?.groups?.['1']?.fields?.['1187']?.value?.raw || '';
  const subtitle = jobTitle && company
    ? `${jobTitle} at ${company}`
    : jobTitle || company || '';

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* ── Header ── */}
        <View style={s.header}>
          {/* Close (X) on left */}
          <TouchableOpacity
            style={s.closeBtn}
            onPress={() => navigation.goBack()}>
            <Text style={s.closeIcon}>{'✕'}</Text>
          </TouchableOpacity>

          <View style={s.headerRight}>
            {/* Clock + chevron — schedule trigger */}
            {!editMode && (
              <TouchableOpacity
                style={s.scheduleBtn}
                onPress={() => setShowSchedule(true)}>
                <ClockIcon />
                <ChevronDownIcon />
              </TouchableOpacity>
            )}

            {/* Post / Update Post button */}
            <TouchableOpacity
              style={[s.postBtn, !canPost && s.postBtnDisabled]}
              onPress={handlePost}
              disabled={!canPost || posting}>
              {posting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={s.postBtnText}>
                  {editMode ? 'Update Post' : 'Post'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={s.scrollView}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── User info ── */}
          <View style={s.userRow}>
            {profile?.avatar_urls?.thumb ? (
              <Image source={{uri: profile.avatar_urls.thumb}} style={s.userAvatar} />
            ) : (
              <View style={s.userAvatarPlaceholder}>
                <Text style={s.userAvatarInitial}>
                  {(profile?.name || 'M').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={s.userInfo}>
              <Text style={s.userName}>{profile?.name || 'IPM Member'}</Text>
              {subtitle ? (
                <Text style={s.userTitle} numberOfLines={2}>{subtitle}</Text>
              ) : null}
            </View>
          </View>

          {/* ── Text input ── Figma: border, gray bg, Runda 14/18 */}
          <View style={s.textInputWrap}>
            <TextInput
              ref={inputRef}
              style={s.textInput}
              placeholder={placeholder}
              placeholderTextColor="#8F9098"
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
            {/* Smiley at bottom-right */}
            <TouchableOpacity style={s.smileyBtn}>
              <SmileyIcon />
            </TouchableOpacity>
          </View>

          {/* ── Add Photos area ── */}
          {images.length === 0 ? (
            <TouchableOpacity style={s.addPhotosArea} onPress={handlePickImage}>
              <AddPhotosIcon />
              <Text style={s.addPhotosTitle}>{'Add Photos'}</Text>
              <Text style={s.addPhotosSubtitle}>{'Or drag and drop'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.imagesGrid}>
              {images.map((img, i) => (
                <View key={i} style={s.imageThumb}>
                  <Image source={{uri: img.uri}} style={s.imageThumbImg} />
                  <TouchableOpacity
                    style={s.removeImageBtn}
                    onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}>
                    <Text style={s.removeImageText}>{'✕'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 4 && (
                <TouchableOpacity style={s.addMoreBtn} onPress={handlePickImage}>
                  <Text style={s.addMoreIcon}>{'+'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{height: 120}} />
        </ScrollView>

        {/* ── Bottom toolbar — Figma SVG icons ── */}
        <View style={s.toolbar}>
          <TouchableOpacity style={s.toolbarBtn} onPress={handlePickImage}>
            <CameraBoxIcon />
          </TouchableOpacity>
          <TouchableOpacity style={s.toolbarBtn}>
            <VideoIcon />
          </TouchableOpacity>
          <TouchableOpacity style={s.toolbarBtn}>
            <AttachIcon />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Schedule Modal ── */}
      <ScheduleModal
        visible={showSchedule}
        onClose={() => setShowSchedule(false)}
        onContinue={handleSchedule}
        isSubmitting={scheduling}
        onViewAll={() => {
          setShowSchedule(false);
          navigation.navigate('ScheduledPosts');
        }}
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  flex: {flex: 1},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 10,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {fontSize: 18, color: '#8F9098'},
  headerRight: {flexDirection: 'row', alignItems: 'center', gap: 10},

  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  postBtn: {
    backgroundColor: '#0C4D91',
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnDisabled: {opacity: 0.4},
  postBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'Runda'},

  scrollView: {flex: 1},

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  userAvatar: {width: 48, height: 48, borderRadius: 24},
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1A3A6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarInitial: {color: '#FFF', fontSize: 20, fontWeight: '800'},
  userInfo: {flex: 1},
  userName: {fontSize: 15, fontWeight: '700', color: '#192546', marginBottom: 2, fontFamily: 'Runda'},
  userTitle: {fontSize: 12, color: '#8F9098', fontFamily: 'Runda'},

  textInputWrap: {
    marginHorizontal: 16,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#C5C6CC',
    backgroundColor: '#E8E9F1',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 120,
    position: 'relative',
  },
  textInput: {
    fontSize: 14,
    color: '#8F9098',
    lineHeight: 18,
    minHeight: 90,
    fontFamily: 'Runda',
    fontWeight: '400',
  },
  smileyBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },

  addPhotosArea: {
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 6,
  },
  addPhotosTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#192546',
    marginTop: 4,
    fontFamily: 'Runda',
  },
  addPhotosSubtitle: {fontSize: 13, color: '#8F9098', fontFamily: 'Runda'},

  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 8,
  },
  imageThumb: {width: 100, height: 100, borderRadius: 8, overflow: 'hidden', position: 'relative'},
  imageThumbImg: {width: '100%', height: '100%'},
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {color: '#FFF', fontSize: 10, fontWeight: '700'},
  addMoreBtn: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F0F4FF',
    borderWidth: 1.5,
    borderColor: '#D0DCF8',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreIcon: {fontSize: 28, color: '#1A3A6B'},

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    gap: 16,
  },
  toolbarBtn: {padding: 4},
});

export default CreatePostScreen;
