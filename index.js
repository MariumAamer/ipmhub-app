/**
 * @format
 */

import 'react-native-gesture-handler';

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {registerBackgroundHandler} from './src/api/pushNotifications';
import {registerNotifeeBackgroundHandler} from './src/api/eventNotifications';

// Must be called here, before AppRegistry.registerComponent — this is a
// hard Firebase/Notifee requirement, not a style choice. Registering
// either handler inside App.tsx or any component means background/
// killed-state push messages (and event action button presses) get
// silently missed.
registerBackgroundHandler();
registerNotifeeBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
