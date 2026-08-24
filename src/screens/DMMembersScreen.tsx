/* eslint-disable prettier/prettier */
import React from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, Image, StatusBar} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import {DMThreadDetail, DMRecipient} from '../api/dmApi';

const DMMembersScreen = ({route, navigation}: any) => {
  const {thread, currentUserId}: {thread: DMThreadDetail; currentUserId: number} =
    route.params;

  const members: DMRecipient[] = Object.values(thread.recipients).filter(
    r => !r.is_deleted,
  );

  // Add self — we know current_user from thread
  // Find self in recipients or add a placeholder
  const selfEntry = Object.values(thread.recipients).find(
    r => r.user_id === currentUserId,
  );

  const allMembers = selfEntry
    ? members
    : [...members]; // self already there from recipients

  const renderMember = ({item}: {item: DMRecipient}) => {
    const isMe = item.user_id === currentUserId;
    return (
      <View style={m.memberRow}>
        <Image
          source={{uri: item.avatar_urls?.thumb ?? ''}}
          style={m.avatar}
        />
        <View style={m.info}>
          <Text style={m.name}>
            {item.name}
            {isMe ? ' (You)' : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={m.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={m.header}>
        <BackButton style={m.backBtn} onPress={() => navigation.goBack()} />
        <Text style={m.headerTitle}>{'Members'}</Text>
      </View>

      <FlatList
        data={allMembers}
        keyExtractor={item => String(item.user_id)}
        renderItem={renderMember}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const m = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E9F1',
  },
  backBtn: {padding: 4},
  headerTitle: {
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    color: '#192546',
    letterSpacing: 0.09,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8E9F1',
  },
  info: {flex: 1},
  name: {
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '500',
    color: '#192546',
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  role: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '500',
    color: '#8F9098',
    marginTop: 2,
  },
});

export default DMMembersScreen;
