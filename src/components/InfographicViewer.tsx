/* eslint-disable prettier/prettier */
import React, {useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Linking,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const IMAGE_BOX_WIDTH = SCREEN_WIDTH * 0.92;

// Close (X) icon — exact from Figma, 20x20, #C5C6CC fill.
// Drawn as two plain overlapping <Path> fills rather than the
// mask+rect technique Figma exports by default — react-native-svg's
// <Mask> wasn't rendering on device (icons showed blank), so every
// icon in Resources was converted to this simpler, more reliable form.
const CloseIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M1.61612 1.61611C2.10427 1.12796 2.89573 1.12796 3.38388 1.61611L18.3839 16.6159C18.872 17.104 18.872 17.8955 18.3839 18.3836C17.8957 18.8718 17.1043 18.8718 16.6161 18.3836L1.61612 3.38385C1.12796 2.8957 1.12796 2.10426 1.61612 1.61611Z" fill="#C5C6CC" />
    <Path fillRule="evenodd" clipRule="evenodd" d="M18.3839 1.61611C17.8957 1.12796 17.1043 1.12796 16.6161 1.61611L1.61612 16.6159C1.12796 17.104 1.12796 17.8955 1.61612 18.3836C2.10427 18.8718 2.89573 18.8718 3.38388 18.3836L18.3839 3.38385C18.872 2.8957 18.872 2.10426 18.3839 1.61611Z" fill="#C5C6CC" />
  </Svg>
);

// Download arrow — exact from Figma, 8.16x7.2, white fill
const DownloadIcon = () => (
  <Svg width={8.16} height={7.2} viewBox="0 0 9 8" fill="none">
    <Path d="M3.4534 6.91796C3.86379 7.2528 4.47018 7.22886 4.85262 6.84624L7.5648 4.13311L6.85652 3.42483L4.64168 5.64014V0.171237C4.64168 -0.12037 4.40547 -0.356576 4.11387 -0.356576C3.82226 -0.356576 3.58605 -0.12037 3.58605 0.171237V5.64202L1.36746 3.42342L0.65918 4.13171L3.37418 6.84624L3.4534 6.91796Z" fill="#FFFFFF" />
  </Svg>
);

export interface InfographicViewerProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  imageUrl: string;
}

// Popup viewer for Cheat Sheets / Infographics — slides up as a sheet
// over the Resources list (per Figma), not a full opaque screen.
//
// KNOWN GAP — the in-app rendering of the remote .svg via WebView could
// not be gotten working reliably here, despite the *exact same*
// html+<img> technique rendering correctly for the card thumbnails
// (SvgThumbnail in ResourcesScreen.tsx) at a smaller size. Root cause
// wasn't pinned down before the deadline (tried: SvgUri, html-wrapped
// WebView, direct-uri WebView, various sizing fixes for aspectRatio
// conflicts). Falling back to opening the infographic in the system
// browser via Linking — guaranteed to work since it's the same URL
// already confirmed rendering correctly there. Worth a proper debugging
// pass later (e.g. compare actual device logs during load) to bring
// back the true in-app zoomable viewer this was meant to be.
const InfographicViewer = ({visible, onClose, title, imageUrl}: InfographicViewerProps) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  // Same dependency-free approach used elsewhere in Resources — opens
  // the raw .svg URL via the OS. A true native "save to device" would
  // need react-native-fs or react-native-blob-util, neither of which is
  // in the project yet.
  const handleOpen = async () => {
    try {
      const supported = await Linking.canOpenURL(imageUrl);
      if (supported) {
        await Linking.openURL(imageUrl);
      } else {
        Alert.alert('Unable to open', 'This file could not be opened.');
      }
    } catch {
      Alert.alert('Something went wrong', 'Please try again.');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={ig.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </View>
      <Animated.View style={[ig.sheet, {transform: [{translateY: slideAnim}]}]}>
        <View style={ig.header}>
          <View style={{width: 20}} />
          <Text style={ig.headerTitle}>{'Infographics'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <CloseIcon />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={ig.title}>{title}</Text>

          <TouchableOpacity style={ig.imageBox} onPress={handleOpen} activeOpacity={0.85}>
            <Text style={ig.previewLabel}>{'Tap to view this infographic'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={ig.downloadBtn} onPress={handleOpen} activeOpacity={0.85}>
            <DownloadIcon />
            <Text style={ig.downloadText}>{'Download'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

const ig = StyleSheet.create({
  backdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)'},
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.88,
    paddingTop: 12,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {fontSize: 17, fontWeight: '700', color: '#0C4D91', fontFamily: 'Runda'},

  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#192546',
    fontFamily: 'Runda',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },

  imageBox: {
    alignSelf: 'center',
    width: IMAGE_BOX_WIDTH,
    height: 496,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#8F9098',
    backgroundColor: '#F5F6FA',
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  previewLabel: {
    color: '#0C4D91',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0C4D91',
    borderRadius: 50,
    marginHorizontal: 20,
    paddingVertical: 16,
  },
  // Figma: Action/Action M — #FFF, 12px, weight 500
  downloadText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 12, fontWeight: '500', marginLeft: 8},
});

export default InfographicViewer;
