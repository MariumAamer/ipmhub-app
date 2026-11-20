/* eslint-disable prettier/prettier */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator} from 'react-native';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import BackButton from '../components/BackButton';
import {LegalHtml, parseBlocks} from '../components/LegalHtml';

const NAVY = '#192546';
const DARK_BLUE = '#0C4D91';
const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';

// ─── Privacy Policy Screen ─────────────────────────────────────────────────────
// Fetches the site's WP privacy-policy page (standard WordPress page, no
// custom endpoint) and draws it like the Community Guidelines screen: title,
// then the page text. Layout/typography per Figma: 16 side padding, H2 title,
// H3 blue section headings, Body M text.
// No "Last updated" line for now (the page has no date of its own; add it back
// when the backend provides a fixed one).
const PrivacyPolicyScreen = ({navigation}: any) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [html, setHtml] = useState('');
  const [error, setError] = useState(false);

  const loadPrivacyPolicy = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${BASE}/wp/v2/pages?slug=privacy-policy`);
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      const page = Array.isArray(data) ? data[0] : null;
      const content = page?.content?.rendered || '';
      if (!content) throw new Error('No content');
      // Drops WP's auto-generated "Suggested text:" boilerplate prefix.
      setHtml(content.replace(/Suggested text:\s*/gi, ''));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrivacyPolicy();
  }, [loadPrivacyPolicy]);

  const blocks = useMemo(() => parseBlocks(html), [html]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <BackButton style={styles.backBtn} onPress={() => navigation?.goBack()} />

        <Text style={styles.pageTitle}>{'Privacy Policy'}</Text>

        {loading ? (
          <ActivityIndicator color={DARK_BLUE} style={styles.loader} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {"We couldn't load the privacy policy right now. Please try again shortly."}
            </Text>
            <TouchableOpacity onPress={loadPrivacyPolicy} activeOpacity={0.7}>
              <Text style={styles.retry}>{'Try again'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <LegalHtml blocks={blocks} />
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  scrollContent: {paddingHorizontal: 16, paddingTop: 20},
  // Only layout here — BackButton already draws its own bordered 28x28 box.
  backBtn: {alignSelf: 'flex-start', marginBottom: 20},
  // Heading/H2: Runda 700, 18, letter-spacing 0.09, Navy
  pageTitle: {
    fontFamily: 'Runda-Bold',
    fontSize: 18,
    color: NAVY,
    letterSpacing: 0.09,
    marginBottom: 16,
  },
  loader: {marginTop: 40},
  errorBox: {paddingTop: 12},
  errorText: {fontFamily: 'Runda-Normal', fontSize: 14, lineHeight: 18, color: NAVY, marginBottom: 8},
  retry: {fontFamily: 'Runda-Medium', fontSize: 14, color: DARK_BLUE, marginTop: 4},
  bottomSpace: {height: 40},
});

export default PrivacyPolicyScreen;
