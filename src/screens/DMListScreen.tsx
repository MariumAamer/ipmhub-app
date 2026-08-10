/* eslint-disable prettier/prettier */
import React, {useState, useEffect, useCallback} from 'react';
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
  RefreshControl,
} from 'react-native';
import Svg, {Path, Circle, Rect, G, Mask, Defs} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import {getUserIdFromToken} from '../api/profileApi';
import {
  getThreadList,
  getFullName,
  getOtherRecipient,
  formatThreadDate,
  stripHtml,
  DMThread,
} from '../api/dmApi';

// ─── Icons ────────────────────────────────────────────────────────────────────

const SearchIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7 1a6 6 0 100 12A6 6 0 007 1zM0 7a7 7 0 1112.45 4.388l3.08 3.08a.75.75 0 11-1.06 1.062l-3.08-3.08A7 7 0 010 7z"
      fill="#192546"
    />
  </Svg>
);

const ComposeIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Mask id="mask0" maskUnits="userSpaceOnUse" x="0" y="1" width="23" height="23">
      <Path fillRule="evenodd" clipRule="evenodd" d="M4 5.25C3.58579 5.25 3.25 5.58579 3.25 6V20C3.25 20.4142 3.58579 20.75 4 20.75H18C18.4142 20.75 18.75 20.4142 18.75 20V13C18.75 12.3096 19.3096 11.75 20 11.75C20.6904 11.75 21.25 12.3096 21.25 13V20C21.25 21.7949 19.7949 23.25 18 23.25H4C2.20507 23.25 0.75 21.7949 0.75 20V6C0.75 4.20507 2.20507 2.75 4 2.75H11C11.6904 2.75 12.25 3.30964 12.25 4C12.25 4.69036 11.6904 5.25 11 5.25H4Z" fill="#006FFD" />
      <Path d="M13.0947 14.3008L20.2425 7.15297L16.8474 3.75789L9.6996 10.9057C9.6012 11.0042 9.5313 11.1276 9.49732 11.2626L8.70508 15.2953L12.737 14.5031C12.8724 14.4692 12.9962 14.3992 13.0947 14.3008ZM22.55 4.84548C22.8384 4.557 23.0004 4.1658 23.0004 3.75789C23.0004 3.34998 22.8384 2.95877 22.55 2.67029L21.3301 1.4504C21.0416 1.16201 20.6504 1 20.2425 1C19.8346 1 19.4434 1.16201 19.1549 1.4504L17.935 2.67029L21.3301 6.06537L22.55 4.84548Z" fill="#006FFD" />
    </Mask>
    <G mask="url(#mask0)">
      <Rect width="24" height="24" fill="#192546" />
    </G>
  </Svg>
);

const BlueDot = () => (
  <Svg width={7} height={7} viewBox="0 0 7 7" fill="none">
    <Mask id="bd" maskUnits="userSpaceOnUse" x="0" y="0" width="7" height="7">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.25 6.229A2.979 2.979 0 103.25.27a2.979 2.979 0 000 5.959z"
        fill="#006FFD"
      />
    </Mask>
    <G mask="url(#bd)">
      <Rect width="6.5" height="6.5" fill="#0C4D91" />
    </G>
  </Svg>
);

// ─── Thread Row ───────────────────────────────────────────────────────────────

const ThreadRow = ({
  thread,
  currentUserId,
  onPress,
}: {
  thread: DMThread;
  currentUserId: number;
  onPress: () => void;
}) => {
  const other = getOtherRecipient(thread, currentUserId);
  const avatarUrl = other?.user_avatars?.thumb ?? thread.avatar?.[0]?.thumb;
  const name = other?.name ?? 'Unknown';
  const preview = thread.excerpt?.rendered
    ? stripHtml(thread.excerpt.rendered)
    : '';
  const dateLabel = formatThreadDate(thread.date);
  const hasUnread = thread.unread_count > 0;

  return (
    <TouchableOpacity style={s.threadRow} onPress={onPress} activeOpacity={0.75}>
      {/* Avatar */}
      <View style={s.avatarWrap}>
        {avatarUrl ? (
          <Image source={{uri: avatarUrl}} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.avatarFallback]}>
            <Text style={s.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={s.threadContent}>
        <View style={s.threadTopRow}>
          <Text style={s.threadName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={s.threadDate}>{dateLabel}</Text>
        </View>
        <View style={s.threadBottomRow}>
          <Text style={s.threadPreview} numberOfLines={2}>
            {preview}
          </Text>
          {hasUnread && (
            <View style={s.unreadDot}>
              <BlueDot />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── DMListScreen ─────────────────────────────────────────────────────────────

const DMListScreen = ({navigation}: any) => {
  const [threads, setThreads] = useState<DMThread[]>([]);
  const [filtered, setFiltered] = useState<DMThread[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    initUser();
    loadThreads();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(threads);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        threads.filter(t => {
          const other = getOtherRecipient(t, currentUserId);
          return other?.name?.toLowerCase().includes(q);
        }),
      );
    }
  }, [search, threads, currentUserId]);

  const initUser = async () => {
    const id = await getUserIdFromToken();
    if (id) setCurrentUserId(id);
  };

  const loadThreads = async () => {
    try {
      const data = await getThreadList();
      // Enrich each thread recipient with full name
      const enriched = await Promise.all(
        data.map(async thread => {
          const other = getOtherRecipient(thread, currentUserId);
          if (!other) return thread;
          const fullName = await getFullName(other.user_id);
          if (!fullName) return thread;
          return {
            ...thread,
            recipients: {
              ...thread.recipients,
              [other.user_id]: {...other, name: fullName},
            },
          };
        }),
      );
      setThreads(enriched);
      setFiltered(enriched);
    } catch (e) {
      console.log('DM list error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadThreads();
  }, []);

  const handleThreadPress = (thread: DMThread) => {
    const other = getOtherRecipient(thread, currentUserId);
    navigation.navigate('DMConversation', {
      threadId: thread.id,
      recipientName: other?.name ?? 'Message',
      recipientAvatar: other?.user_avatars?.thumb ?? '',
      recipientUserId: other?.user_id ?? 0,
      currentUserId,
    });
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      {/* Search bar */}
      <View style={s.searchRow}>
        <View style={s.searchBar}>
          <SearchIcon />
          <TextInput
            style={s.searchInput}
            placeholder="Search Messages..."
            placeholderTextColor="#8F9098"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          style={s.composeBtn}
          onPress={() => navigation.navigate('DMNewMessage', {currentUserId})}>
          <ComposeIcon />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#192546" style={{marginTop: 40}} />
      ) : filtered.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyText}>
            {search ? 'No conversations found' : 'No messages yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={({item}) => (
            <ThreadRow
              thread={item}
              currentUserId={currentUserId}
              onPress={() => handleThreadPress(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#192546']}
              tintColor="#192546"
            />
          }
          ItemSeparatorComponent={() => <View />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ProfileDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigation={navigation}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FE',
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    color: '#192546',
    padding: 0,
  },
  composeBtn: {padding: 4},

  threadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatarWrap: {position: 'relative'},
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8E9F1',
  },
  avatarFallback: {
    backgroundColor: '#192546',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {color: '#FFF', fontSize: 16, fontWeight: '700'},

  threadContent: {flex: 1},
  threadTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  threadName: {
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '700',
    color: '#192546',
    lineHeight: 20,
    letterSpacing: 0.08,
    flex: 1,
    marginRight: 8,
  },
  threadDate: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    color: '#8F9098',
    lineHeight: 18,
  },
  threadBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  threadPreview: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    color: '#192546',
    lineHeight: 18,
    flex: 1,
    marginRight: 8,
  },
  unreadDot: {marginTop: 4},

  separator: {height: 1, backgroundColor: '#E8E9F1', marginLeft: 68},

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    color: '#8F9098',
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default DMListScreen;
