/* eslint-disable prettier/prettier */
/**
 * CommunityGuidelinesScreen — reachable from Account Settings and from the
 * Sign Up consent checkbox ("Terms of Service, Community Guidelines and
 * Privacy Policy").
 *
 * Registered in the main stack in AppNavigator and works before login: the app
 * header + drawer only show when the member is signed in (Settings version).
 *
 * The text comes from the Hub (GET /custom/v1/community-guidelines → title,
 * updated_label, html), so legal can change it without an app release. The
 * HTML is small (h3 / p / a) so it's drawn as native Text in Runda to match
 * the other legal screens, instead of in a WebView.
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import BackButton from '../components/BackButton';
import {getToken} from '../api/apiClient';
import {getCommunityGuidelines, CommunityGuidelines} from '../api/guidelinesApi';
import {LegalHtml, parseBlocks} from '../components/LegalHtml';

const NAVY = '#192546';
const DARK_BLUE = '#0C4D91';

const CommunityGuidelinesScreen = ({navigation}: any) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [data, setData] = useState<CommunityGuidelines | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getCommunityGuidelines());
    } catch (e: any) {
      setError(e?.message || 'Could not load the Community Guidelines.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    getToken().then(t => setSignedIn(!!t));
  }, [load]);

  const blocks = useMemo(() => (data ? parseBlocks(data.html) : []), [data]);
  const updated = data?.updatedLabel
    ? /^last updated/i.test(data.updatedLabel)
      ? data.updatedLabel
      : `Last updated: ${data.updatedLabel}`
    : '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {signedIn && (
        <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, !signedIn && styles.scrollContentNoHeader]}>
        <BackButton style={styles.backBtn} onPress={() => navigation?.goBack()} />

        <Text style={styles.pageTitle}>{data?.title || 'Community Guidelines'}</Text>
        {!!updated && <Text style={styles.updated}>{updated}</Text>}

        {loading ? (
          <ActivityIndicator color={DARK_BLUE} style={styles.loader} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={load} activeOpacity={0.7}>
              <Text style={styles.retry}>{'Try again'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <LegalHtml blocks={blocks} />
        )}
        <View style={styles.bottomSpace} />
      </ScrollView>

      {signedIn && (
        <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  scrollContent: {paddingHorizontal: 16, paddingTop: 20},
  scrollContentNoHeader: {paddingTop: 46},
  backBtn: {alignSelf: 'flex-start', marginBottom: 20},
  // Heading/H2: Runda 700, 18, letter-spacing 0.09, Navy
  pageTitle: {
    fontFamily: 'Runda-Bold',
    fontSize: 18,
    color: NAVY,
    letterSpacing: 0.09,
    marginBottom: 8,
  },
  // Body/Body S: Runda 400, 12/16, Neutral Dark Lightest #8F9098
  updated: {fontFamily: 'Runda-Normal', fontSize: 12, lineHeight: 16, color: '#8F9098', marginBottom: 12},
  loader: {marginTop: 40},
  errorBox: {paddingTop: 12},
  errorText: {fontFamily: 'Runda-Normal', fontSize: 14, lineHeight: 18, color: NAVY, marginBottom: 8},
  retry: {fontFamily: 'Runda-Medium', fontSize: 14, color: DARK_BLUE, marginTop: 4},
  bottomSpace: {height: 40},
});

export default CommunityGuidelinesScreen;
