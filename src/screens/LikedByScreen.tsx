/* eslint-disable prettier/prettier */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
// Was importing SafeAreaView from 'react-native' — that core component is
// iOS-only (a no-op on Android), which is why the back button/title sat
// under the status bar clock/battery icons on Android but looked fine on
// iOS. Swapped to the real cross-platform SafeAreaView.
import {SafeAreaView} from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import {
  getMembersBatch,
  toggleFollow,
  getActivityLikers,
  LikedByUser,
} from '../api/feedApi';
import {getUserIdFromToken} from '../api/profileApi';
import {getThreadList} from '../api/dmApi';

interface Row extends LikedByUser {
  following: boolean;
  loading: boolean;
}

export default function LikedByScreen({navigation, route}: any) {
  const initialLikedBy: LikedByUser[] = route?.params?.likedBy || [];
  const title: string = route?.params?.title || 'Liked by';
  const likesCount: number = route?.params?.likesCount ?? initialLikedBy.length;
  // The activity/comment id this like list belongs to — needed as a
  // fallback fetch below when the list endpoint didn't embed liked_by.
  const postId: number | null = route?.params?.postId ?? null;

  const [rows, setRows] = useState<Row[]>(
    initialLikedBy.map(u => ({...u, following: false, loading: false})),
  );
  const [resolvingFollow, setResolvingFollow] = useState(true);
  const [loadingLikers, setLoadingLikers] = useState(
    initialLikedBy.length === 0 && likesCount > 0 && !!postId,
  );
  const [myUserId, setMyUserId] = useState<number | null>(null);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const init = async () => {
    try {
      const uid = await getUserIdFromToken();
      setMyUserId(uid);
    } catch {}

    // The feed/comments LIST endpoints don't reliably embed liked_by (only
    // the single-activity endpoint does) — that's the bug behind "the like
    // count shows but who liked it doesn't." If we weren't handed a
    // populated list but there ARE likes and we know the post id, fetch the
    // real likers for this specific post/comment before anything else.
    let likedBy = initialLikedBy;
    if (likedBy.length === 0 && likesCount > 0 && postId) {
      try {
        likedBy = await getActivityLikers(postId);
        setRows(likedBy.map(u => ({...u, following: false, loading: false})));
      } catch {
        // Fall back to the empty-state message rather than blocking the screen.
      } finally {
        setLoadingLikers(false);
      }
    } else {
      setLoadingLikers(false);
    }

    if (likedBy.length === 0) {
      setResolvingFollow(false);
      return;
    }

    try {
      const members = await getMembersBatch(likedBy.map(u => u.id));
      setRows(prev =>
        prev.map(r => {
          const m = members.get(Number(r.id));
          return {
            ...r,
            following: m?.is_following ?? false,
          };
        }),
      );
    } catch {
    } finally {
      setResolvingFollow(false);
    }
  };

  const handleMessagePress = async (item: Row) => {
    let threadId: number | null = null;
    try {
      const threads = await getThreadList(1);
      const existing = threads.find(t =>
        Object.values(t.recipients || {}).some(
          (r: any) => Number(r.user_id) === Number(item.id),
        ),
      );
      threadId = existing?.id ?? null;
    } catch {}
    navigation?.navigate('DMConversation', {
      threadId,
      recipientName: item.name,
      recipientAvatar: item.avatar,
      recipientUserId: item.id,
      currentUserId: myUserId,
    });
  };

  const handleToggleFollow = async (userId: number, currentlyFollowing: boolean) => {
    setRows(prev =>
      prev.map(r => (r.id === userId ? {...r, loading: true} : r)),
    );
    try {
      await toggleFollow(userId, currentlyFollowing);
      setRows(prev =>
        prev.map(r =>
          r.id === userId ? {...r, following: !currentlyFollowing, loading: false} : r,
        ),
      );
    } catch (err: any) {
      setRows(prev =>
        prev.map(r => (r.id === userId ? {...r, loading: false} : r)),
      );
      Alert.alert(
        'Could not update',
        currentlyFollowing
          ? "Couldn't unfollow this person right now. Please try again."
          : "Couldn't follow this person right now. Please try again.",
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <BackButton style={styles.backBtn} onPress={() => navigation?.goBack()} />
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={rows}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({item}) => (
          <View style={styles.row}>
            <Image source={{uri: item.avatar}} style={styles.avatar} />
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              {item.title ? (
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              ) : null}
            </View>
            {Number(item.id) !== Number(myUserId) && (
              <TouchableOpacity
                style={[styles.actionBtn, item.following ? styles.messageBtn : styles.followBtn]}
                onPress={() =>
                  item.following
                    ? handleMessagePress(item)
                    : handleToggleFollow(item.id, item.following)
                }
                disabled={item.loading}>
                {item.loading ? (
                  <ActivityIndicator
                    size="small"
                    color={item.following ? '#0C4D91' : '#FFFFFF'}
                  />
                ) : (
                  <Text style={item.following ? styles.messageText : styles.followText}>
                    {item.following ? 'Message' : 'Follow'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          loadingLikers ? (
            <ActivityIndicator size="small" color="#0C4D91" style={{marginTop: 24}} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {likesCount > 0
                  ? "This post has likes, but who liked it isn't available for this post type yet."
                  : 'No likes yet.'}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0C4D91',
    fontFamily: 'Runda',
  },
  listContent: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  avatar: {width: 48, height: 48, borderRadius: 24},
  info: {flex: 1},
  name: {fontSize: 15, fontWeight: '700', color: '#192546', fontFamily: 'Runda'},
  title: {fontSize: 12, color: '#8F9098', marginTop: 2, fontFamily: 'Runda'},
  actionBtn: {
    minWidth: 92,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  followBtn: {backgroundColor: '#0C4D91'},
  followText: {color: '#FFFFFF', fontSize: 13, fontWeight: '700', fontFamily: 'Runda'},
  messageBtn: {backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#0C4D91'},
  messageText: {color: '#0C4D91', fontSize: 13, fontWeight: '700', fontFamily: 'Runda'},
  emptyState: {alignItems: 'center', paddingTop: 60},
  emptyText: {fontSize: 14, color: '#8F9098', fontFamily: 'Runda'},
});
