/* eslint-disable prettier/prettier */
import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  FlatList,
  PermissionsAndroid,
  Platform,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, {Path} from 'react-native-svg';
import Geolocation from '@react-native-community/geolocation';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import {fetchCountries, Country} from '../api/countriesApi';
import {getCachedCountries, cacheCountries} from '../api/cacheService';
import {getWelcomeIntroStatus, submitWelcomeIntro, WelcomeIntroPrefill} from '../api/profileApi';
import {getStoredUser} from '../api/authApi';

const {width} = Dimensions.get('window');

// ─── Camera SVG Icon ──────────────────────────────────────────────────────────
const CameraIcon = () => (
  <Svg width="20" height="17" viewBox="0 0 20 17" fill="none">
    <Path
      d="M7.27172 3.75651H3.98272C2.86271 3.75651 2.30272 3.75651 1.87471 3.97261C1.49841 4.16269 1.19246 4.46598 1.00071 4.83901C0.782715 5.26329 0.782715 5.81842 0.782715 6.92868V12.48C0.782715 13.5902 0.782715 14.1454 1.00071 14.5687C1.19271 14.9424 1.49771 15.2457 1.87471 15.4361C2.30172 15.6522 2.86172 15.6522 3.97972 15.6522H15.5857C16.7037 15.6522 17.2627 15.6522 17.6897 15.4361C18.0665 15.2459 18.3729 14.9422 18.5647 14.5687C18.7827 14.1454 18.7827 13.5912 18.7827 12.483V6.92571C18.7827 5.81743 18.7827 5.2623 18.5647 4.83901C18.3727 4.46582 18.0664 4.16252 17.6897 3.97261C17.2627 3.75651 16.7027 3.75651 15.5827 3.75651H12.2927M7.27172 3.75651H7.33472M7.27172 3.75651C7.16572 3.75651 7.10672 3.75651 7.05972 3.75056C6.92087 3.7352 6.78681 3.69118 6.66617 3.62132C6.54554 3.55146 6.44101 3.45732 6.35933 3.34496C6.27765 3.2326 6.22062 3.10453 6.19192 2.96899C6.16322 2.83345 6.16349 2.69345 6.19272 2.55802C6.21552 2.47195 6.24222 2.38695 6.27272 2.30325L6.27372 2.29731C6.32572 2.14464 6.35072 2.06931 6.37972 2.00091C6.52214 1.66277 6.75631 1.37038 7.05623 1.15619C7.35614 0.942007 7.71007 0.814404 8.07872 0.787549C8.15072 0.782593 8.23172 0.782593 8.39272 0.782593H11.1707C11.3327 0.782593 11.4137 0.782593 11.4877 0.787549C11.8562 0.814581 12.2099 0.942266 12.5096 1.15644C12.8093 1.37062 13.0434 1.66292 13.1857 2.00091C13.2147 2.06831 13.2397 2.14464 13.2917 2.2983C13.3377 2.4351 13.3617 2.5035 13.3717 2.55802C13.4009 2.69337 13.4012 2.8333 13.3726 2.96878C13.344 3.10426 13.287 3.23229 13.2054 3.34463C13.1239 3.45697 13.0195 3.55113 12.8989 3.62104C12.7784 3.69096 12.6445 3.73507 12.5057 3.75056C12.4349 3.75629 12.3638 3.75828 12.2927 3.75651M12.2927 3.75651H12.2307H7.33272M9.78272 12.6782C8.98707 12.6782 8.224 12.3649 7.66139 11.8072C7.09879 11.2495 6.78272 10.4931 6.78272 9.70433C6.78272 8.9156 7.09879 8.15917 7.66139 7.60146C8.224 7.04374 8.98707 6.73042 9.78272 6.73042C10.5784 6.73042 11.3414 7.04374 11.904 7.60146C12.4666 8.15917 12.7827 8.9156 12.7827 9.70433C12.7827 10.4931 12.4666 11.2495 11.904 11.8072C11.3414 12.3649 10.5784 12.6782 9.78272 12.6782Z"
      stroke="#8F9098"
      strokeWidth="1.56522"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── Smiley SVG Icon ──────────────────────────────────────────────────────────
const SmileyIcon = () => (
  <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M0.999941 8C0.999941 7.76132 1.0339 7.4073 1.05973 7.1849C1.14377 6.46292 1.34176 5.75768 1.62535 5.12538L2.08737 4.27491C2.46769 3.70975 2.77492 3.30517 3.28874 2.8513L3.75874 2.44625C4.83553 1.64445 6.25085 1.04173 7.5948 1.03218C7.77228 1.03109 7.81281 0.997907 8 0.997907C8.18719 0.997907 8.22772 1.03109 8.4052 1.03218C9.19793 1.03782 10.1965 1.32329 10.8746 1.62535L12.487 2.63797C13.2194 3.21064 13.9915 4.27084 14.3746 5.12538C14.6557 5.75205 14.8578 6.46761 14.9403 7.18474L15.0022 8C15.0022 8.36388 14.8933 9.23424 14.8129 9.56291C14.6967 10.0379 14.5573 10.4675 14.3746 10.8746C14.1809 11.3067 13.9915 11.6054 13.7376 11.9877C13.0838 12.9728 11.9555 13.8899 10.8746 14.3746C10.2008 14.6769 9.19433 14.9622 8.4052 14.9678C8.22772 14.9691 8.18719 15.0022 8 15.0022L7.18474 14.9403C6.92712 14.9105 6.6656 14.8687 6.43709 14.8129C5.0501 14.4737 3.79521 13.7798 2.8513 12.7113C2.6386 12.4705 2.45705 12.2812 2.26235 11.9877C2.19615 11.888 2.15185 11.821 2.08737 11.7251C2.01804 11.6221 1.98971 11.5615 1.92413 11.4509C1.81082 11.2596 1.71378 11.072 1.62535 10.8746C1.24926 10.0362 0.999941 8.95189 0.999941 8ZM7.74771 0H8.29956C8.86628 0.0190942 9.43144 0.0971926 9.98173 0.236956C10.6942 0.418038 11.4274 0.722293 12.0375 1.08759C12.6203 1.43645 12.9316 1.6709 13.4137 2.11758C13.8485 2.52028 13.9496 2.62232 14.348 3.12065C15.3705 4.39933 15.9437 6.061 16 7.74817V8.29987C15.9809 8.86659 15.9028 9.43159 15.763 9.98173C15.2347 12.0608 13.8575 13.8438 12.0181 14.9243C11.8135 15.0445 11.6055 15.1645 11.3841 15.2591C10.9067 15.4629 10.509 15.6311 9.95669 15.7691C9.06552 15.9919 8.64325 15.9998 7.76117 16H7.71875C6.61786 16 5.33338 15.6151 4.59325 15.2505C4.37461 15.1428 4.17193 15.0379 3.96252 14.9126C3.85092 14.8457 3.75608 14.7817 3.65435 14.7205C2.81968 14.2188 2.0232 13.3907 1.45554 12.607C1.23267 12.2996 0.889758 11.7328 0.740918 11.3841C0.141641 9.98032 0 9.27524 0 7.71875C0 6.61786 0.384858 5.33338 0.749526 4.59325C0.968639 4.14829 1.19495 3.76265 1.46853 3.37482C1.54021 3.27309 1.59734 3.18717 1.68029 3.08653C2.17204 2.48835 2.51214 2.13855 3.12065 1.65196C4.39949 0.629169 6.06069 0.0563435 7.74771 0Z" fill="#8F9098"/>
    <Path fillRule="evenodd" clipRule="evenodd" d="M3.7207 10.1245C3.7207 10.4995 4.1511 11.0413 4.39996 11.2889C4.5344 11.4226 4.68167 11.5916 4.8277 11.7051L5.32681 12.0809C6.32362 12.7501 7.57257 12.9783 8.77425 12.8028C10.011 12.6224 10.7599 12.1233 11.5883 11.3044C11.8428 11.0527 12.2834 10.5059 12.2834 10.1245C12.2834 9.82383 11.7184 9.37105 11.3078 9.99271C10.5234 11.1808 9.43707 11.8431 7.97073 11.8431C6.82601 11.8431 5.70775 11.3168 5.00596 10.433C4.89061 10.2876 4.81533 10.1741 4.70844 10.0116C4.27397 9.35086 3.7207 9.83839 3.7207 10.1245Z" fill="#8F9098"/>
    <Path fillRule="evenodd" clipRule="evenodd" d="M10.2803 5.99891C10.2803 7.32987 12.1942 7.40015 12.3041 6.05338C12.3428 5.57915 11.8573 5.03027 11.4053 5.03027C11.0778 5.03027 10.8105 5.05547 10.5531 5.33422C10.4238 5.47398 10.2803 5.73973 10.2803 5.99891Z" fill="#8F9098"/>
    <Path fillRule="evenodd" clipRule="evenodd" d="M3.68555 6.03021C3.68555 6.11958 3.75019 6.34574 3.77397 6.41038C3.88494 6.71166 4.25211 7.03016 4.65419 7.03016C5.67432 7.03016 6.00127 5.96417 5.44378 5.33437C5.19665 5.05516 4.91446 5.03027 4.59174 5.03027C4.11626 5.03027 3.68555 5.57962 3.68555 6.03021Z" fill="#8F9098"/>
  </Svg>
);

// ─── Gradient text ────────────────────────────────────────────────────────────
const GradientText = ({text, style}: {text: string; style?: any}) => (
  <MaskedView
    maskElement={
      <View style={{backgroundColor: 'transparent'}}>
        <Text style={[style, {backgroundColor: 'transparent'}]}>{text}</Text>
      </View>
    }>
    <LinearGradient
      colors={['#E257E4', '#005AB4']}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 0}}
      style={{alignSelf: 'stretch'}}>
      <Text style={[style, {opacity: 0}]}>{text}</Text>
    </LinearGradient>
  </MaskedView>
);

// ─── Static industry list ─────────────────────────────────────────────────────
const INDUSTRIES = [
  {icon: '🚀', name: 'Aerospace & Defense'},
  {icon: '🏗️', name: 'Construction & Engineering'},
  {icon: '📚', name: 'Education & Research'},
  {icon: '⚡', name: 'Energy & Infrastructure'},
  {icon: '💰', name: 'Financial Services'},
  {icon: '🏛️', name: 'Government & Public Sector'},
  {icon: '🏥', name: 'Healthcare & Pharmaceuticals'},
  {icon: '🏨', name: 'Hospitality & Tourism'},
  {icon: '🏭', name: 'Manufacturing & Production'},
  {icon: '🎬', name: 'Media & Entertainment'},
  {icon: '🤝', name: 'Nonprofit Organisations'},
  {icon: '🏠', name: 'Real Estate & Property'},
  {icon: '💻', name: 'Technology & Software'},
  {icon: '🚛', name: 'Transportation & Logistics'},
];

const DEFAULT_COUNTRY: Country = {
  name: 'Ireland',
  flag: '🇮🇪',
  code: 'IE',
  dialCode: '+353',
};

// ─── Progress Header ──────────────────────────────────────────────────────────
const ProgressHeader = ({step, totalSteps, title}: any) => (
  <View style={styles.header}>
    <View style={styles.progressDots}>
      {Array.from({length: totalSteps}, (_, i) => i + 1).map(dot => (
        <View
          key={dot}
          style={[
            styles.dot,
            dot === step && styles.dotActive,
            dot < step && styles.dotCompleted,
          ]}
        />
      ))}
    </View>
    <Text style={styles.stepLabel}>{title}</Text>
    <Text style={styles.stepNumber}>{'Step '}{step}{' of '}{totalSteps}</Text>
  </View>
);

// ─── Congratulations Modal ────────────────────────────────────────────────────
const CongratulationsModal = ({visible, onDiscover}: {visible: boolean; onDiscover: () => void}) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={styles.congratsCard}>
        {/* Title */}
        <Text style={styles.congratsTitle}>{'Congratulations!'}</Text>
        <View style={styles.congratsDivider} />

        {/* Body */}
        <Text style={styles.congratsBody}>
          {"You've just received "}
          <Text style={styles.congratsBold}>{'10 points'}</Text>
          {' for introducing yourself. Your personalised IPM Member Badge is now in progress — complete the next activities to unlock it.'}
        </Text>

        {/* Badge image */}
        <View style={styles.badgeWrap}>
          <Image
            source={require('../assets/images/ipmbadge.png')}
            style={styles.badgeImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.unlockText}>{'🔒 Unlock by completing more activities'}</Text>

        {/* Discover button — same gradient as Post */}
        <TouchableOpacity
          style={styles.discoverBtnWrap}
          onPress={onDiscover}
          activeOpacity={0.85}>
          <LinearGradient
            colors={['#E257E4', '#084D92']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            locations={[0, 0.7035]}
            style={styles.discoverBtn}>
            <Text style={styles.discoverBtnText}>{'Discover the Community'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ProfileSetupScreen = ({navigation}: any) => {
  const [step, setStep] = useState(1);
  const [step2Tab, setStep2Tab] = useState<'industry' | 'country'>('industry');
  const [saving, setSaving] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);

  // Welcome-intro status (drives whether the popup shows at all, and prefill)
  const [userId, setUserId] = useState(0);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [useExistingAvatar, setUseExistingAvatar] = useState(false);
  const [prefillData, setPrefillData] = useState<WelcomeIntroPrefill | null>(null);
  // Guards the geolocation auto-detect below from clobbering a country that
  // already came back from the server prefill — the geolocation lookup can
  // resolve well after the status call does.
  const prefillCountryRef = useRef<string>('');

  // Step 1
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');

  // Step 2
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [industrySearch, setIndustrySearch] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [detectedCountry, setDetectedCountry] = useState<Country | null>(null);
  const [countrySearch, setCountrySearch] = useState('');
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Step 3
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedPhoneCountry, setSelectedPhoneCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [linkedIn, setLinkedIn] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [showExample, setShowExample] = useState(true);

  useEffect(() => {
    loadCountriesAndDetectLocation();
    checkWelcomeIntroStatus();
  }, []);

  // Once both the country list and the server prefill are in, match the
  // prefill's country / phone_country names against the loaded list.
  useEffect(() => {
    if (!prefillData || countries.length === 0) return;
    if (prefillData.country) {
      const match = countries.find(c => c.name === prefillData.country);
      if (match) { setSelectedCountry(match); setDetectedCountry(match); }
    }
    if (prefillData.phone_country) {
      const phoneMatch = countries.find(c => c.name === prefillData.phone_country);
      if (phoneMatch) setSelectedPhoneCountry(phoneMatch);
    }
  }, [countries, prefillData]);

  const checkWelcomeIntroStatus = async () => {
    try {
      const storedUser = await getStoredUser();
      const uid = storedUser?.userId || 0;
      setUserId(uid);
      if (!uid) return;

      const status = await getWelcomeIntroStatus(uid);
      if (!status) return;

      if (!status.show_popup || status.already_submitted) {
        // Already submitted (or server says it shouldn't show) — don't make
        // the user go through onboarding again.
        navigation.replace('MainApp');
        return;
      }

      if (status.can_use_existing_avatar && status.avatar_url) {
        setUseExistingAvatar(true);
        setPhotoUri(status.avatar_url);
      }

      if (status.prefill) {
        prefillCountryRef.current = status.prefill.country || '';
        setPrefillData(status.prefill);
        if (status.prefill.job) setJobTitle(status.prefill.job);
        if (status.prefill.company) setCompany(status.prefill.company);
        if (status.prefill.industry) setSelectedIndustry(status.prefill.industry);
        if (status.prefill.linkedin) setLinkedIn(status.prefill.linkedin);
        if (status.prefill.phone) setPhoneNumber(status.prefill.phone);
      }
    } catch (err) {
      console.log('checkWelcomeIntroStatus error:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {title: 'Location Permission', message: 'IPM Hub needs your location to auto-select your country.', buttonNeutral: 'Ask Me Later', buttonNegative: 'Cancel', buttonPositive: 'OK'},
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch { return false; }
    }
    return true;
  };

  const detectUserCountry = async (countryList: Country[]) => {
    setDetectingLocation(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) { setDetectingLocation(false); return; }
      Geolocation.getCurrentPosition(
        async position => {
          try {
            const {latitude, longitude} = position.coords;
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await response.json();
            const found = countryList.find(c => c.code === data.countryCode);
            // Skip if a server prefill country already came back — the
            // prefill is authoritative and this geolocation lookup can
            // resolve after it.
            if (found && !prefillCountryRef.current) { setSelectedCountry(found); setDetectedCountry(found); setSelectedPhoneCountry(found); }
          } catch {} finally { setDetectingLocation(false); }
        },
        () => setDetectingLocation(false),
        {enableHighAccuracy: false, timeout: 10000, maximumAge: 60000},
      );
    } catch { setDetectingLocation(false); }
  };

  const loadCountriesAndDetectLocation = async () => {
    setLoadingCountries(true);
    try {
      const cached = await getCachedCountries();
      const data = cached || (await fetchCountries());
      if (!cached) await cacheCountries(data);
      setCountries(data);
      await detectUserCountry(data);
    } catch {} finally { setLoadingCountries(false); }
  };

  const handlePickPhoto = () => {
    Alert.alert('Profile Photo', 'Choose photo source', [
      {text: 'Camera', onPress: () => launchCamera({mediaType: 'photo', quality: 0.8, maxWidth: 400, maxHeight: 400}, res => { if (res.assets?.[0]?.uri) { setPhotoUri(res.assets[0].uri!); setUseExistingAvatar(false); } })},
      {text: 'Photo Library', onPress: () => launchImageLibrary({mediaType: 'photo', quality: 0.8, maxWidth: 400, maxHeight: 400}, res => { if (res.assets?.[0]?.uri) { setPhotoUri(res.assets[0].uri!); setUseExistingAvatar(false); } })},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleContinue = async () => {
    if (step === 1) {
      if (!photoUri) {
        Alert.alert('Profile Photo Required', 'Please upload a profile photo to continue.');
        return;
      }
      if (!jobTitle.trim() || !company.trim()) {
        Alert.alert('Required Fields', 'Please fill in your Job Title and Company to continue.');
        return;
      }
      setStep(2); setStep2Tab('industry');
    }
    else if (step === 2 && step2Tab === 'industry') { setStep2Tab('country'); }
    else if (step === 2 && step2Tab === 'country') { setStep(3); }
    else if (step === 3) {
      if (!phoneNumber.trim() || !linkedIn.trim() || !introduction.trim()) {
        Alert.alert('Required Fields', 'Please fill in your Phone Number, LinkedIn URL, and Introduction to continue.');
        return;
      }
      // The welcome-intro/submit endpoint requires the bio to be at least
      // 130 characters — validate client-side so the user gets an inline
      // reason instead of a generic server error.
      if (introduction.trim().length < 130) {
        Alert.alert('Introduction Too Short', `Please write at least 130 characters about yourself (currently ${introduction.trim().length}).`);
        return;
      }
      await handleSubmit();
    }
  };

  const isStep3Valid = !!phoneNumber.trim() && !!linkedIn.trim() && !!introduction.trim();
  const isStep1Valid = !!photoUri && !!jobTitle.trim() && !!company.trim();

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const storedUser = await getStoredUser();
      const uid = storedUser?.userId || userId || 0;

      // Single write — Robby's welcome-intro/submit endpoint saves the
      // profile fields AND creates the introduction post together, so there's
      // no longer a separate step that can fail invisibly after the profile
      // itself has already saved.
      await submitWelcomeIntro({
        userId: uid,
        job: jobTitle,
        company,
        industry: selectedIndustry,
        country: selectedCountry.name,
        phone: `${selectedPhoneCountry.dialCode}${phoneNumber}`,
        phoneCountry: selectedPhoneCountry.name,
        linkedin: linkedIn,
        bio: introduction.trim(),
        photoUri: useExistingAvatar ? null : photoUri,
        useExistingAvatar,
      });

      setShowCongrats(true);
    } catch (err) {
      console.log('submitWelcomeIntro error:', err);
      Alert.alert(
        'Introduction Not Posted',
        "We couldn't submit your welcome intro. Please check your details and try again.",
      );
    } finally { setSaving(false); }
  };

  const getStepTitle = () => {
    if (step === 1) return 'Profile settings';
    if (step === 2) return step2Tab === 'industry' ? 'Select your industry' : 'Select your country';
    return 'Intro';
  };

  const filteredIndustries = INDUSTRIES.filter(i => i.name.toLowerCase().includes(industrySearch.toLowerCase()));
  const filteredCountries = countries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()));
  const filteredPhoneCountries = countries.filter(c => c.name.toLowerCase().includes(phoneSearch.toLowerCase()));

  const PhoneCountryModal = () => (
    <Modal visible={showPhoneModal} animationType="slide" onRequestClose={() => setShowPhoneModal(false)}>
      <SafeAreaView style={styles.phoneModalContainer}>
        <View style={styles.phoneModalHeader}>
          <Text style={styles.phoneModalTitle}>{'Select Country'}</Text>
          <TouchableOpacity onPress={() => { setShowPhoneModal(false); setPhoneSearch(''); }}>
            <Text style={styles.phoneModalClose}>{'✕'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.phoneModalSearch}>
          <TextInput style={styles.phoneModalSearchInput} placeholder="Search country..." placeholderTextColor="#999" value={phoneSearch} onChangeText={setPhoneSearch} autoFocus />
        </View>
        <FlatList
          data={filteredPhoneCountries}
          keyExtractor={item => item.code}
          renderItem={({item}) => (
            <TouchableOpacity
              style={[styles.phoneModalItem, selectedPhoneCountry.code === item.code && styles.phoneModalItemActive]}
              onPress={() => { setSelectedPhoneCountry(item); setShowPhoneModal(false); setPhoneSearch(''); }}>
              <Text style={styles.phoneModalFlag}>{item.flag}</Text>
              <Text style={styles.phoneModalName}>{item.name}</Text>
              <Text style={styles.phoneModalDial}>{item.dialCode}</Text>
              {selectedPhoneCountry.code === item.code && <Text style={styles.checkmark}>{'✓'}</Text>}
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );

  if (checkingStatus) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0C4D91" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <PhoneCountryModal />

      {/* Congratulations popup */}
      <CongratulationsModal
        visible={showCongrats}
        onDiscover={() => { setShowCongrats(false); navigation.replace('MainApp'); }}
      />

      <ProgressHeader step={step} totalSteps={3} title={getStepTitle()} />

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Upload frame — dashed border, padding 32px */}
          <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.9}>
            {photoUri ? (
              // Photo selected — circular preview
              <View style={styles.photoSelectedWrap}>
                <View style={styles.photoCircle}>
                  <Image source={{uri: photoUri}} style={styles.photoPreview} />
                </View>
                <TouchableOpacity onPress={handlePickPhoto} style={{marginTop: 10}}>
                  <Text style={styles.changePhotoText}>{'Change Photo'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // No photo — dashed frame
              <View style={styles.uploadFrame}>
                <CameraIcon />
                {/* "Tap to Upload Photo" — #46B0E3 14px 500 */}
                <Text style={styles.uploadText}>{'Tap to Upload Photo '}<Text style={styles.requiredAsterisk}>{'*'}</Text></Text>
                {/* Subtext — #192546 12px 500 */}
                <Text style={styles.uploadSubtext}>{'PNG or JPG (Image dimensions must not exceed 200x200 pixels)'}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Open Camera button — light grey, border */}
          {!photoUri && (
            <TouchableOpacity style={styles.openCameraBtn} onPress={handlePickPhoto} activeOpacity={0.85}>
              <Text style={styles.openCameraBtnText}>{'Open Camera'}</Text>
            </TouchableOpacity>
          )}

          {/* Field labels — flex column, gap 8, align-self stretch */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{'Job Title'}</Text>
            <TextInput style={styles.input} placeholder="eg. Project Manager" placeholderTextColor="#C0C0C0" value={jobTitle} onChangeText={setJobTitle} />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{'Company'}</Text>
            <TextInput style={styles.input} placeholder="eg. Institute of Project Management" placeholderTextColor="#C0C0C0" value={company} onChangeText={setCompany} />
          </View>
        </ScrollView>
      )}

      {/* ── STEP 2a: Industry ── */}
      {step === 2 && step2Tab === 'industry' && (
        <View style={styles.listContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>{'🔍'}</Text>
            <TextInput style={styles.searchInput} placeholder="Type your industry" placeholderTextColor="#999" value={industrySearch} onChangeText={setIndustrySearch} />
          </View>
          <Text style={styles.sectionLabel}>{'Alphabetical'}</Text>
          <FlatList
            data={filteredIndustries}
            keyExtractor={item => item.name}
            renderItem={({item}) => (
              <TouchableOpacity
                style={[styles.listItem, selectedIndustry === item.name && styles.listItemActive]}
                onPress={() => setSelectedIndustry(item.name)}>
                <Text style={styles.listItemIcon}>{item.icon}</Text>
                <Text style={[styles.listItemText, selectedIndustry === item.name && styles.listItemTextActive]}>{item.name}</Text>
                {selectedIndustry === item.name && <Text style={styles.checkmark}>{'✓'}</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* ── STEP 2b: Country ── */}
      {step === 2 && step2Tab === 'country' && (
        <View style={styles.listContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>{'🔍'}</Text>
            <TextInput style={styles.searchInput} placeholder="Type your country name" placeholderTextColor="#999" value={countrySearch} onChangeText={setCountrySearch} />
          </View>
          {loadingCountries || detectingLocation ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0C4D91" />
              <Text style={styles.loadingText}>{detectingLocation ? 'Detecting your location...' : 'Loading countries...'}</Text>
            </View>
          ) : (
            <FlatList
              data={filteredCountries}
              keyExtractor={item => item.code}
              ListHeaderComponent={() => (
                <>
                  {detectedCountry && (
                    <>
                      <Text style={styles.sectionLabel}>{'Based on your location'}</Text>
                      <TouchableOpacity
                        style={[styles.listItem, selectedCountry.code === detectedCountry.code && styles.listItemActive]}
                        onPress={() => setSelectedCountry(detectedCountry)}>
                        <Text style={styles.listItemIcon}>{detectedCountry.flag}</Text>
                        <Text style={[styles.listItemText, selectedCountry.code === detectedCountry.code && styles.listItemTextActive]}>{detectedCountry.name}</Text>
                        {selectedCountry.code === detectedCountry.code && <Text style={styles.checkmark}>{'✓'}</Text>}
                      </TouchableOpacity>
                    </>
                  )}
                  <Text style={styles.sectionLabel}>{'Alphabetical'}</Text>
                </>
              )}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[styles.listItem, selectedCountry.code === item.code && styles.listItemActive]}
                  onPress={() => setSelectedCountry(item)}>
                  <Text style={styles.listItemIcon}>{item.flag}</Text>
                  <Text style={[styles.listItemText, selectedCountry.code === item.code && styles.listItemTextActive]}>{item.name}</Text>
                  {selectedCountry.code === item.code && <Text style={styles.checkmark}>{'✓'}</Text>}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Gradient title */}
          <GradientText text="Start Your IPM Journey" style={styles.introTitle} />

          <Text style={styles.introSubtitle}>{'Introduce yourself to connect with industry peers and unlock your official IPM Member Badge.'}</Text>

          {/* Phone Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{'Phone Number'}</Text>
            <View style={styles.phoneRow}>
              <TouchableOpacity style={styles.flagBtn} onPress={() => setShowPhoneModal(true)}>
                <Text style={styles.flagText}>{selectedPhoneCountry.flag}{' '}{selectedPhoneCountry.dialCode}{' ▼'}</Text>
              </TouchableOpacity>
              <TextInput style={styles.phoneInput} placeholder="Enter number" placeholderTextColor="#999" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
            </View>
          </View>

          {/* LinkedIn URL */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{'LinkedIn URL'}</Text>
            <TextInput style={styles.input} placeholder="Your LinkedIn Profile URL" placeholderTextColor="#999" value={linkedIn} onChangeText={setLinkedIn} autoCapitalize="none" keyboardType="url" />
          </View>

          {/* Introduction */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{'Introduction'}</Text>
            {/* Introduction box — bg #E8E9F1, border #C5C6CC */}
            <View style={styles.introBoxWrap}>
              <TextInput
                style={styles.textArea}
                placeholder="Tell us about yourself and the topics you are interested in..."
                placeholderTextColor="#8F9098"
                value={introduction}
                onChangeText={setIntroduction}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
              {/* Smiley icon bottom right */}
              <View style={styles.smileyWrap}>
                <SmileyIcon />
              </View>
            </View>
          </View>

          {/* Example toggle */}
          <TouchableOpacity style={styles.exampleToggle} onPress={() => setShowExample(!showExample)}>
            <Text style={styles.exampleLabel}>{'Example '}{showExample ? '∧' : '∨'}</Text>
          </TouchableOpacity>
          {showExample && (
            <View style={styles.exampleBox}>
              <Text style={styles.exampleText}>{"Hello, I'm Paul McCartney, a seasoned Project Manager Consultant with a track record of steering projects to success across diverse industries. My expertise lies in optimising resource utilisation and ensuring stakeholder satisfaction. I'm eager to embark on collaborative ventures within this dynamic community. I am interested in PMO."}</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Footer ── */}
      <View style={styles.footer}>
        {step === 3 ? (
          // Post button — gradient E257E4 → 084D92
          <TouchableOpacity
            onPress={handleContinue}
            disabled={saving || !isStep3Valid}
            activeOpacity={0.85}
            style={[styles.postBtnWrap, !isStep3Valid && styles.postBtnWrapDisabled]}>
            {isStep3Valid ? (
              <LinearGradient
                colors={['#E257E4', '#084D92']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                locations={[0, 0.7035]}
                style={styles.postBtn}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.continueBtnText}>{'Post'}</Text>}
              </LinearGradient>
            ) : (
              <View style={[styles.postBtn, styles.continueBtnDisabled]}>
                <Text style={styles.continueBtnText}>{'Post'}</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          // Continue button — solid #0C4D91
          <TouchableOpacity
            style={[
              styles.continueBtn,
              (saving || (step === 1 && !isStep1Valid) || (step === 2 && step2Tab === 'industry' && !selectedIndustry)) && styles.continueBtnDisabled,
            ]}
            onPress={handleContinue}
            disabled={saving}
            activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.continueBtnText}>{'Continue'}</Text>}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
    height: 56,
  },
  progressDots: {flexDirection: 'row', gap: 5, marginRight: 12},
  dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0'},
  dotActive: {width: 20, backgroundColor: '#0C4D91', borderRadius: 4},
  dotCompleted: {backgroundColor: '#0C4D91'},
  // Heading/H3: Runda 500 16px #0C4D91 lh 20px letterSpacing 0.08
  stepLabel: {
    flex: 1,
    fontFamily: 'Runda',
    fontSize: 16,
    fontWeight: '500',
    color: '#0C4D91',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  stepNumber: {fontFamily: 'Runda', fontSize: 12, color: '#999'},

  // ── Scroll ────────────────────────────────────────────────────────────────
  scrollView: {flex: 1},
  scrollContent: {paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40},

  // ── Step 1: Photo ─────────────────────────────────────────────────────────
  // Dashed frame — border-radius 5, dashed #C5C6CC, white bg, padding 32, gap 24
  uploadFrame: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#C5C6CC',
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
    paddingVertical: 32,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  // "Tap to Upload Photo" — #46B0E3 14px 500
  uploadText: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '500',
    color: '#46B0E3',
    textAlign: 'center',
  },
  requiredAsterisk: {
    color: '#E4573D',
    fontWeight: '700',
  },
  // Subtext — #192546 H5 12px 500
  uploadSubtext: {
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '500',
    color: '#192546',
    textAlign: 'center',
    lineHeight: 16,
  },

  photoSelectedWrap: {alignItems: 'center', marginBottom: 16},
  photoCircle: {width: 100, height: 100, borderRadius: 50, overflow: 'hidden', borderWidth: 2, borderColor: '#E0E0E0'},
  photoPreview: {width: '100%', height: '100%'},
  changePhotoText: {fontFamily: 'Runda', fontSize: 14, fontWeight: '500', color: '#46B0E3', textAlign: 'center'},

  // Open Camera button — width 350, height 40, border-radius 50, bg #F8F9FE, border #C5C6CC
  openCameraBtn: {
    width: 350,
    height: 40,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 50,
    backgroundColor: '#0C4D91',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  openCameraBtnText: {fontFamily: 'Runda-Bold', fontSize: 14, fontWeight: '700', color: '#FFFFFF'},

  // Field group — flex column, gap 8, align-self stretch
  fieldGroup: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    alignSelf: 'stretch',
    marginTop: 14,
  },
  // H5: Runda 500 12px #192546
  label: {
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '500',
    color: '#192546',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: 'Runda',
    fontSize: 14,
    color: '#333',
    alignSelf: 'stretch',
    width: '100%',
  },

  // ── Industry / Country list ───────────────────────────────────────────────
  listContainer: {flex: 1, paddingHorizontal: 16},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginVertical: 12,
  },
  searchIcon: {fontSize: 14, marginRight: 8},
  searchInput: {flex: 1, paddingVertical: 10, fontFamily: 'Runda', fontSize: 14, color: '#333'},
  sectionLabel: {fontFamily: 'Runda', fontSize: 12, color: '#999', fontWeight: '600', marginVertical: 8, marginLeft: 4},
  // height 41px, padding 8px 20px, gap 10
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 41,
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 10,
    alignSelf: 'stretch',
    borderRadius: 6,
  },
  listItemActive: {backgroundColor: '#EBF5FF'},
  listItemIcon: {fontSize: 18},
  listItemText: {flex: 1, fontFamily: 'Runda', fontSize: 14, color: '#333'},
  listItemTextActive: {color: '#0C4D91', fontWeight: '600'},
  checkmark: {color: '#0C4D91', fontSize: 16, fontWeight: '700'},
  loadingContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12},
  loadingText: {fontFamily: 'Runda', color: '#666', fontSize: 14},

  // ── Step 3 ────────────────────────────────────────────────────────────────
  // Gradient title — Heading/H2 Runda 700 18px letterSpacing 0.09
  introTitle: {
    fontFamily: 'Runda-Bold',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.09,
    lineHeight: 24,
    marginBottom: 8,
  },
  introSubtitle: {
    fontFamily: 'Runda',
    fontSize: 14,
    fontWeight: '400',
    color: '#71727A',
    lineHeight: 18,
    marginBottom: 8,
  },

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'stretch',
    width: '100%',
  },
  flagBtn: {paddingHorizontal: 12, paddingVertical: 13, backgroundColor: '#F5F5F5', borderRightWidth: 1, borderRightColor: '#E5E7EB'},
  flagText: {fontFamily: 'Runda', fontSize: 13, color: '#333'},
  phoneInput: {flex: 1, paddingHorizontal: 12, paddingVertical: 13, fontFamily: 'Runda', fontSize: 14, color: '#333'},

  // Introduction box — bg #E8E9F1, border #C5C6CC
  introBoxWrap: {
    borderWidth: 1,
    borderColor: '#C5C6CC',
    borderRadius: 8,
    backgroundColor: '#E8E9F1',
    alignSelf: 'stretch',
    width: '100%',
    position: 'relative',
  },
  textArea: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingBottom: 32,
    fontFamily: 'Runda',
    fontSize: 14,
    color: '#333',
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
  },
  smileyWrap: {position: 'absolute', bottom: 10, right: 12},

  exampleToggle: {marginTop: 12, marginBottom: 8},
  exampleLabel: {fontFamily: 'Runda', fontSize: 13, color: '#333', fontWeight: '600'},
  exampleBox: {backgroundColor: '#F8F9FA', borderRadius: 8, padding: 12, borderLeftWidth: 3, borderLeftColor: '#0C4D91'},
  exampleText: {fontFamily: 'Runda', fontSize: 12, color: '#666', lineHeight: 18},

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {paddingHorizontal: 24, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F0F0F0'},

  // Continue — solid #0C4D91, height 40
  continueBtn: {
    height: 40,
    paddingHorizontal: 16,
    backgroundColor: '#0C4D91',
    borderRadius: 30,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {backgroundColor: '#C5C6CC'},
  continueBtnText: {fontFamily: 'Runda-Bold', color: '#FFFFFF', fontSize: 14, fontWeight: '700'},

  // Post button — gradient wrapper
  postBtnWrap: {height: 40, alignSelf: 'stretch', borderRadius: 50, overflow: 'hidden'},
  postBtnWrapDisabled: {opacity: 1},
  postBtn: {flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 50},

  // ── Congratulations Modal ─────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  congratsCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  congratsTitle: {
    fontFamily: 'Runda-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: '#0C4D91',
    textAlign: 'center',
    marginBottom: 10,
  },
  congratsDivider: {
    width: 40,
    height: 3,
    backgroundColor: '#E257E4',
    borderRadius: 2,
    marginBottom: 14,
  },
  congratsBody: {
    fontFamily: 'Runda',
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  congratsBold: {fontFamily: 'Runda-Bold', fontWeight: '700', color: '#0C4D91'},
  badgeWrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    height: 160,
    backgroundColor: '#E8EAF6',
  },
  badgeImage: {width: '100%', height: 160},
  unlockText: {
    fontFamily: 'Runda',
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  discoverBtnWrap: {height: 48, alignSelf: 'stretch', borderRadius: 50, overflow: 'hidden'},
  discoverBtn: {flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 50},
  discoverBtnText: {fontFamily: 'Runda-Bold', color: '#FFFFFF', fontSize: 15, fontWeight: '700'},

  // ── Phone country modal ───────────────────────────────────────────────────
  phoneModalContainer: {flex: 1, backgroundColor: '#FFFFFF'},
  phoneModalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0'},
  phoneModalTitle: {fontFamily: 'Runda-Bold', fontSize: 18, fontWeight: '700', color: '#0C4D91'},
  phoneModalClose: {fontSize: 18, color: '#666'},
  phoneModalSearch: {paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E0E0E0'},
  phoneModalSearchInput: {backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontFamily: 'Runda', fontSize: 14, color: '#333'},
  phoneModalItem: {flexDirection: 'row', alignItems: 'center', height: 41, paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5'},
  phoneModalItemActive: {backgroundColor: '#EBF5FF'},
  phoneModalFlag: {fontSize: 22, marginRight: 12},
  phoneModalName: {flex: 1, fontFamily: 'Runda', fontSize: 14, color: '#333'},
  phoneModalDial: {fontFamily: 'Runda', fontSize: 13, color: '#999', marginRight: 8},
});

export default ProfileSetupScreen;
