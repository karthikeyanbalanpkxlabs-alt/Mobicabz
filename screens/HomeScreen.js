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
import AsyncStorage from '@react-native-async-storage/async-storage';
import SQLite from 'react-native-sqlite-storage';
import moment from 'moment';
import Geolocation from '@react-native-community/geolocation';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import getLocation from 'react-native-get-location';
import FlowButton from '../components/FlowButton';
import ImageCapture from '../components/ImageCapture';
import Header from '../components/Header';
import Footer from '../components/Footer';
import {log, readLog, sendLogFile} from '../components/Logger';
import translations from '../translations';
import config from '../config';
import {
  startBackgroundService,
  stopBackgroundService,
} from '../Threads/BackgroundTask';
import {getDistance} from 'geolib';
import {useFocusEffect} from '@react-navigation/native';
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

const HomeScreen = ({route, language}) => {
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
  const phoneNumber = '+91' + params.custMobile;
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
  const [isStartLoading, setIsStartLoading] = useState(false);
  const [isArrivedLoading, setIsArrivedLoading] = useState(false);
  const [isArrivedSuccess, setIsArrivedSuccess] = useState(false);
  const [isPickedupLoading, setIsPickedupLoading] = useState(false);
  const [isCompleteLoading, setIsCompleteLoading] = useState(false);
  const [trackLocation, setTrackLocation] = useState('');
  const [isPickupUploaded, setIsPickupUploaded] = useState(false);
  const [location, setLocation] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [isBgTracking, setIsBgTracking] = useState(false);
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
        if (storedParams !== null && storedParams !== undefined) {
          // If stored parameters exist, use them
          try {
            const parsedParams = JSON.parse(storedParams);
            setParams(parsedParams);
          } catch (error) {
            console.error('Error parsing stored params:', error);
            setParams({}); // Fallback value
          }
        } else {
          // If no stored parameters, use the parameters passed through navigation
          setParams(route.params || {}); // Fallback value
        }
      } catch (error) {
        console.error('HomeScreen: Error retrieving params from AsyncStorage:', error);
      }
    };

    fetchParams();
  }, [route.params]);

  // To track the device is on Phone Call ot Not...
  // useEffect(() => {
  //   const callDetector = new CallDetectorManager(
  //     (event) => {
  //       if (event === 'Offhook' || event === 'Connected') {
  //         // Phone call is ongoing or just connected
  //         setIsOnCall(true);
  //       } else if (event === 'Disconnected') {
  //         // Call ended
  //         setIsOnCall(false);
  //       }
  //     },
  //     true, // Automatically starts detecting calls
  //     (error) => {
  //       console.log('Permission request error:', error);
  //     },
  //     {
  //       title: 'Phone State Permission',
  //       message: 'This app needs access to your phone state in order to detect calls.',
  //     }
  //   );

  //   return () => {
  //     callDetector && callDetector.dispose();
  //   };
  // }, []);

  // to track the current step after app close....
  useEffect(() => {
    if (params.step !== '') {
      setCurrentStep(params.step);
    }
  }, [params.step]);

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
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0'); // Get minutes and pad with leading zero if needed
      const ampm = hours >= 12 ? 'PM' : 'AM'; // Determine if it's AM or PM
      const formattedHours = hours % 12 || 12; // Convert hours to 12-hour format
      setCurrentDateTime(`${date} - ${formattedHours}:${minutes} ${ampm}`); // Set current date and time
    };

    updateDateTime();

    const intervalId = setInterval(updateDateTime, 1000);

    return () => clearInterval(intervalId);
  }, []);

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

  const getLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        const {latitude, longitude} = position.coords;
        setLat(latitude);
        setLong(longitude);
      },
      error => console.log(error),
      {enableHighAccuracy: false, timeout: 20000, maximumAge: 1000}, // Set maximumAge to 0 to force fetching a fresh position
    );
    return true;
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

  const handlePressPhoneNumber = () => {
    Alert.alert(
      translations[lang].alertHeading,
      'Call the Customer',
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

  const handlePickupKmImageSelect = async uri => {
    setPickupKmImageUri(uri);
    log(
      `${params.tripNo}: HMS: handlePickupKmImageSelect - Pickup Km image uploaded successfully${uri}`,
    );
    if (pickupKmImageUri != null) {
      setIsPickupUploaded(true);
      setCurrentStep(3);
    }
  };

  const sendStartKmReadings = async () => {
    try {
      const curDate = getCurrentDate();
      log(`${params.tripNo}: HMS: sendStartKmReadings - Method being called.`);
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

      const response = await Promise.race([
        fetch(apiUrlwithQuery, {
          method: 'GET',
          headers: {
            'Content-Type': 'multipart/form-data',
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
        `${params.tripNo}: HMS: sendStartKmReadings - Sending Start Km Reading Successful`,
      );
      // Return response status or data as needed
      return true;
    } catch (error) {
      console.error('sendStartKmReadings - Start Km API Error:', error);
      log(
        `${params.tripNo}: HMS: sendStartKmReadings - Error when sending Start Km Reading:`,
        error,
      );
      return false;
    }
  };

  const getCustomerStatusOnArrived = async () => {
    try {
      console.log('Driver ID from Arrived Status:' + params.driverId);
      console.log('Current Time on Getting Customer Status: ', currentTime);
      let arrivedTimeStamp = arrivedTime != null ? arrivedTime : currentTime;
      const apiUrl =
        config.apiGetStatus +
        params.tripNo +
        '&did=' +
        params.driverId +
        '&dt=' +
        arrivedTimeStamp +
        '&status=ARRIVED';
      log(
        `${params.tripNo}: HMS: getCustomerStatus - Get Customer Status URL: ${apiUrl}`,
      );
      console.log('Get Customer Status URL: ', apiUrl);

      const response = await Promise.race([
        fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(new Error('Request timed out, Check internet connection')),
            10000,
            // conTimeoutValue,
          ),
        ),
      ]);

      if (response.ok) {
        const data = await response.json();
        setCustomerStatus(data.StatusMessage);
        return true;
      } else {
        throw new Error('Failed to get Guest Status.' + response.StatusMessage);
      }
    } catch (error) {
      console.error('Error requesting Status:', error);
      log(
        `${params.tripNo}: HMS: getCustomerStatusOnArrived - Error requesting Status on Arrived: ${error}`,
      );
      return false;
    }
  };

  // const handlePickupKmImageSelect = async uri => {
  //   setPickupKmImageUri(uri);
  //   log('Pickup Km image uploaded succesfully ', uri);
  //   if (pickupKmImageUri != null) {
  //     setIsPickupUploaded(true);
  //     setCurrentStep(3);
  //   }
  // };

  // const sendStartKmReadings = async () => {
  //   try {
  //     const curDate = getCurrentDate();
  //     log('Send StartKmReading method called.');
  //     console.log('Driver ID from fetchStartKm method: ', params.driverId);
  //     const apiUrlwithQuery =
  //       config.apiGetStatus +
  //       params.tripNo +
  //       '&did=' +
  //       params.driverId +
  //       '&dt=' +
  //       curDate +
  //       '&status=STARTED';
  //     console.log('Start Km URL:', apiUrlwithQuery);
  //     // const formData = new FormData();
  //     // formData.append('kms', startKmReadings);
  //     // // formData.append('status', 'STARTED');
  //     // formData.append('date', currentTime);
  //     // // formData.append('file', imageData);

  //     // console.log('Form Data:', formData);

  //     const response = await Promise.race([
  //       fetch(apiUrlwithQuery, {
  //         method: 'GET',
  //         headers: {
  //           'Content-Type': 'multipart/form-data',
  //         },
  //       }),
  //       new Promise((_, reject) =>
  //         setTimeout(
  //           () =>
  //             reject(new Error('Request timed out, check internet connection')),
  //           conTimeoutValue,
  //         ),
  //       ),
  //     ]);

  //     if (!response.ok) {
  //       throw new Error('Network response was not ok');
  //     }

  //     console.log('Response status:', response.status);
  //     // Handle response data as per your application logic
  //     const responseData = await response.json();
  //     console.log('Response data:', responseData);
  //     log('Sending Start Km Reading Successful');
  //     // Return response status or data as needed
  //     return true;
  //   } catch (error) {
  //     console.error('Start Km API Error:', error);
  //     log('Error when sending Start Km Reading:', error);
  //     return false;
  //   }
  // };

  // const getCustomerStatus = async () => {
  //   try {
  //     console.log('Driver ID from Arrived Status:' + params.driverId);
  //     console.log('Current Time on Getting Customer Status: ', currentTime);
  //     const apiUrl =
  //       config.apiGetStatus +
  //       params.tripNo +
  //       '&did=' +
  //       params.driverId +
  //       '&dt=' +
  //       currentTime +
  //       '&status=ARRIVED';
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
  //           conTimeoutValue,
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
  //     log('Error requesting Status:', error);
  //     return false;
  //   }
  // };

  // const getStartKmReading = async (pickedupLatLong, pickupKmReadings) => {
  //   try {
  //     const address = params.vendorAddress;
  //     const apiKey = config.tomTomApiKey;

  //     let startLatLongArray;

  //     if (address) {
  //       const geocodeUrl = `https://api.tomtom.com/search/2/geocode/${address}.json?key=${apiKey}`;
  //       const response = await fetch(geocodeUrl);
  //       const data = await response.json();

  //       if (data.results && data.results.length > 0) {
  //         startLatLongArray = {
  //           latitude: data.results[0].position.lat,
  //           longitude: data.results[0].position.lon,
  //         };
  //         console.log(
  //           'startLatLongArray if geocode Success:',
  //           startLatLongArray,
  //         );
  //         log('Vendor Latlong fetched successfully:', startLatLongArray);
  //       } else {
  //         ToastAndroid.showWithGravity(
  //           'Cannot obtain vendor location.',
  //           ToastAndroid.SHORT,
  //           ToastAndroid.CENTER,
  //         );
  //         setStartKmReadings(0);
  //         throw new Error('No geocode results found');
  //       }
  //     } else {
  //       startLatLongArray = garageLatLong;
  //       console.log('latLong array if geocode not Success:', startLatLongArray);
  //       log('Vendor latlog cannot be fetched, so garage latlong added');
  //     }

  //     const pickedupLatLongArray = pickedupLatLong;
  //     console.log('pickedupLatLong value: ', pickedupLatLongArray);

  //     // Calculate the distance between the two points
  //     const distance = getDistance(startLatLongArray, pickedupLatLongArray);
  //     const startKmReadings =
  //       parseInt(pickupKmReadings) - parseInt(distance) / 1000;
  //     console.log('Start Km reading: ', startKmReadings);
  //     setStartKmReadings(parseInt(startKmReadings));
  //   } catch (error) {
  //     console.error('Error fetching or processing data:', error);
  //   }
  // };

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
        `${params.tripNo}: HMS: obtainStartLatLong - Start Location Lat Long : ${startLatLongArray.latitude}, ${startLatLongArray.longitude}`,
      );
      console.log('startLatLongArray if geocode Success:', startLatLongArray);
      return startLatLongArray;
    } else {
      log(
        `${params.tripNo}: HMS: obtainStartLatLong - Obtaining Geocode Failure.`,
      );
      return null;
    }
  };

  const sendPickupKmReadings = async () => {
    log(`${params.tripNo}: HMS: sendPickupKmReadings - Method being called...`);
    try {
      // const position = await getCurrentPosition();
      const position = await Promise.race([
        getCurrentPosition(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('getCurrentPosition timed out')),
            10000, // 10-second timeout
          ),
        ),
      ]);

      const pickedupLatLong = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      console.log('Current position on Pickedup: ', pickedupLatLong);
      log(
        `${params.tripNo}: HMS: sendPickupKmReadings - Current Position on Pickedup : ${pickedupLatLong}`,
      );

      // Get the Start km reading.....
      try {
        const address = params.vendorAddress;
        const apiKey = config.tomTomApiKey;

        if (address) {
          // const geocodeUrl = `https://api.tomtom.com/search/2/geocode/${address}.json?key=${apiKey}`;
          // const response = await fetch(geocodeUrl);
          // const data = await response.json();
          const startLatLongArray = await Promise.race([
            obtainStartLatLong(address),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error('obtainStartLatLong timed out')),
                18000, // 18-second timeout
              ),
            ),
          ]);
          // const startLatLongArray = await obtainStartLatLong(address);

          if (startLatLongArray != null) {
            setStartLatLongValue(startLatLongArray);
            console.log(
              'startLatLongArray if geocode Success:',
              startLatLongValue,
            );
            //--------------------------------------------------------------------------
            const pickedupLatLongArray = pickedupLatLong;
            console.log('pickedupLatLong value: ', pickedupLatLongArray);
            log(
              `${params.tripNo}: HMS: sendPickupKmReadings - Vendor Address obtained : ${address}`,
            );
            log(
              `${params.tripNo}: HMS: sendPickupKmReadings - Vendor LatLong fetched successfully: ${startLatLongArray.latitude}, ${startLatLongArray.longitude}`,
            );
            log(
              `${params.tripNo}: HMS: sendPickupKmReadings - Pickedup Location LatLong : ${pickedupLatLongArray.latitude}, ${pickedupLatLongArray.longitude}`,
            );

            // Calculate the distance between the two points

            // const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${startLatLongArray.latitude},${startLatLongArray.longitude}:${startLatLongArray.latitude},${startLatLongArray.longitude}/json?instructionsType=text&computeBestOrder=true&routeRepresentation=polyline&computeTravelTimeFor=all&vehicleHeading=20&report=effectiveSettings&routeType=eco&traffic=true&travelMode=car&vehicleCommercial=true&vehicleEngineType=combustion&key=${apiKey}`;
            const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${startLatLongArray.latitude},${startLatLongArray.longitude}:${pickedupLatLongArray.latitude},${pickedupLatLongArray.longitude}/json?instructionsType=text&computeBestOrder=true&routeRepresentation=polyline&computeTravelTimeFor=all&vehicleHeading=20&report=effectiveSettings&routeType=eco&traffic=true&travelMode=car&vehicleCommercial=true&vehicleEngineType=combustion&key=${apiKey}`;
            console.log('Route URL: ', routeUrl);
            log(
              `${params.tripNo}: HMS: sendPickupKmReadings - Route API URL to calculate the distance between Start Location and Pickup Location(with vendor address) : ${routeUrl}`,
            );
            const routeResponse = await fetch(routeUrl);
            const routeData = await routeResponse.json();
            const lengthInMeters = routeData.routes[0].summary.lengthInMeters;
            const distance = lengthInMeters / 1000;
            const startKmReading = parseFloat(pickupKmReadings) - distance;
            // console.log('Start LatLong Array :', startLatLongValue);
            // const distance = getDistance(startLatLongValue, pickedupLatLongArray);
            // const startKmReading =
            //   parseInt(pickupKmReadings) - parseInt(distance) / 1000;
            console.log('Start Km reading: ', startKmReading);
            log(
              `${params.tripNo}: HMS: sendPickupKmReadings - Calculated Start Km Reading : ${startKmReading}`,
            );
            const apiUrlwithQuery =
              config.apiPostKmReading +
              params.tripNo +
              '&did=' +
              params.driverId +
              '&status=PICKEDUP';
            console.log('Pickup Km URL:', apiUrlwithQuery);

            // const imageData = {
            //   uri: pickupKmImageUri,
            //   type: 'image/jpeg',
            //   name: 'pickupKmImage.jpg',
            // };

            const formData = new FormData();
            formData.append('gkms', parseInt(startKmReading));
            formData.append('kms', pickupKmReadings);
            // formData.append('file', imageData);
            formData.append('date', currentTime);

            log(
              `${params.tripNo}: HMS: sendPickupKmReadings - API URL to send Start and Pickedup Km Readings(with Vendor Address) : ${apiUrlwithQuery}`,
            );
            // log(
            //   `${params.tripNo}: HMS: sendPickupKmReadings - FormData sent along with the API URL : Garage Start Km- ${parseInt(
            //     startKmReading,
            //   )}; Pickedup Km - ${pickupKmReadings}; Pickedup Image - ${imageData}; Date - ${currentTime}`,
            // );
            console.log('Pickup Km Form Data:', formData);

            const response = await Promise.race([
              fetch(apiUrlwithQuery, {
                method: 'POST',
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
                body: formData,
              }),
              new Promise((_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new Error('Request timed out, check internet connection'),
                    ),
                  15000, //15 seconds..
                  // timeoutValue,
                ),
              ),
            ]);

            if (!response.ok) {
              console.error('Network response was not ok' + response);
            }
            log(
              `${params.tripNo}: HMS: sendPickupKmReadings - API Response after sending data to KmReading API(with Vendor Address) : ${response.status}`,
            );
            console.log('Response status:', response.status);
            const responseData = await response.json();
            console.log('Response data:', responseData);
            return true;
            //-----------------------------------------------------------------------
          } else {
            console.log('Cannot obtain vendor location.');
            log(
              `${params.tripNo}: HMS: sendPickupKmReadings - Cannot obtain Vendor Location on TomTom Map`,
            );
            ToastAndroid.showWithGravity(
              'Cannot obtain vendor location.',
              ToastAndroid.SHORT,
              ToastAndroid.CENTER,
            );
            //--------------------------------------------------------------------------
            const apiUrlwithQuery =
              config.apiPostKmReading +
              params.tripNo +
              '&did=' +
              params.driverId +
              '&status=PICKEDUP';
            console.log('Pickup Km URL:', apiUrlwithQuery);

            // const imageData = {
            //   uri: pickupKmImageUri,
            //   type: 'image/jpeg',
            //   name: 'pickupKmImage.jpg',
            // };

            const formData = new FormData();
            formData.append('gkms', 0);
            formData.append('kms', pickupKmReadings);
            // formData.append('file', imageData);
            formData.append('date', currentTime);

            // log(
            //   `${params.tripNo}: HMS: sendPickupKmReadings - FormData to send along with KmReading API(Invalid vendor address) : Garage Start Km- 0; Pickedup Km - ${pickupKmReadings}; Pickedup Image - ${imageData}; Date - ${currentTime}`,
            // );
            console.log('Pickup Km Form Data:', formData);

            const response = await Promise.race([
              fetch(apiUrlwithQuery, {
                method: 'POST',
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
                body: formData,
              }),
              new Promise((_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new Error(
                        'Sending Pickup Data Request timed out, check internet connection',
                      ),
                    ),
                  15000,
                  // timeoutValue,
                ),
              ),
            ]);

            if (!response.ok) {
              console.error('Network response was not ok' + response);
            }
            log(
              `${params.tripNo}: HMS: sendPickupKmReadings - API Response for Pickedup KmReading(Invalid vendor address) : ${response.status}`,
            );
            console.log('Response status:', response.status);
            const responseData = await response.json();
            console.log('Response data:', responseData);
            return true;
            //-----------------------------------------------------------------------
          }
        } else {
          setStartLatLongValue(garageLatLong);
          console.log(
            'startlatLong value if no vendor address provided:',
            startLatLongValue,
          );
          log(
            `${params.tripNo}: HMS: sendPickupKmReadings - Vendor latlog cannot be fetched, so garage latlong added`,
          );
          //--------------------------------------------------------------------------
          const pickedupLatLongArray = pickedupLatLong;
          console.log('pickedupLatLong value: ', pickedupLatLongArray);

          // Calculate the distance between the two points

          const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${garageLatLong.latitude},${garageLatLong.longitude}:${pickedupLatLongArray.latitude},${pickedupLatLongArray.longitude}/json?instructionsType=text&computeBestOrder=true&routeRepresentation=polyline&computeTravelTimeFor=all&vehicleHeading=20&report=effectiveSettings&routeType=eco&traffic=true&travelMode=car&vehicleCommercial=true&vehicleEngineType=combustion&key=${apiKey}`;
          log(
            `${params.tripNo}: HMS: sendPickupKmReadings - Route API URL to calculate the distance between Start Location and Pickup Location(without vendor address) : ${routeUrl}`,
          );
          console.log('Route URL: ', routeUrl);
          const routeResponse = await fetch(routeUrl);
          const routeData = await routeResponse.json();
          const lengthInMeters = routeData.routes[0].summary.lengthInMeters;
          const distance = lengthInMeters / 1000;
          const startKmReading = parseFloat(pickupKmReadings) - distance;
          // console.log('Start LatLong Array :', startLatLongValue);
          // const distance = getDistance(startLatLongValue, pickedupLatLongArray);
          // const startKmReading =
          //   parseInt(pickupKmReadings) - parseInt(distance) / 1000;
          console.log('Start Km reading: ', startKmReading);
          const apiUrlwithQuery =
            config.apiPostKmReading +
            params.tripNo +
            '&did=' +
            params.driverId +
            '&status=PICKEDUP';
          console.log('Pickup Km URL:', apiUrlwithQuery);

          // const imageData = {
          //   uri: pickupKmImageUri,
          //   type: 'image/jpeg',
          //   name: 'pickupKmImage.jpg',
          // };

          const formData = new FormData();
          formData.append('gkms', parseInt(startKmReading));
          formData.append('kms', pickupKmReadings);
          // formData.append('file', imageData);
          formData.append('date', currentTime);

          console.log('Pickup Km Form Data:', formData);
          log(
            `${params.tripNo}: HMS: sendPickupKmReadings - API URL to send Start and Pickedup Km Readings(without Vendor Address) : ${apiUrlwithQuery}`,
          );
          log(
            `${params.tripNo}: HMS: sendPickupKmReadings - FormData sent along with the API URL : ${formData}`,
          );
          const response = await Promise.race([
            fetch(apiUrlwithQuery, {
              method: 'POST',
              headers: {
                'Content-Type': 'multipart/form-data',
              },
              body: formData,
            }),
            new Promise((_, reject) =>
              setTimeout(
                () =>
                  reject(
                    new Error('Request timed out, check internet connection'),
                  ),
                15000,
                // timeoutValue,
              ),
            ),
          ]);

          if (!response.ok) {
            console.error('Network response was not ok' + response);
          }
          log(
            `${params.tripNo}: HMS: sendPickupKmReadings - API Response after sending data to KmReading API(without Vendor Address) : ${response.status}`,
          );
          console.log('Response status:', response.status);
          const responseData = await response.json();
          console.log('Response data:', responseData);
          return true;
          //-----------------------------------------------------------------------
        }
      } catch (error) {
        console.error(
          'Error fetching or processing data in sending PickupKm Readings:',
          error,
        );
      }

      // const startKmReadings = parseInt(startKm);
      // setStartKmReadings(startKmReadings);
      // log('Send PickupKmReading method called.');
      // console.log('Driver ID from fetchPickupKm method: ', params.driverId);
      log(
        `${params.tripNo}: HMS: sendPickupKmReadings - Sending Pickup Km Reading Successful`,
      );
    } catch (error) {
      console.error('Pickup Km API Error:', error);
      log(
        `${params.tripNo}: HMS: sendPickupKmReadings - Error when sending Pickup Km Reading::
        ${error}`,
      );
      return false;
    }
  };

  function validateInput(inputValue) {
    // Define a regular expression pattern to match only numbers
    var pattern = /^[0-9]*$/;
    // Test the input value against the pattern
    if (!pattern.test(inputValue)) {
      Alert.alert('Invalid Input', ' Enter only numbers.');
      return false; // Return false to indicate validation failure
    }
    return true; // Return true if validation succeeds
  }

  const reverseGeocode = async (latitude, longitude) => {
    // log(
    //   `https://api.tomtom.com/search/2/reverseGeocode/${latitude},${longitude}.json?key=${config.tomTomApiKey}`,
    // );
    console.log(
      `https://api.tomtom.com/search/2/reverseGeocode/${latitude},${longitude}.json?key=${config.tomTomApiKey}`,
    );

    try {
      const response = await fetch(
        `https://api.tomtom.com/search/2/reverseGeocode/${latitude},${longitude}.json?key=${config.tomTomApiKey}`,
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const responseData = await response.json();
      // log('Tom Tom response data: ', responseData);
      console.log('Tom Tom response data: ', responseData);

      if (
        responseData &&
        responseData.addresses &&
        responseData.addresses.length > 0
      ) {
        const firstAddress = responseData.addresses[0];
        const locationName = firstAddress.address.freeformAddress;
        log(
          `${params.tripNo}: HMS: reverseGeocode - Location Name from Tom Tom: ${locationName}`,
        );
        console.log('Location Name from Tom Tom: ', locationName);
        return locationName;
      } else {
        return 'Address not found';
      }
    } catch (error) {
      console.error('Error fetching reverse geocode:', error);
      log(
        `${params.tripNo}: HMS: reverseGrocode - Error fetching reverse geocode: ${error}`,
      );
      return 'Error fetching address';
    }
  };

  // const reverseGeocode = async (latitude, longitude) => {
  //   console.log(
  //     `https://api.tomtom.com/search/2/reverseGeocode/${latitude},${longitude}.json?key=${config.tomTomApiKey}`,
  //   );
  //   try {
  //     const response = await fetch(
  //       `https://api.tomtom.com/search/2/reverseGeocode/${latitude},${longitude}.json?key=${config.tomTomApiKey}`,
  //     );

  //     if (!response.ok) {
  //       throw new Error('Network response was not ok');
  //     }

  //     const responseData = await response.json();
  //     console.log('tom tom response data: ', responseData);

  //     if (
  //       responseData &&
  //       responseData.addresses &&
  //       responseData.addresses.length > 0
  //     ) {
  //       const firstAddress = responseData.addresses[0];
  //       const locationName = firstAddress.address.freeformAddress;
  //       console.log('Location Name from Tom Tom: ', locationName);
  //       return locationName;
  //     } else {
  //       return 'Address not found';
  //     }
  //   } catch (error) {
  //     console.error('Error fetching reverse geocode:', error);
  //     return 'Error fetching address';
  //   }
  // };

  // const startLocationThread = () => {
  //   if (!locationThread) {
  //     const newThread = new Thread('../Threads/locationThread.js');

  //     // Handle messages from the thread
  //     newThread.onmessage = (message) => {
  //       if (message.type === 'log') {
  //         console.log(message.message);
  //       }
  //     };

  //     setLocationThread(newThread);
  //     console.log('Location thread started');
  //   }
  // };

  // const stopLocationThread = () => {
  //   if (locationThread) {
  //     locationThread.terminate();
  //     setLocationThread(null);
  //     console.log('Location thread stopped');
  //   }
  // };

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

  // const sendLocationDataToAPI = async (latitude, longitude) => {
  //   try {
  //     // const locationName = 'NA';
  //     const curDate = getCurrentDate();
  //     const curTime = getCurrentTime();
  //     const timeStamp = curDate + ' ' + curTime;
  //     const locationName = await reverseGeocode(latitude, longitude);
  //     console.log('Location Name from Method:', locationName);
  //     const queryStringValue = `${params.tripNo}|$|${timeStamp}|$|${latitude}|$|${longitude}|$|${locationName}`;
  //     console.log('Query String:', queryStringValue);
  //     log('Location query string');
  //     const response = await fetch(config.apiPostLocation + queryStringValue, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //     });
  //     const data = await response.json();
  //     console.log('Sending current location API Response:', data);
  //     log('Sending current location API Response:', data);
  //   } catch (error) {
  //     console.error('Error sending Location data to API:', error);
  //     log('Error sending Location data to API:', error);
  //   }
  // };

  const startBgTracking = async () => {
    await startBackgroundService(params.tripNo);
    setIsBgTracking(true);
  };

  const stopBgTracking = async () => {
    await stopBackgroundService();
    setIsBgTracking(false);
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
      return false;
    }
  };

  //request permission using the above methods..
  const bgLocationPermission = async () => {
    if (await requestForegroundLocationPermission()) {
      if (await requestBackgroundLocationPermission()) {
        log(
          `${params.tripNo}: HMS: handleArrived - Location permission granted when Arrived clicked`,
        );
        console.log(
          `${params.tripNo}: handleArrived - Location permission granted when Arrived clicked`,
        );
        getLocation();
        startBgTracking();
        return true;
      } else {
        log(
          `${params.tripNo}: HMS: handleArrived - Background Location permission denied`,
        );
        console.log('handleArrived - Background Location permission denied');
        Alert.alert(
          'Allow all the Time',
          'Select "Allow all the time" in the Location permission settings.',
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
        `${params.tripNo}: HMS: handleArrived - Foreground Location permission denied`,
      );
      console.log('Foreground Location permission denied');
      Alert.alert(
        'Location permission needed',
        'Enable Location permission".',
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

  const handleStart = async () => {
    log(
      `${params.tripNo}: HMS: handleStart - Trip has been started for TripID: ${params.tripNo}`,
    );
    log(`${params.tripNo}: HMS: handleStart - Start button clicked...`);
    log(`${params.tripNo}: HMS: handleStart - Method being called.`);
    setIsStartLoading(true);
    setTripStatus('STARTED');
    const destination = params.pickUpLoc;
    const deepLinkURL = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    log(`${params.tripNo}: HMS: handleStart - DeeplinkURL: ${deepLinkURL}`);
    console.log('handleStart - DeeplinkURL', deepLinkURL);

    const callSendStartKmReadings = await sendStartKmReadings();
    if (!callSendStartKmReadings) {
      Alert.alert(
        'Low or No Network Connection',
        'Check your Inernet Connection and click Start again.',
        [{text: 'Ok'}],
        {cancelable: false},
      );
      setIsStartLoading(false);
      return;
    }
    // if (!callSendStartKmReadings && isOnCall){
    //   Alert.alert(
    //     'Call Ongoing',
    //     'No network connection. Try after finishing the call.',
    //     [{text: 'Ok'}],
    //     {cancelable: false},
    //   );
    //   setIsStartLoading(false);
    //   return;
    // }

    Linking.openURL(deepLinkURL);
    setCurrentStep(1);
    // startBackgroundTask();
    // const interval = setInterval(getLocationAndSendData, 2 * 60 * 1000);
    // setTrackLocation(interval);
    // console.log('Interval set up for tracking trip every 20 minutes');
    try {
      // Retrieve the stored parameters from AsyncStorage
      const storedParams = await AsyncStorage.getItem('homeParams');
      log(
        `${params.tripNo}: HMS: handleStart - Retrieved storedParam from Start: ${storedParams}`,
      );
      console.log(
        'handleStart - Retrieved storedParam from Start:',
        storedParams,
      );
      if (storedParams !== null) {
        // Parse the stored parameters into an object
        const parsedParams = JSON.parse(storedParams);
        // Add additional values to the params object
        const updatedParams = {
          ...parsedParams,
          step: 1,
        };
        // Store the updated parameters back in AsyncStorage
        await AsyncStorage.setItem('homeParams', JSON.stringify(updatedParams));
        // Update the state with the updated parameters
        setParams(updatedParams);
        log(
          `${params.tripNo}: HMS: handleStart - Additional param values added in Start.`,
        );
        console.log('handleStart - Additional param values added in Start.');
      }
    } catch (error) {
      console.error('handleStart - Error adding extra values:', error);
      log(
        `${params.tripNo}: HMS: handleStart - Error adding extra values: ${error}`,
      );
    }
    setIsStartLoading(false);
    log(`${params.tripNo}: HMS: handleStart - Method Completed.`);
  };

  // const bgLocationPermission = async () => {
  //   const granted = await PermissionsAndroid.request(
  //     PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  //     {
  //       title: 'Location Permission',
  //       message: 'App needs access to your location',
  //       buttonPositive: 'OK',
  //       cancelable: false,
  //     },
  //   );
  //   if (granted === PermissionsAndroid.RESULTS.GRANTED) {
  //     const backgroundLocationGranted =
  //       await PermissionsAndroid.request(
  //         PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
  //         {
  //           title: 'Background Location Permission Needed',
  //           message:
  //             'Select "Allow all the time" in the Location permission settings.',
  //           buttonPositive: 'OK',
  //           cancelable: false,
  //         },
  //       );
  //     if (
  //       backgroundLocationGranted ===
  //       PermissionsAndroid.RESULTS.GRANTED
  //     ) {
  //       log(
  //         `${params.tripNo}: HMS: handleArrived - Location permission granted when Arrived clicked`
  //       );
  //       console.log(
  //         `${params.tripNo}: handleArrived - Location permission granted when Arrived clicked`
  //       );
  //       getLocation();
  //       //Start Background Location tracking.....
  //       startBgTracking();
  //       return true;
  //     } else {
  //       log(`${params.tripNo}: HMS: handleArrived - Background Location permission denied`);
  //       console.log('handleArrived - Background Location permission denied');
  //       Alert.alert(
  //         'Allow all the Time',
  //         'Select "Allow all the time" in the Location settings".',
  //         [{text: 'Ok'}],
  //         {cancelable: false},
  //       );
  //       setIsArrivedLoading(false);
  //       return;
  //     }
  //   }
  //   else{
  //     console.log('Location permission denied.');
  //     Alert.alert(
  //       'Location permisssion needed',
  //       'Enable Location permission".',
  //       [
  //         {
  //           text: 'OK',
  //           onPress: () => {
  //             bgLocationPermission();
  //           },
  //         },
  //       ],
  //       {cancelable: false},
  //     );
  //     setIsArrivedLoading(false);
  //   }
  // };
  // const handleStart = async () => {
  //   setIsStartLoading(true);
  //   setTripStatus('STARTED');
  //   const destination = params.pickUpLoc;
  //   const deepLinkURL = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  //   console.log('DeeplinkURL', deepLinkURL);

  //   const callSendStartKmReadings = await sendStartKmReadings();
  //   if (!callSendStartKmReadings) {
  //     Alert.alert(
  //       'Network Error',
  //       'No network connection. Please try again later.',
  //       [{text: 'Ok'}],
  //       {cancelable: false},
  //     );
  //     setIsStartLoading(false);
  //     return;
  //   }

  //   Linking.openURL(deepLinkURL);
  //   setCurrentStep(1);
  //   // startBackgroundTask();
  //   // const interval = setInterval(getLocationAndSendData, 2 * 60 * 1000);
  //   // setTrackLocation(interval);
  //   // console.log('Interval set up for tracking trip every 20 minutes');
  //   try {
  //     // Retrieve the stored parameters from AsyncStorage
  //     const storedParams = await AsyncStorage.getItem('homeParams');
  //     console.log('Retrieved storedParam from Start:', storedParams);
  //     if (storedParams !== null) {
  //       // Parse the stored parameters into an object
  //       const parsedParams = JSON.parse(storedParams);
  //       // Add additional values to the params object
  //       const updatedParams = {
  //         ...parsedParams,
  //         step: 1,
  //       };
  //       // Store the updated parameters back in AsyncStorage
  //       await AsyncStorage.setItem('homeParams', JSON.stringify(updatedParams));
  //       // Update the state with the updated parameters
  //       setParams(updatedParams);
  //       console.log('Additional param values added in Start.');
  //     }
  //   } catch (error) {
  //     console.error('Error adding extra values:', error);
  //   }
  //   setIsStartLoading(false);
  // };

  // const handleArrived = async () => {
  //   setIsArrivedLoading(true);
  //   try {
  //     const callGetCustomerStatus = await getCustomerStatus();
  //     if (!callGetCustomerStatus) {
  //       Alert.alert(
  //         'Network Error',
  //         'No network connection. Please try again later.',
  //         [{text: 'Ok'}],
  //         {cancelable: false},
  //       );
  //       setIsArrivedLoading(false);
  //       return;
  //     }
  //     Alert.alert(
  //       translations[lang].alertHeading,
  //       'Confirm Arrival?',
  //       [
  //         {
  //           text: 'No',
  //           style: 'cancel',
  //         },
  //         {
  //           text: 'Yes',
  //           onPress: async () => {
  //             console.log('Arrived at Pickup Location');
  //             log('Arrived at Pickup Location');
  //             setCurrentStep(2);
  //             try {
  //               // Retrieve the current params object from AsyncStorage
  //               const storedParams = await AsyncStorage.getItem('homeParams');
  //               if (storedParams !== null) {
  //                 console.log('Retrieved storedParams:', storedParams);
  //                 // Parse the stored params into an object
  //                 const parsedParams = JSON.parse(storedParams);
  //                 // Update the value of a specific parameter element
  //                 parsedParams.step = 2; // Example: Update the 'custName' parameter
  //                 // Store the updated params back in AsyncStorage
  //                 AsyncStorage.setItem(
  //                   'homeParams',
  //                   JSON.stringify(parsedParams),
  //                 );
  //                 // Update the state with the updated params
  //                 setParams(parsedParams);
  //               }
  //             } catch (error) {
  //               console.error('Error updating param value:', error);
  //             }
  //           },
  //         },
  //       ],
  //       {cancelable: false},
  //     );
  //   } finally {
  //     setIsArrivedLoading(false);
  //   }
  // };

  const handleArrived = async () => {
    log(`${params.tripNo}: HMS: handleArrived - Arrived button clicked...`);
    log(`${params.tripNo}: HMS: handleArrived - Method being called.`);
    try {
      Alert.alert(
        translations[lang].alertHeading,
        'Confirm Arrival?',
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
              const locationPermission = await bgLocationPermission();
              if (locationPermission != true) {
                console.log('Location Permission Denied.');
                return;
              }
              //---------------------------------------------------------
              // const granted = await PermissionsAndroid.request(
              //   PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
              //   {
              //     title: 'Location Permission',
              //     message: 'App needs access to your location',
              //     buttonPositive: 'OK',
              //     cancelable: false,
              //   },
              // );
              // if (granted === PermissionsAndroid.RESULTS.GRANTED) {
              //   const backgroundLocationGranted =
              //     await PermissionsAndroid.request(
              //       PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
              //       {
              //         title: 'Background Location Permission Needed',
              //         message:
              //           'Select "Allow all the time" in the Location permission settings.',
              //         buttonPositive: 'OK',
              //         cancelable: false,
              //       },
              //     );
              //   if (
              //     backgroundLocationGranted ===
              //     PermissionsAndroid.RESULTS.GRANTED
              //   ) {
              //     log(
              //       `${params.tripNo}: HMS: handleArrived - Location permission granted when Arrived clicked`
              //     );
              //     console.log(
              //       `${params.tripNo}: handleArrived - Location permission granted when Arrived clicked`
              //     );
              //     getLocation();
              //     //Start Background Location tracking.....
              //     startBgTracking();
              //   } else {
              //     log(`${params.tripNo}: HMS: handleArrived - Background Location permission denied`);
              //     console.log('handleArrived - Background Location permission denied');
              //     Alert.alert(
              //       'Allow all the Time',
              //       'Select "Allow all the time" in the Location settings".',
              //       [{text: 'Ok'}],
              //       {cancelable: false},
              //     );
              //     setIsArrivedLoading(false);
              //     return;
              //   }
              // }
              // else{
              //   console.log('Location permission denied.');
              //   Alert.alert(
              //     'Location permisssion needed',
              //     'Enable Location permission".',
              //     [{text: 'Ok'}],
              //     {cancelable: false},
              //   );
              //   setIsArrivedLoading(false);
              // }
              //-------------------------------------------------------------------
              console.log('handleArrived - Arrived at Pickup Location');
              log(
                `${params.tripNo}: HMS: handleArrived - Arrived at Pickup Location`,
              );
              try {
                const callGetCustomerStatus =
                  await getCustomerStatusOnArrived();
                if (callGetCustomerStatus) {
                  setIsArrivedSuccess(true);
                  setCurrentStep(2);
                } else {
                  setIsArrivedSuccess(false);
                  Alert.alert(
                    'Low or No Network Connection',
                    'Check your Internet Connection and click Arrived again.',
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
                    `${params.tripNo}: HMS: handleArrived - Retrieved storedParams:${storedParams}`,
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
                }
              } catch (error) {
                console.error(
                  'handleArrived - Error updating param value:',
                  error,
                );
                log(
                  `${params.tripNo}: HMS: handleArrived - Error updating param value:${error}`,
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
        `${params.tripNo}: HMS: handleArrived - Error handling arrival: ${error}`,
      );
      setIsArrivedLoading(false);
    }
    log(`${params.tripNo}: HMS: handleArrived - Method Completed.`);
    return;
  };

  const handlePickedUp = async () => {
    log(`${params.tripNo}: HMS: handlePickedUp - Picked Up button clicked...`);
    log(`${params.tripNo}: HMS: handlePickedUp - Method being called.`);
    // if(isArrivedSuccess!=true){
    //   getCustomerStatusOnArrived();
    // }
    if (pickupKmReadings === '') {
      Alert.alert('Alert', 'Enter Pickup kilometer reading before continuing.');
      setCurrentStep(2);
      return;
    }
    if (!validateInput(pickupKmReadings)) {
      setCurrentStep(2);
      setPickupKmReadings('');
      return; // Exit early if validation fails
    }

    // if (pickupKmImageUri === '') {
    //   Alert.alert(
    //     'Alert',
    //     'Upload the pickup kilometer image before continuing.',
    //   );
    //   setCurrentStep(2);
    //   return;
    // }

    if (parseInt(pickupKmReadings) <= parseInt(startKmReadings)) {
      Alert.alert(
        'Alert',
        'Pickup kilometer should not be less than or equal to Start kilometer.',
      );
      setCurrentStep(2);
      setPickupKmReadings('');
      return;
    }

    try {
      Alert.alert(
        translations[lang].alertHeading,
        'Confirm Pickup?',
        [
          {
            text: 'No',
            style: 'cancel',
            onPress: () => {
              setIsPickedupLoading(false);
            },
          },
          {
            text: 'Yes',
            onPress: async () => {
              setIsPickedupLoading(true);
              if (!isBgTracking) {
                startBgTracking();
              }
              try {
                const callSendPickupKmReadings = await sendPickupKmReadings();

                if (!callSendPickupKmReadings) {
                  Alert.alert(
                    'Low or No Network Connection',
                    'Check your Internet Connection and click Picked Up again.',
                    [{text: 'Ok'}],
                    {cancelable: false},
                  );
                  setIsPickedupLoading(false);
                  return;
                }

                try {
                  // Retrieve the stored parameters from AsyncStorage
                  const storedParams = await AsyncStorage.getItem('homeParams');
                  console.log('Retrieved storedParam:', storedParams);
                  if (storedParams !== null) {
                    // Parse the stored parameters into an object
                    const parsedParams = JSON.parse(storedParams);
                    // Add additional values to the params object
                    const updatedParams = {
                      ...parsedParams,
                      startKmReadings: parseInt(startKmReadings),
                      startLatLongValue: startLatLongValue,
                      pickupKmReadings: pickupKmReadings,
                      // pickupKmImageUri: pickupKmImageUri,
                      tripStatus: tripStatus,
                      step: 4,
                    };
                    // Store the updated parameters back in AsyncStorage
                    await AsyncStorage.setItem(
                      'homeParams',
                      JSON.stringify(updatedParams),
                    );
                    // Update the state with the updated parameters
                    setParams(updatedParams);
                    console.log('Additional param values added in Pickup.');
                    console.log('Pickup Completed');
                    setTripStatus('PICKEDUP');
                    setCurrentStep(4);
                  }
                } catch (error) {
                  console.error('Error adding extra values:', error);
                }
              } finally {
                setIsPickedupLoading(false);
              }
            },
          },
        ],
        {cancelable: false},
      );
    } catch (error) {
      console.error('Error handling pickup:', error);
      setIsPickedupLoading(false);
    }
    log(`${params.tripNo}: HMS: handlePickedUp - Method Completed.`);
  };

  // No.1......................
  // const handleCompleteTrip = async () => {
  //   log(
  //     `${params.tripNo}: HMS: handleCompleteTrip - Complete Trip button clicked...`,
  //   );
  //   log(`${params.tripNo}: HMS: handleCompleteTrip - Method being called...`);
  //   // if(isArrivedSuccess!=true){
  //   //   getCustomerStatusOnArrived();
  //   // }
  //   if (pickupKmReadings === '') {
  //     Alert.alert('Alert', 'Enter Pickup kilometer reading before continuing.');
  //     return;
  //   }
  //   if (!validateInput(pickupKmReadings)) {
  //     return; // Exit early if validation fails
  //   }

  //   // if (params.pickupKmImageUri === '' && tripStatus !== 'PICKEDUP') {
  //   //   Alert.alert(
  //   //     'Alert',
  //   //     'Upload the pickup kilometer image before continuing.',
  //   //   );
  //   //   return;
  //   // }

  //   if (parseInt(pickupKmReadings) <= parseInt(params.startKmReadings)) {
  //     Alert.alert(
  //       'Alert',
  //       'Pickup kilometer should not be less than or equal to Start kilometer.',
  //     );
  //     setPickupKmReadings('0');
  //     return;
  //   }
  //   setTripCompletedTime(currentTime);
  //   // clearInterval(trackLocation);
  //   Alert.alert(
  //     translations[lang].alertHeading,
  //     'Get Guest Signature',
  //     [
  //       {
  //         text: 'Cancel',
  //         style: 'cancel',
  //       },
  //       {
  //         text: 'Proceed',
  //         onPress: async () => {
  //           console.log('Trip Completed');
  //           //Stop BackgroundTask..
  //           stopBgTracking();
  //           // const getCompLoc = getLocation();
  //           const getCompLoc = await Promise.race([
  //             getLocation(),
  //             new Promise((_, reject) =>
  //               setTimeout(
  //                 () => reject(new Error('getLocation to obtain Complete LatLong failed.')),
  //                 10000, // 18-second timeout
  //               ),
  //             ),
  //           ]);
  //           if (getCompLoc == true) {
  //             const completeLoc = {lat, long};
  //             setTripCompleteLoc(completeLoc);
  //             try {
  //               // Retrieve the current params object from AsyncStorage
  //               const storedParams = await AsyncStorage.getItem('homeParams');
  //               if (storedParams !== null) {
  //                 console.log('Retrieved storedParams:', storedParams);
  //                 // Parse the stored params into an object
  //                 const parsedParams = JSON.parse(storedParams);
  //                 // Update the value of a specific parameter element
  //                 parsedParams.step = 0; // Example: Update the 'custName' parameter
  //                 // Store the updated params back in AsyncStorage
  //                 AsyncStorage.setItem(
  //                   'homeParams',
  //                   JSON.stringify(parsedParams),
  //                 );
  //                 // Update the state with the updated params
  //                 setParams(parsedParams);
  //                 console.log('Current Step changed:', params.step);
  //               }
  //             } catch (error) {
  //               console.error('Error updating param value:', error);
  //               Alert.alert(
  //                 'Low or No Network Connection',
  //                 'Check your Inernet Connection and click Start again.',
  //                 [{text: 'Ok'}],
  //                 {cancelable: false},
  //               );
  //               return;
  //             }
  //           }
  //           AsyncStorage.setItem('currentScreen', 'Signature');
  //           const startLatLong = await obtainStartLatLong(params.vendorAddress);
  //           const signParams = {
  //             startKmReadings: params.startKmReadings,
  //             pickupKmReadings: params.pickupKmReadings || pickupKmReadings,
  //             tripNo: params.tripNo,
  //             custName: params.custName,
  //             custMobile: params.custMobile,
  //             pickUpLoc: params.pickUpLoc,
  //             dropLoc: params.dropLoc,
  //             // pickupKmImageUri: params.pickupKmImageUri || pickupKmImageUri,
  //             driverId: params.driverId,
  //             driverPhone: params.driverPhone,
  //             tripCompletedTime: currentTime,
  //             tripCompleteLoc: completeLoc,
  //             vendorAddress: params.vendorAddress,
  //             startLatLong: startLatLong,
  //           };
  //           setPickupKmReadings('');
  //           setPickupKmImageUri('');
  //           AsyncStorage.setItem('signParams', JSON.stringify(signParams));
  //           navigation.navigate('Signature', signParams);
  //           log(`${
  //             params.tripNo
  //           }: HMS: handleCompleteTrip - Data navigated to the Signature screen : startKmReadings: ${
  //             params.startKmReadings
  //           },
  //             pickupKmReadings: ${params.pickupKmReadings || pickupKmReadings},
  //             tripNo: ${params.tripNo},
  //             custName: ${params.custName},
  //             custMobile: ${params.custMobile},
  //             pickUpLoc: ${params.pickUpLoc},
  //             dropLoc: ${params.dropLoc},
  //             pickupKmImageUri: ${params.pickupKmImageUri || pickupKmImageUri},
  //             driverId: ${params.driverId},
  //             driverPhone: ${params.driverPhone},
  //             tripCompletedTime: ${currentTime},
  //             tripCompleteLoc: ${completeLoc.latitude}, ${
  //             completeLoc.longitude
  //           },
  //             vendorAddress: ${params.vendorAddress},
  //             startLatLong: ${startLatLong.latitude}, ${
  //             startLatLong.longitude
  //           }`);
  //           const granted = await PermissionsAndroid.request(
  //             PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  //           );
  //           if (granted === PermissionsAndroid.RESULTS.GRANTED) {
  //             setIsCompleteLoading(true);
  //             console.log('Location permission granted');
  //             // const getCompleteLocation = getLocation();
  //             const getCompleteLocation = await Promise.race([
  //               getLocation(),
  //               new Promise((_, reject) =>
  //                 setTimeout(
  //                   () => reject(new Error('getLocation to send Complete LocationDetails failed.')),
  //                   10000, // 18-second timeout
  //                 ),
  //               ),
  //             ]);
  //             if(getCompleteLocation == true){
  //             try {
  //               const curDate = getCurrentDate();
  //               const curTime = getCurrentTime();
  //               const timeStamp = curDate + ' ' + curTime;
  //               const position = await getCurrentPosition();
  //               const {latitude, longitude} = position.coords;
  //               const locationName = await reverseGeocode(latitude, longitude);
  //               console.log('Location Name from handleComplete:', locationName);
  //               console.log(
  //                 params.tripNo,
  //                 timeStamp,
  //                 latitude,
  //                 longitude,
  //                 locationName,
  //               );
  //               const queryStringValue = `${params.tripNo}|$|${timeStamp}|$|${latitude}|$|${longitude}|$|${locationName}`;
  //               console.log('Query String:', queryStringValue);
  //               const response = await Promise.race([
  //                 fetch(config.apiPostLocation + queryStringValue, {
  //                   method: 'POST',
  //                   headers: {
  //                     'Content-Type': 'application/json',
  //                   },
  //                 }),
  //                 new Promise((_, reject) =>
  //                   setTimeout(
  //                     () =>
  //                       reject(
  //                         new Error(
  //                           'Request timed out, check internet connection',
  //                         ),
  //                       ),
  //                     // conTimeoutValue,
  //                     20000,
  //                   ),
  //                 ),
  //               ]);
  //               const data = await response.json();
  //               console.log('Complete location API Response:', data);
  //             } catch (error) {
  //               console.error(
  //                 'Error sending Complete Location data to API:',
  //                 error,
  //               );
  //               log(
  //                 `${params.tripNo}: HMS: handleCompleteTrip - Error sending Complete Location data to API: ${error}`,
  //               );
  //             } finally {
  //               setIsCompleteLoading(false);
  //             }
  //           }
  //           else{
  //             Alert.alert(
  //               'Low or No Network Connection',
  //               'Check your Inernet Connection and click Start again.',
  //               [{text: 'Ok'}],
  //               {cancelable: false},
  //             );
  //             console.log('Cannot obtain Complete location to send Location Details.');
  //             return;
  //           }
  //           } else {
  //             console.log('Location permission denied');
  //             log(
  //               `${params.tripNo}: HMS: handleCompleteTrip - Location permission denied`,
  //             );
  //           }
  //         },
  //       },
  //     ],
  //     {cancelable: false},
  //   );
  //   log(`${params.tripNo}: HMS: handleCompleteTrip - Method completed.`);
  // };

  //No.2...............................
  const handleCompleteTrip = async () => {
    log(
      `${params.tripNo}: HMS: handleCompleteTrip - Complete Trip button clicked...`,
    );
    log(`${params.tripNo}: HMS: handleCompleteTrip - Method being called...`);

    if (pickupKmReadings === '') {
      Alert.alert('Alert', 'Enter Pickup kilometer reading before continuing.');
      return;
    }
    if (!validateInput(pickupKmReadings)) {
      return; // Exit early if validation fails
    }

    if (parseInt(pickupKmReadings) <= parseInt(params.startKmReadings)) {
      Alert.alert(
        'Alert',
        'Pickup kilometer should not be less than or equal to Start kilometer.',
      );
      setPickupKmReadings('0');
      return;
    }

    setTripCompletedTime(currentTime);

    Alert.alert(
      translations[lang].alertHeading,
      'Get Guest Signature',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Proceed',
          onPress: async () => {
            console.log('Trip Completed');
            stopBgTracking();

            try {
              setIsCompleteLoading(true);
              //----------------------------------------------------------------------------
              const storedParams = await AsyncStorage.getItem('homeParams');
              if (storedParams !== null) {
                const parsedParams = JSON.parse(storedParams);
                // parsedParams.step = 0;
                AsyncStorage.setItem(
                  'homeParams',
                  JSON.stringify(parsedParams),
                );
                setParams(parsedParams);
                console.log('Current Step changed:', parsedParams.step);
              } else {
                throw new Error('No parameters found in AsyncStorage.');
              }
              //----------------------------------------------------------------------------
              const getCompLoc = await Promise.race([
                getLocation(),
                new Promise((_, reject) =>
                  setTimeout(
                    () =>
                      reject(
                        new Error(
                          'getLocation to obtain Complete LatLong failed.',
                        ),
                      ),
                    10000,
                  ),
                ),
              ]);
              if (!getCompLoc) {
                throw new Error('Failed to obtain complete location.');
              }
              const completeLoc = {lat, long};
              setTripCompleteLoc(completeLoc);
              console.log(
                'completeLoc' +
                  tripCompleteLoc.latitude +
                  tripCompleteLoc.longitude,
              );

              const startLatLong = await obtainStartLatLong(
                params.vendorAddress,
              );
              const signParams = {
                startKmReadings: params.startKmReadings,
                pickupKmReadings: params.pickupKmReadings || pickupKmReadings,
                tripNo: params.tripNo,
                custName: params.custName,
                custMobile: params.custMobile,
                pickUpLoc: params.pickUpLoc,
                dropLoc: params.dropLoc,
                driverId: params.driverId,
                driverPhone: params.driverPhone,
                tripCompletedTime: currentTime,
                tripCompleteLoc: completeLoc,
                vendorAddress: params.vendorAddress,
                startLatLong: startLatLong,
              };
              AsyncStorage.setItem('signParams', JSON.stringify(signParams));
              // navigation.navigate('Signature', signParams);

              const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
              );

              if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                console.log('Location permission granted');
                const getCompleteLocation = await Promise.race([
                  getLocation(),
                  new Promise((_, reject) =>
                    setTimeout(
                      () =>
                        reject(
                          new Error(
                            'getLocation to send Complete LocationDetails failed.',
                          ),
                        ),
                      10000,
                    ),
                  ),
                ]);

                if (getCompleteLocation) {
                  try {
                    const curDate = getCurrentDate();
                    const curTime = getCurrentTime();
                    const timeStamp = curDate + ' ' + curTime;
                    const position = await getCurrentPosition();
                    const {latitude, longitude} = position.coords;
                    const locationName = await reverseGeocode(
                      latitude,
                      longitude,
                    );
                    console.log(
                      'Location Name from handleComplete:',
                      locationName,
                    );

                    const queryStringValue = `${params.tripNo}|$|${timeStamp}|$|${latitude}|$|${longitude}|$|${locationName}`;
                    console.log('Query String:', queryStringValue);

                    const response = await Promise.race([
                      fetch(config.apiPostLocation + queryStringValue, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                      }),
                      new Promise((_, reject) =>
                        setTimeout(
                          () =>
                            reject(
                              new Error(
                                'Request timed out, check internet connection',
                              ),
                            ),
                          20000,
                        ),
                      ),
                    ]);
                    const data = await response.json();
                    console.log('Complete location API Response:', data);
                  } catch (error) {
                    console.error(
                      'Error sending Complete Location data to API:',
                      error,
                    );
                    Alert.alert(
                      'Low or No Network Connection',
                      'Check your internet connection and click Start again.',
                      [{ text: 'Ok' }],
                      { cancelable: false },
                    );
                    log(
                      `${params.tripNo}: HMS: handleCompleteTrip - Error sending Complete Location data to API: ${error}`,
                    );
                  } finally {
                    setIsCompleteLoading(false);
                  }
                } else {
                  Alert.alert(
                    'Low or No Network Connection',
                    'Check your internet connection and click Start again.',
                    [{ text: 'Ok' }],
                    { cancelable: false },
                  );
                  console.log(
                    'Cannot obtain Complete location to send Location Details.',
                  );
                  return;
                }
              } else {
                console.log('Location permission denied');
                log(
                  `${params.tripNo}: HMS: handleCompleteTrip - Location permission denied`,
                );
              }
              // Navigate to the next screen..
              AsyncStorage.setItem('currentScreen', 'Signature');
              navigation.navigate('Signature', signParams);
              setPickupKmReadings('');
              setPickupKmImageUri('');
              setCurrentStep(0);

            } catch (error) {
              console.error('Error during trip completion process:', error);
              Alert.alert(
                'Low or No Network Connection',
                'Check your internet connection and click Start again.',
                [{text: 'Ok'}],
                {cancelable: false},
              );
              setIsCompleteLoading(false);
              return;
            } finally {
              setIsCompleteLoading(false);
            }
          },
        },
      ],
      {cancelable: false},
    );
    log(`${params.tripNo}: HMS: handleCompleteTrip - Method completed.`);
  };

 

  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.datetime}>
        <Text allowFontScaling={false} style={styles.datetimetext}>
          {currentDateTime}
        </Text>
      </View>
      {/* <ScrollView> */}
      <View style={styles.tripDetails}>
        <View style={styles.samerow}>
          <View style={styles.leftSide}>
            <Text allowFontScaling={false} style={styles.tripDetailsLabel}>
              {translations[lang].tripIdLabel}:{' '}
            </Text>
          </View>
          <View style={styles.rightSide}>
            <Text allowFontScaling={false} style={styles.tripDetailsData}>
              {params.tripNo}
            </Text>
          </View>
        </View>
        <View style={styles.samerow}>
          <View style={styles.leftSide}>
            <Text allowFontScaling={false} style={styles.tripDetailsLabel}>
              {translations[lang].reportTimeLabel}:{' '}
            </Text>
          </View>
          <View style={styles.rightSide}>
            <Text allowFontScaling={false} style={styles.tripDetailsData}>
              {params.reportTime}
            </Text>
          </View>
        </View>
        <View style={styles.samerow}>
          <View style={styles.leftSide}>
            <Text allowFontScaling={false} style={styles.tripDetailsLabel}>
              {translations[lang].guestNameLabel}:{' '}
            </Text>
          </View>
          <View style={styles.rightSide}>
            <Text allowFontScaling={false} style={styles.tripDetailsData}>
              {params.custName}
            </Text>
          </View>
        </View>
        <View style={styles.phoneRow}>
          <View style={styles.firstColumn}>
            <Text allowFontScaling={false} style={styles.tripDetailsLabel}>
              {translations[lang].guestPhoneLabel}:{' '}
            </Text>
          </View>
          <View style={styles.secondColumn}>
            <Text allowFontScaling={false} style={styles.tripDetailsData}>
              {params.custMobile}
              {''}
              {''}
            </Text>
          </View>
          <View style={styles.thirdColumn}>
            <TouchableOpacity
              style={styles.call}
              onPress={handlePressPhoneNumber}>
              <FontAwesomeIcon
                style={styles.callIcon}
                icon={faPhoneSquare}
                size={18}
                color="green"
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.samerow}>
          <View style={styles.leftSide}>
            <Text allowFontScaling={false} style={styles.tripDetailsLabel}>
              {translations[lang].pickupAddressLabel}:{' '}
            </Text>
          </View>
          <View style={styles.rightSide}>
            <Text allowFontScaling={false} style={styles.tripDetailsData}>
              {params.pickUpLoc}
            </Text>
          </View>
        </View>
        <View style={styles.samerow}>
          <View style={styles.leftSide}>
            <Text allowFontScaling={false} style={styles.tripDetailsLabel}>
              {translations[lang].dropLocationLabel}:{' '}
            </Text>
          </View>
          <View style={styles.rightSide}>
            <Text allowFontScaling={false} style={styles.tripDetailsData}>
              {params.dropLoc}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.ruler}></View>
      {/* </ScrollView> */}
      <View style={styles.maincontent}>
        <View style={styles.grids}>
          <View style={styles.leftColumn}>
            <View style={styles.l1}>
              {/* <Text style={styles.textboxLabel}>
                {translations[lang].startKmLabel}:
                <Text style={styles.mandatory}>* </Text>
              </Text> */}
              <View style={styles.upload1}>
                {/* <TextInput
                  style={styles.textinput}
                  placeholder={translations[lang].enterKmPlaceholder}
                  placeholderTextColor={'#808080'}
                  keyboardType="numeric"
                  value={startKmReadings}
                  onChangeText={setStartKmReadings}
                  maxLength={7}
                  editable={currentStep == 0}
                /> */}
              </View>
            </View>
            <View style={styles.l3}></View>
            <View style={styles.l2}>
              <Text allowFontScaling={false} style={styles.textboxLabel}>
                {translations[lang].pickupKmLabel}:
                <Text allowFontScaling={false} style={styles.mandatory}>
                  *{' '}
                </Text>
              </Text>
              <View style={styles.upload2}>
                <TextInput
                  allowFontScaling={false}
                  style={styles.textinput}
                  placeholder={translations[lang].enterKmPlaceholder}
                  placeholderTextColor={'#808080'}
                  keyboardType="numeric"
                  value={pickupKmReadings}
                  onChangeText={setPickupKmReadings}
                  maxLength={7}
                  editable={currentStep == 2 || currentStep == 3}
                />
                <ImageCapture
                  title={translations[lang].uploadImageButton}
                  onImageCapture={handlePickupKmImageSelect}
                  // disabled={currentStep !== 2}
                  disabled={currentStep !== 5}
                  disabledStyle={
                    currentStep !== 5 ? styles.disabledButton : null
                    // currentStep !== 2 ? styles.disabledButton : null
                  }></ImageCapture>
              </View>
            </View>
            <View style={styles.l4}></View>
          </View>
          <View style={styles.rightColumn}>
            <Text allowFontScaling={false}>{''}</Text>
            <FlowButton
              title={translations[lang].startButton}
              onPress={handleStart}
              disabled={currentStep !== 0}
              disabledStyle={currentStep !== 0 ? styles.disabledButton : null}
              isLoading={isStartLoading}
            />
            <View style={styles.arrow} />
            <FlowButton
              title={translations[lang].arrivedButton}
              onPress={handleArrived}
              disabled={currentStep !== 1}
              disabledStyle={currentStep !== 1 ? styles.disabledButton : null}
              isLoading={isArrivedLoading}></FlowButton>
            <View style={styles.arrow} />
            <FlowButton
              title={translations[lang].pickedupButton}
              onPress={handlePickedUp}
              disabled={
                currentStep == 0 || currentStep == 1 || currentStep == 4
              }
              disabledStyle={
                currentStep == 0 || currentStep == 1 || currentStep == 4
                  ? styles.disabledButton
                  : null
              }
              isLoading={isPickedupLoading}></FlowButton>
            <View style={styles.arrow} />
            <FlowButton
              title={translations[lang].getSignatureButton}
              onPress={handleCompleteTrip}
              disabled={
                currentStep == 0 || currentStep == 1 || isPickedupLoading
              }
              disabledStyle={
                currentStep == 0 || currentStep == 1 || isPickedupLoading
                  ? styles.disabledButton
                  : null
              }
              isLoading={isCompleteLoading}></FlowButton>
          </View>
        </View>
        <View style={styles.signatureButtonView}></View>
      </View>
      {!isKeyboardVisible && <Footer />}
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  font: {
    color: 'black',
    fontSize: 14,
    fontFamily: 'Roboto-BoldItalic',
    fontWeight: '800',
  },
  datetime: {
    height: '8%',
    alignSelf: 'flex-end',
    paddingTop: '2%',
    paddingRight: '1%',
    paddingBottom: '1%',
  },
  datetimetext: {
    color: 'black',
    fontWeight: '800',
    fontSize: 12,
    fontFamily: 'Roboto-BoldItalic',
    paddingRight: '1%',
  },
  callIcon: {
    width: 1,
  },
  tripDetails: {
    height: '12%',
    width: '100%',
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: '2%',
    paddingBottom: '10%',
  },
  tripDetailsLabel: {
    fontSize: 11,
    color: 'black',
    fontFamily: 'Roboto-MediumItalic',
  },
  tripDetailsData: {
    fontSize: 11,
    color: 'black',
    // fontFamily: 'Roboto-BoldItalic',
    fontWeight: '600',
  },
  // ruler:{
  //   height:1,
  //   backgroundColor:'black',
  // },
  samerow: {
    flexDirection: 'row',
    margin: '0.5%',
  },
  leftSide: {
    width: '30%',
    alignItems: 'flex-start',
    paddingLeft: '2%',
  },
  rightSide: {
    width: '70%',
    alignItems: 'flex-start',
    paddingRight: '1%',
  },
  phoneRow: {
    flexDirection: 'row',
    margin: '0.5%',
  },
  firstColumn: {
    width: '30%',
    alignItems: 'flex-start',
    paddingLeft: '2%',
  },
  secondColumn: {},
  thirdColumn: {},
  guestName: {
    paddingTop: 4,
  },
  maincontent: {
    height: '65%',
    width: '100%',
    paddingHorizontal: '3%',
    paddingLeft: '3%',
    paddingTop: '2%',
  },
  grids: {
    flexDirection: 'row',
  },
  leftColumn: {
    justifyContent: 'flex-start',
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '50%',
    paddingLeft: '2%',
  },
  rightColumn: {
    justifyContent: 'flex-start',
    flexDirection: 'column',
    alignItems: 'center',
    width: '50%',
    paddingLeft: '10%',
  },
  l1: {
    height: '25%',
  },
  l2: {
    height: '25%',
  },
  l3: {
    height: '13%',
  },
  l4: {
    height: '37%',
  },
  textboxLabel: {
    alignSelf: 'flex-start',
    fontSize: 14,
    color: 'black',
    fontWeight: '600',
    fontFamily: 'Roboto-BoldItalic',
    paddingLeft: '1%',
  },
  mandatory: {
    color: 'red',
  },
  call: {
    justifyContent: 'flex-end',
    // borderWidth: 0.25,
    padding: 1,
    paddingLeft: 2,
    fontSize: 5,
    width: 20,
  },
  textinput: {
    borderColor: '#012169',
    borderWidth: 1.5,
    marginRight: '5%',
    height: 45,
    width: '70%',
    color: 'black',
    paddingLeft: '1%',
  },

  upload1: {
    flexDirection: 'row',
    alignContent: 'center',
    paddingLeft: '2%',
    width: 200,
  },

  upload2: {
    flexDirection: 'row',
    alignContent: 'center',
    paddingLeft: '2%',
  },
  phoneNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: 'black',
    fontFamily: 'Roboto-BoldItalic',
  },

  arrow: {
    width: '0.5%',
    height: '10%',
    backgroundColor: '#012169',
  },
  signatureButtonView: {
    alignSelf: 'center',
    justifyContent: 'center',
    marginTop: '1%',
  },
});
