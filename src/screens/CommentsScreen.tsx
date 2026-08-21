/* eslint-disable prettier/prettier */
// src/screens/CommentsScreen.tsx
//
// Opens from "Post a Comment" on StepContentScreen. DESIGN ONLY per
// explicit instruction ("for now design and once backend is fixed we will
// make it work") — there is NO confirmed API for comments anywhere in
// this project yet: no endpoint to fetch a step's comment thread, post a
// new comment, or reply. This screen is fully wired for local
// interaction (typing + posting appends to local state, so it's testable
// for QA) but NOTHING PERSISTS — reloading the screen loses everything.
// Existing-comments list starts genuinely empty (no fake sample users
// invented) rather than showing placeholder people, per project rule.

import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import BackButton from '../components/BackButton';

interface LocalComment {
  id: string;
  name: string;
  avatar?: string;
  timestamp: string;
  text: string;
}

const CommentCard = ({comment}: {comment: LocalComment}) => (
  <View style={styles.commentCard}>
    <View style={styles.commentHeaderRow}>
      {comment.avatar ? (
        <Image source={{uri: comment.avatar}} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, {backgroundColor: '#E8E9F1'}]} />
      )}
      <View>
        <Text style={styles.commentName}>{comment.name}</Text>
        <Text style={styles.commentTime}>{comment.timestamp}</Text>
      </View>
    </View>
    <Text style={styles.commentText}>{comment.text}</Text>
    <TouchableOpacity>
      <Text style={styles.replyText}>{'Reply'}</Text>
    </TouchableOpacity>
  </View>
);

const CommentsScreen = ({route, navigation}: any) => {
  // Local-only — nothing here is fetched from or sent to a backend. No
  // confirmed comments endpoint exists yet.
  const [comments, setComments] = useState<LocalComment[]>([]);
  const [draft, setDraft] = useState('');

  const handlePost = () => {
    if (!draft.trim()) return;
    const newComment: LocalComment = {
      id: `local-${Date.now()}`,
      name: 'You', // no logged-in user's display name is wired in here yet
      timestamp: 'Just now',
      text: draft.trim(),
    };
    setComments((prev) => [...prev, newComment]);
    setDraft('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.headerRow}>
        <BackButton onPress={() => navigation?.goBack?.()} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {comments.length === 0 ? (
          <Text style={styles.emptyText}>{'No comments yet. Be the first to leave one.'}</Text>
        ) : (
          comments.map((c) => <CommentCard key={c.id} comment={c} />)
        )}

        <View style={styles.leaveCommentCard}>
          <Text style={styles.leaveCommentHeading}>{'Leave a Comment'}</Text>
          <Text style={styles.commentLabel}>{'Comment*'}</Text>
          <TextInput
            style={styles.commentInput}
            multiline
            textAlignVertical="top"
            value={draft}
            onChangeText={setDraft}
            placeholder=""
            placeholderTextColor="#8F9098"
          />
          <TouchableOpacity style={styles.postBtn} onPress={handlePost} activeOpacity={0.85}>
            <Text style={styles.postBtnText}>{'Post Comment'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  headerRow: {paddingHorizontal: 16, paddingVertical: 12},
  scrollContent: {paddingHorizontal: 16, paddingBottom: 24, gap: 16},
  emptyText: {color: '#8F9098', fontFamily: 'Runda-Normal', fontSize: 13, textAlign: 'center', marginTop: 24},

  commentCard: {
    width: 358,
    alignSelf: 'center',
    padding: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#8F9098',
    backgroundColor: '#EEF7FC',
  },
  commentHeaderRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  avatar: {width: 38, height: 38, borderRadius: 100},
  commentName: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 14},
  commentTime: {color: '#8F9098', fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16},
  commentText: {color: '#192546', fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16},
  replyText: {color: '#46B0E3', fontFamily: 'Runda-Medium', fontSize: 12},

  leaveCommentCard: {
    width: 358,
    alignSelf: 'center',
    padding: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 16,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#8F9098',
    backgroundColor: '#EEF7FC',
    // NOTE: spec also lists a drop shadow (0 0 10.023px -1.822px
    // rgba(0,0,0,0.15)) matching the pattern used on every other card in
    // this app — applied below via elevation/shadow* props.
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
  },
  leaveCommentHeading: {color: '#192546', fontFamily: 'Runda-Medium', fontSize: 16, lineHeight: 20, letterSpacing: 0.08},
  commentLabel: {color: '#192546', fontFamily: 'Runda-Normal', fontSize: 14, lineHeight: 18},
  commentInput: {
    height: 145,
    alignSelf: 'stretch',
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    padding: 12,
    color: '#192546',
    fontFamily: 'Runda-Normal',
    fontSize: 13,
  },
  postBtn: {
    height: 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
    borderRadius: 50,
    backgroundColor: '#0C4D91',
  },
  postBtnText: {color: '#FFFFFF', fontFamily: 'Runda-Medium', fontSize: 14},
});

export default CommentsScreen;

/* ─────────────────────────────────────────────────────────────────────────
   STILL OPEN:

   1. NO CONFIRMED BACKEND — nothing here persists. Posting a comment only
      updates local component state; reloading the screen loses it.
      Needs: an endpoint to fetch a step's comment thread, an endpoint to
      post a new comment, and (per the earlier screenshot showing
      "Reply" under each comment) likely an endpoint to reply to a
      specific comment. The "Reply" button currently has no handler.

   3──────────────────── */
