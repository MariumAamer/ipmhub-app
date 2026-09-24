/* eslint-disable prettier/prettier */
// src/components/WebinarFilterSheet.tsx
//
// "Filter by Category" bottom sheet for Webinar Recordings. CSS confirmed
// from Figma (Sep 2026): header text, checkbox rows, Apply/Clear buttons,
// container layout. Checkbox SVGs were given as <mask>-based in Figma —
// react-native-svg@15.3.0 doesn't render <mask>, so both are rebuilt as
// plain <Path fill> per the project's established rule (see
// technical-learnings.md). The unchecked box is a stroked rect (kept as
// <Rect>, not a mask, so no rebuild needed there); the checked state is
// this component's own filled box + the rebuilt white checkmark path.
//
// "Clear All" empties the in-sheet draft only — it does NOT auto-apply or
// close the sheet, so the person can still back out without losing their
// actual applied filters. Not explicitly specified either way; flagging as
// a default choice, easy to flip to "clear + apply + close" if Marium
// wants that instead.

import React, {useState, useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Animated, Dimensions} from 'react-native';
import Svg, {Path, Rect} from 'react-native-svg';
import {WEBINAR_TAGS} from '../api/eventsApi';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

const CloseIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M1.61612 1.61611C2.10427 1.12796 2.89573 1.12796 3.38388 1.61611L18.3839 16.6159C18.872 17.104 18.872 17.8955 18.3839 18.3836C17.8957 18.8718 17.1043 18.8718 16.6161 18.3836L1.61612 3.38385C1.12796 2.8957 1.12796 2.10426 1.61612 1.61611Z" fill="#8F9098" />
    <Path fillRule="evenodd" clipRule="evenodd" d="M18.3839 1.61611C17.8957 1.12796 17.1043 1.12796 16.6161 1.61611L1.61612 16.6159C1.12796 17.104 1.12796 17.8955 1.61612 18.3836C2.10427 18.8718 2.89573 18.8718 3.38388 18.3836L18.3839 3.38385C18.872 2.8957 18.872 2.10426 18.3839 1.61611Z" fill="#8F9098" />
  </Svg>
);

// Unchecked box — plain stroked rect from Figma, no mask involved.
const CheckboxEmpty = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Rect x={0.5} y={0.5} width={17} height={17} rx={1.5} stroke="#8F9098" />
  </Svg>
);

// Checked box — filled square (app primary blue) + the checkmark path,
// REBUILT from Figma's mask-based SVG into a plain filled Path (mask
// silhouette + rect fill collapses to just: path filled with the rect's
// color) per the project's mask-rebuild rule.
const CheckboxChecked = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Rect x={0.5} y={0.5} width={17} height={17} rx={1.5} fill="#0C4D91" />
    <Path
      transform="translate(3, 3)"
      d="M11.7541 2.30086C12.0858 2.63911 12.0809 3.18261 11.7432 3.51481L4.5973 10.5437L0.25653 6.27403C-0.0811989 5.94183 -0.0860879 5.39832 0.24561 5.06008C0.577309 4.72184 1.11999 4.71694 1.45772 5.04915L4.5973 8.13734L10.542 2.28993C10.8797 1.95773 11.4224 1.96262 11.7541 2.30086Z"
      fill="#FFFFFF"
    />
  </Svg>
);

interface Props {
  visible: boolean;
  onClose: () => void;
  selectedTags: string[];
  onApply: (tags: string[]) => void;
}

const WebinarFilterSheet = ({visible, onClose, selectedTags, onApply}: Props) => {
  const [draft, setDraft] = useState<string[]>(selectedTags);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Re-seed the draft from whatever's actually applied every time the
  // sheet opens, so a previous unsaved edit doesn't leak into the next open.
  useEffect(() => {
    if (visible) setDraft(selectedTags);
  }, [visible, selectedTags]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  if (!visible) return null;

  const toggle = (slug: string) => {
    setDraft(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);
  };

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[s.sheet, {transform: [{translateY: slideAnim}]}]}>
        <View style={s.header}>
          <Text style={s.headerText}>{'Filter by Category'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <CloseIcon />
          </TouchableOpacity>
        </View>

        <ScrollView style={s.body} contentContainerStyle={s.bodyContent}>
          <Text style={s.topicsLabel}>{'Topics'}</Text>
          <View>
            {WEBINAR_TAGS.map(tag => {
              const checked = draft.includes(tag.slug);
              return (
                <TouchableOpacity
                  key={tag.slug}
                  style={s.topicRow}
                  onPress={() => toggle(tag.slug)}
                  activeOpacity={0.7}>
                  {checked ? <CheckboxChecked /> : <CheckboxEmpty />}
                  <Text style={s.topicText}>{tag.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity
            style={s.applyBtn}
            activeOpacity={0.85}
            onPress={() => { onApply(draft); onClose(); }}>
            <Text style={s.applyBtnText}>{'Apply Filters'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.clearBtn} activeOpacity={0.7} onPress={() => setDraft([])}>
            <Text style={s.clearBtnText}>{'Clear All'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)'},
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  headerText: {
    color: '#0C4D91',
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    letterSpacing: 0.08,
  },
  body: {paddingHorizontal: 16},
  bodyContent: {paddingBottom: 8},
  topicsLabel: {
    color: '#192546',
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    letterSpacing: 0.08,
    marginBottom: 16,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  topicText: {
    color: '#192546',
    fontFamily: 'Runda-Medium',
    fontSize: 14,
    marginLeft: 12,
  },
  footer: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32},
  applyBtn: {
    height: 40,
    borderRadius: 50,
    backgroundColor: '#0C4D91',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  applyBtnText: {color: '#FFFFFF', fontFamily: 'Runda-Medium', fontSize: 14},
  clearBtn: {height: 40, justifyContent: 'center', alignItems: 'center'},
  clearBtnText: {color: '#0C4D91', fontFamily: 'Runda-Medium', fontSize: 14},
});

export default WebinarFilterSheet;
