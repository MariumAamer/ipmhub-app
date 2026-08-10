/* eslint-disable prettier/prettier */
import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Share,
  Linking,
  Modal,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');
const stripHtml = (html: string) =>
  (html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .trim();

const formatDate = (d: string) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// ─── Table of Contents Sheet ──────────────────────────────────────────────────
const TOCSheet = ({visible, onClose, items, onSelect}: any) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [visible]);
  if (!visible) return null;
  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none">
      <View style={toc.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
        />
      </View>
      <Animated.View
        style={[toc.sheet, {transform: [{translateY: slideAnim}]}]}>
        <View style={toc.header}>
          <Text style={toc.title}>{'Table of Contents'}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={toc.close}>{'✕'}</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={items}
          keyExtractor={(_, i) => String(i)}
          renderItem={({item, index}) => (
            <TouchableOpacity
              style={[toc.item, index === 0 && toc.itemFirst]}
              onPress={() => {
                onSelect(index);
                onClose();
              }}>
              <Text style={[toc.itemText, index === 0 && toc.itemTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </Animated.View>
    </Modal>
  );
};
const toc = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.6,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {fontSize: 17, fontWeight: '700', color: '#1A3A6B'},
  close: {position: 'absolute', right: 16, fontSize: 18, color: '#666'},
  item: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  itemFirst: {backgroundColor: '#EEF3FB'},
  itemText: {fontSize: 14, color: '#333'},
  itemTextActive: {color: '#1A3A6B', fontWeight: '600'},
});

// ─── Share Sheet ──────────────────────────────────────────────────────────────
const ShareSheet = ({visible, onClose, article}: any) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [visible]);
  if (!visible) return null;

  const url = article?.link || 'https://hub.instituteprojectmanagement.com';
  const SHARE_ITEMS = [
    {
      icon: 'f',
      label: 'Facebook',
      color: '#1877F2',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url,
      )}`,
    },
    {
      icon: 'in',
      label: 'LinkedIn',
      color: '#0A66C2',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        url,
      )}`,
    },
    {
      icon: 'X',
      label: 'X (Twitter)',
      color: '#000000',
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
    },
    {
      icon: '▶',
      label: 'Youtube',
      color: '#FF0000',
      url: `https://www.youtube.com`,
    },
    {
      icon: '📱',
      label: 'Whatsapp',
      color: '#25D366',
      url: `https://wa.me/?text=${encodeURIComponent(url)}`,
    },
    {
      icon: '✉',
      label: 'Email',
      color: '#666',
      url: `mailto:?body=${encodeURIComponent(url)}`,
    },
  ];

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none">
      <View style={ss.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
        />
      </View>
      <Animated.View style={[ss.sheet, {transform: [{translateY: slideAnim}]}]}>
        <View style={ss.header}>
          <Text style={ss.title}>{'Share This Article'}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={ss.close}>{'✕'}</Text>
          </TouchableOpacity>
        </View>
        <View style={ss.iconsRow}>
          {SHARE_ITEMS.map(item => (
            <TouchableOpacity
              key={item.label}
              style={ss.iconItem}
              onPress={() => Linking.openURL(item.url).catch(() => {})}>
              <View style={[ss.iconCircle, {backgroundColor: item.color}]}>
                <Text style={ss.iconText}>{item.icon}</Text>
              </View>
              <Text style={ss.iconLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={ss.copyRow}>
          <Text style={ss.copyUrl} numberOfLines={1}>
            {url}
          </Text>
          <TouchableOpacity
            style={ss.copyBtn}
            onPress={() => Share.share({message: url})}>
            <Text style={ss.copyBtnText}>{'Copy'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={ss.linkRow}
          onPress={() => Linking.openURL(url).catch(() => {})}>
          <Text style={ss.linkIcon}>{'🔗'}</Text>
          <Text style={ss.linkText}>{'Open in Browser'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ss.linkRow}>
          <Text style={ss.linkIcon}>{'↑'}</Text>
          <Text style={ss.linkText}>{'Submit a Resource'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};
const ss = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {fontSize: 17, fontWeight: '700', color: '#1A1A1A'},
  close: {position: 'absolute', right: 16, fontSize: 18, color: '#666'},
  iconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  iconItem: {alignItems: 'center', gap: 6},
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {color: '#FFF', fontSize: 16, fontWeight: '700'},
  iconLabel: {fontSize: 10, color: '#555'},
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  copyUrl: {flex: 1, fontSize: 12, color: '#666'},
  copyBtn: {
    backgroundColor: '#1A3A6B',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  copyBtnText: {color: '#FFF', fontSize: 13, fontWeight: '700'},
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    gap: 10,
  },
  linkIcon: {fontSize: 16},
  linkText: {fontSize: 14, color: '#333'},
});

// ─── Main Article Screen ──────────────────────────────────────────────────────
const ResourceArticleScreen = ({navigation, route}: any) => {
  const article = route?.params?.article || {};
  const [tocVisible, setTocVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const tocItems = article.tableOfContents || [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View style={styles.heroWrap}>
          {article.image ? (
            <Image source={{uri: article.image}} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, {backgroundColor: '#1A3A6B'}]} />
          )}
          {/* Back button overlay */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>{'‹'}</Text>
          </TouchableOpacity>
          {/* Category breadcrumb */}
          <View style={styles.heroCategoryWrap}>
            <Text style={styles.heroCategoryText}>{`Articles · ${
              article.category || 'Resources'
            }`}</Text>
          </View>
          {/* Title overlay */}
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>{article.title}</Text>
            {article.date ? (
              <Text style={styles.heroDate}>{formatDate(article.date)}</Text>
            ) : null}
          </View>
        </View>

        {/* TOC + Share row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.tocBtn}
            onPress={() => setTocVisible(true)}
            disabled={tocItems.length === 0}>
            <Text style={styles.tocBtnText}>{'Table of Contents  ∨'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={() => setShareVisible(true)}>
            <Text style={styles.shareBtnText}>{'Share  ✕'}</Text>
          </TouchableOpacity>
        </View>

        {/* Article content */}
        <View style={styles.contentWrap}>
          {tocItems.length > 0 && (
            <>
              <Text style={styles.sectionHeading}>{'Introduction'}</Text>
              <Text style={styles.paragraph}>{article.excerpt || ''}</Text>
            </>
          )}
          <Text style={styles.paragraph}>
            {stripHtml(article.content || article.excerpt || '')}
          </Text>
        </View>

        <View style={{height: 60}} />
      </ScrollView>

      {/* FAB scroll up */}
      <TouchableOpacity style={styles.fab}>
        <Text style={styles.fabText}>{'↑'}</Text>
      </TouchableOpacity>

      <TOCSheet
        visible={tocVisible}
        onClose={() => setTocVisible(false)}
        items={tocItems}
        onSelect={() => {}}
      />
      <ShareSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        article={article}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  heroWrap: {position: 'relative', height: 280},
  heroImage: {width: '100%', height: '100%'},
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {color: '#FFF', fontSize: 22, fontWeight: '300'},
  heroCategoryWrap: {position: 'absolute', top: 20, left: 60},
  heroCategoryText: {fontSize: 12, color: 'rgba(255,255,255,0.9)'},
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(15,30,70,0.75)',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 28,
    marginBottom: 6,
  },
  heroDate: {fontSize: 12, color: 'rgba(255,255,255,0.8)'},
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 10,
  },
  tocBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  tocBtnText: {fontSize: 13, color: '#333'},
  shareBtn: {
    backgroundColor: '#1A3A6B',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  shareBtnText: {fontSize: 13, color: '#FFF', fontWeight: '600'},
  contentWrap: {padding: 20},
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
    marginTop: 8,
  },
  paragraph: {fontSize: 15, color: '#444', lineHeight: 26, marginBottom: 16},
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A3A6B',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: {color: '#FFF', fontSize: 20, fontWeight: '700'},
});

export default ResourceArticleScreen;
