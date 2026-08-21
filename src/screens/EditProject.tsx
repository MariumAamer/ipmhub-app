/* eslint-disable prettier/prettier */
/**
 * EditProjects — Project image, Name, Role, Organisation,
 * Start/End Date, Specialities tags, Description. Multiple entries.
 *
 * Loads via GET /custom/v1/member-profile/{id}'s `projects` array. Saves
 * via Robby's dedicated POST /custom/v1/edit-profile/projects, which
 * takes the whole entries array directly, includes a real per-project
 * `specialities` field (previously this had NO confirmed backend field at
 * all — the old version kept the picker UI local-only to avoid
 * accidentally overwriting the profile-level Specialities selection),
 * and real image upload support (image_base64/image_filename).
 */
import React, {useState, useEffect} from 'react';
import {
  SafeAreaView, View, Text, StyleSheet,
  StatusBar, Alert, TouchableOpacity, Platform,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import {
  BackBtn, PageHeader, Field, DateRow, ImageUpload,
  SaveBtn, AddMoreBtn, AddSpecialityBtn, Divider, sh, ALL_SPECIALITIES,
  BASE, saveEditProfileProjects, pickImage,
} from '../components/editShared';
import {apiRequest} from '../api/apiClient';
import {getUserIdFromToken} from '../api/profileApi';

interface ProjEntry {
  id: string;
  imageUri?: string;
  imageBase64?: string;
  imageFilename?: string;
  projectName: string;
  roleInProject: string;
  organisationName: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  specialities: string[];
  description: string;
}

const newEntry = (): ProjEntry => ({
  id: Date.now().toString(),
  projectName: '', roleInProject: '', organisationName: '',
  startMonth: '', startYear: '', endMonth: '', endYear: '',
  specialities: [], description: '',
});

const EditProjects = ({navigation}: any) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [userId,     setUserId]     = useState<number | null>(null);
  const [entries,    setEntries]    = useState<ProjEntry[]>([newEntry()]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const uid = await getUserIdFromToken();
      setUserId(uid);
      if (!uid) return;
      const mp = await apiRequest(`${BASE}/custom/v1/member-profile/${uid}`);
      const loaded: ProjEntry[] = (mp?.projects || []).map((p: any) => ({
        id: Date.now().toString() + Math.random(),
        projectName: p.name || '',
        roleInProject: p.role || '',
        organisationName: p.organisation || '',
        startMonth: p.start_month || '',
        startYear: p.start_year || '',
        endMonth: p.end_month || '',
        endYear: p.end_year || '',
        specialities: p.specialities || [],
        description: p.description || '',
        imageUri: p.image_url || undefined,
      }));
      if (loaded.length > 0) setEntries(loaded);
    } catch (e) { console.log('[EditProj] load', e); }
  };

  const update = (id: string, key: keyof ProjEntry, val: any) =>
    setEntries(prev => prev.map(e => e.id === id ? {...e, [key]: val} : e));

  const openSpecialityPicker = (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    navigation?.navigate('OptionPicker', {
      title: 'Specialities',
      options: ALL_SPECIALITIES.filter(s => !entry.specialities.includes(s)),
      onSelect: (val: string) => {
        setEntries(prev => prev.map(e =>
          e.id === entryId && !e.specialities.includes(val)
            ? {...e, specialities: [...e.specialities, val]}
            : e,
        ));
      },
    });
  };

  const removeSpeciality = (entryId: string, spec: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (entry) update(entryId, 'specialities', entry.specialities.filter(s => s !== spec));
  };

  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const payload = entries.slice(0, 5).map(entry => {
        const e: any = {
          name: entry.projectName,
          role: entry.roleInProject,
          organisation: entry.organisationName,
          start_month: entry.startMonth,
          start_year: entry.startYear,
          end_month: entry.endMonth,
          end_year: entry.endYear,
          description: entry.description,
          specialities: entry.specialities,
        };
        if (entry.imageBase64) {
          e.image_base64 = entry.imageBase64;
          e.image_filename = entry.imageFilename;
        }
        return e;
      });

      await saveEditProfileProjects(userId, payload);
      Alert.alert('Success', 'Projects saved!');
      navigation?.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={st.container}>
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
        <PageHeader
          title="Projects"
          subtitle="Showcase projects you've worked on and your contributions."
        />
        <Divider />

        {entries.map((entry, idx) => (
          <View key={entry.id}>
            {idx > 0 && (
              <View style={st.entryHeader}>
                <Text style={st.entryNum}>{`Project ${idx + 1}`}</Text>
                <TouchableOpacity onPress={() => setEntries(p => p.filter(e => e.id !== entry.id))}>
                  <Text style={st.removeText}>{'Remove'}</Text>
                </TouchableOpacity>
              </View>
            )}

            <ImageUpload
              label="Project Image"
              imageUri={entry.imageUri}
              placeholder={require('../assets/images/projectslogo.png')}
              onChangePicture={() => pickImage(({uri, base64, filename}) =>
                setEntries(prev => prev.map(e => e.id === entry.id
                  ? {...e, imageUri: uri, imageBase64: base64, imageFilename: filename}
                  : e,
                )),
              )}
              onDeletePicture={() => setEntries(prev => prev.map(e => e.id === entry.id
                ? {...e, imageUri: undefined, imageBase64: undefined, imageFilename: undefined}
                : e,
              ))}
            />

            <Field
              label="Project Name" required
              value={entry.projectName}
              onChangeText={v => update(entry.id, 'projectName', v)}
              placeholder="Ex: Corporate Website Redesign..."
            />
            <Field
              label="Role in Project" required
              value={entry.roleInProject}
              onChangeText={v => update(entry.id, 'roleInProject', v)}
              placeholder="Ex: Project Manager"
            />
            <Field
              label="Organisation Name" required
              value={entry.organisationName}
              onChangeText={v => update(entry.id, 'organisationName', v)}
              placeholder="Ex: Tesla"
            />

            <DateRow
              label="Start Date" required
              month={entry.startMonth} year={entry.startYear}
              onMonth={v => update(entry.id, 'startMonth', v)}
              onYear={v => update(entry.id, 'startYear', v)}
            />
            <DateRow
              label="End Date"
              month={entry.endMonth} year={entry.endYear}
              onMonth={v => update(entry.id, 'endMonth', v)}
              onYear={v => update(entry.id, 'endYear', v)}
            />

            {/* Specialities — now actually persisted, via Robby's new
                per-project specialities field. */}
            <View style={sh.fieldWrap}>
              <Text style={sh.fieldLabel}>{'Specialities'}</Text>
              {entry.specialities.length > 0 && (
                <View style={st.tagsRow}>
                  {entry.specialities.map(sp => (
                    <TouchableOpacity
                      key={sp} style={st.tag}
                      onPress={() => removeSpeciality(entry.id, sp)}>
                      <Text style={st.tagText}>{`${sp}  ✕`}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <AddSpecialityBtn onPress={() => openSpecialityPicker(entry.id)} />
            </View>

            <Field
              label="Description"
              value={entry.description}
              onChangeText={v => update(entry.id, 'description', v)}
              placeholder="Describe the project..."
              multiline
            />

            {idx < entries.length - 1 && <Divider />}
          </View>
        ))}

        {entries.length < 5 && <AddMoreBtn onPress={() => setEntries(p => [...p, newEntry()])} />}
        <SaveBtn onPress={handleSave} loading={loading} />
        <View style={{height: 40}} />
      </KeyboardAwareScrollView>
      <ProfileDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigation={navigation}
      />
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  container: {flex:1, backgroundColor:'#FFF'},
  content: {paddingHorizontal:20, paddingTop:20, paddingBottom:40},
  entryHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  entryNum: {fontSize:14, fontFamily:'Runda-Bold', color:'#192546', letterSpacing:0.09},
  removeText: {fontSize:13, color:'#ED3241', fontFamily:'Runda-Bold'},
  tagsRow:     {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10},
  tag:         {backgroundColor: '#E8F1FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6},
  tagText:     {fontSize: 12, color: '#0C4D91', fontFamily:'Runda-Bold'},
});

export default EditProjects;
