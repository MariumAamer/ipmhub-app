/* eslint-disable prettier/prettier */
/**
 * EditExperience — Company Logo, Job Title, Company Name, Employment Type,
 * Location, "I am currently working in this role" checkbox, Start/End
 * Date, Description. Multiple entries.
 *
 * Loads via GET /custom/v1/member-profile/{id}'s `experience` array (clean
 * field names, no more field-ID-per-slot guessing). Saves via Robby's
 * dedicated POST /custom/v1/edit-profile/experience, which takes the
 * whole entries array directly and includes real image upload support
 * (logo_base64/logo_filename) — replaces the old fixed-5-repeater-slot
 * xProfile field ID approach entirely.
 */
import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, StatusBar, Alert, TouchableOpacity, Platform} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import {
  BackBtn, PageHeader, Field, Dropdown, Checkbox, DateRow, ImageUpload,
  SaveBtn, AddMoreBtn, Divider, EMPLOYMENT_TYPES, LOCATION_TYPES,
  BASE, saveEditProfileExperience, pickImage,
} from '../components/editShared';
import {apiRequest} from '../api/apiClient';
import {getUserIdFromToken} from '../api/profileApi';

interface ExpEntry {
  id: string;
  logoUri?: string;
  logoBase64?: string;   // only set when a NEW image is picked this session
  logoFilename?: string;
  jobTitle: string;
  company: string;
  employmentType: string;
  locationType: string;
  currentlyWorking: boolean;
  startMonth: string; startYear: string;
  endMonth: string; endYear: string;
  description: string;
}

const newEntry = (): ExpEntry => ({
  id: Date.now().toString(),
  jobTitle:'', company:'', employmentType:'', locationType:'', currentlyWorking:false,
  startMonth:'', startYear:'', endMonth:'', endYear:'', description:'',
});

const EditExperience = ({navigation}: any) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [userId, setUserId]         = useState<number|null>(null);
  const [entries, setEntries]       = useState<ExpEntry[]>([newEntry()]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const uid = await getUserIdFromToken();
      setUserId(uid);
      if (!uid) return;
      const mp = await apiRequest(`${BASE}/custom/v1/member-profile/${uid}`);
      const loaded: ExpEntry[] = (mp?.experience || []).map((e: any) => ({
        id: Date.now().toString() + Math.random(),
        jobTitle: e.job_title || '',
        company: e.company || '',
        employmentType: e.employment_type || '',
        locationType: e.location || '',
        currentlyWorking: !!e.currently_working,
        startMonth: e.start_month || '',
        startYear: e.start_year || '',
        endMonth: e.end_month || '',
        endYear: e.end_year || '',
        description: e.description || '',
        logoUri: e.company_logo_url || undefined,
      }));
      if (loaded.length > 0) setEntries(loaded);
    } catch (e) { console.log('[EditExp] load', e); }
  };

  const update = (id: string, key: keyof ExpEntry, val: any) =>
    setEntries(prev => prev.map(e => e.id === id ? {...e, [key]: val} : e));

  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const payload = entries.slice(0, 5).map(entry => {
        const e: any = {
          job_title: entry.jobTitle,
          company: entry.company,
          employment_type: entry.employmentType,
          location: entry.locationType,
          start_month: entry.startMonth,
          start_year: entry.startYear,
          currently_working: entry.currentlyWorking,
          description: entry.description,
        };
        // End date only meaningful when not currently working.
        if (!entry.currentlyWorking) {
          e.end_month = entry.endMonth;
          e.end_year = entry.endYear;
        }
        // Only include logo fields when a NEW image was picked this
        // session — otherwise the backend keeps the existing logo.
        if (entry.logoBase64) {
          e.logo_base64 = entry.logoBase64;
          e.logo_filename = entry.logoFilename;
        }
        return e;
      });

      await saveEditProfileExperience(userId, payload);
      Alert.alert('Success', 'Experience saved!');
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
        <PageHeader title="Experience" subtitle="Add your current and previous roles, companies, and achievements." />

        {entries.map((entry, idx) => (
          <View key={entry.id}>
            {idx > 0 && (
              <>
                <Divider />
                <View style={st.entryHeader}>
                  <Text style={st.entryNum}>{`Experience ${idx + 1}`}</Text>
                  <TouchableOpacity onPress={() => setEntries(p => p.filter(e => e.id !== entry.id))}>
                    <Text style={st.removeText}>{'Remove'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <ImageUpload
              label="Company Logo"
              imageUri={entry.logoUri}
              placeholder={require('../assets/images/experiencelogo.png')}
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

            <Field label="Job Title" value={entry.jobTitle} onChangeText={v => update(entry.id,'jobTitle',v)} placeholder="e.g. Project Manager" required />
            <Field label="Company Name" value={entry.company} onChangeText={v => update(entry.id,'company',v)} placeholder="e.g. Company Name" required />
            <Dropdown label="Employment Type" value={entry.employmentType} options={EMPLOYMENT_TYPES} onSelect={v => update(entry.id,'employmentType',v)} />
            <Dropdown label="Location Type" value={entry.locationType} options={LOCATION_TYPES} onSelect={v => update(entry.id,'locationType',v)} />

            <Checkbox
              label="I am currently working in this role"
              value={entry.currentlyWorking}
              onToggle={() => update(entry.id, 'currentlyWorking', !entry.currentlyWorking)}
            />

            <DateRow label="Start Date" required month={entry.startMonth} year={entry.startYear}
              onMonth={v => update(entry.id,'startMonth',v)} onYear={v => update(entry.id,'startYear',v)} />

            {/* Hidden once "currently working" is checked — same pattern as
                Education's "currently studying" toggle. */}
            {!entry.currentlyWorking && (
              <DateRow label="End Date" month={entry.endMonth} year={entry.endYear}
                onMonth={v => update(entry.id,'endMonth',v)} onYear={v => update(entry.id,'endYear',v)} />
            )}

            <Field label="Description" value={entry.description} onChangeText={v => update(entry.id,'description',v)}
              placeholder="Write your job description..." multiline />
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
  entryHeader: {flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12, marginTop:4},
  entryNum: {fontSize:14, fontFamily:'Runda-Bold', color:'#192546', letterSpacing:0.09},
  removeText: {fontSize:13, color:'#ED3241', fontFamily:'Runda-Bold'},
});

export default EditExperience;
