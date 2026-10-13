import React, { useState, useEffect, useRef } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { faPhoneSquare } from '@fortawesome/free-solid-svg-icons';
import { faCar, faCircle } from '@fortawesome/free-solid-svg-icons';
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
} from '../Threads/BackgroundTask';
import { getDistance } from 'geolib';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../config';
import { startIdleCheck } from '../Threads/BackgroundTask';

const StartScreen = ({ route, language }) => {
  const lang = language || 'en';
  // const { tripNo, custName, custMobile, pickUpLoc, dropLoc, driverId} = route.params;
  const [params, setParams] = useState({});
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(0);
  const [startKmReadings, setStartKmReadings] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [tripStatus, setTripStatus] = useState('');
  const phoneNumbers = {
    Customer: '+91' + params.custMobile,
    Booker: '+91' + params.bookerMobile,
  };
  const [currentTime, setCurrentTime] = useState('');
  const [lat, setLat] = useState('');
  const [long, setLong] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const timeoutValue = parseInt(config.timeoutValue);
  const conTimeoutValue = parseInt(config.connectionTimeoutValue);
  const [isStartLoading, setIsStartLoading] = useState(false);
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
        log('Received param values on Start Screen: ', storedParams);
        if (storedParams !== null && storedParams !== undefined) {
          // If stored parameters exist, use them
          try {
            const parsedParams = JSON.parse(storedParams);
            setParams(parsedParams);
          } catch (error) {
            console.error('Error parsing stored params:', error);
            log('Error parsing stored params:', error);
            setParams({}); // Fallback value
          }
        } else {
          // If no stored parameters, use the parameters passed through navigation
          setParams(route.params || {}); // Fallback value
        }
      } catch (error) {
        console.error(
          'HomeScreen: Error retrieving params from AsyncStorage:',
          error,
        );
        log(
          'HomeScreen: Error retrieving params from AsyncStorage:',
          error,
          error.message,
        );
      }
    };

    fetchParams();
  }, [route.params]);

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
  // useEffect(() => {
  //   if (params.pickupKmReadings) {
  //     setPickupKmReadings(params.pickupKmReadings);
  //   }
  // }, [params.pickupKmReadings]);

  // Store the parameters in AsyncStorage whenever they change
  useEffect(() => {
    // Skip the initial empty state so it doesn't overwrite the stored trip params
    if (!params || Object.keys(params).length === 0) {
      return;
    }
    AsyncStorage.setItem('homeParams', JSON.stringify(params));
  }, [params]);

  // // Function to handle hardware back button press
  // useEffect(() => {
  //   const backAction = () => {
  //     // Always prevent default behavior (disable back button)
  //     return true;
  //   };

  //   // Add event listener for hardware back button press
  //   const backHandler = BackHandler.addEventListener(
  //     'hardwareBackPress',
  //     backAction,
  //   );

  //   // Clean up the event listener on component unmount
  //   return () => backHandler.remove();
  // }, []);

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

  // const sendStartKmReadings = async () => {
  //   try {
  //     const curDate = getCurrentDate();
  //     log(
  //       `${params.tripNo}: START - sendStartKmReadings - Method being called.`,
  //     );
  //     console.log(
  //       'sendStartKmReadings - Driver ID from fetchStartKm method: ',
  //       params.driverId,
  //     );
  //     const apiUrlwithQuery =
  //       config.apiGetStatus +
  //       params.tripNo +
  //       '&did=' +
  //       params.driverId +
  //       '&dt=' +
  //       curDate +
  //       '&status=STARTED&lat=&lon=';
  //     console.log('sendStartKmReadings - Start Km URL:', apiUrlwithQuery);

  //     // const response = await Promise.race([
  //     //   fetch(apiUrlwithQuery, {
  //     //     method: 'GET',
  //     //     headers: {
  //     //       'Content-Type': 'multipart/form-data',
  //     //     },
  //     //   }),
  //     //   new Promise((_, reject) =>
  //     //     setTimeout(
  //     //       () =>
  //     //         reject(new Error('Request timed out, check internet connection')),
  //     //       // conTimeoutValue,
  //     //       15000,
  //     //     ),
  //     //   ),
  //     // ]);

  //     const response = await fetch(apiUrlwithQuery, {
  //       method: 'GET',
  //       headers: {
  //         'Content-Type': 'multipart/form-data',
  //       },
  //     });

  //     if (!response.ok) {
  //       throw new Error('Network response was not ok');
  //     }

  //     console.log('sendStartKmReadings - Response status:', response.status);
  //     // Handle response data as per your application logic
  //     const responseData = await response.json();
  //     console.log('sendStartKmReadings - Response data:', responseData);
  //     log(
  //       `${params.tripNo}: START - sendStartKmReadings - Sending Start Km Reading Successful`,
  //     );
  //     // Return response status or data as needed
  //     return true;
  //   } catch (error) {
  //     console.error('sendStartKmReadings - Start Km API Error:', error);
  //     log(
  //       `${params.tripNo}: START - sendStartKmReadings - Error when sending Start Km Reading:`,
  //       error,
  //     );
  //     return false;
  //   }
  // };

  const sendStartKmReadings = async () => {
    try {
      const curDate = getCurrentDate();
      log(
        `${params.tripNo}: START - sendStartKmReadings - Method being called.`,
      );
      console.log(
        'sendStartKmReadings - Driver ID from fetchStartKm method: ',
        params.driverId,
      );

      const makeApiCall = async baseUrl => {
        const apiUrlwithQuery =
          baseUrl +
          params.tripNo +
          '&did=' +
          params.driverId +
          '&dt=' +
          curDate +
          '&status=STARTED&lat=&lon=';
        console.log('sendStartKmReadings - Start Km URL:', apiUrlwithQuery);
        log(
          `${params.tripNo}: START - sendStartKmReadings - Sending Start Km Reading URL - ${apiUrlwithQuery}`,
        );
        const authToken = await AsyncStorage.getItem('API_AUTH_TOKEN');
        const response = await Promise.race([
          fetch(apiUrlwithQuery, {
            method: 'GET',
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${authToken}`,
            },
          }),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error('Request timed out, check internet connection'),
                ),
              20000, // 20-second timeout
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
      try {
        response = await makeApiCall(config.apiGetStatus);
      } catch (initialError) {
        console.warn(
          'Primary status API call failed, attempting alternative:',
          initialError.message,
        );
        log(
          `${params.tripNo}: WARN - START - sendStartKmReadings - Primary status API call failed, attempting alternative: ${initialError.message}`,
        );
        response = await makeApiCall(config.apiGetStatusAlt); // Try the alternative URL
      }

      console.log('sendStartKmReadings - Response status:', response.status);
      const responseData = await response.json();
      console.log('sendStartKmReadings - Response data:', responseData);
      log(
        `${params.tripNo}: START - sendStartKmReadings - Sending Start Km Reading Successful`,
      );
      return true;
    } catch (error) {
      console.error('sendStartKmReadings - Start Km API Error:', error);
      log(
        `${params.tripNo}: ERROR - START - sendStartKmReadings - Error when sending Start Km Reading: ${error.message}`,
      );
      return false;
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
        'Error requesting foreground location permission:',
        error,
        error.message,
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
        'Error requesting background location permission:',
        error,
        error.message,
      );
      return false;
    }
  };

  //request permission using the above methods..
  const bgLocationPermission = async () => {
    if (await requestForegroundLocationPermission()) {
      if (await requestBackgroundLocationPermission()) {
        log(
          `${params.tripNo}: START - handleArrived - Location permission granted when Arrived clicked`,
        );
        console.log(
          `${params.tripNo}: handleArrived - Location permission granted when Arrived clicked`,
        );
        getLocation();
        startBgTracking();
        return true;
      } else {
        log(
          `${params.tripNo}: START - handleArrived - Background Location permission denied`,
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
        `${params.tripNo}: START - handleArrived - Foreground Location permission denied`,
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

  const handleStart = async () => {
    debugger;
    // log(
    //   `${params.tripNo}: START - handleStart - Trip has been started for TripID: ${params.tripNo}`,
    // );
    // log(`${params.tripNo}: START - handleStart - Start button clicked...`);
    // log(`${params.tripNo}: START - handleStart - Method being called.`);
    setIsStartLoading(true);

    // Idle check runs as a location foreground service, which needs
    // location permission granted before it starts.
    if (!(await requestForegroundLocationPermission())) {
      log(
        `${params.tripNo}: START - handleStart - Foreground Location permission denied`,
      );
      Alert.alert(
        translationManager.getTranslation('alertLocationPermission'),
        translationManager.getTranslation('alertEnableLocation'),
        [{ text: 'Ok', onPress: () => Linking.openSettings() }],
        { cancelable: false },
      );
      setIsStartLoading(false);
      return;
    }

    setTripStatus('STARTED');
    await startIdleCheck(params.tripNo);
    // const destination = params.pickUpLoc;
    // const deepLinkURL = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    // log(`${params.tripNo}: START - handleStart - DeeplinkURL: ${deepLinkURL}`);
    // console.log('handleStart - DeeplinkURL', deepLinkURL);

    const callSendStartKmReadings = await sendStartKmReadings();
    if (!callSendStartKmReadings) {
      Alert.alert(
        translationManager.getTranslation('alertLowNetwork'),
        translationManager.getTranslation('alertCheckNetworkandTry'),
        [{ text: 'Ok' }],
        { cancelable: false },
      );
      setIsStartLoading(false);
      return;
    }

    // Linking.openURL(deepLinkURL);
    setCurrentStep(1);
    try {
      // Retrieve the stored parameters from AsyncStorage
      const storedParams = await AsyncStorage.getItem('homeParams');
      log(
        `${params.tripNo}: START - handleStart - Retrieved storedParam from Start: ${storedParams}`,
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
          `${params.tripNo}: START - handleStart - Additional param values added in Start.`,
        );
        console.log('handleStart - Additional param values added in Start.');
        navigation.navigate('Arrived');
        AsyncStorage.setItem('currentScreen', 'Arrived');
      }
    } catch (error) {
      console.error('handleStart - Error adding extra values:', error);
      log(
        `${params.tripNo}: ERROR - START - handleStart - Error adding extra values: ${error}, ${error.message}`,
      );
    }
    setIsStartLoading(false);
    log(`${params.tripNo}: START - handleStart - Method Completed.`);
  };

  return (
    <View style={styles.container}>
      <NewHeader
        showTripDrawer={true}
        currentTripId={params.tripNo}
        currentDriverId={params.driverId}
        currentScreen={'START'}
      />
      {/* Date/Time Display */}
      <View style={{ flex: 1 }}>
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
                onPress={() => handlePressPhoneNumber('Customer')}
              >
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
                onPress={() => handlePressPhoneNumber('Booker')}
              >
                <FontAwesomeIcon icon={faPhoneSquare} size={18} color="green" />
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
              <FontAwesomeIcon icon={faCar} size={20} color="#0c4160" />
              <Text allowFontScaling={false} style={styles.caption}>
                {translationManager.getTranslation('start')}
              </Text>
            </View>
            <View style={styles.line} />
            <View style={styles.step}>
              <FontAwesomeIcon icon={faCircle} size={20} color="gray" />
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
              {translationManager.getTranslation('tripStartQuote')}
            </Text>
          </View>
        </View>

        {/* Start Button */}
        <View style={styles.startButtonView}>
          <TouchableOpacity
            style={[
              styles.startButton,
              currentStep !== 0 && styles.disabledButton,
            ]}
            onPress={handleStart}
            disabled={currentStep !== 0}
          >
            <Text allowFontScaling={false} style={styles.startButtonText}>
              {isStartLoading
                ? translationManager.getTranslation('loading')
                : translationManager.getTranslation('startTrip')}
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
      <NewFooter
        driverId={params.driverId}
        driverPhone={params.driverPhone}
        showReport={true}
      />
    </View>
  );
};

export default StartScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  datetime: {
    flex: 0.04,
    minHeight: 20,
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
    flex: 0.005,
    //height: '0.2%',
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
    color: Colors.text,
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
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
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
    color: Colors.danger,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    justifyContent: 'center',
  },
});
