/* eslint-disable prettier/prettier */
/**
 * editShared.tsx — Shared components for all Edit Profile screens
 * Figma-exact typography, colors, and layout
 *
 * CHANGELOG (this pass):
 * - Field/Dropdown container: padding 16, radius ~8, border #E8E9F1 per
 *   Marium's "profile setting" card spec.
 * - Multiline textarea ("About Me" / "Description"): height 90, grey bg
 *   #E8E9F1, border #C5C6CC, radius 5 per "about us"/"description" spec.
 *   NOTE: the literal Figma padding (12px 15.251px 62px 15.251px) leaves
 *   very little room for actual typed text inside a fixed 90px box — that
 *   much bottom padding reads like it's sized for the empty/placeholder
 *   state only. Used top-aligned text with generous but workable padding
 *   instead of the literal 62px bottom value so typed content stays
 *   readable; flag if this needs to match the literal spec exactly.
 * - Dropdown/SearchableDropdown: chevron hides once a value is selected;
 *   accepts a `placeholder` (so Month/Year show "Month"/"Year" instead of
 *   "Please Select").
 * - SearchableDropdown now navigates to a full-page OptionPicker screen
 *   instead of showing an in-place Modal (Country + Specialities both use
 *   this) — requires a `navigation` prop from here on.
 * - ImageUpload: `placeholder` is now optional. No local asset is required
 *   — with no imageUri and no placeholder passed, a plain empty circle
 *   renders instead (avoids requiring image assets that may not exist,
 *   and matches "leave the image blank, it's from the backend").
 *   Change/Delete Picture buttons restyled: height 38, flex:1 each, radius 5.
 * - SaveBtn: height 40, pill (radius 100), bg #0C4D91.
 * - AddMoreBtn: swapped in the exact plus-in-circle SVG, text color #084D92.
 * - Fonts: Runda-Medium is confirmed to exist (full family: Black, Bold,
 *   Light, Medium, Normal + italics) and is now used for every weight:500
 *   ("Action"/"Heading H5") spec Marium gave — field labels, image-upload
 *   labels, "+Add more", the Add Speciality pill, and OptionPicker list
 *   rows. Runda-Bold stays for actual bold/700 emphasis (CTA button text,
 *   page titles); Runda-Normal for weight:400 body text. Make sure
 *   Runda-Medium is linked in react-native.config.js the same way
 *   Runda-Bold/Runda-Normal already are.
 * - BackBtn now delegates to the single shared BackButton component
 *   (components/BackButton.tsx) instead of drawing its own chevron, so
 *   every Edit* screen/OptionPicker that imports BackBtn from here picks
 *   up the canonical Figma-exact icon automatically.
 */
import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator, ScrollView,
} from 'react-native';
import Svg, {Path, Circle} from 'react-native-svg';
import {launchImageLibrary} from 'react-native-image-picker';
import {apiRequest} from '../api/apiClient';
import BackButton from './BackButton';

// ─── Country flags (must be before components) ───────────────────────────────
export const COUNTRY_FLAGS: Record<string, string> = {
  'Afghanistan':'🇦🇫','Albania':'🇦🇱','Algeria':'🇩🇿','Argentina':'🇦🇷',
  'Australia':'🇦🇺','Austria':'🇦🇹','Bangladesh':'🇧🇩','Belgium':'🇧🇪',
  'Brazil':'🇧🇷','Canada':'🇨🇦','Chile':'🇨🇱','China':'🇨🇳',
  'Colombia':'🇨🇴','Croatia':'🇭🇷','Czech Republic':'🇨🇿','Denmark':'🇩🇰',
  'Dominican Republic':'🇩🇴','Egypt':'🇪🇬','Ethiopia':'🇪🇹','Finland':'🇫🇮',
  'France':'🇫🇷','Germany':'🇩🇪','Ghana':'🇬🇭','Greece':'🇬🇷',
  'Hungary':'🇭🇺','India':'🇮🇳','Indonesia':'🇮🇩','Iran':'🇮🇷',
  'Iraq':'🇮🇶','Ireland':'🇮🇪','Israel':'🇮🇱','Italy':'🇮🇹',
  'Japan':'🇯🇵','Jordan':'🇯🇴','Kenya':'🇰🇪','Malaysia':'🇲🇾',
  'Mexico':'🇲🇽','Morocco':'🇲🇦','Netherlands':'🇳🇱','New Zealand':'🇳🇿',
  'Nigeria':'🇳🇬','Norway':'🇳🇴','Pakistan':'🇵🇰','Peru':'🇵🇪',
  'Philippines':'🇵🇭','Poland':'🇵🇱','Portugal':'🇵🇹','Romania':'🇷🇴',
  'Russia':'🇷🇺','Saudi Arabia':'🇸🇦','South Africa':'🇿🇦','South Korea':'🇰🇷',
  'Spain':'🇪🇸','Sri Lanka':'🇱🇰','Sudan':'🇸🇩','Sweden':'🇸🇪',
  'Switzerland':'🇨🇭','Thailand':'🇹🇭','Turkey':'🇹🇷','UAE':'🇦🇪',
  'Uganda':'🇺🇬','UK':'🇬🇧','Ukraine':'🇺🇦','USA':'🇺🇸',
  'Venezuela':'🇻🇪','Vietnam':'🇻🇳','Zimbabwe':'🇿🇼',
};
export const COUNTRIES = Object.keys(COUNTRY_FLAGS).sort();

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  navy:    '#192546',
  blue:    '#46B0E3',
  blueDark:'#0C4D91',
  linkBlue:'#084D92',
  red:     '#ED3241',
  border:  '#E8E9F1',
  descBorder: '#C5C6CC',
  descBg:  '#E8E9F1',
  bg:      '#F5F6FA',
  hint:    '#AAAAAA',
  sub:     '#8F9098',
  white:   '#FFFFFF',
  searchBg:'#F8F9FE',
};

// ─── Back button ──────────────────────────────────────────────────────────────
// Delegates to the single shared BackButton component so this screen family
// stays visually consistent with every other back control in the app.
export const BackBtn = ({onPress}: {onPress: () => void}) => (
  <BackButton onPress={onPress} style={sh.backBtn} />
);

// ─── Page header — H2 + description ──────────────────────────────────────────
export const PageHeader = ({title, subtitle}: {title: string; subtitle: string}) => (
  <View style={sh.pageHeader}>
    <Text style={sh.pageTitle}>{title}</Text>
    <Text style={sh.pageSub}>{subtitle}</Text>
  </View>
);

// ─── Field label ──────────────────────────────────────────────────────────────
const FieldLabel = ({label, required, info}: {label: string; required?: boolean; info?: boolean}) => (
  <Text style={sh.fieldLabel}>
    {label}
    {required ? <Text style={sh.required}>{'*'}</Text> : null}
    {info     ? <Text style={sh.info}>{'  ⓘ'}</Text>   : null}
  </Text>
);

// ─── Text field ───────────────────────────────────────────────────────────────
export const Field = ({
  label, value, onChangeText, placeholder, required,
  multiline, info, keyboardType,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; required?: boolean; multiline?: boolean;
  info?: boolean; keyboardType?: any;
}) => (
  <View style={sh.fieldWrap}>
    {label ? <FieldLabel label={label} required={required} info={info} /> : null}
    <TextInput
      style={[sh.input, multiline && sh.inputMulti]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || ''}
      placeholderTextColor={C.hint}
      multiline={multiline}
      keyboardType={keyboardType}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  </View>
);

// ─── Chevron (only shown when nothing selected yet) ───────────────────────────
const Chevron = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke="#888" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Dropdown (Month/Year, Employment Type, Location Type, etc.) ─────────────
// Still a local inline picker (short static option lists) — only the
// Country/Specialities searchable pickers moved to a full page.
export const Dropdown = ({
  label, value, options, onSelect, required, placeholder,
}: {
  label: string; value: string; options: string[];
  onSelect: (v: string) => void; required?: boolean; placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={sh.fieldWrap}>
      {label ? <FieldLabel label={label} required={required} /> : null}
      <TouchableOpacity style={sh.dropdown} onPress={() => setOpen(o => !o)}>
        <Text style={[sh.dropdownText, !value && {color: C.hint}]}>
          {value || placeholder || 'Please Select'}
        </Text>
        {!value && <Chevron />}
      </TouchableOpacity>
      {open && (
        // CONFIRMED bug fix: this used to be a plain View with
        // maxHeight:220 + overflow:'hidden' on inlineOptionBox — that
        // clips anything past 220px, but a plain View has nothing to
        // scroll, so everything past ~5 rows (220 / 41px row height) was
        // simply unreachable (e.g. Month stopped at May, Year showed only
        // the first few years). Now a real ScrollView, so the full
        // MONTHS/YEARS/etc. list is reachable while keeping the same
        // visible height. nestedScrollEnabled matters here since this
        // list sits inside the screen's own outer ScrollView.
        <View style={sh.inlineOptionBox}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
            {options.map(opt => (
              <TouchableOpacity
                key={opt}
                style={sh.inlineOptionRow}
                onPress={() => { onSelect(opt); setOpen(false); }}>
                <Text style={[sh.inlineOptionText, opt === value && {color: C.blueDark, fontFamily: 'Runda-Bold'}]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

// ─── Searchable dropdown (Country / Specialities) ─────────────────────────────
// Opens a full-page OptionPicker screen instead of an in-place modal.
// `navigation` is now required — every call site needs to pass it through.
export const SearchableDropdown = ({
  label, value, options, onSelect, placeholder, required, showFlags, navigation, pickerTitle,
}: {
  label: string; value: string; options: string[];
  onSelect: (v: string) => void; placeholder?: string;
  required?: boolean; showFlags?: boolean; navigation: any; pickerTitle?: string;
}) => {
  const openPicker = () => {
    navigation?.navigate('OptionPicker', {
      title: pickerTitle || label,
      options,
      selected: value,
      showFlags: !!showFlags,
      onSelect,
    });
  };

  return (
    <View style={sh.fieldWrap}>
      {label ? <FieldLabel label={label} required={required} /> : null}
      <TouchableOpacity style={sh.dropdown} onPress={openPicker}>
        <View style={{flexDirection:'row', alignItems:'center', gap:8, flex:1}}>
          {showFlags && value && COUNTRY_FLAGS[value]
            ? <Text style={{fontSize:18}}>{COUNTRY_FLAGS[value]}</Text>
            : null
          }
          <Text style={[sh.dropdownText, !value && {color: C.hint}, {flex:1}]}>
            {value || placeholder || 'Please Select'}
          </Text>
        </View>
        {/* Arrow disappears once a value is selected */}
        {!value && <Chevron />}
      </TouchableOpacity>
    </View>
  );
};

// ─── Date row (Month + Year) ──────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const YEARS  = Array.from({length: 50}, (_, i) => String(new Date().getFullYear() - i));

export const DateRow = ({
  label, month, year, onMonth, onYear, required,
}: {
  label: string; month: string; year: string;
  onMonth: (m: string) => void; onYear: (y: string) => void; required?: boolean;
}) => (
  <View style={sh.fieldWrap}>
    {label ? <FieldLabel label={label} required={required} /> : null}
    <View style={{flexDirection:'row', gap:12}}>
      <View style={{flex:1}}>
        <Dropdown label="" value={month} options={MONTHS} onSelect={onMonth} placeholder="Month" />
      </View>
      <View style={{flex:1}}>
        <Dropdown label="" value={year} options={YEARS} onSelect={onYear} placeholder="Year" />
      </View>
    </View>
  </View>
);

// ─── Checkbox ─────────────────────────────────────────────────────────────────
export const Checkbox = ({label, value, onToggle}: {
  label: string; value: boolean; onToggle: () => void;
}) => (
  <TouchableOpacity style={sh.checkRow} onPress={onToggle} activeOpacity={0.7}>
    <View style={[sh.checkBox, value && sh.checkBoxActive]}>
      {value && (
        <Svg width={10} height={10} viewBox="0 0 12 12" fill="none">
          <Path d="M2 6l3 3 5-5" stroke="#FFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )}
    </View>
    <Text style={sh.checkLabel}>{label}</Text>
  </TouchableOpacity>
);

// ─── Image upload ─────────────────────────────────────────────────────────────
// `placeholder` is optional now — pass nothing to get a plain blank circle
// (e.g. Credential, where the image is backend-driven, not a local asset).
export const ImageUpload = ({
  label, imageUri, placeholder, onChangePicture, onDeletePicture,
}: {
  label: string; imageUri?: string; placeholder?: any;
  onChangePicture: () => void; onDeletePicture: () => void;
}) => (
  <View style={sh.imgSection}>
    <Text style={sh.imgLabel}>{label}</Text>
    <View style={sh.imgCircle}>
      {imageUri
        ? <Image source={{uri: imageUri}} style={sh.imgPreview} />
        : placeholder
        ? <Image source={placeholder} style={sh.imgPreview} resizeMode="cover" />
        : null /* blank circle — no local asset required */
      }
    </View>
    <View style={sh.imgBtns}>
      <TouchableOpacity style={sh.changeBtn} onPress={onChangePicture}>
        <Text style={sh.changeBtnText}>{'Change Picture'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={sh.deleteBtn} onPress={onDeletePicture}>
        <Text style={sh.deleteBtnText}>{'Delete Picture'}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Save button ──────────────────────────────────────────────────────────────
export const SaveBtn = ({onPress, loading}: {onPress: () => void; loading?: boolean}) => (
  <TouchableOpacity style={sh.saveBtn} onPress={onPress} disabled={loading}>
    {loading
      ? <ActivityIndicator color="#FFF" />
      : <Text style={sh.saveBtnText}>{'Save Changes'}</Text>
    }
  </TouchableOpacity>
);

// ─── Add more button ──────────────────────────────────────────────────────────
const PlusCircleIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Circle cx={7.5} cy={7.5} r={7.24138} stroke="#084D92" strokeWidth={0.517241} />
    <Path d="M4.1377 6.78965H6.77436V4.1377H8.23778V6.78965H10.8618V8.22245H8.23778V10.8618H6.77436V8.22245H4.1377V6.78965Z" fill="#084D92" />
  </Svg>
);

export const AddMoreBtn = ({onPress}: {onPress: () => void}) => (
  <TouchableOpacity style={sh.addMoreBtn} onPress={onPress} activeOpacity={0.7}>
    <PlusCircleIcon />
    <Text style={sh.addMoreText}>{'Add more'}</Text>
  </TouchableOpacity>
);

// ─── Add Speciality pill button ────────────────────────────────────────────
// Used by EditProject.tsx (and anywhere else that needs to attach
// specialities to a sub-entry) — opens the full-page OptionPicker rather
// than the old inline free-text input.
export const AddSpecialityBtn = ({onPress, label}: {onPress: () => void; label?: string}) => (
  <TouchableOpacity style={sh.addSpecialityBtn} onPress={onPress} activeOpacity={0.7}>
    <Text style={sh.addSpecialityBtnText}>{label || 'Add Speciality'}</Text>
    <Text style={sh.addSpecialityPlus}>{'+'}</Text>
  </TouchableOpacity>
);

// ─── Divider ──────────────────────────────────────────────────────────────────
export const Divider = () => <View style={sh.divider} />;

// ─── Search bar (used by the full-page OptionPicker) ──────────────────────────
export const SearchBar = ({value, onChangeText, placeholder}: {
  value: string; onChangeText: (t: string) => void; placeholder?: string;
}) => (
  <View style={sh.searchBarWrap}>
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
        stroke="#8F9098" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
    <TextInput
      style={sh.searchBarInput}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || 'Search'}
      placeholderTextColor={C.hint}
      autoFocus
    />
  </View>
);

// ─── Close (X) icon for selected tags — Marium's exact SVG, in a filled circle
export const TagCloseIcon = () => (
  <View style={sh.tagCloseCircle}>
    <Svg width={9} height={9} viewBox="0 0 9 9" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M0.661005 0.661494C0.860705 0.461794 1.18448 0.461794 1.38418 0.661494L7.52055 6.79786C7.72025 6.99756 7.72025 7.32134 7.52055 7.52104C7.32085 7.72074 6.99707 7.72074 6.79737 7.52104L0.661005 1.38467C0.461305 1.18497 0.461305 0.861194 0.661005 0.661494Z" fill="#FFF"/>
      <Path fillRule="evenodd" clipRule="evenodd" d="M7.52055 0.661494C7.32085 0.461794 6.99707 0.461794 6.79737 0.661494L0.661006 6.79786C0.461306 6.99756 0.461306 7.32134 0.661006 7.52104C0.860706 7.72074 1.18448 7.72074 1.38418 7.52104L7.52055 1.38467C7.72025 1.18497 7.72025 0.861194 7.52055 0.661494Z" fill="#FFF"/>
    </Svg>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
export const sh = StyleSheet.create({
  backBtn: {
    width:32, height:32, borderRadius:8,
    borderWidth:1, borderColor:C.border,
    alignItems:'center', justifyContent:'center', marginBottom:20,
  },

  pageHeader: {marginBottom:20},
  pageTitle: {
    fontSize:18, fontFamily:'Runda-Bold', color:C.navy,
    marginBottom:6, letterSpacing:0.09,
  },
  pageSub: {
    fontSize:14, fontFamily:'Runda-Normal', color:C.sub,
    lineHeight:18,
  },

  fieldWrap:  {marginBottom:16},
  fieldLabel: {
    fontSize:12, fontFamily:'Runda-Medium', color:C.navy,
    marginBottom:8, alignSelf:'flex-start',
  },
  required:   {color:'#ED3241'},
  info:       {color:C.blueDark, fontSize:14},

  // Input — "profile setting" card spec: padding 16, radius ~8, border #E8E9F1
  input: {
    borderWidth:1, borderColor:C.border, borderRadius:8,
    paddingHorizontal:16, paddingVertical:16,
    fontSize:14, color:C.navy, fontFamily:'Runda-Normal',
    backgroundColor:C.white,
  },
  // Description / About Me textarea — "about us" spec (see file header note)
  inputMulti: {
    height:90,
    paddingHorizontal:15,
    paddingTop:12,
    paddingBottom:12,
    borderColor: C.descBorder,
    backgroundColor: C.descBg,
    borderRadius:5,
  },

  dropdown: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    borderWidth:1, borderColor:C.border, borderRadius:8,
    paddingHorizontal:16, paddingVertical:16,
    backgroundColor:C.white,
  },
  dropdownText: {fontSize:14, fontFamily:'Runda-Normal', color:C.navy, flex:1, lineHeight:18},

  inlineOptionBox: {
    borderWidth:1, borderColor:C.border, borderRadius:5,
    backgroundColor:C.white, marginTop:6, maxHeight:220, overflow:'hidden',
  },
  inlineOptionRow: {
    height:41, paddingHorizontal:20, justifyContent:'center',
    borderBottomWidth:1, borderBottomColor:'#F5F6FA',
  },
  inlineOptionText: {
    color:C.navy, fontFamily:'Runda-Normal', fontSize:14,
  },

  checkRow:       {flexDirection:'row', alignItems:'center', gap:10, marginBottom:16},
  checkBox:       {width:18, height:18, borderRadius:4, borderWidth:1.5, borderColor:C.border, alignItems:'center', justifyContent:'center'},
  checkBoxActive: {backgroundColor:C.navy, borderColor:C.navy},
  checkLabel:     {fontSize:14, fontFamily:'Runda-Normal', color:C.navy},

  imgSection:     {marginBottom:20},
  imgLabel: {
    fontSize:12, fontFamily:'Runda-Medium', color:C.navy,
    marginBottom:10, alignSelf:'flex-start',
  },
  imgCircle: {
    width:100, height:100, borderRadius:125,
    backgroundColor:'#D9D9D9', alignItems:'center', justifyContent:'center',
    marginBottom:14, overflow:'hidden', alignSelf:'center',
    aspectRatio:1,
  },
  imgPreview:     {width:100, height:100, borderRadius:125},
  imgBtns:        {flexDirection:'row', gap:12},
  changeBtn: {
    height:38, borderRadius:5, backgroundColor:C.blueDark,
    paddingHorizontal:16, paddingVertical:12,
    flex:1, alignItems:'center', justifyContent:'center',
  },
  changeBtnText: {color:C.white, fontSize:13, fontFamily:'Runda-Bold'},
  deleteBtn: {
    height:38, borderRadius:5, backgroundColor:C.red,
    paddingHorizontal:16, paddingVertical:12,
    flex:1, alignItems:'center', justifyContent:'center',
  },
  deleteBtnText: {color:C.white, fontSize:13, fontFamily:'Runda-Bold'},

  saveBtn: {
    borderRadius:100, backgroundColor:C.blueDark,
    paddingHorizontal:16, paddingVertical:12,
    alignItems:'center', justifyContent:'center',
    marginTop:8, marginBottom:16,
  },
  saveBtnText: {color:C.white, fontSize:15, fontFamily:'Runda-Bold', letterSpacing:0.3},

  addMoreBtn:  {flexDirection:'row', alignItems:'center', gap:6, marginBottom:20, paddingVertical:4},
  addMoreText: {fontSize:12, color:C.linkBlue, fontFamily:'Runda-Medium'},

  // Add Speciality pill — height 38, radius 100, border navy, text navy
  addSpecialityBtn: {
    flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8,
    height:38, paddingHorizontal:16, paddingVertical:12,
    borderRadius:100, borderWidth:1, borderColor:C.navy,
    alignSelf:'stretch',
  },
  addSpecialityBtnText: {color:C.navy, fontSize:12, fontFamily:'Runda-Medium'},
  addSpecialityPlus:    {color:C.navy, fontSize:16, fontFamily:'Runda-Medium'},

  divider: {height:1, backgroundColor:'#F0F0F0', marginVertical:20},

  searchBarWrap: {
    flexDirection:'row', alignItems:'center', gap:14,
    paddingHorizontal:20, paddingVertical:12,
    borderRadius:5, backgroundColor:C.searchBg,
    marginBottom:16,
  },
  searchBarInput: {flex:1, fontSize:14, fontFamily:'Runda-Normal', color:C.navy},

  optionRow: {
    height:41, paddingHorizontal:20, justifyContent:'center',
    borderRadius:5, backgroundColor:C.white,
  },
  optionRowText: {
    color:C.navy, fontFamily:'Runda-Medium', fontSize:14,
  },
  optionSectionLabel: {
    fontSize:13, color:C.sub, fontFamily:'Runda-Normal', marginBottom:8, marginTop:4,
  },

  tagCloseCircle: {
    width:15, height:15, borderRadius:34.091,
    backgroundColor:C.blueDark, alignItems:'center', justifyContent:'center',
  },
});

// ─── Constants ────────────────────────────────────────────────────────────────
export const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';

// ─── Confirmed-working xProfile read/write ────────────────────────────────────
// `GET/PATCH .../xprofile/data/{user_id}` — used by every Edit screen until
// now — is NOT a real route on this server (confirmed 404 via Postman,
// twice). The header on MemberProfileScreen never had this problem because
// it sources xprofile data differently (GET /members/{id}?xprofile=1,
// same pattern dmApi.ts's getFullName already uses correctly). Writes need
// the field-id-first per-field route profileApi.ts's updateField already
// uses correctly: POST /xprofile/{field_id}/data/{user_id} with {value} —
// there's no bulk multi-field update endpoint on this server.
//
// Every Edit screen should use these two instead of hitting BASE directly.

export const loadXProfileGroups = async (userId: number): Promise<any> => {
  const data = await apiRequest(`${BASE}/buddyboss/v1/members/${userId}?xprofile=1`);
  return data?.xprofile?.groups || {};
};

export const saveXProfileFields = async (
  userId: number,
  fields: {field_id: number; value: string}[],
): Promise<void> => {
  const results = await Promise.allSettled(
    fields.map(f =>
      apiRequest(`${BASE}/buddyboss/v1/xprofile/${f.field_id}/data/${userId}`, 'POST', {value: f.value}),
    ),
  );
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    console.log(`[saveXProfileFields] ${failed.length}/${fields.length} field(s) failed to save`, failed);
    throw new Error(`${failed.length} of ${fields.length} fields failed to save`);
  }
};

// ─── Robby's new dedicated edit-profile endpoints ─────────────────────────────
// Replaces the fragile per-field-ID xProfile save approach entirely for
// these six sections. Each takes user_id + the relevant payload directly —
// no more guessing which of the duplicate repeater slots is "live", and
// (per Robby) these are the same endpoints powering web's own save, which
// is what should fix the app-save-doesn't-reflect-anywhere issue we saw
// with Specialities.
export const saveEditProfileBasic = (userId: number, data: {
  first_name?: string; last_name?: string; headline?: string; company?: string;
  linkedin?: string; country?: string; about?: string;
}) => apiRequest(`${BASE}/custom/v1/edit-profile`, 'POST', {user_id: userId, ...data});

export const saveEditProfileExperience = (userId: number, entries: any[]) =>
  apiRequest(`${BASE}/custom/v1/edit-profile/experience`, 'POST', {user_id: userId, entries});

export const saveEditProfileEducation = (userId: number, entries: any[]) =>
  apiRequest(`${BASE}/custom/v1/edit-profile/education`, 'POST', {user_id: userId, entries});

export const saveEditProfileProjects = (userId: number, entries: any[]) =>
  apiRequest(`${BASE}/custom/v1/edit-profile/projects`, 'POST', {user_id: userId, entries});

export const saveEditProfileCredentials = (userId: number, entries: any[]) =>
  apiRequest(`${BASE}/custom/v1/edit-profile/credentials`, 'POST', {user_id: userId, entries});

export const saveEditProfileSpecialities = (userId: number, specialities: string[]) =>
  apiRequest(`${BASE}/custom/v1/edit-profile/specialities`, 'POST', {user_id: userId, specialities});

// ─── Shared image picker for Change Picture buttons ──────────────────────────
// Opens the device gallery and hands back the local URI (for preview) plus
// base64 + filename (for the actual upload — Robby's edit-profile
// endpoints take logo_base64/image_base64 + a filename directly in the
// JSON body, so no separate multipart upload route is needed after all).
export const pickImage = (onPicked: (result: {uri: string; base64: string; filename: string}) => void) => {
  launchImageLibrary({mediaType: 'photo', quality: 0.8, includeBase64: true}, (res) => {
    if (res.didCancel || res.errorCode) return;
    const asset = res.assets?.[0];
    if (asset?.uri && asset?.base64) {
      const ext = (asset.fileName || asset.uri).split('.').pop()?.toLowerCase() || 'jpg';
      const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
      onPicked({
        uri: asset.uri,
        base64: `data:${mime};base64,${asset.base64}`,
        filename: asset.fileName || `photo.${ext}`,
      });
    }
  });
};

// All available specialities for the searchable dropdown
export const ALL_SPECIALITIES = [
  'Artificial Intelligence','Asana','Automation','Benefits Realisation',
  'Budget Management','Business Case Development','Business Strategy',
  'Change Management','ClickUp','Coaching','Communication','Conflict Resolution',
  'Cost Control','Data Analysis','Digital Transformation','Earned Value Management',
  'Figma','Governance','Jira','Leadership','Microsoft Project','Negotiation',
  'Procurement','Program Management','Project Management','Quality Management',
  'Resource Management','Risk Management','Scrum','SEO','Six Sigma',
  'Stakeholder Management','Strategic Planning','UI/UX','Vendor Management',
  'Waterfall','Agile','PRINCE2','PMP','PMO','PMI','Lean','Kanban',
];

// Confirmed real options from the backend field definitions (group 3,
// fields 42 "Employment Type" / 51 "Location") — casing matches exactly
// since these need to round-trip as the saved value.
export const EMPLOYMENT_TYPES = [
  'Full-Time', 'Part-Time', 'Self-employed', 'Freelance', 'Contract', 'Internship', 'Apprenticeship', 'Seasonal',
];
export const LOCATION_TYPES = ['On-site', 'Hybrid', 'Remote'];
