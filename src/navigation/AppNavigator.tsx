/* eslint-disable prettier/prettier */
import React, {useEffect, useState} from 'react';
import {Linking} from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import * as Keychain from 'react-native-keychain';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SignUpScreen from '../screens/SignUpScreen';
import SignInScreen from '../screens/SignInScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import CongratulationsScreen from '../screens/CongratulationsScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import ScheduledPostsScreen from '../screens/ScheduledPostsScreen';
import ResourceDetailScreen from '../screens/ResourceDetailScreen';
import ArticleSubmissionScreen from '../screens/ArticleSubmissionScreen';
import CoursesScreen from '../screens/CoursesScreen';
import CourseDetailScreen from '../screens/CourseDetailScreen';
import MentorApplicationScreen from '../screens/MentorApplicationScreen';
import BottomTabNavigator from './BottomTabNavigator';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import MemberProfileScreen from '../screens/MemberProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import EditProfileDetails from '../screens/EditProfileDetails';
import EditExperience from '../screens/EditExperience';
import EditEducation from '../screens/EditEducation';
import EditCredential from '../screens/EditCredential';
import EditSpecialities from '../screens/EditSpecialities';
import EditProject from '../screens/EditProject';
import ForumTopicScreen from '../screens/ForumTopicScreen';
import ReplyToDiscussionScreen from '../screens/ReplyToDiscussionScreen';
import ShareLinkedInScreen from '../screens/ShareLinkedInScreen';
import CertificationsScreen from '../screens/CertificationsScreen';
import LessonDetailScreen from '../screens/LessonDetailScreen';
import ForgptPasswordScreen from '../screens/ForgotPasswordScreen';
import EventsScreen from '../screens/EventsScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import EventThankYouScreen from '../screens/EventThankYouScreen';
import DMListScreen from '../screens/DMListScreen';
import DMConversationScreen from '../screens/DMConversationScreen';
import DMNewMessageScreen from '../screens/DMNewMessageScreen';
import DMMembersScreen from '../screens/DMMembersScreen';
import StoreScreen from '../screens/StoreScreen';
import BadgesScreen from '../screens/BadgesScreen';
import StepContentScreen from '../screens/StepContentScreen';
import QuizScreen from '../screens/QuizScreen';
import CommentsScreen from '../screens/CommentsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import NewDiscussionScreen from '../screens/NewDiscussionScreen';
import OptionPickerScreen from '../screens/OptionPickerScreen';
import LikedByScreen from '../screens/LikedByScreen';



const Stack = createNativeStackNavigator();

// ─── Global deep-link handling ─────────────────────────────────────────────
// Previously, deep links (like the account activation email link) had NO
// app-wide handling at all — only ForgotPasswordScreen had a screen-local
// Linking listener, which only works if that screen already happens to be
// mounted. A cold app start (app fully closed, user taps a link in email)
// had nowhere to route to, regardless of whether Android correctly handed
// the URL to the app or not.
//
// navigationRef lets us imperatively navigate from outside of any specific
// screen component, once the navigator itself has mounted (onReady below) —
// needed because Linking.getInitialURL() can resolve before React
// Navigation is ready to accept a .navigate() call.
export const navigationRef = createNavigationContainerRef();

const handleDeepLink = (url: string | null) => {
  if (!url || !navigationRef.isReady()) return;

  // Account activation: https://hub.instituteprojectmanagement.com/activated/?key=...
  // SignInScreen already supports route.params.verified (shows the
  // "✓ Account verified!" banner) — it just never had anything wiring a
  // real link to it before now.
  if (url.includes('/activated')) {
    navigationRef.navigate('SignIn' as never, {verified: true} as never);
    return;
  }

  // Password reset: ipmhub://reset-password?key=...&login=...
  // ForgotPasswordScreen already parses key/login itself via its own
  // Linking listener, but that only works if the screen is already
  // mounted. On a cold start (app closed, user taps the "create new
  // password" email link) there was previously nowhere to route to at
  // all, so the link just opened in Safari/Chrome and stayed there.
  // We still navigate with the raw key/login params here so
  // ForgotPasswordScreen can jump straight to the changePassword stage
  // even before its own listener has a chance to run.
  if (url.includes('reset-password')) {
    const query = url.split('?')[1] || '';
    const params = new URLSearchParams(query);
    const key = params.get('key');
    const login = params.get('login');
    if (key && login) {
      navigationRef.navigate('ForgotPassword' as never, {key, login} as never);
    } else {
      navigationRef.navigate('ForgotPassword' as never);
    }
  }
};

const AppNavigator = () => {
  const [isNavReady, setIsNavReady] = useState(false);

  useEffect(() => {
    if (!isNavReady) return;
    Linking.getInitialURL().then(handleDeepLink);
    const sub = Linking.addEventListener('url', ({url}) => handleDeepLink(url));
    return () => sub.remove();
  }, [isNavReady]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => setIsNavReady(true)}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Splash"           component={SplashScreen} />
      <Stack.Screen name="Onboarding"       component={OnboardingScreen} />
      <Stack.Screen name="SignIn"           component={SignInScreen} />
      <Stack.Screen name="ForgotPassword"   component={ForgptPasswordScreen} />
      <Stack.Screen name="SignUp"           component={SignUpScreen} />
      <Stack.Screen name="VerifyEmail"      component={VerifyEmailScreen} />
      <Stack.Screen name="Welcome"          component={WelcomeScreen} />
      <Stack.Screen name="ProfileSetup"     component={ProfileSetupScreen} />
      <Stack.Screen name="Congratulations"  component={CongratulationsScreen} />
      <Stack.Screen name="MainApp"          component={BottomTabNavigator} />
      <Stack.Screen name="CreatePost"       component={CreatePostScreen}       options={{presentation: 'modal'}} />
      <Stack.Screen name="ScheduledPosts"   component={ScheduledPostsScreen}   options={{presentation: 'modal'}} />
      <Stack.Screen name="ResourceDetail"   component={ResourceDetailScreen} />
      <Stack.Screen name="MentorApplication" component={MentorApplicationScreen} />
      <Stack.Screen name="ArticleSubmission" component={ArticleSubmissionScreen} />
      <Stack.Screen name="Courses"          component={CoursesScreen} />
      <Stack.Screen name="Settings"         component={AccountSettingsScreen}  options={{headerShown: false}} />
      <Stack.Screen name="CourseDetail"     component={CourseDetailScreen} />
      <Stack.Screen name="MemberProfile"    component={MemberProfileScreen} />
      <Stack.Screen name="EditProfile"      component={EditProfileScreen} />
      <Stack.Screen name="EditProfileDetails" component={EditProfileDetails} />
      <Stack.Screen name="EditExperience"   component={EditExperience} />
      <Stack.Screen name="EditEducation"    component={EditEducation} />
      <Stack.Screen name="EditProjects"     component={EditProject} />
      <Stack.Screen name="EditCredential"   component={EditCredential} />
      <Stack.Screen name="EditSpecialities" component={EditSpecialities} />
      <Stack.Screen name="ForumTopic"       component={ForumTopicScreen} />
      <Stack.Screen name="ReplyToDiscussion" component={ReplyToDiscussionScreen} options={{presentation: 'modal'}} />
      <Stack.Screen name="ShareLinkedIn"    component={ShareLinkedInScreen}    options={{presentation: 'modal'}} />
      <Stack.Screen name="Certifications"   component={CertificationsScreen} />
      <Stack.Screen name="LessonDetail"     component={LessonDetailScreen}     options={{headerShown: false}} />
      <Stack.Screen name="Events"           component={EventsScreen}           options={{headerShown: false}} />
      <Stack.Screen name="EventDetail"    component={EventDetailScreen}    options={{headerShown: false}} />
      <Stack.Screen name="EventThankYou" component={EventThankYouScreen}  options={{headerShown: false}} />
      <Stack.Screen name="DMList" component={DMListScreen} options={{headerShown: false}} />
<Stack.Screen name="DMConversation" component={DMConversationScreen} options={{headerShown: false}} />
<Stack.Screen name="DMNewMessage" component={DMNewMessageScreen} options={{headerShown: false}} />
<Stack.Screen name="DMMembers" component={DMMembersScreen} options={{headerShown: false}} />
<Stack.Screen name="Store" component={StoreScreen} options={{headerShown: false}} />
<Stack.Screen name="Badges" component={BadgesScreen} />
<Stack.Screen name="StepContent" component={StepContentScreen} />
<Stack.Screen name="Quiz" component={QuizScreen} />
<Stack.Screen name="Comments" component={CommentsScreen} />
<Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
<Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
<Stack.Screen name="NewDiscussion" component={NewDiscussionScreen} />
<Stack.Screen name="OptionPicker" component={OptionPickerScreen} />
<Stack.Screen name="LikedBy" component={LikedByScreen} />

</Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
