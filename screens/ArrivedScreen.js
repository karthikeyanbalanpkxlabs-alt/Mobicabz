import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Linking,
  Alert,
  ScrollView,
  PermissionsAndroid,
  BackHandler,
  Keyboard,
  Platform,
  ToastAndroid,
  DeviceEventEmitter,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {faPhoneSquare} from '@fortawesome/free-solid-svg-icons';
import {
  faCar,
  faCircle,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SQLite from 'react-native-sqlite-storage';
import moment from 'moment';
import Geolocation from '@react-native-community/geolocation';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import Header from '../components/Header';
import Footer from '../components/Footer';
import NewHeader from '../components/NewHeader';
import NewFooter from '../components/NewFooter';
import {log, readLog, sendLogFile} from '../components/Logger';
import translations from '../translations';
import translationManager from '../translationManager';
import config from '../config';
import {
  startBackgroundService,
  stopBackgroundService,
} from '../Threads/BackgroundTask';
import {getDistance} from 'geolib';
import {useFocusEffect} from '@react-navigation/native';
import {Colors} from '../config';
import {stopIdleCheck} from '../Threads/BackgroundTask';
// import CallDetectorManager from 'react-native-call-detection';
// import { startBackgroundGeolocation, stopBackgroundGeolocation } from '../Threads/BackgroundTask';
// import BackgroundJob from 'react-native-background-actions';
// import BackgroundFetch from 'react-native-background-fetch';
// import BackgroundService from 'react-native-background-actions';
// import {Thread} from 'react-native-threads';

// const sleep = (time) => new Promise((resolve) => setTimeout(() => resolve(), time));

// BackgroundJob.on('expiration', () => {});

// const {BackgroundTask} = NativeModules;

// const getLocationAndSendData = async () => {
//   try {
//     console.log('Getting current location...');
//     log('Getting current location...');
//     const granted = await PermissionsAndroid.request(
//       PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//     );
//     if (granted === PermissionsAndroid.RESULTS.GRANTED) {
//       console.log('Location permission granted');
//       log('Location permission granted.');
//       const position = await getCurrentPosition();
//       const {latitude, longitude} = position.coords;
//       console.log('Location obtained:', latitude, longitude);
//       log('Location obtained:', latitude, longitude);
//       await sendLocationDataToAPI(latitude, longitude);
//     } else {
//       console.log('Location permission denied');
//       log('Location permission denied');
//     }
//   } catch (error) {
//     console.error('Error getting location:', error);
//     log('Error getting location.');
//   }
// };

// DeviceEventEmitter.addListener('backgroundTask', getLocationAndSendData);

// const startBackgroundTask = async () => {
//   try {
//     await BackgroundTask.startBackgroundTask();
//     console.log('Background task started');
//   } catch (error) {
//     console.error('Error starting background task:', error);
//   }
// };

// const stopBackgroundTask = async () => {
//   try {
//     await BackgroundTask.stopBackgroundTask();
//     console.log('Background task stopped');
//   } catch (error) {
//     console.error('Error stopping background task:', error);
//   }
// };

const ArrivedScreen = ({route, language}) => {
  const lang = language || 'en';
  // const { tripNo, custName, custMobile, pickUpLoc, dropLoc, driverId} = route.params;
  const [params, setParams] = useState({});
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(0);
  const [startKmReadings, setStartKmReadings] = useState('');
  const [pickupKmReadings, setPickupKmReadings] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [tripStatus, setTripStatus] = useState('');
  const [customerStatus, setCustomerStatus] = useState('');
  const phoneNumbers = {
    Customer: '+91' + params.custMobile,
    Booker: '+91' + params.bookerMobile,
  };
  const [pickupKmImageUri, setPickupKmImageUri] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [arrivedTime, setArrivedTime] = useState(null);
  const [tripCompletedTime, setTripCompletedTime] = useState('');
  const [tripCompleteLoc, setTripCompleteLoc] = useState('');
  const [lat, setLat] = useState('');
  const [long, setLong] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const timeoutValue = parseInt(config.timeoutValue);
  const conTimeoutValue = parseInt(config.connectionTimeoutValue);
  const [isArrivedLoading, setIsArrivedLoading] = useState(false);
  const [isArrivedSuccess, setIsArrivedSuccess] = useState(false);
  const [trackLocation, setTrackLocation] = useState('');
  const [isPickupUploaded, setIsPickupUploaded] = useState(false);
  const [location, setLocation] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [isBgTracking, setIsBgTracking] = useState(false);
  const [isBgEnabled, setIsBgEnabled] = useState(true);
  const [garageLatLong, setGarageLatLong] = useState({
    latitude: 13.0281769,
    longitude: 80.2123457,
  });
  const [startLatLongValue, setStartLatLongValue] = useState(null);
  // const [isOnCall, setIsOnCall] = useState(false);

  // Track Current Step of the trip....
  useEffect(() => {
    if (typeof currentStep === 'undefined') {
      setCurrentStep(0);
    }
    console.log('Current Step from state variable:', currentStep);
  }, [currentStep]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('BgTracking on Focus:', isBgTracking);
    }, []),
  );

  // To fetch the parameter values whan the app opens after closed....
  useEffect(() => {
    const fetchParams = async () => {
      try {
        // Check if there are stored parameters in AsyncStorage
        const storedParams = await AsyncStorage.getItem('homeParams');
        console.log('Received param values: ', storedParams);
        log('ARRIVED - fetchParams - Received param values:', storedParams);
        if (storedParams !== null && storedParams !== undefined) {
          // If stored parameters exist, use them
          try {
            const parsedParams = JSON.parse(storedParams);
            setParams(parsedParams);
          } catch (error) {
            console.error('Error parsing stored params:', error);
            log('ARRIVED - fetchParams - Error parsing stored params:', error);
            setParams({}); // Fallback value
          }
        } else {
          // If no stored parameters, use the parameters passed through navigation
          setParams(route.params || {}); // Fallback value
        }
      } catch (error) {
        console.error(
          'ARRIVED: Error retrieving params from AsyncStorage:',
          error,
        );
        log(
          'ARRIVED: Error retrieving params from AsyncStorage:',
          error,
        );
      }
    };

    fetchParams();
  }, [route.params]);

  // to track the current step after app close....
  // useEffect(() => {
  //   if (params.step !== '') {
  //     setCurrentStep(params.step);
  //   }
  // }, [params.step]);

  // to update start km every time the value changes....
  useEffect(() => {
    if (params.startKmReadings) {
      setStartKmReadings(params.startKmReadings);
    }
  }, [params.startKmReadings]);

  // to update start km every time the value changes....
  useEffect(() => {
    if (startKmReadings) {
      console.log('Latest start km reading: ', startKmReadings);
    }
  }, [startKmReadings]);

  useEffect(() => {
    if (startLatLongValue) {
      console.log('Latest start lat Long Value: ', startLatLongValue);
    }
  }, [startLatLongValue]);

  // to update pickup km every time the value changes....
  useEffect(() => {
    if (params.pickupKmReadings) {
      setPickupKmReadings(params.pickupKmReadings);
    }
  }, [params.pickupKmReadings]);

  // to update pickup km uri every time the value changes....
  // useEffect(() => {
  //   if (params.pickupKmImageUri) {
  //     setPickupKmImageUri(params.pickupKmImageUri);
  //   }
  // }, [params.pickupKmImageUri]);

  // to update pickup km uri every time the value changes....
  // useEffect(() => {
  //   if (pickupKmImageUri) {
  //     console.log('Pickup Km Image Uploaded: ', pickupKmImageUri);
  //   }
  // }, [pickupKmImageUri]);

  // Store the parameters in AsyncStorage whenever they change
  useEffect(() => {
    // Skip the initial empty state so it doesn't overwrite the stored trip params
    if (!params || Object.keys(params).length === 0) {
      return;
    }
    AsyncStorage.setItem('homeParams', JSON.stringify(params));
  }, [params]);

  // Function to handle hardware back button press
  useEffect(() => {
    const backAction = () => {
      // Always prevent default behavior (disable back button)
      return true;
    };

    // Add event listener for hardware back button press
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    // Clean up the event listener on component unmount
    return () => backHandler.remove();
  }, []);

  // to hide the footer when keyboard opens....
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // to get the current time....
  useEffect(() => {
    const interval = setInterval(() => {
      const formattedTime = moment().format('YYYY-MM-DD HH:mm:ss');
      setCurrentTime(formattedTime);
    }, 1000);

    // Clear interval on component unmount
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (lat && long) {
      console.log('logged lat & long : ' + lat + ',' + long);
    }
  }, []);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const date = now.toDateString();
      const hours = String(now.getHours()).padStart(2, '0'); // Get hours and pad with leading zero
      const minutes = String(now.getMinutes()).padStart(2, '0'); // Get minutes and pad with leading zero

      // Set current date and time in 24-hour format
      setCurrentDateTime(`${date} - ${hours}:${minutes}`);
    };

    updateDateTime(); // Call initially to set the time immediately

    const intervalId = setInterval(updateDateTime, 1000); // Update every second

    return () => clearInterval(intervalId); // Cleanup on component unmount
  }, []); // Empty dependency array means this effect runs once on mount

  useEffect(() => {
    if (tripStatus) {
      console.log('Current Trip Status :' + tripStatus);
    }
  }, [tripStatus]);

  useEffect(() => {
    if (tripCompleteLoc) {
      console.log(
        'Trip complete Location:' +
          tripCompleteLoc.latitude +
          ',' +
          tripCompleteLoc.longitude,
      );
    }
  }, [tripCompleteLoc]);

  useEffect(() => {
    if (tripCompletedTime) {
      console.log('Trip complete Time:' + tripCompletedTime);
    }
  }, [tripCompletedTime]);

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 20000,
      });
    });
  };

  // Resolves with {latitude, longitude}, or null if location is unavailable
  const getLocation = () =>
    new Promise(resolve => {
      Geolocation.getCurrentPosition(
        position => {
          const {latitude, longitude} = position.coords;
          setLat(latitude);
          setLong(longitude);
          resolve({latitude, longitude});
        },
        error => {
          console.log(error);
          resolve(null);
        },
        {enableHighAccuracy: false, timeout: 20000, maximumAge: 1000}, // Set maximumAge to 0 to force fetching a fresh position
      );
    });

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

  const handlePressPhoneNumber = name => {
    const phoneNumber = phoneNumbers[name];
    Alert.alert(
      translationManager.getTranslation('alertConfirm'),
      `Call the ${name} ?`,
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: () => {
            Linking.openURL(`tel:${phoneNumber}`);
          },
        },
      ],
      {cancelable: false},
    );
  };

  const sendStartKmReadings = async () => {
    try {
      const curDate = getCurrentDate();
      log(
        `${params.tripNo}: ARRIVED: sendStartKmReadings - Method being called.`,
      );
      console.log(
        'sendStartKmReadings - Driver ID from fetchStartKm method: ',
        params.driverId,
      );
      const apiUrlwithQuery =
        config.apiGetStatus +
        params.tripNo +
        '&did=' +
        params.driverId +
        '&dt=' +
        curDate +
        '&status=STARTED';
      console.log('sendStartKmReadings - Start Km URL:', apiUrlwithQuery);
      const authToken = await AsyncStorage.getItem('API_AUTH_TOKEN');
      const response = await Promise.race([
        fetch(apiUrlwithQuery, {
          method: 'GET',
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization':`Bearer ${authToken}`
          },
        }),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(new Error('Request timed out, check internet connection')),
            // conTimeoutValue,
            15000,
          ),
        ),
      ]);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      console.log('sendStartKmReadings - Response status:', response.status);
      // Handle response data as per your application logic
      const responseData = await response.json();
      console.log('sendStartKmReadings - Response data:', responseData);
      log(
        `${params.tripNo}: ARRIVED: sendStartKmReadings - Sending Start Km Reading Successful`,
      );
      // Return response status or data as needed
      return true;
    } catch (error) {
      console.error('sendStartKmReadings - Start Km API Error:', error);
      log(
        `${params.tripNo}: ERROR - ARRIVED: sendStartKmReadings - Error when sending Start Km Reading:`,
        error,
      );
      return false;
    }
  };

  // const getCustomerStatusOnArrived = async () => {
  //   try {
  //     getLocation();
  //     console.log('Driver ID from Arrived Status:' + params.driverId);
  //     console.log('Current Time on Getting Customer Status: ', currentTime);

  //     let arrivedTimeStamp = arrivedTime != null ? arrivedTime : currentTime;
  //     const apiUrl =
  //       config.apiGetStatus +
  //       params.tripNo +
  //       '&did=' +
  //       params.driverId +
  //       '&dt=' +
  //       arrivedTimeStamp +
  //       '&status=ARRIVED&lat='+lat+'&lon='+long;
  //     log(
  //       `${params.tripNo}: ARRIVED: getCustomerStatus - Get Customer Status URL: ${apiUrl}`,
  //     );
  //     console.log('Get Customer Status URL: ', apiUrl);

  //     const response = await Promise.race([
  //       fetch(apiUrl, {
  //         method: 'GET',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //       }),
  //       new Promise((_, reject) =>
  //         setTimeout(
  //           () =>
  //             reject(new Error('Request timed out, Check internet connection')),
  //           10000,
  //           // conTimeoutValue,
  //         ),
  //       ),
  //     ]);

  //     if (response.ok) {
  //       const data = await response.json();
  //       setCustomerStatus(data.StatusMessage);
  //       return true;
  //     } else {
  //       throw new Error('Failed to get Guest Status.' + response.StatusMessage);
  //     }
  //   } catch (error) {
  //     console.error('Error requesting Status:', error);
  //     log(
  //       `${params.tripNo}: ARRIVED: getCustomerStatusOnArrived - Error requesting Status on Arrived: ${error}`,
  //     );
  //     return false;
  //   }
  // };

  const sendArrivedDetails = async () => {
    try {
      // params state can still be empty if it hasn't loaded yet, so fall back to storage
      let tripParams = params;
      if (!tripParams.tripNo || !tripParams.driverId) {
        const storedParams = await AsyncStorage.getItem('homeParams');
        tripParams = storedParams ? JSON.parse(storedParams) : {};
      }
      if (!tripParams.tripNo || !tripParams.driverId) {
        log(
          'ERROR - ARRIVED: sendArrivedDetails - tripNo/driverId missing, not sending status',
        );
        return false;
      }

      // Wait for the position; lat/long state won't be updated until the next render
      const coords = await getLocation();
      const curLat = coords ? coords.latitude : lat;
      const curLong = coords ? coords.longitude : long;
      console.log('Driver ID from Arrived Status:' + tripParams.driverId);
      console.log('Current Time on Getting Customer Status: ', currentTime);

      let arrivedTimeStamp = arrivedTime !== null ? arrivedTime : currentTime;

      const makeApiCall = async baseUrl => {
        const apiUrl =
          baseUrl +
          tripParams.tripNo +
          '&did=' +
          tripParams.driverId +
          '&dt=' +
          arrivedTimeStamp +
          '&status=ARRIVED&lat=' +
          curLat +
          '&lon=' +
          curLong;
        log(
          `${tripParams.tripNo}: ARRIVED: sendArrivedDetails - Sending Arrived Details URL: ${apiUrl}`,
        );
        console.log('Get Customer Status URL: ', apiUrl);
        const authToken = await AsyncStorage.getItem('API_AUTH_TOKEN');
        const response = await Promise.race([
          fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization':`Bearer ${authToken}`
            },
          }),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error('Request timed out, Check internet connection'),
                ),
              20000,
            ),
          ),
        ]);

        if (!response.ok) {
          throw new Error(
            `Failed to get Guest Status. Status: ${response.status}`,
          );
        }
        return response;
      };

      let response;
      try {
        response = await makeApiCall(config.apiGetStatus);
      } catch (initialError) {
        console.warn('Full Error Message : ' + initialError);
        console.warn(
          'Primary get status API failed, attempting alternative:',
          initialError.message,
        );
        log(
          `${params.tripNo}: WARN - ARRIVED: sendArrivedDetails - Primary get status API failed, attempting alternative: ${initialError.message}`,
        );
        response = await makeApiCall(config.apiGetStatusAlt); // Try the alternative URL
      }

      const data = await response.json();
      setCustomerStatus(data.StatusMessage);
      return true;
    } catch (error) {
      console.error('Error requesting Status:', error);
      log(
        `${params.tripNo}: ERROR - ARRIVED: sendArrivedDetails - Error sending Status on Arrived: ${error.message}`,
      );
      return false;
    }
  };

  const obtainStartLatLong = async address => {
    console.log('obtainStartLatLong method called');
    const apiKey = config.tomTomApiKey;
    const geocodeUrl = `https://api.tomtom.com/search/2/geocode/${address}.json?key=${apiKey}`;
    const response = await fetch(geocodeUrl);
    const data = await response.json();
    console.log('geocodeUrl in obtainStartLatLong :', geocodeUrl);
    console.log('geocode Response in obtain Method:', data);
    if (data.results && data.results.length > 0) {
      const startLatLongArray = {
        latitude: data.results[0].position.lat,
        longitude: data.results[0].position.lon,
      };
      console.log('If condition checked in obtainStartLatLong method');
      setStartLatLongValue(startLatLongArray);
      log(
        `${params.tripNo}: ARRIVED: obtainStartLatLong - Start Location Lat Long : ${startLatLongArray.latitude}, ${startLatLongArray.longitude}`,
      );
      console.log('startLatLongArray if geocode Success:', startLatLongArray);
      return startLatLongArray;
    } else {
      log(
        `${params.tripNo}: ARRIVED: obtainStartLatLong - Obtaining Geocode Failure.`,
      );
      return null;
    }
  };

  const convertTimeToHHMM = time => {
    // Separate the integer and decimal parts
    const [hours, decimalMinutes] = String(time).split('.');

    // Convert hours to two digits
    const formattedHours = String(hours).padStart(2, '0');

    // Calculate minutes from the decimal part
    const minutes = decimalMinutes
      ? Math.round(parseFloat(`0.${decimalMinutes}`) * 100)
      : 0;
    const formattedMinutes = String(minutes).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}`;
  };
  const reportingtime = convertTimeToHHMM(params.reportTime);

  //request location permission..
  const requestForegroundLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'App needs access to your location',
          buttonPositive: 'OK',
          cancelable: false,
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting foreground location permission:', error);
      log(
        `${params.tripNo}:ERROR - ARRIVED - Error requesting foreground location permission: ${error}`,
      );
      return false;
    }
  };

  //request background permission..
  const requestBackgroundLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        {
          title: 'Background Location Permission Needed',
          message:
            'Select "Allow all the time" in the Location permission settings.',
          buttonPositive: 'OK',
          cancelable: false,
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting background location permission:', error);
      log(
        `${params.tripNo}:ERROR - ARRIVED - Error requesting background location permission:${error}`,
      );
      return false;
    }
  };

  //request permission using the above methods..
  const bgLocationPermission = async () => {
    if (await requestForegroundLocationPermission()) {
      if (await requestBackgroundLocationPermission()) {
        log(
          `${params.tripNo}: ARRIVED: handleArrived - Location permission granted when Arrived clicked`,
        );
        console.log(
          `${params.tripNo}: handleArrived - Location permission granted when Arrived clicked`,
        );
        getLocation();
        //startBgTracking();
        return true;
      } else {
        log(
          `${params.tripNo}: ARRIVED: handleArrived - Background Location permission denied`,
        );
        console.log('handleArrived - Background Location permission denied');
        Alert.alert(
          translationManager.getTranslation('alertAllowAllTime'),
          translationManager.getTranslation('alertAllowFull'),
          [
            {
              text: 'Ok',
              onPress: () => {
                Linking.openSettings(); // Navigate to Location settings page
              },
            },
          ],
          {cancelable: false},
        );
        setIsArrivedLoading(false);
        return;
      }
    } else {
      log(
        `${params.tripNo}: ARRIVED: handleArrived - Foreground Location permission denied`,
      );
      console.log('Foreground Location permission denied');
      Alert.alert(
        translationManager.getTranslation('alertLocationPermission'),
        translationManager.getTranslation('alertEnableLocation'),
        [
          {
            text: 'OK',
            onPress: () => {
              bgLocationPermission();
            },
          },
        ],
        {cancelable: false},
      );
      setIsArrivedLoading(false);
    }
  };

  const handleArrived = async () => {
    log(`${params.tripNo}: ARRIVED: handleArrived - Arrived button clicked...`);
    log(`${params.tripNo}: ARRIVED: handleArrived - Method being called.`);
    try {
      Alert.alert(
        translationManager.getTranslation('alertConfirm'),
        translationManager.getTranslation('alertArrival'),
        [
          {
            text: 'No',
            style: 'cancel',
            onPress: () => {
              setIsArrivedLoading(false);
            },
          },
          {
            text: 'Yes',
            onPress: async () => {
              setIsArrivedLoading(true);
              setArrivedTime(currentTime);
              await stopIdleCheck();
              const locationPermission = await bgLocationPermission();
              if (locationPermission != true) {
                console.log('Location Permission Denied.');
                return;
              }
              //-------------------------------------------------------------------
              console.log('handleArrived - Arrived at Pickup Location');
              log(
                `${params.tripNo}: ARRIVED: handleArrived - Arrived confirmed by the Driver`,
              );
              try {
                const callSendArrivedDetails = await sendArrivedDetails();
                if (callSendArrivedDetails) {
                  setIsArrivedSuccess(true);
                  setCurrentStep(1);
                } else {
                  setIsArrivedSuccess(false);
                  Alert.alert(
                    translationManager.getTranslation('alertLowNetwork'),
                    translationManager.getTranslation(
                      'alertCheckNetworkandTry',
                    ),
                    [{text: 'Ok'}],
                    {cancelable: false},
                  );
                  setIsArrivedLoading(false);
                  return;
                }
                // Retrieve the current params object from AsyncStorage
                const storedParams = await AsyncStorage.getItem('homeParams');
                if (storedParams !== null) {
                  log(
                    `${params.tripNo}: ARRIVED: handleArrived - Retrieved storedParams:${storedParams}`,
                  );
                  console.log(
                    'handleArrived - Retrieved storedParams:',
                    storedParams,
                  );
                  // Parse the stored params into an object
                  const parsedParams = JSON.parse(storedParams);
                  // Update the value of a specific parameter element
                  parsedParams.step = 2; // Example: Update the 'custName' parameter
                  // Store the updated params back in AsyncStorage
                  await AsyncStorage.setItem(
                    'homeParams',
                    JSON.stringify(parsedParams),
                  );
                  // Update the state with the updated params
                  setParams(parsedParams);
                  navigation.navigate('Pickedup');
                  AsyncStorage.setItem('currentScreen', 'Pickedup');
                }
              } catch (error) {
                console.error(
                  'handleArrived - Error updating param value:',
                  error,
                );
                log(
                  `${params.tripNo}: ERROR - ARRIVED - handleArrived - Error updating param value:${error}`,
                );
                return;
              } finally {
                setIsArrivedLoading(false);
              }
            },
          },
        ],
        {cancelable: false},
      );
    } catch (error) {
      console.error('handleArrived - Error handling arrival:', error);
      log(
        `${params.tripNo}: ERROR - ARRIVED - handleArrived - Error handling arrival: ${error}`,
      );
      setIsArrivedLoading(false);
    }
    log(`${params.tripNo}: ARRIVED - handleArrived - Method Completed.`);
    return;
  };

  return (
    <View style={styles.container}>
      <NewHeader showTripDrawer={true} currentTripId={params.tripNo} currentDriverId={params.driverId} currentScreen={'ARRIVED'}/>
      <View style={{flex: 1}}>
        {/* Date/Time Display */}
        <View style={styles.datetime}>
          <Text allowFontScaling={false} style={styles.datetimeText}>
            {currentDateTime}
          </Text>
        </View>

        {/* Trip Details */}
        <View style={styles.tripDetails}>
          {[
            {
              label: translationManager.getTranslation('tripIdLabel'),
              value: params.tripNo,
            },
            {
              label: translationManager.getTranslation('reportTimeLabel'),
              value: params.reportTime,
            },
            {
              label: translationManager.getTranslation('guestNameLabel'),
              value: params.custName,
            },
          ].map((item, index) => (
            <View style={styles.row} key={index}>
              <Text allowFontScaling={false} style={styles.tripDetailsLabel}>
                {item.label}:
              </Text>
              <Text allowFontScaling={false} style={styles.tripDetailsData}>
                {item.value}
              </Text>
            </View>
          ))}

          {/* Guest Mobile */}
          <View style={styles.row}>
            <Text allowFontScaling={false} style={styles.tripDetailsLabel}>
              {translationManager.getTranslation('guestPhoneLabel')}:
            </Text>
            <View style={styles.rightSection}>
              <Text allowFontScaling={false} style={styles.tripDetailsData}>
                {params.custMobile}
              </Text>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handlePressPhoneNumber('Customer')}>
                <FontAwesomeIcon icon={faPhoneSquare} size={18} color="green" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Pickup Location */}
          <View style={styles.row}>
            <Text allowFontScaling={false} style={styles.tripDetailsLabel}>
              {translationManager.getTranslation('pickupAddressLabel')}:
            </Text>
            <Text allowFontScaling={false} style={styles.tripDetailsData}>
              {params.pickUpLoc}
            </Text>
          </View>

          {/* Remarks */}
          <View style={styles.row}>
            <Text allowFontScaling={false} style={styles.tripDetailsLabel}>
              {translationManager.getTranslation('dropLocationLabel')}:
            </Text>
            <Text allowFontScaling={false} style={styles.tripDetailsData}>
              {params.dropLoc}
            </Text>
          </View>
          {/* Booker Name */}
          <View style={styles.row}>
            <Text allowFontScaling={false} style={styles.tripDetailsLabel}>
              {translationManager.getTranslation('bookerNameLabel')}:
            </Text>
            <Text allowFontScaling={false} style={styles.tripDetailsData}>
              {params.bookerName}
            </Text>
          </View>

          {/* Booker Mobile */}
          <View style={styles.row}>
            <Text allowFontScaling={false} style={styles.tripDetailsLabel}>
              {translationManager.getTranslation('bookerPhoneLabel')}:
            </Text>
            <View style={styles.rightSection}>
              <Text allowFontScaling={false} style={styles.tripDetailsData}>
                {params.bookerMobile}
              </Text>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handlePressPhoneNumber('Booker')}>
                <FontAwesomeIcon icon={faPhoneSquare} size={18} color="green" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Separator */}
        {/* <View style={styles.ruler} /> */}

        {/* Main Content Card */}
        <View style={styles.card}>
          <View style={styles.tripContainer}>
            <View style={styles.step}>
              <FontAwesomeIcon icon={faCircleCheck} size={20} color="green" />
              <Text allowFontScaling={false} style={styles.caption}>
                {translationManager.getTranslation('start')}
              </Text>
            </View>
            <View style={styles.line} />
            <View style={styles.step}>
              <FontAwesomeIcon icon={faCar} size={20} color="#0c4160" />
              <Text allowFontScaling={false} style={styles.caption}>
                {translationManager.getTranslation('arrived')}
              </Text>
            </View>
            <View style={styles.line} />
            <View style={styles.step}>
              <FontAwesomeIcon icon={faCircle} size={20} color="gray" />
              <Text allowFontScaling={false} style={styles.caption}>
                {translationManager.getTranslation('pickedUp')}
              </Text>
            </View>
            <View style={styles.line} />
            <View style={styles.step}>
              <FontAwesomeIcon icon={faCircle} size={20} color="gray" />
              <Text allowFontScaling={false} style={styles.caption}>
                {translationManager.getTranslation('drop')}
              </Text>
            </View>
          </View>
          <View style={styles.mainContainer}>
            <Text allowFontScaling={false} style={styles.motivation}>
              {translationManager.getTranslation('arrivedQuote')}
            </Text>
          </View>
          {/* Car Animation */}
          {/* <View style={styles.animationContainer}>
          <Animated.View
            style={[
              styles.car,
              {
                transform: [
                  {
                    translateX: carPosition, // Move car horizontally
                  },
                ],
              },
            ]}
          >
            <Image
              source={require('../assets/car.png')} // Replace with your car image path
              style={styles.carImage}
            />
          </Animated.View>
        </View> */}
        </View>

        {/* Arrived Button */}
        <View style={styles.startButtonView}>
          <TouchableOpacity
            style={[
              styles.startButton,
              currentStep !== 0 && styles.disabledButton,
            ]}
            disabled={currentStep !== 0}
            onPress={handleArrived}>
            <Text allowFontScaling={false} style={styles.startButtonText}>
              {isArrivedLoading
                ? translationManager.getTranslation('loading')
                : translationManager.getTranslation('arrivedCaps')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Error Message */}
      {!isBgEnabled && (
        <View style={styles.errorMessageView}>
          <Text allowFontScaling={false} style={styles.errorMessage}>
            {translationManager.getTranslation('noBgPermission')}
          </Text>
        </View>
      )}

      <NewFooter
        driverId={params.driverId}
        driverPhone={params.driverPhone}
        showReport={true}
      />
    </View>
  );
};

export default ArrivedScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  datetime: {
    flex: 0.03,
    minHeight: 28,
    //height: '4%',
    backgroundColor: Colors.dateTimeBackground,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datetimeText: {
    fontSize: 14,
    color: Colors.dateTimeText,
    fontFamily: 'sans-serif-condensed',
    fontWeight: '700',
  },
  tripDetails: {
    flex: 0.47,
    //height: '35%',
    padding: 15,
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    margin: '3%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
  },
  tripDetailsLabel: {
    fontSize: 16,
    color: Colors.label,
    fontWeight: 'bold',
    fontFamily: 'sans-serif-condensed',
  },
  tripDetailsData: {
    flexShrink: 1,
    fontSize: 16,
    color: Colors.value,
    fontWeight: 'bold',
    fontFamily: 'sans-serif-condensed',
    textAlign: 'right',
  },
  callButton: {
    marginLeft: 5,
  },
  ruler: {
    // flex:0.002,
    height: '0.2%',
    backgroundColor: '#DDD',
    marginHorizontal: 15,
    marginVertical: '3%',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    height: '20%',
    minHeight: 50,
  },
  mainContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    height: '80%',
  },
  step: {
    alignItems: 'center',
  },
  line: {
    width: 40,
    height: 2,
    backgroundColor: 'gray',
    marginHorizontal: 5,
  },
  caption: {
    fontSize: 10,
    textAlign: 'center',
    color: 'black',
    marginTop: 5,
  },
  motivation: {
    fontSize: 24,
    color: '#555555',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
  },
  startButtonView: {
    flex: 0.1,
    //backgroundColor: Colors.actionButtons,
    borderRadius: 15,
    // justifyContent: 'center',
    // alignItems: 'center',
    width: '50%',
    alignSelf: 'center',
    marginVertical: '2%',
    //height: '6%',
  },
  startButton: {
    backgroundColor: Colors.actionButtons,
    padding: 13,
    borderRadius: 15,
    alignItems: 'center',
    width: '100%',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#DDD',
  },
  errorMessageView: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFE5E5',
    borderRadius: 10,
    marginHorizontal: 15,
  },
  errorMessage: {
    color: '#FF0000',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  card: {
    flex: 0.38,
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    //height: '33%',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: '2%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    justifyContent: 'center',
  },
});
