import BackgroundService from 'react-native-background-actions';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import config from '../config';
import { log, readLog, sendLogFile } from '../components/Logger';
import { buildReverseGeocodingUrl } from '../services/apiHelpers';
import { getAddressFromLatLng } from '../api/mapplsApi';
import { saveLocation } from '../services/locationStorage';
import { handleNewLocation, saveCoordinate } from '../services/distanceTracker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 20000,
    });
  });
};

const getCurrentDate = () => {
  const dateObj = new Date();
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentTime = () => {
  const dateObj = new Date();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

// Module-level variables to store previous coordinates
let previousLatitude = null;
let previousLongitude = null;

// const checkIdleAndSendData = async tripNo => {
//   log('BG_TASK - checkIdleAndSendData - STARTED');
//   try {
//     console.log('Getting current location to check idle...');
//     log('Getting current location to check idle...');

//     const granted = await PermissionsAndroid.requestMultiple([
//       PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//       PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
//     ]);

//     if (
//       granted['android.permission.ACCESS_FINE_LOCATION'] ===
//       PermissionsAndroid.RESULTS.GRANTED
//     ) {
//       if (
//         granted['android.permission.ACCESS_BACKGROUND_LOCATION'] !==
//         PermissionsAndroid.RESULTS.GRANTED
//       ) {
//         console.warn(
//           'Background location permission not granted. App may not track in background.',
//         );
//         log('Warning: Background location permission not granted.');
//       }

//       console.log('Foreground location permission granted');
//       log('Foreground location permission granted.');

//       const position = await getCurrentPosition();
//       const {latitude, longitude} = position.coords;
//       const locationName = await getAddressFromLatLng(latitude, longitude);
//       const curDate = getCurrentDate();
//       const curTime = getCurrentTime();
//       const timeStamp = `${curDate} ${curTime}`;
//       console.log('Location obtained:', latitude, longitude);
//       log(`Location obtained: ${latitude}, ${longitude}`);

//       if (
//         previousLatitude !== null &&
//         previousLongitude !== null &&
//         latitude === previousLatitude &&
//         longitude === previousLongitude
//       ) {
//         console.log('*************Location unchanged from last check.');
//         log('Location unchanged from last check. ' + timeStamp);

//         // Perform API Call to send notification alert.
//         const apiUrl = `${config.apiGetIdle}${tripNo}&lat=${latitude}&lon=${longitude}&adrs=${locationName}&ts=${timeStamp}`;
//         console.log('apiUrl to send idle location alert:' + apiUrl);
//         const response = await fetch(apiUrl, {
//           method: 'GET',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//         });
//         console.log('Idle api response : ' + response);
//       } else {
//         console.log('*************Location changed or first check.');
//         log('Location changed or first check. ' + timeStamp);

//         // Update previous location
//         previousLatitude = latitude;
//         previousLongitude = longitude;
//       }
//     } else {
//       console.log('Foreground location permission denied');
//       log('Foreground location permission denied');
//     }
//   } catch (error) {
//     console.error('Error getting location:', error);
//     log('Error getting location.');
//   }
//   log('BG_TASK - checkIdleAndSendData - COMPLETED');
// };

const checkIdleAndSendData = async tripNo => {
  log('BG_TASK - checkIdleAndSendData - STARTED');
  try {
    console.log('Getting current location to check idle...');
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
    ]);

    if (
      granted['android.permission.ACCESS_FINE_LOCATION'] ===
      PermissionsAndroid.RESULTS.GRANTED
    ) {
      if (
        granted['android.permission.ACCESS_BACKGROUND_LOCATION'] !==
        PermissionsAndroid.RESULTS.GRANTED
      ) {
        console.warn(
          'Background location permission not granted. App may not track in background.',
        );
        log('BG_TASK Warning: Background location permission not granted.');
      }

      console.log('Foreground location permission granted');
      log('BG_TASK Foreground location permission granted.');

      const position = await getCurrentPosition(); // Ensure getCurrentPosition is defined
      const { latitude, longitude } = position.coords;
      const locationName = await getAddressFromLatLng(latitude, longitude); // Ensure getAddressFromLatLng is defined
      const curDate = getCurrentDate(); // Ensure getCurrentDate is defined
      const curTime = getCurrentTime(); // Ensure getCurrentTime is defined
      const timeStamp = `${curDate} ${curTime}`;
      console.log('Location obtained:', latitude, longitude);
      log(`BG_TASK Idle Location obtained: ${latitude}, ${longitude}`);

      if (
        previousLatitude !== null &&
        previousLongitude !== null &&
        latitude === previousLatitude &&
        longitude === previousLongitude
      ) {
        console.log('*************Location unchanged from last check.');
        log('BG_TASK Location unchanged from last check. ' + timeStamp);

        // Helper function to send idle status to API
        const sendIdleStatus = async baseUrl => {
          const apiUrl = `${baseUrl}${tripNo}&lat=${latitude}&lon=${longitude}&adrs=${locationName}&ts=${timeStamp}`;
          console.log('API URL to send idle location alert:' + apiUrl);
          log(
            `BG_TASK - checkIdleAndSendData - Attempting idle API call to: ${apiUrl}`,
          );
          const authToken = await AsyncStorage.getItem('API_AUTH_TOKEN');
          const response = await Promise.race([
            fetch(apiUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
              },
            }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error('Idle API request timed out')),
                15000, // 15-second timeout for idle status check
              ),
            ),
          ]);

          if (!response.ok) {
            throw new Error(
              `Failed to get idle status from ${baseUrl}: ${response.statusText}`,
            );
          }
          return response;
        };

        try {
          // Attempt to send to the primary idle API
          await sendIdleStatus(config.apiGetIdle);
          console.log('Idle API primary call successful.');
          log('Idle API primary call successful.');
        } catch (initialError) {
          console.warn(
            'Primary Idle API call failed, attempting alternative:',
            initialError.message,
          );
          log(
            `BG_TASK - Primary Idle API failed: ${initialError.message}. Trying alt.`,
          );
          // If primary fails, try the alternative idle API
          await sendIdleStatus(config.apiGetIdleAlt);
          console.log('Idle API alternative call successful.');
          log('Idle API alternative call successful.');
        }
      } else {
        console.log('*************Location changed or first check.');
        log('Location changed or first check. ' + timeStamp);

        // Update previous location
        previousLatitude = latitude;
        previousLongitude = longitude;
      }
    } else {
      console.log('Foreground location permission denied');
      log('Foreground location permission denied');
    }
  } catch (error) {
    console.error('Error getting location or sending idle data:', error);
    log(
      `BG_TASK - Error getting location or sending idle data: ${error.message}`,
    );
  }
  log('BG_TASK - checkIdleAndSendData - COMPLETED');
};

const getLocationAndSendData = async tripNo => {
  log('BG_TASK - getLocationAndSendData - STARTED');
  try {
    console.log('Getting current location...');
    log('Getting current location...');
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
    ]);
    if (
      granted['android.permission.ACCESS_FINE_LOCATION'] ===
      PermissionsAndroid.RESULTS.GRANTED
    ) {
      if (
        granted['android.permission.ACCESS_BACKGROUND_LOCATION'] !==
        PermissionsAndroid.RESULTS.GRANTED
      ) {
        console.warn(
          'Background location permission not granted. App may not track in background.',
        );
        log('Warning: Background location permission not granted.');
      }

      console.log('Foreground location permission granted');
      log('Foreground location permission granted.');

      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      const coordsString = `${longitude},${latitude}`;
      console.log('Location obtained:', latitude, longitude);
      log(`Location obtained: ${latitude}, ${longitude}`);
      //await saveLocation(coordsString); // for multi-point Distance API
      //await handleNewLocation(coordsString); // for Distance Matrix API
      await saveCoordinate(coordsString); // for Route API
      await sendLocationDataToAPI(latitude, longitude, tripNo);
    } else {
      console.log('Foreground location permission denied');
      log('Foreground location permission denied');
    }
  } catch (error) {
    console.error('Error getting location:', error);
    log('Error getting location.');
  }
  log('BG_TASK - getLocationAndSendData - COMPLETED');
};

// const sendLocationDataToAPI = async (latitude, longitude, tripNo) => {
//   log('BG_TASK - sendLocationDataToAPI - STARTED');

//   try {
//     // const locationName = 'NA';
//     const curDate = getCurrentDate();
//     const curTime = getCurrentTime();
//     const timeStamp = `${curDate} ${curTime}`;
//     //const locationName = await reverseGeocode(latitude, longitude);
//     const locationName = await getAddressFromLatLng(latitude, longitude);
//     console.log('Location Name from Method:', locationName);
//     const queryStringValue = `${tripNo}|$|${timeStamp}|$|${latitude}|$|${longitude}|$|${locationName}`;
//     console.log('Query String:', queryStringValue);
//     log(`${tripNo} - BGTASK - Location query string: ${queryStringValue}`);
//     console.log('apiUrl to send background location:' + config.apiPostLocation + queryStringValue);
//     const response = await fetch(config.apiPostLocation + queryStringValue, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     });
//     const data = await response.json();
//     console.log('Sending current location API Response:', data);
//     log(
//       `BGTASK: sendLocationDataToAPI - Sending current location API Response: ${response.status}`,
//     );
//   } catch (error) {
//     console.error('Error sending Location data to API:', error);
//     log(`BackgroundTask: Error sending Location data to API: ${error}`);
//   }
//   log('BG_TASK - sendLocationDataToAPI - COMPLETED');
// };
const sendLocationDataToAPI = async (latitude, longitude, tripNo) => {
  log('BG_TASK - sendLocationDataToAPI - STARTED');

  // Helper function to send the location data to a given URL
  const sendLocationRequest = async baseUrl => {
    const curDate = getCurrentDate();
    const curTime = getCurrentTime();
    const timeStamp = `${curDate} ${curTime}`;

    const locationName = await getAddressFromLatLng(latitude, longitude);
    console.log('Location Name from Method:', locationName);

    const queryStringValue = `${tripNo}|$|${timeStamp}|$|${latitude}|$|${longitude}|$|${locationName}`;
    console.log('Query String:', queryStringValue);
    log(`${tripNo} - BGTASK - Location query string: ${queryStringValue}`);

    const url = `${baseUrl}${queryStringValue}`;
    console.log('API URL to send background location:', url);
    log(`BG_TASK - sendLocationDataToAPI - Attempting URL: ${url}`);

    const authToken = await AsyncStorage.getItem('API_AUTH_TOKEN');
    // Using Promise.race for a 20-second timeout
    const response = await Promise.race([
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Location API request timed out')),
          20000, // 20-second timeout for location updates
        ),
      ),
    ]);

    if (!response.ok) {
      throw new Error(
        `Location API response not ok from ${baseUrl}: ${response.status}`,
      );
    }

    const data = await response.json();
    console.log('Sending current location API Response:', data);
    log(
      `BGTASK: sendLocationDataToAPI - API Response status: ${
        response.status
      }, data: ${JSON.stringify(data)}`,
    );
    return data;
  };

  try {
    let responseData;
    try {
      // Try sending to the primary API first
      responseData = await sendLocationRequest(config.apiPostLocation);
      console.log('Primary location API call successful.');
    } catch (primaryError) {
      console.warn(
        'Primary location API call failed, attempting alternative:',
        primaryError.message,
      );
      log(
        `BGTASK: Primary location API failed: ${primaryError.message}. Trying alt.`,
      );
      // If primary fails, try the alternative API
      responseData = await sendLocationRequest(config.apiPostLocationAlt);
      console.log('Alternative location API call successful.');
    }
  } catch (error) {
    // This catches errors from both primary and alternative attempts, or any other preceding issues.
    console.error(
      'Error sending Location data to API (after all retries):',
      error,
    );
    log(
      `BackgroundTask: FINAL Error sending Location data to API: ${error.message}`,
    );
  }
  log('BG_TASK - sendLocationDataToAPI - COMPLETED');
};

const sleep = time => new Promise(resolve => setTimeout(() => resolve(), time));

// const veryIntensiveTask = async taskDataArguments => {
//   console.log('Background veryIntensiveTask starting...');
//   const {delay, tripNo} = taskDataArguments;
//   await new Promise(async resolve => {
//     for (let i = 0; BackgroundService.isRunning(); i++) {
//       console.info(`Running background task ${i}`);
//       log(`BackgroundTask - Running background task index: ${i}`);
//       await getLocationAndSendData(tripNo);
//       await sleep(delay);
//     }
//   });
// };

const veryIntensiveTask = async taskDataArguments => {
  log('BG_TASK - veryIntensiveTask - STARTED');

  try {
    console.log('Received taskDataArguments:', taskDataArguments);
    const { delay = 900000, tripNo = 'UNKNOWN' } = taskDataArguments || {};
    console.log('Extracted delay:', delay, 'Extracted tripNo:', tripNo);
    console.log('Background task started with:', { delay, tripNo });

    await new Promise(async resolve => {
      for (let i = 0; BackgroundService.isRunning(); i++) {
        console.info(`Running background task ${i}`);
        await getLocationAndSendData(tripNo);
        await sleep(delay);
      }
    });
  } catch (err) {
    console.error('Error in background task:', err);
  }
  log('BG_TASK - veryIntensiveTask - COMPLETED');
};

// const idleCheck = async taskDataArguments => {
//   log('BG_TASK - idleCheck - STARTED');

//   try {
//     console.log('Received taskDataArguments:', taskDataArguments);
//     const {delay = 600000, tripNo = 'UNKNOWN'} = taskDataArguments || {};
//     console.log('Extracted delay:', delay, 'Extracted tripNo:', tripNo);
//     console.log('**********************Idle Check started with:', {
//       delay,
//       tripNo,
//     });

//     await new Promise(async resolve => {
//       for (let i = 0; BackgroundService.isRunning(); i++) {
//         console.info(`Running idle check task ${i}`);
//         await checkIdleAndSendData(tripNo);
//         await sleep(delay);
//       }
//     });
//   } catch (err) {
//     console.error('Error in background task:', err);
//   }
//   log('BG_TASK - idleCheck - COMPLETED');
// };

// const options = tripNo => ({
//   taskName: 'Trip Ongoing',
//   taskTitle: 'Trip Ongoing',
//   taskDesc: `Trip Id: ${tripNo}`,
//   // taskIcon: {
//   //   name: 'ic_launcher',
//   //   type: 'mipmap',
//   // },
//   color: '#ff00ff',
//   //linkingURI: 'yourSchemeHere://chat/jane', // Optional: Add a link to open your app on click
//   parameters: {
//     // delay: config.trackInterval, //milliseconds
//     delay: 15 * 60 * 1000,
//     tripNo,
//   },
//   // Foreground service type to keep the task running in background
//   foreground: true,
//   ongoing: true, // Make the notification persistent and unclearable
// });

const idleCheck = async taskDataArguments => {
  debugger;
  console.log('IDLE CHECK - Simplfied task started');
  log('BG_TASK - idleCheck - STARTED (Simplified)');
  try {
    const { delay = 600000, tripNo = 'UNKNOWN' } = taskDataArguments || {};
    console.log('Idle Check started with:', { delay, tripNo });
    debugger;

    await new Promise(async resolve => {
      for (let i = 0; BackgroundService.isRunning(); i++) {
        console.info(`Running idle check task ${i}`);
        log(`BG_TASK - Running idle check task ${i}`);
        await checkIdleAndSendData(tripNo); // Comment out for now
        await sleep(delay);
      }
    });
  } catch (err) {
    console.error('Error in simplified idle check:', err);
  }
  log('BG_TASK - idleCheck - COMPLETED (Simplified)');
};

const options = (tripNo, trackInterval) => ({
  taskName: 'Trip Notification',
  taskTitle: `Trip In Progress : ${tripNo}`,
  taskDesc: 'Ongoing',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  // taskIcon: {
  //   name: 'ic_stat_directions_car',
  //   type: 'drawable',
  // },
  color: '#ff00ff',
  notificationChannelId: 'TRIP_TRACKER',
  linkingURI: 'yourSchemeHere://chat/jane',
  parameters: {
    //delay: 0.25 * 60 * 1000,
    delay: trackInterval * 60 * 1000,
    tripNo,
  },
  // Required on Android 14+ (targetSdk 34+): starting without a type crashes natively
  foregroundServiceType: ['location'],
  foreground: true,
  ongoing: true,
});

const idleOptions = tripNo => ({
  taskName: 'Trip Notification',
  taskTitle: `Trip Started : ${tripNo}`,
  taskDesc: 'Going to Pickup Point',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  // taskIcon: {
  //   name: 'ic_stat_directions_car',
  //   type: 'drawable',
  // },
  color: '#ff00ff',
  notificationChannelId: 'IDLE_TRIP_CHANNEL',
  linkingURI: 'yourSchemeHere://chat/jane',
  parameters: {
    //delay: 50000,
    delay: 10 * 60 * 1000,
    tripNo,
  },
  // Required on Android 14+ (targetSdk 34+): starting without a type crashes natively
  foregroundServiceType: ['location'],
  foreground: true,
  ongoing: true,
});

// A 'location' foreground service throws a native SecurityException if
// location permission is not granted at start time, so check it first.
const hasLocationPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }
  const fine = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  const coarse = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  );
  return fine || coarse;
};

export const startIdleCheck = async tripNo => {
  debugger;

  try {
    if (!tripNo) {
      console.error('Missing tripNo');
      return;
    }

    console.log('Starting idle check with tripNo:', tripNo);
    // log('BG_TASK - startIdleCheck - Starting idle check with tripNo:', tripNo);
    const isRunning = BackgroundService.isRunning();
    console.log('isRunning:', isRunning);
    if (isRunning) {
      console.log('Idle check already running.');
      return;
    }

    if (!(await hasLocationPermission())) {
      console.warn('Location permission not granted. Idle check not started.');
      log('BG_TASK - startIdleCheck - Location permission not granted.');
      return;
    }

    try {
      debugger;
      await BackgroundService.start(idleCheck, idleOptions(tripNo));
    } catch (error) {
      console.error('Error starting idle check:', error);
      // log('BG_TASK - startIdleCheck - Error starting idle check:', error);
    }
    console.log('idle check started');
  } catch (error) {
    console.error('Error starting idle check service:', error);
    // log('BG_TASK - startIdleCheck - Error starting idle check service:', error);
  }
};

export const stopIdleCheck = async () => {
  console.log('Stopping Idle check...');
  await BackgroundService.stop();
  console.log('Idle Check stopped');
  log(`BG_TASK - stopIdleCheck - Idle check Stopped...`);
};

export const startBackgroundService = async tripNo => {
  try {
    if (!tripNo) {
      console.error('Missing tripNo');
      return;
    }

    console.log('Starting background location tracking with tripNo:', tripNo);
    log(
      'BG_TASK - startBackgroundService - Starting background location tracking with tripNo:',
      tripNo,
    );

    const isRunning = BackgroundService.isRunning();
    console.log('isRunning:', isRunning);
    if (isRunning) {
      console.log('Background service already running.');
      return;
    }

    if (!(await hasLocationPermission())) {
      console.warn('Location permission not granted. Background service not started.');
      log('BG_TASK - startBackgroundService - Location permission not granted.');
      return;
    }

    //const opts = options(tripNo);
    //console.log('Options prepared:', opts);
    //const trackInterval = Number(await AsyncStorage.getItem('TrackInterval'));
    let trackInterval = Number(await AsyncStorage.getItem('TrackInterval'));
    if (!trackInterval) {
      trackInterval = 5;
    }
    console.log('Obtained LatLong Track Interval : ' + trackInterval);
    log('BG_TASK : Obtained LatLong Track Interval : ' + trackInterval);
    //const trackInterval = 7; // 7-Minutes
    try {
      await BackgroundService.start(
        veryIntensiveTask,
        options(tripNo, trackInterval),
      );
      // await BackgroundService.start(testTask, opts);
      // await BackgroundService.start(simpleTask, testOptions);
    } catch (error) {
      console.error('Error starting background service:', error);
      log(
        'BG_TASK - startBackgroundService - Error starting background service:',
        error,
      );
    }
    console.log('Background service started');
  } catch (error) {
    console.error('Error starting background service:', error);
    log(
      'BG_TASK - startBackgroundService - Error starting background service:',
      error,
    );
  }
};

export const stopBackgroundService = async () => {
  console.log('Stopping background service...');
  await BackgroundService.stop();
  console.log('Trip - Background service stopped');
  log(`BG_TASK - stopBackgroundService - Background Service Stopped...`);
};
