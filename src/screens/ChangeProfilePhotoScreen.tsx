/* eslint-disable prettier/prettier */
/**
 * ChangeProfilePhotoScreen — opened from the camera button on the member's
 * own profile avatar (MemberProfileScreen).
 *
 * Two modes, switched by the Upload / Delete buttons:
 *   - Upload: pick from the gallery (tap the dashed box) or take a photo
 *     (Open Camera), preview it, then Save Photo.
 *   - Delete: explanatory copy + red "Delete My Profile Photo" button.
 *
 * Images are resized by the picker to at most 200x200 (per design: "Image
 * dimensions must not exceed 200x200 pixels"). On success the screen goes back
 * to MemberProfile and hands it the new avatar via the `avatarUpdate` param
 * ({uri: string, ts: number}; uri '' = photo removed).
 *
 * Spec values below come from the Figma/CSS handoff. Where the handoff gave no
 * value (info banner text, Upload/Delete button label) the matching Runda
 * styles from the neighbouring components are used — marked with "UNSPEC".
 */
import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Linking,
  StatusBar,
} from 'react-native';
import Svg, {Path, Circle} from 'react-native-svg';
import {launchCamera, launchImageLibrary, ImagePickerResponse} from 'react-native-image-picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import AppHeader, {invalidateHeaderAvatar} from '../components/AppHeader';
import BackButton from '../components/BackButton';
import ProfileDrawer from '../components/ProfileDrawer';
import {uploadAvatar, deleteAvatar} from '../api/profileApi';

const MAX_DIMENSION = 200; // px — design: must not exceed 200x200

const NAVY = '#192546';
const DARK_BLUE = '#0C4D91';
const LIGHT_BLUE = '#46B0E3';
const GREY = '#8F9098';
const BORDER_GREY = '#C5C6CC';
const ERROR_DARK = '#ED3241';

// ─── Icons ────────────────────────────────────────────────────────────────────

// 14x14 white circle with a navy "i" (from the handoff SVG; the mask/clipPath
// only clip to the circle so a plain Circle is equivalent).
const InfoIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Circle cx={6.99992} cy={7.00016} r={6.41667} fill="#FFFFFF" />
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.61935 6.30764C5.61935 5.98548 5.88052 5.72431 6.20268 5.72431H6.99997C7.32214 5.72431 7.58331 5.98548 7.58331 6.30764V9.02409H8.28673C8.6089 9.02409 8.87007 9.28525 8.87007 9.60742C8.87007 9.92959 8.6089 10.1908 8.28673 10.1908H5.71322C5.39105 10.1908 5.12988 9.92959 5.12988 9.60742C5.12988 9.28525 5.39105 9.02409 5.71322 9.02409H6.41664V6.89098H6.20268C5.88052 6.89098 5.61935 6.62981 5.61935 6.30764Z"
      fill={NAVY}
    />
    <Path
      d="M7.719 4.57236C7.719 4.99391 7.37727 5.33565 6.95572 5.33565C6.53417 5.33565 6.19244 4.99391 6.19244 4.57236C6.19244 4.15082 6.53417 3.80908 6.95572 3.80908C7.37727 3.80908 7.719 4.15082 7.719 4.57236Z"
      fill={NAVY}
    />
  </Svg>
);

const CameraIcon = () => (
  <Svg width={20} height={17} viewBox="0 0 20 17" fill="none">
    <Path
      d="M7.27172 3.75663H3.98272C2.86271 3.75663 2.30272 3.75663 1.87471 3.97273C1.49841 4.16281 1.19246 4.4661 1.00071 4.83913C0.782715 5.26341 0.782715 5.81854 0.782715 6.9288V12.4801C0.782715 13.5904 0.782715 14.1455 1.00071 14.5688C1.19271 14.9425 1.49771 15.2458 1.87471 15.4362C2.30172 15.6523 2.86172 15.6523 3.97972 15.6523H15.5857C16.7037 15.6523 17.2627 15.6523 17.6897 15.4362C18.0665 15.246 18.3729 14.9423 18.5647 14.5688C18.7827 14.1455 18.7827 13.5914 18.7827 12.4831V6.92583C18.7827 5.81755 18.7827 5.26242 18.5647 4.83913C18.3727 4.46595 18.0664 4.16264 17.6897 3.97273C17.2627 3.75663 16.7027 3.75663 15.5827 3.75663H12.2927M7.27172 3.75663H7.33472M7.27172 3.75663C7.16572 3.75663 7.10672 3.75663 7.05972 3.75068C6.92087 3.73532 6.78681 3.6913 6.66617 3.62144C6.54554 3.55158 6.44101 3.45744 6.35933 3.34508C6.27765 3.23273 6.22062 3.10465 6.19192 2.96911C6.16322 2.83357 6.16349 2.69357 6.19272 2.55814C6.21552 2.47208 6.24222 2.38707 6.27272 2.30338L6.27372 2.29743C6.32572 2.14477 6.35072 2.06943 6.37972 2.00103C6.52214 1.6629 6.75631 1.3705 7.05623 1.15632C7.35614 0.942129 7.71007 0.814526 8.07872 0.787671C8.15072 0.782715 8.23172 0.782715 8.39272 0.782715H11.1707C11.3327 0.782715 11.4137 0.782715 11.4877 0.787671C11.8562 0.814703 12.2099 0.942388 12.5096 1.15657C12.8093 1.37074 13.0434 1.66304 13.1857 2.00103C13.2147 2.06844 13.2397 2.14477 13.2917 2.29842C13.3377 2.43522 13.3617 2.50362 13.3717 2.55814C13.4009 2.6935 13.4012 2.83342 13.3726 2.9689C13.344 3.10438 13.287 3.23241 13.2054 3.34475C13.1239 3.45709 13.0195 3.55125 12.8989 3.62116C12.7784 3.69108 12.6445 3.7352 12.5057 3.75068C12.4349 3.75641 12.3638 3.7584 12.2927 3.75663M12.2927 3.75663H12.2307H7.33272M9.78272 12.6784C8.98707 12.6784 8.224 12.365 7.66139 11.8073C7.09879 11.2496 6.78272 10.4932 6.78272 9.70445C6.78272 8.91572 7.09879 8.1593 7.66139 7.60158C8.224 7.04386 8.98707 6.73054 9.78272 6.73054C10.5784 6.73054 11.3414 7.04386 11.904 7.60158C12.4666 8.1593 12.7827 8.91572 12.7827 9.70445C12.7827 10.4932 12.4666 11.2496 11.904 11.8073C11.3414 12.365 10.5784 12.6784 9.78272 12.6784Z"
      stroke={GREY}
      strokeWidth={1.56522}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

type Mode = 'upload' | 'delete';

const ChangeProfilePhotoScreen = ({navigation}: any) => {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('upload');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── Picker ──────────────────────────────────────────────────────────────────
  const pickerOptions = {
    mediaType: 'photo' as const,
    quality: 0.8 as const,
    maxWidth: MAX_DIMENSION,
    maxHeight: MAX_DIMENSION,
    saveToPhotos: false,
  };

  const handlePickerResult = (res: ImagePickerResponse) => {
    if (res.didCancel) return;
    if (res.errorCode) {
      // 'camera_unavailable' (simulators), 'permission', etc.
      Alert.alert(
        'Could not get photo',
        res.errorCode === 'camera_unavailable'
          ? 'The camera is not available on this device.'
          : res.errorMessage || 'Something went wrong. Please try again.',
      );
      return;
    }
    const asset = res.assets?.[0];
    if (!asset?.uri) return;
    // Design: PNG or JPG only.
    const type = (asset.type || '').toLowerCase();
    if (type && !/^image\/(png|jpe?g)$/.test(type)) {
      Alert.alert('Unsupported format', 'Please choose a PNG or JPG image.');
      return;
    }
    setPhotoUri(asset.uri);
  };

  const handleChooseFromGallery = () => {
    launchImageLibrary({...pickerOptions, selectionLimit: 1}, handlePickerResult);
  };

  const ensureCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true; // iOS prompts itself (NSCameraUsageDescription)
    try {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (result === PermissionsAndroid.RESULTS.GRANTED) return true;
      Alert.alert('Camera permission needed', 'Allow camera access in Settings to take a profile photo.', [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Open Settings', onPress: () => Linking.openSettings()},
      ]);
      return false;
    } catch {
      return false;
    }
  };

  const handleOpenCamera = async () => {
    if (!(await ensureCameraPermission())) return;
    launchCamera(pickerOptions, handlePickerResult);
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  // Hand the result back to MemberProfile (merge keeps its userId param).
  const finish = (uri: string) => {
    invalidateHeaderAvatar();
    navigation.navigate({
      name: 'MemberProfile',
      params: {avatarUpdate: {uri, ts: Date.now()}},
      merge: true,
    });
  };

  const handleSave = async () => {
    if (!photoUri || busy) return;
    setBusy(true);
    const url = await uploadAvatar(photoUri);
    setBusy(false);
    if (!url) {
      Alert.alert('Upload failed', 'We could not update your profile photo. Please try again.');
      return;
    }
    // Show the picked local file immediately; the server URL can lag behind
    // BuddyBoss's avatar cache.
    finish(photoUri);
  };

  const handleDelete = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await deleteAvatar();
    setBusy(false);
    if (!ok) {
      Alert.alert('Could not delete photo', 'We could not remove your profile photo. Please try again.');
      return;
    }
    finish('');
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <AppHeader navigation={navigation} onDrawerOpen={() => setDrawerOpen(true)} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + 24}]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Back button — shared 28x28 component */}
        <View style={styles.backRow}>
          <BackButton navigation={navigation} />
        </View>

        {/* Heading/H2 — Runda 18 / 700, navy */}
        <Text style={styles.title}>{'Change Profile Photo'}</Text>

        {/* Info banner — navy block with the "i" icon + helper text */}
        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <InfoIcon />
          </View>
          <Text style={styles.infoText}>
            {'Your profile photo will be used on your profile and throughout the site.'}
          </Text>
        </View>

        {/* Upload / Delete switch */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, mode === 'upload' ? styles.tabBtnActive : styles.tabBtnInactive]}
            onPress={() => setMode('upload')}
            activeOpacity={0.85}>
            <Text style={[styles.tabText, mode === 'upload' ? styles.tabTextActive : styles.tabTextInactive]}>
              {'Upload'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, mode === 'delete' ? styles.tabBtnActive : styles.tabBtnInactive]}
            onPress={() => setMode('delete')}
            activeOpacity={0.85}>
            <Text style={[styles.tabText, mode === 'delete' ? styles.tabTextActive : styles.tabTextInactive]}>
              {'Delete'}
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'upload' ? (
          <>
            {/* Dashed upload box — tap to choose from gallery */}
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={handleChooseFromGallery}
              activeOpacity={0.85}
              disabled={busy}>
              {photoUri ? (
                <>
                  <Image source={{uri: photoUri}} style={styles.preview} />
                  <Text style={styles.uploadLink}>{'Tap to Change Photo'}</Text>
                </>
              ) : (
                <>
                  <CameraIcon />
                  <View style={styles.uploadTextGroup}>
                    <Text style={styles.uploadLink}>{'Tap to Upload Photo'}</Text>
                    <Text style={styles.uploadHint}>
                      {'PNG or JPG (Image dimensions must not exceed 200x200 pixels)'}
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>

            {/* Save — only once a photo has been picked */}
            {photoUri ? (
              <TouchableOpacity
                style={[styles.pillBtn, styles.pillFilled, busy && styles.pillDisabled]}
                onPress={handleSave}
                disabled={busy}
                activeOpacity={0.85}>
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.pillText}>{'Save Photo'}</Text>
                )}
              </TouchableOpacity>
            ) : null}

            {/* Open Camera — filled when it's the primary action, outlined once a photo is picked */}
            <TouchableOpacity
              style={[styles.pillBtn, photoUri ? styles.pillOutlined : styles.pillFilled]}
              onPress={handleOpenCamera}
              disabled={busy}
              activeOpacity={0.85}>
              <Text style={[styles.pillText, photoUri && styles.pillTextOutlined]}>{'Open Camera'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Delete mode */}
            <Text style={styles.deleteCopy}>
              {"If you'd like to delete your current profile photo, use the delete profile photo button."}
            </Text>
            <TouchableOpacity
              style={[styles.pillBtn, styles.pillDanger, busy && styles.pillDisabled]}
              onPress={handleDelete}
              disabled={busy}
              activeOpacity={0.85}>
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.pillText}>{'Delete My Profile Photo'}</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <ProfileDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  scroll: {flex: 1},
  // Page layout: padding 0 16, column, centered, gap 16
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    alignItems: 'center',
    gap: 16,
  },
  backRow: {alignSelf: 'stretch', alignItems: 'flex-start'},

  // Heading/H2: Runda 700 18px, letter-spacing 0.09, navy
  title: {
    alignSelf: 'stretch',
    fontFamily: 'Runda-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: NAVY,
    letterSpacing: 0.09,
  },

  // Info banner — block width 30, padding 16 (per spec), icon 14x14
  infoRow: {alignSelf: 'stretch', flexDirection: 'row', alignItems: 'stretch', gap: 12},
  infoBlock: {
    width: 30,
    minHeight: 44,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // UNSPEC: banner text style — Runda 12 / grey, matching other helper text
  infoText: {
    flex: 1,
    alignSelf: 'center',
    fontFamily: 'Runda-Normal',
    fontSize: 12,
    lineHeight: 16,
    color: GREY,
  },

  // Upload / Delete switch — height 40, padding 12/16, radius 5, flex 1
  tabRow: {alignSelf: 'stretch', flexDirection: 'row', gap: 8},
  tabBtn: {
    flex: 1,
    height: 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {backgroundColor: DARK_BLUE, borderWidth: 1, borderColor: DARK_BLUE},
  tabBtnInactive: {backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: DARK_BLUE},
  // UNSPEC: label style — Runda 12 / 500 like the other action buttons
  tabText: {fontFamily: 'Runda-Medium', fontSize: 12, fontWeight: '500'},
  tabTextActive: {color: '#FFFFFF'},
  tabTextInactive: {color: DARK_BLUE},

  // Camera box — height 227.87, padding 32, gap 24, dashed #C5C6CC, radius 5
  uploadBox: {
    alignSelf: 'stretch',
    height: 227.87,
    padding: 32,
    gap: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: BORDER_GREY,
    backgroundColor: '#FFFFFF',
  },
  uploadTextGroup: {alignItems: 'center', gap: 4},
  // Action/Action L: Runda 500 14, light blue, centered
  uploadLink: {
    fontFamily: 'Runda-Medium',
    fontSize: 14,
    fontWeight: '500',
    color: LIGHT_BLUE,
    textAlign: 'center',
  },
  // Body/Body M: Runda 400 14 / 18, #8F9098, centered
  uploadHint: {
    fontFamily: 'Runda-Normal',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    color: GREY,
    textAlign: 'center',
  },
  preview: {width: 100, height: 100, borderRadius: 50, backgroundColor: '#F0F0F0'},

  // Pill buttons — height 40, padding 12/16, radius 50, stretch
  pillBtn: {
    alignSelf: 'stretch',
    height: 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillFilled: {backgroundColor: DARK_BLUE},
  pillOutlined: {backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: DARK_BLUE},
  pillDanger: {backgroundColor: ERROR_DARK},
  pillDisabled: {opacity: 0.6},
  // Action/Action M: Runda 500 12, white
  pillText: {fontFamily: 'Runda-Medium', fontSize: 12, fontWeight: '500', color: '#FFFFFF'},
  pillTextOutlined: {color: DARK_BLUE},

  // Delete copy — Body/Body M, navy
  deleteCopy: {
    alignSelf: 'stretch',
    fontFamily: 'Runda-Normal',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    color: NAVY,
  },
});

export default ChangeProfilePhotoScreen;
