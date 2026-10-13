import React, {useState, useEffect, useRef} from 'react';
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
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {faPhoneSquare} from '@fortawesome/free-solid-svg-icons';
import {
  faCar,
  faCircle,
  faCircleCheck,
  faSquareCheck,
} from '@fortawesome/free-solid-svg-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import Geolocation from '@react-native-community/geolocation';
import ImageCapture from '../components/ImageCapture';
import NewHeader from '../components/NewHeader';
import NewFooter from '../components/NewFooter';
import {log, readLog, sendLogFile} from '../components/Logger';
import translationManager from '../translationManager';
import config from '../config';
import {
  stopBackgroundService,
} from '../Threads/BackgroundTask';
import {
  buildGeocodingUrl,
  buildReverseGeocodingUrl,
} from '../services/apiHelpers';
import {Colors} from '../config';
import {getAddressFromLatLng, getTravelledDistance} from '../api/mapplsApi';
import {saveCoordinate} from '../services/distanceTracker';

const DropScreen = ({route, language}) => {
  const lang = language || 'en';
  // const { tripNo, custName, custMobile, pickUpLoc, dropLoc, driverId} = route.params;
  const [params, setParams] = useState({});
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(0);
  const [startKmReadings, setStartKmReadings] = useState('');
  const [pickupKmReadings, setPickupKmReadings] = useState('');
  const [endKmReadings, setEndKmReadings] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [tripStatus, setTripStatus] = useState('');
  const [customerStatus, setCustomerStatus] = useState('');
  const phoneNumbers = {
    Customer: '+91' + params.custMobile,
    Booker: '+91' + params.bookerMobile,
  };
  const [pickupKmImageUri, setPickupKmImageUri] = useState('');
  const [endKmImageUri, setEndKmImageUri] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [arrivedTime, setArrivedTime] = useState(null);
  const [tripCompletedTime, setTripCompletedTime] = useState('');
  const [tripCompleteLoc, setTripCompleteLoc] = useState('');
  const [lat, setLat] = useState('');
  const [long, setLong] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const timeoutValue = parseInt(config.timeoutValue);
  const conTimeoutValue = parseInt(config.connectionTimeoutValue);
  const [isCompleteLoading, setIsCompleteLoading] = useState(false);
  const [isDropUploaded, setIsDropUploaded] = useState(false);
  const [isBgTracking, setIsBgTracking] = useState(false);
  const [isBgEnabled, setIsBgEnabled] = useState(true);
  const apiKey = config.tomTomApiKey;
  const [startLatLongValue, setStartLatLongValue] = useState(null);
  // const [isOnCall, setIsOnCall] = useState(false);

  // Track Current Step of the trip....
  useEffect(() => {
    if (typeof currentStep === 'undefined') {
      setCurrentStep(0);
    }
    console.log('DROP -Current Step from state variable:', currentStep);
  }, [currentStep]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('DROP -BgTracking on Focus:', isBgTracking);
    }, []),
  );

  useFocusEffect(
    React.useCallback(() => {
      const fetchParams = async () => {
        try {
          // --- START OF UNCONDITIONAL RESET ---
          // These states should ALWAYS be reset when the screen focuses,
          // regardless of whether there are stored params or not.
          setEndKmReadings('');
          setEndKmImageUri('');
          setIsDropUploaded(false);
          setIsCompleteLoading(false);
          setCurrentStep(0); // Ensure step is reset for a fresh start
          // --- END OF UNCONDITIONAL RESET ---

          // Now, proceed to check AsyncStorage for parameters for the *new* trip
          const storedParams = await AsyncStorage.getItem('homeParams');
          console.log('DROP -Received param values: ', storedParams);
          log('DROP - fetchParams - Received param values:', storedParams);

          if (storedParams !== null && storedParams !== undefined) {
            // This block would now primarily handle setting up `params`
            // if a trip was in progress when the app was closed unexpectedly.
            try {
              const parsedParams = JSON.parse(storedParams);
              setPickupKmReadings(parsedParams.pickupKmReadings);
              setParams(parsedParams);
            } catch (error) {
              console.error('Error parsing stored params:', error);
              log(
                'ERROR - DROP - fetchParams - Error parsing stored params:',
                error,
              );
              setParams({}); // Fallback value
            }
          } else {
            // If no stored parameters (because previous trip completed and cleared, or new trip),
            // use the parameters passed through navigation for the new trip.
            setParams(route.params || {}); // Fallback value
          }
        } catch (error) {
          console.error(
            'ERROR - DROP: Error retrieving params from AsyncStorage:',
            error,
          );
          log(
            'ERROR - DROP: Error retrieving params from AsyncStorage:',
            error,
          );
        }
      };

      fetchParams();
    }, [route.params]),
  );

  // to update start km every time the value changes....
  useEffect(() => {
    if (params.startKmReadings) {
      setStartKmReadings(params.startKmReadings);
    }
  }, [params.startKmReadings]);

  // to update start km every time the value changes....
  useEffect(() => {
    if (startKmReadings) {
      console.log('DROP -Latest start km reading: ', startKmReadings);
    }
  }, [startKmReadings]);

  useEffect(() => {
    if (startLatLongValue) {
      console.log('DROP -Latest start lat Long Value: ', startLatLongValue);
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

  // useEffect(() => {
  //   if (lat && long) {
  //     console.log('DROP -logged lat & long : ' + lat + ',' + long);
  //   }
  // }, []);

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
      console.log('DROP -Current Trip Status :' + tripStatus);
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
      console.log('DROP -Trip complete Time:' + tripCompletedTime);
    }
  }, [tripCompletedTime]);

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 15000,
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

  const obtainStartLatLong = async address => {
    console.log('DROP -obtainStartLatLong method called');

    const geocodeUrl = buildGeocodingUrl(address);
    console.log('DROP -geocodeUrl in obtainStartLatLong :', geocodeUrl);

    try {
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      console.log('DROP -geocode Response in obtain Method:', data);

      if (data.results && data.results.length > 0) {
        const startLatLongArray = {
          latitude: data.results[0].position.lat,
          longitude: data.results[0].position.lon,
        };
        console.log('DROP -If condition checked in obtainStartLatLong method');
        setStartLatLongValue(startLatLongArray);
        log(
          `${params.tripNo}: DROP - obtainStartLatLong - Start Location Lat Long : ${startLatLongArray.latitude}, ${startLatLongArray.longitude}`,
        );
        console.log(
          'DROP -startLatLongArray if geocode Success:',
          startLatLongArray,
        );
        return startLatLongArray;
      } else {
        log(
          `${params.tripNo}: DROP - obtainStartLatLong - Obtaining Geocode Failure.`,
        );
        return null;
      }
    } catch (error) {
      console.error('Error in obtainStartLatLong:', error);
      log('Error in obtainStartLatLong:', error);
      return null;
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

  const reverseGeocode = async (latitude, longitude) => {
    const url = buildReverseGeocodingUrl(latitude, longitude);
    console.log('DROP -TomTom Reverse Geocode URL:', url);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const responseData = await response.json();
      console.log('DROP -Tom Tom response data:', responseData);

      if (
        responseData &&
        responseData.addresses &&
        responseData.addresses.length > 0
      ) {
        const firstAddress = responseData.addresses[0];
        const locationName = firstAddress.address.freeformAddress;
        log(
          `${params.tripNo}: DROP - reverseGeocode - Location Name from Tom Tom: ${locationName}`,
        );
        console.log('DROP -Location Name from Tom Tom:', locationName);
        return locationName;
      } else {
        return 'Address not found';
      }
    } catch (error) {
      console.error('Error fetching reverse geocode:', error);
      log(
        `${params.tripNo}: ERROR - DROP - reverseGeocode - Error fetching reverse geocode: ${error}`,
      );
      return 'Error fetching address';
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
          `${params.tripNo}: DROP - handleArrived - Location permission granted when Arrived clicked`,
        );
        console.log(
          `${params.tripNo}: handleArrived - Location permission granted when Arrived clicked`,
        );
        getLocation();
        //startBgTracking();
        return true;
      } else {
        log(
          `${params.tripNo}: DROP - handleArrived - Background Location permission denied`,
        );
        console.log(
          'DROP -handleArrived - Background Location permission denied',
        );
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
        `${params.tripNo}: DROP - handleArrived - Foreground Location permission denied`,
      );
      console.log('DROP -Foreground Location permission denied');
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

  const handleEndKmImageCapture = async uri => {
    setEndKmImageUri(uri);
    setIsDropUploaded(true);
    // log(
    //   `${submitParams.tripNo}: SBS: handleEndKmImageCapture - End Km image uploaded successfully.`,
    // );
    await AsyncStorage.setItem('endKmImageUri', uri);
  };

  const sendDropKmReadings = async () => {
    try {
      const position = await Promise.race([
        getCurrentPosition(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('getCurrentPosition timed out')),
            15000, // 15-second timeout
          ),
        ),
      ]);

      const dropLatLong = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setTripCompleteLoc(dropLatLong);

      const formData = new FormData();
      formData.append('kms', pickupKmReadings);
      //formData.append('file', imageData);     04/08/2025: Drop Km Image upload moved to Last Screen.....
      formData.append('date', currentTime);
      formData.append(
        'latlong',
        dropLatLong.latitude + ':' + dropLatLong.longitude,
      );

      const sendKmReadingData = async baseUrl => {
        const apiUrlwithQuery =
          baseUrl +
          params.tripNo +
          '&did=' +
          params.driverId +
          '&status=DROPPED';
        console.log('DROP - Drop Km URL:', apiUrlwithQuery);
        log(
          `${params.tripNo}: DROP - Sending Drop Details URL : ${apiUrlwithQuery}`,
        );
        log(
          `${params.tripNo}: DROP - Sending Drop Details Form Data : ${formData}`,
        );
        const authToken = await AsyncStorage.getItem('API_AUTH_TOKEN');
        const response = await Promise.race([
          fetch(apiUrlwithQuery, {
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
                  new Error('Request timed out, check internet connection'),
                ),
              30000, // 30 seconds timeout
            ),
          ),
        ]);

        if (!response.ok) {
          throw new Error(
            `Network response was not ok, status: ${response.status}`,
          );
        }
        return response;
      };

      let response;
      const dropKmReadingStartTime = performance.now();
      try {
        response = await sendKmReadingData(config.apiPostKmReading);
        console.log('Primary Drop Km API call successful.');
      } catch (initialError) {
        console.warn(
          'Primary Drop Km API call failed, attempting alternative:',
          initialError.message,
        );
        log(
          `${params.tripNo}: WARN - DROPPED - sendDropKmReadings - Primary Drop Km API call failed, attempting alternative: ${initialError.message}`,
        );
        response = await sendKmReadingData(config.apiPostKmReadingAlt); // Try the alternative URL
        console.log('Alternative Drop Km API call successful.');
      } finally {
        const dropKmReadingCompleteTime = performance.now();
        const dropKmReadingTotalTime =
          dropKmReadingCompleteTime - dropKmReadingStartTime;
        console.log(
          `⏳ DROP KM Reading API call(s) took ${dropKmReadingTotalTime.toFixed(
            2,
          )} ms.`,
        );
        log(
          `${
            params.tripNo
          }: INFO - DROP - ⏳ KM Reading API call execution time: ${dropKmReadingTotalTime.toFixed(
            2,
          )} ms.`,
        );
      }

      console.log('DROP - Drop Km Upload Response status:', response.status);
      const responseData = await response.json();
      console.log('DROP - Drop Km Upload Response data:', responseData);
      return true;
    } catch (error) {
      console.error('DROP - Error sending Drop Km Readings:', error);
      log(
        `${params.tripNo}: ERROR - DROPPED - sendDropKmReadings - Error sending Drop Km Reading: ${error.message}`,
      );
      return error.message;
    }
  };

  const handleCompleteTrip = async () => {
    log(
      `${params.tripNo}: DROP - handleCompleteTrip - Get Signature button clicked...`,
    );
    log(`${params.tripNo}: DROP - handleCompleteTrip - Method being called...`);

    if (endKmReadings === '') {
      Alert.alert(
        translationManager.getTranslation('alertAlert'),
        translationManager.getTranslation('alertEnterDropKm'),
      );
      return;
    }
    if (endKmImageUri === '') {
      Alert.alert(
        translationManager.getTranslation('alertAlert'),
        translationManager.getTranslation('alertUploadOdometer'),
      );
      return;
    }
    if (!validateInput(endKmReadings)) {
      return;
    }

    if (parseInt(endKmReadings) <= parseInt(params.pickupKmReadings)) {
      Alert.alert(
        translationManager.getTranslation('alertAlert'),
        translationManager.getTranslation('alertDropKmLess'),
      );
      setPickupKmReadings('0');
      return;
    }

    setTripCompletedTime(currentTime);

    Alert.alert(
      translationManager.getTranslation('alertSignature'),
      translationManager.getTranslation('alertGetSignature'),
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        // {
        //   text: 'Proceed',
        //   onPress: async () => {
        //     setIsCompleteLoading(true);
        //     await stopBackgroundService();

        //     try {
        //       setCurrentStep(1);
        //       const callSendDropKmReadings = await sendDropKmReadings();

        //       if (callSendDropKmReadings == 'No location provider available.') {
        //         Alert.alert(
        //           translationManager.getTranslation('alertLocationPermission'),
        //           translationManager.getTranslation('alertEnableLocation'),
        //           [{text: 'Ok'}],
        //           {cancelable: false},
        //         );
        //         setIsCompleteLoading(false);
        //         return;
        //       } else if (!callSendDropKmReadings) {
        //         Alert.alert(
        //           translationManager.getTranslation('alertLowNetwork'),
        //           translationManager.getTranslation('alertCheckNetworkandTry'),
        //           [{text: 'Ok'}],
        //           {cancelable: false},
        //         );
        //         setIsCompleteLoading(false);
        //         return;
        //       }
        //       //----------------------------------------------------------------------------
        //       // const storedParams = await AsyncStorage.getItem('homeParams');      //To reduce Loading Time on Get Signature Click
        //       // if (storedParams !== null) {
        //       //   const parsedParams = JSON.parse(storedParams);
        //       //   // parsedParams.step = 0;
        //       //   AsyncStorage.setItem(
        //       //     'homeParams',
        //       //     JSON.stringify(parsedParams),
        //       //   );
        //       //   setParams(parsedParams);
        //       //   console.log('DROP -Current Step changed:', parsedParams.step);
        //       // } else {
        //       //   throw new Error('No parameters found in AsyncStorage.');
        //       // }
        //       //----------------------------------------------------------------------------
        //       // const getCompLoc = await Promise.race([                                      //To reduce Loading Time on Get Signature Click
        //       //   getLocation(),
        //       //   new Promise((_, reject) =>
        //       //     setTimeout(
        //       //       () =>
        //       //         reject(
        //       //           new Error(
        //       //             'getLocation to obtain Complete LatLong failed.',
        //       //           ),
        //       //         ),
        //       //       20000,
        //       //     ),
        //       //   ),
        //       // ]);
        //       // if (!getCompLoc) {
        //       //   throw new Error('Failed to obtain complete location.');
        //       // }
        //       const dropPosition = await getCurrentPosition();
        //       const dropLatLong = {
        //         latitude: dropPosition.coords.latitude,
        //         longitude: dropPosition.coords.longitude,
        //       };
        //       //const startLatLong = await obtainStartLatLong(
        //       //  params.vendorAddress,
        //       // );

        //       // Calculate the distance between pickup to drop

        //       //const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${params.pickupLatLong.latitude},${params.pickupLatLong.longitude}:${dropLatLong.latitude},${dropLatLong.longitude}/json?instructionsType=text&computeBestOrder=true&routeRepresentation=polyline&computeTravelTimeFor=all&vehicleHeading=20&report=effectiveSettings&routeType=eco&traffic=true&travelMode=car&vehicleCommercial=true&vehicleEngineType=combustion&key=${apiKey}`;
        //       // const routeUrl = buildRouteUrl(
        //       //   params.pickupLatLong.latitude,
        //       //   params.pickupLatLong.longitude,
        //       //   dropLatLong.latitude,
        //       //   dropLatLong.longitude,
        //       // );
        //       // log(
        //       //   `${params.tripNo}: DROP - sendDropKmReadings - Route API URL to calculate the distance between Start Location and Pickup Location(without vendor address) : ${routeUrl}`,
        //       // );
        //       //const routeResponse = await fetch(routeUrl);
        //       //const routeData = await routeResponse.json();
        //       //const lengthInMeters = routeData.routes[0].summary.lengthInMeters;

        //       const signParams = {
        //         startKmReadings: params.startKmReadings,
        //         pickupKmReadings: params.pickupKmReadings || pickupKmReadings,
        //         endKmReadings: endKmReadings,
        //         endKmImageUri: endKmImageUri,
        //         tripNo: params.tripNo,
        //         custName: params.custName,
        //         custMobile: params.custMobile,
        //         reportTime: params.reportTime,
        //         pickUpLoc: params.pickUpLoc,
        //         dropLoc: params.dropLoc,
        //         driverId: params.driverId,
        //         driverPhone: params.driverPhone,
        //         tripCompletedTime: currentTime,
        //         vendorAddress: params.vendorAddress,
        //         //startLatLong: startLatLong,
        //         pickupLatLong: params.pickupLatLong,
        //         dropLatLong: dropLatLong,
        //         //approxTravelDistance: approxDistance,
        //       };
        //       AsyncStorage.setItem('signParams', JSON.stringify(signParams));

        //       // Send the complete Location and Final Route Co-ordinates ..
        //       const granted = await PermissionsAndroid.request(
        //         PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        //       );

        //       if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        //         console.log('DROP -Location permission granted');
        //         const getCompleteLocation = await Promise.race([
        //           getLocation(),
        //           new Promise((_, reject) =>
        //             setTimeout(
        //               () =>
        //                 reject(
        //                   new Error(
        //                     'getLocation to send Complete LocationDetails failed.',
        //                   ),
        //                 ),
        //               20000,
        //             ),
        //           ),
        //         ]);

        //         const sendCompleteLocationRequest = async (
        //           baseUrl,
        //           tripNo,
        //           latitude,
        //           longitude,
        //           locationName,
        //         ) => {
        //           const curDate = getCurrentDate(); // Ensure this function is defined
        //           const curTime = getCurrentTime(); // Ensure this function is defined
        //           const timeStamp = curDate + ' ' + curTime;

        //           const queryStringValue = `${tripNo}|$|${timeStamp}|$|${latitude}|$|${longitude}|$|${locationName}`;
        //           const url = `${baseUrl}${queryStringValue}`;

        //           console.log('Drop Location Saving URL :', url);
        //           log(
        //             `${tripNo}: DROP - Attempting to save complete location to URL: ${url}`,
        //           );
        //           const authToken = await AsyncStorage.getItem(
        //             'API_AUTH_TOKEN',
        //           );
        //           const response = await Promise.race([
        //             fetch(url, {
        //               method: 'POST',
        //               headers: {
        //                 'Content-Type': 'application/json',
        //                 Authorization: `Bearer ${authToken}`,
        //               },
        //             }),
        //             new Promise((_, reject) =>
        //               setTimeout(
        //                 () =>
        //                   reject(
        //                     new Error(
        //                       'Request timed out, check internet connection for complete location API',
        //                     ),
        //                   ),
        //                 20000, // 20-second timeout
        //               ),
        //             ),
        //           ]);

        //           if (!response.ok) {
        //             throw new Error(
        //               `Network response was not ok from ${baseUrl}: ${response.statusText}`,
        //             );
        //           }

        //           const data = await response.json();
        //           console.log('DROP - Complete location API Response:', data);
        //           log(
        //             `${tripNo}: DROP - Complete location API Response from ${baseUrl}: ${JSON.stringify(
        //               data,
        //             )}`,
        //           );
        //           return data;
        //         };

        //         if (getCompleteLocation) {
        //           try {
        //             const curDate = getCurrentDate();
        //             const curTime = getCurrentTime();
        //             const timeStamp = curDate + ' ' + curTime;
        //             const position = await getCurrentPosition(); // Ensure getCurrentPosition() is defined
        //             const {latitude, longitude} = position.coords;
        //             const coordsString = `${longitude},${latitude}`;
        //             //await saveLocation(coordsString);
        //             //await handleNewLocation(coordsString); // Distance API
        //             await saveCoordinate(coordsString); // Route API
        //             const dropLocCalcStartTime = performance.now();
        //             // const locationName = await getAddressFromLatLng(
        //             //   latitude,
        //             //   longitude,
        //             // );

        //             // 1. Wrap the call in a Promise.race
        //             const locationName = await Promise.race([
        //             getAddressFromLatLng(latitude, longitude),
        //             new Promise((_, reject) =>
        //               setTimeout(
        //                 () => reject(new Error('Address lookup timed out')),
        //                 15000 // 15-second timeout
        //               )
        //             ),
        //             ]).catch((err) => {
        //             // 2. Handle the timeout or error gracefully
        //             console.warn("Address fetch failed or timed out:", err.message);
        //             log(`${params.tripNo}: WARN - Address lookup failed: ${err.message}`);
  
        //             // Return a fallback so the rest of your URL building doesn't break
        //             return "Address Unavailable"; 
        //             });
        //             const dropLocCalcCompTime = performance.now();
        //             const dropLocCalcTotalTime =
        //               dropLocCalcCompTime - dropLocCalcStartTime;

        //             console.log(
        //               `⏳ DROP - getAddressFromLatLng took ${dropLocCalcTotalTime.toFixed(
        //                 2,
        //               )} ms.`,
        //             );
        //             log(
        //               `${
        //                 params.tripNo
        //               }: INFO - DROP - ⏳ getAddressFromLatLng execution time: ${dropLocCalcTotalTime.toFixed(
        //                 2,
        //               )} ms.`,
        //             );

        //             console.log(
        //               'Location Name from handleComplete:',
        //               locationName,
        //             );
        //             const queryStringValue = `${params.tripNo}|$|${timeStamp}|$|${latitude}|$|${longitude}|$|${locationName}`;
        //             console.log('DROP -Query String:', queryStringValue);

        //             // --- Primary and Alternative API Call Logic ---
        //             try {
        //               await sendCompleteLocationRequest(
        //                 config.apiPostLocation, // Primary URL
        //                 params.tripNo,
        //                 latitude,
        //                 longitude,
        //                 locationName,
        //               );
        //               console.log(
        //                 'Primary Complete Location API call successful.',
        //               );
        //             } catch (primaryError) {
        //               console.warn(
        //                 'Primary Complete Location API call failed, attempting alternative:',
        //                 primaryError.message,
        //               );
        //               log(
        //                 `${params.tripNo}: DROP - Primary complete location API failed: ${primaryError.message}. Trying alt.`,
        //               );
        //               await sendCompleteLocationRequest(
        //                 config.apiPostLocationAlt, // Alternative URL
        //                 params.tripNo,
        //                 latitude,
        //                 longitude,
        //                 locationName,
        //               );
        //               console.log(
        //                 'Alternative Complete Location API call successful.',
        //               );
        //             }
        //           } catch (error) {
        //             console.error(
        //               'Error sending Complete Location data to API (after retries):',
        //               error,
        //             );
        //             // You can choose to show an Alert here if you want to notify the user
        //             // Alert.alert(
        //             //   'Network Error',
        //             //   'Failed to send complete location. Please check your internet connection.',
        //             //   [{text: 'Ok'}],
        //             //   {cancelable: false},
        //             // );
        //             log(
        //               `${params.tripNo}: DROP - handleCompleteTrip - FINAL Error sending Complete Location data to API: ${error.message}`,
        //             );
        //           } finally {
        //             setIsCompleteLoading(false); // Ensure this is always called
        //           }
        //         } else {
        //           // Original else block (if getCompleteLocation is false)
        //           Alert.alert(
        //             translationManager.getTranslation('alertLowNetwork'),
        //             translationManager.getTranslation(
        //               'alertCheckNetworkandTry',
        //             ),
        //             [{text: 'Ok'}],
        //             {cancelable: false},
        //           );
        //           console.log(
        //             'Cannot obtain Complete location to send Location Details.',
        //           );
        //           log(
        //             `${params.tripNo}: DROP - Cannot obtain Complete location to send Location Details.`,
        //           );
        //         }

        //         // Navigate to the next screen..
        //         AsyncStorage.setItem('currentScreen', 'Signature');
        //         navigation.navigate('Signature', signParams);
                
        //       } else {
        //         console.log('DROP -Location permission denied');
        //         log(
        //           `${params.tripNo}: DROP - handleCompleteTrip - Location permission denied`,
        //         );
        //       }
        //       setPickupKmReadings('');
        //       setPickupKmImageUri('');
        //       // setCurrentStep(0);
        //     } catch (error) {
        //       console.error('Error during trip completion process:', error);
        //       log(`${params.tripNo}: DROP - handleCompleteTrip - Error during trip completion process:', ${error}`);
        //       Alert.alert(
        //         translationManager.getTranslation('alertLowNetwork'),
        //         translationManager.getTranslation('alertCheckNetworkandTry'),
        //         [{text: 'Ok'}],
        //         {cancelable: false},
        //       );
        //       setIsCompleteLoading(false);
        //       return;
        //     } finally {
        //       setIsCompleteLoading(false);
        //       setCurrentStep(0);
        //     }
        //   },
        // },
        {
          text: 'Proceed',
          onPress: async () => {
          setIsCompleteLoading(true);
          await stopBackgroundService();

          try {
                setCurrentStep(1);
                const callSendDropKmReadings = await sendDropKmReadings();

                // 1. STACKED VALIDATION: Stop navigation if KM Reading failed
                if (callSendDropKmReadings === 'No location provider available.') {
                    Alert.alert(
                    translationManager.getTranslation('alertLocationPermission'),
                    translationManager.getTranslation('alertEnableLocation'),
                 );
                setIsCompleteLoading(false);
                return; 
                } 
      
                // If it returns an error message (string) or false, stop navigation
                if (callSendDropKmReadings !== true) {
                    Alert.alert(
                    translationManager.getTranslation('alertLowNetwork'),
                    typeof callSendDropKmReadings === 'string' ? callSendDropKmReadings 
                    : translationManager.getTranslation('alertCheckNetworkandTry'),
                    );
                    setIsCompleteLoading(false);
                    return; 
                }

                // 2. PROCEED TO PREPARE NEXT SCREEN DATA
                const dropPosition = await getCurrentPosition();
                const dropLatLong = {
                  latitude: dropPosition.coords.latitude,
                  longitude: dropPosition.coords.longitude,
                };

                const signParams = {
                startKmReadings: params.startKmReadings,
                pickupKmReadings: params.pickupKmReadings || pickupKmReadings,
                endKmReadings: endKmReadings,
                endKmImageUri: endKmImageUri,
                tripNo: params.tripNo,
                custName: params.custName,
                custMobile: params.custMobile,
                reportTime: params.reportTime,
                pickUpLoc: params.pickUpLoc,
                dropLoc: params.dropLoc,
                driverId: params.driverId,
                driverPhone: params.driverPhone,
                tripCompletedTime: currentTime,
                vendorAddress: params.vendorAddress,
                //startLatLong: startLatLong,
                pickupLatLong: params.pickupLatLong,
                dropLatLong: dropLatLong,
                //approxTravelDistance: approxDistance,
              };

      await AsyncStorage.setItem('signParams', JSON.stringify(signParams));

      // 3. LOCATION PERMISSION & FINAL SYNC
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        try {
          // Wrap everything in this block to ensure any failure here 
          // doesn't block the final navigation if you consider this optional.
          const position = await getCurrentPosition();
          const {latitude, longitude} = position.coords;
          const coordsString = `${longitude},${latitude}`;
          await saveCoordinate(coordsString);

          const locationName = await Promise.race([
            getAddressFromLatLng(latitude, longitude),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 15000)
            )
          ]).catch(() => "Address Unavailable");

          // Attempt to sync location, but we don't 'return' on failure here
          // because we already successfully sent the KM readings above.
          try {
            await sendCompleteLocationRequest(
              config.apiPostLocation,
              params.tripNo,
              latitude,
              longitude,
              locationName
            );
          } catch (apiErr) {
            console.warn("Location sync failed, but KM was saved. Proceeding.");
          }
        } catch (innerErr) {
          log(`Minor failure in background sync: ${innerErr.message}`);
        }
      }

      // 4. FINAL NAVIGATION (Only reached if KM sync was true)
      await AsyncStorage.setItem('currentScreen', 'Signature');
      navigation.navigate('Signature', signParams);
      
      // Clear temporary states
      setPickupKmReadings('');
      setPickupKmImageUri('');

    } catch (error) {
      console.error('Error during trip completion process:', error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsCompleteLoading(false);
      setCurrentStep(0);
    }
  },
},
      ],
      {cancelable: false},
    );
    log(`${params.tripNo}: DROP - handleCompleteTrip - Method completed.`);
  };

  return (
    <KeyboardAvoidingView
      style={{flex: 1}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      <NewHeader showTripDrawer={true} currentTripId={params.tripNo} currentDriverId={params.driverId} currentScreen={'DROPPED'}/>
      <View style={{flex: 1}}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{flexGrow: 1}}
            keyboardShouldPersistTaps="handled">
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
                      style={styles.tripDetailsLabel}>
                      {item.label}:
                    </Text>
                    <Text
                      allowFontScaling={false}
                      style={styles.tripDetailsData}>
                      {item.value}
                    </Text>
                  </View>
                ))}

                {/* Guest Mobile */}
                <View style={styles.row}>
                  <Text
                    allowFontScaling={false}
                    style={styles.tripDetailsLabel}>
                    {translationManager.getTranslation('guestPhoneLabel')}:
                  </Text>
                  <View style={styles.rightSection}>
                    <Text
                      allowFontScaling={false}
                      style={styles.tripDetailsData}>
                      {params.custMobile}
                    </Text>
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() => handlePressPhoneNumber('Customer')}>
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
                  <Text
                    allowFontScaling={false}
                    style={styles.tripDetailsLabel}>
                    {translationManager.getTranslation('pickupAddressLabel')}:
                  </Text>
                  <Text allowFontScaling={false} style={styles.tripDetailsData}>
                    {params.pickUpLoc}
                  </Text>
                </View>

                {/* Remarks */}
                <View style={styles.row}>
                  <Text
                    allowFontScaling={false}
                    style={styles.tripDetailsLabel}>
                    {translationManager.getTranslation('dropLocationLabel')}:
                  </Text>
                  <Text allowFontScaling={false} style={styles.tripDetailsData}>
                    {params.dropLoc}
                  </Text>
                </View>
                {/* Booker Name */}
                <View style={styles.row}>
                  <Text
                    allowFontScaling={false}
                    style={styles.tripDetailsLabel}>
                    {translationManager.getTranslation('bookerNameLabel')}:
                  </Text>
                  <Text allowFontScaling={false} style={styles.tripDetailsData}>
                    {params.bookerName}
                  </Text>
                </View>

                {/* Booker Mobile */}
                <View style={styles.row}>
                  <Text
                    allowFontScaling={false}
                    style={styles.tripDetailsLabel}>
                    {translationManager.getTranslation('bookerPhoneLabel')}:
                  </Text>
                  <View style={styles.rightSection}>
                    <Text
                      allowFontScaling={false}
                      style={styles.tripDetailsData}>
                      {params.bookerMobile}
                    </Text>
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() => handlePressPhoneNumber('Booker')}>
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
                    <FontAwesomeIcon
                      icon={faCircleCheck}
                      size={20}
                      color="green"
                    />
                    <Text allowFontScaling={false} style={styles.caption}>
                      {translationManager.getTranslation('pickedUp')}
                    </Text>
                  </View>
                  <View style={styles.line} />
                  <View style={styles.step}>
                    <FontAwesomeIcon icon={faCar} size={20} color="#0c4160" />
                    <Text allowFontScaling={false} style={styles.caption}>
                      {translationManager.getTranslation('drop')}
                    </Text>
                  </View>
                </View>
                <View style={styles.mainContainer}>
                  <Text allowFontScaling={false} style={styles.motivation}>
                    {translationManager.getTranslation('dropQuote')}
                  </Text>
                  <View style={styles.pickupDetails}>
                    <Text allowFontScaling={false} style={styles.pickupLabel}>
                      {translationManager.getTranslation('pickupKmLabel')}:{' '}
                    </Text>
                    <Text allowFontScaling={false} style={styles.pickupValue}>
                      {params.pickupKmReadings}{' '}
                      {translationManager.getTranslation('km')}
                    </Text>
                  </View>
                  <View style={styles.upload}>
                    <TextInput
                      allowFontScaling={false}
                      style={styles.textinput}
                      placeholder={translationManager.getTranslation(
                        'dropKmPlaceHolder',
                      )}
                      placeholderTextColor={'#D0D0D0'}
                      keyboardType="numeric"
                      maxLength={7}
                      onChangeText={setEndKmReadings}
                      value={endKmReadings} // Newly added on 04/09/2025 to eliminate the previous trip reading pre-populate
                    />
                    <View style={styles.imageWrapper}>
                      <ImageCapture
                        title={translationManager.getTranslation(
                          'uploadImageButton',
                        )}
                        onImageCapture={handleEndKmImageCapture}
                        disabled={isDropUploaded}
                      />
                      {isDropUploaded && (
                        <FontAwesomeIcon
                          icon={faSquareCheck}
                          size={16}
                          color="green"
                          style={styles.tickIcon}
                        />
                      )}
                    </View>
                    {/* <ImageCapture
                    title="Upload Image"
                    onImageCapture={handleEndKmImageCapture}></ImageCapture> */}
                  </View>
                </View>
              </View>

              {/* Get Signature Button */}
              <View style={styles.startButtonView}>
                <TouchableOpacity
                  style={[
                    styles.startButton,
                    currentStep !== 0 && styles.disabledButton,
                  ]}
                  disabled={currentStep !== 0}
                  onPress={handleCompleteTrip}>
                  <Text allowFontScaling={false} style={styles.startButtonText}>
                    {isCompleteLoading
                      ? translationManager.getTranslation('loading')
                      : translationManager.getTranslation('getSignatureCaps')}
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
      </View>
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

export default DropScreen;

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
    marginVertical: '2%',
    marginHorizontal: '3%',
    marginTop: '3%',
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
    marginVertical: '2%',
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
    //height: '38%',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: '1%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
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
    shadowOffset: {width: 0, height: 1},
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
  pickupDetails: {
    alignSelf: 'center',
    flexDirection: 'row',
    margin: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  pickupLabel: {
    fontSize: 16,
    color: '#c46960',
    fontWeight: 'bold',
    fontFamily: 'sans-serif-condensed',
  },
  pickupValue: {
    fontSize: 16,
    color: '#0c4160',
    fontWeight: 'bold',
    fontFamily: 'sans-serif-condensed',
    textAlign: 'left',
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
