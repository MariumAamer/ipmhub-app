/* eslint-disable prettier/prettier */
import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Svg, {Path, G, Circle, Ellipse} from 'react-native-svg';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import FeedScreen from '../screens/FeedScreen';
import ForumsScreen from '../screens/ForumsScreen';
import IntrosScreen from '../screens/IntrosScreen';
import ResourcesScreen from '../screens/ResourcesScreen';
import MentorsScreen from '../screens/MentorsScreen';

const Tab = createBottomTabNavigator();

const ACTIVE = '#46B0E3';
const INACTIVE = '#192546';

// ─── Feed Icon ────────────────────────────────────────────────────────────────
const FeedIcon = ({color}: {color: string}) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 19.412V9.12632C3 8.76442 3.07987 8.42156 3.23962 8.09775C3.39937 7.77394 3.6195 7.50728 3.9 7.29775L10.65 2.1549C11.0437 1.85013 11.4937 1.69775 12 1.69775C12.5062 1.69775 12.9562 1.85013 13.35 2.1549L20.1 7.29775C20.3812 7.50728 20.6017 7.77394 20.7615 8.09775C20.9212 8.42156 21.0007 8.76442 21 9.12632V19.412C21 20.0406 20.7795 20.5789 20.3385 21.0269C19.8975 21.4749 19.368 21.6985 18.75 21.6977H15.375C15.0562 21.6977 14.7892 21.588 14.574 21.3686C14.3587 21.1492 14.2507 20.8779 14.25 20.5549V14.8406C14.25 14.5168 14.142 14.2456 13.926 14.0269C13.71 13.8082 13.443 13.6985 13.125 13.6978H10.875C10.5562 13.6978 10.2892 13.8075 10.074 14.0269C9.85875 14.2463 9.75075 14.5176 9.75 14.8406V20.5549C9.75 20.8787 9.642 21.1503 9.426 21.3697C9.21 21.5892 8.943 21.6985 8.625 21.6977H5.25C4.63125 21.6977 4.10175 21.4741 3.6615 21.0269C3.22125 20.5797 3.00075 20.0414 3 19.412Z"
      fill={color}
    />
  </Svg>
);

// ─── Forums Icon ──────────────────────────────────────────────────────────────
const ForumsIcon = ({color}: {color: string}) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 1.69727C17.5231 1.69727 22 6.17419 22 11.6973C22 17.2203 17.5231 21.6973 12 21.6973C10.4547 21.6998 8.93002 21.3424 7.54688 20.6533C7.33149 20.5456 7.01023 20.5351 6.51074 20.6582C6.25844 20.7228 6.00863 20.7981 5.7627 20.8838L5.6748 20.915C5.44831 20.9909 5.20321 21.0723 4.97363 21.1338C3.51107 21.5256 2.17168 20.1862 2.56348 18.7227C2.62499 18.4941 2.70638 18.2479 2.78223 18.0225L2.81348 17.9346C2.8992 17.6886 2.97443 17.4388 3.03906 17.1865C3.16111 16.687 3.15061 16.3658 3.04395 16.1504C2.3753 14.8079 2 13.2951 2 11.6973C2 6.17419 6.47692 1.69727 12 1.69727Z"
      fill={color}
    />
  </Svg>
);

// ─── Intros Icon ──────────────────────────────────────────────────────────────
const IntrosIcon = ({color}: {color: string}) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 4.19775C5 3.53471 5.26339 2.89883 5.73223 2.42999C6.20107 1.96115 6.83696 1.69775 7.5 1.69775L17.5 1.69775C18.163 1.69775 18.7989 1.96115 19.2678 2.42999C19.7366 2.89883 20 3.53471 20 4.19775V19.1978C20 19.8608 19.7366 20.4967 19.2678 20.9655C18.7989 21.4344 18.163 21.6978 17.5 21.6978H7.5C6.83696 21.6978 6.20107 21.4344 5.73223 20.9655C5.26339 20.4967 5 19.8608 5 19.1978V4.19775ZM10.625 4.19775C10.4592 4.19775 10.3003 4.2636 10.1831 4.38081C10.0658 4.49802 10 4.65699 10 4.82275C10 4.98851 10.0658 5.14749 10.1831 5.2647C10.3003 5.38191 10.4592 5.44775 10.625 5.44775H14.375C14.5408 5.44775 14.6997 5.38191 14.8169 5.2647C14.9342 5.14749 15 4.98851 15 4.82275C15 4.65699 14.9342 4.49802 14.8169 4.38081C14.6997 4.2636 14.5408 4.19775 14.375 4.19775H10.625ZM12.5 15.4478C13.4946 15.4478 14.4484 15.0527 15.1517 14.3494C15.8549 13.6461 16.25 12.6923 16.25 11.6978C16.25 10.7032 15.8549 9.74936 15.1517 9.0461C14.4484 8.34284 13.4946 7.94775 12.5 7.94775C11.5054 7.94775 10.5516 8.34284 9.84835 9.0461C9.14509 9.74936 8.75 10.7032 8.75 11.6978C8.75 12.6923 9.14509 13.6461 9.84835 14.3494C10.5516 15.0527 11.5054 15.4478 12.5 15.4478ZM18.75 18.8915C17.6825 17.729 15.7787 16.6978 12.5 16.6978C9.22125 16.6978 7.3175 17.7303 6.25 18.8915V19.1978C6.25 19.5293 6.3817 19.8472 6.61612 20.0816C6.85054 20.3161 7.16848 20.4478 7.5 20.4478H17.5C17.8315 20.4478 18.1495 20.3161 18.3839 20.0816C18.6183 19.8472 18.75 19.5293 18.75 19.1978V18.8915Z"
      fill={color}
    />
  </Svg>
);

// ─── Resources Icon ───────────────────────────────────────────────────────────
const ResourcesIcon = ({color}: {color: string}) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9.11232 8.49674C9.45234 8.19969 9.85636 7.97066 10.3024 7.83564L10.5494 7.77063L10.7094 7.74062L10.8854 7.71562L11.0654 7.70062L11.2494 7.69562H18.7498C19.5798 7.69555 20.3784 8.01307 20.9818 8.58306C21.5853 9.15305 21.9478 9.93233 21.995 10.7611L22 10.9461V18.4473C22.0001 19.2775 21.6824 20.0763 21.1123 20.6798C20.5421 21.2833 19.7627 21.6457 18.9338 21.6928L18.7498 21.6978H11.2494C10.4193 21.6978 9.62052 21.3802 9.01708 20.8099C8.41365 20.2397 8.05126 19.4602 8.00426 18.6313L7.99926 18.4483V10.9471L8.01626 10.6081L8.07827 10.231L8.13727 10.008L8.21727 9.77193L8.30428 9.5699L8.38628 9.40788L8.48029 9.24485L8.62629 9.02782L8.7203 8.9048L8.85531 8.74878L8.96331 8.63676L9.11232 8.49674ZM15.5817 3.92904L15.6337 4.10607L16.3277 6.69446H11.2494C10.6912 6.69446 10.1384 6.80444 9.62271 7.01812C9.10698 7.2318 8.6384 7.54499 8.24372 7.9398C7.84903 8.33462 7.53598 8.80332 7.32245 9.31915C7.10892 9.83498 6.99908 10.3878 6.99921 10.9461V17.3811C6.34892 17.3426 5.7252 17.1096 5.20895 16.7122C4.69271 16.3149 4.30777 15.7716 4.10406 15.1528L4.05205 14.9767L2.11095 7.73062C1.89594 6.92887 1.99578 6.07524 2.38999 5.34475C2.78421 4.61427 3.44292 4.0623 4.23106 3.80202L4.40907 3.75001L11.6535 1.80872C12.4551 1.59369 13.3087 1.69353 14.0391 2.08779C14.7695 2.48204 15.3214 3.14082 15.5817 3.92904Z"
      fill={color}
    />
  </Svg>
);

// ─── Mentors Icon (two people, hand-crafted) ──────────────────────────────────
const MentorsIcon = ({color}: {color: string}) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    {/* Back person head */}
    <Circle cx={15.5} cy={7} r={2.5} fill={color} />
    {/* Back person body */}
    <Path
      d="M20 17C20 14.791 17.985 13 15.5 13C14.54 13 13.648 13.29 12.92 13.79C13.59 14.63 14 15.77 14 17H20Z"
      fill={color}
    />
    {/* Front person head */}
    <Circle cx={9} cy={7.5} r={3} fill={color} />
    {/* Front person body */}
    <Path
      d="M9 12C6.239 12 4 14.015 4 16.5V17H14V16.5C14 14.015 11.761 12 9 12Z"
      fill={color}
    />
  </Svg>
);

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICONS: Record<string, React.FC<{color: string}>> = {
  Feed: FeedIcon,
  Forums: ForumsIcon,
  Intros: IntrosIcon,
  Resources: ResourcesIcon,
  Mentors: MentorsIcon,
};

// ─── Custom tab bar ───────────────────────────────────────────────────────────
// Bottom safe-area inset was previously hardcoded per-platform
// (`Platform.OS === 'ios' ? 20 : 8`), which only approximated the classic
// iOS home-indicator height and a flat guess for Android. Neither number
// reflects the real device: Android phones with 3-button navigation need
// very little extra padding, but phones using Android's gesture nav bar (or
// any device with a larger inset) need more — otherwise the tab bar's icons
// sit right underneath, or partly behind, the system back/home/multitask
// controls and become unreliable to tap. useSafeAreaInsets().bottom reports
// the actual reserved system-UI height per device, on both platforms, so we
// add it on top of the design's own breathing room instead of guessing.
const CustomTabBar = ({state, descriptors, navigation}: any) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, {paddingBottom: 8 + insets.bottom, height: 56 + insets.bottom}]}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const IconComponent = ICONS[route.name];
        const color = isFocused ? ACTIVE : INACTIVE;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={onPress}
            activeOpacity={0.7}>
            {IconComponent ? <IconComponent color={color} /> : null}
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── Navigator ────────────────────────────────────────────────────────────────
const BottomTabNavigator = () => (
  <Tab.Navigator
    tabBar={props => <CustomTabBar {...props} />}
    screenOptions={{headerShown: false}}>
    <Tab.Screen name="Feed" component={FeedScreen} />
    <Tab.Screen name="Forums" component={ForumsScreen} />
    <Tab.Screen name="Intros" component={IntrosScreen} />
    <Tab.Screen name="Resources" component={ResourcesScreen} />
    <Tab.Screen name="Mentors" component={MentorsScreen} />
  </Tab.Navigator>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
    // paddingBottom and height are set inline above using the real
    // safe-area bottom inset (8 + insets.bottom / 56 + insets.bottom) —
    // see CustomTabBar. 56 is the tap-target height above the inset.
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    color: INACTIVE,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: ACTIVE,
    fontWeight: '700',
  },
});

export default BottomTabNavigator;
