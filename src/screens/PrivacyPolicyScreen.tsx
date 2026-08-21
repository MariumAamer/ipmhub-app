/* eslint-disable prettier/prettier */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import BackButton from '../components/BackButton';

const NAVY = '#192546';
const DARK_BLUE = '#0C4D91';
const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';

// ─── HTML entity decode (small, targeted set — same entities WP's default
// privacy-policy boilerplate actually uses) ────────────────────────────────
const decodeEntities = (str: string): string =>
  str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');

// ─── Strip tags, preserving paragraph/list/line breaks as \n\n or \n ─────────
// Also drops WP's default "Suggested text:" boilerplate prefix that ships
// with the auto-generated privacy-policy template — not real IPM copy.
const stripHtml = (html: string): string =>
  decodeEntities(
    html
      .replace(/<\/(p|li|h[1-6])>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/Suggested text:\s*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

interface Section {
  heading: string | null;
  paragraphs: string[];
}

// ─── Split raw WP page HTML into heading/paragraph sections ─────────────────
// Same pattern as resourcesApi.ts's splitIntoSections/extractTOC — no external
// HTML-rendering library needed for a straightforward WP page. Paragraphs are
// kept as separate strings (rather than one \n\n-joined blob) so each one can
// get its own small, controlled bit of spacing instead of a double line-break.
const splitIntoSections = (html: string): Section[] => {
  const headingRegex = /<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const matches = [...html.matchAll(headingRegex)];

  const toParagraphs = (chunk: string): string[] =>
    stripHtml(chunk)
      .split('\n\n')
      .map(p => p.trim())
      .filter(Boolean);

  if (matches.length === 0) {
    return [{heading: null, paragraphs: toParagraphs(html)}];
  }

  const sections: Section[] = [];

  const firstIndex = matches[0].index ?? 0;
  const introParagraphs = toParagraphs(html.slice(0, firstIndex));
  if (introParagraphs.length) sections.push({heading: null, paragraphs: introParagraphs});

  matches.forEach((m, i) => {
    const heading = stripHtml(m[2]);
    const start = (m.index ?? 0) + m[0].length;
    const end = matches[i + 1]?.index ?? html.length;
    const paragraphs = toParagraphs(html.slice(start, end));
    sections.push({heading, paragraphs});
  });

  return sections;
};

// ─── Privacy Policy Screen ─────────────────────────────────────────────────────
// Fetches the site's existing WP privacy-policy page — this is a standard
// WordPress page (still using WP's default auto-generated boilerplate copy
// as of writing), no custom mu-plugin endpoint needed. Same fetch-by-slug
// pattern as any other WP page.
const PrivacyPolicyScreen = ({navigation}: any) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadPrivacyPolicy();
  }, []);

  const loadPrivacyPolicy = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${BASE}/wp/v2/pages?slug=privacy-policy`);
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      const page = Array.isArray(data) ? data[0] : null;
      const content = page?.content?.rendered || '';
      if (!content) throw new Error('No content');
      setSections(splitIntoSections(content));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <BackButton style={styles.backBtn} onPress={() => navigation?.goBack()} />

        <Text style={styles.pageTitle}>{'Privacy Policy'}</Text>

        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator color={DARK_BLUE} style={{marginTop: 20}} />
          ) : error ? (
            <Text style={styles.bodyText}>
              {"We couldn't load the privacy policy right now. Please try again shortly."}
            </Text>
          ) : (
            sections.map((s, i) => (
              <View key={i} style={styles.section}>
                {s.heading ? <Text style={styles.subHeading}>{s.heading}</Text> : null}
                {s.paragraphs.map((p, j) => (
                  <Text key={j} style={styles.bodyText}>{p}</Text>
                ))}
              </View>
            ))
          )}
        </View>

        <View style={{height: 40}} />
      </ScrollView>

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  scrollContent: {paddingHorizontal: 20, paddingTop: 20},
  backBtn: {
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 1, borderColor: '#E0E0E0',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  // Heading/H2 spec
  pageTitle: {
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    color: NAVY,
    letterSpacing: 0.09,
    marginBottom: 16,
  },
  // Layout spec: padding 16, column, gap 16 (between sections), self-stretch,
  // radius 8.201, no border.
  card: {
    padding: 16,
    flexDirection: 'column',
    alignSelf: 'stretch',
    gap: 16,
    borderRadius: 8.201,
  },
  // Each section (heading + its paragraphs) — small internal gap so
  // consecutive paragraphs sit close together instead of a double line-break.
  section: {alignSelf: 'stretch', gap: 8},
  // Heading/H3 spec — used for in-content subheadings (Who we are, Comments, Media, etc.)
  subHeading: {
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.08,
    color: DARK_BLUE,
  },
  // Body/Body M spec
  bodyText: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    color: NAVY,
  },
});

export default PrivacyPolicyScreen;
