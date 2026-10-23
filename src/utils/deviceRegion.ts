import {NativeModules, Platform} from 'react-native';

// Reads the country from the phone's Region setting (iOS: Settings > General >
// Language & Region; Android: system locale). No location permission and no
// network request, so no permission prompt and no data sent to a third party.

// "en-PK", "en_PK", "zh-Hans-CN", "en_US@calendar=gregorian" -> "PK" / "CN" / "US".
// A language-only identifier such as "en" has no region and returns null.
const regionFromLocale = (identifier?: string | null): string | null => {
  if (!identifier || typeof identifier !== 'string') return null;
  const tokens = identifier.split('@')[0].split(/[-_]/);
  for (let i = 1; i < tokens.length; i++) {
    if (/^[A-Za-z]{2}$/.test(tokens[i])) return tokens[i].toUpperCase();
  }
  return null;
};

// Returns the 2-letter country code of the device region (e.g. "IE"), or null.
export const getDeviceCountryCode = (): string | null => {
  // 1. JS engine locale (Hermes Intl) - follows the device region setting.
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const code = regionFromLocale(locale);
    if (code) return code;
  } catch {}

  // 2. Native fallbacks if Intl is unavailable or has no region.
  try {
    if (Platform.OS === 'ios') {
      const settings = NativeModules.SettingsManager?.settings;
      const code =
        regionFromLocale(settings?.AppleLocale) ||
        regionFromLocale(settings?.AppleLanguages?.[0]);
      if (code) return code;
    } else if (Platform.OS === 'android') {
      const code = regionFromLocale(NativeModules.I18nManager?.localeIdentifier);
      if (code) return code;
    }
  } catch {}

  return null;
};
