import React from 'react';
import {Modal, View, Text, TouchableOpacity, FlatList, StyleSheet} from 'react-native';

const EMOJIS = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','😉','😍','🥰','😘','😋',
  '😎','🤩','🥳','🤔','🤗','😏','😌','😴','😢','😭','😮','😱','😡','🙄','😬','🤝',
  '👍','👎','👏','🙌','🙏','💪','👋','🤞','✌️','👌','🫡','🎉','🎊','🔥','⭐','✨',
  '💡','✅','❌','⚡','🚀','🎯','📈','📊','📅','📌','📝','📚','💼','🏆','🌍','☕',
  '❤️','💙','💜','💯','👀','🤯','🫶',
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

const EmojiPickerSheet = ({visible, onClose, onSelect}: Props) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
      <View style={s.sheet} onStartShouldSetResponder={() => true}>
        <View style={s.header}>
          <Text style={s.title}>{'Emoji'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={s.close}>{'✕'}</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={EMOJIS}
          numColumns={8}
          keyExtractor={(e, i) => `${e}-${i}`}
          keyboardShouldPersistTaps="handled"
          renderItem={({item}) => (
            <TouchableOpacity style={s.cell} onPress={() => onSelect(item)}>
              <Text style={s.char}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </TouchableOpacity>
  </Modal>
);

const s = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  title: {fontSize: 16, fontWeight: '700', color: '#192546', fontFamily: 'Runda'},
  close: {fontSize: 18, color: '#8F9098'},
  cell: {width: '12.5%', alignItems: 'center', justifyContent: 'center', paddingVertical: 8},
  char: {fontSize: 24},
});

export default EmojiPickerSheet;
