/* eslint-disable prettier/prettier */
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {launchImageLibrary} from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import {postReply, updateReply, uploadForumMedia} from '../api/forumsApi';
import {CameraIcon, VideoIcon, AttachmentIcon} from '../components/forumsIcons';

const GRADIENT = ['#E257E4', '#084D92'];

const ReplyToDiscussionScreen = ({navigation, route}: any) => {
  const {topicId, topicTitle, authorName, editReplyId, editContent} = route?.params || {};
  const isEditing = !!editReplyId;

  const [message, setMessage] = useState(editContent || '');
  const [submitting, setSubmitting] = useState(false);

  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState<{uri: string; name: string} | null>(null);
  const [document, setDocument] = useState<{uri: string; name: string; type: string} | null>(
    null,
  );

  const handlePickImages = () => {
    launchImageLibrary({mediaType: 'photo', selectionLimit: 4, quality: 0.8}, res => {
      if (res.assets) {
        const uris = res.assets.map(a => a.uri).filter(Boolean) as string[];
        setImages(prev => [...prev, ...uris].slice(0, 4));
      }
    });
  };

  const handlePickVideo = () => {
    launchImageLibrary({mediaType: 'video', selectionLimit: 1}, res => {
      const asset = res.assets?.[0];
      if (asset?.uri) {
        setVideo({uri: asset.uri, name: asset.fileName || 'video.mp4'});
      }
    });
  };

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.pick({type: [DocumentPicker.types.allFiles]});
      const file = res[0];
      if (file) {
        setDocument({uri: file.uri, name: file.name || 'document', type: file.type || 'application/octet-stream'});
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Error', 'Could not select that file.');
      }
    }
  };

  const canSubmit = message.trim().length > 0 && !submitting;

  const handlePublish = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const mediaIds = (
        await Promise.all(images.map(uri => uploadForumMedia(uri, 'photo.jpg', 'image/jpeg')))
      ).filter((id): id is number => id != null);
      const videoIds = video
        ? [await uploadForumMedia(video.uri, video.name, 'video/mp4')].filter(
            (id): id is number => id != null,
          )
        : [];
      const documentIds = document
        ? [await uploadForumMedia(document.uri, document.name, document.type)].filter(
            (id): id is number => id != null,
          )
        : [];

      const ok = isEditing
        ? await updateReply(editReplyId, message.trim())
        : await postReply(topicId, message.trim(), {mediaIds, videoIds, documentIds});
      if (ok) {
        navigation?.goBack();
      } else {
        // Previously failed silently — the request could 404/error and the
        // screen would just sit there with the spinner gone and nothing
        // posted, with no indication anything went wrong.
        Alert.alert(
          'Could not post reply',
          'Something went wrong publishing your reply. Please try again.',
        );
      }
    } catch (err: any) {
      // Temporary: show the real backend error so we can see exactly what's
      // being rejected, instead of a generic message that hides the cause.
      Alert.alert('Could not post reply', err?.message || 'Something went wrong publishing your reply.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header: X close + gradient Publish */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeX}>{'✕'}</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={!canSubmit} onPress={handlePublish}>
          <LinearGradient
            colors={GRADIENT}
            style={[styles.publishBtn, !canSubmit && {opacity: 0.5}]}>
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.publishBtnText}>{'Publish'}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Text style={styles.headerTitle}>
        {isEditing ? 'Edit Reply' : 'Reply to Discussion'}
      </Text>

      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          keyboardShouldPersistTaps="handled">
          {/* Quoted discussion card */}
          {!isEditing ? (
            <View style={styles.quoteCard}>
              <View style={styles.quoteInner}>
                <Text style={styles.quoteAuthor}>{authorName || 'IPM Member'}</Text>
                <LinearGradient
                  colors={['#E257E4', '#084D92']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  locations={[0, 0.7035]}
                  style={styles.quoteUnderline}
                />
                <Text style={styles.quoteTitle} numberOfLines={3}>
                  {topicTitle}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Your Message */}
          <View style={styles.messageSection}>
            <Text style={styles.messageLabel}>{'Your Message'}</Text>
            <View style={styles.messageBox}>
              <TextInput
                style={styles.messageInput}
                placeholder="Write your reply..."
                placeholderTextColor="#8F9098"
                value={message}
                onChangeText={setMessage}
                multiline
                textAlignVertical="top"
              />

              {images.length > 0 || video || document ? (
                <View style={styles.mediaPreviewRow}>
                  {images.map((uri, i) => (
                    <View key={uri} style={styles.mediaThumbWrap}>
                      <Image source={{uri}} style={styles.mediaThumb} />
                      <TouchableOpacity
                        style={styles.mediaRemoveBtn}
                        onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}>
                        <Text style={styles.mediaRemoveX}>{'✕'}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {video ? (
                    <View style={styles.mediaChip}>
                      <Text style={styles.mediaChipText} numberOfLines={1}>
                        {video.name}
                      </Text>
                      <TouchableOpacity onPress={() => setVideo(null)}>
                        <Text style={styles.mediaChipRemoveX}>{'✕'}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  {document ? (
                    <View style={styles.mediaChip}>
                      <Text style={styles.mediaChipText} numberOfLines={1}>
                        {document.name}
                      </Text>
                      <TouchableOpacity onPress={() => setDocument(null)}>
                        <Text style={styles.mediaChipRemoveX}>{'✕'}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.messageFooter}>
                <TouchableOpacity style={styles.footerIconBtn}>
                  <Text style={styles.aaText}>{'Aa'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerIconBtn} onPress={handlePickImages}>
                  <CameraIcon size={15} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerIconBtn} onPress={handlePickVideo}>
                  <VideoIcon size={15} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerIconBtn} onPress={handlePickDocument}>
                  <AttachmentIcon size={15} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Pinned to the bottom of the screen, not just after content */}
        <View style={styles.guidelinesFrame}>
          <Text style={styles.guidelinesText}>
            {'*Be kind and respectful, give credit to the original source of content, and search for duplicates before posting. Learn more about '}
            <Text style={styles.guidelinesLink}>{'Community Guidelines'}</Text>
            {'.'}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: {fontSize: 18, color: '#192546'},
  headerTitle: {
    paddingHorizontal: 16,
    color: '#192647',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
    marginBottom: 12,
  },
  publishBtn: {borderRadius: 50, paddingHorizontal: 20, paddingVertical: 10, minWidth: 84, alignItems: 'center'},
  publishBtnText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 13, fontWeight: '700'},

  // Figma spec's own layout block for the content area below the header:
  // padding 0 16, column, gap 24, align-self stretch. ("justify-content:
  // center" in the source spec reads like a Figma auto-layout packing
  // artifact, not a literal request to vertically center a scrolling form —
  // implemented as normal top-down flow with the specified 24px gap between
  // sections instead, since true vertical centering would look broken once
  // the keyboard opens or content grows.)
  content: {flex: 1},
  contentInner: {paddingHorizontal: 16, gap: 24, paddingBottom: 24},

  // The spec repeats "background: #0C4D91" for this frame, but that's a
  // dark navy fill under dark navy (#192546) text — illegible together.
  // Figma screenshot confirms: light card, blue accent on the left edge
  // only, no border on the other three sides.
  // Per spec: the outer frame itself carries the #0C4D91 background,
  // padding-left: 6, and radius 16 — the "left border" is really just this
  // outer frame showing through a 6px gap before the white inner content
  // box starts, not a separate floating accent bar.
  quoteCard: {
    height: 124,
    backgroundColor: '#0C4D91',
    borderRadius: 16,
    paddingLeft: 6,
    overflow: 'hidden',
  },
  quoteInner: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  // Figma "Heading/H3": 16px/500, lineHeight 20, letterSpacing 0.08 — same
  // spec given for both the author name and the discussion title text.
  quoteAuthor: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  quoteUnderline: {width: 51, height: 2, marginVertical: 6},
  quoteTitle: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: 0.08,
  },

  messageSection: {},
  messageLabel: {color: '#192546', fontFamily: 'Runda', fontSize: 13, fontWeight: '700', marginBottom: 8},
  // Figma: message box frame — padding-top 16, column, gap 10, self-stretch,
  // radius 5, border 1px #C5C6CC, background #FFF.
  messageBox: {
    alignSelf: 'stretch',
    paddingTop: 16,
    gap: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#C5C6CC',
    backgroundColor: '#FFFFFF',
  },
  messageInput: {
    paddingHorizontal: 16,
    minHeight: 90,
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 14,
  },
  // Fixed: this footer previously had a hardcoded `width: 358`, which is
  // why the box looked cut short instead of spanning the full card width —
  // now stretches naturally with its parent.
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#F9FAFB',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    alignSelf: 'stretch',
  },
  footerIconBtn: {padding: 2},
  aaText: {fontFamily: 'Runda', fontSize: 14, fontWeight: '700', color: '#192546'},

  mediaPreviewRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12},
  mediaThumbWrap: {width: 56, height: 56, borderRadius: 6, overflow: 'hidden'},
  mediaThumb: {width: '100%', height: '100%'},
  mediaRemoveBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaRemoveX: {color: '#FFFFFF', fontSize: 10},
  mediaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 160,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF7FC',
  },
  mediaChipText: {flex: 1, color: '#0C4D91', fontFamily: 'Runda', fontSize: 12},
  mediaChipRemoveX: {color: '#0C4D91', fontSize: 12, fontWeight: '700'},

  // Figma: guidelines frame — full width, padding 8 16, centered.
  guidelinesFrame: {
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
  },
  guidelinesText: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    textAlign: 'left',
  },
  guidelinesLink: {
    color: '#0C4D91',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default ReplyToDiscussionScreen;
