/* eslint-disable prettier/prettier */
import React, {useEffect} from 'react';
import {View, Image, StyleSheet, StatusBar} from 'react-native';
import {getStoredUser, validateToken} from '../api/authApi';

// PERF: cold start used to always wait on a POST to /jwt-auth/v1/token/validate
// before routing a signed-in user into the app — a full network round trip (on
// mobile data, often 1-3s) sitting on the critical path of every launch. A JWT
// carries its own expiry, so if the stored token's `exp` is comfortably in the
// future we can route straight into the app. A server-side revoked token is
// still handled: every screen already redirects to SignIn on an UNAUTHORIZED
// response. Tokens with no readable `exp` fall back to the network check.
const decodeJwtExp = (token: string): number | null => {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const s = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(
      /[^A-Za-z0-9+/=]/g,
      '',
    );
    let out = '';
    for (let i = 0; i < s.length; ) {
      const e1 = chars.indexOf(s[i++]);
      const e2 = chars.indexOf(s[i++]);
      const e3 = chars.indexOf(s[i++]);
      const e4 = chars.indexOf(s[i++]);
      out += String.fromCharCode((e1 << 2) | (e2 >> 4));
      if (e3 !== 64) out += String.fromCharCode(((e2 & 15) << 4) | (e3 >> 2));
      if (e4 !== 64) out += String.fromCharCode(((e3 & 3) << 6) | e4);
    }
    const exp = JSON.parse(out)?.exp;
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
};

const SplashScreen = ({navigation}: any) => {
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const user = await getStoredUser();

      if (user?.token) {
        // Fast path: token's own expiry says it's still good (with a 60s
        // safety margin) — skip the network round trip entirely.
        const exp = decodeJwtExp(user.token);
        if (exp && exp * 1000 > Date.now() + 60 * 1000) {
          navigation.replace('MainApp');
          return;
        }

        // Slow path: no readable expiry, or it's expired/about to —
        // validate against the server.
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
