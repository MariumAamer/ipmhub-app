/**
 * MemberProfileScreen — Full implementation matching Figma designs
 *
 * Tabs: Activity | Experience | Connections | Courses & Certifications | Mentorship
 *
 * API endpoints used:
 *  - GET /buddyboss/v1/members/{id}          → profile header, xprofile, follow counts
 *  - GET /buddyboss/v1/members?scope=following&user_id={id}  → following list
 *  - GET /buddyboss/v1/members?scope=followers&user_id={id}  → followers list
 *  - GET /wp/v2/posts?author={id}&_embed     → activity / resources
 *  - GET /buddyboss/v1/activity?user_id={id} → activity feed
 *  - GET /ldlms/v2/users/{id}/courses        → LearnDash courses
 *  - GET /buddyboss/v1/forums/topics?author={id} → forum posts
 *
 * xprofile field IDs (confirmed from logs):
 *  - 1097 = Job Title
 *  - 1099 = Country
 *  - groups: 1=Personal Information, 2=Professional Accomplishments,
 *            3=Experiences, 4=Contact Information, 5=Education, 6=Projects, 7=Specialities(?)
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import Svg, {Path, Rect, Mask, G, Circle} from 'react-native-svg';
import {apiRequest} from '../api/apiClient';
import {getUserIdFromToken, uploadAvatar} from '../api/profileApi';
import AppHeader from '../components/AppHeader';
import ProfileDrawer from '../components/ProfileDrawer';
import LinearGradient from 'react-native-linear-gradient';

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';

// Keyed rather than index-based so the Mentorship tab can be filtered out
// for non-mentors without shifting what the other tab indices mean.
const BASE_TABS = [
  {key: 'activity',    label: 'Activity'},
  {key: 'experience',  label: 'Experience'},
  {key: 'connections', label: 'Connections'},
  {key: 'courses',     label: 'Courses & Certifications'},
  {key: 'mentorship',  label: 'Mentorship'},
];

// ─── Icons ────────────────────────────────────────────────────────────────────
const EditIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Mask id="ei" maskUnits="userSpaceOnUse" x={1} y={1} width={10} height={10}>
      <Path d="M4.07066 10.3043L9.07078 5.30418L6.69582 2.92922L1.6957 7.92934C1.62686 7.99826 1.57797 8.08453 1.55419 8.17899L1 11L3.82047 10.4458C3.91516 10.4221 4.00179 10.3732 4.07066 10.3043ZM10.6849 3.69003C10.8867 3.48823 11 3.21457 11 2.92922C11 2.64388 10.8867 2.37022 10.6849 2.16842L9.83158 1.31507C9.62978 1.11333 9.35612 1 9.07078 1C8.78543 1 8.51177 1.11333 8.30997 1.31507L7.45662 2.16842L9.83158 4.54338L10.6849 3.69003Z" fill="#006FFD" />
    </Mask>
    <G mask="url(#ei)"><Rect width={12} height={12} fill="#0C4D91" /></G>
  </Svg>
);

const PencilIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 12 12" fill="none">
    <Mask id="pi" maskUnits="userSpaceOnUse" x={1} y={1} width={10} height={10}>
      <Path d="M4.07066 10.3043L9.07078 5.30418L6.69582 2.92922L1.6957 7.92934C1.62686 7.99826 1.57797 8.08453 1.55419 8.17899L1 11L3.82047 10.4458C3.91516 10.4221 4.00179 10.3732 4.07066 10.3043ZM10.6849 3.69003C10.8867 3.48823 11 3.21457 11 2.92922C11 2.64388 10.8867 2.37022 10.6849 2.16842L9.83158 1.31507C9.62978 1.11333 9.35612 1 9.07078 1C8.78543 1 8.51177 1.11333 8.30997 1.31507L7.45662 2.16842L9.83158 4.54338L10.6849 3.69003Z" fill="#0C4D91" />
    </Mask>
    <G mask="url(#pi)"><Rect width={12} height={12} fill="#0C4D91" /></G>
  </Svg>
);

const LinkedInIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M14.5 1.5H1.5C1.22386 1.5 1 1.72386 1 2V14C1 14.2761 1.22386 14.5 1.5 14.5H14.5C14.7761 14.5 15 14.2761 15 14V2C15 1.72386 14.7761 1.5 14.5 1.5ZM5.2 12.5H3.2V6.5H5.2V12.5ZM4.2 5.6C3.53726 5.6 3 5.06274 3 4.4C3 3.73726 3.53726 3.2 4.2 3.2C4.86274 3.2 5.4 3.73726 5.4 4.4C5.4 5.06274 4.86274 5.6 4.2 5.6ZM13 12.5H11V9.4C11 8.57 10.9867 7.49 9.8 7.49C8.6 7.49 8.42 8.4 8.42 9.34V12.5H6.42V6.5H8.34V7.48H8.36C8.64 6.96 9.32 6.4 10.36 6.4C12.4 6.4 13 7.74 13 9.5V12.5Z" fill="#0C4D91"/>
  </Svg>
);

const CameraIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="#555" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17Z" stroke="#555" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LocationPinIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#888" />
  </Svg>
);

const ChevronRightCircle = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Circle cx={10} cy={10} r={9.2} stroke="#192546" strokeWidth={1.6} />
    <Path d="M8.46006 7.17617L8.57959 7.04414C9.10059 6.40568 9.10059 5.4826 8.57959 4.84414L8.46006 4.71211L3.93896 0.191796L2.75771 1.37148L3.04053 1.65508L7.27959 5.89336C7.30695 5.92169 7.30668 5.96771 7.27881 5.9957L2.75537 10.5207L3.93584 11.7012L8.46006 7.17617Z" fill="#192546" translateX={4} translateY={4} />
  </Svg>
);

const CalendarIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Path d="M8 2v3M16 2v3M3.5 9.09h17M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5z" stroke="#888" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const VideoIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Path d="M22 8.93c0-.93-.64-1.3-1.43-.82l-3.07 1.84V7.5C17.5 6.12 16.38 5 15 5H5C3.62 5 2.5 6.12 2.5 7.5v9C2.5 17.88 3.62 19 5 19h10c1.38 0 2.5-1.12 2.5-2.5v-2.45l3.07 1.84c.78.47 1.43.1 1.43-.82V8.93z" stroke="#888" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const FormatDeliveryIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path d="M7.58789 1.5C7.73417 1.5 7.85233 1.61841 7.85254 1.76465C7.85254 1.91059 7.7343 2.0293 7.58789 2.0293H3.35352C2.62244 2.0293 2.0293 2.62244 2.0293 3.35352V8.64746C2.02954 9.37834 2.62258 9.9707 3.35352 9.9707H7.58789C7.7343 9.9707 7.85254 10.0894 7.85254 10.2354C7.85248 10.3817 7.73426 10.5 7.58789 10.5H3.35352C2.33025 10.5 1.50025 9.67068 1.5 8.64746V3.35352C1.5 2.3301 2.33009 1.5 3.35352 1.5H7.58789ZM7.92969 3.69531C8.03342 3.59208 8.20145 3.59208 8.30469 3.69531L10.4219 5.8125C10.5119 5.90248 10.5233 6.04169 10.4561 6.14453L10.4219 6.18652L8.30469 8.30469C8.20148 8.4079 8.03342 8.40785 7.92969 8.30469C7.82645 8.20145 7.82645 8.03342 7.92969 7.92969L9.5957 6.26465H4.94043C4.79413 6.26457 4.67585 6.1463 4.67578 6C4.67578 5.85364 4.79409 5.73543 4.94043 5.73535H9.5957L7.92969 4.06934C7.82647 3.96612 7.82651 3.79855 7.92969 3.69531Z" fill="#8F9098" />
  </Svg>
);

// ─── Empty State SVG Icons ────────────────────────────────────────────────────
const EmptyProjectsIcon = () => (
  <Svg width={46} height={46} viewBox="0 0 46 46" fill="none">
    <Path d="M35.2852 30.4775C35.6711 30.0828 36.3043 30.0751 36.6992 30.4609C37.0942 30.8469 37.1008 31.48 36.7148 31.875L30.0488 38.6992C29.8607 38.8918 29.6022 39 29.333 39C29.064 38.9999 28.8062 38.8916 28.6182 38.6992L25.2852 35.2871C24.8993 34.8922 24.906 34.259 25.3008 33.873C25.6958 33.4871 26.3289 33.4947 26.7148 33.8896L29.333 36.5684L35.2852 30.4775Z" fill="#192647"/>
    <Path d="M27.667 8C28.8237 8.00009 29.9286 8.47101 30.7393 9.30078C31.5491 10.1298 32 11.2496 32 12.4121V26.0586C32 26.6109 31.5523 27.0586 31 27.0586C30.4477 27.0586 30 26.6109 30 26.0586V12.4121C30 11.7651 29.7487 11.1488 29.3086 10.6982C28.8692 10.2485 28.2781 10.0001 27.667 10H14.333C13.7219 10.0001 13.1308 10.2485 12.6914 10.6982C12.2513 11.1488 12 11.7651 12 12.4121V32.8828C12.0001 33.5296 12.2514 34.1452 12.6914 34.5957C13.1308 35.0454 13.7219 35.2939 14.333 35.2939H18.6914C19.2436 35.2939 19.6913 35.7417 19.6914 36.2939C19.6914 36.8462 19.2437 37.2939 18.6914 37.2939H14.333C13.1763 37.2939 12.0714 36.8239 11.2607 35.9941C10.4508 35.1652 10.0001 34.0453 10 32.8828V12.4121C10 11.2496 10.4509 10.1298 11.2607 9.30078C12.0714 8.47101 13.1763 8.00009 14.333 8H27.667Z" fill="#192647"/>
    <Path d="M21 21.6475C21.5523 21.6475 22 22.0952 22 22.6475C21.9998 23.1996 21.5522 23.6475 21 23.6475H17.667C17.1148 23.6475 16.6672 23.1996 16.667 22.6475C16.667 22.0952 17.1147 21.6475 17.667 21.6475H21Z" fill="#192647"/>
    <Path d="M24.333 14.8232C24.8852 14.8232 25.3329 15.2711 25.333 15.8232C25.333 16.3755 24.8853 16.8232 24.333 16.8232H17.667C17.1147 16.8232 16.667 16.3755 16.667 15.8232C16.6671 15.2711 17.1148 14.8232 17.667 14.8232H24.333Z" fill="#192647"/>
  </Svg>
);

// ─── Timeline entry marker + view-details icon ────────────────────────────────
const TimelineDot = () => (
  <View style={s.timelineDotOuter}>
    <Svg width={9} height={9} viewBox="0 0 9 9" fill="none">
      <Circle cx={4.09091} cy={4.09091} r={4.09091} fill="#084D92" />
    </Svg>
  </View>
);

const ViewDetailsArrow = ({expanded}: {expanded: boolean}) => (
  <View style={{transform: [{rotate: expanded ? '0deg' : '180deg'}]}}>
    <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M11.5303 9.27407C11.2374 9.57509 10.7626 9.57509 10.4697 9.27407L6.00013 4.68024L1.53057 9.27407C1.23768 9.57509 0.762819 9.57509 0.469933 9.27407C0.177046 8.97304 0.177046 8.48497 0.469933 8.18394L6.00013 2.5L11.5303 8.18394C11.8232 8.48497 11.8232 8.97304 11.5303 9.27407Z" fill="#0C4D91" />
    </Svg>
  </View>
);

// Shared timeline entry — used by Experience, Education, and Credential
// (per Marium: "education and credentials have the same style"). Renders
// the connecting line down to the next entry unless `isLast`.
const TimelineEntry = ({
  title, subtitle, dateRange, description, isLast,
}: {
  title: string; subtitle?: string; dateRange?: string; description?: string; isLast?: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={s.timelineRow}>
      <View style={s.timelineRail}>
        <TimelineDot />
        {!isLast && <View style={s.timelineLine} />}
      </View>
      <View style={s.timelineContent}>
        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
          <Text style={s.timelineTitle}>{title}</Text>
          {dateRange ? <Text style={s.timelineDate}>{dateRange}</Text> : null}
        </View>
        {subtitle ? <Text style={s.timelineSubtitle}>{subtitle}</Text> : null}
        {description ? (
          <>
            <Text style={s.timelineDesc} numberOfLines={expanded ? undefined : 2}>{description}</Text>
            <TouchableOpacity style={s.viewDetailsRow} onPress={() => setExpanded(e => !e)}>
              <Text style={s.viewDetailsText}>{expanded ? 'View Less' : 'View Details'}</Text>
              <ViewDetailsArrow expanded={expanded} />
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </View>
  );
};

const EmptyExperienceIcon = () => (
  <Svg width={46} height={46} viewBox="0 0 46 46" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M15.2333 24.5333C19.2282 24.5333 22.4667 27.7718 22.4667 31.7667C22.4667 35.7615 19.2282 39 15.2333 39C11.2385 39 8 35.7615 8 31.7667C8 27.7718 11.2385 24.5333 15.2333 24.5333ZM15.2333 26.6C12.3799 26.6 10.0667 28.9132 10.0667 31.7667C10.0667 34.6201 12.3799 36.9333 15.2333 36.9333C18.0868 36.9333 20.4 34.6201 20.4 31.7667C20.4 28.9132 18.0868 26.6 15.2333 26.6Z" fill="#192647"/>
    <Path d="M32.0502 26.1348C32.6209 26.1348 33.0835 26.5975 33.0836 27.1681C33.0836 27.7388 32.6209 28.2015 32.0502 28.2015H30.6556C30.0849 28.2015 29.6223 27.7388 29.6223 27.1681C29.6224 26.5975 30.085 26.1348 30.6556 26.1348H32.0502Z" fill="#192647"/>
    <Path d="M32.0502 20.5554C32.6209 20.5554 33.0836 21.018 33.0836 21.5887C33.0833 22.1592 32.6208 22.6221 32.0502 22.6221H30.6556C30.0851 22.6221 29.6225 22.1592 29.6223 21.5887C29.6223 21.018 30.0849 20.5554 30.6556 20.5554H32.0502Z" fill="#192647"/>
    <Path fillRule="evenodd" clipRule="evenodd" d="M17.4029 8C19.3461 8 20.9081 7.99781 22.1326 8.16247C23.3868 8.33113 24.4416 8.69148 25.2781 9.52881C26.1154 10.3653 26.4757 11.4192 26.6444 12.6732C26.7788 13.6726 26.8008 14.897 26.8048 16.3696H31.3529C32.639 16.3696 33.7074 16.368 34.5518 16.4816C35.4262 16.5992 36.214 16.8572 36.8465 17.4897C37.4791 18.1223 37.737 18.91 37.8547 19.7844C37.9682 20.6289 37.9667 21.6972 37.9667 22.9833V31.3529C37.9667 32.6392 37.9683 33.7083 37.8547 34.5528C37.737 35.427 37.4789 36.2141 36.8465 36.8465C36.214 37.4791 35.4262 37.738 34.5518 37.8557C33.7074 37.9692 32.639 37.9667 31.3529 37.9667H25.7735C25.2029 37.9667 24.7402 37.504 24.7402 36.9333V17.4029C24.7402 15.4014 24.7377 14.0035 24.5959 12.9487C24.458 11.924 24.2054 11.3792 23.8169 10.991L23.8159 10.99C23.4276 10.6013 22.8823 10.3488 21.8572 10.211C20.8024 10.0691 19.4045 10.0667 17.4029 10.0667C15.4014 10.0667 14.0035 10.0691 12.9487 10.211C11.9238 10.3488 11.3792 10.6014 10.991 10.99L10.99 10.991C10.6014 11.3792 10.3488 11.9238 10.211 12.9487C10.0691 14.0035 10.0667 15.4014 10.0667 17.4029V21.5887C10.0664 22.1592 9.60389 22.6221 9.03333 22.6221C8.46278 22.6221 8.00023 22.1592 8 21.5887V17.4029C8 15.4598 7.99779 13.8977 8.16247 12.6732C8.33114 11.4194 8.69171 10.3652 9.52881 9.52881L9.68825 9.37744C10.4978 8.64746 11.4977 8.3206 12.6732 8.16247C13.8977 7.99779 15.4598 8 17.4029 8ZM26.8069 35.9H31.3529C32.6975 35.9 33.6017 35.8979 34.2763 35.8072C34.9207 35.7205 35.1995 35.5701 35.3843 35.3854C35.5692 35.2005 35.7204 34.9218 35.8072 34.2773C35.8979 33.6027 35.9 32.6977 35.9 31.3529V22.9833C35.9 21.6388 35.8979 20.7346 35.8072 20.0599C35.7204 19.4152 35.5692 19.1368 35.3843 18.9519C35.1995 18.767 34.921 18.6168 34.2763 18.5301C33.6017 18.4394 32.6975 18.4363 31.3529 18.4363H26.8069V35.9Z" fill="#192647"/>
    <Path d="M15.311 17.7652C15.8816 17.7654 16.3444 18.2279 16.3444 18.7985C16.3443 19.369 15.8815 19.8317 15.311 19.8319H13.9154C13.345 19.8317 12.8822 19.369 12.8821 18.7985C12.8821 18.228 13.3449 17.7654 13.9154 17.7652H15.311Z" fill="#192647"/>
    <Path d="M20.8904 17.7652C21.4611 17.7652 21.9238 18.2278 21.9238 18.7985C21.9236 19.3691 21.4611 19.8319 20.8904 19.8319H19.4958C18.9252 19.8319 18.4626 19.3691 18.4625 18.7985C18.4625 18.2278 18.9251 17.7652 19.4958 17.7652H20.8904Z" fill="#192647"/>
    <Path d="M15.311 13.5804C15.8816 13.5806 16.3444 14.0431 16.3444 14.6137C16.3441 15.1841 15.8815 15.6469 15.311 15.6471H13.9154C13.345 15.6469 12.8823 15.1841 12.8821 14.6137C12.8821 14.0432 13.3449 13.5806 13.9154 13.5804H15.311Z" fill="#192647"/>
    <Path d="M20.8904 13.5804C21.4611 13.5804 21.9238 14.043 21.9238 14.6137C21.9235 15.1842 21.461 15.6471 20.8904 15.6471H19.4958C18.9253 15.6471 18.4627 15.1842 18.4625 14.6137C18.4625 14.043 18.9251 13.5804 19.4958 13.5804H20.8904Z" fill="#192647"/>
  </Svg>
);

const EmptyEducationIcon = () => (
  <Svg width={46} height={46} viewBox="0 0 46 46" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M7.52035 15.7607C7.16299 15.9321 6.86085 16.2038 6.64921 16.5439C6.43758 16.884 6.3252 17.2785 6.3252 17.6813C6.3252 18.0841 6.43758 18.4786 6.64921 18.8187C6.86085 19.1588 7.16299 19.4305 7.52035 19.6019L10.4988 21.036V29.3642C10.4988 30.9407 11.0008 32.6998 12.465 33.7833C14.3104 35.143 17.6721 36.8002 23.0042 36.8002C28.3362 36.8002 31.6896 35.1324 33.5433 33.7833C35.0076 32.704 35.5095 30.9577 35.5095 29.3642V21.036L37.5924 20.0311V29.3579C37.5924 29.6396 37.7021 29.9098 37.8974 30.109C38.0927 30.3082 38.3576 30.4201 38.6338 30.4201C38.91 30.4201 39.1749 30.3082 39.3702 30.109C39.5655 29.9098 39.6752 29.6396 39.6752 29.3579V17.6728C39.6753 17.2704 39.5634 16.8763 39.3524 16.5363C39.1415 16.1963 38.8403 15.9244 38.4838 15.7522L26.57 10.0159C25.4565 9.47878 24.2401 9.2002 23.0083 9.2002C21.7766 9.2002 20.5602 9.47878 19.4467 10.0159L7.53285 15.7522L7.52035 15.7607ZM12.5816 29.3579V22.0281L19.4342 25.3425C20.5477 25.8796 21.7641 26.1582 22.9958 26.1582C24.2276 26.1582 25.444 25.8796 26.5575 25.3425L33.41 22.0281V29.3579C33.41 30.5391 33.0351 31.5037 32.3061 32.0348C30.7981 33.146 27.8697 34.6693 22.9958 34.6693C18.122 34.6693 15.1852 33.1566 13.6855 32.0348C12.9586 31.4994 12.5816 30.5285 12.5816 29.3579ZM20.3298 11.9365C21.1631 11.5338 22.0737 11.325 22.9958 11.325C23.9179 11.325 24.8285 11.5338 25.6619 11.9365L37.5757 17.6728L25.6619 23.4091C24.8285 23.8118 23.9179 24.0206 22.9958 24.0206C22.0737 24.0206 21.1631 23.8118 20.3298 23.4091L8.41597 17.6728L20.3298 11.9365Z" fill="#192647"/>
  </Svg>
);

const EmptyCredentialIcon = () => (
  <Svg width={46} height={46} viewBox="0 0 46 46" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M26.583 14.1895C31.718 14.1896 35.8632 18.3451 35.8633 23.4932C35.8633 26.7186 34.2337 29.558 31.7383 31.2266V37.9668H31.7549C31.7548 38.1664 31.6972 38.3619 31.5889 38.5293C31.4804 38.6967 31.3254 38.8288 31.1436 38.9102C30.9617 38.9914 30.7602 39.0183 30.5635 38.9873C30.3668 38.9563 30.1833 38.8687 30.0352 38.7354L26.5908 35.6338L23.1465 38.7354C22.9983 38.8687 22.8149 38.9563 22.6182 38.9873C22.4214 39.0183 22.22 38.9915 22.0381 38.9102C21.8562 38.8288 21.7012 38.6968 21.5928 38.5293C21.4844 38.3619 21.4269 38.1664 21.4268 37.9668V31.2266C18.9396 29.5725 17.3018 26.7186 17.3018 23.4932C17.3019 18.345 21.4478 14.1895 26.583 14.1895ZM26.5664 16.2568C22.5861 16.2568 19.3478 19.5029 19.3477 23.4932C19.3487 24.684 19.6429 25.8567 20.2041 26.9062C20.7653 27.9558 21.5768 28.8497 22.5654 29.5098C22.847 29.6986 23.0776 29.9544 23.2373 30.2539C23.397 30.5536 23.4804 30.8888 23.4805 31.2285V35.6523L25.1973 34.1084C25.5772 33.7679 26.0686 33.5792 26.5781 33.5791C27.0879 33.5791 27.58 33.7678 27.96 34.1084L29.6758 35.6523V31.2285C29.6758 30.8888 29.7602 30.5536 29.9199 30.2539C30.0796 29.9544 30.3102 29.6986 30.5918 29.5098H30.5674C32.5141 28.2072 33.7842 25.9948 33.7842 23.4932C33.7841 19.5029 30.5466 16.2569 26.5664 16.2568Z" fill="#192546"/>
    <Path d="M30.0918 8C33.5562 8 35.2886 7.99992 36.6084 8.67578C37.7697 9.27256 38.715 10.2205 39.3105 11.3848C39.9848 12.7121 39.9854 14.4446 39.9854 17.918V22.8799C39.9854 26.3534 39.9849 28.0908 39.3105 29.4141C38.7173 30.5799 37.7713 31.5276 36.6084 32.1221C36.2517 32.3038 35.8623 32.0143 35.8623 31.6133V30.8486C35.8623 30.4331 36.0934 30.0565 36.4131 29.7939C36.8523 29.4342 37.2135 28.9854 37.4756 28.4707C37.6403 28.1502 37.7744 27.6845 37.8467 26.7793C37.9124 25.9772 37.9228 24.9725 37.9229 23.5752V17.916C37.9229 16.1441 37.9229 14.9382 37.8467 14.0078C37.7724 13.1025 37.6384 12.6371 37.4756 12.3125C37.0797 11.5354 36.4485 10.9037 35.6729 10.5078C35.3511 10.3424 34.8867 10.2081 33.9834 10.1357C33.0554 10.0592 31.8594 10.0576 30.0859 10.0576L30.0918 10.0547H16.8926C15.1254 10.0547 13.9231 10.0552 12.9951 10.1338C12.0918 10.2062 11.6274 10.3405 11.3057 10.5059C10.5297 10.9023 9.89837 11.5346 9.50293 12.3125C9.33796 12.635 9.20403 13.0984 9.13184 14.0059C9.05554 14.9342 9.05371 16.134 9.05371 17.9121V22.874C9.05371 24.6456 9.05558 25.8509 9.13184 26.7812C9.20607 27.6863 9.34015 28.1521 9.50293 28.4746C9.89889 29.252 10.5303 29.8853 11.3057 30.2822C11.6274 30.4476 12.0918 30.5819 12.9951 30.6543C13.7396 30.7163 14.9216 30.7284 16.2744 30.7305C16.5476 30.7306 16.8097 30.8396 17.0029 31.0332C17.1963 31.2271 17.3057 31.4905 17.3057 31.7646C17.3056 32.0388 17.1962 32.3013 17.0029 32.4951C16.8096 32.6889 16.5478 32.7987 16.2744 32.7988C13.2222 32.7926 11.5721 32.732 10.376 32.1221C9.21299 31.5276 8.26681 30.58 7.67383 29.4141C6.99946 28.0867 7 26.3534 7 22.8799V17.918C7 14.4447 6.9996 12.708 7.67383 11.3848C8.26912 10.2205 9.2146 9.27256 10.376 8.67578C11.6999 7.99983 13.4282 8 16.8926 8H30.0918Z" fill="#192546"/>
  </Svg>
);

const EmptyPostsIcon = () => (
  <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <Path d="M19.1191 23.9795C19.348 23.9795 19.5676 24.0706 19.7295 24.2324C19.8913 24.3943 19.9824 24.6139 19.9824 24.8428C19.9824 25.0717 19.8913 25.2913 19.7295 25.4531C19.5676 25.615 19.348 25.706 19.1191 25.7061H9.5791C9.35034 25.7059 9.13051 25.6149 8.96875 25.4531C8.80702 25.2913 8.7168 25.0716 8.7168 24.8428C8.7168 24.614 8.80702 24.3943 8.96875 24.2324C9.13051 24.0707 9.35034 23.9796 9.5791 23.9795H19.1191ZM30.1846 20.1641C30.4135 20.1641 30.633 20.2551 30.7949 20.417C30.9568 20.5789 31.0479 20.7984 31.0479 21.0273C31.0478 21.2561 30.9567 21.4759 30.7949 21.6377C30.6331 21.7994 30.4133 21.8906 30.1846 21.8906H9.5791C9.35034 21.8905 9.13051 21.7995 8.96875 21.6377C8.80699 21.4759 8.71689 21.2561 8.7168 21.0273C8.7168 20.7986 8.80713 20.5788 8.96875 20.417C9.13051 20.2552 9.35034 20.1642 9.5791 20.1641H30.1846ZM11.3398 8.72656C11.574 8.74822 11.8041 8.80495 12.0225 8.89453C12.3133 9.0139 12.5775 9.1898 12.7998 9.41211C13.0221 9.63444 13.198 9.89858 13.3174 10.1895C13.4366 10.48 13.4971 10.7914 13.4951 11.1055C13.4952 11.5183 13.389 11.9249 13.1855 12.2842C12.9821 12.6434 12.689 12.944 12.335 13.1562C11.981 13.3685 11.5777 13.4849 11.165 13.4951C10.7523 13.5053 10.3436 13.4085 9.97949 13.2139C9.61539 13.0192 9.30777 12.7336 9.08691 12.3848C8.86612 12.036 8.73995 11.6359 8.71973 11.2236C8.69953 10.8114 8.7861 10.4009 8.97168 10.0322C9.15739 9.66348 9.43594 9.34842 9.7793 9.11914C10.1718 8.85683 10.6333 8.71708 11.1055 8.7168L11.3398 8.72656ZM29.4219 10.2432C29.6507 10.2432 29.8704 10.3334 30.0322 10.4951C30.194 10.6569 30.285 10.8767 30.2852 11.1055C30.2852 11.3342 30.1939 11.554 30.0322 11.7158C29.8704 11.8776 29.6507 11.9687 29.4219 11.9688H16.4482C16.2193 11.9688 15.9998 11.8777 15.8379 11.7158C15.6761 11.554 15.585 11.3343 15.585 11.1055C15.5851 10.8767 15.6761 10.6569 15.8379 10.4951C15.9997 10.3335 16.2195 10.2432 16.4482 10.2432H29.4219Z" fill="#192647" stroke="#192647" strokeWidth="0.2"/>
    <Path d="M23.7734 4.90039C25.6949 4.90039 27.1426 4.90024 28.293 4.99414C29.4443 5.08814 30.3073 5.27691 31.0586 5.65918C32.37 6.32734 33.4364 7.39364 34.1045 8.70508C34.4867 9.45637 34.6756 10.3193 34.7695 11.4707C34.8634 12.6209 34.8633 14.068 34.8633 15.9893V24.5371C34.8633 26.4567 34.863 27.5255 34.7686 28.2969C34.6731 29.0764 34.4811 29.5547 34.1045 30.2949C33.4364 31.6064 32.37 32.6727 31.0586 33.3408C30.3073 33.7231 29.4443 33.9119 28.293 34.0059C27.1426 34.0998 25.6949 34.0996 23.7734 34.0996H15.9893C14.068 34.0996 12.621 34.0997 11.4707 34.0059C10.3192 33.9119 9.45642 33.7231 8.70508 33.3408C7.39354 32.6727 6.32733 31.6065 5.65918 30.2949C5.28249 29.5546 5.08959 29.0765 4.99414 28.2969C4.89972 27.5255 4.90039 26.4567 4.90039 24.5371V15.9893C4.90039 14.068 4.90026 12.621 4.99414 11.4707C5.08813 10.3192 5.27689 9.45642 5.65918 8.70508C6.32733 7.39354 7.39354 6.32733 8.70508 5.65918C9.45642 5.27689 10.3192 5.08813 11.4707 4.99414C12.621 4.90026 14.068 4.90039 15.9893 4.90039H23.7734Z" fill="#192647" stroke="#192647" strokeWidth="0.2"/>
  </Svg>
);

const EmptyForumsIcon = () => (
  <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <Path d="M27.0312 19.5C26.8741 19.5 26.7049 19.4758 26.5478 19.4275C26.2473 19.326 25.9864 19.1325 25.8021 18.8744C25.6177 18.6163 25.5193 18.3067 25.5207 17.9896V15.8629C23.8291 15.7058 22.4999 14.28 22.4999 12.5521V8.32292C22.4999 6.48625 23.9861 5 25.8228 5H33.6771C35.5137 5 37 6.48625 37 8.32292V12.5521C37 14.3888 35.5137 15.875 33.6771 15.875H30.5112L28.2395 18.8958C27.9495 19.2825 27.5024 19.5 27.0312 19.5ZM25.8228 6.8125C24.9891 6.8125 24.3124 7.48917 24.3124 8.32292V12.5521C24.3124 13.3858 24.9891 14.0625 25.8228 14.0625H27.3333V17.0833L29.6049 14.0625H33.6891C34.5229 14.0625 35.1996 13.3858 35.1996 12.5521V8.32292C35.1996 7.48917 34.5229 6.8125 33.6891 6.8125H25.8228ZM17.0623 22.5208C15.7013 22.5176 14.3969 21.9756 13.4345 21.0132C12.4722 20.0508 11.9301 18.7464 11.9269 17.3854C11.9301 16.0244 12.4722 14.72 13.4345 13.7577C14.3969 12.7953 15.7013 12.2532 17.0623 12.25C18.4234 12.2532 19.7277 12.7953 20.6901 13.7577C21.6525 14.72 22.1946 16.0244 22.1978 17.3854C22.1946 18.7464 21.6525 20.0508 20.6901 21.0132C19.7277 21.9756 18.4234 22.5176 17.0623 22.5208ZM17.0623 14.0625C15.2257 14.0625 13.7394 15.5487 13.7394 17.3854C13.7394 19.2221 15.2257 20.7083 17.0623 20.7083C18.899 20.7083 20.3853 19.2221 20.3853 17.3854C20.3853 15.5487 18.899 14.0625 17.0623 14.0625ZM9.77724 31.4867C11.3602 33.1542 13.8131 34 17.0635 34C20.314 34 22.7669 33.1542 24.3499 31.4867C26.189 29.5413 26.1297 27.1935 26.1261 27.0352V27.0279C26.1261 25.5417 24.9178 24.3333 23.4315 24.3333H10.6956C9.20932 24.3333 8.00097 25.5417 8.00097 26.9796V26.9953C7.99614 27.2249 7.95022 29.5533 9.77724 31.4867ZM9.81349 27.0279C9.81349 26.5446 10.2122 26.1458 10.6956 26.1458H23.4315C23.9149 26.1458 24.3136 26.5446 24.3136 27.0763V27.0787C24.2878 28.2543 23.8321 29.3797 23.0328 30.2421C21.8123 31.535 19.7823 32.1875 17.0635 32.1875C14.3448 32.1875 12.351 31.5471 11.1185 30.2663C10.2881 29.397 9.82122 28.2433 9.81349 27.0412V27.0279Z" fill="#192647"/>
  </Svg>
);

const EmptyResourcesIcon = () => (
  <Svg width={39} height={39} viewBox="0 0 39 39" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M19.5839 20.0642H27.9563C28.3735 20.0642 28.5745 19.6946 28.5745 19.2388C28.5745 18.783 28.3735 18.4135 27.9563 18.4135H19.5839C19.1667 18.4135 18.8284 18.783 18.8284 19.2388C18.8284 19.6946 19.1667 20.0642 19.5839 20.0642ZM27.9563 22.806H9.9751C9.55794 22.806 9.21967 23.1756 9.21967 23.6313C9.21967 24.0871 9.55794 24.4567 9.9751 24.4567H27.9563C28.3735 24.4567 28.5745 24.0871 28.5745 23.6313C28.5745 23.1756 28.3735 22.806 27.9563 22.806ZM19.5839 15.6716H27.9563C28.3735 15.6716 28.5745 15.3021 28.5745 14.8463C28.5745 14.3905 28.3735 14.0209 27.9563 14.0209H19.5839C19.1667 14.0209 18.8284 14.3905 18.8284 14.8463C18.8284 15.3021 19.1667 15.6716 19.5839 15.6716ZM9.93282 20.062H16.0569C16.4509 20.062 16.7703 19.7402 16.7703 19.3435V14.739C16.7703 14.3422 16.4509 14.0206 16.0569 14.0206H9.93282C9.5389 14.0206 9.21967 14.3422 9.21967 14.739V19.3437C9.21949 19.7402 9.53872 20.062 9.93282 20.062ZM10.866 15.6711H15.1196V18.4157H10.866V15.6711ZM30.7525 4.82715H6.90269C5.75628 4.82715 4.82715 5.7539 4.82715 6.8972V30.7569C4.82715 31.9002 5.75628 32.8271 6.90269 32.8271H30.7523C31.8986 32.8271 32.8279 31.9004 32.8279 30.7569V6.8972C32.8279 5.7539 31.8986 4.82715 30.7525 4.82715ZM31.0441 30.5433C31.0441 30.8953 30.7587 31.1805 30.4069 31.1805H7.11246C6.76047 31.1805 6.4751 30.8951 6.4751 30.5433V11.4131H31.0443L31.0441 30.5433ZM31.0441 9.76789H6.4751V7.11155C6.4751 6.75955 6.76047 6.47419 7.11246 6.47419H30.4069C30.7589 6.47419 31.0441 6.75955 31.0441 7.11155V9.76789ZM9.838 28.8492H18.2105C18.6276 28.8492 18.9659 28.4796 18.9659 28.0239C18.9659 27.5681 18.6276 27.1985 18.2105 27.1985H9.838C9.42084 27.1985 9.08257 27.5681 9.08257 28.0239C9.08257 28.4796 9.42066 28.8492 9.838 28.8492Z" fill="#192647"/>
  </Svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Skeleton = ({w, h, r = 6}: {w: any; h: number; r?: number}) => (
  <View style={{width: w, height: h, borderRadius: r, backgroundColor: '#EFEFEF', marginBottom: 6}} />
);

const stripHtml = (html: string) =>
  (html || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#8217;/g, "'").replace(/&nbsp;/g, ' ').trim();

/** Convert country name to flag emoji */
const countryToFlag = (country: string): string => {
  const map: Record<string, string> = {
    'pakistan': '🇵🇰', 'cuba': '🇨🇺', 'usa': '🇺🇸', 'united states': '🇺🇸',
    'uk': '🇬🇧', 'united kingdom': '🇬🇧', 'india': '🇮🇳', 'canada': '🇨🇦',
    'australia': '🇦🇺', 'germany': '🇩🇪', 'france': '🇫🇷', 'spain': '🇪🇸',
    'italy': '🇮🇹', 'brazil': '🇧🇷', 'mexico': '🇲🇽', 'china': '🇨🇳',
    'japan': '🇯🇵', 'south korea': '🇰🇷', 'uae': '🇦🇪',
    'united arab emirates': '🇦🇪', 'saudi arabia': '🇸🇦', 'nigeria': '🇳🇬',
    'south africa': '🇿🇦', 'kenya': '🇰🇪', 'egypt': '🇪🇬',
    'turkey': '🇹🇷', 'netherlands': '🇳🇱', 'sweden': '🇸🇪',
    'norway': '🇳🇴', 'denmark': '🇩🇰', 'finland': '🇫🇮',
    'poland': '🇵🇱', 'russia': '🇷🇺', 'ukraine': '🇺🇦',
    'argentina': '🇦🇷', 'colombia': '🇨🇴', 'chile': '🇨🇱',
    'peru': '🇵🇪', 'philippines': '🇵🇭', 'indonesia': '🇮🇩',
    'malaysia': '🇲🇾', 'singapore': '🇸🇬', 'thailand': '🇹🇭',
    'vietnam': '🇻🇳', 'bangladesh': '🇧🇩', 'sri lanka': '🇱🇰',
    'nepal': '🇳🇵', 'iran': '🇮🇷', 'iraq': '🇮🇶', 'jordan': '🇯🇴',
    'morocco': '🇲🇦', 'ghana': '🇬🇭', 'ethiopia': '🇪🇹',
    'portugal': '🇵🇹', 'greece': '🇬🇷', 'belgium': '🇧🇪',
    'switzerland': '🇨🇭', 'austria': '🇦🇹', 'ireland': '🇮🇪',
    'new zealand': '🇳🇿', 'israel': '🇮🇱',
  };
  return map[country.toLowerCase().trim()] || '';
};

/** Parse xprofile.groups (numeric-keyed object) into flat name→value map */
const parseXprofile = (xprofile: any): Record<string, string> => {
  // Handle both: xprofile = {groups: {...}} OR xprofile = {...groups directly...}
  const raw = xprofile?.groups || xprofile;
  if (!raw || typeof raw !== 'object') return {};
  const map: Record<string, string> = {};

  const processGroups = (groups: any) => {
    for (const gKey of Object.keys(groups)) {
      const group = groups[gKey];
      if (!group || typeof group !== 'object') continue;
      const fields = group.fields;
      if (!fields) continue;
      // IMPORTANT: field objects in the real API response do NOT carry
      // their own `id` property — the ID only exists as the object's KEY
      // (e.g. fields["10"] = {name: "Job Title", value: {...}}).
      // Object.values(fields) was discarding that key entirely, so
      // `field?.id` was always undefined and every map['field_N'] lookup
      // in this file was silently failing — confirmed via Postman (a
      // real field object has no "id" key anywhere in it). Using
      // Object.entries so the key survives.
      const entries: [string, any][] = Array.isArray(fields)
        ? fields.map((f: any, i: number) => [String(f?.id ?? i), f])
        : Object.entries(fields);
      for (const [fieldId, field] of entries) {
        if (!field || typeof field !== 'object') continue;
        const val = field?.value?.raw?.trim()
          || (typeof field?.value === 'string' ? field.value.trim() : '');
        if (field?.name && val) {
          map[field.name.toLowerCase()] = val;
          map[`field_${fieldId}`] = val;
        }
      }
    }
  };

  processGroups(raw);
  return map;
};

const searchXField = (map: Record<string, string>, ...keys: string[]): string => {
  for (const key of keys) {
    const lower = key.toLowerCase();
    if (map[lower]) return map[lower];
    const found = Object.entries(map).find(([k]) => k.includes(lower));
    if (found) return found[1];
  }
  return '';
};

// ─── PMs You May Know ────────────────────────────────────────────────────────
const PMsYouMayKnow = ({currentUserId, members: membersProp}: {currentUserId: number; members?: any[]}) => {
  const [members,   setMembers]   = useState<any[]>([]);
  const [following, setFollowing] = useState<Record<number, boolean>>({});
  const [loading,   setLoading]   = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (membersProp && membersProp.length > 0) {
      // New consolidated endpoint's shape: {user_id, full_name, position,
      // avatar, profile_url, is_following, country} — normalize to what
      // this component already expects (id/name/role/avatarUrl) so the
      // render below doesn't need two code paths.
      const list = membersProp
        .filter((m: any) => m.user_id !== currentUserId)
        .map((m: any) => ({
          id: m.user_id,
          fullName: decodeMentorEntities(m.full_name || ''),
          role: decodeMentorEntities(m.position || ''),
          avatarUrl: m.avatar || '',
          is_following: m.is_following || false,
        }));
      setMembers(list);
      const map: Record<number, boolean> = {};
      list.forEach((m: any) => { map[m.id] = m.is_following; });
      setFollowing(map);
      return;
    }
    // Fallback — only used if profileData hasn't loaded yet / has no
    // suggestions (e.g. new endpoint temporarily unavailable).
    apiRequest(`${BASE}/buddyboss/v1/members?per_page=10&type=active`)
      .then((r: any) => {
        const list = Array.isArray(r)
          ? r.filter((m: any) => m.id !== currentUserId).map((m: any) => {
              const xmap = parseXprofile(m?.xprofile);
              const firstName = xmap['first name'] || xmap['field_1'] || '';
              const lastName  = xmap['last name']  || xmap['field_2'] || '';
              return {
                id: m.id,
                fullName: (firstName && lastName) ? `${firstName} ${lastName}`.trim() : (m?.name || m?.user_login || ''),
                role: xmap['job title'] || xmap['field_1097'] || searchXField(xmap, 'position', 'title') || '',
                avatarUrl: m?.avatar_urls?.thumb || m?.avatar_urls?.full || '',
                is_following: m.is_following || false,
              };
            })
          : [];
        setMembers(list);
        const map: Record<number, boolean> = {};
        list.forEach((m: any) => { map[m.id] = m.is_following; });
        setFollowing(map);
      })
      .catch(() => {});
  }, [currentUserId, membersProp]);

  if (members.length === 0) return null;

  const toggle = async (id: number) => {
    const isFlw = following[id];
    // Optimistic update immediately
    setFollowing(prev => ({...prev, [id]: !isFlw}));
    setLoading(prev => ({...prev, [id]: true}));
    try {
      // Confirmed via route discovery: POST .../members/action/{id} with
      // {action: 'follow'|'unfollow'} — NOT /follow (unconfirmed, likely
      // 404s the same way /friendship did).
      const result = await apiRequest(
        `${BASE}/buddyboss/v1/members/action/${id}`,
        'POST',
        {action: isFlw ? 'unfollow' : 'follow'},
      );
      // apiRequest only throws on HTTP-level failure now, but this endpoint
      // can return 200 with a body that shows the action didn't actually
      // take (confirmed via Postman) — check the real resulting state too.
      if (result?.data && typeof result.data.is_following === 'boolean') {
        if (result.data.is_following === isFlw) {
          throw new Error('Follow state did not change server-side');
        }
      }
    } catch {
      // Revert on failure
      setFollowing(prev => ({...prev, [id]: isFlw}));
    } finally {
      setLoading(prev => ({...prev, [id]: false}));
    }
  };

  return (
    <View style={s.pmsSection}>
      <Text style={s.activitySectionLabel}>{"PMs You May Know"}</Text>
      {/* Horizontal scrollable list */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.pmsScrollContent}>
        {members.map((m: any) => {
          const isFlw = following[m.id] || false;
          const busy  = loading[m.id]   || false;

          return (
            <View key={m.id} style={s.pmsCard}>
              {m.avatarUrl
                ? <Image source={{uri: m.avatarUrl}} style={s.pmsAvatar} />
                : <View style={[s.pmsAvatar, {backgroundColor:"#192546", alignItems:"center", justifyContent:"center"}]}>
                    <Text style={{color:"#FFF", fontWeight:"700", fontSize:20}}>
                      {m.fullName[0] || "?"}
                    </Text>
                  </View>
              }
              <Text style={s.pmsName} numberOfLines={2}>{m.fullName}</Text>
              {/* Always rendered (even when empty) so every card reserves the
                  same 2-line height here — otherwise members with no role
                  text end up shorter than others and the Follow button
                  below sits at a different y-position per card. */}
              <Text style={s.pmsRole} numberOfLines={2}>{m.role || ' '}</Text>
              <TouchableOpacity
                style={[s.pmsFollowBtn, isFlw && s.pmsFollowBtnActive]}
                onPress={() => toggle(m.id)}
                disabled={busy}>
                {busy
                  ? <ActivityIndicator size="small" color={isFlw ? "#192546" : "#FFF"} />
                  : <Text style={[s.pmsFollowBtnText, isFlw && s.pmsFollowBtnTextActive]}>
                      {isFlw ? "✓ Following" : "+ Follow"}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

// ─── Activity Tab — matches web: Resources + Forums sections ─────────────────
const ActivityTab = ({userId, displayName, navigation, profileData}: {userId: number; displayName: string; navigation?: any; profileData?: any}) => {
  const [resources, setResources] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);

  // Forums and Posts now come straight from profileData.activity (the new
  // consolidated endpoint) — no separate fetch, no client-side author
  // filtering needed since this endpoint is already scoped to the right
  // user server-side.
  const forums: any[] = profileData?.activity?.forums || [];
  const posts: any[]  = profileData?.activity?.posts || [];

  useEffect(() => {
    const load = async () => {
      try {
        // Resources: WP posts by this author (published articles/resources)
        // — not part of the new consolidated endpoint yet, still a
        // separate fetch.
        const wpPosts = await apiRequest(
          `${BASE}/wp/v2/posts?author=${userId}&per_page=10&_embed&status=publish`,
        ).catch(() => []);

        const wpPostsFiltered = Array.isArray(wpPosts)
          ? wpPosts.filter((p: any) => Number(p?.author) === Number(userId))
          : [];

        setResources(wpPostsFiltered);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) return (
    <View style={s.tabContent}>
      {[1,2,3].map(i => (
        <View key={i} style={s.resourceCard}>
          <View style={[s.resourceThumb, {backgroundColor:'#EFEFEF'}]} />
          <View style={{flex:1, gap:4}}>
            <Skeleton w="80%" h={12} />
            <Skeleton w="50%" h={10} />
          </View>
        </View>
      ))}
    </View>
  );

  if (resources.length === 0 && forums.length === 0 && posts.length === 0) return (
    <View style={s.activityEmptyWrap}>
      {/* Resources empty */}
      <Text style={s.activitySectionLabel}>{'Resources Published on IPM'}</Text>
      <View style={s.activityEmptyCard}>
        <Text style={s.activityEmptyTitle}>{'Publish Your First Resource on IPM'}</Text>
        <Text style={s.activityEmptyDesc}>{'Share your insights and contribute to the project management community.'}</Text>
        {/* Route name assumed as 'ArticleSubmission' (ArticleSubmissionScreen.tsx)
            per this file's existing convention (screen file name minus 'Screen').
            Confirm against AppNavigator if this doesn't resolve. */}
        <TouchableOpacity style={s.activityEmptyBtn} onPress={() => navigation?.navigate('ArticleSubmission')}>
          <Text style={s.activityEmptyBtnText}>{'Submit a Resource'}</Text>
        </TouchableOpacity>
      </View>

      {/* Forums empty */}
      <Text style={[s.activitySectionLabel, {marginTop:20}]}>{'Forums'}</Text>
      <View style={s.activityEmptyCard}>
        <Text style={s.activityEmptyTitle}>{'Join Your First Discussion'}</Text>
        <Text style={s.activityEmptyDesc}>{'Take part in conversations with project professionals across industries and regions.'}</Text>
        {/* Route name assumed as 'NewDiscussion' (NewDiscussionScreen.tsx) */}
        <TouchableOpacity style={s.activityEmptyBtn} onPress={() => navigation?.navigate('NewDiscussion')}>
          <Text style={s.activityEmptyBtnText}>{'Join Discussion'}</Text>
        </TouchableOpacity>
      </View>

      {/* Posts empty */}
      <Text style={[s.activitySectionLabel, {marginTop:20}]}>{'Posts'}</Text>
      <View style={s.activityEmptyCard}>
        <Text style={s.activityEmptyTitle}>{'Share an Update with the Community'}</Text>
        <Text style={s.activityEmptyDesc}>{'Post reflections, lessons learned, or updates from your project work to the IPM Hub.'}</Text>
        {/* Route name assumed as 'CreatePost' (CreatePostScreen.tsx) */}
        <TouchableOpacity style={s.activityEmptyBtn} onPress={() => navigation?.navigate('CreatePost')}>
          <Text style={s.activityEmptyBtnText}>{'Create Your First Post'}</Text>
        </TouchableOpacity>
      </View>

      <PMsYouMayKnow currentUserId={userId} />
    </View>
  );

  return (
    <View style={s.tabContent}>
      {resources.length > 0 && (
        <>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>{'Resources Published on IPM'}</Text>
            <TouchableOpacity><ChevronRightCircle /></TouchableOpacity>
          </View>
          {resources.map((r: any) => {
            const img  = r?._embedded?.['wp:featuredmedia']?.[0]?.source_url;
            const date = new Date(r.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'});
            const tag  = r?._embedded?.['wp:term']?.[0]?.[0]?.name || 'Articles';
            return (
              <View key={r.id} style={s.resourceCard}>
                {img
                  ? <Image source={{uri: img}} style={s.resourceThumb} />
                  : <View style={[s.resourceThumb, {backgroundColor:'#1A3A6B', alignItems:'center', justifyContent:'center'}]}>
                      <Text style={{color:'#FFF', fontSize:18}}>{'📄'}</Text>
                    </View>
                }
                <View style={{flex:1}}>
                  <Text style={s.resourceTitle} numberOfLines={2}>{stripHtml(r.title?.rendered || '')}</Text>
                  <Text style={s.resourceMeta}>{date}{'  '}<Text style={s.resourceTag}>{tag}</Text></Text>
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* Forums section */}
      {forums.length > 0 && (
        <>
          <View style={s.divider} />
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>{'Forums'}</Text>
          </View>
          {forums.map((f: any) => {
            const title = stripHtml(f.title || f.excerpt || f.type_label || '');
            const date  = f.date_display || (f.date ? new Date(f.date).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}) : '');
            return (
              <View key={f.id} style={s.resourceCard}>
                <View style={[s.resourceThumb, {backgroundColor:'#EFF3FF', alignItems:'center', justifyContent:'center'}]}>
                  <EmptyForumsIcon />
                </View>
                <View style={{flex:1}}>
                  <Text style={s.resourceTitle} numberOfLines={2}>{title}</Text>
                  <Text style={s.resourceMeta}>{date}</Text>
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* Posts/Updates section */}
      {posts.length > 0 && (
        <>
          <View style={s.divider} />
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>{'Posts'}</Text>
          </View>
          {posts.map((p: any) => {
            const text = stripHtml(p.excerpt || p.content?.rendered || p.content || p.title || '');
            const date = p.date_display || (p.date ? new Date(p.date).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}) : '');
            return (
              <View key={p.id} style={s.activityRow}>
                <View style={s.activityDot} />
                <View style={{flex:1}}>
                  <Text style={s.activityText} numberOfLines={3}>{text}</Text>
                  <Text style={s.activityTime}>{date}</Text>
                </View>
              </View>
            );
          })}
        </>
      )}
      <PMsYouMayKnow currentUserId={userId} members={profileData?.sidebar?.pms_you_may_know?.members} />
    </View>
  );
};

// ─── Experience Tab ───────────────────────────────────────────────────────────
const ExperienceTab = ({userId, isOwn, navigation, displayName, profileData}: {userId: number; isOwn: boolean; navigation: any; displayName?: string; profileData?: any}) => {
  const [xprofile, setXprofile] = useState<any>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    // This fetch now only serves Credential — Specialities/Experience/
    // Education/Projects all come from profileData (the new consolidated
    // /custom/v1/member-profile/{id} endpoint) instead, which is what
    // fixed the sync issues the old per-field xProfile reads kept hitting
    // (missing data for some accounts, stale/duplicate repeater slots).
    // Credential isn't part of that new endpoint yet, so it still needs
    // this xProfile-based read.
    apiRequest(`${BASE}/buddyboss/v1/members/${userId}?xprofile=1`)
      .then(d => setXprofile(d?.xprofile))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return (
    <View style={s.tabContent}>
      <Skeleton w="55%" h={14} />
      <View style={{flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:20}}>
        {[1,2,3,4].map(i => <Skeleton key={i} w={80} h={28} r={20} />)}
      </View>
      <Skeleton w="40%" h={14} />
      <Skeleton w="100%" h={100} r={10} />
    </View>
  );

  const map = parseXprofile(xprofile);

  // Specialities/Projects/Experience/Education — all from the new
  // consolidated endpoint now (profileData), a plain array direct from
  // the backend rather than a fixed number of guessed field-ID slots.
  // This is what fixes accounts where web-added specialities/experience
  // weren't showing in the app.
  const specialities: string[] = profileData?.specialities || [];

  const projects: any[] = profileData?.projects || [];
  const hasProjects = projects.length > 0;

  const experienceEntries = (profileData?.experience || []).map((e: any) => ({
    title: e.job_title || '',
    company: e.company || '',
    dateRange: [
      [e.start_month, e.start_year].filter(Boolean).join(' '),
      e.currently_working ? 'Present' : [e.end_month, e.end_year].filter(Boolean).join(' '),
    ].filter(Boolean).join(' \u2013 '),
    description: e.description || '',
  }));
  const hasExperience = experienceEntries.length > 0;

  const educationEntries = (profileData?.education || []).map((ed: any) => ({
    title: ed.institution_name || '',
    subtitle: [ed.degree, ed.field_of_study].filter(Boolean).join(', '),
    dateRange: [
      [ed.start_month, ed.start_year].filter(Boolean).join(' '),
      ed.currently_studying ? 'Present' : [ed.end_month, ed.end_year].filter(Boolean).join(' '),
    ].filter(Boolean).join(' \u2013 '),
    description: ed.description || '',
  }));
  const hasEducation = educationEntries.length > 0;

  // Credential — not part of the new endpoint yet, still reads confirmed
  // field IDs (group 7, first entry) from xProfile directly.
  const credName     = map['field_1193'] || searchXField(map, 'certificate name');
  const credOrg      = map['field_1198'] || searchXField(map, 'organisation name');
  const credLocation = map['field_1203'] || searchXField(map, 'location');
  const hasCredential = !!credName;

  return (
    <View style={s.experienceFrame}>
      {/* Specialities — no outer heading/pencil row anymore; card is
          self-contained per Figma. Edit affordance deferred (empty-state
          '+' only) — TODO: add an edit entry point for populated state. */}
      {specialities.length > 0 ? (
        <>
          <Text style={s.sectionTitle}>{'Specialities'}</Text>
          <View style={s.tagsRow}>
            {specialities.map((sp, i) => (
              <View key={i} style={s.tag}><Text style={s.tagText}>{sp}</Text></View>
            ))}
          </View>
        </>
      ) : (
        <View style={s.infoCard}>
          <View style={s.infoCardRow}>
            <View style={s.infoCardTextWrap}>
              <Text style={s.infoCardTitle}>{'Specialities'}</Text>
              <Text style={s.infoCardDesc}>{isOwn ? 'You haven\u2019t added any project details yet.' : `${displayName || 'This member'} hasn\u2019t added any project details yet.`}</Text>
            </View>
            {isOwn && (
              <TouchableOpacity onPress={() => navigation?.navigate('EditSpecialities')}>
                <Text style={s.infoCardPlus}>{'+'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={s.dividerFlat} />

      {/* Projects — from the new consolidated endpoint (profileData.projects),
          an array so this now supports real multiple entries. Each
          project's own specialities[] comes straight from the backend too
          — no more guessing at a per-project tags field. */}
      {hasProjects ? (
        <>
          <Text style={s.sectionTitle}>{'Projects'}</Text>
          {projects.map((p, i) => (
            <View key={i} style={[s.projectCard, i > 0 && {marginTop:12}]}>
              {p.image_url ? (
                <Image source={{uri: p.image_url}} style={s.projectThumb} />
              ) : (
                <View style={s.projectThumb}>
                  <Text style={{fontSize:26}}>{'\ud83c\udfd7\ufe0f'}</Text>
                </View>
              )}
              <View style={{flex:1}}>
                <Text style={s.projectTitle}>{p.name}</Text>
                {p.role ? <Text style={s.projectRole}>{p.role}</Text> : null}
                {p.organisation ? <Text style={s.projectRole}>{p.organisation}</Text> : null}
                {p.description ? <Text style={s.projectDesc} numberOfLines={3}>{p.description}</Text> : null}
                {p.specialities?.length > 0 && (
                  <View style={s.tagsRow}>
                    {p.specialities.map((t: string, j: number) => (
                      <View key={j} style={s.tagSmall}><Text style={s.tagSmallText}>{t}</Text></View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}
        </>
      ) : (
        <View style={s.infoCard}>
          <View style={s.infoCardRow}>
            <View style={s.infoCardIconWrap}><EmptyProjectsIcon /></View>
            <View style={s.infoCardTextWrap}>
              <Text style={s.infoCardTitle}>{'Projects'}</Text>
              <Text style={s.infoCardDesc}>{isOwn ? 'You haven\u2019t added any project details yet.' : `${displayName || 'This member'} hasn\u2019t added any project details yet.`}</Text>
            </View>
            {isOwn && (
              <TouchableOpacity onPress={() => navigation?.navigate('EditProjects')}>
                <Text style={s.infoCardPlus}>{'+'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={s.dividerFlat} />

      {/* Experience */}
      {hasExperience ? (
        <>
          <Text style={s.sectionTitle}>{'Experience'}</Text>
          {experienceEntries.map((entry, i) => (
            <TimelineEntry
              key={i}
              title={entry.title}
              subtitle={entry.company}
              dateRange={entry.dateRange}
              description={entry.description}
              isLast={i === experienceEntries.length - 1}
            />
          ))}
        </>
      ) : (
        <View style={s.infoCard}>
          <View style={s.infoCardRow}>
            <View style={s.infoCardIconWrap}><EmptyExperienceIcon /></View>
            <View style={s.infoCardTextWrap}>
              <Text style={s.infoCardTitle}>{'Experience'}</Text>
              <Text style={s.infoCardDesc}>{isOwn ? 'You haven\u2019t added your professional experience yet.' : `${displayName || 'This member'} hasn\u2019t added their professional experience yet.`}</Text>
            </View>
            {isOwn && (
              <TouchableOpacity onPress={() => navigation?.navigate('EditExperience')}>
                <Text style={s.infoCardPlus}>{'+'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={s.dividerFlat} />

      {/* Education — from the new consolidated endpoint (profileData.education),
          array-based so this now supports multiple entries too. */}
      {hasEducation ? (
        <>
          <Text style={s.sectionTitle}>{'Education'}</Text>
          {educationEntries.map((entry, i) => (
            <TimelineEntry
              key={i}
              title={entry.title}
              subtitle={entry.subtitle}
              dateRange={entry.dateRange}
              description={entry.description}
              isLast={i === educationEntries.length - 1}
            />
          ))}
        </>
      ) : (
        <View style={s.infoCard}>
          <View style={s.infoCardRow}>
            <View style={s.infoCardIconWrap}><EmptyEducationIcon /></View>
            <View style={s.infoCardTextWrap}>
              <Text style={s.infoCardTitle}>{'Education'}</Text>
              <Text style={s.infoCardDesc}>{isOwn ? 'You haven\u2019t added your education details yet.' : `${displayName || 'This member'} hasn\u2019t added their education details yet.`}</Text>
            </View>
            {isOwn && (
              <TouchableOpacity onPress={() => navigation?.navigate('EditEducation')}>
                <Text style={s.infoCardPlus}>{'+'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={s.dividerFlat} />

      {/* Credential — confirmed field IDs (group 7), same timeline style. */}
      {hasCredential ? (
        <>
          <Text style={s.sectionTitle}>{'Credential'}</Text>
          <TimelineEntry
            title={credName}
            subtitle={[credOrg, credLocation].filter(Boolean).join(' \u00b7 ')}
            isLast
          />
        </>
      ) : (
        <View style={s.infoCard}>
          <View style={s.infoCardRow}>
            <View style={s.infoCardIconWrap}><EmptyCredentialIcon /></View>
            <View style={s.infoCardTextWrap}>
              <Text style={s.infoCardTitle}>{'Credential'}</Text>
              <Text style={s.infoCardDesc}>{isOwn ? 'You haven\u2019t added your Credential details yet.' : `${displayName || 'This member'} hasn\u2019t added their Credential details yet.`}</Text>
            </View>
            {isOwn && (
              <TouchableOpacity onPress={() => navigation?.navigate('EditCredential')}>
                <Text style={s.infoCardPlus}>{'+'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

// ─── Connections Tab ──────────────────────────────────────────────────────────
const ConnectionsTab = ({userId, isOwn, totalFollowers, totalFollowing, displayName, profileData}: {
  userId: number;
  isOwn: boolean;
  totalFollowers: number;
  totalFollowing: number;
  displayName?: string;
  profileData?: any;
}) => {
  const [subTab,    setSubTab]   = useState<'followers'|'following'>('followers');
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [loading,   setLoading]  = useState(true);
  const [busy,      setBusy]     = useState<Record<number,boolean>>({});

  // Normalize the new endpoint's connections shape ({user_id, name,
  // username, headline, country, avatar_url, profile_url}) into what
  // MemberRow already expects (id/name/avatar/xprofile-derived fields).
  const normalize = (list: any[]) => (list || []).map((m: any) => ({
    id: m.user_id,
    name: decodeMentorEntities(m.name || ''),
    avatarUrl: m.avatar_url || '',
    jobTitle: decodeMentorEntities(m.headline || ''),
    country: decodeMentorEntities(m.country || ''),
    is_following: m.is_following ?? false,
  }));

  useEffect(() => {
    if (profileData?.connections) {
      setFollowers(normalize(profileData.connections.followers));
      setFollowing(normalize(profileData.connections.following));
      setLoading(false);
    } else {
      fetchAll();
    }
  }, [userId, profileData]);

  // Fallback / refresh — re-hits the new consolidated endpoint (used if
  // profileData wasn't ready yet, or to refresh counts/lists after a
  // follow/unfollow action).
  const fetchAll = async () => {
    setLoading(true);
    try {
      const mp = await apiRequest(`${BASE}/custom/v1/member-profile/${userId}`).catch(() => null);
      setFollowers(normalize(mp?.connections?.followers));
      setFollowing(normalize(mp?.connections?.following));
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async (memberId: number, isFollowing: boolean) => {
    setBusy(p => ({...p, [memberId]: true}));
    try {
      // Confirmed via route discovery: POST .../members/action/{id} with
      // {action: 'follow'|'unfollow'} — NOT /follow (unconfirmed, likely
      // 404s the same way /friendship did for the standalone Follow flow).
      const result = await apiRequest(
        `${BASE}/buddyboss/v1/members/action/${memberId}`,
        'POST',
        {action: isFollowing ? 'unfollow' : 'follow'},
      );
      if (
        result?.data &&
        typeof result.data.is_following === 'boolean' &&
        result.data.is_following === isFollowing
      ) {
        throw new Error('Follow state did not change server-side');
      }
      fetchAll();
    } catch {}
    finally { setBusy(p => ({...p, [memberId]: false})); }
  };

  const list = subTab === 'followers' ? followers : following;
  const fCnt  = profileData?.connections?.followers_count ?? totalFollowers;
  const fgCnt = profileData?.connections?.following_count ?? totalFollowing;

  const MemberRow = ({item}: {item: any}) => {
    // Being listed in the profile owner's own "Following" tab means they
    // follow this person BY DEFINITION — that's tautologically true
    // regardless of what the custom /member-profile endpoint's per-item
    // is_following field says. That field was defaulting to false for
    // everyone here (confirmed: "Message" never showed even for real
    // follows), which only makes sense if the backend simply isn't
    // populating it for this sub-list. The "Followers" tab has no such
    // guarantee — those people follow YOU, not necessarily the other way
    // round — so it still relies on the real is_following field there.
    const isFlw = subTab === 'following' ? true : item?.is_following || false;

    return (
      <View style={s.connRow}>
        {item.avatarUrl
          ? <Image source={{uri: item.avatarUrl}} style={s.connAvatar} />
          : <View style={[s.connAvatar, {backgroundColor:'#192546', alignItems:'center', justifyContent:'center'}]}>
              <Text style={{color:'#FFF', fontWeight:'700', fontSize:16}}>{item.name[0] || '?'}</Text>
            </View>
        }
        <View style={{flex:1}}>
          <Text style={s.connName}>{item.name}</Text>
          {item.jobTitle
            ? <Text style={s.connMeta} numberOfLines={1}>{item.jobTitle}</Text>
            : null}
          {item.country
            ? <View style={{flexDirection:'row', alignItems:'center', gap:3, marginTop:2}}>
                <LocationPinIcon />
                <Text style={s.connCountry}>{item.country}</Text>
              </View>
            : null}
        </View>
        <TouchableOpacity
          style={[s.connBtn, isFlw && s.connBtnActive]}
          onPress={() => toggleFollow(item.id, isFlw)}
          disabled={busy[item.id]}>
          {busy[item.id]
            ? <ActivityIndicator size="small" color={isFlw ? '#888' : '#192546'} />
            : <Text style={[s.connBtnText, isFlw && s.connBtnTextActive]}>
                {/* A follower you haven't followed back is not yet a
                    connection — label reads "Follow", not "Connect". */}
                {isFlw ? 'Message' : 'Follow'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={s.tabContent}>
      <Text style={s.sectionTitle}>{'Connections'}</Text>

      {/* Followers / Following selector — per Marium's spec:
          count-circle pill (bg #8F9098 inactive / #0C4D91 active),
          label color follows the same active/inactive rule. */}
      <View style={s.connSelectorWrap}>
        <View style={s.subTabRow}>
          <TouchableOpacity style={s.subTabBox} onPress={() => setSubTab('followers')}>
            <Text style={[s.subTabLabel, subTab==='followers' && s.subTabLabelActive]}>{'Followers'}</Text>
            <View style={[s.subTabCount, subTab==='followers' && s.subTabCountActive]}>
              <Text style={s.subTabCountText}>{fCnt}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.subTabBox} onPress={() => setSubTab('following')}>
            <Text style={[s.subTabLabel, subTab==='following' && s.subTabLabelActive]}>{'Following'}</Text>
            <View style={[s.subTabCount, subTab==='following' && s.subTabCountActive]}>
              <Text style={s.subTabCountText}>{fgCnt}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {loading
          ? [1,2,3].map(i => (
              <View key={i} style={[s.connRow, {opacity:0.4}]}>
                <View style={[s.connAvatar, {backgroundColor:'#EFEFEF'}]} />
                <View style={{flex:1, gap:5}}>
                  <Skeleton w="55%" h={12} />
                  <Skeleton w="40%" h={10} />
                </View>
              </View>
            ))
          : list.length === 0
          ? <Text style={s.connEmptyText}>
              {isOwn
                ? (subTab === 'followers' ? 'You don\u2019t have any followers yet.' : 'You aren\u2019t following anyone yet.')
                : (subTab === 'followers' ? `${displayName || 'This member'} doesn't have any followers yet.` : `${displayName || 'This member'} isn't following anyone yet.`)
              }
            </Text>
          : list.map(item => <MemberRow key={item.id} item={item} />)
        }
      </View>
    </View>
  );
};

// ─── Courses & Certifications Tab ─────────────────────────────────────────────
// Courses and Certifications both come from the new consolidated
// /custom/v1/member-profile/{id} endpoint (profileData) now.
const CoursesTab = ({userId, isOwn, displayName, navigation, profileData}: {userId: number; isOwn: boolean; displayName?: string; navigation?: any; profileData?: any}) => {
  // Courses and Certifications both come from the new consolidated
  // endpoint (profileData) — no separate fetch needed. Confirmed with
  // Robby: `courses` here is intentionally scoped to COMPLETED courses
  // only, matching exactly what shows on the web member-profile page —
  // an empty array for an account with only in-progress courses is
  // expected, not a bug.
  const courses: any[] = profileData?.courses || [];
  const certifications: any[] = profileData?.certifications || [];

  return (
    <View style={s.coursesFrame}>
      <View style={s.coursesHeadingRow}>
        <Text style={s.sectionTitle}>{'Courses'}</Text>
      </View>

      {courses.length === 0 ? (
        <Text style={s.emptyCardDesc}>{isOwn ? 'You don\u2019t have any Courses yet.' : `${displayName || 'This member'} doesn't have any Courses yet.`}</Text>
      ) : (
        courses.map((c) => (
          <View key={c.id} style={s.courseCardShadowWrap}>
            <View style={s.courseCardClip}>
              <View style={s.courseImgPanel}>
                <LinearGradient
                  colors={['#ABE4FF', '#FFFFFF']}
                  style={StyleSheet.absoluteFillObject}
                />
                {c.logo_url ? (
                  <Image source={{uri: c.logo_url}} style={s.courseImgRotated} resizeMode="cover" />
                ) : null}
              </View>
              <View style={s.courseCardContent}>
                <View style={{flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', gap:8}}>
                  <Text style={[s.courseTitleV2, {flex:1}]} numberOfLines={2}>{stripHtml(c.title)}</Text>
                  <TouchableOpacity onPress={() => navigation?.navigate('CourseDetail', {courseId: c.id})}>
                    <ChevronRightCircle />
                  </TouchableOpacity>
                </View>
                {(c.start_date || c.completed_date) ? (
                  <View style={s.courseMetaRow}>
                    <CalendarIcon />
                    <Text style={s.courseMetaTextV2}>{c.status_slug === 'completed' ? c.completed_date : c.start_date}</Text>
                  </View>
                ) : null}
                {c.delivery ? (
                  <View style={s.courseMetaRow}>
                    <FormatDeliveryIcon />
                    <Text style={s.courseMetaTextV2}>{c.delivery}</Text>
                  </View>
                ) : null}
                <View style={s.courseStatusBtnRow}>
                  {c.status ? <Text style={s.courseStatusV2}>{c.status}</Text> : null}
                  <TouchableOpacity
                    style={s.courseContinueBtn}
                    onPress={() => navigation?.navigate('CourseDetail', {courseId: c.id})}>
                    <Text style={s.courseContinueBtnText}>{c.status_slug === 'completed' ? 'View Course' : 'Continue Course'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ))
      )}

      <View style={s.coursesHeadingRow}>
        <Text style={s.sectionTitle}>{'Certifications'}</Text>
      </View>
      {certifications.length === 0 ? (
        <Text style={s.emptyCardDesc}>{isOwn ? 'You don\u2019t have any Certifications yet.' : `${displayName || 'This member'} doesn't have any Certifications yet.`}</Text>
      ) : (
        certifications.map((cert, i) => (
          <View key={cert.certificate_id || i} style={s.courseCardShadowWrap}>
            <View style={s.certCardClip}>
              {cert.logo_url ? (
                <Image source={{uri: cert.logo_url}} style={s.certLogo} resizeMode="contain" />
              ) : null}
              <View style={s.courseCardContent}>
                <Text style={s.courseTitleV2} numberOfLines={2}>{stripHtml(cert.name || cert.title)}</Text>
                {cert.issue_on ? (
                  <View style={s.courseMetaRow}>
                    <CalendarIcon />
                    <Text style={s.courseMetaTextV2}>{`Issued ${cert.issue_on}`}</Text>
                  </View>
                ) : null}
                <View style={s.courseStatusBtnRow}>
                  {cert.status_label ? <Text style={s.courseStatusV2}>{cert.status_label}</Text> : null}
                  {cert.certificate_url ? (
                    <TouchableOpacity
                      style={s.courseContinueBtn}
                      onPress={() => Linking.openURL(cert.certificate_url)}>
                      <Text style={s.courseContinueBtnText}>{'View Certificate'}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
};

// ─── Mentorship Tab icons ──────────────────────────────────────────────────────
const SessionDurationIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path d="M8.75 6.125C8.75 6.58913 8.56562 7.03425 8.23744 7.36244C7.90925 7.69063 7.46413 7.875 7 7.875C6.53587 7.875 6.09075 7.69063 5.76256 7.36244C5.43437 7.03425 5.25 6.58913 5.25 6.125C5.25 5.66087 5.43437 5.21575 5.76256 4.88756C6.09075 4.55937 6.53587 4.375 7 4.375C7.46413 4.375 7.90925 4.55937 8.23744 4.88756C8.56562 5.21575 8.75 5.66087 8.75 6.125ZM0.875 4.15625C0.875 3.311 1.561 2.625 2.40625 2.625H11.5937C12.439 2.625 13.125 3.311 13.125 4.15625V4.53688C12.8489 4.4189 12.55 4.36419 12.25 4.37675V4.15625C12.25 3.9822 12.1809 3.81528 12.0578 3.69221C11.9347 3.56914 11.7678 3.5 11.5937 3.5H2.40625C2.2322 3.5 2.06528 3.56914 1.94221 3.69221C1.81914 3.81528 1.75 3.9822 1.75 4.15625V9.84375C1.75 10.206 2.044 10.5 2.40625 10.5H4.375V9.625C4.375 9.39294 4.46719 9.17038 4.63128 9.00628C4.79538 8.84219 5.01794 8.75 5.25 8.75H8.75C8.93835 8.75004 9.12166 8.81086 9.27269 8.92342C9.42371 9.03598 9.53438 9.19426 9.58825 9.37475C9.29295 9.33079 8.99135 9.36051 8.71031 9.46126C8.42927 9.56202 8.17749 9.73068 7.97737 9.95225L7.5005 10.4843C7.26425 10.7476 7.11287 11.0556 7.04375 11.375H2.40625C2.20516 11.375 2.00605 11.3354 1.82027 11.2584C1.63449 11.1815 1.46568 11.0687 1.32349 10.9265C1.1813 10.7843 1.06851 10.6155 0.991559 10.4297C0.914607 10.244 0.875 10.0448 0.875 9.84375V4.15625ZM11.011 6.63337L11.2586 5.97712C11.4844 5.38212 12.1879 5.08812 12.7811 5.341L13.1206 5.48625C13.5345 5.663 13.8775 5.98325 13.9492 6.41375C14.3491 8.79812 12.2797 12.1896 9.898 13.055C9.4675 13.2107 9.00287 13.09 8.63362 12.8398L8.33087 12.6341C8.20658 12.5504 8.10193 12.4407 8.02414 12.3126C7.94635 12.1845 7.89728 12.0411 7.88031 11.8922C7.86334 11.7433 7.87887 11.5925 7.92585 11.4502C7.97282 11.3078 8.0501 11.1774 8.15237 11.0679L8.62925 10.5367C8.74126 10.4134 8.88417 10.3222 9.04322 10.2725C9.20226 10.2228 9.37169 10.2165 9.534 10.2541L10.6059 10.5079C11.4558 9.97704 11.9114 9.23038 11.9726 8.26788L11.2044 7.51537C11.0896 7.40324 11.0102 7.26 10.9758 7.10328C10.9415 6.94657 10.9537 6.78323 11.011 6.63337Z" fill="#192546"/>
  </Svg>
);

const ClockIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M7.65625 0.65625C3.79167 0.65625 0.65625 3.79167 0.65625 7.65625C0.65625 11.5208 3.79167 14.6562 7.65625 14.6562C11.5208 14.6562 14.6562 11.5208 14.6562 7.65625C14.6562 3.79167 11.5208 0.65625 7.65625 0.65625Z" stroke="#192546" strokeWidth={1.3125} strokeMiterlimit={10} />
    <Path d="M7.65625 2.98926V8.23926H11.1562" stroke="#192546" strokeWidth={1.3125} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const WebIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path d="M1.1665 6.99984C1.1665 10.2216 3.77809 12.8332 6.99984 12.8332C10.2216 12.8332 12.8332 10.2216 12.8332 6.99984C12.8332 3.77809 10.2216 1.1665 6.99984 1.1665C3.77809 1.1665 1.1665 3.77809 1.1665 6.99984Z" stroke="#192546" strokeWidth={1.23529} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7.58335 1.1958C7.58335 1.1958 9.33335 3.49997 9.33335 6.99997C9.33335 10.5 7.58335 12.8041 7.58335 12.8041M6.41668 12.8041C6.41668 12.8041 4.66668 10.5 4.66668 6.99997C4.66668 3.49997 6.41668 1.1958 6.41668 1.1958M1.53418 9.04163H12.4658M1.53418 4.9583H12.4658" stroke="#192546" strokeWidth={1.23529} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CallIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path d="M0 6C0 9.3085 2.6915 12 6 12C9.3085 12 12 9.3085 12 6C12 2.6915 9.3085 0 6 0C2.6915 0 0 2.6915 0 6ZM2.5 4.445C2.5 4.032 2.649 3.618 2.964 3.3035L2.9765 3.291C3.41336 2.85414 4.12164 2.85414 4.5585 3.291L4.7259 3.4584C5.0703 3.8028 5.0703 4.3612 4.7259 4.7056C4.47609 4.95541 4.39296 5.33405 4.55958 5.64557C4.99205 6.45414 5.59674 7.04865 6.35779 7.44943C6.66778 7.61268 7.04198 7.52652 7.28972 7.27878C7.63671 6.93179 8.19929 6.93179 8.54628 7.27878L8.709 7.4415C9.14586 7.87836 9.14586 8.58664 8.709 9.0235L8.6965 9.036C8.382 9.351 7.968 9.5 7.555 9.5C5.435 9.5 2.5 6.728 2.5 4.445Z" fill="#FFF" />
  </Svg>
);

const BulletDot = () => (
  <Svg width={9} height={9} viewBox="0 0 9 9" fill="none">
    <Circle cx={4.09091} cy={4.09091} r={4.09091} fill="#0C4D91" />
  </Svg>
);

const QuoteIcon = () => (
  <Svg width={25} height={25} viewBox="0 0 25 25" fill="none">
    <Path d="M5.49375 9.85059C6.57537 9.85059 7.63269 10.1713 8.53203 10.7722C9.43136 11.3731 10.1323 12.2273 10.5462 13.2265C10.9601 14.2258 11.0684 15.3254 10.8574 16.3862C10.6464 17.4471 10.1256 18.4215 9.36074 19.1863C8.59592 19.9511 7.62148 20.472 6.56065 20.683C5.49982 20.894 4.40023 20.7857 3.40095 20.3718C2.40167 19.9579 1.54756 19.2569 0.946651 18.3576C0.345737 17.4583 0.025 16.401 0.025 15.3193L0 14.5381C0 11.6373 1.15234 8.85528 3.20352 6.80411C5.2547 4.75293 8.0367 3.60059 10.9375 3.60059V6.72559C9.9111 6.72283 8.89433 6.92357 7.94599 7.31621C6.99765 7.70885 6.13656 8.28559 5.4125 9.01309C5.13104 9.29393 4.87143 9.59585 4.63594 9.91621C4.91615 9.87142 5.20156 9.84902 5.49219 9.84902L5.49375 9.85059ZM19.5563 9.85059C20.6379 9.85059 21.6952 10.1713 22.5945 10.7722C23.4939 11.3731 24.1948 12.2273 24.6087 13.2265C25.0226 14.2258 25.1309 15.3254 24.9199 16.3862C24.7089 17.4471 24.1881 18.4215 23.4232 19.1863C22.6584 19.9511 21.684 20.472 20.6232 20.683C19.5623 20.894 18.4627 20.7857 17.4635 20.3718C16.4642 19.9579 15.6101 19.2569 15.0092 18.3576C14.4082 17.4583 14.0875 16.401 14.0875 15.3193L14.0625 14.5381C14.0625 11.6373 15.2148 8.85528 17.266 6.80411C19.3172 4.75293 22.0992 3.60059 25 3.60059V6.72559C23.9736 6.72283 22.9568 6.92357 22.0085 7.31621C21.0602 7.70885 20.1991 8.28559 19.475 9.01309C19.1935 9.29393 18.9339 9.59585 18.6984 9.91621C18.9786 9.87142 19.2646 9.85059 19.5563 9.85059Z" fill="#084D92"/>
  </Svg>
);

// Offered-format icons — the four confirmed by Marium. Matched to
// offered_formats[].title by keyword since the backend's own title
// strings vary slightly (e.g. "1:1 Mentorship Session" vs "1:1 Session").
// Anything that doesn't match one of these four falls back to a generic
// icon rather than guessing — the API can return titles like "Problem-
// Solving Support" that have no corresponding icon spec from Marium yet.
const FormatSessionIcon = () => (
  <Svg width={32} height={26} viewBox="0 0 32 26" fill="none">
    <Path d="M19.125 8.5C19.125 9.62717 18.6772 10.7082 17.8802 11.5052C17.0832 12.3022 16.0022 12.75 14.875 12.75C13.7478 12.75 12.6668 12.3022 11.8698 11.5052C11.0728 10.7082 10.625 9.62717 10.625 8.5C10.625 7.37283 11.0728 6.29183 11.8698 5.4948C12.6668 4.69777 13.7478 4.25 14.875 4.25C16.0022 4.25 17.0832 4.69777 17.8802 5.4948C18.6772 6.29183 19.125 7.37283 19.125 8.5ZM0 3.71875C0 1.666 1.666 0 3.71875 0H26.0312C28.084 0 29.75 1.666 29.75 3.71875V4.64313C29.0795 4.35662 28.3535 4.22375 27.625 4.25425V3.71875C27.625 3.29606 27.4571 2.89068 27.1582 2.5918C26.8593 2.29291 26.4539 2.125 26.0312 2.125H3.71875C3.29606 2.125 2.89068 2.29291 2.5918 2.5918C2.29291 2.89068 2.125 3.29606 2.125 3.71875V17.5312C2.125 18.411 2.839 19.125 3.71875 19.125H8.5V17C8.5 16.4364 8.72388 15.8959 9.1224 15.4974C9.52091 15.0989 10.0614 14.875 10.625 14.875H19.125C19.5824 14.8751 20.0276 15.0228 20.3944 15.2962C20.7612 15.5695 21.0299 15.9539 21.1608 16.3923C20.4436 16.2855 19.7111 16.3577 19.0286 16.6024C18.3461 16.847 17.7346 17.2567 17.2486 17.7947L16.0905 19.0868C15.5167 19.7264 15.1491 20.4744 14.9813 21.25H3.71875C3.2304 21.25 2.74683 21.1538 2.29565 20.9669C1.84447 20.78 1.43451 20.5061 1.0892 20.1608C0.743879 19.8155 0.469958 19.4055 0.283073 18.9544C0.0961882 18.5032 0 18.0196 0 17.5312V3.71875ZM24.616 9.73462L25.2174 8.14087C25.7656 6.69587 27.4741 5.98188 28.9149 6.596L29.7394 6.94875C30.7445 7.378 31.5775 8.15575 31.7518 9.20125C32.7229 14.9919 27.6973 23.2284 21.913 25.33C20.8675 25.7083 19.7391 25.415 18.8424 24.8072L18.1071 24.3079C17.8053 24.1045 17.5511 23.8382 17.3622 23.5271C17.1733 23.216 17.0541 22.8676 17.0129 22.506C16.9717 22.1444 17.0094 21.7781 17.1235 21.4325C17.2376 21.0869 17.4253 20.7702 17.6736 20.5041L18.8318 19.2142C19.1038 18.9147 19.4508 18.6931 19.8371 18.5725C20.2234 18.4518 20.6348 18.4364 21.029 18.5279L23.6321 19.1441C25.6962 17.855 26.8026 16.0416 26.9514 13.7041L25.0856 11.8766C24.807 11.6043 24.614 11.2564 24.5306 10.8758C24.4472 10.4952 24.4768 10.0986 24.616 9.73462Z" fill="#0C4D91"/>
  </Svg>
);
const FormatCareerIcon = () => (
  <Svg width={30} height={30} viewBox="0 0 30 30" fill="none">
    <Path d="M16.2501 10V20C16.2501 20.9946 15.855 21.9484 15.1518 22.6517C14.4485 23.3549 13.4947 23.75 12.5001 23.75H9.78762C9.49274 24.5844 8.91238 25.2876 8.14911 25.7355C7.38585 26.1833 6.48884 26.3469 5.61664 26.1973C4.74443 26.0477 3.95319 25.5945 3.38278 24.918C2.81237 24.2414 2.49951 23.3849 2.49951 22.5C2.49951 21.6151 2.81237 20.7586 3.38278 20.082C3.95319 19.4055 4.74443 18.9523 5.61664 18.8027C6.48884 18.6531 7.38585 18.8167 8.14911 19.2645C8.91238 19.7124 9.49274 20.4156 9.78762 21.25H12.5001C12.8316 21.25 13.1496 21.1183 13.384 20.8839C13.6184 20.6495 13.7501 20.3315 13.7501 20V10C13.7501 9.00544 14.1452 8.05161 14.8485 7.34835C15.5517 6.64509 16.5056 6.25 17.5001 6.25H21.2501V2.5L27.5001 7.5L21.2501 12.5V8.75H17.5001C17.1686 8.75 16.8507 8.8817 16.6162 9.11612C16.3818 9.35054 16.2501 9.66848 16.2501 10Z" fill="#0C4D91"/>
  </Svg>
);
const FormatCvIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
    <Path d="M23.0541 4.29309L8.80802 1.77747C8.35101 1.69704 7.88076 1.80142 7.5007 2.06766C7.12063 2.33389 6.86186 2.74017 6.7813 3.19715L3.52739 21.6815C3.4876 21.908 3.49281 22.14 3.54274 22.3645C3.59266 22.5889 3.68633 22.8013 3.81837 22.9895C3.95042 23.1777 4.11826 23.3381 4.31231 23.4614C4.50635 23.5847 4.72279 23.6686 4.94927 23.7082L19.1954 26.2239C19.4219 26.2638 19.6541 26.2587 19.8786 26.2089C20.1032 26.159 20.3157 26.0654 20.504 25.9333C20.6924 25.8013 20.8528 25.6334 20.9762 25.4393C21.0996 25.2451 21.1835 25.0286 21.2232 24.802L24.4771 6.31762C24.5568 5.86046 24.4517 5.39036 24.1848 5.0107C23.918 4.63104 23.5113 4.37291 23.0541 4.29309ZM14.8204 14.3895C14.7846 14.5919 14.6788 14.7753 14.5214 14.9075C14.364 15.0397 14.1651 15.1123 13.9596 15.1125C13.9083 15.1124 13.857 15.108 13.8065 15.0993L9.26739 14.2976C9.05168 14.2446 8.86422 14.1114 8.74303 13.9253C8.62185 13.7391 8.57603 13.5138 8.61485 13.295C8.65367 13.0763 8.77423 12.8805 8.95208 12.7474C9.12993 12.6143 9.35175 12.5538 9.57255 12.5782L14.1094 13.3756C14.2227 13.3954 14.331 13.4374 14.4281 13.4991C14.5251 13.5608 14.6091 13.641 14.6751 13.7352C14.7411 13.8293 14.7879 13.9356 14.8129 14.0479C14.8378 14.1601 14.8403 14.2762 14.8204 14.3895ZM19.961 11.7448C19.9253 11.947 19.8196 12.1303 19.6625 12.2625C19.5053 12.3946 19.3067 12.4673 19.1013 12.4678C19.0496 12.4678 18.9979 12.4631 18.9471 12.4536L9.86896 10.8512C9.64037 10.8108 9.43723 10.6811 9.30421 10.4909C9.17119 10.3006 9.11919 10.0653 9.15966 9.83676C9.20013 9.60818 9.32974 9.40503 9.51999 9.27201C9.71023 9.139 9.94553 9.087 10.1741 9.12747L19.2522 10.7309C19.3656 10.7506 19.474 10.7925 19.5712 10.8541C19.6684 10.9157 19.7525 10.996 19.8186 11.0901C19.8847 11.1843 19.9317 11.2906 19.9567 11.403C19.9816 11.5153 19.9842 11.6315 19.9643 11.7448H19.961ZM20.568 8.29731C20.5323 8.49973 20.4265 8.68311 20.2691 8.8153C20.1117 8.9475 19.9128 9.02007 19.7072 9.02028C19.6559 9.02019 19.6047 9.0158 19.5541 9.00715L10.476 7.40372C10.3602 7.38668 10.2491 7.3466 10.1491 7.28584C10.049 7.22508 9.96225 7.14488 9.89379 7.04999C9.82533 6.9551 9.7766 6.84743 9.75047 6.73338C9.72435 6.61932 9.72137 6.50118 9.74171 6.38595C9.76205 6.27072 9.8053 6.16074 9.86889 6.06251C9.93248 5.96429 10.0151 5.87982 10.1119 5.8141C10.2087 5.74838 10.3178 5.70274 10.4325 5.67989C10.5473 5.65704 10.6654 5.65744 10.7801 5.68106L19.8582 7.2834C19.9717 7.30297 20.0802 7.34474 20.1775 7.40633C20.2748 7.46792 20.359 7.54811 20.4252 7.6423C20.4915 7.7365 20.5385 7.84285 20.5636 7.95525C20.5886 8.06765 20.5913 8.18389 20.5713 8.29731H20.568Z" fill="#0C4D91"/>
  </Svg>
);
const FormatInterviewIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
    <Path d="M2.3335 5.83301H11.6668V2.33301H14.0002V25.6663H11.6668V20.9997H7.00016V17.4997H11.6668V15.1663H4.66683V11.6663H11.6668V9.33301H2.3335V5.83301ZM16.3335 5.83301H19.8335V9.33301H16.3335V5.83301ZM16.3335 11.6663H22.1668V15.1663H16.3335V11.6663ZM16.3335 17.4997H25.6668V20.9997H16.3335V17.4997Z" fill="#0C4D91"/>
  </Svg>
);
const FormatGenericIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke="#0C4D91" strokeWidth={1.8} />
    <Path d="M12 8v5M12 16h.01" stroke="#0C4D91" strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const formatIconFor = (title: string) => {
  const t = (title || '').toLowerCase();
  if (t.includes('1:1') || t.includes('session')) return <FormatSessionIcon />;
  if (t.includes('cv') || t.includes('linkedin')) return <FormatCvIcon />;
  if (t.includes('career')) return <FormatCareerIcon />;
  if (t.includes('interview')) return <FormatInterviewIcon />;
  return <FormatGenericIcon />;
};

// Simple decode — the raw /custom/v1/mentors/{id} response isn't run
// through mentorsApi.ts's mapper (that's only for the list endpoint), so
// entity-encoded names ("Leadership &amp; Team Management") need the same
// handling here.
const decodeMentorEntities = (str: string): string =>
  (str || '')
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#8212;/g, '\u2014')
    .replace(/&nbsp;/g, ' ');

// ─── Mentorship Tab ───────────────────────────────────────────────────────────
// Built from the confirmed GET /custom/v1/mentors/{mentor_id} endpoint —
// replaces the earlier xProfile-field-guessing version now that real,
// structured mentor data exists.
const MentorshipTab = ({userId, mentorId, profile, navigation}: {userId: number; mentorId?: number; profile: any; navigation?: any}) => {
  const [mentor, setMentor]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    if (!mentorId) { setLoading(false); return; }
    const load = async () => {
      try {
        const data = await apiRequest(`${BASE}/custom/v1/mentors/${mentorId}`);
        setMentor(data?.mentor || null);
      } catch (e) {
        console.log('[MentorshipTab] load error', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mentorId]);

  if (loading) return (
    <View style={s.tabContent}>
      <Skeleton w="60%" h={14} />
      <Skeleton w="100%" h={100} r={10} />
      <Skeleton w="100%" h={120} r={10} />
    </View>
  );

  // No mentorId — this profile was reached without one (see flagged gap:
  // no confirmed way to look up mentor_id from userId alone yet, outside
  // the mentor-card entry point in MentorsScreen.tsx).
  if (!mentorId || !mentor) return (
    <View style={s.emptyTab}>
      <Text style={s.emptyCardTitle}>{'Mentorship details unavailable'}</Text>
      <Text style={s.emptyCardDesc}>
        {'This profile was opened without a mentor reference, so the mentorship details can\u2019t be loaded yet.'}
      </Text>
    </View>
  );

  const overview     = mentor.overview || {};
  const availability  = mentor.availability || {};
  const expertise     = mentor.expertise || [];
  const whoYouHelp    = mentor.who_you_help || [];
  const formats       = mentor.offered_formats || [];
  const similar       = mentor.similar_mentors || [];
  const reviews       = mentor.reviews || [];
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 2);

  return (
    <View style={s.tabContent}>
      {/* Mentorship Overview */}
      {overview.extended_bio ? (
        <View style={s.mtOverviewCard}>
          <Text style={s.mtBodyM}>{decodeMentorEntities(stripHtml(overview.extended_bio))}</Text>
          <View style={s.mtPillRow}>
            {overview.response_time ? (
              <View style={s.mtPill}>
                <ClockIcon />
                <Text style={s.mtPillText}>{`Responds in ${overview.response_time}`}</Text>
              </View>
            ) : null}
            {overview.session_duration ? (
              <View style={s.mtPill}>
                <SessionDurationIcon />
                <Text style={s.mtPillText}>{overview.session_duration}</Text>
              </View>
            ) : null}
            {overview.languages?.length > 0 ? (
              <View style={s.mtPill}>
                <WebIcon />
                <Text style={s.mtPillText}>{overview.languages.join('/')}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Availability */}
      {(availability.session_frequency || availability.capacity_label) ? (
        <View style={[s.mtAvailCard, {marginTop:16}]}>
          {availability.session_frequency ? (
            <View style={s.mtBulletRow}>
              <BulletDot />
              <Text style={s.mtBodyM}>
                {'Session frequency  \u2022  '}
                <Text style={s.mtBodyMBold}>{availability.session_frequency}</Text>
              </Text>
            </View>
          ) : null}
          {availability.capacity_label ? (
            <View style={s.mtBulletRow}>
              <BulletDot />
              <Text style={s.mtBodyM}>
                {'Capacity  \u2022  '}
                <Text style={s.mtBodyMBold}>{availability.capacity_label}</Text>
              </Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={s.mtRequestCallBtn}
            onPress={() => {
              if (mentor.request_call_url) { Linking.openURL(mentor.request_call_url); }
              else { Alert.alert('Not Available Yet', 'This mentor hasn\u2019t set up call requests yet.'); }
            }}>
            <CallIcon />
            <Text style={s.mtRequestCallBtnText}>{'Request a Call'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Areas of Expertise */}
      {expertise.length > 0 ? (
        <View style={[s.mtTagCard, {marginTop:16}]}>
          <Text style={s.sectionTitle}>{'Areas of Expertise'}</Text>
          <View style={s.mtTagWrap}>
            {expertise.map((e: any) => (
              <View key={e.id} style={s.mtTag}><Text style={s.mtTagText}>{decodeMentorEntities(e.name)}</Text></View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Who I Can Help */}
      {whoYouHelp.length > 0 ? (
        <View style={[s.mtTagCard, {marginTop:16}]}>
          <Text style={s.sectionTitle}>{'Who I Can Help'}</Text>
          <View style={s.mtTagWrap}>
            {whoYouHelp.map((w: any) => (
              <View key={w.id} style={s.mtTag}><Text style={s.mtTagText}>{decodeMentorEntities(w.name)}</Text></View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Offered Formats */}
      {formats.length > 0 ? (
        <View style={[s.mtTagCard, {marginTop:16}]}>
          <Text style={s.sectionTitle}>{'Offered Formats'}</Text>
          {formats.map((f: any, i: number) => (
            <View key={i} style={s.mtFormatRow}>
              <View style={s.mtFormatIconWrap}>{formatIconFor(f.title)}</View>
              <View style={{flex:1}}>
                <Text style={s.mtFormatTitle}>{decodeMentorEntities(f.title)}</Text>
                <Text style={s.mtFormatDesc}>{decodeMentorEntities(stripHtml(f.description))}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* What to Expect — static app copy, not per-mentor backend data
          (the confirmed endpoint has no field for this) */}
      <View style={[s.mtTagCard, {marginTop:16}]}>
        <Text style={s.sectionTitle}>{'What to Expect'}</Text>
        {[
          'Practical and honest guidance tailored to your career stage.',
          'Clear next steps after each session.',
          'Support on leadership, career, and certification topics.',
          'Mentorship does not replace project execution or consulting delivery.',
        ].map((line, i) => (
          <View key={i} style={s.mtBulletRow}>
            <BulletDot />
            <Text style={s.mtBodyM}>{line}</Text>
          </View>
        ))}
      </View>

      {/* Similar Mentors */}
      {similar.length > 0 ? (
        <View style={{marginTop:16}}>
          <Text style={s.sectionTitle}>{'Similar Mentors'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {similar.map((m: any) => (
              <View key={m.mentor_id} style={s.mtSimilarCard}>
                {m.profile_image_url
                  ? <Image source={{uri: m.profile_image_url}} style={s.mtSimilarAvatar} />
                  : <View style={[s.mtSimilarAvatar, {backgroundColor:'#E0E0E0'}]} />
                }
                <Text style={s.mtSimilarName} numberOfLines={1}>{decodeMentorEntities(m.name)}</Text>
                <Text style={s.mtSimilarTitle} numberOfLines={1}>{decodeMentorEntities(m.title)}</Text>
                {m.tags?.length > 0 && (
                  <View style={[s.mtTagWrap, {justifyContent:'center'}]}>
                    {m.tags.slice(0, 2).map((t: string) => (
                      <View key={t} style={s.mtSimilarTag}><Text style={s.mtSimilarTagText} numberOfLines={1}>{decodeMentorEntities(t)}</Text></View>
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  style={s.mtViewProfileBtn}
                  onPress={() => navigation?.push('MemberProfile', {
                    userId: m.user_id, mentorId: m.mentor_id, initialTab: 'mentorship',
                  })}>
                  <Text style={s.mtViewProfileBtnText}>{'View Profile'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* What Mentees Say — only rendered when real reviews exist; the
          endpoint returned reviews: [] for every mentor seen so far, so
          this section is invisible until the backend actually has data. */}
      {reviews.length > 0 ? (
        <View style={{marginTop:16}}>
          <Text style={s.sectionTitle}>{'What Mentees Say'}</Text>
          {visibleReviews.map((r: any, i: number) => (
            <View key={i} style={s.mtReviewCard}>
              <QuoteIcon />
              <Text style={[s.mtBodyM, {marginTop:8, marginBottom:14}]}>{decodeMentorEntities(stripHtml(r.quote || r.text || ''))}</Text>
              <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                {r.avatar_url
                  ? <Image source={{uri: r.avatar_url}} style={s.mtReviewAvatar} />
                  : <View style={[s.mtReviewAvatar, {backgroundColor:'#E0E0E0'}]} />
                }
                <View>
                  <Text style={s.mtReviewName}>{decodeMentorEntities(r.name || '')}</Text>
                  <Text style={s.mtBodyM}>{decodeMentorEntities(r.title || '')}</Text>
                </View>
              </View>
            </View>
          ))}
          {reviews.length > 2 && !showAllReviews && (
            <TouchableOpacity style={s.mtShowMoreBtn} onPress={() => setShowAllReviews(true)}>
              <Text style={s.mtShowMoreBtnText}>{'Show More'}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </View>
  );
};

// ─── Profile Header ───────────────────────────────────────────────────────────
const ProfileHeader = ({profile, profileData, loading, isOwn, following, onFollow, navigation, onAvatarChange}: any) => {
  const xmap = parseXprofile(profile?.xprofile);
  const basic = profileData?.basic;

  // Prefer the new consolidated endpoint's clean basic.* fields — falls
  // back to the old xProfile-guessing path only if profileData hasn't
  // loaded yet (e.g. brief loading window, or the new endpoint failed).
  const displayName = basic?.full_name
    || (xmap['first name'] && xmap['last name'] ? `${xmap['first name']} ${xmap['last name']}`.trim() : '')
    || profile?.name || profile?.user_login || '';

  const avatarUrl   = basic?.avatar_url || profile?.avatar_urls?.full || profile?.avatar_urls?.thumb || '';
  const coverUrl    = profile?.cover_url || '';
  const designation = basic?.headline || xmap['job title'] || xmap['field_1097'] || searchXField(xmap, 'position', 'title');
  const country      = basic?.country || xmap['country'] || xmap['field_1099'] || searchXField(xmap, 'country');
  const city        = xmap['city'] || searchXField(xmap, 'city', 'location');
  const locationStr = [city, country].filter(Boolean).join(', ');
  const bio         = basic?.about || xmap['field_1100'] || searchXField(xmap, 'about me');
  const linkedInUrl = basic?.linkedin || xmap['field_1098'] || xmap['linkedin url'] || xmap['linkedin']
    || searchXField(xmap, 'linkedin');
  const flagEmoji   = basic?.country_flag
    ? String.fromCodePoint(...[...basic.country_flag.toUpperCase()].map((c: string) => 127397 + c.charCodeAt(0)))
    : (country ? countryToFlag(country) : '');

  // Real numbers from the new endpoint's sidebar — no more guessed/
  // hardcoded placeholders.
  const pduTotal   = profileData?.sidebar?.pdus?.total;
  const badgeCount = profileData?.sidebar?.badges?.count;

  if (__DEV__) {
    console.log('[Header] name:', displayName, '| job:', designation, '| country:', country, '| bio:', bio?.slice(0,50));
  }

  const handleCameraPress = () => {
    try {
      launchImageLibrary(
        {mediaType: 'photo', quality: 0.8, includeBase64: false},
        response => {
          if (response.didCancel) return;
          if (response.errorCode) {
            console.log('[Camera] error:', response.errorMessage);
            return;
          }
          const asset = response.assets?.[0];
          if (asset?.uri) onAvatarChange?.(asset.uri);
        },
      );
    } catch (e) {
      Alert.alert('Info', 'Image picker not available. Please install react-native-image-picker.');
    }
  };

  const handleLinkedIn = () => {
    if (!linkedInUrl) return;
    const url = linkedInUrl.startsWith('http') ? linkedInUrl : `https://${linkedInUrl}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else Alert.alert('Error', 'Cannot open LinkedIn profile.');
    });
  };

  return (
    <View>
      {/* Cover */}
      <View style={s.cover}>
        {coverUrl
          ? <Image source={{uri: coverUrl}} style={s.coverImg} resizeMode="cover" />
          : <View style={[s.coverImg, {backgroundColor:'#1A3A6B'}]} />
        }
      </View>

      {/* Profile block */}
      <View style={s.profileBlock}>
        {/* Avatar row */}
        <View style={s.avatarRow}>
          <View style={s.avatarWrap}>
            {loading
              ? <View style={[s.avatar, {backgroundColor:'#E0E0E0'}]} />
              : <Image
                  source={avatarUrl ? {uri: avatarUrl} : require('../assets/images/ipmfeedlogo.png')}
                  style={s.avatar}
                />
            }
            {/* Camera btn — always visible so user can change DP */}
            {isOwn && (
              <TouchableOpacity style={s.cameraBtn} onPress={handleCameraPress}>
                <CameraIcon />
              </TouchableOpacity>
            )}
          </View>

        </View>

        {/* Name / meta */}
        {loading ? (
          <View style={{gap:6, marginBottom:14}}>
            <Skeleton w="50%" h={18} />
            <Skeleton w="38%" h={12} />
            <Skeleton w="30%" h={12} />
            <Skeleton w="90%" h={12} />
          </View>
        ) : (
          <>
            <View style={s.nameRow}>
              <Text style={s.name}>{displayName}</Text>
              {flagEmoji ? <Text style={s.flagEmoji}>{flagEmoji}</Text> : null}
            </View>
            {designation ? <Text style={s.designation}>{designation}</Text> : null}
            {locationStr ? <Text style={s.location}>{locationStr}</Text> : null}
            {bio ? <Text style={s.bioText}>{bio}</Text> : null}

            {/* Real PDU count from the new consolidated endpoint's
                sidebar.pdus.total — no longer a placeholder. */}
            <TouchableOpacity style={s.badgesRow} onPress={() => navigation?.navigate('Badges')}>
              <Text style={s.badgesText}>
                {isOwn ? 'My Badges' : 'View Badges'}
                {isOwn && typeof pduTotal === 'number' ? <Text style={s.badgesDot}>{`  \u00b7  ${pduTotal} PDUs`}</Text> : null}
              </Text>
            </TouchableOpacity>

            <View style={s.actionRow}>
              {/* LinkedIn button — with icon */}
              <TouchableOpacity
                style={[s.headerBtn, !linkedInUrl && s.headerBtnDisabled]}
                onPress={handleLinkedIn}
                disabled={!linkedInUrl}>
                <LinkedInIcon />
                <Text style={s.headerBtnText}>{'LinkedIn'}</Text>
              </TouchableOpacity>

              {/* Edit Profile — own profile only */}
              {isOwn && (
                <TouchableOpacity
                  style={s.headerBtn}
                  onPress={() => navigation?.navigate('EditProfile')}>
                  <EditIcon />
                  <Text style={s.headerBtnText}>{'Edit Profile'}</Text>
                </TouchableOpacity>
              )}

              {/* Follow button — other profiles only */}
              {!isOwn && (
                <TouchableOpacity
                  style={[s.followBtn, following && s.followBtnFollowing]}
                  onPress={onFollow}>
                  <Text style={[s.followBtnText, following && s.followBtnTextFollowing]}>
                    {following ? '✓ Following' : '+ Follow'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const MemberProfileScreen = ({navigation, route}: any) => {
  // mentorId: passed directly when arriving from a mentor card tap (see
  // MentorsScreen.tsx) — the mentor detail endpoint needs mentor_id
  // specifically, and there's no confirmed lookup from userId alone yet.
  // Will be undefined when arriving any other way (e.g. tapping a mentor's
  // own dp elsewhere) until that lookup gap is solved.
  const {userId: paramUserId, initialTab, mentorId} = route?.params || {};
  const [profile,    setProfile]    = useState<any>(null);
  // New consolidated /custom/v1/member-profile/{id} payload — see loadProfile.
  const [profileData, setProfileData] = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState(initialTab || 'activity');
  const [isOwn,      setIsOwn]      = useState(false);
  const [following,  setFollowing]  = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [targetId,   setTargetId]   = useState<number | null>(null);

  useEffect(() => { loadProfile(); }, [paramUserId]);

  // "Is this a mentor" — a passed-in mentorId (e.g. from MentorsScreen's
  // card tap, or Similar Mentors "View Profile") is a reliable signal on
  // its own; the xProfile-guess fallback only matters when arriving
  // without one (still an open gap — see earlier flagged note on there
  // being no confirmed userId → mentor_id lookup).
  const mentorXmap     = parseXprofile(profile?.xprofile);
  // 'about' was in this list before and matched the About Me field that
  // basically every profile has filled in — that's why non-mentor
  // accounts (including your own) were showing the Mentorship tab. The
  // reliable signal is mentorId (passed explicitly) or member_types;
  // this xProfile-name search is now a narrower, genuinely mentor-
  // specific fallback only.
  const mentorOverview = searchXField(mentorXmap, 'mentorship overview', 'mentor bio', 'mentoring overview');
  const isMentor        = !!mentorId || profile?.member_types?.includes('mentor') || !!mentorOverview;
  // Tab visibility is about WHO'S LOOKING, not just mentor status:
  // - Own profile: every applicable tab (Connections/Courses included)
  // - Anyone else's profile: only Activity / Experience (+ Mentorship if
  //   they're a mentor) — per Marium: "other than ones own profile we
  //   dont need to show other stuff only activity and experience"
  const tabs = BASE_TABS.filter(t => {
    if (t.key === 'mentorship') return isMentor;
    if (!isOwn && (t.key === 'connections' || t.key === 'courses')) return false;
    return true;
  });

  // If Mentorship was selected but this profile turns out not to be a
  // mentor (e.g. navigating between profiles), or Connections/Courses was
  // selected on someone else's profile, fall back to Activity rather than
  // showing a blank tab with no matching button.
  useEffect(() => {
    if (activeTab === 'mentorship' && !isMentor && !loading) {
      setActiveTab('activity');
    }
    if (!isOwn && (activeTab === 'connections' || activeTab === 'courses') && !loading) {
      setActiveTab('activity');
    }
  }, [activeTab, isMentor, isOwn, loading]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const myId = await getUserIdFromToken();
      const tid  = paramUserId || myId;
      setTargetId(tid);
      setIsOwn(!paramUserId || String(paramUserId) === String(myId));
      if (tid) {
        const data = await apiRequest(`${BASE}/buddyboss/v1/members/${tid}?xprofile=1`);
        setProfile(data);
        setFollowing(data?.is_following || false);

        // New consolidated endpoint (Robby) — Specialities/Experience/
        // Education/Projects/Activity/Connections/Courses/Certifications/
        // Badges/PDUs/PMs You May Know all come from here now, replacing
        // the old per-section xProfile field-ID guessing and separate
        // fetches. Confirmed via Postman to correctly return data that
        // the old /xprofile/data/{id} route was missing for some accounts
        // (e.g. Aulia) — likely a caching issue specific to the old route
        // that this new endpoint sidesteps.
        try {
          const mp = await apiRequest(`${BASE}/custom/v1/member-profile/${tid}`);
          setProfileData(mp);
        } catch (e) {
          console.log('[member-profile] load error', e);
        }
      }
    } catch {}
    finally { setLoading(false); }
  };

  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  const handleAvatarChange = async (uri: string) => {
    setLocalAvatar(uri);
    // apiRequest always JSON.stringifies its body and forces
    // Content-Type: application/json — fundamentally incompatible with a
    // multipart FormData avatar upload (separate from the {method:...}
    // object-as-2nd-arg crash this also had). uploadAvatar in
    // profileApi.ts already does this correctly with a raw fetch call.
    try {
      await uploadAvatar(uri);
    } catch (e) {
      console.log('[Avatar] upload error', e);
    }
  };

  const handleFollow = async () => {
    const next = !following;
    setFollowing(next);
    try {
      // Confirmed via route discovery: POST .../members/action/{id} with
      // {action: 'follow'|'unfollow'} — NOT /follow (unconfirmed guess,
      // likely 404s the same way /friendship did).
      const result = await apiRequest(
        `${BASE}/buddyboss/v1/members/action/${targetId}`,
        'POST',
        {action: next ? 'follow' : 'unfollow'},
      );
      if (
        result?.data &&
        typeof result.data.is_following === 'boolean' &&
        result.data.is_following !== next
      ) {
        throw new Error('Follow state did not change server-side');
      }
    } catch { setFollowing(!next); }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      <ScrollView showsVerticalScrollIndicator={false} bounces>
        <ProfileHeader
          profile={localAvatar ? {...profile, avatar_urls: {full: localAvatar, thumb: localAvatar}} : profile}
          profileData={profileData}
          loading={loading}
          isOwn={isOwn}
          following={following}
          onFollow={handleFollow}
          navigation={navigation}
          onAvatarChange={handleAvatarChange}
        />

        {/* Tab bar */}
        <View style={s.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{flexDirection:'row'}}>
              {tabs.map((tab) => (
                <TouchableOpacity key={tab.key} style={s.tabItem} onPress={() => setActiveTab(tab.key)}>
                  <Text style={[s.tabLabel, activeTab===tab.key && s.tabLabelActive]}>{tab.label}</Text>
                  {activeTab===tab.key && <View style={s.tabUnderline} />}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Tab content */}
        {targetId && activeTab === 'activity' && <ActivityTab userId={targetId} displayName={profile?.name || ''} navigation={navigation} profileData={profileData} />}
        {targetId && activeTab === 'experience' && <ExperienceTab userId={targetId} isOwn={isOwn} navigation={navigation} displayName={profile?.name || ''} profileData={profileData} />}
        {targetId && activeTab === 'connections' && (
          <ConnectionsTab
            userId={targetId}
            isOwn={isOwn}
            totalFollowers={profile?.followers ?? 0}
            totalFollowing={profile?.following ?? 0}
            displayName={profile?.name || ''}
            profileData={profileData}
          />
        )}
        {targetId && activeTab === 'courses' && <CoursesTab userId={targetId} isOwn={isOwn} displayName={profile?.name || ''} navigation={navigation} profileData={profileData} />}
        {targetId && activeTab === 'mentorship' && isMentor && <MentorshipTab userId={targetId} mentorId={mentorId} profile={profile} navigation={navigation} />}

        <View style={{height: 100}} />
      </ScrollView>

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {flex:1, backgroundColor:'#F2F4F7'},

  // Cover + profile block
  cover:        {width:'100%', height:130},
  coverImg:     {width:'100%', height:'100%'},
  profileBlock: {backgroundColor:'#FFF', paddingHorizontal:16, paddingBottom:16},
  avatarRow: {
    flexDirection:'row', alignItems:'flex-end', justifyContent:'space-between',
    marginTop:-44, marginBottom:10,
  },
  avatarWrap: {position:'relative'},
  avatar: {
    width:88, height:88, borderRadius:44,
    borderWidth:3, borderColor:'#FFF', backgroundColor:'#E0E0E0',
  },
  cameraBtn: {
    position:'absolute', bottom:0, right:0,
    width:24, height:24, borderRadius:12,
    backgroundColor:'#FFF', borderWidth:1, borderColor:'#E0E0E0',
    alignItems:'center', justifyContent:'center', elevation:2,
  },
  editBtn: {
    width:32, height:32, borderRadius:16,
    borderWidth:1, borderColor:'#E0E0E0', backgroundColor:'#FFF',
    alignItems:'center', justifyContent:'center', elevation:1, marginBottom:4,
  },
  nameRow:     {flexDirection:'row', alignItems:'center', gap:6, marginBottom:3},
  flagEmoji:   {fontSize:18, lineHeight:22},
  editProfileBtn: {
    flexDirection:'row', alignItems:'center', gap:6,
    borderWidth:1, borderColor:'#E0E0E0', borderRadius:20,
    paddingHorizontal:14, paddingVertical:8,
    alignSelf:'flex-start', marginTop:10,
  },
  editProfileBtnText: {fontSize:13, color:'#192546', fontWeight:'600'},
  name:        {fontSize:18, fontWeight:'700', color:'#192647', letterSpacing:0.09},
  designation: {fontSize:13, color:'#555', marginBottom:2},
  location:    {fontSize:12, color:'#888', marginBottom:5},
  bioText:     {fontSize:13, color:'#192546', lineHeight:18, marginBottom:10},
  bio:         {fontSize:13, color:'#555', lineHeight:19, marginBottom:10},
  badgesRow:   {flexDirection:'row', alignItems:'center', marginBottom:12},
  badgesText:  {fontSize:14, color:'#46B0E3', fontWeight:'500'},
  badgesDot:   {fontSize:14, color:'#46B0E3'},
  pdusText:    {fontSize:14, color:'#46B0E3', fontWeight:'400'},

  // Action buttons — Figma exact. Note: parent (profileBlock) already has
  // paddingHorizontal:16, which satisfies the "padding: 0 16px" spec for
  // this row — not duplicating it here.
  actionRow: {flexDirection:'row', alignItems:'flex-start', gap:8, alignSelf:'stretch'},
  // Shared outline button (LinkedIn, Edit Profile) — flex:1 so buttons
  // share the row equally per spec.
  headerBtn: {
    flex:1,
    flexDirection:'row', alignItems:'center', justifyContent:'center',
    gap:8, height:36, paddingHorizontal:24,
    borderRadius:50, borderWidth:1, borderColor:'#0C4D91',
    backgroundColor:'#FFF',
  },
  headerBtnText: {color:'#0C4D91', fontSize:14, fontWeight:'500'},
  headerBtnDisabled: {opacity:0.4},
  // Follow button
  followBtn: {
    flex:1,
    flexDirection:'row', alignItems:'center', justifyContent:'center',
    height:36, paddingHorizontal:24,
    borderRadius:50, borderWidth:1, borderColor:'#0C4D91',
    backgroundColor:'#FFF',
  },
  followBtnFollowing: {backgroundColor:'#192546', borderColor:'#192546'},
  followBtnText:      {color:'#0C4D91', fontSize:14, fontWeight:'500'},
  followBtnTextFollowing: {color:'#FFF'},
  // Legacy (kept for connections tab)
  msgBtn: {
    borderWidth:1, borderColor:'#CCCCCC', borderRadius:50,
    paddingHorizontal:24, height:36,
    alignItems:'center', justifyContent:'center',
  },
  msgBtnText: {color:'#444', fontSize:14},
  linkedInBtn: {
    flexDirection:'row', alignItems:'center', justifyContent:'center',
    gap:8, height:36, paddingHorizontal:24,
    borderRadius:50, borderWidth:1, borderColor:'#0C4D91',
  },
  linkedInBtnText: {color:'#0C4D91', fontSize:14, fontWeight:'500'},
  linkedInBtnDisabled: {opacity:0.4},

  // Tab bar — Figma exact
  tabBar: {backgroundColor:'#FFF', borderBottomWidth:1, borderBottomColor:'#EBEBEB', marginBottom:8},
  tabItem: {paddingHorizontal:12, paddingVertical:14, position:'relative', alignItems:'center'},
  tabLabel: {fontSize:14, color:'#192546', fontWeight:'500', lineHeight:18},
  tabLabelActive: {color:'#192546', fontWeight:'700'},
  tabUnderline: {
    position:'absolute', bottom:0, left:12, right:12,
    height:2, backgroundColor:'#084D92', borderRadius:1,
  },

  // Tab content
  tabContent: {backgroundColor:'#FFF', paddingHorizontal:16, paddingVertical:16},
  // Experience/Education/etc. section list — dedicated container per
  // Marium's spec (replaces generic tabContent for this tab specifically).
  experienceFrame: {
    backgroundColor:'#FFF',
    paddingHorizontal:16, paddingBottom:16, paddingTop:0,
    flexDirection:'column', alignItems:'stretch', gap:24, alignSelf:'stretch',
  },
  sectionRow: {flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12},
  sectionTitle: {fontSize:18, fontWeight:'700', color:'#192647', letterSpacing:0.09},
  divider: {height:1, backgroundColor:'#F0F0F0', marginVertical:16},
  dividerFlat: {height:1, backgroundColor:'#F0F0F0'},

  // Tags
  tagsRow: {flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:12},
  tag:     {backgroundColor:'#E8F1FF', borderRadius:20, paddingHorizontal:12, paddingVertical:6},
  tagText: {fontSize:12, color:'#0C4D91', fontWeight:'500'},
  tagSmall: {borderWidth:1, borderColor:'#DDD', borderRadius:20, paddingHorizontal:10, paddingVertical:4},
  tagSmallText: {fontSize:11, color:'#555'},

  // Project card
  projectCard: {
    flexDirection:'row', gap:12,
    borderWidth:1, borderColor:'#EBEBEB', borderRadius:10, padding:12,
    marginBottom:8,
  },
  projectThumb: {
    width:72, height:72, borderRadius:8,
    backgroundColor:'#EFF3FF', alignItems:'center', justifyContent:'center',
  },
  projectTitle: {fontSize:14, fontWeight:'700', color:'#1A1A1A', marginBottom:3},
  projectRole:  {fontSize:12, color:'#0C4D91', fontWeight:'600', marginBottom:4},
  projectDesc:  {fontSize:12, color:'#555', lineHeight:17, marginBottom:8},

  // Timeline entries (Experience / Education / Credential — shared style)
  timelineRow:  {flexDirection:'row', gap:12},
  timelineRail: {alignItems:'center', width:15},
  timelineDotOuter: {
    width:15, height:15, padding:3, borderRadius:7.5,
    backgroundColor:'#FFF', alignItems:'center', justifyContent:'center',
    shadowColor:'#000', shadowOffset:{width:0, height:0}, shadowOpacity:0.12, shadowRadius:10.227, elevation:3,
  },
  timelineLine: {width:1, flex:1, backgroundColor:'#E8E9F1', marginTop:2, marginBottom:2},
  timelineContent: {flex:1, paddingBottom:20},
  timelineTitle:    {fontSize:14, fontFamily:'Runda-Medium', color:'#192546', flex:1},
  timelineDate:     {fontSize:11, fontFamily:'Runda-Normal', color:'#71727A', marginLeft:8},
  timelineSubtitle: {fontSize:12, fontFamily:'Runda-Normal', color:'#46B0E3', marginTop:2},
  timelineDesc:     {fontSize:12, fontFamily:'Runda-Normal', color:'#192546', lineHeight:16, marginTop:6},
  viewDetailsRow:   {flexDirection:'row', alignItems:'center', gap:6, marginTop:8},
  viewDetailsText:  {fontSize:12, fontFamily:'Runda-Medium', color:'#0C4D91'},

  // Activity
  resourceCard: {flexDirection:'row', gap:12, marginBottom:14, paddingBottom:14, borderBottomWidth:1, borderBottomColor:'#F0F0F0'},
  resourceThumb: {width:80, height:72, borderRadius:8, backgroundColor:'#E0E0E0'},
  resourceTitle: {fontSize:13, fontWeight:'600', color:'#1A1A1A', lineHeight:18, marginBottom:6},
  resourceMeta:  {fontSize:11, color:'#AAA'},
  resourceTag:   {color:'#1A3A6B', fontWeight:'500'},
  activityRow:   {flexDirection:'row', alignItems:'flex-start', gap:8, paddingVertical:8, borderBottomWidth:1, borderBottomColor:'#F5F5F5'},
  activityDot:   {width:8, height:8, borderRadius:4, backgroundColor:'#46B0E3', marginTop:4},
  activityText:  {flex:1, fontSize:13, color:'#444', lineHeight:18},
  activityTime:  {fontSize:11, color:'#AAA'},

  // Connections — per Marium's Figma spec
  connSelectorWrap: {flexDirection:'column', alignItems:'flex-start', gap:16, alignSelf:'stretch', marginTop:12},
  subTabRow:  {flexDirection:'row', alignItems:'flex-start', alignSelf:'stretch'},
  subTabBox:  {flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, flex:1},
  subTabLabel: {color:'#8F9098', fontFamily:'Runda-Medium', fontSize:14},
  subTabLabelActive: {color:'#0C4D91'},
  subTabCount: {
    minWidth:44, paddingVertical:6, paddingHorizontal:16, borderRadius:100,
    backgroundColor:'#8F9098', alignItems:'center', justifyContent:'center',
  },
  subTabCountActive: {backgroundColor:'#0C4D91'},
  subTabCountText:   {fontFamily:'Runda-Bold', fontSize:13, color:'#FFF'},
  connEmptyText: {
    color:'#192647', fontFamily:'Runda-Normal', fontSize:14, lineHeight:18,
    alignSelf:'stretch',
  },
  connRow: {
    flexDirection:'row', alignItems:'center', gap:12,
    paddingVertical:12, borderBottomWidth:1, borderBottomColor:'#F5F5F5',
  },
  connAvatar:  {width:48, height:48, borderRadius:24, backgroundColor:'#E0E0E0'},
  connName:    {fontSize:14, fontWeight:'700', color:'#1A1A1A', marginBottom:2},
  connMeta:    {fontSize:12, color:'#555'},
  connCountry: {fontSize:11, color:'#888'},
  connBtn: {
    borderWidth:1.5, borderColor:'#192546', borderRadius:20,
    paddingHorizontal:14, paddingVertical:7, minWidth:82, alignItems:'center',
    backgroundColor:'#FFF',
  },
  connBtnActive:     {backgroundColor:'#192546', borderColor:'#192546'},
  connBtnText:       {fontSize:12, color:'#192546', fontWeight:'600'},
  connBtnTextActive: {color:'#FFF'},

  // Courses & Certifications — per Marium's Figma spec
  coursesFrame: {
    paddingHorizontal:16, paddingVertical:16,
    flexDirection:'column', alignItems:'stretch', gap:24, alignSelf:'stretch',
    backgroundColor:'#FFF',
  },
  coursesHeadingRow: {flexDirection:'row', alignItems:'center', gap:10, alignSelf:'stretch'},

  // Shadow lives on the outer wrapper (Android clips box-shadow/elevation
  // if the same view also has overflow:hidden) — the inner view handles
  // the radius clipping for the rotated/oversized thumbnail image.
  courseCardShadowWrap: {
    borderRadius:5, backgroundColor:'#FFF',
    shadowColor:'#000', shadowOffset:{width:0, height:0}, shadowOpacity:0.15, shadowRadius:10.023, elevation:4,
  },
  courseCardClip: {
    flexDirection:'row', alignItems:'center',
    height:180, borderRadius:5, overflow:'hidden',
    paddingRight:12, gap:12,
  },
  certCardClip: {
    flexDirection:'row', alignItems:'center',
    paddingVertical:16, paddingHorizontal:16, borderRadius:5, gap:12,
  },
  courseImgPanel: {
    width:75, height:180, overflow:'hidden',
    alignItems:'center', justifyContent:'center',
  },
  courseImgRotated: {
    width:127.155, height:189.473,
    transform: [{rotate: '0.864deg'}],
  },
  certLogo: {width:56, height:56},
  courseCardContent: {flex:1, gap:4},
  courseTitleV2:   {fontSize:14, fontFamily:'Runda-Medium', color:'#192546'},
  courseMetaRow:   {flexDirection:'row', alignItems:'center', gap:5},
  courseMetaTextV2:{fontSize:12, fontFamily:'Runda-Normal', color:'#454550'},
  courseStatusV2:  {fontSize:12, fontFamily:'Runda-Medium', color:'#46B0E3'},
  courseStatusBtnRow: {flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:8, marginTop:12},
  courseContinueBtn: {
    flexDirection:'row', gap:8,
    borderRadius:5, backgroundColor:'#0C4D91',
    paddingVertical:12, paddingHorizontal:16, justifyContent:'center', alignItems:'center',
  },
  courseContinueBtnText: {color:'#FFF', fontSize:13, fontFamily:'Runda-Bold'},

  badgeEnrolled:    {backgroundColor:'#E3F2FD', borderRadius:20, paddingHorizontal:10, paddingVertical:4},
  badgeEnrolledText: {fontSize:11, color:'#1565C0', fontWeight:'600'},

  // Mentorship
  // Mentorship — per Marium's spec
  mtBodyM: {fontSize:14, color:'#192546', fontFamily:'Runda-Normal', lineHeight:18},
  mtBodyMBold: {fontFamily:'Runda-Bold'},

  mtOverviewCard: {
    padding:16, flexDirection:'column', alignItems:'flex-start', gap:21,
    alignSelf:'stretch', borderRadius:10, backgroundColor:'#FFF',
    shadowColor:'#000', shadowOffset:{width:0, height:0}, shadowOpacity:0.15, shadowRadius:10.023, elevation:4,
  },
  mtPillRow: {flexDirection:'column', gap:8},
  mtPill: {
    alignSelf:'stretch',
    flexDirection:'row', gap:5,
    paddingVertical:10, paddingHorizontal:16, borderRadius:100,
    borderWidth:1, borderColor:'#8F9098', alignItems:'center', justifyContent:'center',
  },
  mtPillText: {fontSize:12, color:'#192546', fontFamily:'Runda-Medium', textAlign:'center'},

  mtAvailCard: {
    padding:16, flexDirection:'column', alignItems:'flex-start', gap:16,
    alignSelf:'stretch', borderRadius:9.757, backgroundColor:'#FFF',
    shadowColor:'#000', shadowOffset:{width:0, height:0}, shadowOpacity:0.12, shadowRadius:14.635, elevation:4,
  },
  mtBulletRow: {flexDirection:'row', alignItems:'center', gap:10},
  mtRequestCallBtn: {
    flexDirection:'row', gap:8,
    height:36, borderRadius:5, backgroundColor:'#0C4D91',
    alignSelf:'stretch', alignItems:'center', justifyContent:'center',
    paddingVertical:12, paddingHorizontal:16,
  },
  mtRequestCallBtnText: {color:'#FFF', fontSize:12, fontFamily:'Runda-Medium'},

  mtTagCard: {
    padding:16, flexDirection:'column', alignItems:'flex-start', gap:24,
    alignSelf:'stretch', borderRadius:10, backgroundColor:'#FFF',
    shadowColor:'#000', shadowOffset:{width:0, height:0}, shadowOpacity:0.15, shadowRadius:10.023, elevation:4,
  },
  mtTagWrap: {flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:12, alignSelf:'stretch'},
  mtTag: {
    paddingVertical:10, paddingHorizontal:16, borderRadius:5, backgroundColor:'#E8E9F1',
  },
  mtTagText: {fontSize:13, color:'#192546', fontFamily:'Runda-Normal'},

  mtFormatRow: {flexDirection:'row', alignItems:'center', gap:14, marginTop:12},
  mtFormatIconWrap: {
    width:50, height:50, padding:14, borderRadius:10, alignItems:'center', justifyContent:'center',
    backgroundColor:'#DFF3FF',
  },
  mtFormatTitle: {fontSize:14, color:'#192546', fontFamily:'Runda-Medium', marginBottom:4},
  mtFormatDesc:  {fontSize:13, color:'#71727A', fontFamily:'Runda-Normal', lineHeight:18},

  mtSimilarCard: {
    width:226, paddingVertical:16, paddingHorizontal:8,
    flexDirection:'column', alignItems:'center', gap:8,
    borderRadius:5, backgroundColor:'#FFF',
    shadowColor:'#000', shadowOffset:{width:0, height:0}, shadowOpacity:0.15, shadowRadius:10.023, elevation:4,
    marginRight:12,
  },
  mtSimilarAvatar: {width:56, height:56, borderRadius:28},
  mtSimilarName:  {fontSize:12, color:'#192546', fontFamily:'Runda-Medium', textAlign:'center'},
  mtSimilarTitle: {fontSize:10, color:'#8F9098', fontFamily:'Runda-Normal', textAlign:'center', lineHeight:14},
  mtSimilarTag: {paddingVertical:4, paddingHorizontal:8, borderRadius:3, backgroundColor:'#E8E9F1'},
  mtSimilarTagText: {fontSize:10, color:'#192546', fontFamily:'Runda-Normal'},
  mtViewProfileBtn: {
    height:38, borderRadius:5, backgroundColor:'#0C4D91',
    alignSelf:'stretch', alignItems:'center', justifyContent:'center',
    paddingVertical:12, paddingHorizontal:16, marginTop:4,
  },
  mtViewProfileBtnText: {color:'#FFF', fontSize:13, fontFamily:'Runda-Medium'},

  mtReviewCard: {marginTop:16, paddingBottom:16, borderBottomWidth:1, borderBottomColor:'#F0F0F0'},
  mtReviewAvatar: {width:36, height:36, borderRadius:36},
  mtReviewName: {fontSize:14, color:'#192546', fontFamily:'Runda-Medium'},
  mtShowMoreBtn: {
    height:40, borderRadius:100, backgroundColor:'#192546',
    alignItems:'center', justifyContent:'center', marginTop:8,
  },
  mtShowMoreBtnText: {color:'#FFF', fontSize:14, fontFamily:'Runda-Medium'},

  // Empty states — Figma-exact
  emptyTab:  {alignItems:'flex-start', paddingVertical:24, paddingHorizontal:16, backgroundColor:'#FFF'},
  emptyText: {fontSize:14, color:'#AAA'},
  emptyFieldText: {fontSize:13, color:'#AAA', marginBottom:12},

  emptySection: {backgroundColor:'#FFF', paddingHorizontal:16, paddingVertical:16},

  // Activity empty states — Figma exact
  activityEmptyWrap:  {backgroundColor:'#FFF', paddingHorizontal:16, paddingVertical:16},
  activitySectionLabel: {fontSize:18, fontWeight:'700', color:'#192647', letterSpacing:0.09, marginBottom:12},
  activityEmptyCard: {
    borderWidth:1, borderColor:'#E8E8E8', borderRadius:12,
    padding:20, alignItems:'center', gap:10, marginBottom:4,
  },
  activityEmptyTitle: {
    fontSize:16, fontWeight:'700', color:'#192647',
    textAlign:'center', lineHeight:22,
  },
  activityEmptyDesc: {
    fontSize:14, color:'#555', textAlign:'center', lineHeight:20,
  },
  activityEmptyBtn: {
    height:44, borderRadius:50, borderWidth:1, borderColor:'#192647',
    paddingHorizontal:40, alignItems:'center', justifyContent:'center',
    marginTop:4, width:'100%',
  },
  activityEmptyBtnText: {fontSize:14, color:'#192647', fontWeight:'500'},

  // PMs You May Know — horizontal scroll
  pmsSection:       {marginTop:24, paddingBottom:8},
  pmsScrollContent: {paddingHorizontal:16, gap:10, paddingBottom:4},
  pmsCard: {
    width:130, alignItems:'center', padding:12,
    borderWidth:1, borderColor:'#E8E8E8', borderRadius:12, gap:6,
  },
  pmsAvatar:      {width:64, height:64, borderRadius:32, backgroundColor:'#E0E0E0'},
  // Fixed minHeight = numberOfLines(2) * lineHeight so every card reserves
  // identical space here regardless of how much name/role text a member has.
  pmsName:        {fontSize:13, fontWeight:'700', color:'#192647', textAlign:'center', lineHeight:17, minHeight:34},
  pmsRole:        {fontSize:11, color:'#888', textAlign:'center', lineHeight:15, minHeight:30},
  pmsFollowBtn: {
    backgroundColor:'#0C4D91', borderRadius:50,
    paddingHorizontal:14, paddingVertical:8,
    alignItems:'center', justifyContent:'center',
    minWidth:90, marginTop:4,
  },
  pmsFollowBtnActive:    {backgroundColor:'#FFF', borderWidth:1.5, borderColor:'#192546'},
  pmsFollowBtnText:      {color:'#FFF', fontSize:12, fontWeight:'600'},
  pmsFollowBtnTextActive:{color:'#192546'},
  emptyCard: {
    flexDirection:'row', alignItems:'flex-start', gap:14,
    paddingVertical:16, borderBottomWidth:1, borderBottomColor:'#F0F0F0',
  },
  emptyIconBox: {
    width:56, height:56, borderRadius:12,
    backgroundColor:'#F5F6FA', alignItems:'center', justifyContent:'center',
  },
  emptyCardText: {flex:1, paddingTop:2},
  emptyCardTitle: {
    fontSize:18, fontWeight:'700', color:'#192647',
    letterSpacing:0.09, marginBottom:4,
  },
  emptyCardDesc: {
    fontSize:14, fontWeight:'400', color:'#192647',
    lineHeight:18,
  },
  emptyFieldBox: {
    alignItems:'center', paddingVertical:24, gap:10,
  },
  expEmptyCard: {
    flexDirection:'row', alignItems:'center',
    justifyContent:'space-between', gap:12,
    padding:24, borderWidth:1, borderColor:'#EBEBEB',
    borderRadius:12, marginBottom:12,
  },
  plusBtn: {
    fontSize:22, color:'#0C4D91', fontWeight:'300',
    width:32, textAlign:'center',
  },
  emptyDivider: {height:1, backgroundColor:'#F0F0F0', marginVertical:8},

  // ── Experience tab info cards (Specialities/Projects/Experience/
  //    Education/Credential empty states) — per Figma spec:
  //    padding 24, radius 5, background #FFF, shadow 0 0 11px rgba(0,0,0,.17)
  infoCard: {
    padding:24,
    alignSelf:'stretch',
    borderRadius:5,
    backgroundColor:'#FFFFFF',
    shadowColor:'#000',
    shadowOffset:{width:0, height:0},
    shadowOpacity:0.17,
    shadowRadius:11,
    elevation:4,
  },
  infoCardRow:     {flexDirection:'row', alignItems:'center', gap:14},
  infoCardIconWrap:{width:46, height:46, alignItems:'center', justifyContent:'center'},
  infoCardTextWrap:{flex:1},
  infoCardTitle:   {fontSize:16, fontWeight:'700', color:'#192647', marginBottom:4},
  infoCardDesc:    {fontSize:13, color:'#8F9098', lineHeight:18},
  infoCardPlus:    {fontSize:24, color:'#0C4D91', fontWeight:'300', width:32, textAlign:'center'},
});

export default MemberProfileScreen;
