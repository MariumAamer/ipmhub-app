/* eslint-disable prettier/prettier */
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StatusBar,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {launchImageLibrary} from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import {createTopic, uploadForumMedia, FILTER_SETS, FilterItem} from '../api/forumsApi';
import {CameraIcon, VideoIcon, AttachmentIcon} from '../components/forumsIcons';

const GRADIENT = ['#E257E4', '#084D92'];
const GENERAL_DISCUSSION_FORUM_ID = 39013; // web's "New Discussion" form has no
// forum picker — confirmed via Postman that createTopic always needs a
// "parent" and web always posts to General Discussion, so this is fixed.
const MAX_TAGS = 3;

const CATEGORY_GROUPS: {key: string; label: string}[] = [
  {key: 'industry', label: 'PM by Industry'},
  {key: 'department', label: 'PM by Department'},
  {key: 'software', label: 'PM Softwares'},
  {key: 'challenges', label: 'Project Challenges'},
];

interface SelectedTag {
  termId: number;
  name: string;
  groupKey: string;
}

const NewDiscussionScreen = ({navigation}: any) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTags, setSelectedTags] = useState<SelectedTag[]>([]);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Media selection — uploaded to /buddyboss/v1/media on publish, then
  // referenced by id in createTopic() (bbp_media/bbp_videos/bbp_documents).
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

  const canPublish = title.trim().length > 0 && message.trim().length > 0 && !publishing;

  const toggleTag = (groupKey: string, item: FilterItem) => {
    const already = selectedTags.some(t => t.termId === item.termId);
    if (already) {
      setSelectedTags(prev => prev.filter(t => t.termId !== item.termId));
      return;
    }
    if (selectedTags.length >= MAX_TAGS) {
      Alert.alert('Up to 3 categories', 'Remove one before adding another.');
      return;
    }
    setSelectedTags(prev => [...prev, {termId: item.termId, name: item.name, groupKey}]);
  };

  const removeTag = (termId: number) => {
    setSelectedTags(prev => prev.filter(t => t.termId !== termId));
  };

  const handlePublish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    try {
      // Upload any selected media first — createTopic() needs the returned
      // media ids, not the local file uris.
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

      // Tags now use Robby's confirmed spec: comma-separated tag NAMES sent
      // at creation (topic_tags), plus a follow-up call to the dedicated
      // /topics/{id}/tags endpoint as a fallback — see createTopic().
      const result = await createTopic({
        title: title.trim().slice(0, 80),
        content: message.trim(),
        forumId: GENERAL_DISCUSSION_FORUM_ID,
        tagNames: selectedTags.map(t => t.name),
        mediaIds,
        videoIds,
        documentIds,
      });
      if (result.ok && result.id) {
        navigation?.replace('ForumTopic', {topicId: result.id});
      } else {
        Alert.alert('Error', 'Could not post your discussion. Please try again.');
      }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header: X + Publish (row), title below ── */}
      <View style={styles.headerFrame}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeX}>{'✕'}</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={!canPublish} onPress={handlePublish}>
            <LinearGradient
              colors={GRADIENT}
              style={[styles.publishBtn, !canPublish && {opacity: 0.5}]}>
              {publishing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.publishBtnText}>{'Publish'}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>{'Start a New Discussion'}</Text>
      </View>

      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* ── Discussion Title ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{'Discussion Title'}</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="What would you like to talk about? (Max 80 characters)"
              placeholderTextColor="#8F9098"
              value={title}
              onChangeText={t => setTitle(t.slice(0, 80))}
              maxLength={80}
            />
          </View>

          {/* ── Your Message ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{'Your Message'}</Text>
            <View style={styles.messageBox}>
              <TextInput
                style={styles.messageInput}
                placeholder="Share your question, experience, or insight. Be as detailed as you like."
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

          {/* ── Choose Categories ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{`Choose Categories (up to ${MAX_TAGS})`}</Text>
            <View style={styles.categoryRow}>
              {CATEGORY_GROUPS.map(group => (
                <TouchableOpacity
                  key={group.key}
                  style={styles.categoryTab}
                  onPress={() => setOpenGroup(group.key)}>
                  <Text style={styles.categoryTabText} numberOfLines={1}>
                    {group.label}
                  </Text>
                  <Text style={styles.chevron}>{'▾'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Selected tags ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{'Selected:'}</Text>
            {selectedTags.length > 0 ? (
              <View style={styles.selectedRow}>
                {selectedTags.map(tag => (
                  <TouchableOpacity
                    key={tag.termId}
                    style={styles.selectedChip}
                    onPress={() => removeTag(tag.termId)}>
                    <Text style={styles.selectedChipText}>{tag.name}</Text>
                    <Text style={styles.selectedChipRemove}>{' ✕'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
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

      {/* ── Category picker sheet — icons deferred, count shown, no cancel ── */}
      <Modal
        transparent
        animationType="slide"
        visible={!!openGroup}
        onRequestClose={() => setOpenGroup(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {`PM by ${
                  CATEGORY_GROUPS.find(g => g.key === openGroup)?.label.replace('PM by ', '').replace('PM ', '') || ''
                }`}
              </Text>
              <TouchableOpacity onPress={() => setOpenGroup(null)} style={styles.pickerCloseBtn}>
                <Text style={styles.pickerCloseX}>{'✕'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.pickerAlphabetical}>{'Alphabetical'}</Text>
            <ScrollView style={styles.pickerList}>
              {openGroup &&
                [...FILTER_SETS[openGroup]]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(item => {
                    const isSelected = selectedTags.some(t => t.termId === item.termId);
                    return (
                      <TouchableOpacity
                        key={item.termId}
                        style={[styles.pickerRow, isSelected && styles.pickerRowActive]}
                        onPress={() => toggleTag(openGroup, item)}>
                        <Text
                          style={[styles.pickerRowText, isSelected && styles.pickerRowTextActive]}>
                          {item.name}
                        </Text>
                        <Text style={styles.pickerRowCount}>{`(${item.count})`}</Text>
                      </TouchableOpacity>
                    );
                  })}
            </ScrollView>
            <TouchableOpacity style={styles.pickerContinueBtn} onPress={() => setOpenGroup(null)}>
              <Text style={styles.pickerContinueText}>{'Continue'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},

  headerFrame: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: {fontSize: 18, color: '#8F9098'},
  publishBtn: {
    height: 36,
    paddingHorizontal: 24,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 84,
  },
  publishBtnText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 13, fontWeight: '700'},
  headerTitle: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
  },

  section: {paddingHorizontal: 16, marginTop: 20},
  sectionLabel: {color: '#192546', fontFamily: 'Runda', fontSize: 14, fontWeight: '700', marginBottom: 8},
  titleInput: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#C5C6CC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 14,
  },

  messageBox: {borderRadius: 5, borderWidth: 1, borderColor: '#C5C6CC', backgroundColor: '#FFFFFF'},
  messageInput: {
    paddingTop: 14,
    paddingHorizontal: 16,
    minHeight: 110,
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 14,
    lineHeight: 18,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#F9FAFB',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
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

  categoryRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  categoryTab: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 31,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#8F9098',
    gap: 6,
    flexBasis: '47%',
    flexGrow: 1,
  },
  categoryTabText: {color: '#192546', fontFamily: 'Runda', fontSize: 14, fontWeight: '500'},
  chevron: {color: '#192546', fontSize: 10},

  selectedRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  selectedChip: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 37,
    paddingHorizontal: 12,
    borderRadius: 90,
    backgroundColor: '#EEF7FC',
  },
  selectedChipText: {
    color: '#0C4D91',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 16.8,
    letterSpacing: -0.21,
  },
  selectedChipRemove: {color: '#0C4D91', fontFamily: 'Runda', fontSize: 12, fontWeight: '700'},

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

  // Category picker sheet
  sheetOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end'},
  pickerSheet: {backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%'},
  pickerHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pickerTitle: {
    color: '#0C4D91',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  pickerCloseBtn: {position: 'absolute', right: 24, padding: 2},
  pickerCloseX: {fontSize: 16, color: '#8F9098'},
  pickerAlphabetical: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  pickerList: {paddingHorizontal: 20},
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 41,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  pickerRowActive: {backgroundColor: '#EEF7FC'},
  pickerRowText: {color: '#192546', fontFamily: 'Runda', fontSize: 14, fontWeight: '400', lineHeight: 18},
  pickerRowTextActive: {color: '#0C4D91', fontWeight: '500'},
  pickerRowCount: {color: '#8F9098', fontFamily: 'Runda', fontSize: 14},
  pickerContinueBtn: {
    margin: 20,
    height: 44,
    borderRadius: 50,
    backgroundColor: '#0C4D91',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerContinueText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 14, fontWeight: '700'},
});

export default NewDiscussionScreen;
