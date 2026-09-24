/* eslint-disable prettier/prettier */
// src/components/WebinarSortSheet.tsx
//
// "Sort by" bottom sheet — Marium confirmed (Sep 2026) this uses "the same
// visual treatment as the filter sheet, just no checkboxes": same header
// row (title + close X), same sheet chrome. Tapping a row selects it and
// closes immediately — the screenshot showed no separate Apply button, so
// there's nothing to "apply" the way the filter sheet has.

import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {WEBINAR_SORT_OPTIONS, WebinarSort} from '../api/eventsApi';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

const CloseIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M1.61612 1.61611C2.10427 1.12796 2.89573 1.12796 3.38388 1.61611L18.3839 16.6159C18.872 17.104 18.872 17.8955 18.3839 18.3836C17.8957 18.8718 17.1043 18.8718 16.6161 18.3836L1.61612 3.38385C1.12796 2.8957 1.12796 2.10426 1.61612 1.61611Z" fill="#8F9098" />
    <Path fillRule="evenodd" clipRule="evenodd" d="M18.3839 1.61611C17.8957 1.12796 17.1043 1.12796 16.6161 1.61611L1.61612 16.6159C1.12796 17.104 1.12796 17.8955 1.61612 18.3836C2.10427 18.8718 2.89573 18.8718 3.38388 18.3836L18.3839 3.38385C18.872 2.8957 18.872 2.10426 18.3839 1.61611Z" fill="#8F9098" />
  </Svg>
);

interface Props {
  visible: boolean;
  onClose: () => void;
  selected: WebinarSort;
  onSelect: (value: WebinarSort) => void;
}

const WebinarSortSheet = ({visible, onClose, selected, onSelect}: Props) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[s.sheet, {transform: [{translateY: slideAnim}]}]}>
        <View style={s.header}>
          <Text style={s.headerText}>{'Sort by'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <CloseIcon />
          </TouchableOpacity>
        </View>

        <View style={s.body}>
          {WEBINAR_SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={s.row}
              activeOpacity={0.7}
              onPress={() => { onSelect(opt.value); onClose(); }}>
              <Text style={[s.rowText, selected === opt.value && s.rowTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
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
    paddingBottom: 32,
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
  body: {paddingHorizontal: 24},
  row: {paddingVertical: 14},
  rowText: {color: '#192546', fontFamily: 'Runda-Normal', fontSize: 14},
  rowTextActive: {fontFamily: 'Runda-Medium', color: '#0C4D91'},
});

export default WebinarSortSheet;
