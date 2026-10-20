/* eslint-disable prettier/prettier */
export interface Country {
  name: string;
  flag: string;
  code: string;
  dialCode: string;
}

const flagFromCode = (code: string): string =>
  code
    .toUpperCase()
    .replace(/./g, (char: string) =>
      String.fromCodePoint(127397 + char.charCodeAt(0)),
    );

// Static fallback list — full list (matches the server's welcome-intro
// countries), used whenever the restcountries request fails or comes back
// incomplete, so the picker never shows a truncated list.
const STATIC_COUNTRIES: Country[] = [
  {name: 'Afghanistan', flag: flagFromCode('AF'), code: 'AF', dialCode: '+93'},
  {name: 'Albania', flag: flagFromCode('AL'), code: 'AL', dialCode: '+355'},
  {name: 'Algeria', flag: flagFromCode('DZ'), code: 'DZ', dialCode: '+213'},
  {name: 'Andorra', flag: flagFromCode('AD'), code: 'AD', dialCode: '+376'},
  {name: 'Angola', flag: flagFromCode('AO'), code: 'AO', dialCode: '+244'},
  {name: 'Antigua and Barbuda', flag: flagFromCode('AG'), code: 'AG', dialCode: '+1268'},
  {name: 'Argentina', flag: flagFromCode('AR'), code: 'AR', dialCode: '+54'},
  {name: 'Armenia', flag: flagFromCode('AM'), code: 'AM', dialCode: '+374'},
  {name: 'Australia', flag: flagFromCode('AU'), code: 'AU', dialCode: '+61'},
  {name: 'Austria', flag: flagFromCode('AT'), code: 'AT', dialCode: '+43'},
  {name: 'Azerbaijan', flag: flagFromCode('AZ'), code: 'AZ', dialCode: '+994'},
  {name: 'Bahamas', flag: flagFromCode('BS'), code: 'BS', dialCode: '+1242'},
  {name: 'Bahrain', flag: flagFromCode('BH'), code: 'BH', dialCode: '+973'},
  {name: 'Bangladesh', flag: flagFromCode('BD'), code: 'BD', dialCode: '+880'},
  {name: 'Barbados', flag: flagFromCode('BB'), code: 'BB', dialCode: '+1246'},
  {name: 'Belarus', flag: flagFromCode('BY'), code: 'BY', dialCode: '+375'},
  {name: 'Belgium', flag: flagFromCode('BE'), code: 'BE', dialCode: '+32'},
  {name: 'Belize', flag: flagFromCode('BZ'), code: 'BZ', dialCode: '+501'},
  {name: 'Benin', flag: flagFromCode('BJ'), code: 'BJ', dialCode: '+229'},
  {name: 'Bhutan', flag: flagFromCode('BT'), code: 'BT', dialCode: '+975'},
  {name: 'Bolivia', flag: flagFromCode('BO'), code: 'BO', dialCode: '+591'},
  {name: 'Bosnia and Herzegovina', flag: flagFromCode('BA'), code: 'BA', dialCode: '+387'},
  {name: 'Botswana', flag: flagFromCode('BW'), code: 'BW', dialCode: '+267'},
  {name: 'Brazil', flag: flagFromCode('BR'), code: 'BR', dialCode: '+55'},
  {name: 'Brunei', flag: flagFromCode('BN'), code: 'BN', dialCode: '+673'},
  {name: 'Bulgaria', flag: flagFromCode('BG'), code: 'BG', dialCode: '+359'},
  {name: 'Burkina Faso', flag: flagFromCode('BF'), code: 'BF', dialCode: '+226'},
  {name: 'Burundi', flag: flagFromCode('BI'), code: 'BI', dialCode: '+257'},
  {name: 'Cambodia', flag: flagFromCode('KH'), code: 'KH', dialCode: '+855'},
  {name: 'Cameroon', flag: flagFromCode('CM'), code: 'CM', dialCode: '+237'},
  {name: 'Canada', flag: flagFromCode('CA'), code: 'CA', dialCode: '+1'},
  {name: 'Cape Verde', flag: flagFromCode('CV'), code: 'CV', dialCode: '+238'},
  {name: 'Central African Republic', flag: flagFromCode('CF'), code: 'CF', dialCode: '+236'},
  {name: 'Chad', flag: flagFromCode('TD'), code: 'TD', dialCode: '+235'},
  {name: 'Chile', flag: flagFromCode('CL'), code: 'CL', dialCode: '+56'},
  {name: 'China', flag: flagFromCode('CN'), code: 'CN', dialCode: '+86'},
  {name: 'Colombia', flag: flagFromCode('CO'), code: 'CO', dialCode: '+57'},
  {name: 'Comoros', flag: flagFromCode('KM'), code: 'KM', dialCode: '+269'},
  {name: 'Costa Rica', flag: flagFromCode('CR'), code: 'CR', dialCode: '+506'},
  {name: 'Croatia', flag: flagFromCode('HR'), code: 'HR', dialCode: '+385'},
  {name: 'Cuba', flag: flagFromCode('CU'), code: 'CU', dialCode: '+53'},
  {name: 'Cyprus', flag: flagFromCode('CY'), code: 'CY', dialCode: '+357'},
  {name: 'Czechia', flag: flagFromCode('CZ'), code: 'CZ', dialCode: '+420'},
  {name: 'DR Congo', flag: flagFromCode('CD'), code: 'CD', dialCode: '+243'},
  {name: 'Denmark', flag: flagFromCode('DK'), code: 'DK', dialCode: '+45'},
  {name: 'Djibouti', flag: flagFromCode('DJ'), code: 'DJ', dialCode: '+253'},
  {name: 'Dominica', flag: flagFromCode('DM'), code: 'DM', dialCode: '+1767'},
  {name: 'Dominican Republic', flag: flagFromCode('DO'), code: 'DO', dialCode: '+1809'},
  {name: 'Ecuador', flag: flagFromCode('EC'), code: 'EC', dialCode: '+593'},
  {name: 'Egypt', flag: flagFromCode('EG'), code: 'EG', dialCode: '+20'},
  {name: 'El Salvador', flag: flagFromCode('SV'), code: 'SV', dialCode: '+503'},
  {name: 'Equatorial Guinea', flag: flagFromCode('GQ'), code: 'GQ', dialCode: '+240'},
  {name: 'Eritrea', flag: flagFromCode('ER'), code: 'ER', dialCode: '+291'},
  {name: 'Estonia', flag: flagFromCode('EE'), code: 'EE', dialCode: '+372'},
  {name: 'Eswatini', flag: flagFromCode('SZ'), code: 'SZ', dialCode: '+268'},
  {name: 'Ethiopia', flag: flagFromCode('ET'), code: 'ET', dialCode: '+251'},
  {name: 'Fiji', flag: flagFromCode('FJ'), code: 'FJ', dialCode: '+679'},
  {name: 'Finland', flag: flagFromCode('FI'), code: 'FI', dialCode: '+358'},
  {name: 'France', flag: flagFromCode('FR'), code: 'FR', dialCode: '+33'},
  {name: 'Gabon', flag: flagFromCode('GA'), code: 'GA', dialCode: '+241'},
  {name: 'Gambia', flag: flagFromCode('GM'), code: 'GM', dialCode: '+220'},
  {name: 'Georgia', flag: flagFromCode('GE'), code: 'GE', dialCode: '+995'},
  {name: 'Germany', flag: flagFromCode('DE'), code: 'DE', dialCode: '+49'},
  {name: 'Ghana', flag: flagFromCode('GH'), code: 'GH', dialCode: '+233'},
  {name: 'Greece', flag: flagFromCode('GR'), code: 'GR', dialCode: '+30'},
  {name: 'Grenada', flag: flagFromCode('GD'), code: 'GD', dialCode: '+1473'},
  {name: 'Guatemala', flag: flagFromCode('GT'), code: 'GT', dialCode: '+502'},
  {name: 'Guinea', flag: flagFromCode('GN'), code: 'GN', dialCode: '+224'},
  {name: 'Guinea-Bissau', flag: flagFromCode('GW'), code: 'GW', dialCode: '+245'},
  {name: 'Guyana', flag: flagFromCode('GY'), code: 'GY', dialCode: '+592'},
  {name: 'Haiti', flag: flagFromCode('HT'), code: 'HT', dialCode: '+509'},
  {name: 'Honduras', flag: flagFromCode('HN'), code: 'HN', dialCode: '+504'},
  {name: 'Hungary', flag: flagFromCode('HU'), code: 'HU', dialCode: '+36'},
  {name: 'Iceland', flag: flagFromCode('IS'), code: 'IS', dialCode: '+354'},
  {name: 'India', flag: flagFromCode('IN'), code: 'IN', dialCode: '+91'},
  {name: 'Indonesia', flag: flagFromCode('ID'), code: 'ID', dialCode: '+62'},
  {name: 'Iran', flag: flagFromCode('IR'), code: 'IR', dialCode: '+98'},
  {name: 'Iraq', flag: flagFromCode('IQ'), code: 'IQ', dialCode: '+964'},
  {name: 'Ireland', flag: flagFromCode('IE'), code: 'IE', dialCode: '+353'},
  {name: 'Israel', flag: flagFromCode('IL'), code: 'IL', dialCode: '+972'},
  {name: 'Italy', flag: flagFromCode('IT'), code: 'IT', dialCode: '+39'},
  {name: 'Ivory Coast', flag: flagFromCode('CI'), code: 'CI', dialCode: '+225'},
  {name: 'Jamaica', flag: flagFromCode('JM'), code: 'JM', dialCode: '+1876'},
  {name: 'Japan', flag: flagFromCode('JP'), code: 'JP', dialCode: '+81'},
  {name: 'Jordan', flag: flagFromCode('JO'), code: 'JO', dialCode: '+962'},
  {name: 'Kazakhstan', flag: flagFromCode('KZ'), code: 'KZ', dialCode: '+7'},
  {name: 'Kenya', flag: flagFromCode('KE'), code: 'KE', dialCode: '+254'},
  {name: 'Kiribati', flag: flagFromCode('KI'), code: 'KI', dialCode: '+686'},
  {name: 'Kosovo', flag: flagFromCode('XK'), code: 'XK', dialCode: '+383'},
  {name: 'Kuwait', flag: flagFromCode('KW'), code: 'KW', dialCode: '+965'},
  {name: 'Kyrgyzstan', flag: flagFromCode('KG'), code: 'KG', dialCode: '+996'},
  {name: 'Laos', flag: flagFromCode('LA'), code: 'LA', dialCode: '+856'},
  {name: 'Latvia', flag: flagFromCode('LV'), code: 'LV', dialCode: '+371'},
  {name: 'Lebanon', flag: flagFromCode('LB'), code: 'LB', dialCode: '+961'},
  {name: 'Lesotho', flag: flagFromCode('LS'), code: 'LS', dialCode: '+266'},
  {name: 'Liberia', flag: flagFromCode('LR'), code: 'LR', dialCode: '+231'},
  {name: 'Libya', flag: flagFromCode('LY'), code: 'LY', dialCode: '+218'},
  {name: 'Liechtenstein', flag: flagFromCode('LI'), code: 'LI', dialCode: '+423'},
  {name: 'Lithuania', flag: flagFromCode('LT'), code: 'LT', dialCode: '+370'},
  {name: 'Luxembourg', flag: flagFromCode('LU'), code: 'LU', dialCode: '+352'},
  {name: 'Madagascar', flag: flagFromCode('MG'), code: 'MG', dialCode: '+261'},
  {name: 'Malawi', flag: flagFromCode('MW'), code: 'MW', dialCode: '+265'},
  {name: 'Malaysia', flag: flagFromCode('MY'), code: 'MY', dialCode: '+60'},
  {name: 'Maldives', flag: flagFromCode('MV'), code: 'MV', dialCode: '+960'},
  {name: 'Mali', flag: flagFromCode('ML'), code: 'ML', dialCode: '+223'},
  {name: 'Malta', flag: flagFromCode('MT'), code: 'MT', dialCode: '+356'},
  {name: 'Marshall Islands', flag: flagFromCode('MH'), code: 'MH', dialCode: '+692'},
  {name: 'Mauritania', flag: flagFromCode('MR'), code: 'MR', dialCode: '+222'},
  {name: 'Mauritius', flag: flagFromCode('MU'), code: 'MU', dialCode: '+230'},
  {name: 'Mexico', flag: flagFromCode('MX'), code: 'MX', dialCode: '+52'},
  {name: 'Micronesia', flag: flagFromCode('FM'), code: 'FM', dialCode: '+691'},
  {name: 'Moldova', flag: flagFromCode('MD'), code: 'MD', dialCode: '+373'},
  {name: 'Monaco', flag: flagFromCode('MC'), code: 'MC', dialCode: '+377'},
  {name: 'Mongolia', flag: flagFromCode('MN'), code: 'MN', dialCode: '+976'},
  {name: 'Montenegro', flag: flagFromCode('ME'), code: 'ME', dialCode: '+382'},
  {name: 'Morocco', flag: flagFromCode('MA'), code: 'MA', dialCode: '+212'},
  {name: 'Mozambique', flag: flagFromCode('MZ'), code: 'MZ', dialCode: '+258'},
  {name: 'Myanmar', flag: flagFromCode('MM'), code: 'MM', dialCode: '+95'},
  {name: 'Namibia', flag: flagFromCode('NA'), code: 'NA', dialCode: '+264'},
  {name: 'Nauru', flag: flagFromCode('NR'), code: 'NR', dialCode: '+674'},
  {name: 'Nepal', flag: flagFromCode('NP'), code: 'NP', dialCode: '+977'},
  {name: 'Netherlands', flag: flagFromCode('NL'), code: 'NL', dialCode: '+31'},
  {name: 'New Zealand', flag: flagFromCode('NZ'), code: 'NZ', dialCode: '+64'},
  {name: 'Nicaragua', flag: flagFromCode('NI'), code: 'NI', dialCode: '+505'},
  {name: 'Niger', flag: flagFromCode('NE'), code: 'NE', dialCode: '+227'},
  {name: 'Nigeria', flag: flagFromCode('NG'), code: 'NG', dialCode: '+234'},
  {name: 'North Korea', flag: flagFromCode('KP'), code: 'KP', dialCode: '+850'},
  {name: 'North Macedonia', flag: flagFromCode('MK'), code: 'MK', dialCode: '+389'},
  {name: 'Norway', flag: flagFromCode('NO'), code: 'NO', dialCode: '+47'},
  {name: 'Oman', flag: flagFromCode('OM'), code: 'OM', dialCode: '+968'},
  {name: 'Pakistan', flag: flagFromCode('PK'), code: 'PK', dialCode: '+92'},
  {name: 'Palau', flag: flagFromCode('PW'), code: 'PW', dialCode: '+680'},
  {name: 'Panama', flag: flagFromCode('PA'), code: 'PA', dialCode: '+507'},
  {name: 'Papua New Guinea', flag: flagFromCode('PG'), code: 'PG', dialCode: '+675'},
  {name: 'Paraguay', flag: flagFromCode('PY'), code: 'PY', dialCode: '+595'},
  {name: 'Peru', flag: flagFromCode('PE'), code: 'PE', dialCode: '+51'},
  {name: 'Philippines', flag: flagFromCode('PH'), code: 'PH', dialCode: '+63'},
  {name: 'Poland', flag: flagFromCode('PL'), code: 'PL', dialCode: '+48'},
  {name: 'Portugal', flag: flagFromCode('PT'), code: 'PT', dialCode: '+351'},
  {name: 'Qatar', flag: flagFromCode('QA'), code: 'QA', dialCode: '+974'},
  {name: 'Republic of the Congo', flag: flagFromCode('CG'), code: 'CG', dialCode: '+242'},
  {name: 'Romania', flag: flagFromCode('RO'), code: 'RO', dialCode: '+40'},
  {name: 'Russia', flag: flagFromCode('RU'), code: 'RU', dialCode: '+7'},
  {name: 'Rwanda', flag: flagFromCode('RW'), code: 'RW', dialCode: '+250'},
  {name: 'Saint Kitts and Nevis', flag: flagFromCode('KN'), code: 'KN', dialCode: '+1869'},
  {name: 'Saint Lucia', flag: flagFromCode('LC'), code: 'LC', dialCode: '+1758'},
  {name: 'Saint Vincent and the Grenadines', flag: flagFromCode('VC'), code: 'VC', dialCode: '+1784'},
  {name: 'Samoa', flag: flagFromCode('WS'), code: 'WS', dialCode: '+685'},
  {name: 'San Marino', flag: flagFromCode('SM'), code: 'SM', dialCode: '+378'},
  {name: 'Saudi Arabia', flag: flagFromCode('SA'), code: 'SA', dialCode: '+966'},
  {name: 'Senegal', flag: flagFromCode('SN'), code: 'SN', dialCode: '+221'},
  {name: 'Serbia', flag: flagFromCode('RS'), code: 'RS', dialCode: '+381'},
  {name: 'Seychelles', flag: flagFromCode('SC'), code: 'SC', dialCode: '+248'},
  {name: 'Sierra Leone', flag: flagFromCode('SL'), code: 'SL', dialCode: '+232'},
  {name: 'Singapore', flag: flagFromCode('SG'), code: 'SG', dialCode: '+65'},
  {name: 'Slovakia', flag: flagFromCode('SK'), code: 'SK', dialCode: '+421'},
  {name: 'Slovenia', flag: flagFromCode('SI'), code: 'SI', dialCode: '+386'},
  {name: 'Solomon Islands', flag: flagFromCode('SB'), code: 'SB', dialCode: '+677'},
  {name: 'Somalia', flag: flagFromCode('SO'), code: 'SO', dialCode: '+252'},
  {name: 'South Africa', flag: flagFromCode('ZA'), code: 'ZA', dialCode: '+27'},
  {name: 'South Korea', flag: flagFromCode('KR'), code: 'KR', dialCode: '+82'},
  {name: 'South Sudan', flag: flagFromCode('SS'), code: 'SS', dialCode: '+211'},
  {name: 'Spain', flag: flagFromCode('ES'), code: 'ES', dialCode: '+34'},
  {name: 'Sri Lanka', flag: flagFromCode('LK'), code: 'LK', dialCode: '+94'},
  {name: 'Sudan', flag: flagFromCode('SD'), code: 'SD', dialCode: '+249'},
  {name: 'Suriname', flag: flagFromCode('SR'), code: 'SR', dialCode: '+597'},
  {name: 'Sweden', flag: flagFromCode('SE'), code: 'SE', dialCode: '+46'},
  {name: 'Switzerland', flag: flagFromCode('CH'), code: 'CH', dialCode: '+41'},
  {name: 'Syria', flag: flagFromCode('SY'), code: 'SY', dialCode: '+963'},
  {name: 'São Tomé and Príncipe', flag: flagFromCode('ST'), code: 'ST', dialCode: '+239'},
  {name: 'Taiwan', flag: flagFromCode('TW'), code: 'TW', dialCode: '+886'},
  {name: 'Tajikistan', flag: flagFromCode('TJ'), code: 'TJ', dialCode: '+992'},
  {name: 'Tanzania', flag: flagFromCode('TZ'), code: 'TZ', dialCode: '+255'},
  {name: 'Thailand', flag: flagFromCode('TH'), code: 'TH', dialCode: '+66'},
  {name: 'Timor-Leste', flag: flagFromCode('TL'), code: 'TL', dialCode: '+670'},
  {name: 'Togo', flag: flagFromCode('TG'), code: 'TG', dialCode: '+228'},
  {name: 'Tonga', flag: flagFromCode('TO'), code: 'TO', dialCode: '+676'},
  {name: 'Trinidad and Tobago', flag: flagFromCode('TT'), code: 'TT', dialCode: '+1868'},
  {name: 'Tunisia', flag: flagFromCode('TN'), code: 'TN', dialCode: '+216'},
  {name: 'Turkey', flag: flagFromCode('TR'), code: 'TR', dialCode: '+90'},
  {name: 'Turkmenistan', flag: flagFromCode('TM'), code: 'TM', dialCode: '+993'},
  {name: 'Tuvalu', flag: flagFromCode('TV'), code: 'TV', dialCode: '+688'},
  {name: 'Uganda', flag: flagFromCode('UG'), code: 'UG', dialCode: '+256'},
  {name: 'Ukraine', flag: flagFromCode('UA'), code: 'UA', dialCode: '+380'},
  {name: 'United Arab Emirates', flag: flagFromCode('AE'), code: 'AE', dialCode: '+971'},
  {name: 'United Kingdom', flag: flagFromCode('GB'), code: 'GB', dialCode: '+44'},
  {name: 'United States', flag: flagFromCode('US'), code: 'US', dialCode: '+1'},
  {name: 'Uruguay', flag: flagFromCode('UY'), code: 'UY', dialCode: '+598'},
  {name: 'Uzbekistan', flag: flagFromCode('UZ'), code: 'UZ', dialCode: '+998'},
  {name: 'Vanuatu', flag: flagFromCode('VU'), code: 'VU', dialCode: '+678'},
  {name: 'Vatican City', flag: flagFromCode('VA'), code: 'VA', dialCode: '+39'},
  {name: 'Venezuela', flag: flagFromCode('VE'), code: 'VE', dialCode: '+58'},
  {name: 'Vietnam', flag: flagFromCode('VN'), code: 'VN', dialCode: '+84'},
  {name: 'Yemen', flag: flagFromCode('YE'), code: 'YE', dialCode: '+967'},
  {name: 'Zambia', flag: flagFromCode('ZM'), code: 'ZM', dialCode: '+260'},
  {name: 'Zimbabwe', flag: flagFromCode('ZW'), code: 'ZW', dialCode: '+263'},
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

    if (!Array.isArray(data) || data.length < 150) {
      throw new Error('Incomplete countries response');
    }

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
