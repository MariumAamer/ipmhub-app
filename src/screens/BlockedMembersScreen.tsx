/* eslint-disable prettier/prettier */
/**
 * BlockedMembersScreen — Settings → Blocked Members, per Figma
 * ("Settings - Blocked Members"): list of blocked members with an Unblock
 * button each → "Unblock member" confirm sheet → "{name} unblocked." toast;
 * empty state when nobody is blocked.
 *
 * Data comes from useBlockedMembers (GET /custom/v1/blocked-members). Everything uses the Figma CSS except the 8px gap between rows (read off
 * the screenshot) and the description-to-list spacing.
 */
import React, {useState} from 'react';
import {View, Text, Image, ScrollView, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator, Alert} from 'react-native';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import BackButton from '../components/BackButton';
import SuccessToast from '../components/SuccessToast';
import {UnblockMemberSheet, BlockedGlyph} from '../components/MemberModeration';
import {useBlockedMembers, BlockedMember} from '../hooks/useMemberBlock';

const NAVY = '#192546';
const DARK_BLUE = '#0C4D91';
const DARK_GREY = '#7C86A1';

const BlockedMembersScreen = ({navigation}: any) => {
  const {members, loading, error, refresh, unblock} = useBlockedMembers();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [target, setTarget] = useState<BlockedMember | null>(null); // member in the confirm sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState('');

  const askUnblock = (m: BlockedMember) => {
    setTarget(m);
    setSheetOpen(true);
  };

  const confirmUnblock = async () => {
    if (!target) return;
    setSheetOpen(false);
    const err = await unblock(target.id);
    if (err) Alert.alert('Could not unblock member', err);
    else setToast(`${target.name} unblocked.`);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <BackButton navigation={navigation} style={s.back} />

        <Text style={s.title}>{'Blocked Members'}</Text>
        <Text style={s.intro}>
          {"Blocked members can't see your profile or posts, message you or mention you. They aren't notified when you block or unblock them."}
        </Text>

        {members.length === 0 && loading ? (
          <ActivityIndicator color={DARK_BLUE} style={s.loader} />
        ) : members.length === 0 && error ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>{"Couldn't load blocked members"}</Text>
            <Text style={s.emptyText}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={refresh} activeOpacity={0.7}>
              <Text style={s.unblockText}>{'Try again'}</Text>
            </TouchableOpacity>
          </View>
        ) : members.length > 0 ? (
          <View style={s.list}>
            {members.map(m => (
              <View key={m.id} style={s.row}>
                <Image
                  source={m.avatarUrl ? {uri: m.avatarUrl} : require('../assets/images/ipmfeedlogo.png')}
                  style={s.avatar}
                />
                <View style={s.info}>
                  <Text style={s.name} numberOfLines={1}>{m.name}</Text>
                  {m.title ? <Text style={s.sub} numberOfLines={1}>{m.title}</Text> : null}
                </View>
                {m.canUnblock && (
                  <TouchableOpacity style={s.unblockBtn} onPress={() => askUnblock(m)} activeOpacity={0.7}>
                    <Text style={s.unblockText}>{'Unblock'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={s.empty}>
            <View style={s.emptyCircle}>
              <BlockedGlyph />
            </View>
            <Text style={s.emptyTitle}>{'No blocked members'}</Text>
            <Text style={s.emptyText}>
              {"When you block someone, they'll appear here. You can block a member from the ••• menu on their profile or posts."}
            </Text>
          </View>
        )}
      </ScrollView>

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />

      <UnblockMemberSheet
        visible={sheetOpen}
        name={target?.name ?? ''}
        onClose={() => setSheetOpen(false)}
        onConfirm={confirmUnblock}
      />
      <SuccessToast
        visible={!!toast}
        variant="info"
        message={toast}
        onHide={() => setToast('')}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  content: {paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40},
  back: {alignSelf: 'flex-start'},
  // Figma Heading/H2: Runda 700, 18, letter-spacing 0.09, #192546
  title: {fontFamily: 'Runda-Bold', fontSize: 18, color: NAVY, letterSpacing: 0.09, marginTop: 24},
  // Figma Body/Body M: Runda 400, 14/18, #192546
  intro: {fontFamily: 'Runda-Normal', fontSize: 14, lineHeight: 18, color: NAVY, marginTop: 12},

  loader: {marginTop: 32},
  retryBtn: {
    marginTop: 12,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: DARK_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {marginTop: 12},
  // Figma row: height 64, padding 12/0, align center, gap 12. The 8px between
  // rows is read off the screenshot (rows sit ~72px apart) — no CSS for it.
  row: {height: 64, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  // Figma dp: 40x40, radius 40, lightgray fill
  avatar: {width: 40, height: 40, borderRadius: 40, backgroundColor: '#D3D3D3'},
  info: {flex: 1, marginLeft: 12, marginRight: 12},
  // Figma Heading/H5: Runda 500, 12, #192546
  name: {fontFamily: 'Runda-Medium', fontSize: 12, color: NAVY},
  // Figma Caption: Runda 400, 12/16, Dark Grey #7C86A1
  sub: {fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16, color: DARK_GREY},
  // Figma Unblock: height 36, padding 12/16, radius 50, 1px #0C4D91
  // Fixed height 36 + centred: vertical padding would leave only 12px for the
  // text and clip it on Android.
  unblockBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: DARK_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unblockText: {fontFamily: 'Runda-Medium', fontSize: 12, lineHeight: 16, color: DARK_BLUE},

  // Figma: padding 32/24, column, centred, gap 12
  empty: {alignSelf: 'stretch', alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24},
  emptyCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Figma Heading/H4: Runda 500, 14, #192546, centred
  emptyTitle: {fontFamily: 'Runda-Medium', fontSize: 14, color: NAVY, textAlign: 'center', marginTop: 12},
  // Figma Body/Body S: Runda 400, 12/16, Dark Grey #7C86A1, centred
  emptyText: {
    fontFamily: 'Runda-Normal',
    fontSize: 12,
    lineHeight: 16,
    color: DARK_GREY,
    textAlign: 'center',
    marginTop: 12,
  },
});

export default BlockedMembersScreen;
