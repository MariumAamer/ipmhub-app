/* eslint-disable prettier/prettier */
import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {Path, Circle} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import {
  getMyCertifications,
  getCertificationsOverview,
  getCertificationsIpm,
  stripHtml,
  MyCertificationsResponse,
  MyCertification,
  RecommendedBody,
  CertificationsOverviewResponse,
  QualificationItem,
  CertificationsIpmResponse,
} from '../api/certificationsApi';

type TabKey = 'my' | 'overview' | 'ipm';

const TABS: {key: TabKey; label: string}[] = [
  {key: 'my', label: 'My Certifications'},
  {key: 'overview', label: 'Certifications Overview'},
  {key: 'ipm', label: 'IPM Certifications'},
];

// ─── Tab bar ────────────────────────────────────────────────────────────────
const TabBar = ({active, onChange}: {active: TabKey; onChange: (k: TabKey) => void}) => (
  <View style={styles.tabBar}>
    {TABS.map(tab => (
      <TouchableOpacity
        key={tab.key}
        style={styles.tabItem}
        onPress={() => onChange(tab.key)}
        activeOpacity={0.7}>
        <Text style={[styles.tabLabel, active === tab.key && styles.tabLabelActive]}>
          {tab.label}
        </Text>
        {active === tab.key && <View style={styles.tabUnderline} />}
      </TouchableOpacity>
    ))}
  </View>
);

const LoadingBlock = () => (
  <View style={styles.loadingWrap}>
    <ActivityIndicator color="#0C4D91" />
  </View>
);

// ─── Bullet icon — used for accreditation & competencies list items ───────
const BulletIcon = () => (
  <Svg width={10} height={10} viewBox="0 0 10 10" fill="none" style={{marginTop: 5}}>
    <Path
      d="M2.74829 0H10V7.33626C9.97447 7.36694 9.92841 7.3929 9.90009 7.42299C9.64631 7.69242 9.36878 7.93866 9.08885 8.17953C9.00785 8.24922 8.92873 8.33958 8.84677 8.40404C8.39803 8.75697 8.00596 9.17544 7.57081 9.54451C7.53936 9.57118 7.47157 9.59712 7.43222 9.6137L7.43483 6.06021L7.43395 5.38178C7.43264 5.19861 7.41466 4.78377 7.45666 4.63276C7.36968 4.72417 7.29422 4.82865 7.20479 4.91676C7.05122 5.06806 6.91373 5.23537 6.76513 5.39051L2.85612 9.40439C2.76928 9.49285 2.6868 9.57709 2.60624 9.67075C2.54934 9.73689 2.3506 9.98601 2.2826 10C2.14131 9.92762 1.72888 9.48077 1.59088 9.34684L0.800529 8.58287C0.681463 8.46822 0.00802145 7.86195 0 7.76512C0.0501734 7.71762 0.0672748 7.69014 0.107696 7.63695C0.14256 7.59108 0.192014 7.54295 0.231906 7.5002C1.0006 6.67648 1.86939 5.96362 2.63282 5.13526C2.68353 5.08024 2.75964 5.03058 2.81428 4.97799C3.22601 4.60624 3.59263 4.18542 3.99742 3.8059C4.11717 3.69363 4.25434 3.60358 4.3727 3.48925C4.51745 3.34968 4.65902 3.20597 4.79868 3.06114C4.9555 2.89476 5.11869 2.70793 5.31026 2.58217L1.76147 2.5787L0.750068 2.58007C0.671951 2.5801 0.34274 2.58381 0.27586 2.5727C0.253692 2.41277 2.29929 0.529362 2.54502 0.219996C2.59178 0.16113 2.70271 0.0716828 2.74829 0Z"
      fill="#46B0E3"
    />
  </Svg>
);

// ─── Certificate badge/medal icon — My Certifications cards ───────────────
// Confirmed static: identical on every card on the live site (not API-driven,
// unlike the old guessed `type_icon` field which doesn't actually exist in
// the real response). Converted directly from Figma's SVG export.
const CertBadgeIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.1206 6.69147C11.7359 6.05435 11.2866 7.21208 11.2448 7.29537C10.6658 8.45344 10.9381 8.23121 10.2612 8.32975C9.68868 8.41301 8.73981 8.41769 8.73934 8.82662C8.73934 9.0309 9.90787 10.1067 10.1136 10.2446C10.1099 10.4096 10.0587 10.5761 10.0339 10.7227C10.0057 10.8899 9.97707 11.0647 9.95418 11.2016C9.91531 11.4346 9.61324 12.3922 10.0714 12.3922C10.4156 12.3917 11.609 11.5528 11.8323 11.5524L13.0956 12.2024C14.3799 12.9736 13.6282 11.181 13.5503 10.2446C13.7571 10.106 14.9245 9.03136 14.9245 8.82662C14.9242 8.43591 14.3192 8.47431 13.9604 8.41647C13.7524 8.38279 13.5388 8.34864 13.3651 8.32428C12.904 8.25909 12.965 8.31721 12.8612 8.18443L12.1768 6.80709C12.1701 6.79247 12.1303 6.70757 12.1206 6.69147ZM11.8753 7.53834C11.9027 7.6561 12.3993 8.67241 12.4667 8.75006C12.593 8.89332 12.9438 8.8955 13.1878 8.93131C13.4366 8.96798 13.7155 9.02303 13.937 9.04147L13.0011 9.95397C12.7779 10.2212 13.1084 10.9486 13.1206 11.4899C12.7784 11.4099 12.112 10.8886 11.8323 10.8883C11.543 10.8883 10.8798 11.4115 10.5432 11.4899C10.5482 11.2681 10.6344 10.9012 10.6722 10.6743C10.7147 10.4181 10.8239 10.1466 10.6628 9.95397L9.94168 9.25709C9.83615 9.17763 9.80328 9.15421 9.72762 9.04147C10.0124 9.01766 11.0833 8.90591 11.2159 8.72584C11.2943 8.61881 11.7614 7.65908 11.7893 7.53834H11.8753Z"
      fill="#084D92"
    />
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.5737 4.05944C10.1523 4.05949 8.70241 4.81082 7.76121 5.74459C7.62451 5.88002 7.57011 5.97352 7.43934 6.11022C7.18458 6.37689 6.77045 7.05166 6.64012 7.37272C6.50217 7.71153 6.37688 7.99696 6.28153 8.38834C5.92812 9.8381 6.16203 11.4374 6.90965 12.6751C7.27737 13.2835 7.31055 13.2384 7.65262 13.6508C8.12602 14.2211 8.80657 14.6431 9.46824 14.9696C10.867 15.6596 12.8305 15.6527 14.2229 14.9555C15.2057 14.4634 15.5401 14.1927 16.2229 13.4329C17.1552 12.3957 17.544 10.9857 17.544 9.60006C17.544 8.7352 17.3135 8.08796 17.0229 7.37272C16.8928 7.05189 16.4785 6.37671 16.2237 6.11022L15.5362 5.42272C15.3999 5.29569 15.3164 5.22622 15.1565 5.11569C13.9981 4.31582 13.0617 4.05944 11.5737 4.05944ZM7.95574 6.45397C9.61054 4.59186 12.1118 4.12707 14.3659 5.34772C14.786 5.57513 15.0924 5.83829 15.4292 6.17506C17.4416 8.18787 17.4355 11.3635 15.4292 13.3696C14.4958 14.303 13.1807 14.8837 11.8315 14.8837C11.1828 14.8836 10.2733 14.6816 9.72606 14.4118C9.42349 14.2624 9.17051 14.142 8.90418 13.9454C8.78151 13.8547 8.65459 13.7678 8.53699 13.668C7.67762 12.9413 7.1186 11.9631 6.84793 10.8469C6.60103 9.82818 6.74454 8.56154 7.20653 7.63834C7.36755 7.31671 7.4701 7.09684 7.67684 6.82037C7.77009 6.69575 7.85592 6.5663 7.95574 6.45397Z"
      fill="#084D92"
    />
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M14.7854 2.17975C13.593 0.89788 12.849 2.14098 11.8323 2.1485C10.978 2.15464 9.93213 0.878906 8.86121 2.20553C8.61691 2.50832 8.45842 2.7914 8.17137 3.06178C7.66801 3.53589 6.47695 3.20485 5.87059 3.811C5.25648 4.42511 5.60945 5.61117 5.10028 6.13287C4.81606 6.42344 4.54334 6.56456 4.2409 6.82037C2.96071 7.90336 4.20731 8.8799 4.20731 9.77194C4.2073 10.3895 3.67065 10.9225 3.67059 11.5758C3.67059 12.8951 4.95185 12.8334 5.30418 13.7649C5.46801 14.1983 5.41423 14.8177 5.59012 15.2829C5.83716 15.9359 6.27155 15.9534 6.54793 16.086L5.19168 19.7555C5.05653 20.1077 4.68025 20.811 5.25965 20.811C5.51758 20.811 7.53402 20.0033 7.92293 19.9946L8.65028 21.243C8.76526 21.4349 9.26984 22.4001 9.46903 22.4001C9.81503 22.4001 9.78673 22.2914 9.9659 21.8235L10.7026 19.8532C10.7916 19.6261 10.863 19.4264 10.9456 19.1946L11.4386 17.8837C11.5666 17.5395 11.5443 17.3924 11.837 17.3852C12.1195 17.3782 12.1086 17.5817 12.2362 17.9149L13.7089 21.854C13.8833 22.3003 13.8469 22.4001 14.194 22.4001C14.3935 22.3993 14.897 21.4353 15.012 21.243C15.1345 21.0381 15.2525 20.8438 15.3831 20.6251C15.4735 20.4734 15.7026 20.1354 15.7401 19.9946C15.9014 19.9982 16.8745 20.3223 17.0987 20.3977C17.4921 20.5301 19.0031 21.2591 18.68 20.3227C18.4434 19.6375 17.1976 16.4406 17.1151 16.086C17.3665 15.9654 17.4884 15.9803 17.7237 15.793C18.2868 15.345 18.1524 14.3216 18.3651 13.7282C18.7263 12.7208 20.744 12.7564 19.7065 10.6165C19.0135 9.18677 19.9925 9.17402 19.9925 7.75319C19.9925 7.00326 18.8956 6.52013 18.544 6.10944C18.061 5.54441 18.3954 4.41397 17.7925 3.811C17.1728 3.19128 16.0406 3.55181 15.4714 3.03912C15.1689 2.76668 15.0476 2.46151 14.7854 2.17975ZM17.7214 19.5165C17.7758 19.6807 17.8458 19.814 17.8878 19.9946C17.2526 19.9416 15.7398 19.0928 15.4253 19.379L14.5136 20.8719C14.4284 21.0132 14.2746 21.2281 14.237 21.3688C14.1194 21.2828 14.0779 21.0758 14.0268 20.9344C13.8655 20.4871 12.876 17.9305 12.862 17.761C13.0641 17.7779 13.2028 17.8665 13.4432 17.9102C14.5638 18.1141 14.8116 17.1611 15.4495 16.5251C15.6905 16.285 16.1169 16.1798 16.4706 16.1719L17.7214 19.5165ZM7.19246 16.1719C7.97024 16.2366 8.23286 16.456 8.58465 16.9704C8.81779 17.3118 9.29034 17.9329 9.81278 17.9329C10.6279 17.9329 10.3517 17.8327 10.844 17.718L10.1495 19.5587C10.085 19.7319 9.55963 21.2708 9.42606 21.3688C9.38672 21.2249 8.27383 19.399 8.18699 19.3399C8.01333 19.2223 7.80714 19.338 7.59559 19.4094L5.77528 19.9946C5.82123 19.7979 5.88662 19.6644 5.95184 19.4844L7.19246 16.1719ZM12.8198 2.51334C14.4208 1.70966 14.1167 2.74535 15.1745 3.59459C15.8599 4.14423 16.9448 3.84943 17.3495 4.25397C17.9537 4.858 17.032 5.90016 18.7643 7.09147C18.9945 7.24981 19.3909 7.53438 19.3909 7.88209C19.3909 8.61624 18.3945 9.32935 19.0761 10.7313C19.8102 12.2411 19.0341 12.0761 18.3487 12.7672C17.9874 13.1315 17.6914 13.39 17.6331 14.1563C17.5409 15.3716 17.4311 15.4813 16.2159 15.5735C15.3406 15.64 14.9687 16.0867 14.5073 16.7001C13.9537 17.4361 13.8165 17.5147 12.7909 17.0165C10.8932 16.0944 10.3155 18.1741 9.30262 16.8962C8.74354 16.1906 8.48377 15.667 7.44715 15.5743C6.24531 15.4668 6.1247 15.4021 6.02996 14.1563C5.97168 13.3874 5.6695 13.1205 5.29246 12.7454C4.60016 12.0564 3.85215 12.2327 4.58699 10.7321C4.91275 10.0674 4.89423 9.43897 4.57293 8.78365C3.78177 7.17016 4.80769 7.48337 5.65418 6.42897C6.2167 5.72765 5.90878 4.65874 6.31356 4.25397C6.85528 3.71225 7.75515 4.41126 8.85809 3.23287C9.54361 2.5001 9.39916 1.81136 10.8722 2.5274C11.5329 2.84885 12.1711 2.8388 12.8198 2.51334Z"
      fill="#084D92"
    />
  </Svg>
);

// ─── "View course" circle-arrow icon — diploma cards ───────────────────────
const ViewCourseArrowIcon = () => (
  <Svg width={17} height={17} viewBox="0 0 17 17" fill="none" style={{marginLeft: 6}}>
    <Circle cx={8.5} cy={8.5} r={7.9} stroke="#192546" strokeWidth={1.2} />
    <Path
      d="M7.19176 6.10004L7.29336 5.98781C7.73621 5.44513 7.73621 4.6605 7.29336 4.11781L7.19176 4.00559L3.34883 0.163321L2.34477 1.16605L2.58516 1.40711L6.18836 5.00965C6.21161 5.03373 6.21139 5.07285 6.1877 5.09664L2.34277 8.94289L3.34617 9.94629L7.19176 6.10004Z"
      fill="#192546"
      transform="translate(3, 3)"
    />
  </Svg>
);

const BulletRow = ({children}: {children: React.ReactNode}) => (
  <View style={styles.bulletRow}>
    <View style={{marginRight: 8}}>
      <BulletIcon />
    </View>
    <Text style={styles.bulletText}>{children}</Text>
  </View>
);

// ─── Targeted parsers for the two known HTML shapes Robby's API returns ───
// NOT a general HTML parser — tailored to the exact structure seen in the
// Postman response for accreditation.description and
// diploma_details.description. If Robby changes the markup shape, these
// will need updating.

// accreditation.description: intro paragraph, then <ul class="list_styling">
// with <li>Heading: text</li> items (e.g. "Curriculum: IPM provides...").
const parseAccreditation = (html: string) => {
  const ulSplit = html.split(/<ul[^>]*>/i);
  const intro = stripHtml(ulSplit[0] || '');
  const listHtml = ulSplit[1] || '';
  const items: {heading: string; text: string}[] = [];
  const liMatches = listHtml.match(/<li>(.*?)<\/li>/gis) || [];
  liMatches.forEach(li => {
    const clean = stripHtml(li);
    const colonIdx = clean.indexOf(':');
    if (colonIdx > -1) {
      items.push({
        heading: clean.slice(0, colonIdx).trim(),
        text: clean.slice(colonIdx + 1).trim(),
      });
    } else {
      items.push({heading: '', text: clean});
    }
  });
  return {intro, items};
};

// diploma_details.description: <h3>Assessment</h3> paragraph, empty <h3></h3>,
// <h3>Competencies</h3>, then <ul><li><strong>Diploma Name</strong>text</li>...</ul>
const parseDiplomaDetails = (html: string) => {
  const sections = html.split(/<h3>\s*<\/h3>/i); // split off the empty <h3></h3> spacer
  const assessmentBlock = sections[0] || '';
  const competenciesBlock = sections[1] || '';

  const assessmentText = stripHtml(assessmentBlock.replace(/<h3>Assessment<\/h3>/i, ''));

  const ulSplit = competenciesBlock.split(/<ul[^>]*>/i);
  const listHtml = ulSplit[1] || '';
  const competencies: {title: string; text: string}[] = [];
  const liMatches = listHtml.match(/<li>(.*?)<\/li>/gis) || [];
  liMatches.forEach(li => {
    const strongMatch = li.match(/<strong>(.*?)<\/strong>/i);
    const title = strongMatch ? stripHtml(strongMatch[1]) : '';
    const rest = stripHtml(li.replace(/<strong>.*?<\/strong>/i, ''));
    competencies.push({title, text: rest});
  });

  return {assessmentText, competencies};
};

// Renders text containing inline <a href="...">label</a> tags as tappable
// links inline with the surrounding paragraph — used for certificate item
// descriptions (Agile/Scrum blurbs) where the real course link is embedded
// mid-sentence.
const renderInlineLinks = (html: string) => {
  const parts = html.split(/(<a[^>]*href="[^"]*"[^>]*>.*?<\/a>)/gis);
  return parts.map((part, i) => {
    const linkMatch = part.match(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/i);
    if (linkMatch) {
      const [, url, label] = linkMatch;
      return (
        <Text key={i} style={styles.inlineLink} onPress={() => Linking.openURL(url)}>
          {stripHtml(label)}
        </Text>
      );
    }
    return stripHtml(part);
  });
};

const ErrorBlock = ({onRetry}: {onRetry: () => void}) => (
  <View style={styles.loadingWrap}>
    <Text style={styles.errorText}>{"Couldn't load this right now."}</Text>
    <TouchableOpacity onPress={onRetry} style={styles.retryBtn} activeOpacity={0.8}>
      <Text style={styles.retryBtnText}>{'Retry'}</Text>
    </TouchableOpacity>
  </View>
);

// ─── Recommended-body card — "no certifications yet" state ─────────────────
// Figma spec: card 356.285x242.383, radius 9.112, shadow 0 0 10.023 -1.822
// rgba(0,0,0,.15); logo panel 100.234 wide, gradient #D4EEFC→#FFF; title
// 18.224/500; divider 32.927x0.911 #42C0FB; items list 12.757/400 #979797;
// button 81.098x22.78 radius 7.29 #084D92, text white 10.023/700.
const RecommendedBodyCard = ({body}: {body: RecommendedBody}) => (
  <View style={styles.recCard}>
    <LinearGradient
      colors={['#D4EEFC', '#FFFFFF']}
      start={{x: 0, y: 0.2175}}
      end={{x: 0, y: 1}}
      style={styles.recLogoPanel}>
      <Image source={{uri: body.logo}} style={styles.recLogoImg} resizeMode="contain" />
    </LinearGradient>
    <View style={styles.recBody}>
      <View>
        <Text style={styles.recTitle}>{body.title}</Text>
        <View style={styles.recTitleUnderline} />
      </View>
      <Text style={styles.recItemsList}>{body.items.join('\n')}</Text>
      <TouchableOpacity
        style={styles.readMoreBtn}
        onPress={() => Linking.openURL(body.learn_more_url)}
        activeOpacity={0.85}>
        <Text style={styles.readMoreBtnText}>{'Read More'}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── My Certifications tab ─────────────────────────────────────────────────
// CONFIRMED against a real populated response (Aulia's account, Aug 2026).
// - logo_url: same flat IPM logo across every cert in the sample — not a
//   per-diploma seal, this is expected, not a bug.
// - title/name map to title/subtitle per Marium.
// - status is an object ({code, label, expired_on?, days_left?}), not the
//   guessed string enum — label is pre-composed server-side ("Active",
//   "Expired - Recertify Now"), so render it as-is rather than
//   reconstructing wording. When the expired label contains " - ", the
//   trailing portion renders as the underlined recertify link; any other
//   shape (e.g. a possible future "Expired on {date}" variant with no
//   recertify option) falls back to plain navy text.
// - banner colour/copy/link come entirely from footer (style/message/link).
//   'default' -> blue, 'red' -> red, anything else -> navy. No confirmed
//   navy example exists yet — Marium flagged to Robby that "IPM Verified
//   Partner" should be navy but the endpoint currently sends 'red' for it.
//   footer.link is either a real {label, url} object or bare "" — only
//   render the link when it's the object form.
const MyCertificationCard = ({cert}: {cert: MyCertification}) => {
  const statusCode = cert.status?.code;
  const statusLabel = cert.status?.label || '';
  const dashIdx = statusLabel.indexOf(' - ');
  const hasRecertifyLink = statusCode === 'expired' && dashIdx > -1;
  const statusLead = hasRecertifyLink ? statusLabel.slice(0, dashIdx) : statusLabel;
  const statusLinkText = hasRecertifyLink ? statusLabel.slice(dashIdx + 3) : null;

  const footerStyle = cert.footer?.style;
  const bannerBoxStyle =
    footerStyle === 'default'
      ? styles.bannerActive
      : footerStyle === 'red'
      ? styles.bannerExpired
      : styles.bannerUpgrade;
  const bannerTextBaseStyle =
    footerStyle === 'default'
      ? styles.bannerActiveText
      : footerStyle === 'red'
      ? styles.bannerExpiredText
      : styles.bannerUpgradeText;
  const footerLink =
    cert.footer?.link && typeof cert.footer.link === 'object' ? cert.footer.link : null;

  return (
    <View style={styles.certCardWrap}>
      <View style={styles.certCard}>
        <LinearGradient
          colors={['#ABE4FF', '#FFFFFF']}
          start={{x: 0.5, y: 0}}
          end={{x: 0.5, y: 1}}
          style={styles.certBadgePanel}>
          {cert.logo_url ? (
            <Image source={{uri: cert.logo_url}} style={styles.certBadgeImage} resizeMode="cover" />
          ) : (
            <View style={styles.certBadgeFallback} />
          )}
        </LinearGradient>

        <View style={styles.certInfo}>
          <View style={styles.certTitleRow}>
            <View style={styles.certTitleCol}>
              <Text style={styles.certTitle}>{cert.title}</Text>
              <View style={styles.certTitleUnderline} />
            </View>
            <CertBadgeIcon />
          </View>

          {cert.name ? <Text style={styles.certSubtitle}>{cert.name}</Text> : null}

          <View style={styles.certStatusRow}>
            {statusCode === 'active' ? (
              <Text style={[styles.certStatusText, styles.certStatusActive]}>{statusLead}</Text>
            ) : statusCode === 'expired' ? (
              hasRecertifyLink ? (
                <Text style={styles.certStatusText}>
                  <Text style={styles.certStatusExpired}>{statusLead}</Text>
                  {' - '}
                  <Text
                    style={styles.certInlineLink}
                    onPress={() => footerLink && Linking.openURL(footerLink.url)}>
                    {statusLinkText}
                  </Text>
                </Text>
              ) : (
                <Text style={[styles.certStatusText, styles.certStatusExpired]}>{statusLead}</Text>
              )
            ) : (
              <Text style={[styles.certStatusText, styles.certStatusDefault]}>{statusLead}</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.seeCertBtn}
            activeOpacity={0.85}
            onPress={() => cert.certificate_url && Linking.openURL(cert.certificate_url)}>
            <Text style={styles.seeCertBtnText}>{'See Certificate'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {cert.footer?.message ? (
        <View style={bannerBoxStyle}>
          <Text style={bannerTextBaseStyle}>
            {cert.footer.message}
            {footerLink ? (
              <Text style={styles.bannerLink} onPress={() => Linking.openURL(footerLink.url)}>
                {`  ${footerLink.label}`}
              </Text>
            ) : null}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const MyCertificationsTab = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MyCertificationsResponse | null>(null);

  const load = async () => {
    setLoading(true);
    const result = await getMyCertifications();
    setData(result);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingBlock />;
  if (!data) return <ErrorBlock onRetry={load} />;

  if (!data.has_certificates) {
    return (
      <View style={styles.tabContent}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{data.empty_title}</Text>
          <View style={styles.emptyDivider} />
          <Text style={styles.emptySubtitle}>{data.empty_message}</Text>
        </View>

        {data.recommended.map(body => (
          <RecommendedBodyCard key={body.title} body={body} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {data.certificates.map((cert, i) => (
        <MyCertificationCard key={cert.certificate_id ?? i} cert={cert} />
      ))}
    </View>
  );
};

// ─── Certifications Overview tab ───────────────────────────────────────────
// Local logo badges (90x90 circular, white bg, shadow) that overlap the top
// of each qualification-item photo — per Marium: these are local assets
// (ipmcert, ipmacert, pmicert, prince2cert, dublincert, eqfcert), not the
// API's logo_url. ASSUMPTION: array order below matches qualifications.items
// order from the API (IPM, IPMA, PMI, PRINCE2, TU Dublin, EQF — confirmed
// against the Postman response Robby sent). If Robby ever reorders the
// items array, this mapping breaks — flag if that ever seems off.
// Also ASSUMES these 6 files exist at src/assets/images/ — confirm filenames
// before running.
const QUALIFICATION_BADGES = [
  require('../assets/images/ipmcert.png'),
  require('../assets/images/ipmacert.png'),
  require('../assets/images/pmicert.png'),
  require('../assets/images/prince2cert.png'),
  require('../assets/images/dublincert.png'),
  require('../assets/images/eqfcert.png'),
];

const QualificationCardInner = ({item, index}: {item: QualificationItem; index: number}) => (
  <>
    <Text style={styles.qualTag}>{item.heading.toUpperCase()}</Text>
    <Text style={styles.qualName}>{item.name}</Text>
    <Text style={styles.qualDescription}>{item.description}</Text>
    {item.learn_more?.url ? (
      <TouchableOpacity onPress={() => Linking.openURL(item.learn_more.url)} activeOpacity={0.8}>
        <Text style={styles.learnMoreLink}>{item.learn_more.title || 'Learn more'}</Text>
      </TouchableOpacity>
    ) : null}
    {item.photo_url ? (
      <View style={styles.qualPhotoWrap}>
        <Image source={{uri: item.photo_url}} style={styles.qualPhoto} resizeMode="cover" />
        {QUALIFICATION_BADGES[index] ? (
          <View style={styles.qualBadgeFrame}>
            <Image source={QUALIFICATION_BADGES[index]} style={styles.qualBadgeImg} resizeMode="contain" />
          </View>
        ) : null}
      </View>
    ) : null}
  </>
);

// TU Dublin / EQF (item.add_bg === 'yes') get their own opaque gradient
// frame per spec — everyone else is a plain card on the section's
// transparent-fade gradient background.
const QualificationCard = ({item, index}: {item: QualificationItem; index: number}) =>
  item.add_bg === 'yes' ? (
    <LinearGradient
      colors={['#ABE4FF', '#FFFFFF']}
      start={{x: 0, y: -0.291}}
      end={{x: 0, y: 0.7943}}
      style={[styles.qualCard, styles.qualCardBgWrap]}>
      <QualificationCardInner item={item} index={index} />
    </LinearGradient>
  ) : (
    <View style={styles.qualCard}>
      <QualificationCardInner item={item} index={index} />
    </View>
  );

const CertificationsOverviewTab = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CertificationsOverviewResponse | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');

  const load = async () => {
    setLoading(true);
    setData(await getCertificationsOverview());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingBlock />;
  if (!data) return <ErrorBlock onRetry={load} />;

  return (
    <View style={styles.tabOuter}>
      {/* Hero — navy block */}
      <View style={styles.overviewContainer}>
        <Text style={styles.heroCardTitle}>{data.hero.title}</Text>
        <View style={styles.titleDivider} />
        <Text style={styles.heroCardBody}>{data.hero.description}</Text>
        <TouchableOpacity
          style={styles.outlineBtnLight}
          onPress={() => Linking.openURL(data.hero.button.url)}
          activeOpacity={0.85}>
          <Text style={styles.outlineBtnLightText}>{data.hero.button.title}</Text>
        </TouchableOpacity>
      </View>

      {/* White section — partner logos, hero photo, scroll-to-top */}
      <View style={styles.belowPhotoSection}>
        <View style={styles.partnerLogoRow}>
          {data.hero.logos.map((logo, i) => (
            <Image
              key={i}
              source={{uri: logo.logo_url}}
              style={styles.partnerLogo}
              resizeMode="contain"
            />
          ))}
        </View>

        <Image
          source={{uri: data.hero.photo_url}}
          style={styles.circularPhoto}
          resizeMode="cover"
        />
      </View>

      {/* Globally Recognised Credentials */}
      <View style={styles.highlightSection}>
        <Text style={styles.h1Heading}>{data.highlight.title}</Text>
        {data.highlight.photo_url ? (
          <Image
            source={{uri: data.highlight.photo_url}}
            style={styles.highlightPhoto}
            resizeMode="cover"
          />
        ) : null}
        <Text style={[styles.bodyText, styles.bodyTextCenter]}>{data.highlight.description}</Text>
      </View>

      {/* Certifications, Qualifications, Accreditations */}
      <LinearGradient
        colors={['#ABE4FF', 'rgba(255,255,255,0)']}
        start={{x: 0, y: -0.291}}
        end={{x: 0, y: 0.7943}}
        style={styles.qualSectionOuter}>
        <Text style={[styles.h1Heading, styles.bodyTextCenter]}>{data.qualifications.title}</Text>
        <Text style={[styles.bodyText, styles.bodyTextCenter, {marginTop: 12, marginBottom: 8}]}>
          {data.qualifications.description}
        </Text>
        <View style={styles.qualDivider} />
        {data.qualifications.items.map((item, i) => (
          <QualificationCard key={i} item={item} index={i} />
        ))}
      </LinearGradient>

      {/* We've trained employees for... — horizontal slider */}
      <View style={styles.clientsSection}>
        <Text style={styles.clientsTitle}>{data.clients.title}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.clientsLogoScroll}>
          {data.clients.logos.map((url, i) => (
            <Image key={i} source={{uri: url}} style={styles.clientLogo} resizeMode="contain" />
          ))}
        </ScrollView>
      </View>

      {/* Need further information */}
      <View style={styles.outroSection}>
        {data.outro.photo_url ? (
          <Image source={{uri: data.outro.photo_url}} style={styles.outroImg} resizeMode="contain" />
        ) : null}
        <Text style={styles.outroTitle}>{data.outro.title}</Text>
        <TouchableOpacity
          style={styles.outroBtn}
          onPress={() => Linking.openURL(data.outro.button.url)}
          activeOpacity={0.85}>
          <Text style={styles.outroBtnText}>{data.outro.button.title}</Text>
        </TouchableOpacity>
      </View>

      {/* Newsletter signup — UI only. No backend endpoint for this yet
          (confirmed with Robby separately), so submit currently does
          nothing. Wire up once that endpoint exists. */}
      <LinearGradient
        colors={['#BEE6F9', 'rgba(235,249,255,0.26)']}
        start={{x: 0.15, y: 0}}
        end={{x: 0.85, y: 1}}
        style={styles.newsletterSection}>
        <Text style={styles.h1Heading}>{'Get the latest news and insights in project management'}</Text>
        <View style={styles.newsletterRow}>
          <View style={styles.newsletterInputWrap}>
            <TextInput
              style={styles.newsletterInput}
              placeholder="Enter your email"
              placeholderTextColor="#8F9098"
              value={newsletterEmail}
              onChangeText={setNewsletterEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <TouchableOpacity activeOpacity={0.85}>
            <LinearGradient
              colors={['#4992DB', '#084D92']}
              start={{x: 0.1, y: 0}}
              end={{x: 0.9, y: 1}}
              style={styles.newsletterSubmitBtn}>
              <Text style={styles.newsletterSubmitIcon}>{'→'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

// ─── IPM Certifications tab ────────────────────────────────────────────────
const IpmCertificationsTab = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CertificationsIpmResponse | null>(null);

  const load = async () => {
    setLoading(true);
    setData(await getCertificationsIpm());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingBlock />;
  if (!data) return <ErrorBlock onRetry={load} />;

  return (
    <View style={styles.tabOuter}>
      {/* Hero */}
      <View style={styles.ipmContainer}>
        <Image source={{uri: data.hero.logo_url}} style={styles.ipmLogoCert} resizeMode="contain" />
        <Text style={styles.ipmHeading}>{data.hero.title}</Text>
        <Text style={styles.ipmBody}>{data.hero.description}</Text>
        <TouchableOpacity
          style={styles.outlineBtnDark}
          onPress={() => Linking.openURL(data.hero.button.url)}
          activeOpacity={0.85}>
          <Text style={styles.outlineBtnDarkText}>{data.hero.button.title}</Text>
        </TouchableOpacity>
      </View>

      {/* Who is IPM? — H1 24/700 + Body, both centered */}
      <View style={styles.belowPhotoSection}>
        <Image
          source={{uri: data.who_is_ipm.photo_url}}
          style={styles.circularPhoto}
          resizeMode="cover"
        />
        <Text style={styles.h1Heading}>{data.who_is_ipm.title}</Text>
        <Text style={[styles.bodyText, styles.bodyTextCenter]}>{data.who_is_ipm.description}</Text>
      </View>

      {/* Our Philosophy & Mission — own gradient frame, circular photo,
          left-aligned block (heading itself still centered per spec) */}
      <LinearGradient
        colors={['#ABE4FF', 'rgba(255,255,255,0)']}
        start={{x: 0, y: -0.291}}
        end={{x: 0, y: 0.7943}}
        style={styles.philosophySection}>
        {data.philosophy.photo_url ? (
          <Image
            source={{uri: data.philosophy.photo_url}}
            style={styles.philosophyPhoto}
            resizeMode="cover"
          />
        ) : null}
        <Text style={[styles.h1Heading, styles.bodyTextCenter, {alignSelf: 'stretch', marginBottom: 8}]}>
          {data.philosophy.title}
        </Text>
        <Text style={styles.bodyText}>{data.philosophy.description}</Text>
      </LinearGradient>

      {/* Accreditation — intro paragraph + real bullet list (icon + heading
          + text), replacing the old flattened stripHtml text block. */}
      <View style={styles.qualSectionOuter}>
        <Text style={styles.h1Heading}>{data.accreditation.title}</Text>
        {(() => {
          const {intro, items} = parseAccreditation(data.accreditation.description);
          return (
            <>
              <Text style={[styles.bodyText, {marginTop: 12, marginBottom: 8}]}>{intro}</Text>
              {items.map((it, i) => (
                <BulletRow key={i}>
                  {it.heading ? <Text style={styles.bulletHeading}>{`${it.heading}: `}</Text> : null}
                  {it.text}
                </BulletRow>
              ))}
            </>
          );
        })()}
      </View>

      {/* IPM Professional Diplomas — intro text, then a horizontal slider
          of the 3 diploma cards (image-left/text-right, matching the
          "My Certifications" recommendation card pattern). CONFIRMED via
          Postman (Aug 2026): diplomas.items gives per-diploma course_id,
          title, description, photo_url, and button.url — no more hardcoded
          copy or placeholder thumbnails. */}
      <View style={styles.diplomasSection}>
        <Text style={styles.h1Heading}>{data.diplomas.title}</Text>
        <Text style={[styles.bodyText, {marginTop: 24}]}>{stripHtml(data.diplomas.description)}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.diplomaSlider}>
          {data.diplomas.items.map(course => (
            <View key={course.course_id} style={styles.diplomaCard}>
              {course.photo_url ? (
                <Image source={{uri: course.photo_url}} style={styles.diplomaCardPhoto} resizeMode="cover" />
              ) : (
                <View style={styles.diplomaCardPhoto} />
              )}
              <View style={styles.diplomaCardTextFrame}>
                <View>
                  <Text style={styles.diplomaCardTitle}>{course.title}</Text>
                  <Text style={styles.diplomaCardTagline}>{course.description}</Text>
                </View>
                <TouchableOpacity
                  style={styles.diplomaViewCourseRow}
                  onPress={() => Linking.openURL(course.button.url)}
                  activeOpacity={0.8}>
                  <Text style={styles.diplomaViewCourseText}>{course.button.title || 'View course'}</Text>
                  <ViewCourseArrowIcon />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>


        {/* Assessment & Competencies — from diploma_details.description */}
        {(() => {
          const {assessmentText, competencies} = parseDiplomaDetails(
            data.diploma_details.description,
          );
          return (
            <>
              <Text style={[styles.h1Heading, styles.headingLeft, {marginTop: 16}]}>{'Assessment'}</Text>
              <Text style={styles.bodyText}>{assessmentText}</Text>
              <Text style={[styles.h1Heading, styles.headingLeft, {marginTop: 16}]}>{'Competencies'}</Text>
              {competencies.map((c, i) => (
                <BulletRow key={i}>
                  <Text style={styles.competencyTitle}>{c.title}</Text>
                  {'\n'}
                  {c.text}
                </BulletRow>
              ))}
            </>
          );
        })()}
      </View>

      {/* IPM Professional Certificates — own gradient frame, centered
          circular photo, centered H2 titles, inline tappable links inside
          each certificate's description. */}
      <LinearGradient
        colors={['#ABE4FF', 'rgba(255,255,255,0)']}
        start={{x: 0, y: -0.291}}
        end={{x: 0, y: 0.7943}}
        style={styles.certificatesSection}>
        <Text style={[styles.h1Heading, styles.bodyTextCenter, {alignSelf: 'stretch', marginBottom: 8}]}>
          {data.certificates.title}
        </Text>
        <Text style={[styles.bodyText, styles.bodyTextCenter]}>{data.certificates.description}</Text>
        {data.certificates.photo_url ? (
          <Image
            source={{uri: data.certificates.photo_url}}
            style={styles.certificatesPhoto}
            resizeMode="cover"
          />
        ) : null}
        {data.certificates.items.map((item, i) => (
          <View key={i} style={styles.certItemBlock}>
            <Text style={styles.certItemTitle}>{item.title}</Text>
            <Text style={styles.bodyText}>{renderInlineLinks(item.description)}</Text>
          </View>
        ))}
      </LinearGradient>

      {/* IPM Certificate of Completion — plain white (no gradient frame
          per feedback); course links left-aligned with a small arrow icon
          each, 10px gap before the list starts. */}
      <View style={styles.qualSectionOuter}>
        <Text style={styles.h1Heading}>{data.completion_certificate.title}</Text>
        <Text style={styles.bodyText}>{data.completion_certificate.description}</Text>
        {data.completion_certificate.photo_url ? (
          <Image
            source={{uri: data.completion_certificate.photo_url}}
            style={styles.highlightPhoto}
            resizeMode="cover"
          />
        ) : null}
        <Text style={styles.bodyText}>{data.completion_certificate.second_description}</Text>
        <View style={{marginTop: 10}}>
          {data.completion_certificate.course_list.map((course, i) => (
            <TouchableOpacity
              key={i}
              style={styles.courseListRow}
              onPress={() => Linking.openURL(course.url)}
              activeOpacity={0.8}>
              <Text style={styles.courseListArrow}>{'↗'}</Text>
              <Text style={styles.courseListLink}>{course.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

// ─── Main screen ────────────────────────────────────────────────────────────
const CertificationsScreen = ({navigation}: any) => {
  const [activeTab, setActiveTab] = useState<TabKey>('my');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({y: 0, animated: true});
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      <TabBar active={activeTab} onChange={setActiveTab} />

      <View style={{flex: 1}}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {activeTab === 'my' && <MyCertificationsTab />}
          {activeTab === 'overview' && <CertificationsOverviewTab />}
          {activeTab === 'ipm' && <IpmCertificationsTab />}
          <View style={{height: 40}} />
        </ScrollView>

        {/* Fixed to the screen — does not move with scroll content.
            Only shown on Overview/IPM (matches Figma; "My Certifications"
            tab has no scroll-to-top affordance). */}
        {activeTab !== 'my' && (
          <TouchableOpacity
            style={styles.floatingScrollTopBtn}
            activeOpacity={0.85}
            onPress={scrollToTop}>
            <Text style={styles.scrollTopBtnIcon}>{'↑'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ProfileDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigation={navigation}
      />
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F2F4F7'},
  scrollContent: {flexGrow: 1, width: '100%'},

  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: 45,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  // Figma gap:12 between tabs — using marginRight per project rule
  // (never use `gap` in StyleSheet, unreliable on Android/Hermes).
  tabItem: {paddingVertical: 12, marginRight: 12},
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center',
    color: '#192546',
    fontFamily: 'Runda',
  },
  tabLabelActive: {color: '#0C4D91', fontWeight: '700'},
  tabUnderline: {height: 2, backgroundColor: '#0C4D91', marginTop: 4, borderRadius: 1},

  tabContent: {paddingHorizontal: 16, paddingTop: 16},
  tabOuter: {width: '100%'},
  loadingWrap: {paddingVertical: 60, alignItems: 'center'},
  errorText: {fontSize: 13, color: '#8F9098', fontFamily: 'Runda', marginBottom: 10},
  retryBtn: {
    backgroundColor: '#0C4D91',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  retryBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '700', fontFamily: 'Runda'},

  // Empty state (My Certifications) — Figma: title 18.224/500 #192647,
  // divider 70.164x0.462 #46B1E4, subtitle 13.668/400 #192647
  emptyState: {alignItems: 'center', paddingVertical: 24, marginBottom: 8},
  emptyTitle: {
    fontSize: 18.224,
    fontWeight: '500',
    color: '#192647',
    fontFamily: 'Runda',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDivider: {width: 70.164, height: 0.462, backgroundColor: '#46B1E4', marginBottom: 12},
  emptySubtitle: {
    fontSize: 13.668,
    lineHeight: 18.224,
    color: '#192647',
    fontFamily: 'Runda',
    textAlign: 'center',
  },

  // My Certification card (populated state) — exact Figma spec (Aug 2026)
  certCardWrap: {marginBottom: 16},
  certCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    overflow: 'hidden',
    shadowColor: '#46B0E3',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  // gap 16 between panel and info column handled via marginRight (gap is
  // unreliable on Android/Hermes)
  certBadgePanel: {width: 110, height: 219, alignItems: 'center', justifyContent: 'center', marginRight: 16},
  certBadgeImage: {width: 80, height: 80, borderRadius: 40},
  certBadgeFallback: {width: 80, height: 80, borderRadius: 40, backgroundColor: '#0C4D91'},
  certInfo: {flex: 1, paddingVertical: 16},
  certTitleRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  certTitleCol: {flexShrink: 1},
  certTitle: {fontSize: 14, fontWeight: '500', color: '#192546', fontFamily: 'Runda'},
  certTitleUnderline: {width: 43, height: 1.5, backgroundColor: '#46B0E3', marginTop: 4},
  certSubtitle: {fontSize: 12, color: '#8F9098', fontFamily: 'Runda', marginTop: 8, lineHeight: 16},
  certStatusRow: {marginTop: 16, marginBottom: 10},
  certStatusText: {fontSize: 12, fontFamily: 'Runda'},
  certStatusActive: {color: '#46B0E3', fontWeight: '500'},
  certStatusExpired: {color: '#ED3241', fontWeight: '500', lineHeight: 22},
  certInlineLink: {color: '#46B0E3', fontWeight: '500', lineHeight: 22, textDecorationLine: 'underline'},
  // fallback for any status.code we haven't confirmed yet (e.g. a possible
  // "Expired on {date}" variant with no recertify link)
  certStatusDefault: {color: '#192546', fontWeight: '500'},
  seeCertBtn: {backgroundColor: '#0C4D91', borderRadius: 5, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center'},
  seeCertBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '700', fontFamily: 'Runda'},
  bannerActive: {
    backgroundColor: '#46B0E3',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },
  bannerActiveText: {fontSize: 11, color: '#FFFFFF', fontFamily: 'Runda', lineHeight: 16, textAlign: 'center'},
  bannerExpired: {
    backgroundColor: '#ED3241',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },
  bannerExpiredText: {fontSize: 11, color: '#FFFFFF', fontFamily: 'Runda', lineHeight: 16, textAlign: 'center'},
  // 3rd banner variant (footer.style not 'default'/'red') — UNCONFIRMED
  // against real data, navy per Figma/live-site IPM Verified Partner example
  bannerUpgrade: {
    backgroundColor: '#192546',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },
  bannerUpgradeText: {fontSize: 11, color: '#FFFFFF', fontFamily: 'Runda', lineHeight: 16, textAlign: 'center'},
  bannerLink: {fontWeight: '700', textDecorationLine: 'underline'},

  // Recommended-body card — exact Figma spec
  recCard: {
    width: 356.285,
    minHeight: 242.383,
    borderRadius: 9.112,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 10.023,
    elevation: 3,
    marginBottom: 16,
    alignSelf: 'center',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  recLogoPanel: {
    width: 100.234,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 9.112,
    borderBottomLeftRadius: 9.112,
  },
  recLogoImg: {width: 56, height: 56},
  recBody: {flex: 1, padding: 14, justifyContent: 'space-between'},
  recTitle: {
    fontSize: 18.224,
    fontWeight: '700',
    color: '#192647',
    fontFamily: 'Runda',
    lineHeight: 22.871,
    letterSpacing: -0.273,
  },
  recTitleUnderline: {width: 32.927, height: 0.911, backgroundColor: '#42C0FB', marginTop: 6},
  recItemsList: {
    fontSize: 12.757,
    lineHeight: 16.074,
    color: '#979797',
    fontFamily: 'Runda',
    letterSpacing: -0.191,
    marginVertical: 10,
  },
  readMoreBtn: {
    width: 81.098,
    height: 22.78,
    borderRadius: 7.29,
    backgroundColor: '#084D92',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readMoreBtnText: {color: '#FFFFFF', fontSize: 10.023, fontWeight: '700', fontFamily: 'Runda'},

  // Overview / IPM hero — full-bleed colored block
  overviewContainer: {
    display: 'flex',
    width: '100%',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#0C4D91',
  },
  heroCardTitle: {color: '#FFFFFF', fontSize: 18, fontWeight: '700', fontFamily: 'Runda', textAlign: 'center'},
  titleDivider: {width: 32, height: 1, backgroundColor: 'rgba(255,255,255,0.5)'},
  heroCardBody: {color: '#FFFFFF', fontSize: 13, lineHeight: 18, fontFamily: 'Runda', textAlign: 'center', maxWidth: '92%'},
  outlineBtnLight: {borderWidth: 1, borderColor: '#FFFFFF', borderRadius: 24, paddingVertical: 10, alignItems: 'center', alignSelf: 'stretch'},
  outlineBtnLightText: {color: '#FFFFFF', fontSize: 13, fontWeight: '700', fontFamily: 'Runda'},

  partnerLogoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: 25,
    rowGap: 20,
    alignSelf: 'stretch',
  },
  partnerLogo: {width: 80, height: 36},

  belowPhotoSection: {
    display: 'flex',
    width: '100%',
    paddingVertical: 32,
    paddingHorizontal: 16,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    backgroundColor: '#FFFFFF',
  },
  circularPhoto: {width: 162, height: 161, borderRadius: 80, borderWidth: 0, overflow: 'hidden', backgroundColor: 'lightgray'},
  // Fixed to the screen (sibling of the ScrollView, not inside its content)
  // so it stays in the same spot regardless of scroll position — matches
  // "always shows here, even scrolling down" feedback. Position approximates
  // where it sits in the Figma screenshot; adjust bottom/right once checked
  // against the emulator.
  floatingScrollTopBtn: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#0C4D91',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 10,
  },
  scrollTopBtnIcon: {color: '#FFFFFF', fontSize: 18, fontWeight: '700'},
  whoIsIpmTitle: {fontSize: 18, fontWeight: '800', color: '#192546', fontFamily: 'Runda', textAlign: 'center'},

  // "Globally Recognised Credentials" / Philosophy / IPM diploma blocks —
  // Figma: 24px H1, centered, gap 24, white bg, paddingVertical 32
  highlightSection: {
    width: '100%',
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FFFFFF',
  },
  h1Heading: {
    color: '#192647',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.24,
  },
  highlightPhoto: {width: 162, height: 161, borderRadius: 80, backgroundColor: 'lightgray'},
  bodyText: {
    alignSelf: 'stretch',
    color: '#192647',
    fontFamily: 'Runda',
    fontSize: 16,
    lineHeight: 20,
  },
  bodyTextCenter: {textAlign: 'center'},
  headingLeft: {textAlign: 'left', alignSelf: 'flex-start'},

  // Qualifications list section — outer is now a LinearGradient
  // (180deg #ABE4FF -29.1% → transparent 79.43%) rendered inline at the
  // call site; this style just supplies the box-model props.
  qualSectionOuter: {
    width: '100%',
    paddingVertical: 32,
    paddingHorizontal: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  qualCard: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 20,
  },
  // TU Dublin / EQF cards only (item.add_bg === 'yes') — own opaque
  // gradient frame, separate from the section-level gradient above.
  qualCardBgWrap: {
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  qualDivider: {width: 88, height: 1, backgroundColor: '#46B0E3', marginBottom: 16},
  qualTag: {color: '#7C86A1', fontFamily: 'Runda', fontSize: 16, lineHeight: 20, textAlign: 'center', alignSelf: 'stretch'},
  qualName: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  qualDescription: {color: '#192647', fontFamily: 'Runda', fontSize: 16, lineHeight: 20},
  learnMoreLink: {color: '#46B0E3', fontFamily: 'Runda', fontSize: 16, fontWeight: '500', marginTop: 4},
  // Photo 358x569.032 (aspect-ratio 56/89) with the 90x90 circular logo
  // badge overlapping its top-left corner. Overlap amount is a visual
  // approximation — adjust top/left once checked against the emulator.
  qualPhotoWrap: {width: '100%', position: 'relative', marginTop: 8, alignItems: 'center'},
  qualPhoto: {width: '100%', aspectRatio: 56 / 89, borderRadius: 10, backgroundColor: 'lightgray'},
  qualBadgeFrame: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 90,
    height: 90,
    padding: 9.6,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(70, 177, 228, 0.25)',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1,
    shadowRadius: 9,
    elevation: 5,
  },
  qualBadgeImg: {width: '100%', height: '100%'},

  clientsSection: {width: '100%', paddingVertical: 32, paddingHorizontal: 0, backgroundColor: '#FFFFFF'},
  clientsTitle: {
    color: '#7C86A1',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  // Horizontal slider — per feedback ("its a slide like it moves from
  // left to right"). Gap 33 via marginRight on children (never `gap` in
  // StyleSheet on Android). Logos rendered tinted per spec
  // (background/tint #8DA5C3) — tintColor only renders correctly for
  // single-color PNGs with alpha; flag if the real logo files are full-color
  // rasters, since tintColor will look wrong on those.
  clientsLogoScroll: {paddingHorizontal: 16, alignItems: 'center'},
  clientLogo: {width: 53.043, height: 23.579, marginRight: 33, tintColor: '#8DA5C3'},

  outroSection: {
    width: '100%',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 20,
    backgroundColor: '#0C4D91',
  },
  outroImg: {width: 82.645, height: 82.645, borderRadius: 41.32},
  outroTitle: {color: '#FFFFFF', textAlign: 'center', fontFamily: 'Runda', fontSize: 24, fontWeight: '700', letterSpacing: 0.24},
  outroBtn: {
    height: 40,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  outroBtnText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 13, fontWeight: '700'},

  newsletterSection: {
    width: '100%',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 24,
  },
  newsletterRow: {flexDirection: 'row', alignSelf: 'stretch', alignItems: 'stretch'},
  newsletterInputWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 32,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  newsletterInput: {fontFamily: 'Runda', fontSize: 14, color: '#192546', padding: 0},
  newsletterSubmitBtn: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  newsletterSubmitIcon: {color: '#FFFFFF', fontSize: 22, fontWeight: '700'},

  certItemBlock: {marginTop: 16, gap: 6},
  certItemTitle: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
    textAlign: 'center',
  },
  courseListRow: {flexDirection: 'row', alignItems: 'center', marginTop: 8},
  courseListArrow: {color: '#46B0E3', fontSize: 14, fontWeight: '700', marginRight: 6},
  courseListLink: {color: '#46B0E3', fontFamily: 'Runda', fontSize: 16, fontWeight: '500'},
  inlineLink: {color: '#46B0E3', fontFamily: 'Runda', fontSize: 16, fontWeight: '500'},

  // Accreditation / Competencies bullet list — icon + text row
  bulletRow: {flexDirection: 'row', alignItems: 'flex-start', marginTop: 10},
  bulletText: {flex: 1, color: '#192647', fontFamily: 'Runda', fontSize: 16, lineHeight: 20},
  bulletHeading: {fontWeight: '700'},
  competencyTitle: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.08,
  },

  // Our Philosophy & Mission — own gradient frame, circular photo
  philosophySection: {
    width: '100%',
    paddingTop: 32,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  philosophyPhoto: {width: 162, height: 161, borderRadius: 80, alignSelf: 'center', backgroundColor: 'lightgray', marginBottom: 10},

  // IPM Professional Diplomas — intro text + horizontal card slider
  diplomasSection: {
    width: '100%',
    paddingTop: 32,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  diplomaSlider: {paddingVertical: 24, alignItems: 'center'},
  diplomaCard: {
    width: 300,
    height: 254,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 15.034,
    borderRadius: 7.706,
    backgroundColor: '#FFFFFF',
    marginRight: 16,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 9.418,
    elevation: 3,
    overflow: 'hidden',
  },
  diplomaCardPhoto: {
    width: 110,
    height: '100%',
    backgroundColor: '#E5EEF5',
  },
  diplomaCardTextFrame: {
    flex: 1,
    alignSelf: 'stretch',
    paddingVertical: 15.034,
    marginLeft: 15.034,
    justifyContent: 'space-between',
  },
  diplomaCardTitle: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
    marginBottom: 6,
  },
  diplomaCardTagline: {color: '#192546', fontFamily: 'Runda', fontSize: 12, lineHeight: 16},
  diplomaViewCourseRow: {flexDirection: 'row', alignItems: 'center'},
  diplomaViewCourseText: {color: '#192546', fontFamily: 'Runda', fontSize: 14, fontWeight: '500'},

  // IPM Professional Certificates — own gradient frame, centered circular photo
  certificatesSection: {
    width: '100%',
    paddingTop: 32,
    paddingBottom: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  certificatesPhoto: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'lightgray',
    marginVertical: 8,
  },

  ipmContainer: {
    display: 'flex',
    width: '100%',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 24,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#EEF7FC',
  },
  ipmLogoCert: {width: 72, height: 72},
  ipmHeading: {fontSize: 18, fontWeight: '700', color: '#192546', fontFamily: 'Runda', textAlign: 'center'},
  ipmBody: {color: '#192546', textAlign: 'center', fontFamily: 'Runda', fontSize: 14, fontWeight: '400', lineHeight: 18, maxWidth: '92%'},
  outlineBtnDark: {borderWidth: 1, borderColor: '#0C4D91', borderRadius: 24, paddingVertical: 10, alignItems: 'center', alignSelf: 'stretch'},
  outlineBtnDarkText: {color: '#0C4D91', fontSize: 13, fontWeight: '700', fontFamily: 'Runda'},
});

export default CertificationsScreen;
