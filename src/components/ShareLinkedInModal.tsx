/* eslint-disable prettier/prettier */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {LinkedInIcon, SendIcon, WhatsAppIcon, XSocialIcon, ThreadsIcon} from './forumsIcons';

const GRADIENT = ['#E257E4', '#084D92'];
const SITE_BASE = 'https://hub.instituteprojectmanagement.com';

interface ShareLinkedInModalProps {
  visible: boolean;
  onClose: () => void;
  context: 'allForums' | 'singleDiscussion';
  topicId?: number;
  topicTitle?: string;
}

const ShareLinkedInModal = ({
  visible,
  onClose,
  context,
  topicId,
  topicTitle,
}: ShareLinkedInModalProps) => {
  const defaultUrl =
    context === 'singleDiscussion' && topicId
      ? `${SITE_BASE}/forums/topic/${topicId}/`
      : `${SITE_BASE}/forums/`;

  const [url, setUrl] = useState(defaultUrl);
  const [emails, setEmails] = useState('');

  // Reset fields whenever a different discussion/context opens the popup
  useEffect(() => {
    if (visible) {
      setUrl(defaultUrl);
      setEmails('');
    }
  }, [visible, defaultUrl]);

  const handleShareLinkedIn = () => {
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    Linking.openURL(shareUrl);
  };

  const handleInvite = () => {
    const list = emails
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);
    if (list.length === 0) {
      Alert.alert('Add an email', 'Enter at least one colleague email address.');
      return;
    }
    const subject = encodeURIComponent(
      context === 'singleDiscussion' ? `Join this discussion on IPM Hub` : `Join IPM Hub Forums`,
    );
    const body = encodeURIComponent(`I thought you'd find this interesting: ${url}`);
    Linking.openURL(`mailto:${list.join(',')}?subject=${subject}&body=${body}`);
  };

  const subheading =
    context === 'singleDiscussion'
      ? 'Share this Discussion with Your LinkedIn Connections'
      : 'Share All Forums with Your LinkedIn Connections';

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Figma: header frame — height 56, padding 18/24/16.5/126.5 (allForums)
              or 142.5 (singleDiscussion) left — implemented as a centered-title
              row with an absolute-positioned X, which reproduces the same
              visual (centered "Share on LinkedIn", X pinned right) without
              hardcoding the asymmetric left padding from a single fixed-width
              Figma frame. */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{'Share on LinkedIn'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeX}>{'✕'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.subheading}>{subheading}</Text>

            <TextInput
              style={styles.urlInput}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity onPress={handleShareLinkedIn} style={{marginTop: 16}}>
              <LinearGradient colors={GRADIENT} style={styles.linkedInBtn}>
                <LinkedInIcon />
                <Text style={styles.linkedInBtnText}>{'Share on LinkedIn'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{'OR'}</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.fieldLabel}>{'Invite a Colleague via Email'}</Text>
            <TextInput
              style={styles.emailInput}
              placeholder="Email, comma separated"
              placeholderTextColor="#8F9098"
              value={emails}
              onChangeText={setEmails}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />

            <TouchableOpacity onPress={handleInvite} style={{marginTop: 16}}>
              <LinearGradient colors={GRADIENT} style={styles.inviteBtn}>
                <SendIcon color="#FFFFFF" size={12} />
                <Text style={styles.inviteBtnText}>{'Invite'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Facebook icon: the SVG submitted for it was byte-identical to
                the Invite paper-plane icon (a duplicate paste, not an actual
                FB glyph) — using a plain "f" glyph here until the real one
                is sent. WhatsApp/X/Threads are the real icons. */}
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={styles.socialIconBtn}
                onPress={() =>
                  Linking.openURL(
                    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
                  )
                }>
                <Text style={styles.socialGlyph}>{'f'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialIconBtn}
                onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(url)}`)}>
                <WhatsAppIcon size={24} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialIconBtn}
                onPress={() =>
                  Linking.openURL(
                    `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
                  )
                }>
                <XSocialIcon size={24} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialIconBtn}>
                <ThreadsIcon size={24} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  headerTitle: {
    color: '#0C4D91',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  closeBtn: {position: 'absolute', right: 24, padding: 2},
  closeX: {fontSize: 16, color: '#8F9098'},

  content: {paddingHorizontal: 16, paddingBottom: 24},
  subheading: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 16,
  },
  fieldLabel: {color: '#192546', fontFamily: 'Runda', fontSize: 13, fontWeight: '500', marginBottom: 8},
  urlInput: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#C5C6CC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 13,
  },
  emailInput: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#C5C6CC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 13,
  },

  linkedInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 50,
    paddingVertical: 14,
  },
  linkedInBtnText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 14, fontWeight: '700'},

  dividerRow: {flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10},
  dividerLine: {flex: 1, height: 1, backgroundColor: '#EBEBEB'},
  dividerText: {color: '#8F9098', fontFamily: 'Runda', fontSize: 12, fontWeight: '600'},

  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 50,
    paddingVertical: 14,
  },
  inviteBtnText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 14, fontWeight: '700'},

  socialRow: {flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 28},
  socialIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#EBEBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialGlyph: {fontFamily: 'Runda', fontSize: 16, fontWeight: '700', color: '#192546'},
});

export default ShareLinkedInModal;
