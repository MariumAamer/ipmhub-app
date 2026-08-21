/* eslint-disable prettier/prettier */
import React, {useState, useEffect, useCallback, useRef} from 'react';
import LinearGradient from 'react-native-linear-gradient';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import {
  getTopic,
  getReplies,
  deleteTopic,
  reportForumItem,
  getCurrentUserId,
  ForumTopic,
  ForumReply,
} from '../api/forumsApi';
import {
  ReportIcon,
  ReplyIcon,
  LikeIcon,
  ConversationIcon,
  LatestConversationIcon,
  LinkedInIcon,
} from '../components/forumsIcons';
import BackButton from '../components/BackButton';
import ShareLinkedInModal from '../components/ShareLinkedInModal';

// NOTE: no "like a reply" endpoint exists yet in forumsApi.ts — the Like
// button below is visual only (local toggle, not persisted). Flagged as a
// backend gap, same pattern as other known-missing endpoints in this app.
const REPORT_REASONS = ['Spam', 'Harassment or hate speech', 'Misinformation', 'Other'];

const ForumTopicScreen = ({navigation, route}: any) => {
  const topicId = route?.params?.topicId;

  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [likedReplies, setLikedReplies] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<ScrollView>(null);
  const replyPositions = useRef<Record<number, number>>({});

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!topicId) return;
      isRefresh ? setRefreshing(true) : setLoading(true);
      const uid = currentUserId ?? (await getCurrentUserId());
      if (currentUserId == null) setCurrentUserId(uid);
      const [t, r] = await Promise.all([getTopic(topicId, uid), getReplies(topicId, uid)]);
      setTopic(t);
      setReplies(r);
      setLoading(false);
      setRefreshing(false);
    },
    [topicId, currentUserId],
  );

  useEffect(() => {
    loadData();
  }, [topicId]);

  const handleReport = async (reason: string) => {
    setReportVisible(false);
    if (!topicId) return;
    await reportForumItem(topicId, 'topic', [reason]);
    Alert.alert('Reported', 'Thanks — our team will review this discussion.');
  };

  const handleDeleteTopic = () => {
    Alert.alert('Delete Discussion', 'This cannot be undone. Delete this discussion?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const ok = await deleteTopic(topicId);
          if (ok) navigation?.goBack();
        },
      },
    ]);
  };

  const jumpToLatestReply = () => {
    if (replies.length === 0) return;
    const lastId = replies[replies.length - 1].id;
    const y = replyPositions.current[lastId];
    if (y != null) scrollRef.current?.scrollTo({y, animated: true});
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#0C4D91" />
        </View>
      </SafeAreaView>
    );
  }

  if (!topic) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <BackButton style={styles.backBtn} onPress={() => navigation?.goBack()} size={28} />
        </View>
        <View style={styles.loadingBox}>
          <Text style={styles.emptyText}>{"This discussion couldn't be found."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header: back + Report Forum ── */}
      <View style={styles.header}>
        <BackButton style={styles.backBtn} onPress={() => navigation?.goBack()} size={28} />
        <TouchableOpacity style={styles.reportBtn} onPress={() => setReportVisible(true)}>
          <ReportIcon size={21} />
          <Text style={styles.reportText}>{'Report Forum'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />
        }>
        {/* ── Discussion card ── */}
        <View style={styles.discussionCard}>
          <View style={styles.cardTopRow}>
            <Text style={styles.discussionTitle}>{topic.title}</Text>
            {topic.isOwn ? (
              <TouchableOpacity onPress={handleDeleteTopic} style={styles.moreBtn}>
                <Text style={styles.moreDots}>{'•••'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.authorRow}>
            <Image source={{uri: topic.author.avatar}} style={styles.avatar} />
            <View style={{flex: 1}}>
              <View style={styles.nameRow}>
                <Text style={styles.authorName}>{topic.author.name}</Text>
                {topic.author.flag ? (
                  <Text style={styles.flagText}>{topic.author.flag}</Text>
                ) : null}
              </View>
              <Text style={styles.meta}>
                {topic.author.title ? `${topic.author.title}, ${topic.time}` : topic.time}
              </Text>
            </View>
          </View>

          <Text style={styles.discussionContent}>{topic.fullContent || topic.content}</Text>

          {topic.tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {topic.tags.slice(0, 3).map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.replyBtn}
              onPress={() =>
                navigation?.navigate('ReplyToDiscussion', {
                  topicId: topic.id,
                  topicTitle: topic.title,
                  authorName: topic.author.name,
                })
              }>
              <ReplyIcon size={12} color="#FFFFFF" />
              <Text style={styles.replyBtnText}>{'Reply'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtnWrap} onPress={() => setShareModalVisible(true)}>
              <LinearGradient
                colors={['#E257E4', '#084D92']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                locations={[0, 0.7035]}
                style={styles.shareBtn}>
                <LinkedInIcon size={12} color="#FFFFFF" />
                <Text style={styles.shareBtnText}>{'Share on LinkedIn'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Replies count / jump-to-latest ── */}
        <View style={styles.dividerLine} />
        <View style={styles.repliesHeaderRow}>
          <Text style={styles.repliesCount}>
            {`${replies.length} ${replies.length === 1 ? 'Reply' : 'Replies'}`}
          </Text>
          {replies.length > 0 ? (
            <TouchableOpacity onPress={jumpToLatestReply}>
              <Text style={styles.jumpToLatest}>{'Jump to latest reply'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.dividerLine} />

        {/* ── Replies list ── */}
        <View style={styles.repliesList}>
          {replies.map(reply => (
            <View
              key={reply.id}
              style={styles.replyItem}
              onLayout={e => {
                replyPositions.current[reply.id] = e.nativeEvent.layout.y;
              }}>
              <View style={styles.authorRow}>
                <Image source={{uri: reply.author.avatar}} style={styles.avatarSmall} />
                <View style={{flex: 1}}>
                  <View style={styles.nameRow}>
                    <Text style={styles.authorName}>{reply.author.name}</Text>
                    {reply.author.flag ? (
                      <Text style={styles.flagText}>{reply.author.flag}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.meta}>
                    {reply.author.title ? `${reply.author.title}, ${reply.time}` : reply.time}
                  </Text>
                </View>
              </View>

              <Text style={styles.replyContent}>{reply.content}</Text>

              <View style={styles.replyActionsRow}>
                <TouchableOpacity
                  style={styles.likeBtn}
                  onPress={() =>
                    setLikedReplies(prev => ({...prev, [reply.id]: !prev[reply.id]}))
                  }>
                  <LikeIcon size={16} color={likedReplies[reply.id] ? '#0C4D91' : '#8F9098'} />
                  <Text style={styles.likeText}>{'Like'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.replyToCommentBtn}
                  onPress={() =>
                    navigation?.navigate('ReplyToDiscussion', {
                      topicId: topic.id,
                      topicTitle: topic.title,
                      authorName: reply.author.name,
                    })
                  }>
                  <ReplyIcon size={12} color="#192546" />
                  <Text style={styles.replyToCommentText}>{'Reply'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── Report sheet ── */}
      <Modal
        transparent
        animationType="slide"
        visible={reportVisible}
        onRequestClose={() => setReportVisible(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.reportSheet}>
            <Text style={styles.reportSheetTitle}>{'Report this discussion'}</Text>
            {REPORT_REASONS.map(reason => (
              <TouchableOpacity
                key={reason}
                style={styles.reportReasonRow}
                onPress={() => handleReport(reason)}>
                <Text style={styles.reportReasonText}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.reportCancelBtn}
              onPress={() => setReportVisible(false)}>
              <Text style={styles.reportCancelText}>{'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ShareLinkedInModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        context="singleDiscussion"
        topicId={topic.id}
        topicTitle={topic.title}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F6FA'},
  loadingBox: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyText: {color: '#8F9098', fontFamily: 'Runda', fontSize: 14},

  // Figma: header frame — padding 10 16, row, gap 10, self-stretch, #FFF bg.
  // Same Android status-bar overlap fix as AppHeader.tsx/AccountSettingsScreen —
  // the core `react-native` SafeAreaView this screen wraps is an iOS-only
  // no-op, so on Android this header rendered flush at y=0 and got clipped
  // by the status bar (clock/battery/wifi), which is what made the back
  // button look squashed/hidden behind the clock instead of sitting in its
  // own row like on iOS.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 10,
  },
  backBtn: {},
  reportBtn: {flexDirection: 'row', alignItems: 'center', gap: 10, height: 36},
  reportText: {color: '#192647', fontFamily: 'Runda', fontSize: 12, fontWeight: '500'},

  // Figma: discussion card frame — padding 16, radius 8.2, white, soft shadow
  discussionCard: {
    margin: 16,
    padding: 16,
    borderRadius: 8.2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTopRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  discussionTitle: {
    flex: 1,
    color: '#192647',
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.08,
    marginBottom: 12,
  },
  moreBtn: {padding: 4},
  moreDots: {fontSize: 14, color: '#AAAAAA', letterSpacing: 1},

  authorRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12},
  avatar: {width: 38, height: 38, borderRadius: 19},
  avatarSmall: {width: 38, height: 38, borderRadius: 19},
  nameRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  authorName: {color: '#192546', fontFamily: 'Runda', fontSize: 14, fontWeight: '500'},
  flagText: {fontSize: 13},
  meta: {color: '#8F9098', fontFamily: 'Runda', fontSize: 12, marginTop: 2},

  discussionContent: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    marginBottom: 12,
  },

  tagsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14},
  tag: {
    minWidth: 96,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 30,
    borderWidth: 0.5,
    borderColor: '#192647',
    alignItems: 'center',
  },
  tagText: {color: '#192647', fontFamily: 'Runda', fontSize: 11, fontWeight: '400'},

  actionsRow: {flexDirection: 'row', gap: 10},
  replyBtn: {
    flex: 1,
    height: 36,
    borderRadius: 100,
    backgroundColor: '#0C4D91',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  replyBtnText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 12, fontWeight: '500'},
  shareBtnWrap: {flex: 1},
  shareBtn: {
    height: 36,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareBtnText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 12, fontWeight: '500'},

  dividerLine: {height: 1, backgroundColor: '#E8E9F1', marginHorizontal: 16},
  repliesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  repliesCount: {color: '#192546', fontFamily: 'Runda', fontSize: 12, fontWeight: '700'},
  jumpToLatest: {color: '#8F9098', fontFamily: 'Runda', fontSize: 12, fontWeight: '500'},

  repliesList: {paddingHorizontal: 16, gap: 18, paddingBottom: 32},
  replyItem: {gap: 14, marginTop: 18},
  replyContent: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  replyActionsRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  likeBtn: {flexDirection: 'row', alignItems: 'center', gap: 6},
  likeText: {color: '#192546', fontFamily: 'Runda', fontSize: 12, fontWeight: '500'},
  replyToCommentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 30,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: '#192546',
  },
  replyToCommentText: {color: '#192546', fontFamily: 'Runda', fontSize: 10, fontWeight: '500'},

  // Report reason sheet
  sheetOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end'},
  reportSheet: {backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20},
  reportSheetTitle: {
    color: '#0C4D91',
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  reportReasonRow: {paddingVertical: 12},
  reportReasonText: {color: '#192546', fontFamily: 'Runda', fontSize: 14, fontWeight: '500'},
  reportCancelBtn: {paddingVertical: 12, alignItems: 'center'},
  reportCancelText: {color: '#8F9098', fontFamily: 'Runda', fontSize: 14, fontWeight: '500'},
});

export default ForumTopicScreen;
