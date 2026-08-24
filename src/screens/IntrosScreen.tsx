/* eslint-disable prettier/prettier */
import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, StatusBar, ActivityIndicator, RefreshControl, Alert, Dimensions} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import {
  getIntroductions,
  getActivityComments,
  postActivityComment,
  toggleLike,
  getMemberByUsername,
  getMemberProfile,
  resolveFullName,
  countryFlag,
  getToken,
  stripHtml,
  IntroPost,
} from '../api/feedApi';
import {getUserIdFromToken} from '../api/profileApi';

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';

// Card width leaves the next card peeking in from the right edge, matching Figma.
const {width: SCREEN_WIDTH} = Dimensions.get('window');
const INSIGHT_CARD_WIDTH = SCREEN_WIDTH * 0.72;

// ─── Shared icons — identical to FeedScreen ──────────────────────────────────
const CommentIcon = ({color = '#192546'}: {color?: string}) => (
  <Svg width={14.839} height={13.85} viewBox="0 0 16 15" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M1.61718 9.95967V2.23097C1.61718 1.84503 1.8221 1.64354 2.2046 1.64354H13.8905C14.2695 1.64354 14.4779 1.85191 14.4779 2.23097V9.95967C14.4779 10.2246 14.3768 10.3988 14.1992 10.4848C13.9612 10.6002 12.1924 10.5471 11.85 10.5471L7.8295 10.5453C7.54807 10.5464 7.45634 10.6754 7.28794 10.8077C6.79373 11.1963 4.99379 12.6848 4.58508 12.9584C4.58508 12.6619 4.64422 10.9843 4.52415 10.7935C4.42013 10.6285 4.30087 10.5443 4.02993 10.5458C3.5349 10.5484 3.0397 10.5469 2.54467 10.5471C2.28503 10.5471 2.05504 10.5717 1.87567 10.4742C1.70596 10.382 1.61718 10.209 1.61718 9.95967ZM0.62793 2.01457V10.1761C0.62793 10.4994 0.833675 10.8909 1.05351 11.1108C1.26712 11.3245 1.67042 11.5363 1.98821 11.5363H3.59583V14.0713C3.59583 14.2956 3.81026 14.5041 4.1523 14.5041C4.35034 14.5041 5.10059 13.8475 5.28897 13.6932C6.11867 13.0146 7.05812 12.3076 7.86505 11.6322C7.94285 11.567 7.91583 11.5575 8.01886 11.5386L13.8595 11.5363C14.2477 11.5368 14.4232 11.5116 14.6846 11.3722C15.0404 11.1825 15.4671 10.6996 15.4671 10.1761V2.01457C15.4671 1.35229 14.769 0.654297 14.1069 0.654297H1.98821C1.32609 0.654297 0.62793 1.35229 0.62793 2.01457Z" fill={color} />
    {/* Two text lines inside the bubble — Figma: 8.903x0.989 and 4.946x0.989 */}
    <Path fillRule="evenodd" clipRule="evenodd" d="M3.5 5.13279C3.5 5.47482 3.70853 5.68925 3.93279 5.68925H11.9706C12.1949 5.68925 12.4034 5.47482 12.4034 5.13279C12.4034 4.93965 12.1637 4.7 11.9706 4.7H3.93279C3.72835 4.7 3.5 4.92835 3.5 5.13279Z" fill={color} />
    <Path fillRule="evenodd" clipRule="evenodd" d="M3.5 7.63279C3.5 7.97482 3.70853 8.18925 3.93279 8.18925H8.01345C8.23771 8.18925 8.4464 7.97482 8.4464 7.63279C8.4464 7.43982 8.20658 7.2 8.01345 7.2H3.93279C3.72835 7.2 3.5 7.42835 3.5 7.63279Z" fill={color} />
  </Svg>
);

const LikeIcon = ({color = '#192546'}: {color?: string}) => (
  <Svg width={15} height={15} viewBox="0 0 16 15" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M1.05502 13.1086V6.58685C1.05502 6.25225 1.2968 6.10725 1.63045 6.10725H3.51674C3.86051 6.10725 4.12411 6.21462 4.12411 6.55491V13.1406C4.12411 13.3684 3.91633 13.5242 3.67661 13.5242H1.47058C1.27466 13.5242 1.05502 13.3047 1.05502 13.1086ZM9.46295 5.8835C9.46295 6.52566 10.2005 6.39504 10.486 6.39504C11.0082 6.39504 11.5303 6.39504 12.0526 6.39504C12.6704 6.39504 12.9762 6.36785 13.3959 6.58622C14.2939 7.05333 13.9979 7.78387 13.8979 8.36831L13.2591 11.7576C13.1611 12.2644 13.0426 12.8405 12.6693 13.2138C12.6029 13.2802 12.4549 13.3911 12.3733 13.4293C12.2725 13.4766 12.1078 13.5242 11.9566 13.5242H6.39402C5.89845 13.5242 5.48084 13.1301 5.32002 12.7759C5.11968 12.3356 5.17913 11.7135 5.17913 11.0946V7.45007C5.25993 7.4284 5.49744 7.21351 5.57113 7.13871C5.7019 7.0062 5.80784 6.93457 5.93846 6.80269C6.18482 6.55412 6.40983 6.331 6.65809 6.08385L7.64828 4.96384C7.703 4.90264 7.75328 4.83338 7.80483 4.76887C8.29075 4.15865 8.74062 3.56062 9.17531 2.9104C9.37471 2.61202 10.1317 1.37436 10.1982 1.08815C10.7854 1.10111 11.0295 1.6321 11.0295 2.20705C11.0295 2.96954 10.5773 4.05287 10.2049 4.64331L9.67753 5.42667C9.58265 5.55223 9.46295 5.68316 9.46295 5.8835ZM5.11525 6.13935C4.99317 5.61564 4.38786 5.08433 3.74049 5.08433H1.4067C0.99873 5.08433 0.595664 5.35077 0.391048 5.5712C0.145002 5.83638 0 6.21225 0 6.71478V12.9807C0 13.9135 0.665873 14.5792 1.59851 14.5792H3.54868C4.12696 14.5792 4.59106 14.3884 4.89134 13.9398C5.09564 14.0765 5.12774 14.2034 5.58489 14.3972C5.85939 14.5136 6.20727 14.5792 6.58583 14.5792H11.7967C13.9618 14.5792 14.1769 12.4975 14.4587 11.0389L14.7834 9.28576C14.828 9.03561 15.1 7.73137 15.0891 7.51664C15.0312 6.38034 14.1364 5.56409 13.0584 5.38904C12.595 5.31393 11.5314 5.37196 10.9976 5.37196L11.8492 3.50638C11.879 3.40565 11.9009 3.35822 11.9253 3.26271C11.9663 3.103 11.9952 2.93317 12.0256 2.75559C12.0852 2.40787 12.0931 1.98504 12.0188 1.63337C11.7877 0.540869 11.0584 0.112028 10.0004 0.00450195C9.5409 -0.0423036 9.4269 0.285177 9.31241 0.553835C8.83344 1.67701 7.36365 3.78294 6.4821 4.72491C6.41458 4.79717 6.38896 4.81536 6.32998 4.89252C6.1883 5.07816 5.24586 6.05175 5.11525 6.13935Z" fill={color} />
  </Svg>
);

// Filled thumbs-up shown once the current user has liked the post
const LikedIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 16 15" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M0.5 6.83845V14.3111C0.5 14.5357 0.751633 14.7872 0.976275 14.7872H3.50371C3.77841 14.7872 4.01654 14.6087 4.01654 14.3478V6.8019C4.01654 6.41189 3.71435 6.28906 3.32058 6.28906H1.15941C0.777087 6.28906 0.5 6.45511 0.5 6.83845Z" fill="#084D92" />
    <Path fillRule="evenodd" clipRule="evenodd" d="M5.08905 12.0026L5.08922 7.93055C5.08922 7.70351 5.59283 7.34972 5.79766 7.17326C5.86274 7.11722 5.92783 7.06102 5.99889 6.98944C6.24284 6.74328 6.46851 6.5188 6.70887 6.27981L6.8223 6.16689L7.95319 4.88789C7.9918 4.8445 8.03212 4.79256 8.07209 4.74097L8.12727 4.67025C8.40658 4.31953 8.6741 3.97411 8.93171 3.62647C9.19137 3.2761 9.44352 2.92026 9.69122 2.5499C9.82789 2.34542 10.1981 1.74717 10.487 1.2328C10.6694 0.907537 10.8168 0.621567 10.8436 0.506427L10.844 0.506598C10.8582 0.445611 10.9133 0.400683 10.9784 0.401879C11.337 0.409908 11.5994 0.565193 11.7777 0.80538C11.9751 1.07102 12.0641 1.43899 12.0641 1.81943C12.0641 2.22942 11.9554 2.71424 11.7957 3.1859C11.604 3.75255 11.3372 4.30399 11.098 4.68306L10.4958 5.57753C10.4933 5.5818 10.4905 5.58607 10.4875 5.59017L10.4506 5.63783C10.3636 5.75041 10.2693 5.87255 10.2693 6.03194C10.2693 6.43612 10.6229 6.49455 10.9246 6.49455C11.0117 6.49455 11.0852 6.49096 11.1503 6.48788C11.2123 6.48481 11.268 6.48208 11.3056 6.48208L13.3101 6.48191C13.9041 6.479 14.2427 6.47746 14.7024 6.71663C15.6913 7.231 15.536 7.98163 15.399 8.64359C15.3814 8.72833 15.3642 8.81135 15.3488 8.90189C15.0609 10.0415 14.8149 11.6048 14.6161 12.7878C14.5592 13.0825 14.4962 13.3976 14.3913 13.6986C14.2837 14.0075 14.1332 14.2971 13.9032 14.527C13.8607 14.5695 13.7894 14.628 13.7162 14.6814C13.6485 14.7306 13.5781 14.7757 13.5253 14.8005C13.4546 14.8336 13.3605 14.8666 13.2594 14.8897C13.1722 14.9095 13.0793 14.9225 12.9906 14.9225H6.61679C6.32723 14.9225 6.06005 14.8183 5.83643 14.6625C5.57523 14.4805 5.37195 14.2256 5.26261 13.9849C5.06411 13.5481 5.07419 12.9859 5.08478 12.3993C5.08683 12.2819 5.08905 12.1636 5.08905 12.0026Z" fill="#084D92" />
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

// ─── New Member Insights card ─────────────────────────────────────────────────
// NOTE: 'Expert Insights' card type has no backing data source on this site —
// no matching WP category or post type exists. Only Articles (Blog post,
// category id 37) and E-Book (Ebooks, category id 51) are wired to real data.
const InsightCard = ({item}: any) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.insightCard}>
      <Text style={styles.insightType}>{item.type}</Text>
      <View style={styles.insightAuthorRow}>
        <Image
          source={{
            uri:
              item.avatar ||
              `https://www.gravatar.com/avatar/${item.id}?s=30&d=identicon`,
          }}
          style={styles.insightAvatar}
        />
        <View style={{flex: 1}}>
          <View style={styles.insightNameRow}>
            <Text style={styles.insightName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.flag ? (
              <Text style={styles.insightFlag}>{` ${item.flag}`}</Text>
            ) : null}
          </View>
          <Text style={styles.insightRole} numberOfLines={1}>
            {item.role}
          </Text>
        </View>
      </View>
      <Text style={styles.insightTitle} numberOfLines={expanded ? undefined : 3}>
        {item.title}
      </Text>
      <TouchableOpacity onPress={() => setExpanded(v => !v)} activeOpacity={0.7}>
        <Text style={styles.insightReadMore}>
          {expanded ? 'Show less' : 'Read more'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Intro Post Card ──────────────────────────────────────────────────────────
const IntroCard = ({post, myAvatar, navigation}: any) => {
  const [textExpanded, setTextExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>(post.embeddedComments ?? []);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments ?? post.commentCount ?? 0);
  const [liked, setLiked] = useState(post.liked ?? false);
  const [likeCount, setLikeCount] = useState(post.likes ?? 0);
  const [liking, setLiking] = useState(false);

  const displayedContent = textExpanded ? post.fullContent : post.content;

  // Comments come embedded on the post already (getIntroductions pulls them
  // from /custom/v1/introductions in the same call) — this is only used to
  // refresh after posting a new comment, or as a fallback if the embedded
  // list was empty but the count says otherwise. Failures here are logged
  // but non-fatal: handleSubmit() already appends the just-posted comment
  // optimistically, so a slow/failed reload doesn't lose it from the screen.
  const loadComments = async () => {
    if (!post.activityId) return;
    setLoadingComments(true);
    try {
      const data = await getActivityComments(post.activityId);
      setComments(data);
      setCommentCount(data.length);
    } catch (err) {
      console.log('IntrosScreen loadComments failed:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCommentToggle = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0 && commentCount > 0) loadComments();
  };

  // postActivityComment now has a 15s timeout and throws with a real message
  // on failure (see feedApi.ts) instead of hanging forever with no error, or
  // silently "succeeding" on a non-2xx response. On success, the comment is
  // appended to the list immediately — it no longer depends on a second
  // network round-trip (loadComments) to actually appear, since that
  // round-trip can itself be slow or fail without losing what the user typed.
  const handleSubmit = async () => {
    if (!commentText.trim() || !post.activityId) return;
    const text = commentText.trim();
    setSubmitting(true);
    try {
      const result = await postActivityComment(post.activityId, text);
      setCommentText('');
      setComments((prev: any[]) => [
        ...prev,
        {
          id: result?.id ?? result?.comment_id ?? `local-${Date.now()}`,
          author: {
            name: result?.name || 'You',
            avatar: myAvatar || '',
          },
          content: text,
          time: 'Just now',
          likes: 0,
          liked: false,
        },
      ]);
      setCommentCount((c: number) => c + 1);
      setShowComments(true);
      // NOT calling loadComments() here on purpose. postActivityComment's
      // POST response already IS the authoritative created comment (real id,
      // real content, confirmed via a live device response 2026-08-18) — no
      // second round-trip is needed. Re-fetching immediately after posting
      // was actively harmful: GET /activity/{id}/comment doesn't reliably
      // reflect a comment that was JUST created (propagation lag on the
      // server side), so it was overwriting the comment we just appended
      // with a stale list that didn't have it yet — comment posts fine, then
      // silently vanishes a moment later with no error. The list will pick
      // up the confirmed state naturally next time this card's comments are
      // toggled closed/open or the screen is refreshed.
    } catch (err) {
      console.log('IntrosScreen handleSubmit failed:', err);
      Alert.alert(
        'Error',
        `Could not post comment.${err instanceof Error ? `\n\n${err.message}` : ''}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Likes persist through the linked BuddyBoss activity item, same endpoint
  // Feed uses. If no activity is linked (activityId is null) the like button
  // is disabled rather than faking a like that won't save.
  const handleLike = async () => {
    if (!post.activityId || liking) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c: number) => (wasLiked ? c - 1 : c + 1));
    setLiking(true);
    try {
      await toggleLike(post.activityId, wasLiked);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c: number) => (wasLiked ? c + 1 : c - 1));
    } finally {
      setLiking(false);
    }
  };

  const handleLikeComment = async (commentId: number, currentlyLiked: boolean) => {
    setComments((prev: any[]) =>
      prev.map(c =>
        c.id === commentId
          ? {...c, liked: !currentlyLiked, likes: currentlyLiked ? (c.likes || 0) - 1 : (c.likes || 0) + 1}
          : c,
      ),
    );
    try {
      await toggleLike(commentId, currentlyLiked);
    } catch {
      setComments((prev: any[]) =>
        prev.map(c =>
          c.id === commentId
            ? {...c, liked: currentlyLiked, likes: currentlyLiked ? (c.likes || 0) + 1 : (c.likes || 0) - 1}
            : c,
        ),
      );
    }
  };

  return (
    <View style={styles.introCard}>
      {/* Author */}
      <View style={styles.cardHeader}>
        <Image source={{uri: post.author.avatar}} style={styles.cardAvatar} />
        <View style={styles.cardAuthorInfo}>
          <View style={styles.nameWithFlag}>
            <Text style={styles.cardAuthorName}>{post.author.name}</Text>
            {post.author.flag ? (
              <Text style={styles.flagText}>{` ${post.author.flag}`}</Text>
            ) : null}
          </View>
          <Text style={styles.cardMeta}>
            {[post.author.title, post.time].filter(Boolean).join(', ')}
          </Text>
        </View>
      </View>

      {/* Content — Figma: Body/Body M, 14px 400, #192546, lineHeight 18 */}
      <Text style={styles.introContent}>{displayedContent}</Text>
      {post.truncated ? (
        <TouchableOpacity onPress={() => setTextExpanded(v => !v)} activeOpacity={0.7}>
          <Text style={styles.showMore}>{textExpanded ? 'Show less' : 'Show more'}</Text>
        </TouchableOpacity>
      ) : null}

      {/* Stats — same icons as Feed */}
      <View style={styles.introStats}>
        <View style={styles.statBtn}>
          <TouchableOpacity
            onPress={handleLike}
            disabled={!post.activityId}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 4}}>
            {liked ? <LikedIcon /> : <LikeIcon color="#192546" />}
          </TouchableOpacity>
          {likeCount > 0 && (
            <TouchableOpacity
              onPress={() =>
                navigation?.navigate('LikedBy', {
                  likedBy: post.likedBy,
                  likesCount: likeCount,
                  title: 'Liked by',
                  // Fallback fetch id for LikedByScreen — the intro post's
                  // linked BuddyBoss activity id. See same fix on FeedScreen.
                  postId: post.activityId,
                })
              }
              hitSlop={{top: 8, bottom: 8, left: 4, right: 8}}>
              <Text style={[styles.statText, liked && styles.statTextActive]}>
                {`${likeCount} Like${likeCount === 1 ? '' : 's'}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.statBtn}
          onPress={handleCommentToggle}
          disabled={!post.activityId}>
          <CommentIcon />
          <Text style={styles.statText}>{`${commentCount} Comment${commentCount > 1 ? 's' : ''}`}</Text>
        </TouchableOpacity>
      </View>

      {/* Comments list */}
      {showComments && (
        <View style={styles.commentsList}>
          {loadingComments ? (
            <ActivityIndicator color="#1A3A6B" style={{paddingVertical: 10}} />
          ) : comments.length === 0 ? (
            <Text style={styles.noComments}>{'No comments yet.'}</Text>
          ) : (
            comments.map(c => (
              <View key={c.id} style={styles.commentItem}>
                <Image source={{uri: c.author.avatar}} style={styles.commentAvatar} />
                <View style={styles.commentBubble}>
                  <Text style={styles.commentAuthorName}>{c.author.name}</Text>
                  <Text style={styles.commentContent}>{c.content}</Text>
                  <View style={styles.commentFooterRow}>
                    <Text style={styles.commentTimeSmall}>{c.time}</Text>
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
                            // Fallback fetch id for LikedByScreen when
                            // c.likedBy comes back empty even though c.likes
                            // is > 0 — same fix as FeedScreen's comment likes.
                            postId: typeof c.id === 'number' ? c.id : undefined,
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
          )}
        </View>
      )}

      {/* Inline comment input */}
      <View style={styles.commentInputRow}>
        <View style={styles.commentAvatarSmall}>
          {myAvatar ? (
            <Image source={{uri: myAvatar}} style={styles.commentAvatarImage} />
          ) : (
            <Text style={styles.commentAvatarText}>{'M'}</Text>
          )}
        </View>
        <View style={styles.commentBox}>
          <TextInput
            style={styles.inlineCommentInput}
            placeholder="Add a comment......"
            placeholderTextColor="#8F9098"
            value={commentText}
            onChangeText={setCommentText}
            onFocus={() => setShowComments(true)}
            editable={!!post.activityId}
          />
          <SmileyIcon />
        </View>
        <TouchableOpacity
          style={[styles.commentSubmitBtn, submitting && {opacity: 0.85}]}
          onPress={handleSubmit}
          disabled={!post.activityId || submitting}>
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.commentSubmitText}>{'Comment'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const PostSkeleton = () => (
  <View style={styles.introCard}>
    <View style={{flexDirection: 'row', gap: 10, marginBottom: 12}}>
      <View style={{width: 42, height: 42, borderRadius: 21, backgroundColor: '#EFEFEF'}} />
      <View style={{flex: 1, gap: 6}}>
        <View style={{height: 12, borderRadius: 6, backgroundColor: '#EFEFEF', width: '50%'}} />
        <View style={{height: 10, borderRadius: 5, backgroundColor: '#EFEFEF', width: '35%'}} />
      </View>
    </View>
    {[1, 2, 3, 4].map(i => (
      <View
        key={i}
        style={{
          height: 11,
          borderRadius: 5,
          backgroundColor: '#EFEFEF',
          marginBottom: 6,
          width: i === 4 ? '60%' : '100%',
        }}
      />
    ))}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const IntrosScreen = ({navigation}: any) => {
  const [posts, setPosts] = useState<IntroPost[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [myAvatar, setMyAvatar] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
    initUser();
  }, []);

  const initUser = async () => {
    const userId = await getUserIdFromToken();
    if (userId) {
      const profile = await getMemberProfile(userId);
      if (profile?.avatar_urls?.thumb) setMyAvatar(profile.avatar_urls.thumb);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadPosts(1, true), loadInsights()]);
  };

  // Real introduction CPT — not BuddyBoss activity.
  const loadPosts = async (pageNum = 1, reset = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const data = await getIntroductions(pageNum);
      if (reset) setPosts(data);
      else setPosts(prev => [...prev, ...data]);
      setHasMore(data.length === 15);
      setPage(pageNum);
    } catch {
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // New Member Insights — real published content per category.
  // 'Articles' -> category id 37 (Blog post). 'E-Book' -> category id 51
  // (Ebooks). 'Expert Insights' has no matching category/post type on this
  // site and is intentionally omitted rather than faked.
  const loadInsights = async () => {
    setLoadingInsights(true);
    try {
      const token = await getToken();
      const headers: any = token ? {Authorization: `Bearer ${token}`} : {};

      const fetchCategory = async (categoryId: number, label: string) => {
        const res = await fetch(
          `${BASE}/wp/v2/posts?categories=${categoryId}&per_page=3&orderby=date&order=desc&_embed=author`,
          {headers},
        );
        if (!res.ok) return [];
        const posts = await res.json();
        if (!Array.isArray(posts)) return [];

        return Promise.all(
          posts.map(async (p: any) => {
            const wpAuthor = p._embedded?.author?.[0];
            const username = wpAuthor?.slug || wpAuthor?.name || '';
            let name = wpAuthor?.name || 'IPM Member';
            let avatar =
              wpAuthor?.avatar_urls?.['96'] ||
              `https://www.gravatar.com/avatar/${p.id}?s=96&d=identicon`;
            let role = 'IPM Member';
            let flag = '';

            try {
              const member = await getMemberByUsername(username);
              if (member) {
                name = resolveFullName(member, name);
                avatar = member.avatar_urls?.thumb || avatar;
                const groups = member?.xprofile?.groups?.['1']?.fields;
                role = groups?.['1097']?.value?.raw || role;
                const country = groups?.['1099']?.value?.raw || '';
                flag = countryFlag(country);
              }
            } catch {}

            return {
              id: p.id,
              type: label,
              // resolveFullName() already decodes entities; the wpAuthor.name
              // fallback above and role/title below did not — WordPress post
              // titles and xprofile "job title" fields come back the same
              // HTML-entity-encoded way everything else in this app does
              // (e.g. "R&#038;D Lead"), so they need the same decode as the
              // post title below rather than being trusted as plain text.
              name: stripHtml(name),
              role: stripHtml(role),
              flag,
              avatar,
              // Previously: p.title?.rendered?.replace(/<[^>]*>/g, '') — that
              // strips HTML tags but leaves entities (&#038;, &#8217;, etc.)
              // undecoded, so any ampersand/apostrophe in a post title
              // rendered as literal entity text on this card. stripHtml()
              // (imported from feedApi.ts, already fixed/used elsewhere in
              // this file) strips tags AND decodes entities.
              title: stripHtml(p.title?.rendered || '') || 'Untitled',
            };
          }),
        );
      };

      const [articles, ebooks] = await Promise.all([
        fetchCategory(37, 'Articles'),
        fetchCategory(51, 'E-Book'),
      ]);

      setInsights([...articles, ...ebooks]);
    } catch {
    } finally {
      setLoadingInsights(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A3A6B']} />
        }
        onScroll={({nativeEvent}) => {
          const {layoutMeasurement, contentOffset, contentSize} = nativeEvent;
          if (
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 200 &&
            !loadingMore &&
            hasMore
          ) {
            loadPosts(page + 1);
          }
        }}
        scrollEventThrottle={400}>

        {/* Hero — Figma: Heading/H2, 18px 700, #192647, letterSpacing 0.09 */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            {'Introduce Yourself to Our Growing Community'}
          </Text>
          <View style={styles.heroUnderline} />
          <Text style={styles.heroSubtitle}>
            {"Welcome! Share a bit about yourself, we can't wait to learn more about you."}
          </Text>
        </View>

        {/* Posts, with New Member Insights re-inserted after every 3 posts so
            they don't get buried at the bottom once infinite scroll/Load More
            pulls in many pages of intros. */}
        {loading ? (
          <>
            <PostSkeleton />
            <PostSkeleton />
          </>
        ) : posts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{'👋'}</Text>
            <Text style={styles.emptyTitle}>{'No intros yet'}</Text>
            <Text style={styles.emptySubtitle}>
              {'Be the first to introduce yourself!'}
            </Text>
          </View>
        ) : (
          posts.map((post, index) => (
            <React.Fragment key={post.id}>
              <IntroCard post={post} myAvatar={myAvatar} navigation={navigation} />
              {(index + 1) % 3 === 0 && insights.length > 0 && (
                <View style={styles.insightsSection}>
                  <Text style={styles.insightsTitle}>{'New Member Insights'}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    decelerationRate="fast"
                    snapToInterval={INSIGHT_CARD_WIDTH + 16}
                    contentContainerStyle={styles.insightsScroll}>
                    {insights.map(item => (
                      <InsightCard key={`${item.type}-${item.id}-${index}`} item={item} />
                    ))}
                  </ScrollView>
                </View>
              )}
            </React.Fragment>
          ))
        )}

        {/* Fallback: if there aren't at least 3 posts yet, still surface
            Insights once rather than losing them entirely. Shown while
            insights are loading too, so the section doesn't pop in/out. */}
        {!loading && posts.length < 3 && (loadingInsights || insights.length > 0) && (
          <View style={styles.insightsSection}>
            <Text style={styles.insightsTitle}>{'New Member Insights'}</Text>
            {loadingInsights ? (
              <ActivityIndicator color="#1A3A6B" style={{paddingVertical: 20}} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={INSIGHT_CARD_WIDTH + 16}
                contentContainerStyle={styles.insightsScroll}>
                {insights.map(item => (
                  <InsightCard key={`${item.type}-${item.id}-fallback`} item={item} />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {!loading && hasMore && posts.length > 0 && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={() => loadPosts(page + 1)}
            disabled={loadingMore}>
            {loadingMore ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loadMoreText}>{'Load More'}</Text>
            )}
          </TouchableOpacity>
        )}

        <View style={{height: 60}} />
      </ScrollView>

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F2F4F7'},

  hero: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  heroTitle: {
    alignSelf: 'stretch',
    color: '#192647',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: 0.09,
    marginBottom: 10,
  },
  heroUnderline: {
    width: 85,
    height: 1,
    backgroundColor: '#46B1E4',
    marginBottom: 12,
  },
  heroSubtitle: {
    color: '#192647',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    textAlign: 'center',
    alignSelf: 'stretch',
  },

  introCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    marginHorizontal: 12,
    borderRadius: 8.201,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 10.023,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  cardAvatar: {width: 42, height: 42, borderRadius: 21},
  cardAuthorInfo: {flex: 1},
  nameWithFlag: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap'},
  flagText: {fontSize: 14},
  cardAuthorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#192546',
    fontFamily: 'Runda',
  },
  cardMeta: {fontSize: 12, color: '#8F9098', marginTop: 2, fontFamily: 'Runda'},

  introContent: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  showMore: {
    color: '#46B0E3',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 8,
  },

  introStats: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginBottom: 10,
    marginTop: 4,
  },
  statBtn: {flexDirection: 'row', alignItems: 'center', gap: 5},
  statText: {fontSize: 13, color: '#192546', fontWeight: '700', fontFamily: 'Runda'},
  statTextActive: {color: '#0C4D91', fontFamily: 'Runda', fontSize: 12, fontWeight: '500'},

  commentsList: {marginBottom: 10},
  noComments: {fontSize: 12, color: '#6B6C75', textAlign: 'center', paddingVertical: 8, fontFamily: 'Runda'},
  commentItem: {flexDirection: 'row', gap: 8, marginBottom: 8},
  commentAvatar: {width: 28, height: 28, borderRadius: 14},
  commentBubble: {flex: 1, backgroundColor: '#F5F5F5', borderRadius: 10, padding: 8},
  commentAuthorName: {fontSize: 12, fontWeight: '700', color: '#1A3A6B', marginBottom: 2, fontFamily: 'Runda'},
  commentContent: {fontSize: 12, color: '#333', lineHeight: 16, fontFamily: 'Runda'},
  commentFooterRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4},
  commentTimeSmall: {fontSize: 10, color: '#AAA', fontFamily: 'Runda'},
  commentLikeBtn: {padding: 2},
  commentLikeCount: {fontSize: 11, color: '#0C4D91', fontWeight: '600', fontFamily: 'Runda'},

  commentInputRow: {flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch'},
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

  insightsSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    paddingTop: 16,
    paddingBottom: 16,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    paddingHorizontal: 16,
    marginBottom: 12,
    fontFamily: 'Runda',
  },
  // Figma: horizontal scroll row, cards peek at the edge (not a vertical stack)
  insightsScroll: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
  },

  insightCard: {
    width: INSIGHT_CARD_WIDTH,
    display: 'flex',
    padding: 14,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    borderRadius: 5,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 10.023,
    elevation: 2,
  },
  insightType: {
    alignSelf: 'stretch',
    fontSize: 11,
    lineHeight: 14,
    color: '#8F9098',
    fontWeight: '400',
    fontFamily: 'Runda',
  },
  insightAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 8,
  },
  insightAvatar: {width: 32, height: 32, borderRadius: 16},
  insightNameRow: {flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'stretch', flexWrap: 'wrap'},
  insightFlag: {fontSize: 15},
  insightName: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 13,
    fontWeight: '700',
  },
  insightRole: {alignSelf: 'stretch', fontSize: 11, fontWeight: '500', color: '#8F9098', fontFamily: 'Runda'},
  insightTitle: {
    alignSelf: 'stretch',
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 13,
    fontWeight: '700',
  },
  insightReadMore: {
    alignSelf: 'flex-start',
    color: '#46B0E3',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '500',
  },

  emptyState: {alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32},
  emptyIcon: {fontSize: 48, marginBottom: 16},
  emptyTitle: {fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, fontFamily: 'Runda'},
  emptySubtitle: {fontSize: 14, color: '#888', textAlign: 'center', fontFamily: 'Runda'},

  loadMoreBtn: {
    backgroundColor: '#1A1A3E',
    marginHorizontal: 16,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  loadMoreText: {color: '#FFFFFF', fontSize: 15, fontWeight: '600', fontFamily: 'Runda'},
});

export default IntrosScreen;
