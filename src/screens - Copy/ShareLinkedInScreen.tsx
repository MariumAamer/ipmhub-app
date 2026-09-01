/* eslint-disable prettier/prettier */
import React, {useState} from 'react';
import {View, Text, StyleSheet, TextInput, TouchableOpacity, StatusBar, Linking, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {LinkedInIcon} from '../components/forumsIcons';

const GRADIENT = ['#E257E4', '#084D92'];
const SITE_BASE = 'https://hub.instituteprojectmanagement.com';

const ShareLinkedInScreen = ({navigation, route}: any) => {
  const context: 'allForums' | 'singleDiscussion' = route?.params?.context || 'allForums';
  const topicId = route?.params?.topicId;
  const topicTitle = route?.params?.topicTitle;

  const defaultUrl =
    context === 'singleDiscussion' && topicId
      ? `${SITE_BASE}/forums/topic/${topicId}/`
      : `${SITE_BASE}/forums/`;

  const [url, setUrl] = useState(defaultUrl);
  const [emails, setEmails] = useState('');

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeX}>{'✕'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{'Share on LinkedIn'}</Text>
        <View style={{width: 26}} />
      </View>

      <View style={styles.content}>
        {context === 'singleDiscussion' && topicTitle ? (
          <Text style={styles.discussionPreview} numberOfLines={2}>
            {topicTitle}
          </Text>
        ) : null}

        <Text style={styles.fieldLabel}>{'Link'}</Text>
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
          placeholder="name@company.com, name2@company.com"
          placeholderTextColor="#8F9098"
          value={emails}
          onChangeText={setEmails}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        <TouchableOpacity onPress={handleInvite} style={{marginTop: 16}}>
          <LinearGradient colors={GRADIENT} style={styles.inviteBtn}>
            <Text style={styles.inviteBtnText}>{'Invite'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Social icon row — Facebook/WhatsApp/X/Threads placeholders pending
            final SVGs from Figma; using lightweight text glyphs for now so the
            row isn't empty, swap in real icon components once provided. */}
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
            onPress={() =>
              Linking.openURL(`https://wa.me/?text=${encodeURIComponent(url)}`)
            }>
            <Text style={styles.socialGlyph}>{'W'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialIconBtn}
            onPress={() =>
              Linking.openURL(
                `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
              )
            }>
            <Text style={styles.socialGlyph}>{'X'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialIconBtn}>
            <Text style={styles.socialGlyph}>{'T'}</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  closeBtn: {padding: 4, width: 26},
  closeX: {fontSize: 18, color: '#192546'},
  headerTitle: {color: '#192647', fontFamily: 'Runda', fontSize: 16, fontWeight: '700', letterSpacing: 0.08},

  content: {paddingHorizontal: 16, paddingTop: 16},
  discussionPreview: {
    color: '#192647',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
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

  inviteBtn: {borderRadius: 50, paddingVertical: 14, alignItems: 'center'},
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

export default ShareLinkedInScreen;
