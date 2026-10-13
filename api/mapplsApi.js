import {getOAuthToken} from './auth';
import {MAPPLS_CONFIG} from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {log} from '../components/Logger';

const fetchWithRetry = async (url, options, retry = true) => {
  try {
    const token = await getOAuthToken();
    const headers = {
      Accept: 'application/json',
      Authorization: token,
      ...(options?.headers || {}),
    };

    const response = await fetch(url, {...options, headers});

    if (response.status === 401 && retry) {
      // Token expired or invalid, clear and retry
      await AsyncStorage.removeItem(MAPPLS_CONFIG.TOKEN_STORAGE_KEY);
      return fetchWithRetry(url, options, false);
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    log(`ERROR - MAPPLS_API - fetchOauthToken : ${error} `);
    throw error;
  }
};

// Get eLoc from address
export const getElocFromAddress = async address => {
  try {
    const MAPPLS_GEOCODE_URL = await AsyncStorage.getItem(
      'MAPPLS_CONFIG.BASE_URL_GEOCODE',
    );
    const token = await getOAuthToken();
    // const url = `${
    //   MAPPLS_CONFIG.BASE_URL_GEOCODE
    // }?itemCount=1&address=${encodeURIComponent(address)}`;

    const url = MAPPLS_GEOCODE_URL.replace('{0}', decodeURIComponent(address));

    console.log('📤 Geocode Request URL:', url);
    log('MAPPLS_API - 📤 Geocode Request URL:', url);

    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        authorization: token,
      },
    });

    const data = await response.json();
    console.log('📦 Geocode Response:', JSON.stringify(data, null, 2));
    log(
      'MAPPLS_API - getElocFromAddress - 📦 Geocode Response:',
      JSON.stringify(data, null, 2),
    );

    const eLoc = data?.copResults?.eLoc || data?.suggestedLocations?.[0]?.eLoc;
    return eLoc || null;
  } catch (err) {
    console.error('Failed to fetch eLoc:', err);
    log('MAPPLS_API - getElocFromAddress - Failed to fetch eLoc:', err);
    return null;
  }
};

// Get lat/lng from eLoc
export const getLatLngFromEloc = async eLoc => {
  try {
    const MAPPLS_PLACE_DETAIL_URL = await AsyncStorage.getItem(
      'MAPPLS_CONFIG.BASE_URL_PLACE_DETAIL',
    );
    // Saved at login; missing if the driver logged in on an older build
    if (!MAPPLS_PLACE_DETAIL_URL) {
      log(
        'MAPPLS_API - getLatLngFromEloc - Place detail URL missing, skipping',
      );
      return null;
    }
    const token = await getOAuthToken();
    const url = `${MAPPLS_PLACE_DETAIL_URL}/${eLoc}`;

    console.log('📤 Place Detail Request URL:', url);
    log('MAPPLS_API - getLatLngFromEloc - 📤 Place Detail Request URL:', url);
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        Authorization: `bearer ${token}`,
      },
    });

    const data = await response.json();
    console.log('📍 Place Detail Response:', JSON.stringify(data, null, 2));
    log(
      'MAPPLS_API - getLatLngFromEloc - 📍 Place Detail Response:',
      JSON.stringify(data, null, 2),
    );

    const lat = data?.latitude;
    const lng = data?.longitude;
    return lat && lng ? {latitude: lat, longitude: lng} : null;
  } catch (err) {
    console.error('Failed to fetch coordinates from eLoc:', err);
    log(
      'MAPPLS_API - getLatLngFromEloc - Failed to fetch coordinates from eLoc:',
      err,
    );
    return null;
  }
};

// Reverse geocode: Lat/Lng -> Address
export const getAddressFromLatLng = async (lat, lng) => {
  try {
    const MAPPLS_REVERSE_GEOCODE_URL = await AsyncStorage.getItem(
      'MAPPLS_CONFIG.BASE_URL_REVERSE_GEOCODE',
    );
    // Saved at login; missing if the driver logged in on an older build
    if (!MAPPLS_REVERSE_GEOCODE_URL || lat == null || lng == null) {
      log(
        'MAPPLS_API - getAddressFromLatLng - Reverse geocode URL or lat/lng missing, skipping',
      );
      return 'Unknown Address';
    }
    const token = await getOAuthToken();
    //const url = `${MAPPLS_CONFIG.BASE_URL_REVERSE_GEOCODE}?lat=${lat}&lng=${lng}`;
    const url = MAPPLS_REVERSE_GEOCODE_URL.replace(
      '{0}',
      lat.toString(),
    ).replace('{1}', lng.toString());

    console.log('📤 Reverse Geocode Request URL:', url);
    console.log('MAPPLS OAuth Token : ', token);
    log(
      'MAPPLS_API - getAddressFromLatLng - 📤 Reverse Geocode Request URL:',
      url,
    );

    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        authorization: `bearer ${token}`,
      },
    });

    const data = await response.json();
    console.log('📦 Reverse Geocode Response:', JSON.stringify(data, null, 2));
    log(
      'MAPPLS_API - getAddressFromLatLng - 📦 Reverse Geocode Response:',
      JSON.stringify(data, null, 2),
    );

    const address = data?.results?.[0]?.formatted_address;
    return address || 'Unknown Address';
  } catch (err) {
    console.error('❌ Failed to reverse geocode:', err);
    log(
      'MAPPLS_API - getAddressFromLatLng - ❌ Failed to reverse geocode:',
      err,
    );
    return null;
  }
};

// Distance matrix
export const getTravelledDistance = async (startCoords, endCoords) => {
  try {
    const MAPPLS_API_KEY = await AsyncStorage.getItem('MAPPLS_CONFIG.API_KEY');

    const MAPPLS_DISTANCE_URL = await AsyncStorage.getItem(
      'MAPPLS_CONFIG.BASE_URL_DISTANCE',
    );
    console.log('🛣️ Received Start Coords:', startCoords);
    console.log('🛣️ Received End Coords:', endCoords);

    const apiKey = MAPPLS_API_KEY;

    //const url = `${MAPPLS_CONFIG.BASE_URL_DISTANCE}/${MAPPLS_CONFIG.API_KEY}/distance_matrix_eta/driving/${startCoords.longitude},${startCoords.latitude};${endCoords.longitude},${endCoords.latitude}?rtype=0&region=ind`;

    console.log('Base Travel Distance URL : ', MAPPLS_CONFIG.BASE_URL_DISTANCE);

    const url = MAPPLS_DISTANCE_URL.replace('{0}', apiKey)
      .replace('{1}', `${startCoords.longitude.toString()},${startCoords.latitude.toString()};${endCoords.longitude.toString()},${endCoords.latitude.toString()}`);

    console.log('🛣️ Distance Matrix Request URL:', url);
    log(
      'MAPPLS_API - getTravelledDistance - 🛣️ Distance Matrix Request URL:',
      url,
    );

    const response = await fetch(url);
    const data = await response.json();

    console.log('🛣️ Distance Matrix Response:', JSON.stringify(data, null, 2));
    log(
      'MAPPLS_API - getTravelledDistance - 🛣️ Distance Matrix Response:',
      JSON.stringify(data, null, 2),
    );

    // Extracting distance and duration
    const distance = data.routes[0].distance;
    const duration = data.routes[0].duration;

    console.log(`🚗 Distance: ${distance} meters`);
    console.log(`🕒 Estimated Duration: ${duration} seconds`);

    return {distance, duration};
  } catch (err) {
    console.error('Failed to get travelled distance:', err);
    log(
      'MAPPLS_API - getTravelledDistance - Failed to get travelled distance:',
      err,
    );
    return null;
  }
};

//Distance Matrix Round Trip
// export const getTravelledDistanceRound = async (coordsArray,arrayLength) => {
//   try {
//     const MAPPLS_API_KEY = await AsyncStorage.getItem('MAPPLS_CONFIG.API_KEY');

//     const MAPPLS_DISTANCE_URL = await AsyncStorage.getItem(
//       'MAPPLS_CONFIG.BASE_URL_DISTANCE',
//     );
//     console.log('🛣️ Received Coords Array:', coordsArray);

//     const apiKey = MAPPLS_API_KEY;

//     //const url = `${MAPPLS_CONFIG.BASE_URL_DISTANCE}/${MAPPLS_CONFIG.API_KEY}/distance_matrix_eta/driving/${startCoords.longitude},${startCoords.latitude};${endCoords.longitude},${endCoords.latitude}?rtype=0&region=ind`;

//     console.log('Base Travel Distance URL : ', MAPPLS_CONFIG.BASE_URL_DISTANCE);

//     const n = arrayLength;

//     const sources = Array.from({length: n - 1}, (_, i) => i).join(';');
//     const destinations = Array.from({length: n - 1}, (_, i) => i + 1).join(';');

//     const coordsWithSourceAndDest = `${coordsArray}?sources=${sources}&destinations=${destinations}&`;

//     const url = MAPPLS_DISTANCE_URL.replace('{0}', apiKey).replace(
//       '{1},{2};{3},{4}?',
//       coordsWithSourceAndDest,
//     );

//     console.log('🛣️ Distance Matrix Round Trip Request URL:', url);
//     log(
//       'MAPPLS_API - getTravelledDistanceRound - 🛣️ Distance Matrix Round Trip Request URL:',
//       url,
//     );

//     const response = await fetch(url);
//     const data = await response.json();

//     console.log('🛣️ Distance Matrix Response:', JSON.stringify(data, null, 2));
//     log(
//       'MAPPLS_API - getTravelledDistanceRound - 🛣️ Distance Matrix Response:',
//       JSON.stringify(data, null, 2),
//     );

//     // Extracting distances
//     const distances = data?.results?.distances;

//     const totalMeters = calculateTotalRouteDistance(distances);
//     console.log('Calculated route distance in Metres :', totalMeters);
//     const totalKm = (totalMeters / 1000).toFixed(2);

//     console.log(`🚗 Distance: ${totalKm} Km`);
//     log(
//       `MAPPLS_API - getTravelledDistanceRound - 🚗 Calculated Round Distance: ${totalKm} Km`,
//     );

//     return totalKm;
//   } catch (err) {
//     console.error('Failed to get travelled distance:', err);
//     log(
//       'MAPPLS_API - getTravelledDistance - Failed to get travelled distance:',
//       err,
//     );
//     return null;
//   }
// };

//Distance Matrix Round Trip with Multiple API calls
export const getTravelledDistanceRound = async (coordsArrayString) => {
  try {
    const MAPPLS_API_KEY = await AsyncStorage.getItem('MAPPLS_CONFIG.API_KEY');
    const MAPPLS_DISTANCE_URL = await AsyncStorage.getItem('MAPPLS_CONFIG.BASE_URL_DISTANCE');

    console.log('🛣️ Received Coords Array String:', coordsArrayString);

    // Convert string -> array of "lon,lat"
    const coordsArray = coordsArrayString.split(';').filter(Boolean); // remove empty

    let totalMeters = 0;

    // Break into chunks of 11 points (max 10 sources)
    for (let startIndex = 0; startIndex < coordsArray.length - 1; startIndex += 10) {
      const batchCoords = coordsArray.slice(startIndex, Math.min(startIndex + 11, coordsArray.length));

      const n = batchCoords.length;
      const sources = Array.from({ length: n - 1 }, (_, i) => i).join(';');
      const destinations = Array.from({ length: n - 1 }, (_, i) => i + 1).join(';');

      const coordsWithParams = `${batchCoords.join(';')}?sources=${sources}&destinations=${destinations}&`;

      const url = MAPPLS_DISTANCE_URL
        .replace('{0}', MAPPLS_API_KEY)
        .replace('{1},{2};{3},{4}?', coordsWithParams);

      console.log('🛣️ Distance Matrix Request URL:', url);

      const response = await fetch(url);
      const data = await response.json();

      console.log('🛣️ Distance Matrix Response:', JSON.stringify(data, null, 2));

      const distances = data?.results?.distances;
      if (distances) {
        totalMeters += calculateTotalRouteDistance(distances);
      }
    }

    const totalKm = (totalMeters / 1000).toFixed(2);
    console.log(`🚗 Total Distance: ${totalKm} Km`);

    return totalKm;
  } catch (err) {
    console.error('Failed to get travelled distance:', err);
    return null;
  }
};

const calculateTotalRouteDistance = distances => {
  let totalDistance = 0;

  for (let i = 0; i < distances.length - 1; i++) {
    totalDistance += distances[i][i + 1];
  }

  return totalDistance;
};

