import React, {useEffect} from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import {
  listenForTokenRefresh,
  listenForForegroundMessages,
  listenForNotificationOpenedApp,
  getInitialNotification,
} from './src/api/pushNotifications';
import {
  setupEventNotifications,
  listenForNotifeeForegroundEvents,
} from './src/api/eventNotifications';

const App = () => {
  useEffect(() => {
    // One-time setup: Android "events" channel + iOS action category.
    setupEventNotifications();

    // Keep the backend's stored FCM token in sync if it rotates.
    const unsubTokenRefresh = listenForTokenRefresh();

    // Foreground messages — FCM doesn't auto-display anything while the
    // app is open, so plain (non-event) messages land here. Event-type
    // messages are already routed to Notifee inside pushNotifications.ts
    // and never reach this callback.
    // TODO(Marium): replace this console.log with an in-app banner/toast
    // once you decide what that should look like.
    const unsubForeground = listenForForegroundMessages(remoteMessage => {
      console.log('[App] foreground notification:', remoteMessage);
    });

    // Register action button presses (Register/Dismiss) while the app is
    // in the foreground. Background presses are handled separately in
    // index.js via registerNotifeeBackgroundHandler().
    const unsubNotifeeForeground = listenForNotifeeForegroundEvents();

    // Tap handling: app was backgrounded (not killed) and user tapped a
    // notification to bring it to foreground.
    // TODO(Marium): wire actual navigation here once you decide the
    // payload -> screen mapping (same ipmhub:// deep-link pattern already
    // used in AppNavigator's Linking handler is the natural fit).
    const unsubOpenedApp = listenForNotificationOpenedApp(remoteMessage => {
      console.log('[App] notification opened app from background:', remoteMessage);
    });

    // Tap handling: app was fully closed (quit state) and was launched by
    // tapping a notification. Same TODO as above re: navigation.
    getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        console.log('[App] app opened from quit state via notification:', remoteMessage);
      }
    });

    return () => {
      unsubTokenRefresh();
      unsubForeground();
      unsubNotifeeForeground();
      unsubOpenedApp();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
