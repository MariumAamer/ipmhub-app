/* eslint-disable prettier/prettier */
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Animated,
  FlatList,
  Dimensions,
  Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import * as Keychain from 'react-native-keychain';
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
  reportActivity,
  getMemberProfile,
  resolveFullName,
  countryFlag,
  FeedPost,
  Member,
} from '../api/feedApi';
import ProfileDrawer from '../components/ProfileDrawer';
import FabMenu from '../components/FabMenu';
import {getUserIdFromToken} from '../api/profileApi';
import Svg, {Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Ellipse, Rect} from 'react-native-svg';
import AppHeader from '../components/AppHeader';

const {width: W} = Dimensions.get('window');

// ─── Report issues ────────────────────────────────────────────────────────────
const REPORT_ISSUES = [
  {key: 'harassment', label: 'Harassment', description: 'Harassment or bullying behavior'},
  {key: 'fraud', label: 'Fraud or scam', description: 'Contains spam, fake content or potential malware'},
  {key: 'violence', label: 'Threats or violence', description: 'Contains abusive or derogatory content'},
  {key: 'misinformation', label: 'Misinformation', description: 'False or misleading information'},
  {key: 'hate', label: 'Hateful Speech', description: 'Promotes hatred or discrimination'},
  {key: 'selfharm', label: 'Self-harm', description: 'Content that encourages self-harm'},
  {key: 'extremism', label: 'Dangerous or extremist organisations', description: 'Promotes dangerous groups'},
];

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
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="#192546" />
  </Svg>
);

const TrashIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#192546" />
  </Svg>
);

const EditIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#192546" />
  </Svg>
);

// ─── Get stored user ──────────────────────────────────────────────────────────
const getStoredUser = async () => {
  try {
    const creds = await Keychain.getGenericPassword();
    if (!creds) return null;
    return JSON.parse(creds.password);
  } catch {
    return null;
  }
};

// ─── Report Modal ─────────────────────────────────────────────────────────────
type ReportStep = 'intro' | 'select' | 'confirm' | 'done';

const ReportModal = ({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reasons: string[]) => void;
}) => {
  const [step, setStep] = useState<ReportStep>('intro');
  const [selected, setSelected] = useState<string[]>([]);

  const reset = () => {
    setStep('intro');
    setSelected([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleIssue = (key: string) => {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    );
  };

  const handleSubmit = () => {
    onSubmit(selected);
    setStep('done');
  };

  const handleDone = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={rs.overlay}>
        <View style={rs.sheet}>
          {/* ── Step: intro ── */}
          {step === 'intro' && (
            <>
              <View style={rs.sheetHeader}>
                <Text style={rs.sheetTitle}>{'Report Post'}</Text>
                <TouchableOpacity onPress={handleClose} style={rs.closeBtn}>
                  <Text style={rs.closeX}>{'✕'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={rs.introText}>
                {'Help us maintain a professional and respectful community.'}
              </Text>
              <TouchableOpacity
                style={rs.primaryBtn}
                onPress={() => setStep('select')}>
                <Text style={rs.primaryBtnText}>{'Continue'}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Step: select ── */}
          {step === 'select' && (
            <>
              <View style={rs.sheetHeader}>
                <Text style={rs.sheetTitle}>{'Report This Post'}</Text>
                <TouchableOpacity onPress={handleClose} style={rs.closeBtn}>
                  <Text style={rs.closeX}>{'✕'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={rs.selectLabel}>
                {'Please select any report issue'}
              </Text>
              <ScrollView style={rs.issueList} showsVerticalScrollIndicator={false}>
                {REPORT_ISSUES.map(issue => (
                  <TouchableOpacity
                    key={issue.key}
                    style={rs.issueRow}
                    onPress={() => toggleIssue(issue.key)}>
                    <Text style={rs.issueLabel}>{issue.label}</Text>
                    <Text style={[rs.issuePlus, selected.includes(issue.key) && rs.issueMinus]}>
                      {selected.includes(issue.key) ? '−' : '+'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[rs.primaryBtn, selected.length === 0 && rs.primaryBtnDisabled]}
                disabled={selected.length === 0}
                onPress={() => setStep('confirm')}>
                <Text style={rs.primaryBtnText}>{'Continue'}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Step: confirm ── */}
          {step === 'confirm' && (
            <>
              <View style={rs.sheetHeader}>
                <Text style={rs.sheetTitle}>{'Report This Post'}</Text>
                <TouchableOpacity onPress={handleClose} style={rs.closeBtn}>
                  <Text style={rs.closeX}>{'✕'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={rs.selectLabel}>
                {"You've selected the following reason"}
              </Text>
              <ScrollView style={rs.selectedList} showsVerticalScrollIndicator={false}>
                {REPORT_ISSUES.filter(i => selected.includes(i.key)).map(issue => (
                  <View key={issue.key} style={rs.selectedItem}>
                    <Text style={rs.selectedItemLabel}>{issue.label}</Text>
                    <Text style={rs.selectedItemDesc}>{issue.description}</Text>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity style={rs.primaryBtn} onPress={handleSubmit}>
                <Text style={rs.primaryBtnText}>{'Submit Report'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={rs.outlineBtn} onPress={() => setStep('select')}>
                <Text style={rs.outlineBtnText}>{'Back'}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Step: done ── */}
          {step === 'done' && (
            <View style={rs.doneContainer}>
              <Text style={rs.sheetTitle}>{'Report Submitted'}</Text>
              <View style={rs.doneIcon}>
                <CheckCircleIcon />
              </View>
              <Text style={rs.doneText}>
                {'Thank you for helping us maintain a professional and respectful community.'}
              </Text>
              <TouchableOpacity style={rs.primaryBtn} onPress={handleDone}>
                <Text style={rs.primaryBtnText}>{'Done'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

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
}: {
  visible: boolean;
  isOwnPost: boolean;
  isMuted: boolean;
  onClose: () => void;
  onMuteToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onReport: () => void;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={ms.overlay} activeOpacity={1} onPress={onClose}>
      <View style={ms.sheet}>
        <View style={ms.sheetHeader}>
          <Text style={ms.sheetTitle}>{'More Options'}</Text>
          <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
            <Text style={ms.closeX}>{'✕'}</Text>
          </TouchableOpacity>
        </View>
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
          <TouchableOpacity style={ms.optionRow} onPress={onReport}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#192546" />
            </Svg>
            <Text style={ms.optionText}>{'Report'}</Text>
          </TouchableOpacity>
        )}
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
const NewestMembersSection = ({members, loading, onFollow, navigation}: any) => (
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
        renderItem={({item: m}: {item: Member}) => (
          <TouchableOpacity
            style={styles.newestMemberCard}
            activeOpacity={0.85}
            onPress={() => navigation?.push('MemberProfile', {userId: m.id})}>
            <Image source={{uri: m.avatar}} style={styles.newestMemberAvatar} />
            <Text style={styles.newestMemberName} numberOfLines={2}>{m.name}</Text>
            <Text style={styles.newestMemberRole} numberOfLines={2}>{m.title}</Text>
            <TouchableOpacity
              style={[styles.newestFollowBtn, m.following && styles.newestFollowingBtn]}
              onPress={() => onFollow(m.id, m.following)}
              activeOpacity={0.85}>
              <Text style={[styles.newestFollowBtnText, m.following && styles.newestFollowingBtnText]}>
                {m.following ? '✓ Following' : '+ Follow'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    )}
  </View>
);

// ─── Comments Panel — input row always visible (Intro-style), list toggles ────
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
          <SmileyIcon />
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
                        })
                      }>
                      <Text style={styles.commentLikeCount}>
                        {`${c.likes} ${c.likes === 1 ? 'Like' : 'Likes'}`}
                      </Text>
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
const PostCard = ({
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
        <TouchableOpacity style={styles.linkPreview}>
          <Image source={{uri: post.linkPreview.image}} style={styles.linkPreviewImage} />
          <View style={styles.linkPreviewContent}>
            <Text style={styles.linkPreviewTitle} numberOfLines={2}>{post.linkPreview.title}</Text>
            <Text style={styles.linkPreviewUrl}>{post.linkPreview.url}</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {post.forumTags?.length > 0 ? (
        <View style={styles.forumTagsRow}>
          {post.forumTags.map((tag: string, i: number) => (
            <View key={i} style={styles.forumTag}>
              <Text style={styles.forumTagText}>{tag}</Text>
            </View>
          ))}
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
            <TouchableOpacity style={[styles.statBtn, {marginLeft: 'auto' as any}]}>
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
};

// ─── Main FeedScreen ──────────────────────────────────────────────────────────
const FeedScreen = ({navigation}: any) => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [myName, setMyName] = useState<string | null>(null);

  // More options state
  const [moreOptionsPost, setMoreOptionsPost] = useState<FeedPost | null>(null);
  const [moreOptionsIsOwn, setMoreOptionsIsOwn] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Mute toast state
  const [muteToastVisible, setMuteToastVisible] = useState(false);
  const [muteToastMuted, setMuteToastMuted] = useState(false);

  useEffect(() => {
    initUser();
    loadInitialData();
  }, []);

  const initUser = async () => {
     const creds = await Keychain.getGenericPassword();
  if (creds) {
    console.log('BEARER TOKEN:', creds.password);
  }
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

      // Enrich author data with member profiles (designation + country flag)
      const enriched = await Promise.all(
        data.map(async post => {
          try {
            const profile = await getMemberProfile(post.author.id);
            const fullName = resolveFullName(profile, post.author.name);
            const groups = profile?.xprofile?.groups?.['1']?.fields;
            const title = groups?.['1097']?.value?.raw || '';
            const country = groups?.['1099']?.value?.raw || '';
            const flag = countryFlag(country);
            return {
              ...post,
              author: {...post.author, name: fullName, title, flag, country},
            };
          } catch {
            return post;
          }
        }),
      );

      if (reset) setPosts(enriched);
      else setPosts(prev => [...prev, ...enriched]);
      setHasMore(data.length === 15);
      setPage(pageNum);
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

  const handleLike = async (postId: number, currentlyLiked: boolean) => {
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
  };

  const handleCommentPosted = (postId: number, delta: number) => {
    setPosts(prev =>
      prev.map(p =>
        p.id === postId ? {...p, comments: Math.max(0, p.comments + delta)} : p,
      ),
    );
  };

  const handleFollow = async (memberId: number, currentlyFollowing: boolean) => {
    setMembers(prev =>
      prev.map(m => (m.id === memberId ? {...m, following: !currentlyFollowing} : m)),
    );
    try {
      await toggleFollow(memberId, currentlyFollowing);
    } catch {
      setMembers(prev =>
        prev.map(m => (m.id === memberId ? {...m, following: currentlyFollowing} : m)),
      );
    }
  };

  const handleDotsPress = (post: FeedPost, isOwn: boolean) => {
    setMoreOptionsPost(post);
    setMoreOptionsIsOwn(isOwn);
    setShowMoreOptions(true);
  };

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

  const handleReportSubmit = async (reasons: string[]) => {
    if (!moreOptionsPost) return;
    try {
      await reportActivity(moreOptionsPost.id, reasons);
    } catch {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <AppHeader
        navigation={navigation}
        onDrawerOpen={() => setDrawerOpen(true)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1A3A6B']}
            tintColor="#1A3A6B"
          />
        }
        onScroll={({nativeEvent}) => {
          const {layoutMeasurement, contentOffset, contentSize} = nativeEvent;
          if (
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 200 &&
            !loadingMore &&
            hasMore
          ) {
            loadFeed(page + 1);
          }
        }}
        scrollEventThrottle={400}>

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
        ) : (
          posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              myUserId={myUserId}
              myName={myName}
              myAvatar={myAvatar}
              onLike={handleLike}
              onCommentPress={(id: number) =>
                setExpandedPostId(prev => (prev === id ? null : id))
              }
              onCommentPosted={handleCommentPosted}
              expandedId={expandedPostId}
              onDotsPress={handleDotsPress}
              navigation={navigation}
            />
          ))
        )}

        <NewestMembersSection
          members={members.filter(m => m.id !== myUserId)}
          loading={loadingMembers}
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
      </ScrollView>

      {/* Gradient FAB — 16px above nav bar, 16px from right edge.
          FeedScreen is tab content inside BottomTabNavigator, so its own
          bottom edge already sits above the nav bar — no need to add the
          nav bar's height here. */}
      <TouchableOpacity
        style={[styles.fab, {bottom: 16, right: 16}]}
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
    alignItems: 'center',
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
    fontFamily: 'Runda',
  },
  // Figma: Body/Body XS — 10px 400 #8F9098 lineHeight 14
  newestMemberRole: {
    fontSize: 10,
    fontWeight: '400',
    color: '#8F9098',
    textAlign: 'center',
    lineHeight: 14,
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

  postTitle: {fontSize: 15, fontWeight: '700', color: '#192546', lineHeight: 22, marginBottom: 6, fontFamily: 'Runda'},
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

  forumTagsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 10},
  forumTag: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  forumTagText: {fontSize: 11, color: '#555'},

  joinDiscussionWrap: {marginBottom: 14, borderRadius: 10, overflow: 'hidden'},
  joinDiscussionBtn: {borderRadius: 10, paddingVertical: 13, alignItems: 'center'},
  joinDiscussionText: {color: '#FFFFFF', fontSize: 15, fontWeight: '700'},

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
const rs = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  sheetTitle: {fontSize: 17, fontWeight: '700', color: '#192546', textAlign: 'center', fontFamily: 'Runda'},
  closeBtn: {position: 'absolute', right: 0, top: -4, padding: 6},
  closeX: {fontSize: 18, color: '#8F9098'},
  introText: {fontSize: 14, color: '#8F9098', textAlign: 'center', lineHeight: 20, marginBottom: 24, fontFamily: 'Runda'},
  selectLabel: {fontSize: 15, fontWeight: '700', color: '#192546', marginBottom: 16, fontFamily: 'Runda'},
  issueList: {maxHeight: 320, marginBottom: 16},
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  issueLabel: {fontSize: 14, color: '#192546', fontFamily: 'Runda'},
  issuePlus: {fontSize: 20, color: '#192546', fontWeight: '300'},
  issueMinus: {color: '#1A3A6B', fontWeight: '700'},
  selectedList: {maxHeight: 260, marginBottom: 16},
  selectedItem: {
    backgroundColor: '#F5F6FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  selectedItemLabel: {fontSize: 14, fontWeight: '700', color: '#192546', marginBottom: 3, fontFamily: 'Runda'},
  selectedItemDesc: {fontSize: 12, color: '#8F9098', fontFamily: 'Runda'},
  primaryBtn: {
    backgroundColor: '#0C4D91',
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnDisabled: {opacity: 0.4},
  primaryBtnText: {color: '#FFF', fontSize: 15, fontWeight: '700', fontFamily: 'Runda'},
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: '#0C4D91',
    borderRadius: 50,
    paddingVertical: 13,
    alignItems: 'center',
  },
  outlineBtnText: {color: '#0C4D91', fontSize: 15, fontWeight: '600', fontFamily: 'Runda'},
  doneContainer: {alignItems: 'center', paddingVertical: 10},
  doneIcon: {marginVertical: 20},
  doneText: {fontSize: 14, color: '#8F9098', textAlign: 'center', lineHeight: 20, marginBottom: 24, fontFamily: 'Runda'},
});

// ─── More Options Styles ──────────────────────────────────────────────────────
const ms = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  sheetTitle: {fontSize: 17, fontWeight: '700', color: '#192546', fontFamily: 'Runda'},
  closeBtn: {position: 'absolute', right: 0, top: -4, padding: 6},
  closeX: {fontSize: 18, color: '#8F9098'},
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionText: {fontSize: 15, color: '#192546', fontFamily: 'Runda'},
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
