/* eslint-disable prettier/prettier */
export interface Country {
  name: string;
  flag: string;
  code: string;
  dialCode: string;
}

// Static fallback list
const STATIC_COUNTRIES: Country[] = [
  {name: 'Australia', flag: '🇦🇺', code: 'AU', dialCode: '+61'},
  {name: 'Brazil', flag: '🇧🇷', code: 'BR', dialCode: '+55'},
  {name: 'Canada', flag: '🇨🇦', code: 'CA', dialCode: '+1'},
  {name: 'China', flag: '🇨🇳', code: 'CN', dialCode: '+86'},
  {name: 'Egypt', flag: '🇪🇬', code: 'EG', dialCode: '+20'},
  {name: 'France', flag: '🇫🇷', code: 'FR', dialCode: '+33'},
  {name: 'Germany', flag: '🇩🇪', code: 'DE', dialCode: '+49'},
  {name: 'India', flag: '🇮🇳', code: 'IN', dialCode: '+91'},
  {name: 'Indonesia', flag: '🇮🇩', code: 'ID', dialCode: '+62'},
  {name: 'Ireland', flag: '🇮🇪', code: 'IE', dialCode: '+353'},
  {name: 'Japan', flag: '🇯🇵', code: 'JP', dialCode: '+81'},
  {name: 'Kenya', flag: '🇰🇪', code: 'KE', dialCode: '+254'},
  {name: 'Mexico', flag: '🇲🇽', code: 'MX', dialCode: '+52'},
  {name: 'Nigeria', flag: '🇳🇬', code: 'NG', dialCode: '+234'},
  {name: 'Pakistan', flag: '🇵🇰', code: 'PK', dialCode: '+92'},
  {name: 'Philippines', flag: '🇵🇭', code: 'PH', dialCode: '+63'},
  {name: 'Qatar', flag: '🇶🇦', code: 'QA', dialCode: '+974'},
  {name: 'Saudi Arabia', flag: '🇸🇦', code: 'SA', dialCode: '+966'},
  {name: 'South Africa', flag: '🇿🇦', code: 'ZA', dialCode: '+27'},
  {name: 'Spain', flag: '🇪🇸', code: 'ES', dialCode: '+34'},
  {name: 'Turkey', flag: '🇹🇷', code: 'TR', dialCode: '+90'},
  {name: 'UAE', flag: '🇦🇪', code: 'AE', dialCode: '+971'},
  {name: 'United Kingdom', flag: '🇬🇧', code: 'GB', dialCode: '+44'},
  {name: 'United States', flag: '🇺🇸', code: 'US', dialCode: '+1'},
];

export const fetchCountries = async (): Promise<Country[]> => {
  try {
    const response = await fetch(
      'https://restcountries.com/v3.1/all?fields=name,flags,cca2,idd',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error('API failed');
    }

    const data = await response.json();

    const countries: Country[] = data
      .map((country: any) => {
        // Get dial code
        const root = country.idd?.root || '';
        const suffix =
          country.idd?.suffixes?.length === 1 ? country.idd.suffixes[0] : '';
        const dialCode = root + suffix;

        // Convert country code to flag emoji
        const code = country.cca2;
        const flag = code
          .toUpperCase()
          .replace(/./g, (char: string) =>
            String.fromCodePoint(127397 + char.charCodeAt(0)),
          );

        return {
          name: country.name.common,
          flag: flag,
          code: code,
          dialCode: dialCode || '+0',
        };
      })
      .filter((c: Country) => c.name && c.code)
      .sort((a: Country, b: Country) => a.name.localeCompare(b.name));

    return countries;
  } catch (error) {
    console.log('Using static countries list:', error);
    return STATIC_COUNTRIES;
  }
};
