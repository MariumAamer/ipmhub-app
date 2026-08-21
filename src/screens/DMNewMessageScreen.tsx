/* eslint-disable prettier/prettier */
import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
// Was importing SafeAreaView from 'react-native' — that core component is
// iOS-only (a no-op on Android), which is why this screen also carried a
// manual `Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 12`
// hack in its header style below (see comment there). Swapped to the real
// cross-platform SafeAreaView and removed the now-redundant hack.
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {Path, G, Mask, Rect} from 'react-native-svg';
import BackButton from '../components/BackButton';
import {searchMembers, sendMessage, stripHtml, MemberSearchResult, searchGifs, GiphyGif} from '../api/dmApi';

// ─── Icons ────────────────────────────────────────────────────────────────────

const SearchIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7 1a6 6 0 100 12A6 6 0 007 1zM0 7a7 7 0 1112.45 4.388l3.08 3.08a.75.75 0 11-1.06 1.062l-3.08-3.08A7 7 0 010 7z"
      fill="#8F9098"
    />
  </Svg>
);

const XIcon = () => (
  <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
    <Mask id="xm" maskUnits="userSpaceOnUse" x="0" y="0" width="10" height="10">
      <Path fillRule="evenodd" clipRule="evenodd" d="M.808.808a.625.625 0 01.884 0l7.5 7.5a.625.625 0 11-.884.884l-7.5-7.5a.625.625 0 010-.884zM9.192.808a.625.625 0 010 .884l-7.5 7.5a.625.625 0 11-.884-.884l7.5-7.5a.625.625 0 01.884 0z" fill="#006FFD" />
    </Mask>
    <G mask="url(#xm)">
      <Rect width="10" height="10" fill="#46B0E3" />
    </G>
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

// Same categorized emoji set used on DMConversationScreen — kept in sync so
// both the "New Message" compose bar and an existing conversation's compose
// bar behave identically (per Marium: "this works for new conversation as
// well as the other?"). Plain unicode, no bundled assets or API needed.
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

// ─── DMNewMessageScreen ───────────────────────────────────────────────────────

const DMNewMessageScreen = ({navigation, route}: any) => {
  const {currentUserId} = route.params ?? {};

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [selected, setSelected] = useState<MemberSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  // Controls whether the member list is shown at all — it should only be
  // visible while the search input has focus (tapping in), and gets hidden
  // again once a person is picked or the user taps away. Previously the
  // FlatList was always mounted regardless of focus, so the full member
  // list stayed on screen (blocking the compose box below it) with no way
  // to dismiss it after selecting someone.
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  // Emoji / GIF picker state — mirrors DMConversationScreen so both compose
  // bars behave the same way.
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<GiphyGif[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [textSelection, setTextSelection] = useState({start: 0, end: 0});

  useEffect(() => { doSearch(''); }, []);

  // Loads/searches Giphy whenever the picker is open and the query changes —
  // same behavior as DMConversationScreen's GIF picker.
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

  useEffect(() => {
    const timer = setTimeout(() => doSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const doSearch = async (q: string) => {
    setLoading(true);
    try {
      const data = await searchMembers(q);
      setResults(data.filter(m => m.id !== currentUserId && !selected.find(s => s.id === m.id)));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const selectMember = (member: MemberSearchResult) => {
    setSelected(prev => [...prev, member]);
    setResults(prev => prev.filter(m => m.id !== member.id));
    setSearchQuery('');
    // Hide the list and drop focus/keyboard once someone's picked, so the
    // list of remaining members doesn't just sit there covering the compose
    // box — matches "once I select the person, it should hide".
    setSearchFocused(false);
    searchInputRef.current?.blur();
  };

  const removeMember = (id: number) => {
    const member = selected.find(m => m.id === id);
    setSelected(prev => prev.filter(m => m.id !== id));
    if (member) setResults(prev => [member, ...prev]);
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

  // No DM thread exists yet on this screen (it's created when Send is
  // pressed), so a picked GIF can't be sent immediately like it can on
  // DMConversationScreen. Instead its URL gets inserted into the compose
  // box — DMConversationScreen recognizes a GIF-URL-only message and
  // renders it as an image once this message actually sends.
  const insertGif = (gif: GiphyGif) => {
    if (!gif.url) return;
    const separator = messageText.trim().length ? ' ' : '';
    const next = `${messageText}${separator}${gif.url}`;
    setMessageText(next);
    setTextSelection({start: next.length, end: next.length});
    setShowGifPicker(false);
  };

  const handleSend = async () => {
    if (!selected.length || !messageText.trim()) return;
    setSending(true);
    try {
      const res = await sendMessage(null, selected.map(m => m.id), messageText.trim());
      navigation.replace('DMConversation', {
        threadId: res.id ?? res.thread_id,
        recipientName: selected.length === 1 ? selected[0].name : `${selected.length} people`,
        recipientAvatar: selected[0]?.avatar_urls?.thumb ?? '',
        recipientUserId: selected[0]?.id ?? 0,
        currentUserId,
      });
    } catch {
      Alert.alert('Error', 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  const getMemberRole = (member: MemberSearchResult) => {
    const groups = member.xprofile?.groups;
    if (!groups) return '';
    const fields = Object.values(groups as any).flatMap((g: any) =>
      Object.values(g.fields ?? {}),
    ) as any[];
    const jobField = fields.find((f: any) => f.id === 1097 || f.name === 'Job Title');
    const raw = jobField?.value?.rendered ?? jobField?.value?.raw ?? '';
    return stripHtml(raw);
  };

  const renderMember = ({item}: {item: MemberSearchResult}) => {
    const isSelected = !!selected.find(s => s.id === item.id);
    const role = getMemberRole(item);

    return (
      <TouchableOpacity
        style={[n.memberRow, isSelected && n.memberRowSelected]}
        onPress={() => selectMember(item)}
        activeOpacity={0.75}>
        <Image source={{uri: item.avatar_urls?.thumb ?? ''}} style={n.memberAvatar} />
        <View style={n.memberInfo}>
          <Text style={n.memberName}>{item.name}</Text>
          {!!role && <Text style={n.memberRole}>{role}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={n.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header - no AppHeader, just back + title */}
      <View style={n.header}>
        <BackButton style={n.backBtn} onPress={() => navigation.goBack()} />
        <Text style={n.headerTitle}>{'New Message'}</Text>
      </View>

      {/* KeyboardAvoidingView keeps the compose box above the keyboard on both
          platforms instead of letting it get covered while typing. */}
      <KeyboardAvoidingView
        style={n.flexArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
        {/* Search bar with chips */}
        <View style={n.searchBar}>
          <SearchIcon />
          {selected.map(m => (
            <TouchableOpacity key={m.id} style={n.chip} onPress={() => removeMember(m.id)}>
              <Text style={n.chipText}>{m.name}</Text>
              <XIcon />
            </TouchableOpacity>
          ))}
          <TextInput
            ref={searchInputRef}
            style={n.searchInput}
            placeholder={selected.length ? '' : 'Type a name or multiple names...'}
            placeholderTextColor="#8F9098"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </View>

        {/* Member list — only shown while the search bar is focused, so it
            doesn't linger on screen (and cover the compose box) after
            someone's been picked. */}
        {searchFocused &&
          (loading ? (
            <ActivityIndicator color="#192546" style={{marginTop: 20}} />
          ) : (
            <FlatList
              data={results}
              keyExtractor={item => String(item.id)}
              renderItem={renderMember}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={n.list}
            />
          ))}

        {/* Compose box - same as conversation screen */}
        {selected.length > 0 && (
          <View style={n.composeOuter}>
            <TextInput
              style={n.composeInput}
              placeholder="Hi!"
              placeholderTextColor="#8F9098"
              value={messageText}
              onChangeText={setMessageText}
              onSelectionChange={e => setTextSelection(e.nativeEvent.selection)}
              multiline
              textAlignVertical="top"
            />
            <View style={n.composeActionsRow}>
              <View style={n.iconsFrame}>
                <TouchableOpacity><AaIcon /></TouchableOpacity>
                <TouchableOpacity><CameraIcon /></TouchableOpacity>
                <TouchableOpacity><VideoIcon /></TouchableOpacity>
                <TouchableOpacity><AttachIcon /></TouchableOpacity>
                <TouchableOpacity onPress={() => { setGifQuery(''); setShowGifPicker(true); }}><GifIcon /></TouchableOpacity>
                <TouchableOpacity onPress={() => setShowEmojiPicker(prev => !prev)}><EmojiIcon /></TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleSend} disabled={!messageText.trim() || sending}>
                <LinearGradient
                  colors={['#E257E4', '#084D92']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={n.sendBtn}>
                  {sending ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={n.sendBtnText}>{'Send'}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Emoji picker — same categorized, scrollable panel as
            DMConversationScreen, only relevant once a recipient's picked and
            the compose box is showing. */}
        {showEmojiPicker && selected.length > 0 && (
          <View style={n.emojiPanel}>
            <View style={n.emojiPanelHeader}>
              <Text style={n.emojiPanelTitle}>{'Emoji'}</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                <Text style={n.optionsClose}>{'✕'}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={n.emojiScrollArea} nestedScrollEnabled showsVerticalScrollIndicator={true}>
              {EMOJI_CATEGORIES.map(category => (
                <View key={category.label}>
                  <Text style={n.emojiCategoryLabel}>{category.label}</Text>
                  <View style={n.emojiGrid}>
                    {category.emojis.map((emoji, idx) => (
                      <TouchableOpacity
                        key={`${category.label}-${idx}`}
                        style={n.emojiCell}
                        onPress={() => insertEmoji(emoji)}>
                        <Text style={n.emojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* GIF Picker Modal — same "not connected yet" placeholder as
          DMConversationScreen. No Giphy/Tenor API key is available yet, so
          this intentionally doesn't fake results. */}
      <Modal
        visible={showGifPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGifPicker(false)}>
        <TouchableOpacity
          style={n.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGifPicker(false)}>
          <TouchableOpacity activeOpacity={1} style={n.optionsSheet}>
            <View style={n.optionsHeader}>
              <Text style={n.optionsTitle}>{'GIFs'}</Text>
              <TouchableOpacity
                onPress={() => setShowGifPicker(false)}
                style={n.optionsCloseBtn}>
                <Text style={n.optionsClose}>{'✕'}</Text>
              </TouchableOpacity>
            </View>
            <View style={n.gifSearchWrap}>
              <TextInput
                style={n.gifSearchInput}
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
                contentContainerStyle={n.gifGrid}
                style={n.gifListArea}
                keyboardShouldPersistTaps="handled"
                renderItem={({item}) => (
                  <TouchableOpacity style={n.gifCell} onPress={() => insertGif(item)}>
                    <Image source={{uri: item.previewUrl}} style={n.gifThumb} resizeMode="cover" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={n.gifEmptyText}>{'No GIFs found'}</Text>
                }
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const n = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  flexArea: {flex: 1},

  // Flat padding now — SafeAreaView (the real cross-platform one, imported
  // from react-native-safe-area-context above) already reserves the status
  // bar / notch inset on both iOS and Android, so the old
  // `Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12`
  // hack (which only ever handled Android, via a less-reliable measurement)
  // is no longer needed here.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E9F1',
    paddingTop: 12,
  },
  backBtn: {padding: 2},
  headerTitle: {
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    color: '#192546',
    letterSpacing: 0.09,
  },

  searchBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E9F1',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#46B0E3',
    gap: 6,
  },
  chipText: {
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '400',
    color: '#46B0E3',
    lineHeight: 16,
  },
  searchInput: {
    flex: 1,
    minWidth: 100,
    fontFamily: 'Runda',
    fontSize: 14,
    color: '#192546',
    padding: 0,
  },

  list: {flex: 1},

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  memberRowSelected: {
    borderWidth: 1,
    borderColor: '#46B0E3',
    borderRadius: 8,
    marginHorizontal: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8E9F1',
  },
  memberInfo: {flex: 1},
  memberName: {
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '500',
    color: '#192546',
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  memberRole: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '500',
    color: '#8F9098',
    marginTop: 2,
  },

  // Compose - identical to DMConversationScreen
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

  // Emoji picker — same styling as DMConversationScreen
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

  // GIF picker placeholder / modal — same as DMConversationScreen
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
});

export default DMNewMessageScreen;
