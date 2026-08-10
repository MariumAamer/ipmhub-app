import Geolocation from '@react-native-community/geolocation';
import {Country} from './countriesApi';

export const getUserCountry = async (
  countries: Country[],
): Promise<Country | null> => {
  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      async position => {
        try {
          const {latitude, longitude} = position.coords;

          // Use reverse geocoding to get country
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          );
          const data = await response.json();

          const countryCode = data.countryCode;

          // Find matching country from our list
          const found = countries.find(c => c.code === countryCode);

          if (found) {
            resolve(found);
          } else {
            resolve(null);
          }
        } catch (error) {
          console.log('Geocoding error:', error);
          resolve(null);
        }
      },
      error => {
        console.log('Location error:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  });
};
