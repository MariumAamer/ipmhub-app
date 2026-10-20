/* eslint-disable prettier/prettier */
// Shared search row + filter / sort sheets. Visual spec is copied 1:1 from
// ForumsScreen (the reference UI) so every search bar, filter sheet and sort
// sheet in the app looks identical. Change the look here, not per screen.
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ScrollView,
  Dimensions,
  ViewStyle,
} from 'react-native';
import {SearchIcon, FilterIcon} from './forumsIcons';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

// ─── Search + filter row ────────────────────────────────────────────────────
export interface SearchRowButton {
  icon?: React.ReactNode; // defaults to the Forums filter icon
  onPress: () => void;
  badge?: number;
}

export const SearchFilterRow = ({
  value,
  onChangeText,
  placeholder = 'Search',
  onSubmitEditing,
  buttons,
  style,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  onSubmitEditing?: () => void;
  buttons?: SearchRowButton[];
  style?: ViewStyle;
}) => (
  <View style={[st.searchRow, style]}>
    <View style={st.searchBar}>
      <SearchIcon />
      <TextInput
        style={st.searchInput}
        placeholder={placeholder}
        placeholderTextColor="#8F9098"
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="search"
      />
    </View>
    {(buttons || []).map((b, i) => (
      <TouchableOpacity key={i} style={st.filterBtn} onPress={b.onPress} activeOpacity={0.8}>
        {b.icon || <FilterIcon />}
        {b.badge ? (
          <View style={st.badge}>
            <Text style={st.badgeText}>{b.badge}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Sheet frame (overlay + rounded sheet + centered title + ✕) ─────────────
const SheetFrame = ({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  if (!visible) return null;
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={st.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={st.sheet}>
          <View style={st.sheetHeader}>
            <Text style={st.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={st.closeBtn} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={st.closeIcon}>{'✕'}</Text>
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
};

const ContinueButton = ({label = 'Continue', onPress}: {label?: string; onPress: () => void}) => (
  <TouchableOpacity onPress={onPress} style={st.continueBtn}>
    <Text style={st.continueText}>{label}</Text>
  </TouchableOpacity>
);

const Row = ({
  label,
  count,
  selected,
  onPress,
  icon,
  disabled,
}: {
  label: string;
  count?: number | null;
  selected: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}) => (
  <TouchableOpacity
    disabled={disabled}
    style={[st.row, selected && st.rowActive, disabled && {opacity: 0.4}]}
    onPress={onPress}>
    {icon ? <View style={st.rowIcon}>{icon}</View> : null}
    <View style={st.rowTextGroup}>
      <Text style={[st.rowText, selected && st.rowTextActive]}>{label}</Text>
      {count != null ? <Text style={st.rowCount}>{` (${count})`}</Text> : null}
    </View>
  </TouchableOpacity>
);

// ─── Single-select filter sheet ─────────────────────────────────────────────
export interface SheetItem {
  id: string;
  label: string;
  count?: number | null;
  icon?: (color: string) => React.ReactNode;
}

export const FilterSheet = ({
  visible,
  title,
  items,
  selectedId,
  onApply,
  onClose,
  sectionLabel,
}: {
  visible: boolean;
  title: string;
  items: SheetItem[];
  selectedId: string | null;
  onApply: (id: string) => void;
  onClose: () => void;
  sectionLabel?: string;
}) => {
  const [draft, setDraft] = useState<string | null>(selectedId);
  useEffect(() => {
    if (visible) setDraft(selectedId);
  }, [visible, selectedId]);
  return (
    <SheetFrame visible={visible} title={title} onClose={onClose}>
      {sectionLabel ? <Text style={st.sectionLabel}>{sectionLabel}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={i => i.id || 'all'}
        style={{maxHeight: 360}}
        renderItem={({item}) => {
          const sel = (draft ?? '') === item.id;
          return (
            <Row
              label={item.label}
              count={item.count}
              selected={sel}
              icon={item.icon ? item.icon(sel ? '#0C4D91' : '#192546') : null}
              onPress={() => setDraft(item.id)}
            />
          );
        }}
      />
      <ContinueButton
        onPress={() => {
          onApply(draft ?? '');
          onClose();
        }}
      />
    </SheetFrame>
  );
};

// ─── Multi-select filter sheet (tags) ───────────────────────────────────────
export const MultiFilterSheet = ({
  visible,
  title,
  sectionLabel,
  items,
  selectedIds,
  onApply,
  onClose,
}: {
  visible: boolean;
  title: string;
  sectionLabel?: string;
  items: SheetItem[];
  selectedIds: string[];
  onApply: (ids: string[]) => void;
  onClose: () => void;
}) => {
  const [draft, setDraft] = useState<string[]>(selectedIds);
  useEffect(() => {
    if (visible) setDraft(selectedIds);
  }, [visible, selectedIds]);
  const toggle = (id: string) =>
    setDraft(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
  return (
    <SheetFrame visible={visible} title={title} onClose={onClose}>
      {sectionLabel ? <Text style={st.sectionLabel}>{sectionLabel}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        style={{maxHeight: 360}}
        renderItem={({item}) => (
          <Row
            label={item.label}
            count={item.count}
            selected={draft.includes(item.id)}
            onPress={() => toggle(item.id)}
          />
        )}
      />
      <ContinueButton
        label="Continue"
        onPress={() => {
          onApply(draft);
          onClose();
        }}
      />
      <TouchableOpacity style={st.clearBtn} onPress={() => setDraft([])}>
        <Text style={st.clearText}>{'Clear All'}</Text>
      </TouchableOpacity>
    </SheetFrame>
  );
};

// ─── Grouped single-select-per-group filter sheet (Courses) ─────────────────
export interface SheetGroup {
  key: string; // param name
  label: string;
  items: (SheetItem & {disabled?: boolean})[];
}

export const GroupedFilterSheet = ({
  visible,
  title = 'Filters',
  groups,
  selected,
  onApply,
  onClose,
}: {
  visible: boolean;
  title?: string;
  groups: SheetGroup[];
  selected: Record<string, string>;
  onApply: (map: Record<string, string>) => void;
  onClose: () => void;
}) => {
  const [draft, setDraft] = useState<Record<string, string>>(selected);
  useEffect(() => {
    if (visible) setDraft(selected);
  }, [visible, selected]);
  const pick = (key: string, id: string) =>
    setDraft(p => {
      const n = {...p};
      if (n[key] === id) delete n[key];
      else n[key] = id;
      return n;
    });
  return (
    <SheetFrame visible={visible} title={title} onClose={onClose}>
      <ScrollView style={{maxHeight: SCREEN_HEIGHT * 0.55}} showsVerticalScrollIndicator={false}>
        {groups.map(g => (
          <View key={g.key} style={{marginBottom: 8}}>
            <Text style={st.sectionLabel}>{g.label}</Text>
            {g.items.map(it => (
              <Row
                key={it.id}
                label={it.label}
                count={it.count || null}
                disabled={it.disabled}
                selected={draft[g.key] === it.id}
                onPress={() => pick(g.key, it.id)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
      <ContinueButton
        label="Apply Filters"
        onPress={() => {
          onApply(draft);
          onClose();
        }}
      />
      <TouchableOpacity style={st.clearBtn} onPress={() => setDraft({})}>
        <Text style={st.clearText}>{'Clear filters'}</Text>
      </TouchableOpacity>
    </SheetFrame>
  );
};

// ─── Sort sheet (tap a row = select + close) ────────────────────────────────
export const SortSheet = ({
  visible,
  title = 'Sort by',
  options,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title?: string;
  options: {id: string; label: string}[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) => {
  if (!visible) return null;
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={st.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={st.sortSheet}>
          <View style={st.sortHeader}>
            <Text style={st.sortTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={st.sortCloseBtn} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={st.sortCloseIcon}>{'✕'}</Text>
            </TouchableOpacity>
          </View>
          <View style={st.sortDivider} />
          {options.map(o => (
            <TouchableOpacity
              key={o.id}
              style={st.sortRow}
              onPress={() => {
                onSelect(o.id);
                onClose();
              }}>
              <Text style={[st.sortRowText, selectedId === o.id && st.sortRowTextActive]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
};

const st = StyleSheet.create({
  // Search row — identical to ForumsScreen
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#C5C6CC',
    gap: 8,
  },
  searchInput: {flex: 1, fontSize: 14, color: '#192546', fontFamily: 'Runda'},
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#C5C6CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#46B0E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {color: '#FFFFFF', fontFamily: 'Runda', fontSize: 11, fontWeight: '700'},

  // Sheets — identical to ForumsScreen FilterSheet / SortSheet
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sheetHeader: {height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center'},
  sheetTitle: {
    color: '#0C4D91',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  closeBtn: {position: 'absolute', right: 0, padding: 4},
  closeIcon: {fontSize: 16, color: '#8F9098'},
  sectionLabel: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  row: {flexDirection: 'row', alignItems: 'center', height: 41, paddingHorizontal: 4, borderRadius: 5},
  rowActive: {backgroundColor: '#EEF7FC'},
  rowIcon: {width: 24, alignItems: 'center', marginRight: 8},
  rowTextGroup: {flexDirection: 'row', alignItems: 'baseline', flex: 1},
  rowText: {color: '#192546', fontFamily: 'Runda', fontSize: 14, fontWeight: '400', lineHeight: 18},
  rowTextActive: {color: '#0C4D91', fontWeight: '500'},
  rowCount: {color: '#8F9098', fontFamily: 'Runda', fontSize: 14},
  continueBtn: {
    marginTop: 12,
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#0C4D91',
  },
  continueText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'Runda'},
  clearBtn: {alignItems: 'center', paddingVertical: 14},
  clearText: {color: '#8F9098', fontFamily: 'Runda', fontSize: 14, fontWeight: '500'},

  sortSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
    paddingBottom: 34,
  },
  sortHeader: {
    height: 56,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sortTitle: {
    color: '#0C4D91',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  sortCloseBtn: {position: 'absolute', right: 24, padding: 2},
  sortCloseIcon: {fontSize: 18, color: '#C5C6CC'},
  sortDivider: {height: 1, width: '100%', backgroundColor: '#E8E9F1'},
  sortRow: {height: 41, width: '100%', justifyContent: 'center', paddingHorizontal: 24},
  sortRowText: {color: '#192546', fontFamily: 'Runda', fontSize: 14, fontWeight: '700'},
  sortRowTextActive: {color: '#0C4D91'},
});
