/* eslint-disable prettier/prettier */
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
// SafeAreaView from 'react-native' is iOS-only (no-op on Android), which is
// why the back button/header sat under the Android status bar. Swapped to
// the real cross-platform SafeAreaView, matching ResourceDetailScreen etc.
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import {submitArticle} from '../api/resourcesApi';
import BackButton from '../components/BackButton';

const TERMS_URL = 'https://projectmanagement.ie/terms-and-conditions/';

const UploadIcon = ({color = '#192546'}: {color?: string}) => (
  <Svg width={11} height={12} viewBox="0 0 11 12" fill="none">
    <Path d="M3.2929 3.19895L4.64534 1.86089L4.65556 8.41749C4.65556 8.81593 4.98216 9.13894 5.38503 9.13894C5.78791 9.13894 6.11451 8.81593 6.11451 8.41749L6.10429 1.86908L7.44897 3.19897C7.72886 3.48557 8.19066 3.4935 8.48044 3.21669C8.77023 2.93987 8.77825 2.48315 8.49836 2.19655C8.49248 2.19053 8.48651 2.18462 8.48044 2.17883L6.91839 0.633943C6.06376 -0.211311 4.67813 -0.211311 3.82348 0.63392L3.82345 0.633943L2.26142 2.17881C1.98153 2.4654 1.98955 2.92213 2.27934 3.19895C2.56203 3.46897 3.0102 3.46897 3.2929 3.19895Z" fill={color} />
    <Path d="M10.1256 7.16943C9.75274 7.16943 9.45052 7.4631 9.45052 7.82534V9.83285C9.45026 9.93152 9.36801 10.0115 9.26646 10.0117H1.53413C1.43258 10.0114 1.35031 9.93152 1.35007 9.83285V7.82534C1.35007 7.4631 1.04785 7.16943 0.675037 7.16943C0.302227 7.16943 0 7.4631 0 7.82534V9.83285C0.00099146 10.6557 0.687272 11.3225 1.53413 11.3235H9.26644C10.1133 11.3225 10.7996 10.6557 10.8006 9.83285V7.82534C10.8006 7.4631 10.4984 7.16943 10.1256 7.16943Z" fill={color} />
  </Svg>
);

// Reusable "dashed file picker" row — used for both Upload Your Work and
// Profile Picture (same visual spec in Figma).
const FilePickerRow = ({
  label,
  hasError,
  fileLabel,
  onPress,
}: {
  label: string;
  hasError?: boolean;
  fileLabel: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.filePicker, hasError && styles.inputErr]}
    onPress={onPress}
    activeOpacity={0.7}>
    <Text style={styles.filePickerText} numberOfLines={1}>{fileLabel}</Text>
    <View style={styles.uploadIconCircle}>
      <UploadIcon />
    </View>
  </TouchableOpacity>
);

const ArticleSubmissionScreen = ({navigation}: any) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [file, setFile] = useState<any>(null);
  const [profilePicture, setProfilePicture] = useState<any>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'Required';
    if (!lastName.trim()) e.lastName = 'Required';
    if (!jobTitle.trim()) e.jobTitle = 'Required';
    if (!email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email';
    if (!file) e.file = 'Please upload your work';
    if (!bio.trim()) e.bio = 'Required';
    else if (bio.length > 250) e.bio = 'Max 250 characters';
    if (!profilePicture) e.profilePicture = 'Please add a profile picture';
    if (!linkedinUrl.trim()) e.linkedinUrl = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePickFile = async () => {
    try {
      const DocumentPicker = require('react-native-document-picker').default;
      const result = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.docx, DocumentPicker.types.doc],
      });
      setFile(result);
      setErrors(e => ({...e, file: ''}));
    } catch (err: any) {
      if (!err?.toString?.()?.includes('cancel')) {
        Alert.alert('Error', 'Could not pick file. Please try again.');
      }
    }
  };

  const handlePickProfilePicture = async () => {
    try {
      const DocumentPicker = require('react-native-document-picker').default;
      const result = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.images],
      });
      setProfilePicture(result);
      setErrors(e => ({...e, profilePicture: ''}));
    } catch (err: any) {
      if (!err?.toString?.()?.includes('cancel')) {
        Alert.alert('Error', 'Could not pick image. Please try again.');
      }
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const ok = await submitArticle({
        firstName,
        lastName,
        jobTitle,
        email,
        bio,
        fileUri: file.uri,
        fileName: file.name,
        profilePictureUri: profilePicture.uri,
        profilePictureName: profilePicture.name || 'profile.jpg',
        linkedinUrl,
        instagramUrl: instagramUrl || undefined,
        twitterUrl: twitterUrl || undefined,
        facebookUrl: facebookUrl || undefined,
      });
      if (ok) {
        Alert.alert(
          'Submitted!',
          'Your article submission has been received. We will review it shortly.',
          [{text: 'OK', onPress: () => navigation.goBack()}],
        );
      } else {
        Alert.alert(
          'Error',
          'Submission failed. The submission endpoint may not be live yet — please try again later or contact support.',
        );
      }
    } catch {
      Alert.alert('Error', 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.formTop}>
          <Text style={styles.title}>{'Article Submission Form'}</Text>

          <Text style={styles.label}>{'First Name*'}</Text>
          <TextInput
            style={[styles.input, errors.firstName && styles.inputErr]}
            placeholder="Camila"
            placeholderTextColor="#C0C0C0"
            value={firstName}
            onChangeText={v => {
              setFirstName(v);
              setErrors(e => ({...e, firstName: ''}));
            }}
          />
          {errors.firstName ? <Text style={styles.err}>{errors.firstName}</Text> : null}

          <Text style={styles.label}>{'Last Name*'}</Text>
          <TextInput
            style={[styles.input, errors.lastName && styles.inputErr]}
            placeholder="Cabello"
            placeholderTextColor="#C0C0C0"
            value={lastName}
            onChangeText={v => {
              setLastName(v);
              setErrors(e => ({...e, lastName: ''}));
            }}
          />
          {errors.lastName ? <Text style={styles.err}>{errors.lastName}</Text> : null}

          <Text style={styles.label}>{'Job Title*'}</Text>
          <TextInput
            style={[styles.input, errors.jobTitle && styles.inputErr]}
            placeholder="Project Manager"
            placeholderTextColor="#C0C0C0"
            value={jobTitle}
            onChangeText={v => {
              setJobTitle(v);
              setErrors(e => ({...e, jobTitle: ''}));
            }}
          />
          {errors.jobTitle ? <Text style={styles.err}>{errors.jobTitle}</Text> : null}

          <Text style={styles.label}>{'Email*'}</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputErr]}
            placeholder=""
            placeholderTextColor="#C0C0C0"
            value={email}
            onChangeText={v => {
              setEmail(v);
              setErrors(e => ({...e, email: ''}));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email ? <Text style={styles.err}>{errors.email}</Text> : null}

          <Text style={styles.label}>{'Upload Your Work*'}</Text>
          <FilePickerRow
            label="Upload Your Work"
            hasError={!!errors.file}
            fileLabel={file ? file.name || 'File selected' : 'Choose File'}
            onPress={handlePickFile}
          />
          <Text style={styles.hint}>
            {'Only Microsoft Word (.docx or .doc) and pdf file is supported'}
          </Text>
          {errors.file ? <Text style={styles.err}>{errors.file}</Text> : null}

          <Text style={styles.label}>{'Short Biography*'}</Text>
          <TextInput
            style={[styles.textArea, errors.bio && styles.inputErr]}
            placeholder="Maximum of 250 characters"
            placeholderTextColor="#8F9098"
            value={bio}
            onChangeText={v => {
              setBio(v);
              setErrors(e => ({...e, bio: ''}));
            }}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={250}
          />
          <Text style={styles.charCount}>{`${bio.length}/250`}</Text>
          <Text style={styles.hint}>
            {'Your bio will be publicly visible at the bottom of your article'}
          </Text>
          {errors.bio ? <Text style={styles.err}>{errors.bio}</Text> : null}

          <Text style={styles.label}>{'Profile Picture*'}</Text>
          <FilePickerRow
            label="Profile Picture"
            hasError={!!errors.profilePicture}
            fileLabel={profilePicture ? profilePicture.name || 'Image selected' : 'Choose File'}
            onPress={handlePickProfilePicture}
          />
          <Text style={styles.hint}>{'A high-quality, professional headshot is preferred'}</Text>
          {errors.profilePicture ? <Text style={styles.err}>{errors.profilePicture}</Text> : null}
        </View>

        {/* Figma: padding 0 16, column, gap 16 — LinkedIn through Facebook */}
        <View style={styles.socialFrame}>
          <View style={styles.socialField}>
            <Text style={styles.label}>{'LinkedIn URL*'}</Text>
            <TextInput
              style={[styles.input, errors.linkedinUrl && styles.inputErr]}
              placeholder=""
              placeholderTextColor="#C0C0C0"
              value={linkedinUrl}
              onChangeText={v => {
                setLinkedinUrl(v);
                setErrors(e => ({...e, linkedinUrl: ''}));
              }}
              autoCapitalize="none"
              keyboardType="url"
            />
            {errors.linkedinUrl ? <Text style={styles.err}>{errors.linkedinUrl}</Text> : null}
          </View>

          <View style={styles.socialField}>
            <Text style={styles.label}>{'Instagram URL'}</Text>
            <TextInput
              style={styles.input}
              value={instagramUrl}
              onChangeText={setInstagramUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <View style={styles.socialField}>
            <Text style={styles.label}>{'Twitter URL'}</Text>
            <TextInput
              style={styles.input}
              value={twitterUrl}
              onChangeText={setTwitterUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <View style={styles.socialField}>
            <Text style={styles.label}>{'Facebook URL'}</Text>
            <TextInput
              style={styles.input}
              value={facebookUrl}
              onChangeText={setFacebookUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>

        {/* Figma: padding 16, centered, 12px Body S, Terms link underlined */}
        <View style={styles.termsRow}>
          <Text style={styles.termsText}>
            {'By submitting this form, you have agreed to our '}
            <Text style={styles.termsLink} onPress={() => Linking.openURL(TERMS_URL)}>
              {'Terms and Conditions'}
            </Text>
            {'.'}
          </Text>
        </View>

        {/* Figma: dark blue outer frame padding 24 16, submit btn 36px h,
            radius 5, bg #46B0E3, shadow */}
        <View style={styles.submitOuter}>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && {opacity: 0.7}]}
            onPress={handleSubmit}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>{'Submit'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  scroll: {flex: 1},
  content: {paddingBottom: 40},
  formTop: {paddingHorizontal: 20, paddingTop: 20},

  // Figma: Heading/H2 — 18px 700, #192647, letterSpacing 0.09
  title: {
    alignSelf: 'stretch',
    color: '#192647',
    fontFamily: 'Runda',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: 0.09,
    marginBottom: 24,
  },
  // Confirmed bold per feedback ("the textbox heading are bold")
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#192546',
    marginBottom: 6,
    marginTop: 12,
    fontFamily: 'Runda',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#192546',
    marginBottom: 4,
    backgroundColor: '#FAFAFA',
    fontFamily: 'Runda',
  },
  inputErr: {borderColor: '#EF4444'},
  err: {fontSize: 12, color: '#EF4444', marginTop: 4, fontFamily: 'Runda'},
  hint: {fontSize: 11, color: '#8F9098', marginTop: 6, fontFamily: 'Runda'},

  // Figma: dashed file picker — height 48, padding 12 16, radius 5,
  // border 1px dashed #C5C6CC. Used for both Upload Your Work and
  // Profile Picture. Using minHeight instead of height — height +
  // paddingVertical together on the same element is a documented
  // anti-pattern in this project (caused the search bar text to not
  // render earlier in this session).
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C5C6CC',
    backgroundColor: '#FFFFFF',
  },
  filePickerText: {flex: 1, fontSize: 14, color: '#8F9098', fontFamily: 'Runda', marginRight: 8},
  // Circle sized to actually contain the 11x12 icon with even padding
  uploadIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E8E9F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Figma: height 90, padding 12 16.749 60 16.749, radius 5,
  // border 1px #C5C6CC, bg #E8E9F1. Using minHeight — the 72px combined
  // top+bottom padding here leaves only ~18px for actual text content
  // with a fixed height:90, which is the same shape of bug that made
  // the search bar text invisible earlier. minHeight keeps the same
  // starting size but lets the box grow if the content needs more room.
  textArea: {
    minHeight: 90,
    paddingTop: 12,
    paddingHorizontal: 16.749,
    paddingBottom: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#C5C6CC',
    backgroundColor: '#E8E9F1',
    fontSize: 14,
    color: '#192546',
    fontFamily: 'Runda',
  },
  charCount: {fontSize: 11, color: '#8F9098', textAlign: 'right', marginTop: 4, fontFamily: 'Runda'},

  // Figma: padding 0 16, column, gap 16 (LinkedIn -> Facebook block)
  socialFrame: {
    paddingHorizontal: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    marginTop: 8,
  },
  socialField: {alignSelf: 'stretch', marginBottom: 16},

  // Figma: padding 16, centered, Body S — 12px 400 #192546 lineHeight 16
  termsRow: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  termsText: {
    color: '#192546',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    textAlign: 'center',
  },
  // Figma: Action/Action M — 12px 500 #0C4D91, underlined
  termsLink: {
    color: '#0C4D91',
    fontFamily: 'Runda',
    fontSize: 12,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  // Figma: outer dark blue frame, padding 24 16, bg #094F95
  submitOuter: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#094F95',
  },
  // Figma: height 36, padding 12 16, radius 5, bg #46B0E3, shadow.
  // minHeight instead of height — same anti-pattern fix as filePicker.
  submitBtn: {
    flexDirection: 'row',
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 5,
    backgroundColor: '#46B0E3',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submitBtnText: {color: '#FFF', fontSize: 14, fontWeight: '700', fontFamily: 'Runda'},
});

export default ArticleSubmissionScreen;
