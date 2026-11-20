/* eslint-disable prettier/prettier */
// SocialTermsNotice — agreement line under the Apple / Google / LinkedIn
// buttons on Sign In and Sign Up (App Store 1.2).
//
// A social sign-in can create a brand-new account without ever passing the
// Sign Up checkbox, so this line is the agreement for that path: tapping a
// social button means accepting the same Terms of Service, Community
// Guidelines and Privacy Policy. Wording, links and text styles match the
// Sign Up checkbox label (Body/Body S + Action/Action M).

import React from 'react';
import {Text, StyleSheet, Linking} from 'react-native';

// Same URLs / route the Sign Up checkbox uses.
const TERMS_URL = 'https://projectmanagement.ie/terms-and-conditions/';
const PRIVACY_URL = 'https://hub.instituteprojectmanagement.com/privacy-policy/';

const SocialTermsNotice = ({navigation}: {navigation: any}) => (
  // Body/Body S: #192546 12px 400 lh 16px
  <Text style={styles.text}>
    {'By continuing, you agree to the '}
    {/* Action/Action M: #46B0E3 12px 500 */}
    <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}>
      {'Terms of Service'}
    </Text>
    {', '}
    <Text style={styles.link} onPress={() => navigation?.navigate?.('CommunityGuidelines')}>
      {'Community Guidelines'}
    </Text>
    {' and '}
    <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}>
      {'Privacy Policy'}
    </Text>
    {". IPM Hub doesn't tolerate objectionable content or abusive users."}
  </Text>
);

const styles = StyleSheet.create({
  text: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '400',
    color: '#192546',
    lineHeight: 16,
    marginTop: -4, // socialStack already adds 16 below the buttons
    marginBottom: 20,
  },
  link: {
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '500',
    color: '#46B0E3',
  },
});

export default SocialTermsNotice;
