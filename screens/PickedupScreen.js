import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Linking,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  PermissionsAndroid,
  BackHandler,
  Keyboard,
  Platform,
  ToastAndroid,
  DeviceEventEmitter,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { TouchableOpacity } from 'react-native-gesture-handler';
import {
  faCar,
  faCircle,
  faCircleCheck,
  faCheckCircle,
  faCheckSquare,
  faPhoneSquare,
  faSquareCheck,
} from '@fortawesome/free-solid-svg-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SQLite from 'react-native-sqlite-storage';
import moment from 'moment';
import Geolocation from '@react-native-community/geolocation';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import getLocation from 'react-native-get-location';
import FlowButton from '../components/FlowButton';
import ImageCapture from '../components/ImageCapture';
import Header from '../components/Header';
import Footer from '../components/Footer';
import NewHeader from '../components/NewHeader';
import NewFooter from '../components/NewFooter';
import { log, readLog, sendLogFile } from '../components/Logger';
import translations from '../translations';
import translationManager from '../translationManager';
import config from '../config';
import {
  startBackgroundService,
  stopBackgroundService,
  startGps,
} from '../Threads/BackgroundTask';
import { getDistance } from 'geolib';
import { useFocusEffect } from '@react-navigation/native';
import {
  buildGeocodingUrl,
  buildReverseGeocodingUrl,
  buildRouteUrl,
} from '../services/apiHelpers';
import { Colors } from '../config';
import { getLatLngFromAddress } from '../services/mapplsHelper';
import { getAddressFromLatLng, getTravelledDistance } from '../api/mapplsApi';
import { clearTravelledDistances } from '../services/distanceTracker';

const PickedupScreen1 = ({ route, language }) => {
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
  const [isBgEnabled, setIsBgEnabled] = useState(true);
  const [garageLatLong, setGarageLatLong] = useState({
    latitude: 13.0281769,
    longitude: 80.2123457,
  });
  const [startLatLongValue, setStartLatLongValue] = useState(null);
  const [pickupLatLong, setPickupLatLong] = useState(null);
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
            setPickupKmReadings('');
          } catch (error) {
            console.error('Error parsing stored params:', error);
            log(
              'ERROR - ARRIVED - fetchParams - Error parsing stored params:',
              error,
            );
            setParams({}); // Fallback value
          }
        } else {
          // If no stored parameters, use the parameters passed through navigation
          setParams(route.params || {}); // Fallback value
        }
      } catch (error) {
        console.error(
          'ERROR - ARRIVED: Error retrieving params from AsyncStorage:',
          error,
        );
      }
    };

    fetchParams();
  }, [route.params]);

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
    if (pickupLatLong) {
      console.log('Pickuplatlong :' + pickupLatLong);
    }
  }, [pickupLatLong]);

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
        const { latitude, longitude } = position.coords;
        setLat(latitude);
        setLong(longitude);
      },
      error => console.log(error),
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 1000 }, // Set maximumAge to 0 to force fetching a fresh position
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
      { cancelable: false },
    );
  };

  const handlePickupKmImageSelect = async uri => {
    setPickupKmImageUri(uri);
    log(
      `${params.tripNo}: PICKEDUP -  handlePickupKmImageSelect - Pickup Km image uploaded successfully${uri}`,
    );
    if (pickupKmImageUri != null) {
      setIsPickupUploaded(true);
      // setCurrentStep(3);
    }
  };

  const sendStartKmReadings = async () => {
    try {
      const curDate = getCurrentDate();
      log(
        `${params.tripNo}: PICKEDUP -  sendStartKmReadings - Method being called.`,
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
            30000,
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
        `${params.tripNo}: PICKEDUP -  sendStartKmReadings - Sending Start Km Reading Successful`,
      );
      // Return response status or data as needed
      return true;
    } catch (error) {
      console.error('sendStartKmReadings - Start Km API Error:', error);
      log(
        `${params.tripNo}: ERROR - PICKEDUP -  sendStartKmReadings - Error when sending Start Km Reading:`,
        error,
      );
      return false;
    }
  };

  const obtainStartLatLong = async address => {
    console.log('obtainStartLatLong method called');

    const geocodeUrl = buildGeocodingUrl(address);
    console.log('geocodeUrl in obtainStartLatLong:', geocodeUrl);

    try {
      const response = await fetch(geocodeUrl);
      const data = await response.json();
      console.log('geocode Response in obtain Method:', data);

      if (data.results && data.results.length > 0) {
        const startLatLongArray = {
          latitude: data.results[0].position.lat,
          longitude: data.results[0].position.lon,
        };

        console.log('If condition checked in obtainStartLatLong method');
        setStartLatLongValue(startLatLongArray);

        log(
          `${params.tripNo}: PICKEDUP -  obtainStartLatLong - Start Location Lat Long : ${startLatLongArray.latitude}, ${startLatLongArray.lng}`,
        );
        console.log('startLatLongArray if geocode Success:', startLatLongArray);

        return startLatLongArray;
      } else {
        log(
          `${params.tripNo}: PICKEDUP -  obtainStartLatLong - Obtaining Geocode Failure.`,
        );
        return null;
      }
    } catch (error) {
      console.error('Error fetching geocoding data:', error);
      return null;
    }
  };

  const sendPickupKmReadings = async () => {
    log(
      `${params.tripNo}: PICKEDUP - sendPickupKmReadings - Method being called...`,
    );
    try {
      const position = await Promise.race([
        getCurrentPosition(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('getCurrentPosition timed out')),
            30000, // 30-second timeout
          ),
        ),
      ]);

      const pickedupLatLong = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setPickupLatLong(pickedupLatLong);
      console.log('Current position on Pickedup: ', pickedupLatLong);
      log(
        `${params.tripNo}: PICKEDUP - sendPickupKmReadings - Current Position on Pickedup : ${pickedupLatLong.latitude}, ${pickedupLatLong.longitude}`,
      );

      const curDate = getCurrentDate();
      const curTime = getCurrentTime();
      const timeStamp = curDate + ' ' + curTime;
      const { latitude, longitude } = position.coords;
      // const locationName = await getAddressFromLatLng(latitude, longitude);
      const locationName = await Promise.race([
        getAddressFromLatLng(latitude, longitude),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Address timeout')), 15000),
        ),
      ]).catch(
        () => `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
      );
      console.log('Location Name from handlePickedup:', locationName);

      const queryStringValue = `${params.tripNo}|$|${timeStamp}|$|${latitude}|$|${longitude}|$|${locationName}`;
      console.log('Query String:', queryStringValue);

      try {
        const address = params.vendorAddress;
        let startLatLongArray = null;

        if (address) {
          try {
            // startLatLongArray = await getLatLngFromAddress(address);
            startLatLongArray = await Promise.race([
              getLatLngFromAddress(address),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Geocoding timeout')), 15000),
              ),
            ]);
          } catch (error) {
            console.warn(
              'Failed to getLatLngFromAddress for vendor, proceeding without it:',
              error.message,
            );
            log(
              `${params.tripNo}: ERROR - PICKEDUP - sendPickupKmReadings - Failed to getLatLngFromAddress for vendor: ${error.message}`,
            );
          }
        }

        // with time Calculation...
        if (address) {
          //let startLatLongArray;
          const startTime = performance.now(); // Record start time

          try {
            //startLatLongArray = await getLatLngFromAddress(address);
            startLatLongArray = await Promise.race([
              getLatLngFromAddress(address),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Geocoding timeout')), 15000),
              ),
            ]);
          } catch (error) {
            console.warn(
              'Failed to getLatLngFromAddress for vendor, proceeding without it:',
              error.message,
            );
            log(
              `${params.tripNo}: ERROR - PICKEDUP - sendPickupKmReadings - Failed to getLatLngFromAddress for vendor: ${error.message}`,
            );
          } finally {
            const endTime = performance.now(); // Record end time
            const timeTaken = endTime - startTime; // Calculate duration in milliseconds

            console.log(
              `⏳ PICKEDUP getLatLngFromAddress for vendor address took ${timeTaken.toFixed(
                2,
              )} ms.`,
            );
            // You can also log this to your application's logging system if needed
            log(
              `${
                params.tripNo
              }: INFO - PICKEDUP - ⏳ getLatLngFromAddress execution time for vendor Address: ${timeTaken.toFixed(
                2,
              )} ms.`,
            );
          }
        }

        if (startLatLongArray) {
          setStartLatLongValue(startLatLongArray);
          console.log(
            'Start Location Lat Long : ' +
              startLatLongArray.latitude +
              '' +
              startLatLongArray.longitude,
          );
          console.log(
            'startLatLongArray if geocode Success:',
            startLatLongValue,
          );
          log(
            `${params.tripNo}: PICKEDUP - sendPickupKmReadings - Vendor Address obtained : ${address}`,
          );
          log(
            `${params.tripNo}: PICKEDUP - sendPickupKmReadings - Vendor LatLong fetched successfully: ${startLatLongArray.latitude}, ${startLatLongArray.longitude}`,
          );
          log(
            `${params.tripNo}: PICKEDUP - sendPickupKmReadings - Pickedup Location LatLong : ${pickedupLatLong.latitude}, ${pickedupLatLong.longitude}`,
          );

          // const {distance: lengthInMeters} = await getTravelledDistance(
          //   startLatLongArray,
          //   pickedupLatLong,
          // );
          // Now for getTravelledDistance with time calculation
          const startTravelDistanceTime = performance.now(); // Start time for getTravelledDistance
          // Stays 0 if the distance API fails, so start km isn't sent as NaN
          let lengthInMeters = 0;

          try {
            // const {distance: calculatedDistance} = await getTravelledDistance(
            //   startLatLongArray,
            //   pickedupLatLong,
            // );

            // Wrap the distance calculation:
            const { distance: calculatedDistance } = await Promise.race([
              getTravelledDistance(startLatLongArray, pickedupLatLong),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error('Distance API timeout')),
                  20000,
                ),
              ),
            ]);
            lengthInMeters = calculatedDistance;
          } catch (error) {
            console.warn('Failed to getTravelledDistance:', error.message);
            log(
              `${params.tripNo}: ERROR - PICKEDUP - sendPickupKmReadings - Failed to getTravelledDistance: ${error.message}`,
            );
          } finally {
            const endTravelDistanceTime = performance.now(); // End time for getTravelledDistance
            const timeTakenTravelDistance =
              endTravelDistanceTime - startTravelDistanceTime;
            console.log(
              `⏳ PICKEDUP - getTravelledDistance took ${timeTakenTravelDistance.toFixed(
                2,
              )} ms.`,
            );
            log(
              `${
                params.tripNo
              }: INFO - PICKEDUP - ⏳ getTravelledDistance execution time: ${timeTakenTravelDistance.toFixed(
                2,
              )} ms.`,
            );
          }

          console.log('received length in meters:' + lengthInMeters);
          const distance = lengthInMeters / 1000;
          console.log('distance in km from start point: ' + distance);
          const startKmReading = parseFloat(pickupKmReadings) - distance;
          console.log('Start Km reading: ', startKmReading);
          log(
            `${params.tripNo}: PICKEDUP - sendPickupKmReadings - Calculated Start Km Reading : ${startKmReading}`,
          );

          const sendKmReadingData = async (url, formData) => {
            console.log('Pickup Km URL:', url);
            const stringFormData = JSON.stringify(formData);
            console.log('Pickup Km Form Data:', stringFormData);

            log(
              `${params.tripNo}: PICKEDUP - sendPickupKmReadings - Sending Pickup Details URL: ${url}`,
            );
            log(
              `${params.tripNo}: PICKEDUP - sendPickupKmReadings - Sending Pickup Details Form Data: ${stringFormData}`,
            );
            const authToken = await AsyncStorage.getItem('API_AUTH_TOKEN');
            const response = await Promise.race([
              fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'multipart/form-data',
                  Authorization: `Bearer ${authToken}`,
                },
                body: formData,
              }),
              new Promise((_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new Error(
                        'KM Reading API Request timed out, check internet connection',
                      ),
                    ),
                  35000,
                ),
              ),
            ]);

            if (!response.ok) {
              console.error('Network response was not ok' + response);
              throw new Error(
                `KM Reading API network response was not ok, status: ${response.status}`,
              );
            }
            log(
              `${params.tripNo}: PICKEDUP - sendPickupKmReadings - API Response after sending data to KmReading API: ${response.status}`,
            );
            console.log('PickedUp Response status:', response.status);
            const responseData = await response.json();
            console.log('PickedUp Response data:', responseData);
            return true;
          };

          const apiUrlwithQuery =
            config.apiPostKmReading +
            params.tripNo +
            '&did=' +
            params.driverId +
            '&status=PICKEDUP';

          const imageData = {
            uri: pickupKmImageUri,
            type: 'image/jpeg',
            name: 'pickupKmImage.jpg',
          };

          const formData = new FormData();
          formData.append('gkms', parseInt(startKmReading));
          formData.append('kms', pickupKmReadings);
          formData.append('file', imageData);
          formData.append('date', currentTime);
          formData.append(
            'latlong',
            pickedupLatLong.latitude + ':' + pickedupLatLong.longitude,
          );

          // Start time for the entire API call block (primary or alternative)
          const startApiCallTime = performance.now();

          try {
            await sendKmReadingData(apiUrlwithQuery, formData);
            console.log(
              'Primary KM reading API call successful (with vendor address).',
            );
          } catch (error) {
            console.warn(
              'Primary KM reading API failed, trying alternative:',
              error.message,
            );
            log(
              `${params.tripNo}: WARN - PICKEDUP - sendPickupKmReadings - Primary KM reading API failed, trying alternative: ${error.message}`,
            );
            await sendKmReadingData(
              // This is the alternative call
              config.apiPostKmReadingAlt +
                params.tripNo +
                '&did=' +
                params.driverId +
                '&status=PICKEDUP',
              formData,
            );
            console.log(
              'Alternative KM reading API call successful (with vendor address).',
            );
          } finally {
            // End time for the entire API call block
            const endApiCallTime = performance.now();
            const timeTakenApiCall = endApiCallTime - startApiCallTime;

            console.log(
              `⏳ PICKEDUP - KM Reading API call(s) took ${timeTakenApiCall.toFixed(
                2,
              )} ms.`,
            );
            log(
              `${
                params.tripNo
              }: INFO - PICKEDUP - ⏳ KM Reading API call execution time: ${timeTakenApiCall.toFixed(
                2,
              )} ms.`,
            );
          }
        } else {
          console.log('Cannot obtain vendor location.');
          log(
            `${params.tripNo}: PICKEDUP - sendPickupKmReadings - Cannot obtain Vendor Location on Map, using garage coordinates if available`,
          );
          ToastAndroid.showWithGravity(
            'Cannot obtain vendor location.',
            ToastAndroid.SHORT,
            ToastAndroid.CENTER,
          );

          setStartLatLongValue(garageLatLong);
          console.log(
            'startlatLong value if no vendor address provided:',
            startLatLongValue,
          );
          log(
            `${params.tripNo}: PICKEDUP - sendPickupKmReadings - Vendor latlog cannot be fetched, so garage latlong added`,
          );

          // const {lengthInMeters} = getTravelledDistance(
          //   garageLatLong,
          //   pickedupLatLong,
          // );
          // Wrap the distance calculation:
          // startLatLongArray is null in this branch, so measure from the garage.
          // getTravelledDistance returns {distance, duration} or null on failure.
          let lengthInMeters = 0;
          try {
            const result = await Promise.race([
              getTravelledDistance(garageLatLong, pickedupLatLong),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error('Distance API timeout')),
                  20000,
                ),
              ),
            ]);
            lengthInMeters = result?.distance ?? 0;
          } catch (error) {
            console.warn('Failed to getTravelledDistance:', error.message);
            log(
              `${params.tripNo}: ERROR - PICKEDUP - sendPickupKmReadings - Failed to getTravelledDistance from garage: ${error.message}`,
            );
          }
          const distance = lengthInMeters / 1000;
          const startKmReading = parseFloat(pickupKmReadings) - distance;
          console.log('Start Km reading: ', startKmReading);

          const sendKmReadingData = async (url, formData) => {
            console.log('Pickup Km URL:', url);
            console.log('Pickup Km Form Data:', formData);
            log(
              `${params.tripNo}: PICKEDUP - sendKmReadingData - Pickup Km URL: ${url}`,
            );
            log(
              `${params.tripNo}: PICKEDUP - sendKmReadingData - Pickup Km Form Data: ${formData}`,
            );
            const authToken = await AsyncStorage.getItem('API_AUTH_TOKEN');
            const response = await Promise.race([
              fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'multipart/form-data',
                  Authorization: `Bearer ${authToken}`,
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
                  40000,
                ),
              ),
            ]);

            if (!response.ok) {
              console.error('Network response was not ok' + response);
              throw new Error(
                `KM Reading API network response was not ok, status: ${response.status}`,
              );
            }
            log(
              `${params.tripNo}: PICKEDUP - sendPickupKmReadings - API Response for Pickedup KmReading: ${response.status}`,
            );
            console.log('Response status:', response.status);
            const responseData = await response.json();
            console.log('Response data:', responseData);
            return true;
          };

          const apiUrlwithQuery =
            config.apiPostKmReading +
            params.tripNo +
            '&did=' +
            params.driverId +
            '&status=PICKEDUP';

          const imageData = {
            uri: pickupKmImageUri,
            type: 'image/jpeg',
            name: 'pickupKmImage.jpg',
          };

          const formData = new FormData();
          formData.append('gkms', parseInt(startKmReading));
          formData.append('kms', pickupKmReadings);
          formData.append('file', imageData);
          formData.append('date', currentTime);
          formData.append(
            'latlong',
            position.coords.latitude + ':' + position.coords.longitude,
          );

          try {
            await sendKmReadingData(apiUrlwithQuery, formData);
            console.log(
              'Primary KM reading API call successful (without vendor address).',
            );
          } catch (error) {
            console.warn(
              'Primary KM reading API failed (no vendor address), trying alternative:',
              error.message,
            );
            log(
              `${params.tripNo}: WARN - PICKEDUP - sendPickupKmReadings - Primary KM reading API failed (no vendor address), trying alternative: ${error.message}`,
            );
            await sendKmReadingData(
              config.apiPostKmReadingAlt +
                params.tripNo +
                '&did=' +
                params.driverId +
                '&status=PICKEDUP',
              formData,
            ); // Use alternative URL
            console.log(
              'Alternative KM reading API call successful (without vendor address).',
            );
          }
        }
      } catch (error) {
        console.error(
          'Error fetching or processing data in sending PickupKm Readings:',
          error.message,
        );
        log(
          `${params.tripNo}: ERROR - PICKEDUP - sendPickupKmReadings - Error in processing data for Km Readings: ${error.message}`,
        );
        throw error; // Re-throw to be caught by the outer catch block
      }
      log(
        `${params.tripNo}: PICKEDUP - sendPickupKmReadings - Sending Pickup Km Reading Successful`,
      );
      return true; // Indicate success
    } catch (error) {
      console.error('Pickup Km API Error:', error);
      log(
        `${params.tripNo}: ERROR - PICKEDUP - sendPickupKmReadings - Error when sending Pickup Km Reading: ${error.message}`,
      );
      return error.message; // Return the error message to be handled by handlePickedUp
    }
  };

  function validateInput(inputValue) {
    // Define a regular expression pattern to match only numbers
    var pattern = /^[0-9]*$/;
    // Test the input value against the pattern
    if (!pattern.test(inputValue)) {
      Alert.alert(
        translationManager.getTranslation('alertInvalidInput'),
        translationManager.getTranslation('alertEnterNumbers'),
      );
      return false; // Return false to indicate validation failure
    }
    return true; // Return true if validation succeeds
  }

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
      log('Error requesting foreground location permission:', error);
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
      log('Error requesting background location permission:', error);
      return false;
    }
  };

  //request permission using the above methods..
  const bgLocationPermission = async () => {
    if (await requestForegroundLocationPermission()) {
      if (await requestBackgroundLocationPermission()) {
        log(
          `${params.tripNo}: PICKEDUP -  handleArrived - Location permission granted when Arrived clicked`,
        );
        console.log(
          `${params.tripNo}: handleArrived - Location permission granted when Arrived clicked`,
        );
        getLocation();
        //startBgTracking();
        return true;
      } else {
        log(
          `${params.tripNo}: PICKEDUP -  handleArrived - Background Location permission denied`,
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
          { cancelable: false },
        );
        setIsArrivedLoading(false);
        return;
      }
    } else {
      log(
        `${params.tripNo}: PICKEDUP -  handleArrived - Foreground Location permission denied`,
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
        { cancelable: false },
      );
      setIsArrivedLoading(false);
    }
  };
  const handlePickedUp = async () => {
    log(
      `${params.tripNo}: PICKEDUP - handlePickedUp - Picked Up button clicked...`,
    );
    log(`${params.tripNo}: PICKEDUP - handlePickedUp - Method being called.`);

    if (pickupKmReadings === '') {
      Alert.alert(
        translationManager.getTranslation('alertAlert'),
        translationManager.getTranslation('alertEnterPickupKm'),
      );
      setCurrentStep(0);
      return;
    }
    if (!validateInput(pickupKmReadings)) {
      setCurrentStep(0);
      setPickupKmReadings('');
      return; // Exit early if validation fails
    }

    if (pickupKmImageUri === '') {
      Alert.alert(
        translationManager.getTranslation('alertAlert'),
        translationManager.getTranslation('alertUploadOdometer'),
      );
      setCurrentStep(0);
      return;
    }

    try {
      Alert.alert(
        translationManager.getTranslation('alertConfirm'),
        translationManager.getTranslation('alertPickup'),
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
              //await startBackgroundService(params.tripNo);
              try {
                setCurrentStep(1);
                const callSendPickupKmReadings = await sendPickupKmReadings();

                if (
                  callSendPickupKmReadings === 'No location provider available.'
                ) {
                  Alert.alert(
                    translationManager.getTranslation(
                      'alertLocationPermission',
                    ),
                    translationManager.getTranslation('alertEnableLocation'),
                    [{ text: 'Ok' }],
                    { cancelable: false },
                  );
                  setIsPickedupLoading(false);
                  return;
                } else if (callSendPickupKmReadings !== true) {
                  // Check if it's explicitly not true (meaning an error message)
                  Alert.alert(
                    translationManager.getTranslation('alertLowNetwork'),
                    translationManager.getTranslation(
                      'alertCheckNetworkandTry',
                    ),
                    [{ text: 'Ok' }],
                    { cancelable: false },
                  );
                  setIsPickedupLoading(false);
                  return;
                }

                try {
                  // Retrieve the stored parameters from AsyncStorage
                  const storedParams = await AsyncStorage.getItem('homeParams');
                  console.log('Retrieved storedParam:', storedParams);
                  //Get Pickedup Location...
                  const position = await Promise.race([
                    getCurrentPosition(),
                    new Promise((_, reject) =>
                      setTimeout(
                        () => reject(new Error('getCurrentPosition timed out')),
                        20000, // 20-second timeout
                      ),
                    ),
                  ]);

                  // const startlatlong = await getLatLngFromAddress(
                  //   params.vendorAddress,
                  // );
                  // Vendor lat/long is optional here; don't block navigation if geocoding fails
                  let startlatlong = null;
                  try {
                    startlatlong = await Promise.race([
                      getLatLngFromAddress(params.vendorAddress),
                      new Promise((_, reject) =>
                        setTimeout(
                          () => reject(new Error('Geocoding timeout')),
                          15000,
                        ),
                      ),
                    ]);
                  } catch (error) {
                    log(
                      `${params.tripNo}: WARN - PICKEDUP - handlePickedup - Vendor geocoding failed: ${error.message}`,
                    );
                  }

                  const pickedupLatLong = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                  };
                  if (storedParams !== null) {
                    // Parse the stored parameters into an object
                    const parsedParams = JSON.parse(storedParams);
                    // Add additional values to the params object
                    const updatedParams = {
                      ...parsedParams,
                      startKmReadings: parseInt(startKmReadings),
                      startLatLongValue: startlatlong,
                      pickupKmReadings: pickupKmReadings,
                      pickupKmImageUri: pickupKmImageUri,
                      pickupLatLong: pickedupLatLong,
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
                    AsyncStorage.setItem('currentScreen', 'Drop');
                    await clearTravelledDistances();
                    navigation.navigate('Drop');
                    await startBackgroundService(params.tripNo);
                  }
                } catch (error) {
                  console.error(
                    'Error adding extra values or getting location for storage:',
                    error,
                  );
                  Alert.alert(
                    translationManager.getTranslation('alertError'),
                    translationManager.getTranslation(
                      'alertSomethingWentWrong',
                    ),
                    [{ text: 'Ok' }],
                    { cancelable: false },
                  );
                }
              } finally {
                setIsPickedupLoading(false);
                setCurrentStep(0);
              }
            },
          },
        ],
        { cancelable: false },
      );
    } catch (error) {
      console.error('Error handling pickup:', error);
      log(
        `${params.tripNo}: PICKEDUP - handlePickedUp -Error handling pickup:', ${error}, ${error.message}`,
      );
      setIsPickedupLoading(false);
    }
    log(`${params.tripNo}: PICKEDUP - handlePickedUp - Method Completed.`);
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <NewHeader
        showTripDrawer={true}
        currentTripId={params.tripNo}
        currentDriverId={params.driverId}
        currentScreen={'PICKEDUP'}
      />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
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
                  <Text
                    allowFontScaling={false}
                    style={styles.tripDetailsLabel}
                  >
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
                    onPress={() => handlePressPhoneNumber('Customer')}
                  >
                    <FontAwesomeIcon
                      icon={faPhoneSquare}
                      size={18}
                      color="green"
                    />
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
                    onPress={() => handlePressPhoneNumber('Booker')}
                  >
                    <FontAwesomeIcon
                      icon={faPhoneSquare}
                      size={18}
                      color="green"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Separator */}
            {/* <View style={styles.ruler} /> */}

            {/* Main Content Card */}
            <View style={styles.card}>
              {/* <Text style={styles.cardHeading}>Trip Actions</Text> */}
              <View style={styles.tripContainer}>
                <View style={styles.step}>
                  <FontAwesomeIcon
                    icon={faCircleCheck}
                    size={20}
                    color="green"
                  />
                  <Text allowFontScaling={false} style={styles.caption}>
                    {translationManager.getTranslation('start')}
                  </Text>
                </View>
                <View style={styles.line} />
                <View style={styles.step}>
                  <FontAwesomeIcon
                    icon={faCircleCheck}
                    size={20}
                    color="green"
                  />
                  <Text allowFontScaling={false} style={styles.caption}>
                    {translationManager.getTranslation('arrived')}
                  </Text>
                </View>
                <View style={styles.line} />
                <View style={styles.step}>
                  <FontAwesomeIcon icon={faCar} size={20} color="#0c4160" />
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
                  {translationManager.getTranslation('pickedUpQuote')}
                </Text>
                <View style={styles.upload}>
                  <TextInput
                    allowFontScaling={false}
                    style={styles.textinput}
                    placeholder={translationManager.getTranslation(
                      'pickupKmPlaceHolder',
                    )}
                    placeholderTextColor={'#D0D0D0'}
                    keyboardType="numeric"
                    maxLength={7}
                    onChangeText={setPickupKmReadings}
                  />
                  <View style={styles.imageWrapper}>
                    <ImageCapture
                      title={translationManager.getTranslation(
                        'uploadImageButton',
                      )}
                      onImageCapture={handlePickupKmImageSelect}
                      disabled={isPickupUploaded}
                    />
                    {isPickupUploaded && (
                      <FontAwesomeIcon
                        icon={faSquareCheck}
                        size={16}
                        color="green"
                        style={styles.tickIcon}
                      />
                    )}
                  </View>
                  {/*<ImageCapture
                    title="Upload Image"
                    onImageCapture={handlePickupKmImageSelect}></ImageCapture> */}
                </View>
              </View>
            </View>
            {/* Pickup Button */}
            <View style={styles.startButtonView}>
              <TouchableOpacity
                style={[
                  styles.startButton,
                  currentStep !== 0 && styles.disabledButton,
                ]}
                disabled={currentStep !== 0}
                onPress={handlePickedUp}
              >
                <Text allowFontScaling={false} style={styles.startButtonText}>
                  {isPickedupLoading
                    ? translationManager.getTranslation('loading')
                    : translationManager.getTranslation('pickedUpCaps')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {!isBgEnabled && (
              <View style={styles.errorMessageView}>
                <Text allowFontScaling={false} style={styles.errorMessage}>
                  {translationManager.getTranslation('noBgPermission')}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
      {!isKeyboardVisible && (
        <NewFooter
          driverId={params.driverId}
          driverPhone={params.driverPhone}
          showReport={true}
        />
      )}
    </KeyboardAvoidingView>
  );
};

export default PickedupScreen1;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  datetime: {
    flex: 0.04,
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
    //height: '37%',
    padding: 15,
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    margin: '3%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
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
  maincontent: {
    alignItems: 'center',
    marginTop: 20,
    height: '48%',
    justifyContent: 'center',
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
    fontSize: 16,
    color: '#555555',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 10,
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
    //height: '8%',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: Colors.actionButtons,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    width: '100%',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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
    //height: '35%',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: '2%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    justifyContent: 'center',
  },
  upload: {
    flexDirection: 'row', // Align items in a row
    alignItems: 'center', // Center vertically
    justifyContent: 'space-between', // Space between TextInput and ImageCapture button
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#E1EBEE',
    borderRadius: 10,
    margin: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  textinput: {
    flex: 1, // Allow TextInput to take up remaining space
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    color: '#333333',
    fontSize: 14,
    marginRight: 10, // Spacing between TextInput and ImageCapture button
  },
  imageWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tickIcon: {
    marginLeft: 5,
  },
});
