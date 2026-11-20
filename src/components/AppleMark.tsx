/* eslint-disable prettier/prettier */
import React from 'react';
import Svg, {Path} from 'react-native-svg';

// Apple logo (same glyph as AppleSignInButton's icon), colourable. Black in
// the Login Information "You sign in with Apple" box, black outline button
// icon on Set a Password.
const AppleMark = ({size = 18, color = '#000000'}: {size?: number; color?: string}) => (
  <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <Path
      d="M9.11396 5.172C8.40296 5.172 7.30271 4.3635 6.14396 4.392C4.61396 4.41225 3.21146 5.27925 2.42321 6.6525C0.835461 9.40875 2.01371 13.4797 3.56246 15.72C4.32221 16.8105 5.21846 18.0375 6.40646 17.9992C7.54646 17.9505 7.97396 17.259 9.35771 17.259C10.731 17.259 11.1202 17.9992 12.3277 17.97C13.5555 17.9505 14.3347 16.86 15.0847 15.759C15.9517 14.493 16.3117 13.2652 16.3312 13.1977C16.302 13.188 13.9447 12.282 13.9162 9.555C13.8967 7.275 15.7762 6.1845 15.864 6.13575C14.7922 4.56825 13.1467 4.39275 12.5715 4.35375C11.0715 4.23675 9.81521 5.172 9.11396 5.172ZM11.6475 2.8725C12.2797 2.1135 12.6975 1.05225 12.5812 0C11.676 0.039 10.5847 0.60375 9.93221 1.3635C9.34721 2.0355 8.84171 3.117 8.97746 4.149C9.98096 4.227 11.0137 3.633 11.6467 2.87325"
      fill={color}
    />
  </Svg>
);

export default AppleMark;
