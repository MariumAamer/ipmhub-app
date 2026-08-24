/* eslint-disable prettier/prettier */
/**
 * EditSpecialities — tap-to-select specialities, max 5.
 *
 * Field IDs CONFIRMED via Postman against a real account: Specialities
 * are NOT one comma-joined field — they're 5 SEPARATE standalone textbox
 * fields tacked onto the end of group 6 ("Projects"): "Speciality"=1254,
 * "Speciality (1)"=1255, "Speciality (2)"=1256, "Speciality (3)"=1257,
 * "Speciality (4)"=1258. Each holds exactly one speciality string. The
 * old version wrote everything as one comma-joined value into whichever
 * field name loosely matched a keyword — wrong shape entirely, and (worse)
 * that keyword search could accidentally land on the SAME fields
 * EditProject.tsx's old per-project speciality save was also hitting —
 * see the note in EditProject.tsx. Load/save now target these 5 fields
 * directly, one speciality per field, in order.
 *
 * CHANGE: the search bar no longer shows an inline live-typing dropdown —
 * tapping it now navigates to the full-page OptionPicker (same shared
 * screen Country uses), matching Marium's "clicking on the search bar
 * opens a page with all the options" request. Selecting an item there
 * calls back into addOne() and returns here immediately.
 */
import React, {useState, useEffect} from 'react';
import {ScrollView, View, Text, StyleSheet, StatusBar, Alert, TouchableOpacity} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import {BackBtn, PageHeader, SaveBtn, sh, BASE, ALL_SPECIALITIES, TagCloseIcon, saveEditProfileSpecialities} from '../components/editShared';
import {apiRequest} from '../api/apiClient';
import {getUserIdFromToken} from '../api/profileApi';

const EditSpecialities = ({navigation}: any) => {
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [userId,      setUserId]      = useState<number | null>(null);
  const [selected,    setSelected]    = useState<string[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const uid = await getUserIdFromToken();
      setUserId(uid);
      if (!uid) return;
      // The consolidated /custom/v1/member-profile/{id} endpoint returns
      // a clean specialities array. The 5-cap here is a product decision
      // (matches "Choose your five main areas" copy), not a backend
      // limitation anymore — Robby's dedicated save endpoint
      // (saveEditProfileSpecialities) takes a real array, not fixed field
      // slots.
      const mp = await apiRequest(`${BASE}/custom/v1/member-profile/${uid}`);
      const values: string[] = (mp?.specialities || []).slice(0, 5);
      setSelected(values);
    } catch (e) { console.log('[EditSpec]', e); }
  };

  const addOne = (item: string) => {
    setSelected(prev => {
      if (prev.includes(item)) return prev;
      if (prev.length >= 5) {
        Alert.alert('Limit reached', 'You can select up to 5 specialities.');
        return prev;
      }
      return [...prev, item];
    });
  };

  const removeOne = (item: string) => setSelected(prev => prev.filter(s => s !== item));

  const openPicker = () => {
    if (selected.length >= 5) {
      Alert.alert('Limit reached', 'You can select up to 5 specialities. Remove one to add another.');
      return;
    }
    navigation?.navigate('OptionPicker', {
      title: 'Specialities',
      options: ALL_SPECIALITIES.filter(s => !selected.includes(s)),
      onSelect: addOne,
    });
  };

  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Robby's dedicated endpoint — replaces the old direct write to
      // fields 1254-1258. That old approach genuinely saved the data
      // correctly (confirmed via Postman) but never showed up anywhere
      // afterward — web-saved specialities always worked, app-saved ones
      // never did. This endpoint is the one powering web's own save, so
      // it should close that gap for good.
      await saveEditProfileSpecialities(userId, selected);
      Alert.alert('Success', 'Specialities saved!');
      navigation?.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save.');
    } finally { setLoading(false); }
  };

  const proposed = ALL_SPECIALITIES.filter(s => !selected.includes(s)).slice(0, 12);

  return (
    <View style={st.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      <ScrollView
        contentContainerStyle={st.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <BackBtn onPress={() => navigation?.goBack()} />
        <PageHeader
          title="Specialities"
          subtitle="Choose your five main areas of specialisation."
        />
        {/* No divider above the search bar per Marium's spec */}

        {selected.length > 0 && (
          <View style={st.selectedSection}>
            <Text style={st.selectedLabel}>{`Selected (${selected.length}/5)`}</Text>
            <View style={st.tagsWrap}>
              {selected.map(sp => (
                <TouchableOpacity key={sp} style={st.tagSelected} onPress={() => removeOne(sp)}>
                  <Text style={st.tagSelectedText}>{sp}</Text>
                  <TagCloseIcon />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Search bar — now a tap target that opens the full-page picker,
            not a live-typing inline dropdown */}
        <TouchableOpacity style={sh.searchBarWrap} onPress={openPicker} activeOpacity={0.7}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              stroke="#8F9098" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={st.searchPlaceholder}>{'Speciality (e.g. project management)'}</Text>
        </TouchableOpacity>

        <Text style={st.proposedLabel}>{'Proposed based on your profile'}</Text>
        <View style={st.proposedBox}>
          <View style={st.tagsWrap}>
            {proposed.map(sp => (
              <TouchableOpacity
                key={sp}
                style={[st.tagProposed, selected.includes(sp) && st.tagProposedSelected]}
                onPress={() => (selected.includes(sp) ? removeOne(sp) : addOne(sp))}>
                <Text style={[st.tagProposedText, selected.includes(sp) && st.tagProposedTextSelected]}>
                  {sp}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <SaveBtn onPress={handleSave} loading={loading} />
        <View style={{height: 40}} />
      </ScrollView>

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </View>
  );
};

const st = StyleSheet.create({
  container: {flex:1, backgroundColor:'#FFF'},
  content:   {paddingHorizontal:20, paddingTop:20, paddingBottom:40},

  selectedSection: {marginBottom:16},
  selectedLabel:   {fontSize:13, color:'#8F9098', marginBottom:8, fontFamily:'Runda-Normal'},

  tagsWrap: {flexDirection:'row', flexWrap:'wrap', gap:8},

  tagSelected: {
    flexDirection:'row', alignItems:'center', gap:8,
    backgroundColor:'#46B0E3', borderRadius:20,
    paddingHorizontal:14, paddingVertical:8,
  },
  tagSelectedText: {color:'#FFF', fontSize:13, fontFamily:'Runda-Bold'},

  searchPlaceholder: {flex:1, fontSize:14, fontFamily:'Runda-Normal', color:'#AAAAAA'},

  proposedLabel: {
    fontSize:14, color:'#192546', fontFamily:'Runda-Bold',
    marginTop:16, marginBottom:10,
  },
  proposedBox: {
    borderWidth:1, borderColor:'#C5C6CC', borderRadius:12,
    padding:14, marginBottom:24,
    backgroundColor:'#E8E9F1',
  },

  tagProposed: {
    backgroundColor:'#46B0E3', borderRadius:20,
    paddingHorizontal:14, paddingVertical:8,
  },
  tagProposedSelected: {
    backgroundColor:'#0C4D91',
  },
  tagProposedText:         {color:'#FFF', fontSize:13, fontFamily:'Runda-Normal'},
  tagProposedTextSelected: {color:'#FFF', fontFamily:'Runda-Bold'},
});

export default EditSpecialities;
