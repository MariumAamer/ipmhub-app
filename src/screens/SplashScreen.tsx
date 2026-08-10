/* eslint-disable prettier/prettier */
import React, {useEffect} from 'react';
import {View, Image, StyleSheet, StatusBar} from 'react-native';
import {getStoredUser, validateToken} from '../api/authApi';

const SplashScreen = ({navigation}: any) => {
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const user = await getStoredUser();

      if (user?.token) {
        // Token exists — validate it's still live
        const isValid = await validateToken(user.token);

        if (isValid) {
          // Already logged in — skip onboarding, go straight to app
          navigation.replace('MainApp');
          return;
        }
        // Token expired — fall through to onboarding
      }

      // No token or expired — show onboarding after splash delay
      setTimeout(() => {
        navigation.replace('Onboarding');
      }, 3500);
    } catch {
      // Any error — go to onboarding
      setTimeout(() => {
        navigation.replace('Onboarding');
      }, 3500);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0C4D91"
        translucent
      />
      <Image
        source={require('../assets/images/ipmlogowhite1.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C4D91',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    aspectRatio: 1,
    flexShrink: 0,
  },
});

// eslint-disable-next-line prettier/prettier
export default SplashScreen;
