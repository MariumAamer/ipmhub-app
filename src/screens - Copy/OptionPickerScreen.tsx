/* eslint-disable prettier/prettier */
/**
 * OptionPickerScreen — full-page searchable option list. Replaces the old
 * in-place Modal dropdowns for Country and Specialities per Marium's
 * request ("clicking on the search bar opens a page with all the
 * options"). One reusable screen for both, rather than building two
 * near-identical pickers.
 *
 * Route params:
 *   title: string              — page heading
 *   options: string[]          — full option list
 *   selected?: string          — currently selected value (single-select
 *                                 highlight only — this screen is
 *                                 single-tap-select; multi-select-with-max
 *                                 stays on the calling screen, e.g.
 *                                 EditSpecialities' 5-max logic)
 *   showFlags?: boolean        — Country picker shows flag emoji per row
 *   onSelect: (value: string) => void — called on tap, then goBack()
 *
 * NOTE: "Based on your location" (seen in Marium's Country picker
 * screenshot) isn't wired — there's no confirmed geolocation source yet.
 * The section renders if the caller passes sectionItems, but nothing
 * currently does. Flag if this needs real geo-detection.
 */
import React, {useState} from 'react';
import {View, Text, StyleSheet, StatusBar, TouchableOpacity, FlatList} from 'react-native';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import {BackBtn, PageHeader, SearchBar, COUNTRY_FLAGS, sh} from '../components/editShared';

const OptionPickerScreen = ({navigation, route}: any) => {
  const {
    title = 'Select',
    options = [],
    selected = '',
    showFlags = false,
    onSelect,
    sectionLabel,
    sectionItems = [],
  } = route?.params || {};

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? options.filter((o: string) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handlePick = (value: string) => {
    onSelect?.(value);
    navigation?.goBack();
  };

  const renderRow = (item: string) => (
    <TouchableOpacity key={item} style={st.row} onPress={() => handlePick(item)}>
      <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
        {showFlags && COUNTRY_FLAGS[item] ? <Text style={{fontSize:18}}>{COUNTRY_FLAGS[item]}</Text> : null}
        <Text style={[sh.optionRowText, item === selected && st.rowTextActive]}>{item}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={st.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />
      <View style={st.content}>
        <BackBtn onPress={() => navigation?.goBack()} />
        <PageHeader title={title} subtitle="" />
        <SearchBar value={query} onChangeText={setQuery} placeholder={`Search ${title.toLowerCase()}...`} />

        {!query.trim() && sectionLabel && sectionItems.length > 0 && (
          <>
            <Text style={sh.optionSectionLabel}>{sectionLabel}</Text>
            {sectionItems.map(renderRow)}
            <View style={{height:16}} />
          </>
        )}

        <FlatList
          data={filtered}
          keyExtractor={item => item}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={{height:6}} />}
          renderItem={({item}) => renderRow(item)}
          contentContainerStyle={{paddingBottom:40}}
        />
      </View>
      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </View>
  );
};

const st = StyleSheet.create({
  container: {flex:1, backgroundColor:'#FFF'},
  content:   {flex:1, paddingHorizontal:20, paddingTop:20},
  row: {
    height:41, paddingHorizontal:20, justifyContent:'center',
    borderRadius:5, backgroundColor:'#FFF',
  },
  rowTextActive: {color:'#0C4D91', fontFamily:'Runda-Bold'},
});

export default OptionPickerScreen;
