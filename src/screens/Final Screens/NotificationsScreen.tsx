/* eslint-disable prettier/prettier */
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar, Image, Modal, Alert, Linking} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
// Drives the side drawer opened by AppHeader's chevron — this screen was
// passing `onDrawerOpen={() => {}}` (an explicit no-op) and never rendered
// ProfileDrawer at all, so the chevron (>>) tap did nothing here (reported:
// "the >> in app header doesn't work on store and notification").
import ProfileDrawer from '../components/ProfileDrawer';
import {
  getNotifications,
  markNotificationRead,
  bulkMarkRead,
  bulkDeleteNotifications,
  AppNotification,
  NotificationFilter,
} from '../api/notificationsApi';

const NAVY = '#192547';
const DARK_BLUE = '#0C4D91';
const GREY = '#8F9098';
const PINK = '#C257DE';
const ACTIVITY_GREY = '#7C86A1';
const BULK_BG = '#EEF7FC';
const BORDER = '#E8E9F1';

// ─── Checkbox (16×16, exact Figma box + navy-filled checked state) ───────────
const CheckIcon = ({size = 13, color = '#FFFFFF'}: {size?: number; color?: string}) => (
  // react-native-svg@15.3.0 doesn't render <mask> — Figma's export used one
  // purely to fill this tick solid, so it's drawn as a direct-fill path.
  <Svg width={size} height={size} viewBox="0 0 13 13" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.7334 2.49268C13.0928 2.85911 13.0875 3.44791 12.7216 3.80779L4.98032 11.4225L0.277903 6.79694C-0.0879641 6.43706 -0.0932604 5.84827 0.266074 5.48184C0.625408 5.11541 1.2133 5.11011 1.57917 5.46999L4.98032 8.81553L11.4203 2.48084C11.7862 2.12095 12.3741 2.12626 12.7334 2.49268Z"
      fill={color}
    />
  </Svg>
);

const Checkbox = ({checked, onToggle}: {checked: boolean; onToggle: () => void}) => (
  <TouchableOpacity
    onPress={onToggle}
    style={[cbStyles.box, checked && cbStyles.boxChecked]}
    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
    activeOpacity={0.8}>
    {checked && <CheckIcon size={10} />}
  </TouchableOpacity>
);

const cbStyles = StyleSheet.create({
  box: {
    width: 16,
    height: 16,
    borderRadius: 1.5,
    borderWidth: 1,
    borderColor: GREY,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  boxChecked: {backgroundColor: DARK_BLUE, borderColor: DARK_BLUE},
});

// ─── Bulk-bar action icons ────────────────────────────────────────────────────
const TrashIcon = ({size = 13, color = GREY}: {size?: number; color?: string}) => (
  <Svg width={size} height={size} viewBox="0 0 13 13" fill="none">
    <Path
      d="M5.28 1.3H7.72C7.9 1.3 8.05 1.45 8.05 1.63V1.95H4.95V1.63C4.95 1.45 5.1 1.3 5.28 1.3ZM3.9 1.95V1.63C3.9 0.958 4.458 0.4 5.13 0.4H7.87C8.542 0.4 9.1 0.958 9.1 1.63V1.95H11.05C11.2 1.95 11.325 2.075 11.325 2.225C11.325 2.375 11.2 2.5 11.05 2.5H10.685L10.198 10.19C10.148 10.955 9.512 11.55 8.745 11.55H4.255C3.488 11.55 2.852 10.955 2.802 10.19L2.315 2.5H1.95C1.8 2.5 1.675 2.375 1.675 2.225C1.675 2.075 1.8 1.95 1.95 1.95H3.9Z"
      fill={color}
    />
  </Svg>
);

const ChevronDownIcon = ({size = 13, color = GREY}: {size?: number; color?: string}) => (
  <Svg width={size} height={size} viewBox="0 0 13 13" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.4905 2.95293C12.1733 2.62682 11.6588 2.62682 11.3415 2.95293L6.49959 7.92957L1.65764 2.95293C1.34035 2.62682 0.825924 2.62682 0.508636 2.95293C0.191346 3.27905 0.191346 3.80778 0.508636 4.1339L6.49959 10.2915L12.4905 4.1339C12.8078 3.80778 12.8078 3.27905 12.4905 2.95293Z"
      fill={color}
    />
  </Svg>
);

const CloseXIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path
      d="M1 1L13 13M13 1L1 13"
      stroke={GREY}
      strokeWidth={1.4}
      strokeLinecap="round"
    />
  </Svg>
);

// Selected-option checkmark in the Sort by date sheet — rebuilt as a
// direct-fill path (react-native-svg@15.3.0 doesn't render <mask>). The
// Figma export fills the mask rect white, which would be invisible on the
// sheet's white background, so this uses Dark Blue instead for visibility.
const SelectedCheckIcon = ({color = DARK_BLUE}: {color?: string}) => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.7541 2.30086C12.0858 2.63911 12.0809 3.18261 11.7432 3.51481L4.5973 10.5437L0.25653 6.27403C-0.0811989 5.94183 -0.0860879 5.39832 0.24561 5.06008C0.577309 4.72184 1.11999 4.71694 1.45772 5.04915L4.5973 8.13734L10.542 2.28993C10.8797 1.95773 11.4224 1.96262 11.7541 2.30086Z"
      fill={color}
    />
  </Svg>
);

// ─── Type badges (Forums = pink, Activity = grey) ─────────────────────────────
const ForumsMsgGlyph = () => (
  <Svg width={8.5} height={8.5} viewBox="0 0 9 9" fill="none">
    <Path
      d="M4.24902 0.601074C6.20496 0.60125 7.79004 2.18709 7.79004 4.14307C7.78986 6.0989 6.20485 7.68391 4.24902 7.68408C3.70187 7.68499 3.16164 7.55888 2.67188 7.31494C2.59559 7.2768 2.48159 7.2733 2.30469 7.31689C2.21549 7.33975 2.12699 7.3657 2.04004 7.396L2.00879 7.40771C1.92857 7.43458 1.84107 7.46308 1.75977 7.48486C1.2421 7.62322 0.767967 7.14937 0.90625 6.63135C0.928013 6.55048 0.957538 6.46309 0.984375 6.3833L0.995117 6.35205C1.02548 6.26495 1.05231 6.17578 1.0752 6.08643C1.11823 5.9101 1.1147 5.79643 1.07715 5.72021C0.840381 5.24483 0.707083 4.70885 0.707031 4.14307C0.707031 2.18698 2.29293 0.601074 4.24902 0.601074Z"
      fill="#FFFFFF"
    />
  </Svg>
);

const ActivityGlyph = () => (
  <Svg width={8.867} height={8.867} viewBox="0 0 9 9" fill="none">
    <Path
      d="M7.25391 1.20947C7.92153 1.20964 8.46289 1.7508 8.46289 2.41846V5.64209C8.46289 6.30975 7.92153 6.85188 7.25391 6.85205H5.76855C5.66181 6.85205 5.55895 6.89384 5.4834 6.96924L4.71777 7.73486C4.56039 7.89219 4.30484 7.89219 4.14746 7.73486L3.38184 6.96924C3.30629 6.89373 3.20349 6.85209 3.09668 6.85205H1.61133C0.943566 6.85205 0.402344 6.30985 0.402344 5.64209V2.41846C0.402344 1.75069 0.943566 1.20947 1.61133 1.20947H7.25391ZM4.88477 2.36182C4.82582 2.36705 4.76849 2.38392 4.71777 2.41357L4.66699 2.44873L4.62207 2.4917C4.59472 2.52215 4.57256 2.55696 4.55566 2.59424L4.53418 2.65186L4.5293 2.67334L4.08105 5.06396L3.83008 4.38525L3.82715 4.37842C3.79686 4.30344 3.74459 4.23839 3.67773 4.19287L3.62598 4.1626C3.5718 4.13651 3.5118 4.12301 3.45117 4.12256H2.41699C2.27307 4.12271 2.15638 4.23938 2.15625 4.3833C2.15625 4.52734 2.27299 4.6439 2.41699 4.64404H3.36914L3.74414 5.66064L3.74609 5.66357C3.77471 5.73787 3.82481 5.80293 3.88965 5.84912C3.95446 5.89509 4.03191 5.92065 4.11133 5.92334C4.11743 5.92354 4.12378 5.92357 4.12988 5.92334C4.21488 5.91992 4.29725 5.88981 4.36426 5.8374C4.43118 5.78498 4.48015 5.71297 4.50391 5.63135C4.50622 5.62337 4.50822 5.61509 4.50977 5.60693L4.96387 3.18701L5.43848 4.3999C5.44248 4.41013 5.44785 4.42053 5.45312 4.43018C5.48817 4.49411 5.54005 4.54789 5.60254 4.58545C5.66503 4.62289 5.73673 4.64316 5.80957 4.64404H6.44727C6.59139 4.64404 6.70801 4.52743 6.70801 4.3833C6.70787 4.23929 6.59131 4.12256 6.44727 4.12256H5.89062L5.2959 2.60303L5.28613 2.58252C5.24967 2.50921 5.1918 2.44827 5.12012 2.40869L5.06348 2.3833C5.00939 2.36359 4.95134 2.35628 4.89355 2.36084H4.88379L4.88477 2.36182Z"
      fill="#FFFFFF"
    />
  </Svg>
);

// Only Forums (pink) and Activity (grey) are confirmed against Figma. Any
// other component_name (mentions, follows, DMs, etc.) falls back to the
// Activity badge with a best-guess label — flag for a real design once more
// notification types are covered in Figma.
const getTypeInfo = (
  componentName: string,
  componentAction: string,
): {label: string; isForums: boolean} => {
  const cn = (componentName || '').toLowerCase();
  const ca = (componentAction || '').toLowerCase();
  if (cn.includes('forum')) return {label: 'Forums', isForums: true};
  if (cn.startsWith('cp_')) return {label: 'Community', isForums: false};
  if (ca.includes('mention')) return {label: 'Mentions', isForums: false};
  if (ca.includes('follow')) return {label: 'Activity', isForums: false};
  return {label: 'Activity', isForums: false};
};

// ─── Notification Row ─────────────────────────────────────────────────────────
const NotificationRow = ({
  item,
  selected,
  onToggleSelect,
  onPress,
}: {
  item: AppNotification;
  selected: boolean;
  onToggleSelect: () => void;
  onPress: () => void;
}) => {
  const initial = (item.content || '?').trim().charAt(0).toUpperCase();
  const {label, isForums} = getTypeInfo(item.componentName, item.componentAction);
  return (
    <TouchableOpacity
      style={s.row}
      onPress={onPress}
      activeOpacity={0.75}>
      <Checkbox checked={selected} onToggle={onToggleSelect} />

      {/* Avatar with the Forums/Activity type badge overlaid on its
          bottom-right corner, matching the Figma — this replaces the
          earlier inline icon-next-to-label treatment. */}
      <View style={s.avatarWrap}>
        {item.avatarUrl ? (
          <Image source={{uri: item.avatarUrl}} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.avatarFallback]}>
            <Text style={s.avatarInitial}>{initial}</Text>
          </View>
        )}
        <View style={[s.typeBadgeCorner, {backgroundColor: isForums ? PINK : ACTIVITY_GREY}]}>
          {isForums ? <ForumsMsgGlyph /> : <ActivityGlyph />}
        </View>
      </View>

      <View style={s.rowContent}>
        <Text style={s.rowText} numberOfLines={3}>
          {item.content || 'You have a new notification'}
        </Text>
        <Text style={s.typeLabel}>{label}</Text>
      </View>
      <Text style={s.rowTime}>{item.dateLabel}</Text>
    </TouchableOpacity>
  );
};

// ─── Sort by date modal ────────────────────────────────────────────────────────
type SortOrder = 'newest' | 'oldest';

const SortByDateModal = ({
  visible,
  current,
  onClose,
  onSelect,
}: {
  visible: boolean;
  current: SortOrder;
  onClose: () => void;
  onSelect: (order: SortOrder) => void;
}) => (
  <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
    <TouchableOpacity style={s.sortOverlay} activeOpacity={1} onPress={onClose}>
      <View style={s.sortSheet} onStartShouldSetResponder={() => true}>
        {/* Figma header padding (18/24/16.5/147.5, justify-content: flex-end)
            is the export of a centered-title frame with a close icon pinned
            to the right — same pattern already used for the LinkedIn share
            sheet header (ShareLinkedInModal.tsx), reproduced here instead of
            hardcoding the asymmetric numbers. */}
        <View style={s.sortHeader}>
          <Text style={s.sortTitle}>Sort by date</Text>
          <TouchableOpacity
            onPress={onClose}
            style={s.sortCloseBtn}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <CloseXIcon />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.sortOption} onPress={() => onSelect('oldest')} activeOpacity={0.7}>
          <Text style={s.sortOptionText}>Oldest First</Text>
          {current === 'oldest' && <SelectedCheckIcon />}
        </TouchableOpacity>
        <TouchableOpacity style={s.sortOption} onPress={() => onSelect('newest')} activeOpacity={0.7}>
          <Text style={s.sortOptionText}>Newest First</Text>
          {current === 'newest' && <SelectedCheckIcon />}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const NotificationsScreen = ({navigation}: any) => {
  const [tab, setTab] = useState<NotificationFilter>('unread');
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  // Drives the ProfileDrawer opened by AppHeader's chevron below.
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    pageRef.current = 1;
    setSelectedIds(new Set());
    setLoading(true);
    loadNotifications(1, tab, true);
  }, [tab]);

  const loadNotifications = async (
    page: number,
    filter: NotificationFilter,
    replace: boolean,
  ) => {
    try {
      const {items: fetched, hasMore: more} = await getNotifications(filter, page, 20);
      setItems(prev => sortItems(replace ? fetched : [...prev, ...fetched], sortOrder));
      setHasMore(more);
    } catch (e) {
      console.log('[Notifications] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Client-side only — there's no confirmed orderby/order query param on
  // GET /buddyboss/v1/notifications yet, so this sorts whatever page(s)
  // are currently loaded rather than re-querying the server. Worth
  // revisiting with Robby if a real sort param gets added.
  const sortItems = (list: AppNotification[], order: SortOrder): AppNotification[] => {
    const sorted = [...list].sort((a, b) => {
      const ta = new Date(a.date).getTime() || 0;
      const tb = new Date(b.date).getTime() || 0;
      return order === 'newest' ? tb - ta : ta - tb;
    });
    return sorted;
  };

  const handleSortSelect = (order: SortOrder) => {
    setSortOrder(order);
    setItems(prev => sortItems(prev, order));
    setSortModalVisible(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    pageRef.current = 1;
    loadNotifications(1, tab, true);
  }, [tab, sortOrder]);

  const onEndReached = () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    const next = pageRef.current + 1;
    pageRef.current = next;
    loadNotifications(next, tab, false);
  };

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = items.length > 0 && selectedIds.size === items.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(items.map(i => i.id)));
  };

  // ── Tap a notification to open it ───────────────────────────────────────────
  const handleRowPress = (item: AppNotification) => {
    if (item.isNew) {
      setItems(prev => prev.map(n => (n.id === item.id ? {...n, isNew: false} : n)));
      markNotificationRead(item.id).catch(() => {});
    }

    const isForums = (item.componentName || '').toLowerCase().includes('forum');
    if (isForums && item.componentAction === 'new_forum_topic' && item.itemId) {
      navigation.navigate('ForumTopic', {topicId: item.itemId});
      return;
    }
    if (item.linkUrl) {
      Linking.openURL(item.linkUrl).catch(() => {});
    }
  };

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const handleBulkMarkRead = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('Nothing selected', 'Select one or more notifications first.');
      return;
    }
    const ids = Array.from(selectedIds);
    setItems(prev => prev.map(n => (ids.includes(n.id) ? {...n, isNew: false} : n)));
    setSelectedIds(new Set());
    await bulkMarkRead(ids, false);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) {
      Alert.alert('Nothing selected', 'Select one or more notifications first.');
      return;
    }
    const ids = Array.from(selectedIds);
    Alert.alert(
      'Delete notifications',
      `Delete ${ids.length} notification${ids.length > 1 ? 's' : ''}? This can’t be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const prevItems = items;
            setItems(prev => prev.filter(n => !ids.includes(n.id)));
            setSelectedIds(new Set());
            const ok = await bulkDeleteNotifications(ids, false);
            if (!ok) setItems(prevItems);
          },
        },
      ],
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      <View style={s.titleWrap}>
        <Text style={s.pageTitle}>Notifications</Text>
      </View>

      {/* Unread / Read pill toggle */}
      <View style={s.pillRow}>
        <TouchableOpacity
          style={[s.pill, tab === 'unread' ? s.pillActive : s.pillInactive]}
          onPress={() => setTab('unread')}
          activeOpacity={0.85}>
          <Text style={[s.pillText, tab === 'unread' ? s.pillTextActive : s.pillTextInactive]}>
            Unread
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.pill, tab === 'read' ? s.pillActive : s.pillInactive]}
          onPress={() => setTab('read')}
          activeOpacity={0.85}>
          <Text style={[s.pillText, tab === 'read' ? s.pillTextActive : s.pillTextInactive]}>
            Read
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bulk action bar */}
      <View style={s.bulkBar}>
        <Checkbox checked={allSelected} onToggle={toggleSelectAll} />
        <View style={{flex: 1}} />
        <TouchableOpacity style={s.bulkAction} onPress={handleBulkMarkRead} activeOpacity={0.7}>
          <Text style={s.bulkActionText}>Mark Read</Text>
          <CheckIcon size={13} color={GREY} />
        </TouchableOpacity>
        <TouchableOpacity style={s.bulkAction} onPress={handleBulkDelete} activeOpacity={0.7}>
          <Text style={s.bulkActionText}>Delete</Text>
          <TrashIcon size={13} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.bulkAction}
          onPress={() => setSortModalVisible(true)}
          activeOpacity={0.7}>
          <Text style={s.bulkActionText}>Sort by date</Text>
          <ChevronDownIcon size={13} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={NAVY} style={{marginTop: 40}} />
      ) : items.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>
            {tab === 'unread' ? 'No unread notifications' : 'No read notifications'}
          </Text>
          <Text style={s.emptySubtitle}>
            {tab === 'unread' ? "You're all caught up." : 'Notifications you’ve read will show up here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          renderItem={({item}) => (
            <NotificationRow
              item={item}
              selected={selectedIds.has(item.id)}
              onToggleSelect={() => toggleSelect(item.id)}
              onPress={() => handleRowPress(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[NAVY]}
              tintColor={NAVY}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={NAVY} style={{marginVertical: 16}} /> : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <SortByDateModal
        visible={sortModalVisible}
        current={sortOrder}
        onClose={() => setSortModalVisible(false)}
        onSelect={handleSortSelect}
      />

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},

  titleWrap: {paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12},
  pageTitle: {
    color: NAVY,
    fontFamily: 'Runda-Bold',
    fontSize: 18,
    letterSpacing: 0.09,
  },

  pillRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  pill: {
    height: 36,
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  pillActive: {backgroundColor: DARK_BLUE},
  pillInactive: {backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: DARK_BLUE, marginLeft: 10},
  pillText: {fontFamily: 'Runda-Medium', fontSize: 14},
  pillTextActive: {color: '#FFFFFF'},
  pillTextInactive: {color: DARK_BLUE},

  bulkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: BULK_BG,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  bulkAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  bulkActionText: {
    color: NAVY,
    fontFamily: 'Runda-Medium',
    fontSize: 12,
    marginLeft: 4,
    marginRight: 4,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  avatarWrap: {
    width: 37,
    height: 38,
    marginLeft: 8,
    marginRight: 8,
    position: 'relative',
  },
  avatar: {
    width: 37,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8E9F1',
  },
  avatarFallback: {alignItems: 'center', justifyContent: 'center', backgroundColor: DARK_BLUE},
  avatarInitial: {color: '#FFFFFF', fontFamily: 'Runda-Bold', fontSize: 14},
  typeBadgeCorner: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  rowContent: {flex: 1, marginRight: 8},
  rowText: {
    color: NAVY,
    fontFamily: 'Runda-Medium',
    fontSize: 12,
    marginBottom: 6,
  },
  rowTime: {
    color: GREY,
    textAlign: 'right',
    fontFamily: 'Runda-Normal',
    fontSize: 10,
    lineHeight: 14,
  },

  typeLabel: {color: GREY, fontFamily: 'Runda-Medium', fontSize: 12},

  emptyState: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 40},
  emptyTitle: {color: NAVY, fontFamily: 'Runda-Bold', fontSize: 15, marginBottom: 8},
  emptySubtitle: {color: GREY, fontFamily: 'Runda-Normal', fontSize: 13, textAlign: 'center', lineHeight: 18},

  // ── Sort by date bottom sheet ──
  sortOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end'},
  sortSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  sortHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sortTitle: {
    color: DARK_BLUE,
    textAlign: 'center',
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  sortCloseBtn: {position: 'absolute', right: 24, padding: 2},
  sortOption: {
    height: 41,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortOptionText: {color: NAVY, fontFamily: 'Runda-Medium', fontSize: 14},
});

export default NotificationsScreen;
