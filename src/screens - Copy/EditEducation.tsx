/* eslint-disable prettier/prettier */
/**
 * EditEducation — Institution logo, Institution, Degree, Field of Study,
 * Currently Studying checkbox, Start/End Date, Description. Multiple entries.
 *
 * Loads via GET /custom/v1/member-profile/{id}'s `education` array. Saves
 * via Robby's dedicated POST /custom/v1/edit-profile/education, which
 * takes the whole entries array directly and includes real image upload
 * support (logo_base64/logo_filename) — replaces the old fixed-repeater-
 * slot xProfile field ID approach entirely.
 */
import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, StatusBar, Alert, TouchableOpacity, Platform} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import {BackBtn,PageHeader,Field,DateRow,Checkbox,ImageUpload,SaveBtn,AddMoreBtn,Divider,BASE,saveEditProfileEducation,pickImage} from '../components/editShared';
import {apiRequest} from '../api/apiClient';
import {getUserIdFromToken} from '../api/profileApi';

interface EduEntry {
  id: string; logoUri?: string;
  logoBase64?: string; logoFilename?: string;
  institution: string; degree: string; fieldOfStudy: string;
  currentlyStudying: boolean;
  startMonth: string; startYear: string;
  endMonth: string; endYear: string;
  description: string;
}

const newEntry = (): EduEntry => ({
  id: Date.now().toString(),
  institution:'', degree:'', fieldOfStudy:'', currentlyStudying:false,
  startMonth:'', startYear:'', endMonth:'', endYear:'', description:'',
});

const EditEducation = ({navigation}: any) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [userId, setUserId]         = useState<number|null>(null);
  const [entries, setEntries]       = useState<EduEntry[]>([newEntry()]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const uid = await getUserIdFromToken();
      setUserId(uid);
      if (!uid) return;
      const mp = await apiRequest(`${BASE}/custom/v1/member-profile/${uid}`);
      const loaded: EduEntry[] = (mp?.education || []).map((ed: any) => ({
        id: Date.now().toString() + Math.random(),
        institution: ed.institution_name || '',
        degree: ed.degree || '',
        fieldOfStudy: ed.field_of_study || '',
        currentlyStudying: !!ed.currently_studying,
        startMonth: ed.start_month || '',
        startYear: ed.start_year || '',
        endMonth: ed.end_month || '',
        endYear: ed.end_year || '',
        description: ed.description || '',
        logoUri: ed.institution_logo_url || undefined,
      }));
      if (loaded.length > 0) setEntries(loaded);
    } catch (e) { console.log('[EditEdu] load', e); }
  };

  const update = (id: string, key: keyof EduEntry, val: any) =>
    setEntries(prev => prev.map(e => e.id === id ? {...e, [key]: val} : e));

  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const payload = entries.slice(0, 5).map(entry => {
        const e: any = {
          institution_name: entry.institution,
          degree: entry.degree,
          field_of_study: entry.fieldOfStudy,
          start_month: entry.startMonth,
          start_year: entry.startYear,
          currently_studying: entry.currentlyStudying,
          description: entry.description,
        };
        if (!entry.currentlyStudying) {
          e.end_month = entry.endMonth;
          e.end_year = entry.endYear;
        }
        if (entry.logoBase64) {
          e.logo_base64 = entry.logoBase64;
          e.logo_filename = entry.logoFilename;
        }
        return e;
      });

      await saveEditProfileEducation(userId, payload);
      Alert.alert('Success', 'Education saved!');
      navigation?.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save.');
    } finally { setLoading(false); }
  };

  return (
    <View style={st.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />
      <KeyboardAwareScrollView
        contentContainerStyle={st.content}
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 0}
        keyboardOpeningTime={0}
        keyboardShouldPersistTaps="handled">
        <BackBtn onPress={() => navigation?.goBack()} />
        <PageHeader title="Education" subtitle="Add your qualifications, certifications, and training history." />
        <Divider />

        {entries.map((entry, idx) => (
          <View key={entry.id}>
            {idx > 0 && (
              <View style={st.entryHeader}>
                <Text style={st.entryNum}>{`Education ${idx + 1}`}</Text>
                <TouchableOpacity onPress={() => setEntries(p => p.filter(e => e.id !== entry.id))}>
                  <Text style={st.removeText}>{'Remove'}</Text>
                </TouchableOpacity>
              </View>
            )}
            <ImageUpload
              label="Institution Logo"
              imageUri={entry.logoUri}
              placeholder={require('../assets/images/educationlogo.png')}
              onChangePicture={() => pickImage(({uri, base64, filename}) =>
                setEntries(prev => prev.map(e => e.id === entry.id
                  ? {...e, logoUri: uri, logoBase64: base64, logoFilename: filename}
                  : e,
                )),
              )}
              onDeletePicture={() => setEntries(prev => prev.map(e => e.id === entry.id
                ? {...e, logoUri: undefined, logoBase64: undefined, logoFilename: undefined}
                : e,
              ))}
            />
            <Field label="Institution" value={entry.institution} onChangeText={v => update(entry.id,'institution',v)} placeholder="Ex: Boston University" required />
            <Field label="Degree" value={entry.degree} onChangeText={v => update(entry.id,'degree',v)} placeholder="Ex: Bachelors" required />
            <Field label="Field of Study" value={entry.fieldOfStudy} onChangeText={v => update(entry.id,'fieldOfStudy',v)} placeholder="Ex: Business" required />
            <Checkbox label="I am currently studying here" value={entry.currentlyStudying} onToggle={() => update(entry.id,'currentlyStudying',!entry.currentlyStudying)} />
            <DateRow label="Start Date" required month={entry.startMonth} year={entry.startYear} onMonth={v => update(entry.id,'startMonth',v)} onYear={v => update(entry.id,'startYear',v)} />
            {!entry.currentlyStudying && (
              <DateRow label="End Date" month={entry.endMonth} year={entry.endYear} onMonth={v => update(entry.id,'endMonth',v)} onYear={v => update(entry.id,'endYear',v)} />
            )}
            <Field label="Description" value={entry.description} onChangeText={v => update(entry.id,'description',v)} placeholder="Write a short description..." multiline />
            {idx < entries.length - 1 && <Divider />}
          </View>
        ))}

        {entries.length < 5 && <AddMoreBtn onPress={() => setEntries(p => [...p, newEntry()])} />}
        <SaveBtn onPress={handleSave} loading={loading} />
        <View style={{height:40}} />
      </KeyboardAwareScrollView>
      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </View>
  );
};

const st = StyleSheet.create({
  container: {flex:1, backgroundColor:'#FFF'},
  content: {paddingHorizontal:20, paddingTop:20, paddingBottom:40},
  entryHeader: {flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12},
  entryNum: {fontSize:14, fontFamily:'Runda-Bold', color:'#192546', letterSpacing:0.09},
  removeText: {fontSize:13, color:'#ED3241', fontFamily:'Runda-Bold'},
});

export default EditEducation;
