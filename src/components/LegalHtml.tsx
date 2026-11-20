/* eslint-disable prettier/prettier */
/**
 * LegalHtml — draws the small HTML bodies of the legal screens (Community
 * Guidelines, Privacy Policy: headings, paragraphs, list items, <br>, links,
 * bold) as native Runda Text, per Figma:
 *   heading  → Heading/H3  Runda 500, 16/20, letter-spacing 0.08, #0C4D91
 *   body     → Body M      Runda 400, 14/18, Navy
 * Anything else in the HTML is ignored (tags stripped, text kept).
 */
import React from 'react';
import {Linking, StyleSheet, Text, View} from 'react-native';

const NAVY = '#192546';
const DARK_BLUE = '#0C4D91';
const LINK = '#46B0E3';

// ─── Tiny HTML → blocks parser (headings, paragraphs, list items, links, bold) ─
interface Run {
  text: string;
  href?: string;
  bold?: boolean;
}
export interface Block {
  kind: 'heading' | 'para' | 'bullet';
  runs: Run[];
}

const decodeEntities = (s: string): string =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCharCode(parseInt(n, 16)));

export const parseBlocks = (html: string): Block[] => {
  const blocks: Block[] = [];
  let kind: Block['kind'] = 'para';
  let cur: Run[] | null = null;
  let href: string | undefined;
  let bold = 0;

  const flush = () => {
    if (cur) {
      const runs = cur.filter(r => r.text.length > 0);
      if (runs.length) {
        runs[0] = {...runs[0], text: runs[0].text.replace(/^\s+/, '')};
        const last = runs.length - 1;
        runs[last] = {...runs[last], text: runs[last].text.replace(/\s+$/, '')};
        if (runs.some(r => r.text.trim())) blocks.push({kind, runs});
      }
    }
    cur = null;
  };
  const open = (k: Block['kind']) => {
    flush();
    kind = k;
    cur = [];
  };

  html.split(/(<[^>]+>)/g).forEach(tok => {
    if (!tok) return;
    if (tok[0] === '<') {
      const m = /^<\s*(\/)?\s*([a-z0-9]+)([^>]*)>/i.exec(tok);
      if (!m) return;
      const closing = !!m[1];
      const tag = m[2].toLowerCase();
      if (/^h[1-6]$/.test(tag)) closing ? flush() : open('heading');
      else if (tag === 'p' || tag === 'div') closing ? flush() : open('para');
      else if (tag === 'li') closing ? flush() : open('bullet');
      else if (tag === 'br') cur?.push({text: '\n'});
      else if (tag === 'a') {
        href = closing ? undefined : /href\s*=\s*["']([^"']+)["']/i.exec(m[3])?.[1];
      } else if (tag === 'strong' || tag === 'b') bold += closing ? -1 : 1;
      return;
    }
    const text = decodeEntities(tok).replace(/\s+/g, ' ');
    if (!cur) {
      if (!text.trim()) return;
      open('para');
    }
    cur!.push({text, href, bold: bold > 0});
  });
  flush();
  return blocks;
};

const openLink = (url: string) => Linking.openURL(url).catch(() => {});


export const LegalHtml = ({blocks}: {blocks: Block[]}) => (
  <View style={styles.content}>
    {blocks.map((b, i) => (
      <Text key={i} style={b.kind === 'heading' ? styles.subHeading : styles.bodyText}>
        {b.kind === 'bullet' ? '\u2022  ' : ''}
        {b.runs.map((r, j) => (
          <Text
            key={j}
            style={[r.bold && styles.bold, !!r.href && styles.link]}
            onPress={r.href ? () => openLink(r.href as string) : undefined}>
            {r.text}
          </Text>
        ))}
      </Text>
    ))}
  </View>
);

/** "2026-09-04T10:00:00" → "4 September 2026" ('' if it can't be read). */
export const formatLongDate = (iso?: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return '';
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const month = months[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : '';
};

const styles = StyleSheet.create({
  content: {marginTop: 4},
  // Heading/H3: Runda 500, 16/20, letter-spacing 0.08, Dark Blue #0C4D91
  subHeading: {
    fontFamily: 'Runda-Medium',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.08,
    color: DARK_BLUE,
    marginTop: 16,
    marginBottom: 8,
  },
  // Body/Body M: Runda 400, 14/18, Navy
  bodyText: {
    fontFamily: 'Runda-Normal',
    fontSize: 14,
    lineHeight: 18,
    color: NAVY,
    marginBottom: 8,
  },
  bold: {fontFamily: 'Runda-Medium'},
  link: {color: LINK, fontFamily: 'Runda-Medium'},
});
