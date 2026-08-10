/* eslint-disable prettier/prettier */
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Linking,
  TouchableOpacity,
} from 'react-native';
import Svg, {Path, Rect} from 'react-native-svg';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';

// ─── Support Icon ───────────────────────────────────────────────────────────
const SupportIcon = () => (
  <Svg width={70} height={70} viewBox="0 0 70 70" fill="none">
    <Rect width="70" height="70" rx="35" fill="#EEF7FC" />
    <Path
      d="M35.0011 15.5557C24.2872 15.5557 15.5566 24.2862 15.5566 35.0001V44.7223C15.5566 45.7918 16.4316 46.6668 17.5011 46.6668H23.3344C24.4039 46.6668 25.2789 45.7918 25.2789 44.7223V35.0001C25.2789 33.9307 24.4039 33.0557 23.3344 33.0557H19.5816C20.5344 25.3946 27.0872 19.4446 35.0011 19.4446C42.915 19.4446 49.4678 25.3946 50.4205 33.0557H46.6678C45.5983 33.0557 44.7233 33.9307 44.7233 35.0001V44.7223C44.7233 45.7918 45.5983 46.6668 46.6678 46.6668H50.5566V48.6112C50.5566 49.6807 49.6816 50.5557 48.6122 50.5557H40.8344C40.8344 49.4862 39.9594 48.6112 38.89 48.6112H31.1122C30.0428 48.6112 29.1678 49.4862 29.1678 50.5557V52.5001C29.1678 53.5695 30.0428 54.4445 31.1122 54.4445H48.6122C51.8205 54.4445 54.4455 51.8195 54.4455 48.6112V35.0001C54.4455 24.2862 45.715 15.5557 35.0011 15.5557Z"
      fill="#0C4D91"
    />
  </Svg>
);

const SUPPORT_EMAIL = 'members@instituteprojectmanagement.com';

// ─── HelpSupportScreen ───────────────────────────────────────────────────────
const HelpSupportScreen = ({navigation}: any) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Member Support</Text>
        <View style={s.divider} />
        <Text style={s.intro}>
          We're enhancing your support experience. If you need assistance
          while this page is being prepared, please contact our support team.
        </Text>

        <View style={s.card}>
          <SupportIcon />
          <Text style={s.cardText}>
            For any technical difficulties, don't hesitate to contact our
            support team at{' '}
            <Text style={s.cardEmail} onPress={handleEmailPress}>
              {SUPPORT_EMAIL}
            </Text>
          </Text>
        </View>
      </ScrollView>

      <ProfileDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigation={navigation}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#EEF7FC'},
  scroll: {flex: 1},
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 36,
    gap: 10,
  },
  title: {
    color: '#192647',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.24,
    marginBottom: 12,
  },
  divider: {
    width: 85,
    height: 1,
    backgroundColor: '#46B1E4',
    marginBottom: 12,
  },
  intro: {
    color: '#192647',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    marginBottom: 24,
  },
  card: {
    width: 358,
    paddingVertical: 25,
    paddingHorizontal: 20,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 9.418,
    elevation: 3,
  },
  cardText: {
    color: '#192647',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  cardEmail: {
    color: '#0C4D91',
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default HelpSupportScreen;
