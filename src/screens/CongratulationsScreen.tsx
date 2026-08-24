import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Image, Animated} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

const CongratulationsScreen = ({navigation}: any) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        {/* Step indicator */}
        <View style={styles.header}>
          <Text style={styles.stepText}>Step 3 of 3</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Start Your IPM Journey</Text>
        <Text style={styles.subtitle}>
          Your introduction has been posted to the community.
        </Text>

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            {opacity: fadeAnim, transform: [{scale: scaleAnim}]},
          ]}>
          <Text style={styles.congratsTitle}>Congratulations!</Text>
          <View style={styles.divider} />

          {/* Body text — no nested Text to avoid render errors */}
          <Text style={styles.congratsBody}>
            {"You've just received "}
            <Text style={styles.points}>{'10 points'}</Text>
            {
              ' for introducing yourself. Your personalised IPM Member Badge is now in progress — complete the next activities to unlock it.'
            }
          </Text>

          {/* Badge */}
          <View style={styles.badgeWrap}>
            <View style={styles.badge}>
              <View style={styles.badgeInner}>
                <Image
                  source={require('../assets/images/ipmlogowhite1.png')}
                  style={styles.badgeLogo}
                  resizeMode="contain"
                />
                <Text style={styles.badgeLabel}>{'IPM'}</Text>
                <Text style={styles.badgeSub}>{'MEMBER'}</Text>
              </View>
            </View>
            <View style={styles.lockOverlay}>
              <Text style={styles.lockIcon}>{'🔒'}</Text>
            </View>
          </View>

          <Text style={styles.unlockHint}>
            {'Complete more activities to unlock your badge'}
          </Text>
        </Animated.View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.discoverBtn}
          onPress={() => navigation.replace('MainApp')}
          activeOpacity={0.85}>
          <Text style={styles.discoverBtnText}>{'Discover the Community'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  scroll: {paddingHorizontal: 24, paddingBottom: 48},
  header: {alignItems: 'flex-end', paddingTop: 16, marginBottom: 8},
  stepText: {fontSize: 13, color: '#999'},
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A3A6B',
    marginBottom: 8,
    marginTop: 8,
  },
  subtitle: {fontSize: 14, color: '#888', lineHeight: 21, marginBottom: 24},
  card: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: '#FAFBFF',
  },
  congratsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A3A6B',
    marginBottom: 12,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: '#1A3A6B',
    borderRadius: 2,
    marginBottom: 16,
  },
  congratsBody: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  points: {color: '#1A3A6B', fontWeight: '800'},
  badgeWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  badge: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: '#1A3A6B',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.35,
  },
  badgeInner: {alignItems: 'center'},
  badgeLogo: {width: 50, height: 50, tintColor: '#FFFFFF', marginBottom: 6},
  badgeLabel: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
  badgeSub: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 5,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {fontSize: 36},
  unlockHint: {fontSize: 12, color: '#AAAAAA', textAlign: 'center'},
  discoverBtn: {
    backgroundColor: '#1A3A6B',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#1A3A6B',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  discoverBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '700'},
});

export default CongratulationsScreen;
