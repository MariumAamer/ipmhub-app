/* eslint-disable prettier/prettier */
import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import SuccessToast from '../components/SuccessToast';
import ReportModal from '../components/ReportModal';
import {submitReport} from '../api/reportApi';
import {BlockMemberSheet, BlockIcon} from '../components/MemberModeration';
import {markMemberBlocked} from '../hooks/useMemberBlock';
import {AuthorOptionsSheet, blockAuthor} from '../components/AuthorOptionsSheet';
import {blockPostAuthor} from '../api/accountApi';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Animated,
  FlatList,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {getCachedCredentials} from '../api/credentialsCache';
import {
  getFeed,
  getNewestMembers,
  toggleLike,
  toggleFollow,
  postActivityComment,
  getActivityComments,
  deleteActivity,
  updateActivity,
  muteActivity,
  unmuteActivity,
  getMemberProfile,
  getMembersBatch,
  resolveFullName,
  countryFlag,
  FeedPost,
  Member,
} from '../api/feedApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileDrawer from '../components/ProfileDrawer';
import FabMenu from '../components/FabMenu';
import EmojiPickerSheet from '../components/EmojiPickerSheet';
import NotificationPermissionModal from '../components/NotificationPermissionModal';
import {requestUserPermissionAndRegister} from '../api/pushNotifications';
import {getUserIdFromToken} from '../api/profileApi';
import {getTopicTagsAndVoices} from '../api/forumsApi';
import Svg, {Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Ellipse, Rect} from 'react-native-svg';
import MaskedView from '@react-native-masked-view/masked-view';
import AppHeader from '../components/AppHeader';

const {width: W} = Dimensions.get('window');

const NOTIF_PROMPT_SEEN_KEY = 'ipm_notif_prompt_seen';

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const DotsIcon = () => (
  <Svg width={21} height={5} viewBox="0 0 21 5" fill="none">
    <Circle cx="2.27804" cy="2.27804" r="2.27804" fill="#E8E9F1" />
    <Circle cx="10.4792" cy="2.27804" r="2.27804" fill="#E8E9F1" />
    <Circle cx="18.6794" cy="2.27804" r="2.27804" fill="#E8E9F1" />
  </Svg>
);

const BellIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M12.2139 15.8994C12.5824 15.9735 12.8209 16.3325 12.7471 16.7012C12.477 18.049 11.2171 18.9999 9.7832 19C8.34915 19 7.08845 18.0491 6.81836 16.7012C6.74457 16.3324 6.98378 15.9733 7.35254 15.8994C7.72129 15.8256 8.08034 16.0649 8.1543 16.4336C8.28354 17.0784 8.92794 17.6377 9.7832 17.6377C10.6384 17.6376 11.2829 17.0784 11.4121 16.4336C11.4861 16.0649 11.8451 15.8255 12.2139 15.8994ZM9.88086 1C13.1587 1 15.8164 3.65766 15.8164 6.93555V10.1943C16.9265 10.4197 17.7616 11.4015 17.7617 12.5781C17.7617 13.9214 16.6733 15.0106 15.3301 15.0107H4.43262C3.08922 15.0107 2 13.9215 2 12.5781C2.00012 11.4014 2.83609 10.4197 3.94629 10.1943V6.93555C3.94629 3.65774 6.60308 1.00012 9.88086 1Z" fill="#192546" />
  </Svg>
);

const EnvelopeIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 30 30" fill="none">
    <Path d="M22.625 7.4248C24.2691 7.4248 25.5749 8.79136 25.5752 10.4424V20.2139C25.5752 21.8651 24.2693 23.2314 22.625 23.2314H8.375C6.73071 23.2314 5.4248 21.8651 5.4248 20.2139V10.4424C5.42505 8.79136 6.73087 7.4248 8.375 7.4248H22.625ZM16.8242 16.5156C16.4138 16.7265 15.9604 16.8369 15.5 16.8369C15.0396 16.8369 14.5862 16.7265 14.1758 16.5156L6.5752 12.6064V20.2139C6.5752 21.2609 7.39592 22.082 8.375 22.082H22.625C23.6041 22.082 24.4248 21.2609 24.4248 20.2139V12.6064L16.8242 16.5156Z" fill="#192546" />
  </Svg>
);

const CommentIcon = ({color = '#192546'}: {color?: string}) => (
  <Svg width={14.839} height={13.85} viewBox="0 0 16 15" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M1.61718 9.95967V2.23097C1.61718 1.84503 1.8221 1.64354 2.2046 1.64354H13.8905C14.2695 1.64354 14.4779 1.85191 14.4779 2.23097V9.95967C14.4779 10.2246 14.3768 10.3988 14.1992 10.4848C13.9612 10.6002 12.1924 10.5471 11.85 10.5471L7.8295 10.5453C7.54807 10.5464 7.45634 10.6754 7.28794 10.8077C6.79373 11.1963 4.99379 12.6848 4.58508 12.9584C4.58508 12.6619 4.64422 10.9843 4.52415 10.7935C4.42013 10.6285 4.30087 10.5443 4.02993 10.5458C3.5349 10.5484 3.0397 10.5469 2.54467 10.5471C2.28503 10.5471 2.05504 10.5717 1.87567 10.4742C1.70596 10.382 1.61718 10.209 1.61718 9.95967ZM0.62793 2.01457V10.1761C0.62793 10.4994 0.833675 10.8909 1.05351 11.1108C1.26712 11.3245 1.67042 11.5363 1.98821 11.5363H3.59583V14.0713C3.59583 14.2956 3.81026 14.5041 4.1523 14.5041C4.35034 14.5041 5.10059 13.8475 5.28897 13.6932C6.11867 13.0146 7.05812 12.3076 7.86505 11.6322C7.94285 11.567 7.91583 11.5575 8.01886 11.5386L13.8595 11.5363C14.2477 11.5368 14.4232 11.5116 14.6846 11.3722C15.0404 11.1825 15.4671 10.6996 15.4671 10.1761V2.01457C15.4671 1.35229 14.769 0.654297 14.1069 0.654297H1.98821C1.32609 0.654297 0.62793 1.35229 0.62793 2.01457Z" fill={color} />
    {/* Two text lines inside the bubble — Figma: 8.903x0.989 and 4.946x0.989 */}
    <Path fillRule="evenodd" clipRule="evenodd" d="M3.5 5.13279C3.5 5.47482 3.70853 5.68925 3.93279 5.68925H11.9706C12.1949 5.68925 12.4034 5.47482 12.4034 5.13279C12.4034 4.93965 12.1637 4.7 11.9706 4.7H3.93279C3.72835 4.7 3.5 4.92835 3.5 5.13279Z" fill={color} />
    <Path fillRule="evenodd" clipRule="evenodd" d="M3.5 7.63279C3.5 7.97482 3.70853 8.18925 3.93279 8.18925H8.01345C8.23771 8.18925 8.4464 7.97482 8.4464 7.63279C8.4464 7.43982 8.20658 7.2 8.01345 7.2H3.93279C3.72835 7.2 3.5 7.42835 3.5 7.63279Z" fill={color} />
  </Svg>
);

const SmileyIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M0.937445 7.5C0.937445 7.27624 0.969285 6.94434 0.993495 6.73584C1.07229 6.05898 1.2579 5.39783 1.52377 4.80505L1.95691 4.00773C2.31346 3.47789 2.60149 3.0986 3.08319 2.67309L3.52382 2.29336C4.53331 1.54167 5.86017 0.976621 7.12012 0.967671C7.28651 0.966644 7.32451 0.935538 7.5 0.935538C7.67549 0.935538 7.71349 0.966644 7.87988 0.967671C8.62306 0.972953 9.55918 1.24058 10.195 1.52377L11.7065 2.4731C12.3932 3.00998 13.117 4.00391 13.4762 4.80505C13.7398 5.39255 13.9292 6.06339 14.0065 6.73569L14.0646 7.5C14.0646 7.84114 13.9625 8.6571 13.8871 8.96523C13.7782 9.41054 13.6475 9.81331 13.4762 10.195C13.2946 10.6001 13.117 10.88 12.879 11.2385C12.266 12.162 11.2083 13.0218 10.195 13.4762C9.56329 13.7596 8.61968 14.027 7.87988 14.0323C7.71349 14.0335 7.67549 14.0646 7.5 14.0646L6.73569 14.0065C6.49418 13.9786 6.249 13.9395 6.03477 13.8871C4.73447 13.5691 3.55801 12.9185 2.67309 11.9168C2.47369 11.6911 2.30348 11.5136 2.12095 11.2385C2.05889 11.145 2.01736 11.0822 1.95691 10.9923C1.89191 10.8957 1.86535 10.8389 1.80387 10.7352C1.69764 10.5559 1.60667 10.38 1.52377 10.195C1.17118 9.40893 0.937445 8.3924 0.937445 7.5ZM7.26347 0H7.78084C8.31214 0.0179008 8.84197 0.0911181 9.35787 0.222146C10.0258 0.39191 10.7132 0.67715 11.2851 1.01961C11.8316 1.34667 12.1234 1.56647 12.5753 1.98523C12.9829 2.36276 13.0777 2.45843 13.4513 2.92561C14.4099 4.12438 14.9472 5.68219 15 7.26391V7.78113C14.9821 8.31243 14.9089 8.84212 14.7779 9.35787C14.2825 11.307 12.9914 12.9785 11.2669 13.9915C11.0752 14.1042 10.8802 14.2168 10.6726 14.3054C10.225 14.4964 9.8522 14.6542 9.33439 14.7836C8.49892 14.9924 8.10305 14.9999 7.27609 15H7.23633C6.20425 15 5.00005 14.6392 4.30617 14.2973C4.10119 14.1964 3.91118 14.0981 3.71486 13.9805C3.61024 13.9179 3.52132 13.8579 3.42595 13.8005C2.64345 13.3301 1.89675 12.5538 1.36457 11.8191C1.15563 11.5309 0.834149 10.9995 0.69461 10.6726C0.132789 9.35655 0 8.69554 0 7.23633C0 6.20425 0.360804 5.00005 0.70268 4.30617C0.908099 3.88902 1.12027 3.52749 1.37675 3.16389C1.44395 3.06852 1.49751 2.98797 1.57527 2.89362C2.03629 2.33283 2.35513 2.00489 2.92561 1.54871C4.12452 0.589846 5.68189 0.0528221 7.26347 0Z" fill="#8F9098" />
    <Path fillRule="evenodd" clipRule="evenodd" d="M3.48828 9.49181C3.48828 9.84337 3.89178 10.3513 4.12508 10.5835C4.25112 10.7088 4.38919 10.8672 4.52609 10.9736L4.994 11.3259C5.92851 11.9533 7.0994 12.1673 8.22598 12.0028C9.38542 11.8336 10.0875 11.3657 10.8641 10.598C11.1027 10.3621 11.5158 9.84939 11.5158 9.49181C11.5158 9.20995 10.9861 8.78547 10.6012 9.36827C9.86581 10.4821 8.84737 11.103 7.47268 11.103C6.39951 11.103 5.35114 10.6096 4.69321 9.78101C4.58507 9.6447 4.5145 9.53833 4.41428 9.38602C4.00696 8.76654 3.48828 9.2236 3.48828 9.49181Z" fill="#8F9098" />
    <Path fillRule="evenodd" clipRule="evenodd" d="M9.6377 5.62392C9.6377 6.87169 11.432 6.93758 11.535 5.67498C11.5713 5.2304 11.1161 4.71582 10.6924 4.71582C10.3854 4.71582 10.1348 4.73944 9.89344 5.00077C9.77224 5.13179 9.6377 5.38094 9.6377 5.62392Z" fill="#8F9098" />
    <Path fillRule="evenodd" clipRule="evenodd" d="M3.45508 5.65327C3.45508 5.73705 3.51568 5.94907 3.53798 6.00967C3.64201 6.29212 3.98623 6.59071 4.36318 6.59071C5.31955 6.59071 5.62606 5.59135 5.10342 5.00091C4.87174 4.73915 4.60719 4.71582 4.30463 4.71582C3.85887 4.71582 3.45508 5.23084 3.45508 5.65327Z" fill="#8F9098" />
  </Svg>
);

// ─── Linkify plain-text URLs ───────────────────────────────────────────────────
// stripHtml() strips <a href="..."> tags entirely, which loses the tappable
// link — the raw URL text is still visible in the content (e.g. the IPM
// article-share posts), it just did nothing when tapped. This finds URLs in
// the already-stripped text and renders them as tappable spans instead of
// trying to preserve HTML through the copyright-safe plain-text pipeline.
const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const LinkifiedText = ({text, style, linkStyle}: {text: string; style: any; linkStyle: any}) => {
  const parts = text.split(URL_REGEX);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.startsWith('http://') || part.startsWith('https://') ? (
          <Text
            key={i}
            style={linkStyle}
            onPress={() => Linking.openURL(part).catch(() => {})}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
};

const LikeIcon = ({color = '#192546'}: {color?: string}) => (
  <Svg width={16} height={15} viewBox="0 0 16 15" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M1.05502 13.1086V6.58685C1.05502 6.25225 1.2968 6.10725 1.63045 6.10725H3.51674C3.86051 6.10725 4.12411 6.21462 4.12411 6.55491V13.1406C4.12411 13.3684 3.91633 13.5242 3.67661 13.5242H1.47058C1.27466 13.5242 1.05502 13.3047 1.05502 13.1086ZM9.46295 5.8835C9.46295 6.52566 10.2005 6.39504 10.486 6.39504C11.0082 6.39504 11.5303 6.39504 12.0526 6.39504C12.6704 6.39504 12.9762 6.36785 13.3959 6.58622C14.2939 7.05333 13.9979 7.78387 13.8979 8.36831L13.2591 11.7576C13.1611 12.2644 13.0426 12.8405 12.6693 13.2138C12.6029 13.2802 12.4549 13.3911 12.3733 13.4293C12.2725 13.4766 12.1078 13.5242 11.9566 13.5242H6.39402C5.89845 13.5242 5.48084 13.1301 5.32002 12.7759C5.11968 12.3356 5.17913 11.7135 5.17913 11.0946V7.45007C5.25993 7.4284 5.49744 7.21351 5.57113 7.13871C5.7019 7.0062 5.80784 6.93457 5.93846 6.80269C6.18482 6.55412 6.40983 6.331 6.65809 6.08385L7.64828 4.96384C7.703 4.90264 7.75328 4.83338 7.80483 4.76887C8.29075 4.15865 8.74062 3.56062 9.17531 2.9104C9.37471 2.61202 10.1317 1.37436 10.1982 1.08815C10.7854 1.10111 11.0295 1.6321 11.0295 2.20705C11.0295 2.96954 10.5773 4.05287 10.2049 4.64331L9.67753 5.42667C9.58265 5.55223 9.46295 5.68316 9.46295 5.8835ZM5.11525 6.13935C4.99317 5.61564 4.38786 5.08433 3.74049 5.08433H1.4067C0.99873 5.08433 0.595664 5.35077 0.391048 5.5712C0.145002 5.83638 0 6.21225 0 6.71478V12.9807C0 13.9135 0.665873 14.5792 1.59851 14.5792H3.54868C4.12696 14.5792 4.59106 14.3884 4.89134 13.9398C5.09564 14.0765 5.12774 14.2034 5.58489 14.3972C5.85939 14.5136 6.20727 14.5792 6.58583 14.5792H11.7967C13.9618 14.5792 14.1769 12.4975 14.4587 11.0389L14.7834 9.28576C14.828 9.03561 15.1 7.73137 15.0891 7.51664C15.0312 6.38034 14.1364 5.56409 13.0584 5.38904C12.595 5.31393 11.5314 5.37196 10.9976 5.37196L11.8492 3.50638C11.879 3.40565 11.9009 3.35822 11.9253 3.26271C11.9663 3.103 11.9952 2.93317 12.0256 2.75559C12.0852 2.40787 12.0931 1.98504 12.0188 1.63337C11.7877 0.540869 11.0584 0.112028 10.0004 0.00450195C9.5409 -0.0423036 9.4269 0.285177 9.31241 0.553835C8.83344 1.67701 7.36365 3.78294 6.4821 4.72491C6.41458 4.79717 6.38896 4.81536 6.32998 4.89252C6.1883 5.07816 5.24586 6.05175 5.11525 6.13935Z" fill={color} />
  </Svg>
);

// Filled thumbs-up shown once the current user has liked the post
const LikedIcon = () => (
  <Svg width={16} height={15} viewBox="0 0 16 15" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M0.5 6.83845V14.3111C0.5 14.5357 0.751633 14.7872 0.976275 14.7872H3.50371C3.77841 14.7872 4.01654 14.6087 4.01654 14.3478V6.8019C4.01654 6.41189 3.71435 6.28906 3.32058 6.28906H1.15941C0.777087 6.28906 0.5 6.45511 0.5 6.83845Z" fill="#084D92" />
    <Path fillRule="evenodd" clipRule="evenodd" d="M5.08905 12.0026L5.08922 7.93055C5.08922 7.70351 5.59283 7.34972 5.79766 7.17326C5.86274 7.11722 5.92783 7.06102 5.99889 6.98944C6.24284 6.74328 6.46851 6.5188 6.70887 6.27981L6.8223 6.16689L7.95319 4.88789C7.9918 4.8445 8.03212 4.79256 8.07209 4.74097L8.12727 4.67025C8.40658 4.31953 8.6741 3.97411 8.93171 3.62647C9.19137 3.2761 9.44352 2.92026 9.69122 2.5499C9.82789 2.34542 10.1981 1.74717 10.487 1.2328C10.6694 0.907537 10.8168 0.621567 10.8436 0.506427L10.844 0.506598C10.8582 0.445611 10.9133 0.400683 10.9784 0.401879C11.337 0.409908 11.5994 0.565193 11.7777 0.80538C11.9751 1.07102 12.0641 1.43899 12.0641 1.81943C12.0641 2.22942 11.9554 2.71424 11.7957 3.1859C11.604 3.75255 11.3372 4.30399 11.098 4.68306L10.4958 5.57753C10.4933 5.5818 10.4905 5.58607 10.4875 5.59017L10.4506 5.63783C10.3636 5.75041 10.2693 5.87255 10.2693 6.03194C10.2693 6.43612 10.6229 6.49455 10.9246 6.49455C11.0117 6.49455 11.0852 6.49096 11.1503 6.48788C11.2123 6.48481 11.268 6.48208 11.3056 6.48208L13.3101 6.48191C13.9041 6.479 14.2427 6.47746 14.7024 6.71663C15.6913 7.231 15.536 7.98163 15.399 8.64359C15.3814 8.72833 15.3642 8.81135 15.3488 8.90189C15.0609 10.0415 14.8149 11.6048 14.6161 12.7878C14.5592 13.0825 14.4962 13.3976 14.3913 13.6986C14.2837 14.0075 14.1332 14.2971 13.9032 14.527C13.8607 14.5695 13.7894 14.628 13.7162 14.6814C13.6485 14.7306 13.5781 14.7757 13.5253 14.8005C13.4546 14.8336 13.3605 14.8666 13.2594 14.8897C13.1722 14.9095 13.0793 14.9225 12.9906 14.9225H6.61679C6.32723 14.9225 6.06005 14.8183 5.83643 14.6625C5.57523 14.4805 5.37195 14.2256 5.26261 13.9849C5.06411 13.5481 5.07419 12.9859 5.08478 12.3993C5.08683 12.2819 5.08905 12.1636 5.08905 12.0026Z" fill="#084D92" />
  </Svg>
);

const CheckCircleIcon = () => (
  <Svg width={56} height={56} viewBox="0 0 56 56" fill="none">
    <Circle cx="28" cy="28" r="27" stroke="#22C55E" strokeWidth="2" />
    <Path d="M18 28L24 34L38 20" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const MuteIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path d="M5.80488 11.64C5.68488 11.69 5.60488 11.78 5.56488 11.91C5.52488 12.03 5.52988 12.15 5.57988 12.27C5.58988 12.27 5.59488 12.28 5.59488 12.3C5.66488 12.43 5.73488 12.555 5.80488 12.675C6.00488 12.955 6.25988 13.18 6.56988 13.35C6.86988 13.51 7.19988 13.59 7.55988 13.59C7.99988 13.59 8.39988 13.47 8.75988 13.23C9.11988 12.98 9.37988 12.655 9.53988 12.255C9.58988 12.135 9.58988 12.015 9.53988 11.895C9.48988 11.775 9.40488 11.69 9.28488 11.64C9.16488 11.59 9.04488 11.59 8.92488 11.64C8.80488 11.69 8.71988 11.775 8.66988 11.895C8.58988 12.125 8.44988 12.31 8.24988 12.45C8.03988 12.59 7.80988 12.66 7.55988 12.66C7.35988 12.66 7.17488 12.615 7.00488 12.525C6.83488 12.425 6.68988 12.295 6.56988 12.135C6.51988 12.065 6.47988 11.985 6.44988 11.895V11.88C6.43988 11.87 6.43488 11.86 6.43488 11.85C6.37488 11.74 6.28488 11.665 6.16488 11.625C6.03488 11.575 5.91488 11.58 5.80488 11.64ZM3.70488 2.64C3.61488 2.73 3.56988 2.84 3.56988 2.97C3.55988 3.09 3.59988 3.2 3.68988 3.3L4.85988 4.545L11.6999 11.565C11.7899 11.655 11.8999 11.7 12.0299 11.7C12.1599 11.7 12.2699 11.655 12.3599 11.565C12.4499 11.475 12.4999 11.365 12.5099 11.235C12.5099 11.105 12.4649 10.995 12.3749 10.905L5.53488 3.9L4.36488 2.655C4.28488 2.555 4.17988 2.505 4.04988 2.505C3.91988 2.505 3.80488 2.55 3.70488 2.64ZM11.1899 8.715C11.3199 8.755 11.4299 8.83 11.5199 8.94C11.5999 9.05 11.6399 9.175 11.6399 9.315C11.6399 9.485 11.5799 9.635 11.4599 9.765C11.3299 9.885 11.1799 9.945 11.0099 9.945H4.06488C3.89488 9.945 3.74988 9.885 3.62988 9.765C3.49988 9.635 3.43488 9.485 3.43488 9.315C3.43488 9.175 3.47988 9.05 3.56988 8.94C3.65988 8.82 3.77488 8.745 3.91488 8.715C4.11488 8.665 4.28488 8.555 4.42488 8.385C4.55488 8.215 4.61988 8.02 4.61988 7.8V5.76C4.61988 5.22 4.75488 4.725 5.02488 4.275C5.28488 3.825 5.63988 3.47 6.08988 3.21C6.53988 2.94 7.02988 2.805 7.55988 2.805C8.08988 2.805 8.57988 2.94 9.02988 3.21C9.47988 3.47 9.83988 3.825 10.1099 4.275C10.3699 4.725 10.4999 5.22 10.4999 5.76V7.815C10.4999 8.025 10.5649 8.215 10.6949 8.385C10.8249 8.545 10.9899 8.655 11.1899 8.715ZM3.67488 7.8C3.33488 7.89 3.05488 8.075 2.83488 8.355C2.61488 8.635 2.50488 8.955 2.50488 9.315C2.50488 9.605 2.57488 9.87 2.71488 10.11C2.85488 10.35 3.04488 10.54 3.28488 10.68C3.51488 10.82 3.77488 10.89 4.06488 10.89H11.0099C11.2999 10.89 11.5649 10.82 11.8049 10.68C12.0349 10.54 12.2199 10.35 12.3599 10.11C12.4999 9.87 12.5699 9.605 12.5699 9.315C12.5699 8.965 12.4649 8.65 12.2549 8.37C12.0449 8.09 11.7749 7.905 11.4449 7.815V5.76C11.4449 5.06 11.2699 4.415 10.9199 3.825C10.5699 3.225 10.0999 2.75 9.50988 2.4C8.90988 2.05 8.25988 1.875 7.55988 1.875C6.85988 1.875 6.21488 2.05 5.62488 2.4C5.02488 2.75 4.54988 3.225 4.19988 3.825C3.84988 4.415 3.67488 5.06 3.67488 5.76V7.8Z" fill="#192546" />
  </Svg>
);

// Figma close icon (20x20). The export draws the X as a mask over a
// #C5C6CC rect, same result as filling the X path directly.
const SheetCloseIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M5.80012 6.67912L9.02012 9.89907L5.80012 13.099C5.68012 13.219 5.62012 13.3657 5.62012 13.539C5.62012 13.7123 5.68012 13.859 5.80012 13.979C5.92012 14.099 6.06678 14.159 6.24012 14.159C6.41345 14.159 6.56012 14.099 6.68012 13.979L9.90012 10.7791L13.1001 13.979C13.2201 14.099 13.3668 14.159 13.5401 14.159C13.7135 14.159 13.8601 14.099 13.9801 13.979C14.1001 13.859 14.1601 13.7123 14.1601 13.539C14.1601 13.3657 14.1001 13.219 13.9801 13.099L10.7801 9.89907L13.9801 6.67912C14.1001 6.55913 14.1601 6.41246 14.1601 6.23913C14.1601 6.0658 14.1001 5.91914 13.9801 5.79914C13.8601 5.67914 13.7135 5.61914 13.5401 5.61914C13.3668 5.61914 13.2201 5.67914 13.1001 5.79914L9.90012 8.99909L6.68012 5.79914C6.56012 5.67914 6.41345 5.61914 6.24012 5.61914C6.06678 5.61914 5.92012 5.67914 5.80012 5.79914C5.68012 5.91914 5.62012 6.0658 5.62012 6.23913C5.62012 6.41246 5.68012 6.55913 5.80012 6.67912Z"
      fill="#C5C6CC"
    />
  </Svg>
);

// Figma "Report" flag icon (More Options sheet).
const FlagIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path d="M2.65488 2.22C2.55488 2.32 2.50488 2.435 2.50488 2.565V13.125C2.50488 13.255 2.54988 13.365 2.63988 13.455C2.72988 13.545 2.83988 13.59 2.96988 13.59C3.09988 13.59 3.20988 13.545 3.29988 13.455C3.38988 13.365 3.43488 13.255 3.43488 13.125V8.445H12.1649C12.2949 8.445 12.3899 8.395 12.4499 8.295C12.5099 8.185 12.5049 8.08 12.4349 7.98L12.1649 7.515L10.9349 5.49C10.8749 5.38 10.8449 5.27 10.8449 5.16C10.8449 5.05 10.8749 4.945 10.9349 4.845L12.4349 2.355C12.5049 2.245 12.5099 2.14 12.4499 2.04C12.3899 1.93 12.2949 1.875 12.1649 1.875H3.20988C3.08988 1.875 2.97988 1.91 2.87988 1.98C2.76988 2.04 2.69488 2.12 2.65488 2.22ZM3.52488 2.805H11.0699L10.1399 4.35C9.98988 4.6 9.91488 4.87 9.91488 5.16C9.91488 5.45 9.98988 5.72 10.1399 5.97L11.0699 7.515H3.58488L3.52488 2.805Z" fill="#192546" />
  </Svg>
);

const TrashIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path d="M12.3438 3.125C12.6026 3.125 12.8125 3.33487 12.8125 3.59375C12.8125 3.85263 12.6026 4.0625 12.3438 4.0625H2.34375C2.08487 4.0625 1.875 3.85263 1.875 3.59375C1.875 3.33487 2.08487 3.125 2.34375 3.125H12.3438Z" fill="#192546" />
    <Path d="M12.22 3.125L11.62 12.1246C11.5707 12.8633 10.9571 13.4375 10.2168 13.4375H4.47095C3.73061 13.4375 3.117 12.8633 3.06775 12.1246L2.46777 3.125H12.22ZM4.00342 12.0624C4.01983 12.3086 4.22417 12.5 4.47095 12.5H10.2168C10.4636 12.5 10.6679 12.3086 10.6843 12.0624L11.2178 4.0625H3.46997L4.00342 12.0624Z" fill="#192546" />
    <Path d="M5.62438 9.84375V6.71875C5.62438 6.45987 5.83425 6.25 6.09313 6.25C6.35202 6.25 6.56188 6.45987 6.56188 6.71875V9.84375C6.56188 10.1026 6.35202 10.3125 6.09313 10.3125C5.83425 10.3125 5.62438 10.1026 5.62438 9.84375ZM8.12438 9.84375V6.71875C8.12438 6.45987 8.33425 6.25 8.59313 6.25C8.85202 6.25 9.06188 6.45987 9.06188 6.71875V9.84375C9.06188 10.1026 8.85202 10.3125 8.59313 10.3125C8.33425 10.3125 8.12438 10.1026 8.12438 9.84375ZM8.54247 1.25C9.14769 1.25002 9.68525 1.63718 9.8767 2.2113L10.2881 3.44543C10.3699 3.69103 10.237 3.95683 9.99145 4.0387C9.74585 4.12056 9.48005 3.98766 9.39819 3.74207L8.98742 2.50793C8.92362 2.31654 8.74422 2.18752 8.54247 2.1875H6.14379C5.94205 2.18752 5.76265 2.31654 5.69885 2.50793L5.28808 3.74207C5.20621 3.98766 4.94042 4.12056 4.69482 4.0387C4.44922 3.95683 4.31632 3.69103 4.39819 3.44543L4.80956 2.2113C5.00102 1.63718 5.53858 1.25002 6.14379 1.25H8.54247Z" fill="#192546" />
  </Svg>
);

const EditIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path d="M1.63965 10.8735V5.19114C1.63968 3.68144 2.8637 2.45738 4.37341 2.45738H7.54236C7.84497 2.45738 8.0904 2.70287 8.09045 3.00547C8.09045 3.30812 7.84501 3.55357 7.54236 3.55357H4.37341C3.469 3.55357 2.73587 4.28673 2.73584 5.19114V10.8735C2.73584 11.778 3.46898 12.5117 4.37341 12.5117H10.0558C10.9602 12.5117 11.6934 11.778 11.6934 10.8735V7.81382C11.6934 7.51127 11.9389 7.2658 12.2415 7.26573C12.5441 7.26573 12.7895 7.51123 12.7896 7.81382V10.8735C12.7896 12.3832 11.5655 13.6073 10.0558 13.6073H4.37341C2.86368 13.6073 1.63965 12.3832 1.63965 10.8735ZM11.4327 1.31236C11.8294 0.915737 12.4723 0.915737 12.8689 1.31236L14.0182 2.46104C14.4147 2.85762 14.4147 3.50058 14.0182 3.8972L8.19421 9.72117C8.01516 9.90014 7.77572 10.0056 7.52283 10.0172L6.3186 10.0727C5.7217 10.1 5.23049 9.60824 5.25781 9.01133L5.31274 7.80772L5.32129 7.71312C5.35175 7.49535 5.45269 7.29241 5.60938 7.13572L11.4327 1.31236ZM6.40588 7.88829L6.35583 8.97349L7.44104 8.92405L13.1863 3.17881L12.1505 2.14366L6.40588 7.88829Z" fill="#192546" />
  </Svg>
);

// Gradient "sparkle" icon for "New Forum" — same icon/gradient as
// MemberProfileScreen's forum cards, kept in sync so a discussion card
// looks identical whether seen here or on a member's Activity tab.
const NewForumIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 15 15" fill="none">
    <Defs>
      <SvgLinearGradient id="feedForumBadgeGrad" x1="14.2782" y1="12.0188" x2="1.58882" y2="12.5869" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#E257E4" />
        <Stop offset={1} stopColor="#005AB4" />
      </SvgLinearGradient>
    </Defs>
    <Path
      d="M7.5 0C11.6421 0 15 3.35786 15 7.5C15 11.6421 11.6421 15 7.5 15C3.35786 15 0 11.6421 0 7.5C0 3.35786 3.35786 0 7.5 0ZM7.50061 2.5C7.42779 2.5 7.3564 2.52231 7.29675 2.56409C7.23709 2.6059 7.19161 2.66528 7.16675 2.73376L6.828 3.66028C6.56201 4.38671 6.14028 5.04624 5.59326 5.59326C5.04624 6.14028 4.38671 6.56201 3.66028 6.828L2.73376 7.16675C2.66528 7.19161 2.6059 7.23709 2.56409 7.29675C2.52231 7.3564 2.5 7.42779 2.5 7.50061C2.50005 7.57332 2.52239 7.64429 2.56409 7.70386C2.6059 7.76352 2.66528 7.809 2.73376 7.83386L3.66028 8.17322C4.38669 8.4392 5.04625 8.86035 5.59326 9.40735C6.14028 9.95437 6.56201 10.6139 6.828 11.3403L7.16675 12.2662C7.19161 12.3347 7.23709 12.3941 7.29675 12.4359C7.3564 12.4777 7.42779 12.5 7.50061 12.5C7.57332 12.4999 7.64429 12.4776 7.70386 12.4359C7.76352 12.3941 7.809 12.3347 7.83386 12.2662L8.17322 11.3403C8.43921 10.6139 8.86035 9.95435 9.40735 9.40735C9.95435 8.86035 10.6139 8.43921 11.3403 8.17322L12.2662 7.83386C12.3347 7.809 12.3941 7.76352 12.4359 7.70386C12.4776 7.64429 12.4999 7.57332 12.5 7.50061C12.5 7.42779 12.4777 7.3564 12.4359 7.29675C12.3941 7.23709 12.3347 7.19161 12.2662 7.16675L11.3403 6.828C10.6139 6.56201 9.95437 6.14028 9.40735 5.59326C8.86035 5.04625 8.4392 4.38669 8.17322 3.66028L7.83386 2.73376C7.809 2.66528 7.76352 2.6059 7.70386 2.56409C7.64429 2.52239 7.57332 2.50005 7.50061 2.5Z"
      fill="url(#feedForumBadgeGrad)"
    />
  </Svg>
);

// Circular reply-arrow icon for "Forum Reply" — same as MemberProfileScreen.
const ForumReplyIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 15 15" fill="none">
    <Defs>
      <SvgLinearGradient id="feedForumReplyGrad" x1="14.2782" y1="12.0188" x2="1.58882" y2="12.5869" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#E257E4" />
        <Stop offset={1} stopColor="#005AB4" />
      </SvgLinearGradient>
    </Defs>
    <Path
      d="M0 7.5C0 11.625 3.375 15 7.5 15C11.625 15 15 11.625 15 7.5C15 3.375 11.625 0 7.5 0C3.375 0 0 3.375 0 7.5ZM2.25 6.75L6 3V5.25C9.795 5.7975 11.46 8.4975 12 11.25C10.6425 9.3225 8.7075 8.25 6 8.25V10.5L2.25 6.75Z"
      fill="url(#feedForumReplyGrad)"
    />
  </Svg>
);

// Solid-fill (non-gradient) two-people icon for the "N People Involved" row.
const PeopleIcon = () => (
  <Svg width={15} height={13} viewBox="0 0 15 13" fill="none">
    <Path
      d="M7.50026 4.875C8.16321 4.875 8.79901 4.61819 9.26779 4.16107C9.73657 3.70395 9.99993 3.08396 9.99993 2.4375C9.99993 1.79103 9.73657 1.17105 9.26779 0.713927C8.79901 0.256807 8.16321 0 7.50026 0C6.83731 0 6.20151 0.256807 5.73273 0.713927C5.26395 1.17105 5.0006 1.79103 5.0006 2.4375C5.0006 3.08396 5.26395 3.70395 5.73273 4.16107C6.20151 4.61819 6.83731 4.875 7.50026 4.875ZM4.16737 4.0625C4.16737 4.49347 3.9918 4.9068 3.67928 5.21155C3.36676 5.51629 2.9429 5.6875 2.50093 5.6875C2.05896 5.6875 1.63509 5.51629 1.32258 5.21155C1.01006 4.9068 0.834485 4.49347 0.834485 4.0625C0.834485 3.63152 1.01006 3.2182 1.32258 2.91345C1.63509 2.6087 2.05896 2.4375 2.50093 2.4375C2.9429 2.4375 3.36676 2.6087 3.67928 2.91345C3.9918 3.2182 4.16737 3.63152 4.16737 4.0625ZM0.409542 10.0149C0.267299 9.93604 0.160779 9.8078 0.111248 9.65574C-0.0355608 9.19207 -0.0371003 8.69623 0.106827 8.2317C0.250754 7.76717 0.533596 7.3551 0.919134 7.04827C1.30467 6.74144 1.77536 6.5538 2.27091 6.50939C2.76647 6.46498 3.26434 6.56582 3.70077 6.799C2.80368 7.65827 2.2423 8.79593 2.11348 10.0157C2.09459 10.1971 2.10154 10.3743 2.13431 10.5471C1.52635 10.495 0.937551 10.3133 0.409542 10.0149ZM12.8662 10.5462C13.4741 10.4944 14.0629 10.313 14.591 10.0149C14.7329 9.93589 14.8391 9.80766 14.8884 9.65574C15.0355 9.19202 15.0372 8.69605 14.8934 8.23137C14.7495 7.76669 14.4667 7.35447 14.0811 7.04751C13.6955 6.74055 13.2248 6.55283 12.7291 6.50841C12.2334 6.46399 11.7354 6.56489 11.2989 6.79818C12.1968 7.65742 12.7588 8.79543 12.8879 10.0157C12.9067 10.1929 12.8994 10.3718 12.8662 10.5471M14.166 4.0625C14.166 4.49347 13.9905 4.9068 13.6779 5.21155C13.3654 5.51629 12.9416 5.6875 12.4996 5.6875C12.0576 5.6875 11.6338 5.51629 11.3212 5.21155C11.0087 4.9068 10.8331 4.49347 10.8331 4.0625C10.8331 3.63152 11.0087 3.2182 11.3212 2.91345C11.6338 2.6087 12.0576 2.4375 12.4996 2.4375C12.9416 2.4375 13.3654 2.6087 13.6779 2.91345C13.9905 3.2182 14.166 3.63152 14.166 4.0625ZM3.58745 10.7169C3.50506 10.6453 3.44121 10.5557 3.4011 10.4554C3.36099 10.3552 3.34575 10.2471 3.35665 10.14C3.46263 9.1402 3.94494 8.21421 4.71035 7.54101C5.47576 6.86781 6.46992 6.4952 7.50068 6.4952C8.53144 6.4952 9.5256 6.86781 10.291 7.54101C11.0564 8.21421 11.5387 9.1402 11.6447 10.14C11.6556 10.2471 11.6404 10.3552 11.6003 10.4554C11.5601 10.5557 11.4963 10.6453 11.4139 10.7169C10.3423 11.6647 8.94698 12.189 7.50026 12.1875C6.05368 12.1896 4.65838 11.6652 3.58745 10.7169Z"
      fill="#192647"
    />
  </Svg>
);

// Gradient "New Forum"/"Forum Reply" label text — same MaskedView technique
// as MemberProfileScreen (RN has no CSS background-clip:text equivalent).
const ForumBadgeLabel = ({text}: {text: string}) => (
  <MaskedView maskElement={<Text style={styles.forumBadgeText}>{text}</Text>}>
    <LinearGradient
      colors={['#E257E4', '#005AB4']}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 0}}>
      <Text style={[styles.forumBadgeText, {opacity: 0}]}>{text}</Text>
    </LinearGradient>
  </MaskedView>
);

// ─── Get stored user ──────────────────────────────────────────────────────────
const getStoredUser = async () => {
  try {
    const creds = await getCachedCredentials();
    if (!creds) return null;
    return JSON.parse(creds.password);
  } catch {
    return null;
  }
};

// ─── Report Modal ─────────────────────────────────────────────────────────────
// ─── More Options Bottom Sheet ────────────────────────────────────────────────
const MoreOptionsSheet = ({
  visible,
  isOwnPost,
  isMuted,
  onClose,
  onMuteToggle,
  onDelete,
  onEdit,
  onReport,
  authorName,
  canBlock,
  onBlock,
}: {
  visible: boolean;
  isOwnPost: boolean;
  isMuted: boolean;
  onClose: () => void;
  onMuteToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onReport: () => void;
  authorName: string;
  canBlock: boolean;
  onBlock: () => void;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={ms.overlay} activeOpacity={1} onPress={onClose}>
      <View style={ms.sheet}>
        <View style={ms.sheetHeader}>
          <Text style={ms.sheetTitle}>{'More Options'}</Text>
          <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
            <SheetCloseIcon />
          </TouchableOpacity>
        </View>
        <View style={ms.options}>
        {isOwnPost ? (
          <>
            <TouchableOpacity style={ms.optionRow} onPress={onMuteToggle}>
              <MuteIcon />
              <Text style={ms.optionText}>
                {isMuted ? 'Turn on notifications' : 'Turn off notifications'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={ms.optionRow} onPress={onDelete}>
              <TrashIcon />
              <Text style={ms.optionText}>{'Delete'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ms.optionRow} onPress={onEdit}>
              <EditIcon />
              <Text style={ms.optionText}>{'Edit'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={ms.optionRow} onPress={onReport}>
              <FlagIcon />
              <Text style={ms.optionText}>{'Report post'}</Text>
            </TouchableOpacity>
            {canBlock && (
              <TouchableOpacity style={ms.optionRow} onPress={onBlock}>
                <BlockIcon />
                <Text style={ms.optionText}>{authorName ? `Block ${authorName}` : 'Block member'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={ms.optionRow} onPress={onMuteToggle}>
              <MuteIcon />
              <Text style={ms.optionText}>
                {isMuted ? 'Turn on notifications' : 'Turn off notifications'}
              </Text>
            </TouchableOpacity>
          </>
        )}
        </View>
      </View>
    </TouchableOpacity>
  </Modal>
);

// ─── Delete Confirm Sheet ─────────────────────────────────────────────────────
const DeleteConfirmSheet = ({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={ds.overlay}>
      <View style={ds.sheet}>
        <Text style={ds.title}>{'Delete This Post'}</Text>
        <Text style={ds.body}>
          {'Are you sure you want to permanently remove this post?'}
        </Text>
        <TouchableOpacity style={ds.deleteBtn} onPress={onConfirm}>
          <Text style={ds.deleteBtnText}>{'Delete'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ds.cancelBtn} onPress={onClose}>
          <Text style={ds.cancelBtnText}>{'Cancel'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ─── Mute Toast ───────────────────────────────────────────────────────────────
const MuteToast = ({visible, muted}: {visible: boolean; muted: boolean}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, {toValue: 1, duration: 200, useNativeDriver: true}),
        Animated.delay(2000),
        Animated.timing(opacity, {toValue: 0, duration: 300, useNativeDriver: true}),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[ts.toast, {opacity}]} pointerEvents="none">
      <View style={ts.toastInner}>
        <Text style={ts.toastTitle}>{muted ? 'Notifications Muted' : 'Notifications Unmuted'}</Text>
        <View style={ts.toastCheck}>
          <CheckCircleIcon />
        </View>
        <Text style={ts.toastBody}>
          {muted
            ? 'Notifications for this activity have been muted'
            : 'Notifications for this activity have been unmuted'}
        </Text>
      </View>
    </Animated.View>
  );
};

// ─── Create Post Bar ──────────────────────────────────────────────────────────
const CreatePostBar = ({myAvatar, onPress}: any) => (
  <TouchableOpacity style={styles.createPostBar} onPress={onPress} activeOpacity={0.8}>
    {myAvatar ? (
      <Image source={{uri: myAvatar}} style={styles.createPostAvatar} />
    ) : (
      <View style={[styles.createPostAvatar, styles.avatarPlaceholder]}>
        <Text style={styles.avatarPlaceholderText}>{'Me'}</Text>
      </View>
    )}
    <View style={styles.createPostInput}>
      <Text style={styles.createPostPlaceholder}>{'Create a Post...'}</Text>
    </View>
  </TouchableOpacity>
);

// ─── Newest Members Section ───────────────────────────────────────────────────
const NewestMembersSection = ({members, loading, followBusy, onFollow, navigation}: any) => (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>{'Newest Members'}</Text>
    {loading ? (
      <ActivityIndicator color="#1A3A6B" style={{paddingVertical: 20}} />
    ) : (
      <FlatList
        data={members}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(m: Member) => String(m.id)}
        contentContainerStyle={styles.newestMembersRow}
        renderItem={({item: m}: {item: Member}) => {
          const busy = !!followBusy?.[m.id];
          return (
            <TouchableOpacity
              style={styles.newestMemberCard}
              activeOpacity={0.85}
              onPress={() => navigation?.push('MemberProfile', {userId: m.id})}>
              <Image source={{uri: m.avatar}} style={styles.newestMemberAvatar} />
              <Text style={styles.newestMemberName} numberOfLines={1} ellipsizeMode="tail">{m.name}</Text>
              <Text style={styles.newestMemberRole} numberOfLines={1} ellipsizeMode="tail">{m.title || ' '}</Text>
              <TouchableOpacity
                style={[styles.newestFollowBtn, m.following && styles.newestFollowingBtn]}
                onPress={() => onFollow(m.id, m.following)}
                disabled={busy}
                activeOpacity={0.85}>
                {busy ? (
                  <ActivityIndicator size="small" color={m.following ? '#1A3A6B' : '#FFF'} />
                ) : (
                  <Text style={[styles.newestFollowBtnText, m.following && styles.newestFollowingBtnText]}>
                    {m.following ? '✓ Following' : '+ Follow'}
                  </Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
    )}
  </View>
);

// ─── Comments Panel — input row always visible (Intro-style), list toggles ────
// A comment's "…" menu (Report / Block author) is owned by FeedScreen because
// its sheets must cover the whole screen, not the post card. FeedScreen
// registers its opener here so the memoised post rows need no extra props.
type CommentTarget = {
  id: number;
  authorId: number;
  authorName: string;
  authorAvatar?: string;
};
let openCommentOptions: ((c: CommentTarget) => void) | null = null;

const CommentsPanel = ({
  postId,
  myUserId,
  myName,
  myAvatar,
  showList,
  onCommentPosted,
  navigation,
}: {
  postId: number;
  myUserId?: number | null;
  myName?: string | null;
  myAvatar?: string | null;
  showList: boolean;
  onCommentPosted?: (postId: number, delta: number) => void;
  navigation?: any;
}) => {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (showList && comments.length === 0) loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showList]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await getActivityComments(postId);
      setComments(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleLikeComment = async (commentId: number, currentlyLiked: boolean) => {
    setComments(prev =>
      prev.map(c =>
        c.id === commentId
          ? {...c, liked: !currentlyLiked, likes: currentlyLiked ? (c.likes || 0) - 1 : (c.likes || 0) + 1}
          : c,
      ),
    );
    try {
      await toggleLike(commentId, currentlyLiked);
    } catch {
      setComments(prev =>
        prev.map(c =>
          c.id === commentId
            ? {...c, liked: currentlyLiked, likes: currentlyLiked ? (c.likes || 0) + 1 : (c.likes || 0) - 1}
            : c,
        ),
      );
    }
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content) return;

    // Optimistic insert — show it immediately like other social apps,
    // instead of waiting on a round trip + re-fetch.
    const tempId = `temp-${Date.now()}`;
    const optimisticComment = {
      id: tempId,
      author: {
        name: myName || 'You',
        avatar:
          myAvatar ||
          `https://www.gravatar.com/avatar/${myUserId || 0}?s=40&d=identicon`,
      },
      content,
      time: 'Just now',
    };
    setComments(prev => [...prev, optimisticComment]);
    onCommentPosted?.(postId, 1);
    setText('');
    setSending(true);
    try {
      await postActivityComment(postId, content);
      // Reconcile with the real comment (real id, server-formatted date)
      // without a visible flash — silent background refresh.
      loadComments();
    } catch {
      // Roll back both the optimistic comment and the count bump.
      setComments(prev => prev.filter(c => c.id !== tempId));
      onCommentPosted?.(postId, -1);
      Alert.alert('Error', 'Could not post comment.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.commentsPanel}>
      <View style={styles.commentInputRow}>
        <View style={styles.commentAvatarSmall}>
          {myAvatar ? (
            <Image source={{uri: myAvatar}} style={styles.commentAvatarImage} />
          ) : (
            <Text style={styles.commentAvatarText}>{(myName || 'M')[0].toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.commentBox}>
          <TextInput
            style={styles.inlineCommentInput}
            placeholder="Add a comment......"
            placeholderTextColor="#8F9098"
            value={text}
            onChangeText={setText}
          />
          <TouchableOpacity onPress={() => setShowEmoji(true)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <SmileyIcon />
          </TouchableOpacity>
          <EmojiPickerSheet
            visible={showEmoji}
            onClose={() => setShowEmoji(false)}
            onSelect={e => setText(prev => prev + e)}
          />
        </View>
        <TouchableOpacity
          style={[styles.commentSubmitBtn, sending && {opacity: 0.85}]}
          onPress={handleSend}
          disabled={sending}>
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.commentSubmitText}>{'Comment'}</Text>
          )}
        </TouchableOpacity>
      </View>
      {showList &&
        (loading ? (
          <ActivityIndicator color="#1A3A6B" style={{paddingVertical: 12}} />
        ) : comments.length === 0 ? (
          <Text style={styles.noComments}>{'No comments yet. Be first!'}</Text>
        ) : (
          comments.map(c => (
            <View key={c.id} style={styles.commentItem}>
              <Image source={{uri: c.author.avatar}} style={styles.commentAvatar} />
              <View style={styles.commentBubble}>
                <Text style={styles.commentAuthorName}>{c.author.name}</Text>
                <Text style={styles.commentContent}>{c.content}</Text>
                <View style={styles.commentFooterRow}>
                  <Text style={styles.commentTime}>{c.time}</Text>
                  <TouchableOpacity
                    style={styles.commentLikeBtn}
                    onPress={() =>
                      typeof c.id === 'number' && handleLikeComment(c.id, c.liked)
                    }
                    disabled={typeof c.id !== 'number'}>
                    {c.liked ? <LikedIcon /> : <LikeIcon color="#8F9098" />}
                  </TouchableOpacity>
                  {c.likes > 0 && (
                    <TouchableOpacity
                      onPress={() =>
                        navigation?.navigate('LikedBy', {
                          likedBy: c.likedBy || [],
                          likesCount: c.likes,
                          title: 'Liked by',
                          // Needed as a fallback fetch by LikedByScreen when
                          // c.likedBy comes back empty even though c.likes
                          // is > 0 — the comment list endpoint doesn't
                          // always embed liked_by.
                          postId: typeof c.id === 'number' ? c.id : undefined,
                        })
                      }>
                      <Text style={styles.commentLikeCount}>
                        {`${c.likes} ${c.likes === 1 ? 'Like' : 'Likes'}`}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {typeof c.id === 'number' && c.author.id !== myUserId && (
                    <TouchableOpacity
                      style={styles.commentReportBtn}
                      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                      onPress={() =>
                        openCommentOptions?.({
                          id: c.id,
                          authorId: c.author.id,
                          authorName: c.author.name,
                          authorAvatar: c.author.avatar,
                        })
                      }>
                      <Text style={styles.commentReportText}>{'•••'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))
        ))}
    </View>
  );
};

// ─── Skeleton loader ──────────────────────────────────────────────────────────
const PostSkeleton = () => (
  <View style={styles.postCard}>
    <View style={[styles.postHeader, {marginBottom: 12}]}>
      <View style={[styles.skeletonCircle, {width: 44, height: 44}]} />
      <View style={{flex: 1, gap: 6}}>
        <View style={[styles.skeletonLine, {width: '55%'}]} />
        <View style={[styles.skeletonLine, {width: '38%', height: 10}]} />
      </View>
    </View>
    <View style={[styles.skeletonLine, {width: '100%', marginBottom: 6}]} />
    <View style={[styles.skeletonLine, {width: '82%', marginBottom: 6}]} />
    <View style={[styles.skeletonLine, {width: '62%', marginBottom: 16}]} />
  </View>
);

// ─── Post Card ────────────────────────────────────────────────────────────────
// PERF: memoised so a card only re-renders when its own props change (its post
// object, expandedId, my* info, or a handler identity) instead of every card
// re-rendering on each FeedScreen state change (modals, toast, pagination...).
const PostCard = React.memo(({
  post,
  myUserId,
  myName,
  myAvatar,
  onLike,
  onCommentPress,
  onCommentPosted,
  expandedId,
  onDotsPress,
  navigation,
}: any) => {
  const isForumPost = post.type === 'forum';
  const isExpanded = expandedId === post.id;
  const isIntro = post.type === 'intro';
  const isOwnPost = post.author.id === myUserId;
  const [textExpanded, setTextExpanded] = useState(false);
  // forumMeta.type is the exact "New Forum"/"Forum Reply" label computed in
  // feedApi.ts from the activity's raw bbp_topic_create/bbp_reply_create
  // type — same source of truth used for the icon choice below, so the
  // badge always matches (never guessed independently here).
  const isForumReply = post.forumMeta?.type === 'Forum Reply';

  const displayedContent =
    textExpanded && post.fullContent ? post.fullContent : post.content;

  return (
    <View style={styles.postCard}>
      {isIntro && (
        <View style={styles.newMemberBadgeRow}>
          <View style={styles.newMemberBadge}>
            <Text style={styles.newMemberBadgeText}>{'New Member'}</Text>
          </View>
        </View>
      )}

      {/* Post header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.postHeaderTapArea}
          activeOpacity={0.85}
          onPress={() => navigation?.push('MemberProfile', {userId: post.author.id})}>
          <Image source={{uri: post.author.avatar}} style={styles.postAvatar} />
          <View style={styles.postAuthorInfo}>
            <View style={styles.nameWithFlag}>
              <Text style={[styles.postAuthorName, isIntro && styles.postAuthorNameBold]}>
                {post.author.name}
              </Text>
              {post.author.flag ? (
                <Text style={styles.flagText}>{` ${post.author.flag}`}</Text>
              ) : null}
            </View>
            <Text style={styles.postAuthorMeta}>
              {[post.author.title, post.time].filter(Boolean).join(', ')}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.moreBtn}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          onPress={() => onDotsPress(post, isOwnPost)}>
          <DotsIcon />
        </TouchableOpacity>
      </View>

      {/* Post body */}
      {post.title ? <Text style={styles.postTitle}>{post.title}</Text> : null}
      <LinkifiedText
        text={displayedContent}
        style={styles.postContent}
        linkStyle={styles.postContentLink}
      />
      {post.truncated ? (
        <TouchableOpacity onPress={() => setTextExpanded(v => !v)} activeOpacity={0.7}>
          <Text style={styles.showMore}>
            {textExpanded ? 'Show less' : isForumPost ? 'Read more' : 'Show more'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {post.image ? (
        <Image
          source={{uri: post.image}}
          style={[
            styles.postImage,
            {aspectRatio: post.imageAspectRatio || 16 / 9, height: undefined},
          ]}
          resizeMode="cover"
        />
      ) : null}

      {post.linkPreview ? (
        <TouchableOpacity
          style={styles.linkPreview}
          onPress={() => post.linkPreview?.url && Linking.openURL(post.linkPreview.url).catch(() => {})}>
          <Image source={{uri: post.linkPreview.image}} style={styles.linkPreviewImage} />
          <View style={styles.linkPreviewContent}>
            <Text style={styles.linkPreviewTitle} numberOfLines={2}>{post.linkPreview.title}</Text>
            <Text style={styles.linkPreviewUrl}>{post.linkPreview.url}</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Tags row — own row, above the forum-type badge. */}
      {isForumPost && post.forumTags?.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.forumTagsRow}
          contentContainerStyle={styles.forumTagsRowContent}>
          {post.forumTags.map((tag: string, i: number) => (
            <View key={i} style={styles.forumTag}>
              <Text style={styles.forumTagText} numberOfLines={1}>{tag}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {/* New Forum/Forum Reply badge + "N People Involved" — same row, per
          Figma. Badge uses the same icon/gradient-text treatment as
          MemberProfileScreen's forum cards, so a discussion reads
          identically in both places. */}
      {isForumPost ? (
        <View style={styles.forumBadgeRow}>
          <View style={styles.forumBadgeGroup}>
            {isForumReply ? <ForumReplyIcon /> : <NewForumIcon />}
            <ForumBadgeLabel text={post.forumMeta?.type || (isForumReply ? 'Forum Reply' : 'New Forum')} />
          </View>
          {post.forumMeta?.people ? (
            <View style={styles.peopleInvolvedGroup}>
              <PeopleIcon />
              <Text style={styles.peopleInvolvedText}>
                {`${post.forumMeta.people} People Involved`}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {isForumPost ? (
        <TouchableOpacity
          style={styles.joinDiscussionWrap}
          activeOpacity={0.85}
          disabled={!post.topicId}
          onPress={() => {
            if (!post.topicId) return;
            navigation?.navigate('ForumTopic', {topicId: post.topicId});
          }}>
          <LinearGradient
            colors={['#084D92', '#C157DE']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.joinDiscussionBtn}>
            <Text style={styles.joinDiscussionText}>{'Join Discussion'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <View style={styles.postStats}>
          <View style={styles.statBtn}>
            <TouchableOpacity
              onPress={() => onLike(post.id, post.liked)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 4}}>
              {post.liked ? <LikedIcon /> : <LikeIcon color="#192546" />}
            </TouchableOpacity>
            {post.likes > 0 && (
              <TouchableOpacity
                onPress={() =>
                  navigation?.navigate('LikedBy', {
                    likedBy: post.likedBy || [],
                    likesCount: post.likes,
                    title: 'Liked by',
                    // Fallback fetch id for LikedByScreen — see comment on
                    // the comment-likes navigate() call above; same fix.
                    postId: post.id,
                  })
                }
                hitSlop={{top: 8, bottom: 8, left: 4, right: 8}}>
                <Text style={[styles.statText, post.liked && styles.statTextActive]}>
                  {`${post.likes} ${post.likes === 1 ? 'Like' : 'Likes'}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.statBtn}
            onPress={() => onCommentPress(post.id)}>
            <CommentIcon />
            <Text style={styles.statText}>{`${post.comments} Comment${post.comments > 1 ? 's' : ''}`}</Text>
          </TouchableOpacity>

          {isIntro && (
            <TouchableOpacity
              style={[styles.statBtn, {marginLeft: 'auto' as any}]}
              onPress={() => navigation?.navigate('Intros')}>
              <Text style={styles.seeIntrosText}>{'› See Intros'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!isForumPost && isExpanded && (
        <CommentsPanel
          postId={post.id}
          myUserId={myUserId}
          myName={myName}
          myAvatar={myAvatar}
          showList={isExpanded}
          onCommentPosted={onCommentPosted}
          navigation={navigation}
        />
      )}
    </View>
  );
});

// PERF: module-level constants so FlatList props keep a stable identity.
const EMPTY_POSTS: FeedPost[] = [];
const postKeyExtractor = (post: FeedPost) => String(post.id);

// ─── Main FeedScreen ──────────────────────────────────────────────────────────
const FeedScreen = ({navigation}: any) => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  // Tracks which member IDs currently have a follow/unfollow request in
  // flight, so the button can show a spinner instead of looking inert
  // while awaiting the real backend response.
  const [followBusy, setFollowBusy] = useState<Record<number, boolean>>({});
  const [hasMore, setHasMore] = useState(true);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [myName, setMyName] = useState<string | null>(null);

  // PERF: latest pagination state for the FlatList onEndReached handler, which
  // is a stable callback and so must read through refs (never stale closures).
  const pageRef = useRef(page);
  const hasMoreRef = useRef(hasMore);
  const loadingMoreRef = useRef(loadingMore);
  const loadingFeedRef = useRef(loadingFeed);
  const postsCountRef = useRef(posts.length);
  pageRef.current = page;
  hasMoreRef.current = hasMore;
  loadingMoreRef.current = loadingMore;
  loadingFeedRef.current = loadingFeed;
  postsCountRef.current = posts.length;
  // Synchronous in-flight lock: loadingMore state only lands on the next
  // render, so without this two rapid onEndReached calls could both pass.
  const endReachedLockRef = useRef(false);

  // More options state
  const [moreOptionsPost, setMoreOptionsPost] = useState<FeedPost | null>(null);
  const [moreOptionsIsOwn, setMoreOptionsIsOwn] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  // Comment "…" menu: Report comment / Block author.
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(null);
  const [showCommentMenu, setShowCommentMenu] = useState(false);
  const [showCommentReport, setShowCommentReport] = useState(false);
  const [showCommentBlock, setShowCommentBlock] = useState(false);
  const [blockedToast, setBlockedToast] = useState('');

  // Mute toast state
  const [muteToastVisible, setMuteToastVisible] = useState(false);
  const [muteToastMuted, setMuteToastMuted] = useState(false);

  // First-run / reinstall notification permission prompt
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  useEffect(() => {
    initUser();
    loadInitialData();
    checkNotifPrompt();
  }, []);

  const checkNotifPrompt = async () => {
    try {
      const seen = await AsyncStorage.getItem(NOTIF_PROMPT_SEEN_KEY);
      if (!seen) {
        // Small delay so it doesn't flash in before the feed has rendered.
        setTimeout(() => setShowNotifPrompt(true), 800);
      }
    } catch {
      // If AsyncStorage read fails, don't block the feed on it — just skip
      // showing the prompt this session rather than crashing.
    }
  };

  const dismissNotifPrompt = async () => {
    setShowNotifPrompt(false);
    try {
      await AsyncStorage.setItem(NOTIF_PROMPT_SEEN_KEY, '1');
    } catch {}
  };

  const handleAllowNotifications = () => {
    // Dismiss right away rather than awaiting registration first — on iOS,
    // messaging().getToken() called right after a fresh permission grant
    // can hang waiting on the APNs device token to finish registering,
    // which previously left the modal stuck open with no way to close it.
    // requestUserPermissionAndRegister() still runs, just in the
    // background, and logs its own success/failure independently.
    dismissNotifPrompt();
    requestUserPermissionAndRegister().catch(err => {
      console.log('[FeedScreen] handleAllowNotifications error:', err);
    });
  };

  const initUser = async () => {
    // NOTE: a debug console.log of the bearer token used to live here. Removed
    // — it leaked the auth token to device logs and forced an extra Keychain
    // read before the feed's first request could start.
    const userId = await getUserIdFromToken();
    setMyUserId(userId);
    if (userId) {
      const profile = await getMemberProfile(userId);
      if (profile?.avatar_urls?.thumb) setMyAvatar(profile.avatar_urls.thumb);
      if (profile?.name) setMyName(profile.name);
      // Also enrich posts with designation/flag after loading
    }
  };

  const loadInitialData = async () => {
    setError('');
    await Promise.all([loadFeed(1, true), loadMembers()]);
  };

  const loadFeed = async (pageNum: number, reset = false) => {
    if (reset) setLoadingFeed(true);
    else setLoadingMore(true);
    try {
      const data = await getFeed(pageNum);

      // PERF: the feed used to block on THREE sequential network stages
      // (activity list → author profile batch → per-topic tag fetches)
      // before it rendered a single post, so every open of this screen paid
      // for all three round trips back to back. The posts themselves are
      // renderable as soon as the first request returns — author
      // title/flag and forum tags are cosmetic extras — so we render
      // immediately and fill those in below, in parallel, in the background.
      if (reset) setPosts(data);
      else setPosts(prev => [...prev, ...data]);
      setHasMore(data.length === 15);
      setPage(pageNum);
      // PERF: keep the onEndReached guards' refs current immediately (state
      // only lands on the next render) so a fast second fire can't re-request
      // the same page.
      pageRef.current = pageNum;
      hasMoreRef.current = data.length === 15;
      setLoadingFeed(false);
      setLoadingMore(false);
      setRefreshing(false);

      enrichPosts(data);
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        navigation?.replace('SignIn');
        return;
      }
      setError('Could not load feed. Pull down to retry.');
    } finally {
      setLoadingFeed(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Best-effort background enrichment for a page of posts. Author profiles
  // (designation + country flag, one batched request) and forum topic
  // tags/"People Involved" (one request per forum post) are independent of
  // each other, so they run in parallel and each patches the already-rendered
  // posts by id when it lands. Failures are swallowed — the card just keeps
  // showing the basic data it already has.
  const enrichPosts = (pagePosts: FeedPost[]) => {
    const authorIds = pagePosts.map(post => post.author.id);
    getMembersBatch(authorIds)
      .then(profiles => {
        if (profiles.size === 0) return;
        const byId = new Map<number, FeedPost['author']>();
        pagePosts.forEach(post => {
          const profile = profiles.get(post.author.id);
          if (!profile) return;
          const groups = profile?.xprofile?.groups?.['1']?.fields;
          const country = groups?.['1099']?.value?.raw || '';
          byId.set(post.id, {
            ...post.author,
            name: resolveFullName(profile, post.author.name),
            title: groups?.['1097']?.value?.raw || '',
            flag: countryFlag(country),
            country,
          });
        });
        setPosts(prev =>
          prev.map(p => (byId.has(p.id) ? {...p, author: byId.get(p.id)!} : p)),
        );
      })
      .catch(() => {});

    const forumTopicIds = pagePosts
      .filter(p => p.type === 'forum' && p.topicId)
      .map(p => p.topicId as number);
    if (forumTopicIds.length > 0) {
      getTopicTagsAndVoices(forumTopicIds)
        .then(topicData => {
          setPosts(prev =>
            prev.map(post => {
              if (post.type !== 'forum' || !post.topicId) return post;
              const extra = topicData.get(post.topicId);
              if (!extra) return post;
              return {
                ...post,
                forumTags: extra.tags.length ? extra.tags : post.forumTags,
                forumMeta: post.forumMeta
                  ? {...post.forumMeta, people: extra.voiceCount || post.forumMeta.people}
                  : post.forumMeta,
              };
            }),
          );
        })
        .catch(() => {});
    }
  };

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const data = await getNewestMembers();
      setMembers(data);
    } catch {
    } finally {
      setLoadingMembers(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeed(1, true);
    loadMembers();
  }, []);

  // PERF: replaces the manual onScroll pagination. Same guards as before
  // (+ posts.length > 0 && !loadingFeed), plus a ref lock so it can't double-fire.
  const loadFeedRef = useRef(loadFeed);
  loadFeedRef.current = loadFeed;
  const handleEndReached = useCallback(() => {
    if (
      endReachedLockRef.current ||
      loadingMoreRef.current ||
      !hasMoreRef.current ||
      postsCountRef.current === 0 ||
      loadingFeedRef.current
    ) {
      return;
    }
    endReachedLockRef.current = true;
    loadFeedRef
      .current(pageRef.current + 1)
      .catch(() => {})
      .finally(() => {
        endReachedLockRef.current = false;
      });
  }, []);

  // PERF: handlers below are useCallback([]) so PostCard's memo holds. They
  // only use functional setPosts/setExpandedPostId updaters and module-level
  // APIs, so nothing they read can go stale.
  const handleLike = useCallback(async (postId: number, currentlyLiked: boolean) => {
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? {...p, liked: !currentlyLiked, likes: currentlyLiked ? p.likes - 1 : p.likes + 1}
          : p,
      ),
    );
    try {
      await toggleLike(postId, currentlyLiked);
    } catch {
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? {...p, liked: currentlyLiked, likes: currentlyLiked ? p.likes + 1 : p.likes - 1}
            : p,
        ),
      );
    }
  }, []);

  const handleCommentPosted = useCallback((postId: number, delta: number) => {
    setPosts(prev =>
      prev.map(p =>
        p.id === postId ? {...p, comments: Math.max(0, p.comments + delta)} : p,
      ),
    );
  }, []);

  // PERF: stable (was an inline arrow created per card per render).
  const handleCommentPress = useCallback((id: number) => {
    setExpandedPostId(prev => (prev === id ? null : id));
  }, []);

  const handleFollow = async (memberId: number, currentlyFollowing: boolean) => {
    if (followBusy[memberId]) return; // already in flight, ignore repeat taps
    setFollowBusy(prev => ({...prev, [memberId]: true}));
    setMembers(prev =>
      prev.map(m => (m.id === memberId ? {...m, following: !currentlyFollowing} : m)),
    );
    try {
      await toggleFollow(memberId, currentlyFollowing);
    } catch (err: any) {
      setMembers(prev =>
        prev.map(m => (m.id === memberId ? {...m, following: currentlyFollowing} : m)),
      );
      Alert.alert(
        'Something went wrong',
        currentlyFollowing
          ? "Couldn't unfollow this member. Please try again."
          : "Couldn't follow this member. Please try again.",
      );
      console.log('[FeedScreen] toggleFollow', err);
    } finally {
      setFollowBusy(prev => {
        const next = {...prev};
        delete next[memberId];
        return next;
      });
    }
  };

  const handleDotsPress = useCallback((post: FeedPost, isOwn: boolean) => {
    setMoreOptionsPost(post);
    setMoreOptionsIsOwn(isOwn);
    setShowMoreOptions(true);
  }, []);

  const handleMuteToggle = async () => {
    if (!moreOptionsPost) return;
    setShowMoreOptions(false);
    const currentlyMuted = moreOptionsPost.isMuted ?? false;
    try {
      if (currentlyMuted) {
        await unmuteActivity(moreOptionsPost.id);
      } else {
        await muteActivity(moreOptionsPost.id);
      }
      setPosts(prev =>
        prev.map(p =>
          p.id === moreOptionsPost.id ? {...p, isMuted: !currentlyMuted} : p,
        ),
      );
      setMuteToastMuted(!currentlyMuted);
      setMuteToastVisible(true);
      setTimeout(() => setMuteToastVisible(false), 2500);
    } catch {}
  };

  const handleDeletePress = () => {
    setShowMoreOptions(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!moreOptionsPost) return;
    setShowDeleteConfirm(false);
    try {
      await deleteActivity(moreOptionsPost.id);
      setPosts(prev => prev.filter(p => p.id !== moreOptionsPost.id));
    } catch {
      Alert.alert('Error', 'Could not delete post.');
    }
  };

  const handleEditPress = () => {
    setShowMoreOptions(false);
    navigation?.navigate('CreatePost', {
      editMode: true,
      postId: moreOptionsPost?.id,
      initialContent: moreOptionsPost?.content,
    });
  };

  const handleReportPress = () => {
    setShowMoreOptions(false);
    setShowReport(true);
  };

  useEffect(() => {
    openCommentOptions = c => {
      setCommentTarget(c);
      setShowCommentMenu(true);
    };
    return () => {
      openCommentOptions = null;
    };
  }, []);

  // Sheets that are native Modals can't open while the menu Modal is still
  // dismissing on iOS, hence the short delay.
  const handleCommentReportPress = () => {
    setShowCommentMenu(false);
    setTimeout(() => setShowCommentReport(true), 400);
  };

  const handleCommentBlockPress = () => {
    setShowCommentMenu(false);
    setShowCommentBlock(true);
  };

  // POST /blocked-members {user_id}. Their posts leave the feed, same as
  // blocking from a post.
  const handleCommentBlockConfirm = async () => {
    const target = commentTarget;
    setShowCommentBlock(false);
    if (!target) return;
    const err = await blockAuthor(target.authorId, {
      name: target.authorName,
      avatarUrl: target.authorAvatar,
    });
    if (err) {
      Alert.alert('Could not block member', err);
      return;
    }
    setPosts(prev => prev.filter(p => p.author.id !== target.authorId));
    setBlockedToast(`You blocked ${target.authorName}.`);
  };

  const handleCommentReportSubmit = async (reasons: string[], note: string) => {
    if (!commentTarget) return;
    await submitReport('activity_comment', commentTarget.id, reasons, note);
  };

  const handleBlockPress = () => {
    setShowMoreOptions(false);
    setShowBlock(true);
  };

  // POST /blocked-members/post {activity_id}: blocks that post's author.
  // On success their posts leave the feed and the shared blocked list updates.
  const handleBlockConfirm = async () => {
    const post = moreOptionsPost;
    setShowBlock(false);
    if (!post) return;
    try {
      const m = await blockPostAuthor(post.id);
      const authorId = m?.id || post.author.id;
      const name = m?.name || post.author.name;
      markMemberBlocked({
        id: authorId,
        name,
        avatarUrl: m?.avatarUrl || post.author.avatar,
        title: post.author.title,
      });
      setPosts(prev => prev.filter(p => p.author.id !== authorId));
      setBlockedToast(`You blocked ${name}.`);
    } catch (e: any) {
      Alert.alert('Could not block member', e?.message || 'Please try again.');
    }
  };

  // POST /buddyboss/v1/moderation/report (item_type 'activity'). Errors bubble
  // up to the modal, which shows the server's message.
  const handleReportSubmit = async (reasons: string[], note: string) => {
    if (!moreOptionsPost) return;
    await submitReport('activity', moreOptionsPost.id, reasons, note);
  };

  // PERF: renderItem is memoised; it changes identity only when something a
  // card displays changes (expanded card, my profile info) or a handler does
  // (they're all stable), so FlatList doesn't re-render cells needlessly.
  const renderPost = useCallback(
    ({item}: {item: FeedPost}) => (
      <PostCard
        post={item}
        myUserId={myUserId}
        myName={myName}
        myAvatar={myAvatar}
        onLike={handleLike}
        onCommentPress={handleCommentPress}
        onCommentPosted={handleCommentPosted}
        expandedId={expandedPostId}
        onDotsPress={handleDotsPress}
        navigation={navigation}
      />
    ),
    [
      myUserId,
      myName,
      myAvatar,
      expandedPostId,
      handleLike,
      handleCommentPress,
      handleCommentPosted,
      handleDotsPress,
      navigation,
    ],
  );

  // PERF: FlatList is a PureComponent — cards depend on state that isn't in
  // `data`, so surface it via a memoised extraData (stable unless one changes).
  const listExtraData = useMemo(
    () => ({expandedPostId, myUserId, myName, myAvatar}),
    [expandedPostId, myUserId, myName, myAvatar],
  );

  // PERF: stable array identity for the (non-memoised) members section.
  const otherMembers = useMemo(
    () => members.filter(m => m.id !== myUserId),
    [members, myUserId],
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      <AppHeader
        navigation={navigation}
        onDrawerOpen={() => setDrawerOpen(true)}
      />

      {/* PERF: virtualized list replaces ScrollView + posts.map(). Only the
          visible window of PostCards is mounted/rendered. Header = everything
          above the posts, footer = everything below. Not nested in any other
          vertical ScrollView. */}
      <FlatList
        // While the feed is (re)loading the skeletons replace the posts, exactly
        // as before, so feed an empty list in that state.
        data={loadingFeed ? EMPTY_POSTS : posts}
        renderItem={renderPost}
        keyExtractor={postKeyExtractor}
        extraData={listExtraData}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1A3A6B']}
            tintColor="#1A3A6B"
          />
        }
        // PERF: onEndReached replaces the manual onScroll/scrollEventThrottle
        // pagination (guarded + ref-locked in handleEndReached).
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        // PERF: render/window tuning for faster first render and smoother scroll.
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        ListHeaderComponent={
          <>
            <CreatePostBar myAvatar={myAvatar} onPress={() => navigation?.navigate('CreatePost')} />

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={loadInitialData}>
                  <Text style={styles.retryText}>{'Retry'}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {loadingFeed ? (
              <>
                <PostSkeleton />
                <PostSkeleton />
                <PostSkeleton />
              </>
            ) : posts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>{'📋'}</Text>
                <Text style={styles.emptyTitle}>{'No posts yet'}</Text>
                <Text style={styles.emptySubtitle}>
                  {'Be the first to share something with the community!'}
                </Text>
              </View>
            ) : null}
          </>
        }
        ListFooterComponent={
          <>
            <NewestMembersSection
              members={otherMembers}
              loading={loadingMembers}
              followBusy={followBusy}
              onFollow={handleFollow}
              navigation={navigation}
            />

            {!loadingFeed && loadingMore && hasMore && posts.length > 0 && (
              <ActivityIndicator
                color="#1A3A6B"
                style={{marginVertical: 16}}
              />
            )}

            <View style={{height: 100}} />
          </>
        }
      />

      {/* Gradient FAB — 16px above nav bar, 16px from right edge.
          FeedScreen is tab content inside BottomTabNavigator, so its own
          bottom edge already sits above the nav bar — no need to add the
          nav bar's height here. */}
      <TouchableOpacity
        style={[styles.fab, {bottom: 16, right: 16}, fabMenuOpen && {opacity: 0}]}
        onPress={() => setFabMenuOpen(true)}
        activeOpacity={0.85}>
        <Svg width={45} height={45} viewBox="0 0 45 45" fill="none">
          <Defs>
            <SvgLinearGradient id="fabGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#084D92" />
              <Stop offset="1" stopColor="#C157DE" />
            </SvgLinearGradient>
          </Defs>
          <Circle cx="22.5" cy="22.5" r="22.5" fill="url(#fabGrad)" />
          <Path fillRule="evenodd" clipRule="evenodd" d="M22.3096 11.999C23.2586 11.999 24.0281 12.7688 24.0283 13.7178V20.5908H30.9062C31.8553 20.591 32.625 21.3605 32.625 22.3096C32.625 23.2587 31.8553 24.0281 30.9062 24.0283H24.0283V30.9062C24.0281 31.8553 23.2586 32.625 22.3096 32.625C21.3605 32.6249 20.5911 31.8552 20.5908 30.9062V24.0283H13.7188C12.7695 24.0283 12 23.2588 12 22.3096C12 21.3603 12.7695 20.5908 13.7188 20.5908H20.5908V13.7178C20.5911 12.7688 21.3605 11.9991 22.3096 11.999Z" fill="white" />
        </Svg>
      </TouchableOpacity>

      {/* More Options Sheet */}
      <MoreOptionsSheet
        visible={showMoreOptions}
        isOwnPost={moreOptionsIsOwn}
        isMuted={moreOptionsPost?.isMuted ?? false}
        onClose={() => setShowMoreOptions(false)}
        onMuteToggle={handleMuteToggle}
        onDelete={handleDeletePress}
        onEdit={handleEditPress}
        onReport={handleReportPress}
        authorName={moreOptionsPost?.author?.name ?? ''}
        canBlock={!!moreOptionsPost && moreOptionsPost.type !== 'ipm'}
        onBlock={handleBlockPress}
      />

      {/* Comment "…" menu */}
      <AuthorOptionsSheet
        visible={showCommentMenu}
        onClose={() => setShowCommentMenu(false)}
        reportLabel="Report comment"
        onReport={handleCommentReportPress}
        authorName={commentTarget?.authorName}
        onBlock={handleCommentBlockPress}
      />
      <ReportModal
        visible={showCommentReport}
        noun="Comment"
        showIntro={false}
        onClose={() => setShowCommentReport(false)}
        onSubmit={handleCommentReportSubmit}
      />
      <BlockMemberSheet
        visible={showCommentBlock}
        name={commentTarget?.authorName ?? ''}
        onClose={() => setShowCommentBlock(false)}
        onConfirm={handleCommentBlockConfirm}
      />

      {/* Block member confirmation (same sheet as profile / DM) */}
      <BlockMemberSheet
        visible={showBlock}
        name={moreOptionsPost?.author?.name ?? ''}
        onClose={() => setShowBlock(false)}
        onConfirm={handleBlockConfirm}
      />
      <SuccessToast
        visible={!!blockedToast}
        variant="info"
        message={blockedToast}
        onHide={() => setBlockedToast('')}
      />

      {/* Delete Confirm */}
      <DeleteConfirmSheet
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Report Modal */}
      <ReportModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        onSubmit={handleReportSubmit}
      />

      {/* Mute Toast */}
      <MuteToast visible={muteToastVisible} muted={muteToastMuted} />

      {/* First-run / reinstall notification permission prompt */}
      <NotificationPermissionModal
        visible={showNotifPrompt}
        onAllow={handleAllowNotifications}
        onSkip={dismissNotifPrompt}
      />

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
      <FabMenu visible={fabMenuOpen} onClose={() => setFabMenuOpen(false)} navigation={navigation} />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F2F4F7'},

  createPostBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  createPostAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  avatarPlaceholder: {
    backgroundColor: '#1A3A6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {color: '#FFF', fontSize: 11, fontWeight: '700'},
  createPostInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  createPostPlaceholder: {fontSize: 14, color: '#AAAAAA'},

  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#192546',
    marginBottom: 14,
    fontFamily: 'Runda',
  },

  // Newest Members — Figma slider row
  newestMembersRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    paddingRight: 4,
  },
  // Each card — Figma: 120px, padding 16/8, shadow, borderRadius 5
  newestMemberCard: {
    width: 120,
    paddingHorizontal: 8,
    paddingVertical: 16,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    borderRadius: 5,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 10.023,
    elevation: 3,
  },
  newestMemberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 50,
    aspectRatio: 1,
  },
  // Figma: Heading/H5 — 12px 500 Navy #192546
  newestMemberName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#192546',
    textAlign: 'center',
    lineHeight: 16,
    alignSelf: 'stretch',
    fontFamily: 'Runda',
  },
  // Figma: Body/Body XS — 10px 400 #8F9098 lineHeight 14
  newestMemberRole: {
    fontSize: 10,
    fontWeight: '400',
    color: '#8F9098',
    textAlign: 'center',
    lineHeight: 14,
    alignSelf: 'stretch',
    fontFamily: 'Runda',
  },
  newestFollowBtn: {
    backgroundColor: '#1A3A6B',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: '100%',
    alignItems: 'center',
  },
  newestFollowingBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1A3A6B',
  },
  newestFollowBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Runda',
  },
  newestFollowingBtnText: {color: '#1A3A6B'},

  // Post Card — Figma exact
  postCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    marginHorizontal: 12,
    borderRadius: 8.201,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 10.023,
    elevation: 3,
  },

  newMemberBadgeRow: {flexDirection: 'row', marginBottom: 8},
  newMemberBadge: {
    backgroundColor: '#EEF3FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newMemberBadgeText: {fontSize: 11, color: '#1A3A6B', fontWeight: '600'},

  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  postHeaderTapArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 10,
  },
  postAvatar: {width: 44, height: 44, borderRadius: 22, marginRight: 10},
  postAuthorInfo: {flex: 1},
  postAuthorName: {fontSize: 14, fontWeight: '700', color: '#192546', fontFamily: 'Runda'},
  postAuthorNameBold: {fontWeight: '800'},
  postAuthorMeta: {fontSize: 12, color: '#8F9098', marginTop: 2, fontFamily: 'Runda'},
  moreBtn: {paddingTop: 2},

  nameWithFlag: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap'},
  flagText: {fontSize: 14},

  // Figma: Heading/H3
  postTitle: {
    fontSize: 16,
    color: '#192647',
    lineHeight: 20,
    letterSpacing: 0.08,
    marginBottom: 6,
    fontFamily: 'Runda-Bold',
  },
  // Figma: Body/Body M
  postContent: {
    fontSize: 14,
    color: '#192546',
    lineHeight: 18,
    marginBottom: 4,
    fontFamily: 'Runda',
    fontWeight: '400',
  },
  postContentLink: {
    color: '#46B0E3',
    textDecorationLine: 'underline',
  },
  // Figma: show more = Light Blue, Action/Action L
  showMore: {
    color: '#46B0E3',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
    fontFamily: 'Runda',
  },
  postImage: {width: '100%', height: 200, borderRadius: 8, marginBottom: 12},

  linkPreview: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  linkPreviewImage: {width: 80, height: 80, backgroundColor: '#EEE'},
  linkPreviewContent: {flex: 1, padding: 10, justifyContent: 'center'},
  linkPreviewTitle: {fontSize: 13, fontWeight: '600', color: '#1A1A1A', lineHeight: 18, marginBottom: 4},
  linkPreviewUrl: {fontSize: 11, color: '#AAAAAA'},

  // Tags row — its own row, above the forum-type badge row.
  forumTagsRow: {marginTop: 8, marginBottom: 8},
  forumTagsRowContent: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 4},
  // Figma: tag pill — width 96, padding 4px 10px, border-radius 30,
  // 0.5px solid #192647 border, centered content.
  forumTag: {
    minWidth: 113,
    paddingVertical: 4,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 0.5,
    borderColor: '#192647',
  },
  // Figma: Action/Action M
  forumTagText: {
    color: '#192647',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '500',
  },

  // New Forum/Forum Reply badge + "N People Involved" — same row, per Figma:
  // badge on the left, people-involved on the right.
  forumBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 10,
  },
  forumBadgeGroup: {flexDirection: 'row', alignItems: 'center', gap: 4},
  forumBadgeText: {fontFamily: 'Runda', fontSize: 12, fontWeight: '500', lineHeight: 16, color: '#000'},

  // "N People Involved" — solid-fill (non-gradient) icon + text.
  peopleInvolvedGroup: {flexDirection: 'row', alignItems: 'center', gap: 6},
  peopleInvolvedText: {
    color: '#192647',
    fontFamily: 'Runda-Bold',
    fontSize: 12,
  },

  // iOS: the button used to get its height from paddingVertical inside the
  // LinearGradient. On iOS that height was mis-measured inside the FlatList
  // row, so the card ended early and the next card covered the button
  // (Android was fine). Fixed, explicit height + flex:1 gradient removes the
  // dependence on measuring padding.
  joinDiscussionWrap: {height: 46, marginBottom: 14, borderRadius: 10, overflow: 'hidden', alignSelf: 'stretch'},
  joinDiscussionBtn: {flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  joinDiscussionText: {color: '#FFFFFF', fontSize: 15, lineHeight: 20, fontWeight: '700'},

  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
  },
  statBtn: {flexDirection: 'row', alignItems: 'center', gap: 5},
  statText: {fontSize: 13, color: '#192546', fontWeight: '700'},
  statTextActive: {color: '#0C4D91', fontFamily: 'Runda', fontSize: 12, fontWeight: '500'},
  seeIntrosText: {fontSize: 13, color: '#1A3A6B', fontWeight: '600'},

  commentsPanel: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    paddingBottom: 12,
  },
  commentInputRow: {flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch', marginBottom: 12},
  commentAvatarSmall: {
    width: 37,
    height: 37,
    borderRadius: 100,
    backgroundColor: '#1A3A6B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  commentAvatarText: {color: '#FFF', fontSize: 12, fontWeight: '700'},
  commentAvatarImage: {width: 37, height: 37, borderRadius: 100},
  commentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#C5C6CC',
    backgroundColor: '#FFFFFF',
  },
  inlineCommentInput: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    padding: 0,
    fontFamily: 'Runda',
  },
  commentSubmitBtn: {
    minHeight: 36,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    backgroundColor: '#0C4D91',
  },
  commentSubmitText: {color: '#FFF', fontSize: 13, fontWeight: '700', fontFamily: 'Runda'},
  noComments: {fontSize: 12, color: '#6B6C75', textAlign: 'center', paddingVertical: 8, fontFamily: 'Runda'},
  commentItem: {flexDirection: 'row', gap: 8, marginBottom: 10},
  commentAvatar: {width: 32, height: 32, borderRadius: 16},
  commentBubble: {flex: 1, backgroundColor: '#F5F5F5', borderRadius: 10, padding: 10},
  commentAuthorName: {fontSize: 13, fontWeight: '700', color: '#1A3A6B', marginBottom: 2},
  commentContent: {fontSize: 13, color: '#333', lineHeight: 18},
  commentTime: {fontSize: 10, color: '#AAA'},
  commentFooterRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6},
  commentLikeBtn: {padding: 2},
  commentLikeCount: {fontSize: 11, color: '#0C4D91', fontWeight: '600', fontFamily: 'Runda'},
  commentReportBtn: {marginLeft: 'auto', paddingVertical: 2, paddingHorizontal: 4},
  commentReportText: {fontSize: 14, letterSpacing: 1, color: '#8F9098', fontWeight: '500', fontFamily: 'Runda'},

  errorBanner: {
    backgroundColor: '#FEF2F2',
    padding: 14,
    marginBottom: 8,
    marginHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {fontSize: 13, color: '#DC2626', flex: 1},
  retryText: {fontSize: 13, color: '#1A3A6B', fontWeight: '600', marginLeft: 8},
  emptyState: {alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32},
  emptyIcon: {fontSize: 48, marginBottom: 16},
  emptyTitle: {fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 8},
  emptySubtitle: {fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20},

  skeletonCircle: {borderRadius: 99, backgroundColor: '#EFEFEF'},
  skeletonLine: {height: 12, borderRadius: 6, backgroundColor: '#EFEFEF', marginBottom: 4},

  loadMoreBtn: {
    backgroundColor: '#1A1A3E',
    marginHorizontal: 16,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  loadMoreText: {color: '#FFFFFF', fontSize: 15, fontWeight: '600'},

  fab: {
    position: 'absolute',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    shadowColor: '#084D92',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});

// ─── Report Modal Styles ──────────────────────────────────────────────────────

// ─── More Options Styles ──────────────────────────────────────────────────────
const ms = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end'},
  // Figma: column, gap 24 between header and options box.
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 36,
    gap: 24,
  },
  // Figma header: height 56, padding 18 24 16.5; title centred, X on the right.
  sheetHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 18,
    paddingBottom: 16.5,
    paddingHorizontal: 24,
    position: 'relative',
  },
  // Figma Heading/H3
  sheetTitle: {
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.08,
    textAlign: 'center',
    color: '#0C4D91',
    fontFamily: 'Runda-Medium',
  },
  closeBtn: {position: 'absolute', right: 24, top: 18, height: 20, width: 20, alignItems: 'center', justifyContent: 'center'},
  // Figma options box: padding 0 16, gap 6.
  options: {alignSelf: 'stretch', paddingHorizontal: 16, gap: 6},
  // Figma row: padding 12 20, gap 10, align center
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  // Figma Action/Action L (14, weight 500, navy)
  optionText: {fontSize: 14, color: '#192546', fontFamily: 'Runda-Medium'},
});

// ─── Delete Confirm Styles ────────────────────────────────────────────────────
const ds = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  title: {fontSize: 17, fontWeight: '700', color: '#192546', textAlign: 'center', marginBottom: 12, fontFamily: 'Runda'},
  body: {fontSize: 14, color: '#8F9098', textAlign: 'center', lineHeight: 20, marginBottom: 24, fontFamily: 'Runda'},
  deleteBtn: {
    backgroundColor: '#0C4D91',
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteBtnText: {color: '#FFF', fontSize: 15, fontWeight: '700', fontFamily: 'Runda'},
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: '#C5C6CC',
    borderRadius: 50,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelBtnText: {color: '#192546', fontSize: 15, fontWeight: '600', fontFamily: 'Runda'},
});

// ─── Toast Styles ─────────────────────────────────────────────────────────────
const ts = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    zIndex: 999,
  },
  toastInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastTitle: {fontSize: 17, fontWeight: '700', color: '#192546', marginBottom: 12, fontFamily: 'Runda'},
  toastCheck: {marginVertical: 8},
  toastBody: {fontSize: 13, color: '#8F9098', textAlign: 'center', fontFamily: 'Runda'},
});

export default FeedScreen;
