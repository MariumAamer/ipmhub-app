/* eslint-disable prettier/prettier */
import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {Path, Circle, G, Mask, Rect} from 'react-native-svg';
import {launchImageLibrary} from 'react-native-image-picker';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import BackButton from '../components/BackButton';
import {
  getThreadDetail,
  sendMessage,
  deleteMessages,
  markThreadRead,
  DMMessage,
  DMThreadDetail,
  groupMessagesByDate,
  formatMessageTime,
  stripHtml,
  searchGifs,
  GiphyGif,
  isGifUrl,
} from '../api/dmApi';

// ─── Icons ────────────────────────────────────────────────────────────────────

const DotsIcon = () => (
  <Svg width={5} height={21} viewBox="0 0 5 21" fill="none">
    <Circle cx="2.279" cy="2.278" r="2.278" transform="rotate(90 2.279 2.278)" fill="#E8E9F1" />
    <Circle cx="2.279" cy="10.479" r="2.278" transform="rotate(90 2.279 10.479)" fill="#E8E9F1" />
    <Circle cx="2.279" cy="18.679" r="2.278" transform="rotate(90 2.279 18.679)" fill="#E8E9F1" />
  </Svg>
);

const OnlineDot = () => (
  <Svg width={11} height={11} viewBox="0 0 11 11" fill="none">
    <Circle cx="5.385" cy="5.385" r="5.385" fill="#0C4D91" />
  </Svg>
);

const AaIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M11.0023 13.3253L7.71459 4.55815C7.67151 4.44326 7.59439 4.34424 7.49354 4.27434C7.39269 4.20444 7.2729 4.16699 7.1502 4.16699C7.02749 4.16699 6.90771 4.20444 6.80685 4.27434C6.706 4.34424 6.62888 4.44326 6.58581 4.55815L3.29811 13.3253C3.24374 13.4746 3.25051 13.6394 3.31696 13.7837C3.38341 13.928 3.50416 14.0403 3.65295 14.096C3.80173 14.1518 3.96651 14.1465 4.11145 14.0814C4.25639 14.0163 4.36975 13.8966 4.42689 13.7484L5.41758 11.1067C5.42148 11.0963 5.42848 11.0872 5.43763 11.0809C5.44679 11.0745 5.45767 11.0711 5.46882 11.0711H8.83158C8.84273 11.0711 8.85361 11.0745 8.86276 11.0809C8.87192 11.0872 8.87891 11.0963 8.88281 11.1067L9.87351 13.7484C9.93064 13.8966 10.044 14.0163 10.1889 14.0814C10.3339 14.1465 10.4987 14.1518 10.6474 14.096C10.7962 14.0403 10.917 13.928 10.9834 13.7837C11.0499 13.6394 11.0567 13.4746 11.0023 13.3253ZM5.91074 9.79107L7.09896 6.62255C7.10291 6.61216 7.10992 6.60321 7.11907 6.59689C7.12822 6.59057 7.13908 6.58719 7.1502 6.58719C7.16132 6.58719 7.17217 6.59057 7.18132 6.59689C7.19047 6.60321 7.19749 6.61216 7.20143 6.62255L8.38966 9.79162C8.39275 9.7999 8.3938 9.8088 8.3927 9.81758C8.39161 9.82635 8.38841 9.83473 8.38338 9.84199C8.37834 9.84926 8.37163 9.8552 8.3638 9.85931C8.35597 9.86342 8.34727 9.86558 8.33843 9.86559H5.96197C5.95313 9.86558 5.94442 9.86342 5.9366 9.85931C5.92877 9.8552 5.92205 9.84926 5.91702 9.84199C5.91199 9.83473 5.90879 9.82635 5.90769 9.81758C5.9066 9.8088 5.90764 9.7999 5.91074 9.79162V9.79107ZM13.9659 6.79707C12.8228 6.78886 11.7993 7.45105 11.3631 8.47928C11.3006 8.62642 11.2991 8.79236 11.359 8.94059C11.4189 9.08882 11.5351 9.20721 11.6823 9.2697C11.8294 9.33219 11.9954 9.33366 12.1436 9.27381C12.2918 9.21395 12.4102 9.09766 12.4727 8.95052C12.716 8.37818 13.2883 8.00695 13.9335 8.00256C14.819 7.99654 15.5338 8.7286 15.5338 9.6149C15.5338 9.62557 15.5297 9.63582 15.5223 9.64349C15.5149 9.65116 15.5048 9.65564 15.4941 9.656C14.8935 9.67271 14.1812 9.71271 13.5456 9.78751C12.0456 9.96395 11.1502 10.7818 11.1502 11.9752C11.1502 12.6105 11.3902 13.1807 11.8261 13.5829C12.2352 13.9596 12.7941 14.167 13.3968 14.167C14.2461 14.167 14.9774 13.9478 15.5322 13.5308H15.5338C15.5335 13.61 15.5487 13.6884 15.5787 13.7617C15.6087 13.8349 15.6528 13.9016 15.7085 13.9578C15.7642 14.014 15.8305 14.0587 15.9035 14.0893C15.9765 14.1199 16.0548 14.1358 16.134 14.1362C16.2131 14.1365 16.2916 14.1213 16.3648 14.0913C16.4381 14.0613 16.5047 14.0172 16.5609 13.9615C16.6171 13.9057 16.6618 13.8395 16.6924 13.7665C16.723 13.6935 16.739 13.6152 16.7393 13.536V9.61819C16.7393 8.079 15.5064 6.80831 13.9659 6.79707ZM13.3968 12.9615C12.9165 12.9615 12.3557 12.7031 12.3557 11.9752C12.3557 11.6829 12.4606 11.4782 12.6963 11.3114C12.9256 11.1489 13.2771 11.033 13.6864 10.9848C14.265 10.9166 14.9144 10.879 15.4711 10.8623C15.4785 10.8623 15.4859 10.8638 15.4927 10.8667C15.4995 10.8697 15.5057 10.8739 15.5108 10.8793C15.516 10.8847 15.5199 10.8911 15.5225 10.898C15.5251 10.905 15.5262 10.9124 15.5259 10.9198C15.4516 12.293 14.7519 12.9615 13.3968 12.9615Z" fill="#192647" />
  </Svg>
);

const CameraIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M12.0291 10.2565C12.0291 10.8096 11.8176 11.34 11.4412 11.7311C11.0648 12.1222 10.5542 12.3419 10.0218 12.3419C9.48948 12.3419 8.97892 12.1222 8.60248 11.7311C8.22604 11.34 8.01456 10.8096 8.01456 10.2565C8.01456 9.70335 8.22604 9.1729 8.60248 8.7818C8.97892 8.39069 9.48948 8.17097 10.0218 8.17097C10.5542 8.17097 11.0648 8.39069 11.4412 8.7818C11.8176 9.1729 12.0291 9.70335 12.0291 10.2565ZM7.28793 4.86548C7.41287 4.60545 7.60508 4.38674 7.84298 4.23386C8.08089 4.08099 8.35508 4.00001 8.63481 4H11.4089C11.6886 4.00001 11.9628 4.08099 12.2007 4.23386C12.4386 4.38674 12.6308 4.60545 12.7558 4.86548L13.3429 6.08549H14.0364C14.5688 6.08549 15.0793 6.30521 15.4558 6.69631C15.8322 7.08742 16.0437 7.61787 16.0437 8.17097V13.3847C16.0437 13.9378 15.8322 14.4682 15.4558 14.8594C15.0793 15.2505 14.5688 15.4702 14.0364 15.4702H6.00728C5.47492 15.4702 4.96436 15.2505 4.58792 14.8594C4.21148 14.4682 4 13.9378 4 13.3847V8.17097C4 7.61787 4.21148 7.08742 4.58792 6.69631C4.96436 6.30521 5.47492 6.08549 6.00728 6.08549H6.7008L7.28793 4.86548ZM13.0328 10.2565C13.0328 9.4268 12.7155 8.63112 12.1509 8.04447C11.5862 7.45781 10.8204 7.12823 10.0218 7.12823C9.2233 7.12823 8.45746 7.45781 7.8928 8.04447C7.32814 8.63112 7.01092 9.4268 7.01092 10.2565C7.01092 11.0861 7.32814 11.8818 7.8928 12.4685C8.45746 13.0551 9.2233 13.3847 10.0218 13.3847C10.8204 13.3847 11.5862 13.0551 12.1509 12.4685C12.7155 11.8818 13.0328 11.0861 13.0328 10.2565Z" fill="#192546" />
  </Svg>
);

const VideoIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M5.26385 4.7998C4.71628 4.7998 4.19113 5.01733 3.80394 5.40452C3.41674 5.79171 3.19922 6.31686 3.19922 6.86444V13.0583C3.19922 13.6059 3.41674 14.1311 3.80394 14.5182C4.19113 14.9054 4.71628 15.123 5.26385 15.123H10.9416C11.4892 15.123 12.0143 14.9054 12.4015 14.5182C12.7887 14.1311 13.0062 13.6059 13.0062 13.0583V6.86444C13.0062 6.31686 12.7887 5.79171 12.4015 5.40452C12.0143 5.01733 11.4892 4.7998 10.9416 4.7998H5.26385Z" fill="#192546" />
    <Path d="M15.9613 13.8385L14.5508 12.2941V7.63236L15.9613 6.088C16.4563 5.54547 17.3036 5.92955 17.3036 6.69656V13.2299C17.3036 13.9969 16.4563 14.381 15.9613 13.8385Z" fill="#192546" />
  </Svg>
);

const AttachIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M9.81941 4.53027C9.50575 5.00343 9.32641 5.55944 9.25156 6.15416L9.2441 6.21608V6.27831L9.26152 9.74108V9.7445C9.26418 10.0494 9.37907 10.342 9.58294 10.5669L9.62494 10.6107L9.66881 10.6524C9.89362 10.8563 10.186 10.9712 10.4909 10.9738V10.9735C10.5879 10.9744 10.6845 10.9635 10.7787 10.9418L10.7799 11.0551L10.7802 11.0968L10.7843 11.1378C10.8514 11.8269 11.1153 12.4365 11.5998 12.921C12.1913 13.5124 12.8848 13.7382 13.5902 13.7337V13.7344C14.2695 13.7305 14.8874 13.4604 15.4232 12.9674L15.4244 12.9661C15.4401 12.9517 15.455 12.9367 15.4702 12.9219V13.7701C15.4702 15.0019 14.4716 16.0005 13.2399 16.0005H6.23031C4.99854 16.0005 4 15.0019 4 13.7701V6.76059C4 5.52882 4.99854 4.53027 6.23031 4.53027H9.81941Z" fill="#192546" />
    <Path d="M10.9446 4.67815C10.5358 5.04746 10.29 5.58318 10.2031 6.27326L10.2203 9.73585C10.2209 9.81042 10.2509 9.8818 10.3037 9.93453C10.3564 9.98726 10.4278 10.0173 10.5023 10.0179C10.539 10.0183 10.5753 10.0111 10.6093 9.99723C10.6432 9.98337 10.674 9.96286 10.6999 9.93695C10.7258 9.91104 10.7463 9.88022 10.7602 9.8463C10.7741 9.81238 10.7812 9.77601 10.7809 9.73937L10.7602 6.31418C10.8305 5.78348 11.0205 5.36945 11.3232 5.09639C11.7325 4.72711 12.1746 4.57504 12.6807 4.56132C13.1763 4.54789 13.6847 4.72656 14.108 5.14986C14.4344 5.47631 14.6201 5.84625 14.6721 6.26665L14.7445 11.1358C14.7147 11.4191 14.599 11.6633 14.3971 11.8498C14.1115 12.1125 13.8474 12.2168 13.5775 12.2183C13.2388 12.2206 12.9451 12.124 12.6726 11.8515C12.4558 11.6347 12.3316 11.3619 12.2979 11.0214L12.2537 6.71989C12.246 6.47284 12.28 6.31252 12.3388 6.23255C12.3821 6.17213 12.4398 6.1233 12.5065 6.09042C12.5732 6.05754 12.6473 6.04174 12.7216 6.04422C12.8679 6.04822 12.9796 6.10512 13.0825 6.23079C13.1472 6.30986 13.1849 6.40744 13.1949 6.53155L13.2422 10.4903C13.2433 10.5648 13.2736 10.6359 13.3267 10.6883C13.3797 10.7407 13.4512 10.7702 13.5258 10.7704C13.5623 10.7704 13.5985 10.7633 13.6323 10.7492C13.6577 10.7387 13.6814 10.7243 13.7025 10.7068L13.7227 10.6883C13.7484 10.6623 13.7687 10.6314 13.7823 10.5974C13.796 10.5635 13.8027 10.5271 13.8021 10.4905L13.7542 6.51219C13.7339 6.25779 13.6542 6.05077 13.5144 5.87943C13.309 5.62836 13.0432 5.49292 12.7304 5.48406C12.5668 5.47897 12.4045 5.51382 12.2574 5.58571C12.1103 5.65763 11.9829 5.76451 11.8865 5.89681C11.7414 6.09446 11.6823 6.3708 11.6937 6.72495L11.7384 11.0449C11.7864 11.5373 11.9669 11.933 12.2787 12.2449C12.6709 12.637 13.1098 12.7811 13.5876 12.778C13.996 12.7757 14.3923 12.6197 14.779 12.2638C15.0832 11.9831 15.2588 11.6125 15.3031 11.1655L15.2298 6.23475C15.1604 5.65636 14.9159 5.17054 14.5011 4.75581C13.9607 4.21545 13.3011 3.98323 12.6585 4.00094C12.0282 4.01837 11.4598 4.21322 10.9446 4.67815Z" fill="#192546" />
  </Svg>
);

const GifIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M1.4082 10.1192C1.4082 7.87811 2.64961 6.19727 5.09947 6.19727C6.82426 6.19727 8.21947 6.90036 8.41722 8.72403L7.15384 8.95473C7.04398 7.99896 6.32989 7.31783 5.12144 7.31783C3.63834 7.31783 2.75947 8.2736 2.75947 10.1192C2.75947 11.9209 3.7482 12.8437 5.12144 12.8437C6.18708 12.8437 7.25271 12.2066 7.25271 11.2508V10.8663H5.35215V9.78966H8.56003V13.9094H7.43947V12.9206C6.8682 13.6347 5.95637 14.0412 4.9237 14.0412C2.86933 14.0412 1.4082 12.5801 1.4082 10.1192Z" fill="#192546" />
    <Path d="M9.99026 6.3291H11.3196V13.9094H9.99026V6.3291Z" fill="#192546" />
    <Path d="M17.7935 9.65783V10.7784H14.3879V13.9094H13.0586V6.3291H18.4527V7.44966H14.3879V9.65783H17.7935Z" fill="#192546" />
  </Svg>
);

const EmojiIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M10 4a6 6 0 110 12A6 6 0 0110 4zm2.861 7.404a.5.5 0 00-.707.07A2.43 2.43 0 019.875 12.304a2.43 2.43 0 01-1.78-.83.5.5 0 00-.756.656A3.43 3.43 0 009.875 13.304a3.43 3.43 0 002.536-1.174.5.5 0 00-.55-.726zM7.625 7.5c-.345 0-.625.392-.625.875s.28.875.625.875.625-.392.625-.875S7.97 7.5 7.625 7.5zm4.75 0c-.345 0-.625.392-.625.875s.28.875.625.875.625-.392.625-.875S12.72 7.5 12.375 7.5z" fill="#192546" />
  </Svg>
);

const RemoveIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Circle cx="7" cy="7" r="7" fill="#192546" />
    <Path d="M4.8 4.8L9.2 9.2M9.2 4.8L4.8 9.2" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
  </Svg>
);

// Expanded from a flat 32-emoji list to a categorized set covering the
// common ranges people actually reach for (per Marium — "it only shows
// selected emojis"), while staying plain unicode characters so nothing
// extra needs to be bundled or downloaded. Grouped into simple categories
// with small headers rather than one giant undifferentiated grid, since
// there are now a few hundred rather than 32.
const EMOJI_CATEGORIES: {label: string; emojis: string[]}[] = [
  {
    label: 'Smileys & Emotion',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
      '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
      '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏',
      '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
      '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🥳', '😎', '🤓', '🧐', '😕',
      '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥',
      '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡',
      '😠', '🤬', '😈', '👿', '💀', '☠️', '💩',
    ],
  },
  {
    label: 'Gestures & People',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙',
      '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜',
      '👏', '🙌', '👐', '🤲', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦶',
      '👂', '👃', '🧠', '👀', '👁️', '👅', '👄', '💋', '🩸',
    ],
  },
  {
    label: 'Animals & Nature',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
      '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🐤', '🦆', '🦉',
      '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐢', '🐍',
      '🦎', '🦖', '🐙', '🦀', '🐬', '🐳', '🐘', '🦒', '🐫', '🐄', '🐑', '🐓',
      '🦃', '🐇', '🐿️', '🦔', '🌵', '🌲', '🌳', '🌴', '🌱', '🌿', '🍀', '🌸',
      '🌼', '🌻', '🌞', '🌝', '🌚', '🌕', '⭐', '🌟', '✨', '⚡', '🔥', '💧',
      '🌈', '☀️', '☁️', '⛈️', '❄️',
    ],
  },
  {
    label: 'Food & Drink',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒',
      '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️',
      '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🍞', '🥖', '🥨', '🧀', '🥚',
      '🍳', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪',
      '🌮', '🌯', '🥙', '🧆', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍜', '🍝',
      '🍣', '🍤', '🍙', '🍚', '🍛', '🍲', '🍥', '🥟', '🥠', '🍢', '🍡', '🍧',
      '🍨', '🍦', '🥧', '🍰', '🎂', '🧁', '🍮', '🍭', '🍬', '🍫', '🍩', '🍪',
      '☕', '🍵', '🧃', '🥤', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧊',
    ],
  },
  {
    label: 'Activities & Objects',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🏒',
      '🏑', '🥍', '🏏', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿',
      '⛷️', '🏂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄',
      '🏊', '🤽', '🚣', '🧗', '🚴', '🚵', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️',
      '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧',
      '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '🧩', '♟️',
      '🎯', '🎳', '🎮', '🎰', '🧸', '🪀', '🪁', '🎈', '🎉', '🎊', '🎁', '🏮',
      '🧧',
    ],
  },
  {
    label: 'Travel & Places',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚',
      '🚛', '🚜', '🛵', '🏍️', '🚲', '🛴', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡',
      '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇',
      '🚊', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵',
      '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '🗺️', '🧭', '🏔️', '⛰️', '🌋', '🗻',
      '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '🏟️', '🏛️', '🏗️', '🧱', '🏘️', '🏚️', '🏠',
      '🏡', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏭',
      '💒', '🗼', '🗽', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋', '⛲', '⛺', '🌁',
      '🌃', '🏙️', '🌄', '🌅', '🌆', '🌇', '🌉',
    ],
  },
  {
    label: 'Symbols',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
      '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️',
      '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌',
      '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️',
      '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️',
      '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌',
      '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱',
      '🔞', '📵', '🚭', '❗', '❓', '❕', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️',
      '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎',
      '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂',
      '🛃', '🛄', '🛅',
    ],
  },
];

// The backend stores emoji as HTML numeric/named character entities
// (e.g. &#x1f600;, &#128512;) — decode them back to real glyphs for display.
const decodeHtmlEntities = (str: string): string => {
  const named: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'",
    '&nbsp;': ' ',
  };
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&[a-zA-Z]+;/g, match => named[match] ?? match);
};

const CheckIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Mask id="ck" maskUnits="userSpaceOnUse" x="0" y="2" width="12" height="9">
      <Path fillRule="evenodd" clipRule="evenodd" d="M11.7541 2.30086C12.0858 2.63911 12.0809 3.18261 11.7432 3.51481L4.5973 10.5437L0.25653 6.27403C-0.0811989 5.94183 -0.0860879 5.39832 0.24561 5.06008C0.577309 4.72184 1.11999 4.71694 1.45772 5.04915L4.5973 8.13734L10.542 2.28993C10.8797 1.95773 11.4224 1.96262 11.7541 2.30086Z" fill="#006FFD" />
    </Mask>
    <G mask="url(#ck)">
      <Rect width="11.9997" height="11.9997" fill="white" />
    </G>
  </Svg>
);

const ViewMembersIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M8.41005 7.52155C9.93566 7.52166 11.1766 8.76261 11.1767 10.2882V11.042C11.1767 11.7389 10.6139 12.3017 9.91702 12.3017H5.39548C4.69865 12.3017 4.13577 11.7389 4.13577 11.042V10.2882C4.13589 8.76261 5.37683 7.52166 6.90245 7.52155H8.41005ZM6.90245 8.53335C6.43712 8.5334 5.99071 8.71841 5.66167 9.04745C5.33263 9.37648 5.14763 9.8229 5.14757 10.2882V11.042C5.14757 11.1817 5.25582 11.2899 5.39548 11.2899H9.91702C10.0567 11.2899 10.1649 11.1817 10.1649 11.042V10.2882C10.1649 9.8229 9.97987 9.37648 9.65083 9.04745C9.32179 8.71841 8.87538 8.5334 8.41005 8.53335H6.90245Z" fill="#192546" />
    <Path d="M5.39548 3C5.67776 3 5.90126 3.22364 5.90137 3.5059C5.90137 3.78825 5.67783 4.0118 5.39548 4.0118C4.84134 4.0118 4.3944 4.45937 4.3944 5.0135C4.39451 5.56754 4.84141 6.01458 5.39548 6.01458C5.67783 6.01458 5.90137 6.23812 5.90137 6.52048C5.90137 6.80283 5.67783 7.02637 5.39548 7.02637H4.64167C4.17635 7.02643 3.72993 7.21144 3.4009 7.54047C3.07188 7.86955 2.8868 8.3159 2.8868 8.78125C2.8868 8.92091 2.99504 9.02915 3.1347 9.02915C3.41705 9.02915 3.6406 9.2527 3.6406 9.53505C3.64049 9.81731 3.41698 10.041 3.1347 10.041C2.43787 10.041 1.875 9.47808 1.875 8.78125C1.875 7.5668 2.65723 6.53834 3.74847 6.16534C3.52047 5.83876 3.38265 5.44448 3.3826 5.0135C3.3826 4.47963 3.59429 3.96733 3.97177 3.58979C4.34931 3.21225 4.86155 3 5.39548 3Z" fill="#192546" />
    <Path d="M9.91702 3C10.4509 3 10.9632 3.21225 11.3407 3.58979C11.7182 3.96733 11.9299 4.47963 11.9299 5.0135C11.9299 5.44361 11.7973 5.83802 11.5647 6.16597C12.6489 6.53935 13.4375 7.56703 13.4375 8.78125C13.4375 9.47808 12.8746 10.041 12.1778 10.041C11.8955 10.041 11.672 9.81731 11.6719 9.53505C11.6719 9.2527 11.8954 9.02915 12.1778 9.02915C12.3175 9.02915 12.4257 8.92091 12.4257 8.78125C12.4257 8.3159 12.2406 7.86955 11.9116 7.54047C11.5826 7.21144 11.1361 7.02643 10.6708 7.02637H9.91702C9.63467 7.02637 9.41113 6.80283 9.41113 6.52048C9.41113 6.23812 9.63467 6.01458 9.91702 6.01458C10.4711 6.01458 10.918 5.56754 10.9181 5.0135C10.9181 4.45937 10.4712 4.0118 9.91702 4.0118C9.63467 4.0118 9.41113 3.78825 9.41113 3.5059C9.41124 3.22364 9.63474 3 9.91702 3Z" fill="#192546" />
    <Path fillRule="evenodd" clipRule="evenodd" d="M7.65625 3C8.19017 3 8.70242 3.21225 9.07996 3.58979C9.45743 3.96733 9.66912 4.47963 9.66912 5.0135C9.66907 5.54725 9.45732 6.05911 9.07996 6.43658C8.70242 6.81412 8.19017 7.02637 7.65625 7.02637C7.12232 7.02637 6.61008 6.81412 6.23254 6.43658C5.85518 6.05911 5.64343 5.54725 5.64338 5.0135C5.64338 4.47963 5.85507 3.96733 6.23254 3.58979C6.61008 3.21225 7.12232 3 7.65625 3ZM7.65625 4.0118C7.10212 4.0118 6.65518 4.45937 6.65518 5.0135C6.65529 5.56754 7.10219 6.01458 7.65625 6.01458C8.21031 6.01458 8.65721 5.56754 8.65732 5.0135C8.65732 4.45937 8.21038 4.0118 7.65625 4.0118Z" fill="#192546" />
  </Svg>
);

const DeleteMsgIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path d="M12.344 3.125a.469.469 0 010 .937H2.344a.469.469 0 010-.937h10z" fill="#192546" />
    <Path d="M12.219 3.125l-.6 9a1.196 1.196 0 01-1.195 1.188H4.47A1.196 1.196 0 013.275 12.125l-.6-9h9.544zm-7.714 9a.187.187 0 00.187.188h5.616a.187.187 0 00.187-.188l.534-8H4.002l.503 8z" fill="#192546" />
    <Path d="M5.625 9.844V6.719a.469.469 0 01.938 0v3.125a.469.469 0 01-.938 0zm2.5 0V6.719a.469.469 0 01.938 0v3.125a.469.469 0 01-.938 0zm.418-8.594a1.197 1.197 0 011.094 1.188v1.234a.469.469 0 01-.938 0V2.438a.262.262 0 00-.183-.25l-.404-.438H6.888l-.403.438a.262.262 0 00-.184.25v1.234a.469.469 0 01-.937 0V2.438A1.197 1.197 0 016.458 1.25h2.085z" fill="#192546" />
  </Svg>
);

// ─── DMConversationScreen ─────────────────────────────────────────────────────

const DMConversationScreen = ({route, navigation}: any) => {
  const {
    recipientName,
    recipientAvatar,
    recipientUserId,
    currentUserId,
  } = route.params;

  // Kept as state rather than read straight off route.params: sending a
  // message can come back with a *different* thread id than the one this
  // screen opened with (BuddyBoss creates a fresh thread if the original
  // one was hidden/deleted on the server side). If we kept reloading with
  // the original id after that, the message would post successfully but
  // never show up here — it'd just look like it vanished on send.
  const [threadId, setThreadId] = useState<number>(route.params.threadId);
  const [thread, setThread] = useState<DMThreadDetail | null>(null);
  // Raw messages, not the grouped display list — kept separate so a newly
  // sent message can be appended locally and show up instantly, instead of
  // waiting on a full re-fetch of the thread (which is what made sent
  // messages take a few seconds to appear).
  const [rawMessages, setRawMessages] = useState<DMMessage[]>([]);
  const messages = useMemo(() => groupMessagesByDate(rawMessages), [rawMessages]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<number[]>([]);
  const [attachments, setAttachments] = useState<
    {uri: string; type: 'image' | 'video' | 'file'; name: string}[]
  >([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<GiphyGif[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [textSelection, setTextSelection] = useState({start: 0, end: 0});
  const [loadError, setLoadError] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadThread();
    markThreadRead(threadId).catch(() => {});
  }, []);

  // Loads/searches Giphy whenever the picker is open and the query changes.
  // Empty query pulls trending GIFs so the panel isn't blank on open.
  useEffect(() => {
    if (!showGifPicker) return;
    let cancelled = false;
    setGifLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchGifs(gifQuery);
        if (!cancelled) setGifResults(data);
      } catch {
        if (!cancelled) setGifResults([]);
      } finally {
        if (!cancelled) setGifLoading(false);
      }
    }, gifQuery.trim() ? 350 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showGifPicker, gifQuery]);

  const loadThread = async (idOverride?: number) => {
    const id = idOverride ?? threadId;
    setLoadError(false);
    try {
      const data = await getThreadDetail(id);
      setThread(data);
      setRawMessages(data?.messages ?? []);
    } catch (e) {
      console.log('Thread load error:', e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if ((!messageText.trim() && !attachments.length) || sending) return;

    // Attachment upload isn't wired to the backend yet — the media_upload
    // endpoint is cookie/nonce-based on web and hasn't been confirmed to
    // work with our JWT auth. Once that's confirmed, this branch should
    // upload each attachment and pass the returned media objects into
    // sendMessage() alongside the text.
    if (attachments.length) {
      Alert.alert(
        'Attachments not sent',
        'Photo/video/file sending isn’t connected to the server yet — only your text will be sent for now.',
      );
    }

    if (!messageText.trim()) {
      setAttachments([]);
      return;
    }

    const text = messageText.trim();
    setMessageText('');
    setSending(true);
    try {
      const res = await sendMessage(threadId, [recipientUserId], text);
      // The server can hand back a different thread id than the one we sent
      // (see note by the threadId state above).
      const newThreadId = res?.id;
      if (newThreadId && newThreadId !== threadId) {
        setThreadId(newThreadId);
      }
      setAttachments([]);
      // The send response already includes the full message object (with
      // sender_data, id, date_sent, etc.) — show it immediately instead of
      // waiting on a second GET request to reload the whole thread. That
      // second round trip was what made a sent message take a few seconds
      // to appear.
      const sentMsg: DMMessage | undefined = res?.messages?.[0];
      if (sentMsg) {
        setRawMessages(prev =>
          prev.some(m => m.id === sentMsg.id) ? prev : [...prev, sentMsg],
        );
        setTimeout(() => flatListRef.current?.scrollToEnd({animated: true}), 50);
      }
      // Reconcile with the server in the background (doesn't block the UI) —
      // covers cases like the sent message needing server-side fields we
      // don't have locally, or another message having arrived meanwhile.
      loadThread(newThreadId ?? threadId).catch(() => {});
    } catch (e) {
      console.log('Send error:', e);
      Alert.alert('Error', 'Could not send message.');
      setMessageText(text);
    } finally {
      setSending(false);
    }
  };

  // Sends a picked GIF immediately as its own message (rather than inserting
  // it into the text box) — matches how GIFs behave in most chat apps. The
  // GIF's direct image URL is sent as the message text; renderItem below
  // detects GIF-URL-only messages and displays them as an image instead of
  // a plain text link.
  const handleSendGif = async (gif: GiphyGif) => {
    if (!gif.url || sending) return;
    setShowGifPicker(false);
    setSending(true);
    try {
      const res = await sendMessage(threadId, [recipientUserId], gif.url);
      const newThreadId = res?.id;
      if (newThreadId && newThreadId !== threadId) {
        setThreadId(newThreadId);
      }
      const sentMsg: DMMessage | undefined = res?.messages?.[0];
      if (sentMsg) {
        setRawMessages(prev =>
          prev.some(m => m.id === sentMsg.id) ? prev : [...prev, sentMsg],
        );
        setTimeout(() => flatListRef.current?.scrollToEnd({animated: true}), 50);
      }
      loadThread(newThreadId ?? threadId).catch(() => {});
    } catch (e) {
      console.log('GIF send error:', e);
      Alert.alert('Error', 'Could not send GIF.');
    } finally {
      setSending(false);
    }
  };

  const handlePickPhoto = () => {
    launchImageLibrary({mediaType: 'photo', selectionLimit: 4, quality: 0.8}, res => {
      if (res.didCancel || res.errorCode) return;
      const picked = (res.assets || [])
        .filter(a => a.uri)
        .map(a => ({
          uri: a.uri as string,
          type: 'image' as const,
          name: a.fileName || 'photo.jpg',
        }));
      setAttachments(prev => [...prev, ...picked]);
    });
  };

  const handlePickVideo = () => {
    launchImageLibrary({mediaType: 'video', selectionLimit: 1, quality: 0.8}, res => {
      if (res.didCancel || res.errorCode) return;
      const picked = (res.assets || [])
        .filter(a => a.uri)
        .map(a => ({
          uri: a.uri as string,
          type: 'video' as const,
          name: a.fileName || 'video.mp4',
        }));
      setAttachments(prev => [...prev, ...picked]);
    });
  };

  const handlePickFile = async () => {
    try {
      const DocumentPicker = require('react-native-document-picker').default;
      const results = await DocumentPicker.pick({
        allowMultiSelection: true,
        type: [DocumentPicker.types.allFiles],
      });
      const picked = results
        .filter((r: any) => r.uri)
        .map((r: any) => ({
          uri: r.uri as string,
          type: 'file' as const,
          name: r.name || 'file',
        }));
      setAttachments(prev => [...prev, ...picked]);
    } catch (err: any) {
      if (!err?.toString?.()?.includes('cancel')) {
        Alert.alert('Error', 'Could not pick file. Please try again.');
      }
    }
  };

  const removeAttachment = (uri: string) => {
    setAttachments(prev => prev.filter(a => a.uri !== uri));
  };

  const insertEmoji = (emoji: string) => {
    const {start, end} = textSelection;
    const before = messageText.slice(0, start);
    const after = messageText.slice(end);
    const next = `${before}${emoji}${after}`;
    setMessageText(next);
    const cursor = start + emoji.length;
    setTextSelection({start: cursor, end: cursor});
  };

  const toggleBold = () => {
    const {start, end} = textSelection;
    if (start === end) {
      // Nothing selected — insert empty bold markers and place cursor between them
      const before = messageText.slice(0, start);
      const after = messageText.slice(start);
      setMessageText(`${before}****${after}`);
      const cursor = start + 2;
      setTextSelection({start: cursor, end: cursor});
      return;
    }
    const before = messageText.slice(0, start);
    const selected = messageText.slice(start, end);
    const after = messageText.slice(end);
    setMessageText(`${before}**${selected}**${after}`);
  };

  const handleDeleteSelected = async () => {
    if (!selectedMsgIds.length) return;
    try {
      await deleteMessages(threadId, selectedMsgIds);
      setDeleteMode(false);
      setSelectedMsgIds([]);
      loadThread();
    } catch {
      Alert.alert('Error', 'Could not delete messages.');
    }
  };

  const toggleSelectMessage = (id: number) => {
    setSelectedMsgIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const renderItem = ({item}: any) => {
    if (item.type === 'date') {
      return (
        <View style={c.dateSeparatorWrap}>
          <View style={c.datePill}>
            <Text style={c.datePillText}>{item.label}</Text>
          </View>
        </View>
      );
    }

    const msg: DMMessage = item.data;
    const isMe = msg.sender_id === currentUserId;
    const time = formatMessageTime(msg.date_sent);
    const text = decodeHtmlEntities(
      msg.message?.raw
        ? stripHtml(msg.message.raw)
        : stripHtml(msg.message?.rendered ?? ''),
    );
    const isSelected = selectedMsgIds.includes(msg.id);
    const hasImage = msg.bp_media_ids?.length;
    const hasVideo = msg.bp_videos?.length;
    const hasDoc = msg.bp_documents?.length;
    const textIsGif = !!text && isGifUrl(text);
    // sender_data can come back null/undefined from the API — e.g. a message
    // from a user whose account was later deleted or deactivated. Reading
    // .user_avatars/.sender_name off it unconditionally used to throw inside
    // this renderItem, which is what made the whole conversation screen
    // freeze or crash on load for threads containing such a message.
    const senderName = msg.sender_data?.sender_name ?? 'Deleted user';
    const senderAvatar = msg.sender_data?.user_avatars?.thumb;

    return (
      <TouchableOpacity
        activeOpacity={deleteMode ? 0.7 : 1}
        onPress={() => deleteMode && toggleSelectMessage(msg.id)}
        style={c.msgRow}>
        <View style={c.avatarWrap}>
          {senderAvatar ? (
            <Image source={{uri: senderAvatar}} style={c.msgAvatar} />
          ) : (
            <View style={[c.msgAvatar, c.msgAvatarFallback]} />
          )}
          <View style={c.onlineBadge}><OnlineDot /></View>
        </View>
        <View style={c.msgBubble}>
          <View style={c.msgMetaRow}>
            <Text style={c.msgSenderName}>{senderName}</Text>
            <Text style={c.msgMetaTime}>{` · ${time}`}</Text>
          </View>
          {!!text && (
            textIsGif ? (
              <Image source={{uri: text}} style={c.msgGifImage} resizeMode="cover" />
            ) : (
              <Text style={c.msgText}>{text}</Text>
            )
          )}
          {hasImage && (
            <Image
              source={{uri: msg.bp_media_ids![0].attachment_data.full}}
              style={c.msgImage}
              resizeMode="cover"
            />
          )}
          {hasDoc && (
            <View style={c.docPreview}>
              <Text style={c.docName} numberOfLines={2}>{msg.bp_documents![0].filename}</Text>
              <Text style={c.docSize}>{msg.bp_documents![0].size}</Text>
            </View>
          )}
          {hasVideo && (
            <View style={c.videoPreview}>
              <Text style={c.docName} numberOfLines={1}>{msg.bp_videos![0].title}</Text>
              <Text style={c.docSize}>{'Video'}</Text>
            </View>
          )}
        </View>

        {deleteMode && (
          <TouchableOpacity
            style={[c.checkbox, isSelected && c.checkboxSelected]}
            onPress={() => toggleSelectMessage(msg.id)}>
            {isSelected && <CheckIcon />}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={c.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* App Header - always visible */}
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      {/* Person header - always visible */}
      <View style={c.personHeader}>
        <BackButton style={c.backBtn} onPress={() => navigation.goBack()} />
        <View style={c.personInfo}>
          <Image source={{uri: recipientAvatar}} style={c.headerAvatar} />
          <View>
            <Text style={c.headerName}>{recipientName}</Text>
            <Text style={c.headerSub}>{'Admin at IPM'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={c.dotsBtn}
          onPress={() => setShowMoreOptions(true)}>
          <DotsIcon />
        </TouchableOpacity>
      </View>

      {/* Delete bar - replaces nothing, shown below headers */}
      {deleteMode && (
        <View style={c.deleteBar}>
          <View style={c.deleteBarLeft}>
            <DeleteMsgIcon />
            <Text style={c.deleteBarText}>{'Select messages to delete'}</Text>
          </View>
          <TouchableOpacity
            style={[c.deleteBtn, !selectedMsgIds.length && {opacity: 0.4}]}
            onPress={handleDeleteSelected}
            disabled={!selectedMsgIds.length}>
            <Text style={c.deleteBtnText}>{'Delete'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={c.cancelBtn}
            onPress={() => {setDeleteMode(false); setSelectedMsgIds([]);}}>
            <Text style={c.cancelBtnText}>{'Cancel'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      {loading ? (
        <ActivityIndicator color="#192546" style={{marginTop: 40}} />
      ) : loadError ? (
        <View style={c.errorWrap}>
          <Text style={c.errorText}>{'Could not load this conversation.'}</Text>
          <TouchableOpacity style={c.retryBtn} onPress={loadThread}>
            <Text style={c.retryBtnText}>{'Retry'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, idx) =>
            item.type === 'date' ? `date-${idx}` : `msg-${item.data.id}`
          }
          renderItem={renderItem}
          contentContainerStyle={c.messagesList}
          style={{backgroundColor: '#FFFFFF'}}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({animated: false})
          }
        />
      )}

      {/* Compose box */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <View style={c.composeOuter}>
          {attachments.length > 0 && (
            <View style={c.attachmentsStrip}>
              {attachments.map(att => (
                <View key={att.uri} style={c.attachmentThumbWrap}>
                  {att.type === 'file' ? (
                    <View style={c.attachmentFileChip}>
                      <Text style={c.attachmentFileName} numberOfLines={1}>
                        {att.name}
                      </Text>
                    </View>
                  ) : (
                    <Image source={{uri: att.uri}} style={c.attachmentThumb} />
                  )}
                  {att.type === 'video' && (
                    <View style={c.attachmentVideoBadge}>
                      <Text style={c.attachmentVideoBadgeText}>▶</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={c.attachmentRemoveBtn}
                    onPress={() => removeAttachment(att.uri)}>
                    <RemoveIcon />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <TextInput
            style={c.composeInput}
            placeholder="Write a message..."
            placeholderTextColor="#8F9098"
            value={messageText}
            onChangeText={setMessageText}
            onSelectionChange={e => setTextSelection(e.nativeEvent.selection)}
            multiline
            textAlignVertical="top"
          />
          <View style={c.composeActionsRow}>
            <View style={c.iconsFrame}>
              <TouchableOpacity onPress={toggleBold}><AaIcon /></TouchableOpacity>
              <TouchableOpacity onPress={handlePickPhoto}><CameraIcon /></TouchableOpacity>
              <TouchableOpacity onPress={handlePickVideo}><VideoIcon /></TouchableOpacity>
              <TouchableOpacity onPress={handlePickFile}><AttachIcon /></TouchableOpacity>
              <TouchableOpacity onPress={() => { setGifQuery(''); setShowGifPicker(true); }}><GifIcon /></TouchableOpacity>
              <TouchableOpacity onPress={() => setShowEmojiPicker(prev => !prev)}><EmojiIcon /></TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={handleSend}
              disabled={(!messageText.trim() && !attachments.length) || sending}>
              <LinearGradient
                colors={['#E257E4', '#084D92']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={c.sendBtn}>
                {sending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={c.sendBtnText}>{'Send'}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
        {showEmojiPicker && (
          <View style={c.emojiPanel}>
            <View style={c.emojiPanelHeader}>
              <Text style={c.emojiPanelTitle}>{'Emoji'}</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                <Text style={c.optionsClose}>{'✕'}</Text>
              </TouchableOpacity>
            </View>
            {/* Categorized, scrollable — was a single flat 32-emoji grid
                before, which read as "only a few selected emojis". Now
                covers a few hundred common emoji across simple categories,
                capped to a fixed height so it doesn't take over the screen. */}
            <ScrollView style={c.emojiScrollArea} nestedScrollEnabled showsVerticalScrollIndicator={true}>
              {EMOJI_CATEGORIES.map(category => (
                <View key={category.label}>
                  <Text style={c.emojiCategoryLabel}>{category.label}</Text>
                  <View style={c.emojiGrid}>
                    {category.emojis.map((emoji, idx) => (
                      <TouchableOpacity
                        key={`${category.label}-${idx}`}
                        style={c.emojiCell}
                        onPress={() => insertEmoji(emoji)}>
                        <Text style={c.emojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* More Options Modal */}
      <Modal
        visible={showMoreOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoreOptions(false)}>
        <TouchableOpacity
          style={c.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMoreOptions(false)}>
          <View style={c.optionsSheet}>
            <View style={c.optionsHeader}>
              <Text style={c.optionsTitle}>{'More Options'}</Text>
              <TouchableOpacity
                onPress={() => setShowMoreOptions(false)}
                style={c.optionsCloseBtn}>
                <Text style={c.optionsClose}>{'✕'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={c.optionRow}
              onPress={() => {
                setShowMoreOptions(false);
                navigation.navigate('DMMembers', {thread, currentUserId});
              }}>
              <ViewMembersIcon />
              <Text style={c.optionText}>{'View Members'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={c.optionRow}
              onPress={() => {
                setShowMoreOptions(false);
                setDeleteMode(true);
              }}>
              <DeleteMsgIcon />
              <Text style={c.optionText}>{'Delete Messages'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* GIF Picker Modal — search Giphy directly and tap a result to send it. */}
      <Modal
        visible={showGifPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGifPicker(false)}>
        <TouchableOpacity
          style={c.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGifPicker(false)}>
          <TouchableOpacity activeOpacity={1} style={c.optionsSheet}>
            <View style={c.optionsHeader}>
              <Text style={c.optionsTitle}>{'GIFs'}</Text>
              <TouchableOpacity
                onPress={() => setShowGifPicker(false)}
                style={c.optionsCloseBtn}>
                <Text style={c.optionsClose}>{'✕'}</Text>
              </TouchableOpacity>
            </View>
            <View style={c.gifSearchWrap}>
              <TextInput
                style={c.gifSearchInput}
                placeholder="Search GIPHY"
                placeholderTextColor="#8F9098"
                value={gifQuery}
                onChangeText={setGifQuery}
                autoCorrect={false}
              />
            </View>
            {gifLoading ? (
              <ActivityIndicator color="#192546" style={{marginVertical: 24}} />
            ) : (
              <FlatList
                data={gifResults}
                keyExtractor={g => g.id}
                numColumns={3}
                contentContainerStyle={c.gifGrid}
                style={c.gifListArea}
                keyboardShouldPersistTaps="handled"
                renderItem={({item}) => (
                  <TouchableOpacity style={c.gifCell} onPress={() => handleSendGif(item)}>
                    <Image source={{uri: item.previewUrl}} style={c.gifThumb} resizeMode="cover" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={c.gifEmptyText}>{'No GIFs found'}</Text>
                }
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ProfileDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigation={navigation}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const c = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},

  // Person header
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E9F1',
    gap: 16,
  },
  backBtn: {padding: 2},
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  headerAvatar: {width: 40, height: 40, borderRadius: 20},
  headerName: {
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '700',
    color: '#192546',
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  headerSub: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '500',
    color: '#8F9098',
  },
  dotsBtn: {padding: 8},

  // Delete bar
  deleteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E9F1',
    backgroundColor: '#F9FAFB',
  },
  deleteBarLeft: {flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1},
  deleteBarText: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '500',
    color: '#192546',
  },
  deleteBtn: {
    height: 36,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E53935',
    borderRadius: 5,
  },
  deleteBtnText: {color: '#FFF', fontFamily: 'Runda', fontSize: 14, fontWeight: '500'},
  cancelBtn: {
    height: 36,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#0C4D91',
  },
  cancelBtnText: {color: '#0C4D91', fontFamily: 'Runda', fontSize: 14, fontWeight: '500'},

  // Messages
  messagesList: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    gap: 24,
  },

  errorWrap: {alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12},
  errorText: {fontFamily: 'Runda', fontSize: 14, color: '#8F9098'},
  retryBtn: {
    height: 36,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#0C4D91',
  },
  retryBtnText: {color: '#0C4D91', fontFamily: 'Runda', fontSize: 14, fontWeight: '500'},

  dateSeparatorWrap: {alignItems: 'center', marginVertical: 8},
  datePill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#E8E9F1',
    borderRadius: 3,
  },
  datePillText: {
    fontFamily: 'Runda',
    fontSize: 12,
    color: '#8F9098',
  },

  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  msgRowMe: {},
  avatarWrap: {position: 'relative', width: 40, height: 40},
  msgAvatar: {width: 40, height: 40, borderRadius: 20},
  msgAvatarFallback: {backgroundColor: '#E8E9F1'},
  onlineBadge: {position: 'absolute', bottom: 0, right: 0},

  msgBubble: {flex: 1},
  msgBubbleMe: {},

  msgMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  msgSenderName: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '700',
    color: '#192546',
    lineHeight: 18,
  },
  msgMetaTime: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    color: '#8F9098',
    lineHeight: 18,
  },
  msgMeta: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    color: '#8F9098',
    lineHeight: 18,
    marginBottom: 4,
  },
  msgMetaMe: {},

  msgText: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    color: '#192546',
    lineHeight: 18,
  },

  msgImage: {width: 200, height: 150, borderRadius: 8, marginTop: 6},

  // GIF messages — square-ish preview, distinct from photo attachments
  // mostly in that it comes straight from a GIF URL rather than an uploaded
  // attachment object.
  msgGifImage: {
    width: 180,
    height: 180,
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: '#E8E9F1',
  },

  docPreview: {
    backgroundColor: '#F8F9FE',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E8E9F1',
  },
  videoPreview: {
    backgroundColor: '#F8F9FE',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E8E9F1',
  },
  docName: {fontFamily: 'Runda', fontSize: 13, color: '#192546', fontWeight: '500'},
  docSize: {fontFamily: 'Runda', fontSize: 11, color: '#8F9098', marginTop: 2},

  // Square checkbox
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#C5C6CC',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: {
    backgroundColor: '#192546',
    borderColor: '#192546',
  },

  // Compose
  composeOuter: {
    borderWidth: 1,
    borderColor: '#C5C6CC',
    borderRadius: 5,
    backgroundColor: '#E8E9F1',
    marginHorizontal: 16,
    marginBottom: 16,
    height: 240,
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  composeInput: {
    flex: 1,
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    color: '#192546',
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    textAlignVertical: 'top',
    backgroundColor: '#E8E9F1',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },

  // Attachment previews
  attachmentsStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  attachmentThumbWrap: {
    width: 56,
    height: 56,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 6,
    overflow: 'visible',
  },
  attachmentThumb: {
    width: 56,
    height: 56,
    borderRadius: 6,
    backgroundColor: '#C5C6CC',
  },
  attachmentFileChip: {
    width: 56,
    height: 56,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C5C6CC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  attachmentFileName: {
    fontFamily: 'Runda',
    fontSize: 9,
    color: '#192546',
    textAlign: 'center',
  },
  attachmentVideoBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentVideoBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
  },
  attachmentRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
  },

  // Emoji picker
  emojiPanel: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E9F1',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E9F1',
  },
  emojiPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E9F1',
  },
  emojiPanelTitle: {
    fontFamily: 'Runda',
    fontSize: 13,
    fontWeight: '700',
    color: '#192546',
  },
  // Capped height so a few hundred emoji don't push the compose box and
  // send button off screen — scrolls internally instead.
  emojiScrollArea: {
    maxHeight: 260,
  },
  emojiCategoryLabel: {
    fontFamily: 'Runda',
    fontSize: 11,
    fontWeight: '700',
    color: '#8F9098',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  emojiCell: {
    width: '12.5%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  emojiText: {
    fontSize: 22,
  },

  // GIF picker — search box + result grid
  gifSearchWrap: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  gifSearchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#E8E9F1',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: 'Runda',
    fontSize: 14,
    color: '#192546',
    backgroundColor: '#F9FAFB',
  },
  gifListArea: {
    maxHeight: 340,
  },
  gifGrid: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  gifCell: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E8E9F1',
  },
  gifThumb: {
    width: '100%',
    height: '100%',
  },
  gifEmptyText: {
    fontFamily: 'Runda',
    fontSize: 13,
    color: '#8F9098',
    textAlign: 'center',
    paddingVertical: 24,
  },

  composeActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#F9FAFB',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },
  iconsFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    gap: 8,
  },
  sendBtn: {
    height: 36,
    paddingHorizontal: 24,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '500',
  },

  // More Options Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  optionsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 36,
  },
  optionsHeader: {
    height: 56,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 16.5,
    position: 'relative',
  },
  optionsTitle: {
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '700',
    color: '#0C4D91',
    lineHeight: 20,
    letterSpacing: 0.08,
    textAlign: 'center',
  },
  optionsCloseBtn: {position: 'absolute', right: 24, top: 18, padding: 2},
  optionsClose: {fontSize: 16, color: '#8F9098'},
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  optionText: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '700',
    color: '#192546',
  },
});

export default DMConversationScreen;
