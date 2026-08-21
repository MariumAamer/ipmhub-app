/* eslint-disable prettier/prettier */
/**
 * EditProfileDetails — First Name, Last Name, Job Title, Company,
 * LinkedIn URL, Country, About Me
 *
 * Loads via GET /custom/v1/member-profile/{id}'s `basic` object (same
 * confirmed source MemberProfileScreen's header uses). Saves via Robby's
 * dedicated POST /custom/v1/edit-profile — replaces the old per-field
 * xProfile POST loop entirely.
 */
import React, {useState, useEffect} from 'react';
import {
  SafeAreaView, View, Text,
  StyleSheet, StatusBar, Alert, Platform,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import {
  BackBtn, PageHeader, Field, SearchableDropdown, SaveBtn, Divider, sh, BASE, COUNTRIES,
  saveEditProfileBasic,
} from '../components/editShared';
import {apiRequest} from '../api/apiClient';
import {getUserIdFromToken} from '../api/profileApi';

const EditProfileDetails = ({navigation}: any) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [fetching,   setFetching]   = useState(true);
  const [userId,     setUserId]     = useState<number|null>(null);

  const [firstName,  setFirstName]  = useState('');
  const [lastName,   setLastName]   = useState('');
  const [jobTitle,   setJobTitle]   = useState('');
  const [company,    setCompany]    = useState('');
  const [linkedin,   setLinkedin]   = useState('');
  const [country,    setCountry]    = useState('');
  const [aboutMe,    setAboutMe]    = useState('');

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setFetching(true);
    try {
      const uid = await getUserIdFromToken();
      setUserId(uid);
      if (!uid) return;

      const mp = await apiRequest(`${BASE}/custom/v1/member-profile/${uid}`);
      const basic = mp?.basic || {};

      setFirstName(basic.first_name || '');
      setLastName(basic.last_name || '');
      setJobTitle(basic.headline || '');
      setCountry(basic.country || '');
      setCompany(basic.company || '');
      setLinkedin(basic.linkedin || '');
      setAboutMe(basic.about || '');
    } catch (e) {
      console.log('[EditProfile] load error', e);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await saveEditProfileBasic(userId, {
        first_name: firstName,
        last_name: lastName,
        headline: jobTitle,
        company,
        linkedin,
        country,
        about: aboutMe,
      });

      // Keep the WP display name in sync too (separate system from the
      // custom edit-profile endpoint).
      if (firstName || lastName) {
        await apiRequest(`${BASE}/wp/v2/users/${userId}`, 'POST', {
          first_name: firstName,
          last_name: lastName,
          name: `${firstName} ${lastName}`.trim(),
        }).catch(() => {});
      }

      Alert.alert('Success', 'Profile updated successfully!');
      navigation?.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
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
          title="Profile"
          subtitle="Update your personal details and professional summary."
        />
        <Divider />

        {fetching ? (
          <Text style={st.loading}>{'Loading...'}</Text>
        ) : (
          <>
            <Field label="First Name" value={firstName} onChangeText={setFirstName}
              placeholder="First Name" required />
            <Field label="Last Name" value={lastName} onChangeText={setLastName}
              placeholder="Last Name" required />
            <Field label="Job Title" value={jobTitle} onChangeText={setJobTitle}
              placeholder="e.g. Project Manager" required />
            <Field label="Company" value={company} onChangeText={setCompany}
              placeholder="e.g. Company Name" required />
            <Field label="LinkedIn URL" value={linkedin} onChangeText={setLinkedin}
              placeholder="https://linkedin.com/in/yourname" info keyboardType="url" />
            <SearchableDropdown label="Country" value={country} options={COUNTRIES} onSelect={setCountry} showFlags navigation={navigation} />
            <Field label="About Me" value={aboutMe} onChangeText={setAboutMe}
              placeholder="Write a short bio about yourself..." multiline />
          </>
        )}

        <SaveBtn onPress={handleSave} loading={loading} />
        <View style={{height: 40}} />
      </KeyboardAwareScrollView>

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  container: {flex:1, backgroundColor:'#FFF'},
  content:   {paddingHorizontal:20, paddingTop:20, paddingBottom:40},
  loading:   {color:'#888', textAlign:'center', marginTop:40},
});

export default EditProfileDetails;
