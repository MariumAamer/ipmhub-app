/**
 * EditCredential — Credential image, Credential Name, Country, Organisation Name.
 * Multiple entries supported.
 *
 * Save now uses Robby's dedicated POST /custom/v1/edit-profile/credentials
 * (entries array + real image_base64/image_filename upload support).
 *
 * Load still uses the old xProfile field-ID read (group 7 "Certificates",
 * confirmed IDs: image=1188, credentialName=1193, organisationName=1198,
 * location=1203) — the new consolidated /custom/v1/member-profile/{id}
 * endpoint doesn't have a "credentials" array (its "certifications" field
 * is a different concept — earned course certificates, not self-entered
 * credentials), so there's no confirmed new read source for this yet.
 *
 * NOTE on "Country": the real backend field (1203) is called "Location"
 * and is a plain textbox — there's no country taxonomy field on the load
 * side. Kept the SearchableDropdown/flag UX since it's a reasonable layer
 * over a free-text field.
 */
import React, {useState, useEffect} from 'react';
import {SafeAreaView,ScrollView,View,Text,StyleSheet,StatusBar,Alert,TouchableOpacity} from 'react-native';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import {BackBtn,PageHeader,Field,SearchableDropdown,ImageUpload,SaveBtn,AddMoreBtn,Divider,COUNTRIES,loadXProfileGroups,saveEditProfileCredentials,pickImage} from '../components/editShared';
import {getUserIdFromToken} from '../api/profileApi';

interface CredEntry {
  id: string; imageUri?: string;
  imageBase64?: string; imageFilename?: string;
  credentialName: string; country: string; organisationName: string;
}

const newEntry = (): CredEntry => ({
  id: Date.now().toString(),
  credentialName:'', country:'', organisationName:'',
});

// Confirmed real field IDs (Postman, group 7 "Certificates", first entry) — load only.
const FIELD = {
  image: 1188,
  credentialName: 1193,
  organisationName: 1198,
  location: 1203,
};

const EditCredential = ({navigation}: any) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [userId, setUserId]         = useState<number|null>(null);
  const [entries, setEntries]       = useState<CredEntry[]>([newEntry()]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const uid = await getUserIdFromToken();
      setUserId(uid);
      if (!uid) return;
      const groups = await loadXProfileGroups(uid);
      const byId: Record<number, string> = {};
      for (const gk of Object.keys(groups)) {
        const fields = groups[gk]?.fields || {};
        for (const fk of Object.keys(fields)) {
          byId[Number(fk)] = fields[fk]?.value?.raw || '';
        }
      }

      setEntries(prev => {
        const u = [...prev];
        u[0] = {
          ...u[0],
          credentialName: byId[FIELD.credentialName] || '',
          country: byId[FIELD.location] || '',
          organisationName: byId[FIELD.organisationName] || '',
        };
        return u;
      });
    } catch (e) { console.log('[EditCred] load', e); }
  };

  const update = (id: string, key: keyof CredEntry, val: any) =>
    setEntries(prev => prev.map(e => e.id === id ? {...e, [key]: val} : e));

  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const payload = entries.slice(0, 5).map(entry => {
        const e: any = {
          name: entry.credentialName,
          organisation: entry.organisationName,
          country: entry.country,
        };
        if (entry.imageBase64) {
          e.image_base64 = entry.imageBase64;
          e.image_filename = entry.imageFilename;
        }
        return e;
      });

      await saveEditProfileCredentials(userId, payload);
      Alert.alert('Success', 'Credential saved!');
      navigation?.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={st.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <BackBtn onPress={() => navigation?.goBack()} />
        <PageHeader title="Credential" subtitle="Manage your certifications, badges, memberships, and PDUs." />
        <Divider />

        {entries.map((entry, idx) => (
          <View key={entry.id}>
            {idx > 0 && (
              <View style={st.entryHeader}>
                <Text style={st.entryNum}>{`Credential ${idx + 1}`}</Text>
                <TouchableOpacity onPress={() => setEntries(p => p.filter(e => e.id !== entry.id))}>
                  <Text style={st.removeText}>{'Remove'}</Text>
                </TouchableOpacity>
              </View>
            )}
            <ImageUpload
              label="Credential Image"
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
            <Field label="Credential Name" value={entry.credentialName} onChangeText={v => update(entry.id,'credentialName',v)} placeholder="Ex: Corporate Website Redesign and Migra..." required />
            <SearchableDropdown label="Country" value={entry.country} options={COUNTRIES} onSelect={v => update(entry.id,'country',v)} required showFlags={true} navigation={navigation} />
            <Field label="Organisation Name" value={entry.organisationName} onChangeText={v => update(entry.id,'organisationName',v)} placeholder="Ex: Tesla" required />
            {idx < entries.length - 1 && <Divider />}
          </View>
        ))}

        <AddMoreBtn onPress={() => setEntries(p => [...p, newEntry()])} />
        <SaveBtn onPress={handleSave} loading={loading} />
        <View style={{height:40}} />
      </ScrollView>
      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  container: {flex:1, backgroundColor:'#FFF'},
  content: {paddingHorizontal:20, paddingTop:20, paddingBottom:40},
  entryHeader: {flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12},
  entryNum: {fontSize:14, fontFamily:'Runda-Bold', color:'#192546', letterSpacing:0.09},
  removeText: {fontSize:13, color:'#ED3241', fontFamily:'Runda-Bold'},
});

export default EditCredential;
