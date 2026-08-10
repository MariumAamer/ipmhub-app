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
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Svg, {Path, Rect} from 'react-native-svg';
import {
  getMembersBatch,
  toggleFollow,
  LikedByUser,
} from '../api/feedApi';
import {getUserIdFromToken} from '../api/profileApi';
import {getThreadList} from '../api/dmApi';

const BackIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
    <Rect x={0.7} y={0.7} width={26.6} height={26.5996} rx={6.3} stroke="#8F9098" strokeWidth={1.4} />
    <Path
      d="M10.4494 12.8438C9.8504 13.4423 9.8504 14.4151 10.4494 15.0136L15.2973 19.8623L16 19.1596L11.1521 14.3104C10.9423 14.0997 10.9423 13.7577 11.1521 13.547L15.9973 8.70277L15.2941 8.00006L10.4494 12.8438Z"
      fill="#8F9098"
      stroke="#8F9098"
      strokeWidth={0.7}
    />
  </Svg>
);

interface Row extends LikedByUser {
  following: boolean;
  loading: boolean;
}

export default function LikedByScreen({navigation, route}: any) {
  const likedBy: LikedByUser[] = route?.params?.likedBy || [];
  const title: string = route?.params?.title || 'Liked by';
  const likesCount: number = route?.params?.likesCount ?? likedBy.length;
  const [rows, setRows] = useState<Row[]>(
    likedBy.map(u => ({...u, following: false, loading: false})),
  );
  const [resolvingFollow, setResolvingFollow] = useState(true);
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
    try {
      const members = await getMembersBatch(likedBy.map(u => u.id));
      setRows(prev =>
        prev.map(r => {
          const m = members.get(Number(r.id));
          // Confirmed 2026-07-31: is_following is the real one-way follow
          // field — friendship_status is the separate bidirectional
          // Connections feature and was giving false "not following" results.
          return {
            ...r,
            following: m?.is_following ?? false,
          };
        }),
      );
    } catch {
      // Batch lookup failing shouldn't block the list — just falls back to
      // showing "Follow" for everyone rather than an error state.
    } finally {
      setResolvingFollow(false);
    }
  };

  const handleMessagePress = async (item: Row) => {
    let threadId: number | null = null;
    try {
      const threads = await getThreadList(1);
      // Match on "is this person a participant", coercing both sides to
      // Number — WP REST isn't always consistent about returning IDs as
      // numbers vs strings, and a strict === would silently miss an
      // existing thread if either side came back as a string.
      const existing = threads.find(t =>
        Object.values(t.recipients || {}).some(
          (r: any) => Number(r.user_id) === Number(item.id),
        ),
      );
      threadId = existing?.id ?? null;
    } catch {
      // Lookup failing shouldn't block messaging — falls through to
      // starting a fresh conversation instead.
    }
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
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation?.goBack()}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <BackIcon />
        </TouchableOpacity>
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
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {likesCount > 0
                ? "This post has likes, but who liked it isn't available for this post type yet."
                : 'No likes yet.'}
            </Text>
          </View>
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
