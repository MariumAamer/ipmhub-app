module.exports = {
  project: {
    android: {
      packageName: 'com.ipmmobileapp',
    },
  },
  // Font path updated to point at the actual location of the Runda font
  // files. Previously pointed at ./src/assets/fonts/ which didn't exist,
  // so the React Native asset linker never processed these fonts on either
  // platform. Android worked only because the .ttf files were manually
  // placed in android/app/src/main/assets/fonts/ directly. iOS never had
  // them at all — confirmed by UIAppFonts being absent from Info.plist and
  // Get-ChildItem finding zero .ttf/.otf files under ios/. The fonts have
  // now been copied to ios/IPMMobileApp/ and UIAppFonts added to
  // Info.plist; this path change ensures future `npx react-native-asset`
  // runs (or any tooling that reads this config) also picks them up.
  assets: ['./android/app/src/main/assets/fonts/'],
};
