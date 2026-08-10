/* eslint-disable prettier/prettier */
import React, {useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

export interface FilterItem {
  id: string;
  name: string;
  count?: number;
  icon?: string;
}

interface ForumFilterSheetProps {
  visible: boolean;
  title: string;
  items: FilterItem[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onContinue: () => void;
}

const ForumFilterSheet = ({
  visible,
  title,
  items,
  selected,
  onSelect,
  onClose,
  onContinue,
}: ForumFilterSheetProps) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, {opacity: backdropAnim}]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
        />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, {transform: [{translateY: slideAnim}]}]}>
        {/* Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>{'Alphabetical'}</Text>

        <FlatList
          data={items}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          style={styles.list}
          renderItem={({item}) => (
            <TouchableOpacity
              style={[
                styles.filterItem,
                selected === item.id && styles.filterItemActive,
              ]}
              onPress={() => onSelect(item.id)}>
              {item.icon ? (
                <Text style={styles.filterIcon}>{item.icon}</Text>
              ) : null}
              <Text
                style={[
                  styles.filterName,
                  selected === item.id && styles.filterNameActive,
                ]}>
                {item.name}
                {item.count !== undefined ? (
                  <Text
                    style={[
                      styles.filterCount,
                      selected === item.id && styles.filterCountActive,
                    ]}>
                    {` (${item.count})`}
                  </Text>
                ) : null}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Continue */}
        <TouchableOpacity style={styles.continueBtn} onPress={onContinue}>
          <Text style={styles.continueBtnText}>{'Continue'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.75,
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sheetTitle: {fontSize: 17, fontWeight: '700', color: '#1A3A6B'},
  closeBtn: {position: 'absolute', right: 16, padding: 4},
  closeIcon: {fontSize: 18, color: '#666'},
  sectionLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingVertical: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {flex: 1},
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  filterItemActive: {backgroundColor: '#EEF3FB'},
  filterIcon: {fontSize: 18, marginRight: 12},
  filterName: {flex: 1, fontSize: 14, color: '#333'},
  filterNameActive: {color: '#1A3A6B', fontWeight: '600'},
  filterCount: {fontSize: 13, color: '#999'},
  filterCountActive: {color: '#1A3A6B'},
  continueBtn: {
    backgroundColor: '#1A3A6B',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '700'},
});

export default ForumFilterSheet;
