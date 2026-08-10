/* eslint-disable prettier/prettier */
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
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
import NotificationsScreen from '../screens/NotificationsScreen';



const Stack = createNativeStackNavigator();

const AppNavigator = () => (
  <NavigationContainer>
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
<Stack.Screen name="Notifications" component={NotificationsScreen} />

</Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;
