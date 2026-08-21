/* eslint-disable prettier/prettier */
// src/components/VideoPlayerModal.tsx
//
// Shared in-app video player used wherever a lesson/course video needs to
// play — Overview/About Us/FAQs tabs (CourseDetailScreen) and step content
// (StepContentScreen). Previously each of these opened the raw video URL
// externally via Linking.openURL, which for Vimeo's player.vimeo.com/video/
// URLs triggers "Sorry, because of its privacy settings, this video cannot
// be played here" — CONFIRMED on-device (Aug 2026). player.vimeo.com is an
// embed-only player meant to run inside an iframe on a domain Vimeo has
// whitelisted (this site's own domain, since it plays fine embedded on the
// website) — loading it bare in an external browser tab has no whitelisted
// origin/referrer at all, so Vimeo correctly blocks it.
//
// Fix: load it in-app via WebView, wrapped in a tiny local HTML page with
// an <iframe>, using `baseUrl` set to the site's own domain. This makes the
// WebView's effective origin match what's presumably whitelisted, the same
// way the website's own embed works.
//
// FIXED (Aug 2026): reported as "blank black screen, no way back" on
// Android:
//   1. Black screen — Android WebView defaults `mixedContentMode` to
//      "never" (blocks any insecure/cross-origin subresource on an
//      otherwise-https page), unlike iOS WebKit which is more permissive.
//      Vimeo's player commonly pulls in resources that trip this, and when
//      blocked the iframe just renders empty — no error surfaced, just
//      black. Added mixedContentMode="always" + a broad originWhitelist so
//      the iframe's subresources aren't silently dropped.
//   2. No back/close button reachable — the close (X) button WAS already
//      coded here, but Android WebView composites as its own hardware
//      layer and ignores normal React Native zIndex stacking: it paints on
//      top of sibling views regardless of declared order, so the button
//      was being visually covered by the WebView itself. Fixed by
//      rendering the close button as an absolutely-positioned sibling of
//      the *Modal* itself (outside/after the WebView-containing View) and
//      giving it a high elevation, which forces Android to composite it in
//      its own layer above the WebView instead of relying on paint order.

import React from 'react';
import {Modal, View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Platform} from 'react-native';
import {WebView} from 'react-native-webview';
import Svg, {Path} from 'react-native-svg';

// Set to the site's own domain — matches how these videos are already
// successfully embedded on the website itself, so the WebView's effective
// origin should match whatever Vimeo has whitelisted for this content.
const SITE_BASE_URL = 'https://hub.instituteprojectmanagement.com/';

const CloseIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M2 2L14 14M14 2L2 14" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// Bare vimeo.com/{id} watch-page links (confirmed real pattern from
// getStepContent's html — no iframe wrapper) aren't directly embeddable —
// only player.vimeo.com/video/{id} is. Convert if needed; pass everything
// else (already player.vimeo.com, YouTube, direct file) through unchanged.
export const toEmbeddableVideoUrl = (url: string): string => {
  const bareVimeoMatch = /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/i.exec(url);
  if (bareVimeoMatch) {
    return `https://player.vimeo.com/video/${bareVimeoMatch[1]}`;
  }
  return url;
};

interface Props {
  visible: boolean;
  videoUrl: string | null;
  onClose: () => void;
}

const VideoPlayerModal = ({visible, videoUrl, onClose}: Props) => {
  if (!videoUrl) return null;
  const embedUrl = toEmbeddableVideoUrl(videoUrl);
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><style>html,body{margin:0;padding:0;background:#000;height:100%;}iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0;}</style></head><body><iframe src="${embedUrl}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></body></html>`;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>
        <View style={styles.playerWrap}>
          <WebView
            source={{html, baseUrl: SITE_BASE_URL}}
            style={styles.webview}
            allowsFullscreenVideo
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            startInLoadingState
            // Android: default mixedContentMode ("never") silently drops
            // any insecure/cross-origin subresource the Vimeo iframe pulls
            // in, which is what was producing the blank black screen on
            // device — this was the actual root cause, not a player.vimeo
            // privacy/embed block (that part was already fixed above).
            mixedContentMode="always"
            originWhitelist={['*']}
            allowsInlineMediaPlayback
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            )}
          />
        </View>
        <Text style={styles.hint}>{'If playback fails, this video may be private on Vimeo\'s side — check its Privacy settings there.'}</Text>

        {/* Close button rendered LAST and outside the WebView's own View
            so it isn't a sibling the WebView's native surface can paint
            over on Android — elevation forces its own compositing layer
            on top regardless of WebView's hardware layer. */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <CloseIcon />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000000', justifyContent: 'center'},
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    elevation: Platform.OS === 'android' ? 20 : 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerWrap: {width: '100%', aspectRatio: 16 / 9},
  webview: {flex: 1, backgroundColor: '#000000'},
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  hint: {
    color: '#8F9098',
    fontFamily: 'Runda-Normal',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
  },
});

export default VideoPlayerModal;
