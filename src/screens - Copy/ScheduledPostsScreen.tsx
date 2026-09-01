/* eslint-disable prettier/prettier */
import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, StatusBar, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Image} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import * as Keychain from 'react-native-keychain';

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';

// ─── No Scheduled Posts SVG — exact from Figma ───────────────────────────────
const NoPostsIcon = () => (
  <Svg width={51} height={50} viewBox="0 0 51 50" fill="none">
    <Path
      d="M5.26758 4.57295C5.8099 4.03062 6.69001 4.03077 7.23242 4.57295L46.1211 43.4626C46.6634 44.005 46.6635 44.8841 46.1211 45.4265C45.5787 45.9687 44.6996 45.9688 44.1572 45.4265L42.2197 43.489C40.6722 44.5295 38.8106 45.1394 36.8057 45.1394H13.8896C8.52036 45.1392 4.16703 40.786 4.16699 35.4167V15.278C4.16703 12.5632 5.28076 10.109 7.0752 8.34541L5.26758 6.5378C4.72543 5.99542 4.72536 5.11529 5.26758 4.57295ZM36.8057 5.55537C42.1751 5.55537 46.5283 9.90863 46.5283 15.278V35.4167C46.5283 37.0594 46.1187 38.6058 45.3994 39.9626L34.2266 28.7897H38.0215C38.8842 28.7897 39.5837 28.09 39.584 27.2272C39.5839 26.3644 38.8844 25.6648 38.0215 25.6647H34.6875L31.126 16.57L31.0713 16.447C30.8529 16.0058 30.5044 15.6417 30.0732 15.404C29.6589 15.1758 29.1865 15.0763 28.7158 15.114L28.7148 15.112C28.7052 15.1127 28.6952 15.1151 28.6855 15.1159C28.6766 15.1167 28.6672 15.116 28.6582 15.1169L28.6592 15.1188C28.2467 15.1565 27.851 15.2979 27.5117 15.5329L27.3643 15.6442L27.2246 15.7673C26.9568 16.0222 26.7515 16.3359 26.625 16.6833L26.5684 16.8591L26.5381 16.9909L25.8877 20.4509L11.334 5.89619C12.1483 5.67493 13.0053 5.5554 13.8896 5.55537H36.8057ZM13.8896 25.6647C13.0269 25.6649 12.3272 26.3645 12.3271 27.2272C12.3274 28.0899 13.027 28.7896 13.8896 28.7897H19.5918L21.8389 34.8728C21.8413 34.8794 21.8441 34.8866 21.8467 34.8933C22.0182 35.3385 22.3172 35.7241 22.7061 36.0007C23.0949 36.2772 23.5573 36.433 24.0342 36.4489C24.0721 36.4502 24.1105 36.4495 24.1484 36.448C24.6573 36.4275 25.1477 36.248 25.5488 35.9343C25.9501 35.6203 26.2425 35.1872 26.3848 34.698C26.3989 34.6494 26.4106 34.6001 26.4199 34.5505L27.5049 28.7741L24.8271 26.0974L23.8516 31.2995L22.3516 27.2409L22.3359 27.1999C22.1549 26.7492 21.8438 26.362 21.4424 26.0886C21.0407 25.8152 20.566 25.6679 20.0801 25.6647H13.8896ZM31.4795 26.0427L28.5654 23.1276L29.1406 20.0681L31.4795 26.0427Z"
      fill="#8F9098"
    />
  </Svg>
);

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

const stripHtml = (html: string) =>
  (html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

const formatScheduledDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString('en-IE', {year: 'numeric', month: 'short', day: 'numeric'}) +
    ' at ' +
    d.toLocaleTimeString('en-IE', {hour: '2-digit', minute: '2-digit', hour12: true})
  );
};

// ─── Scheduled Post Card ──────────────────────────────────────────────────────
const ScheduledCard = ({post, onDelete, onEdit, deleting}: any) => (
  <View style={s.card}>
    <View style={s.cardHeader}>
      <View style={s.scheduleBadge}>
        <Svg width={13} height={13} viewBox="0 0 13 13" fill="none">
          <Path d="M6.5 0C10.0899 0 13 2.91015 13 6.5C13 10.0899 10.0899 13 6.5 13C2.91015 13 0 10.0899 0 6.5C0 2.91015 2.91015 0 6.5 0ZM6.41992 2.96875C6.02109 2.9688 5.69727 3.29257 5.69727 3.69141V6.74121C5.69752 7.40574 6.2368 7.94426 6.90137 7.94434H9.14844C9.54711 7.94427 9.86988 7.62129 9.87012 7.22266C9.87012 6.82382 9.54725 6.50007 9.14844 6.5H7.14258V3.69141C7.14258 3.29253 6.81879 2.96875 6.41992 2.96875Z" fill="#0C4D91" />
        </Svg>
        <Text style={s.scheduledLabel}>{'Scheduled'}</Text>
      </View>
      <TouchableOpacity
        style={s.deleteBtn}
        onPress={() => onDelete(post.id)}
        disabled={deleting === post.id}>
        {deleting === post.id ? (
          <ActivityIndicator size="small" color="#DC2626" />
        ) : (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#DC2626" />
          </Svg>
        )}
      </TouchableOpacity>
    </View>

    <Text style={s.scheduledTime}>{formatScheduledDate(post.date)}</Text>
    <Text style={s.cardContent} numberOfLines={3}>{post.content}</Text>

    {post.image ? <Image source={{uri: post.image}} style={s.cardImage} /> : null}

    <TouchableOpacity style={s.editBtn} onPress={() => onEdit(post)}>
      <Text style={s.editBtnText}>{'Edit'}</Text>
    </TouchableOpacity>
  </View>
);

// ─── Empty State — Figma exact icon ──────────────────────────────────────────
const EmptyState = ({onCreate}: {onCreate: () => void}) => (
  <View style={s.emptyWrap}>
    <NoPostsIcon />
    <Text style={s.emptyTitle}>{'No Scheduled Posts Found'}</Text>
    <Text style={s.emptySubtitle}>
      {'You do not have any posts scheduled at the moment.'}
    </Text>
    <TouchableOpacity style={s.createBtn} onPress={onCreate}>
      <Text style={s.createBtnText}>{'Create a Post'}</Text>
    </TouchableOpacity>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ScheduledPostsScreen = ({navigation}: any) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    loadScheduledPosts();
  }, []);

  // ── Fetch scheduled posts ───────────────────────────────────────────────────
  // BuddyBoss: GET /buddyboss/v1/activity?status=scheduled
  // Fallback:  GET /wp/v2/posts?status=future (WordPress scheduled posts)
  const loadScheduledPosts = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const headers = {Authorization: `Bearer ${token}`};

      const res = await fetch(
        `${BASE}/buddyboss/v1/activity?status=scheduled&per_page=20`,
        {headers},
      );

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setPosts(
            data.map((item: any) => ({
              id: item.id,
              content:
                item.content_stripped ||
                stripHtml(
                  typeof item.content === 'string'
                    ? item.content
                    : item.content?.rendered || '',
                ),
              date: item.scheduled_date || item.date,
              image: item.media?.[0]?.full || null,
            })),
          );
          return;
        }
      }

      // Fallback: WordPress future-status posts
      const wpRes = await fetch(
        `${BASE}/wp/v2/posts?status=future&per_page=20`,
        {headers},
      );
      if (wpRes.ok) {
        const wpData = await wpRes.json();
        if (Array.isArray(wpData)) {
          setPosts(
            wpData.map((p: any) => ({
              id: p.id,
              content: stripHtml(p.content?.rendered || p.excerpt?.rendered || ''),
              date: p.date,
              image: p.featured_media_src_url || null,
            })),
          );
        } else {
          setPosts([]);
        }
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.log('Scheduled posts error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadScheduledPosts();
  }, []);

  // ── Delete scheduled post ───────────────────────────────────────────────────
  const handleDelete = (postId: number) => {
    Alert.alert(
      'Delete Scheduled Post',
      'Are you sure you want to delete this scheduled post?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete', style: 'destructive', onPress: () => deletePost(postId)},
      ],
    );
  };

  const deletePost = async (postId: number) => {
    setDeleting(postId);
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${BASE}/buddyboss/v1/activity/${postId}`, {
        method: 'DELETE',
        headers: {Authorization: `Bearer ${token}`},
      });

      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
      } else {
        const wpRes = await fetch(`${BASE}/wp/v2/posts/${postId}`, {
          method: 'DELETE',
          headers: {Authorization: `Bearer ${token}`},
        });
        if (wpRes.ok) {
          setPosts(prev => prev.filter(p => p.id !== postId));
        } else {
          Alert.alert('Error', 'Could not delete the post. Try again.');
        }
      }
    } catch {
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = (post: any) => {
    navigation.navigate('CreatePost', {
      editMode: true,
      postId: post.id,
      initialContent: post.content,
    });
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={s.header}>
        <View style={{width: 36}} />
        <Text style={s.headerTitle}>{'Scheduled posts'}</Text>
        <TouchableOpacity style={s.headerClose} onPress={() => navigation.goBack()}>
          <Text style={s.headerCloseText}>{'✕'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#0C4D91" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={posts.length === 0 ? s.emptyContainer : s.listContent}
          ListEmptyComponent={
            <EmptyState onCreate={() => navigation.navigate('CreatePost')} />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0C4D91']}
              tintColor="#0C4D91"
            />
          }
          renderItem={({item}) => (
            <ScheduledCard
              post={item}
              onDelete={handleDelete}
              onEdit={handleEdit}
              deleting={deleting}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F2F4F7'},

  // Header — close button style ported from original
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {fontSize: 17, fontWeight: '700', color: '#192546', fontFamily: 'Runda'},
  headerClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCloseText: {fontSize: 16, color: '#333'},

  loadingWrap: {flex: 1, alignItems: 'center', justifyContent: 'center'},

  listContent: {padding: 16, gap: 12},
  emptyContainer: {flex: 1},

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8.201,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 10.023,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scheduleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF3FB',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scheduledLabel: {fontSize: 12, color: '#0C4D91', fontWeight: '600', fontFamily: 'Runda'},
  deleteBtn: {padding: 4},
  scheduledTime: {fontSize: 13, color: '#8F9098', marginBottom: 8, fontFamily: 'Runda'},
  cardContent: {fontSize: 14, color: '#192546', lineHeight: 20, fontFamily: 'Runda', marginBottom: 10},
  cardImage: {width: '100%', height: 160, borderRadius: 8, marginBottom: 10, resizeMode: 'cover'},
  editBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#0C4D91',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  editBtnText: {fontSize: 13, color: '#0C4D91', fontWeight: '600', fontFamily: 'Runda'},

  // Empty state — Figma exact icon, no emoji
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#192546',
    textAlign: 'center',
    fontFamily: 'Runda',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8F9098',
    textAlign: 'center',
    lineHeight: 21,
    fontFamily: 'Runda',
  },
  createBtn: {
    backgroundColor: '#0C4D91',
    borderRadius: 50,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 8,
  },
  createBtnText: {color: '#FFF', fontSize: 15, fontWeight: '700', fontFamily: 'Runda'},
});

export default ScheduledPostsScreen;
