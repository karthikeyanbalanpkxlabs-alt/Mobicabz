import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  TextInput,
  PermissionsAndroid,
  TouchableOpacity,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import MyButton from '../components/MyButton';
import ModernButton from '../components/ModernButton';
import ModernButton2 from '../components/ModernButton2';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import translations from '../translations';
import translationManager from '../translationManager';
import {getMessaging, getToken as getFcmToken} from '@react-native-firebase/messaging';
import config from '../config';
import {MAPPLS_CONFIG} from '../config';
import SQLite from 'react-native-sqlite-storage';
import {enableScreens} from 'react-native-screens';
import Footer from '../components/Footer';
import fetch from 'isomorphic-fetch';
import {log, readLog} from '../components/Logger';
import DeviceInfo from 'react-native-device-info';
import NewFooter from '../components/NewFooter';

enableScreens();

const LoginScreen = ({language, route}) => {
  const version = DeviceInfo.getVersion();
  const lang = language || 'en';
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(0);
  const [enteredMobileNumber, setEnteredMobileNumber] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [driverId, setDriverId] = useState('');
  const [fcmToken, setFcmToken] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [showResendOtp, setShowResendOtp] = useState(0);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [render, setRender] = useState(true);
  const getRef = useRef(null);
  const [getOtpLoading, setGetOtpLoading] = useState(false); // State for Get OTP button loader
  const [verifyOtpLoading, setVerifyOtpLoading] = useState(false);
  const [isVerificationFailed, setIsVerificationFailed] = useState(false);
  // const verifyRef = useRef(null);

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

  // to get the FCM Token
  const getToken = async () => {
    try {
      const token = await getFcmToken(getMessaging());
      console.log('FCM Token Generated');
      log(`LOGIN_SCREEN: getToken - FCM token generated.`);
      setFcmToken(token);
    } catch (error) {
      console.error('Error getting FCM Token:', error);
      log('LOGIN_SCREEN: getToken - Error getting FCM Token:', error.message);
    }
  };

  useEffect(() => {
    // getLocationPermission();
    getToken();
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

  const handleLoginStatus = async () => {
    log('LOGIN_SCREEN - handleLoginStatus - STARTED');
    try {
      await AsyncStorage.setItem('userLoggedIn', 'true');
      console.log('LoggedIn status changed successfully.');
      log(
        'LOGIN_SCREEN: handleLoginStatus - LoggedIn status changed successfully.',
      );
    } catch (error) {
      console.error('Error setting login status:', error);
      log(
        'ERROR - LOGIN_SCREEN: handleLoginStatus - Error setting login status: ',
        error.message,
      );
    }
    log('LOGIN_SCREEN - handleLoginStatus - COMPLETED');
  };

  // const handleGetOTP = async () => {
  //   log('LOGIN_SCREEN - handleGetOTP - STARTED');

  //   if (enteredMobileNumber === '') {
  //     Alert.alert(
  //       translationManager.getTranslation('Error'),
  //       translationManager.getTranslation('alertRegisteredMobile'),
  //     );
  //   } else if (enteredMobileNumber.length < 10) {
  //     Alert.alert(
  //       translationManager.getTranslation('Error'),
  //       translationManager.getTranslation('alertMobileNumber'),
  //     );
  //   } else {
  //     // try {
  //     //   const apiUrl = config.apiGetOtp + enteredMobileNumber;
  //     //   console.log('Get OTP Url: ' + apiUrl);
  //     //   log(`LOGIN_SCREEN: handleGetOTP - Get OTP Url: ${apiUrl}`);

  //     //   // const timeoutValue = parseInt(config.connectionTimeoutValue);
  //     //   const timeoutValue = 30000;

  //     //   const response = await Promise.race([
  //     //     fetch(apiUrl, {
  //     //       method: 'GET',
  //     //       headers: {
  //     //         'Content-Type': 'application/json',
  //     //       },
  //     //     }),
  //     //     new Promise((_, reject) =>
  //     //       setTimeout(
  //     //         () =>
  //     //           reject(
  //     //             new Error('Request timed out, Check Internet Connection'),
  //     //           ),
  //     //         timeoutValue,
  //     //       ),
  //     //     ),
  //     //   ]);

  //     //   if (response.ok) {
  //     //     Alert.alert(
  //     //       translationManager.getTranslation('alertOTPSent'),
  //     //       translationManager.getTranslation('alertOTPMobile'),
  //     //       [
  //     //         {
  //     //           text: 'Ok',
  //     //           onPress: () => {
  //     //             console.log('OTP sent to registered mobile number');
  //     //             log(
  //     //               'LOGIN_SCREEN: handleGetOTP - OTP sent to registered mobile number',
  //     //             );
  //     //             setCurrentStep(1);
  //     //             setShowOtpInput(true);
  //     //             // verifyRef.current.focus();
  //     //           },
  //     //         },
  //     //       ],
  //     //       {cancelable: false},
  //     //     );
  //     //     const data = await response.json();
  //     //     const driverData = data.Driver;

  //     //     // Store Driver details in SQLite database
  //     //     await insertDriverDetails(driverData);
  //     //   } else {
  //     //     throw new Error('Failed to request OTP');
  //     //   }
  //     // } catch (error) {
  //     //   console.error('Error requesting OTP:', error.message);
  //     //   log(
  //     //     `LOGIN_SCREEN: handleGetOTP - Error requesting OTP ${error.message}`,
  //     //   );
  //     //   Alert.alert(
  //     //     translationManager.getTranslation('alertErrorRequestOtp'),
  //     //     translationManager.getTranslation('alertCheckConnection'),
  //     //   );
  //     // }  single api url handling : cause NPA64 error on some devices......
  //     try {
  //       setGetOtpLoading(true);
  //       const apiUrl = config.apiGetOtp + enteredMobileNumber;
  //       console.log('Get OTP Url: ' + apiUrl);
  //       log(`LOGIN_SCREEN: handleGetOTP - Get OTP Url: ${apiUrl}`);

  //       const timeoutValue = 20000; // 20 seconds

  //       let response;
  //       try {
  //         response = await Promise.race([
  //           fetch(apiUrl, {
  //             method: 'GET',
  //             headers: {
  //               'Content-Type': 'application/json',
  //             },
  //           }),
  //           new Promise((_, reject) =>
  //             setTimeout(
  //               () =>
  //                 reject(
  //                   new Error('Request timed out, Check Internet Connection'),
  //                 ),
  //               timeoutValue,
  //             ),
  //           ),
  //         ]);
  //       } catch (initialError) {
  //         // If the first API call fails (e.g., due to timeout or network error),
  //         // try the alternative API endpoint.
  //         console.warn(
  //           'Initial API call failed, attempting alternative:',
  //           initialError.message,
  //         );
  //         log(
  //           `WARN - LOGIN_SCREEN: handleGetOTP - Initial API call failed, attempting alternative: ${initialError.message}`,
  //         );

  //         const altApiUrl = config.apiGetOtpAlt + enteredMobileNumber;
  //         console.log('Get OTP Alt Url: ' + altApiUrl);
  //         log(`LOGIN_SCREEN: handleGetOTP - Get OTP Alt Url: ${altApiUrl}`);

  //         response = await Promise.race([
  //           fetch(altApiUrl, {
  //             method: 'GET',
  //             headers: {
  //               'Content-Type': 'application/json',
  //             },
  //           }),
  //           new Promise((_, reject) =>
  //             setTimeout(
  //               () =>
  //                 reject(
  //                   new Error(
  //                     'Request timed out for alternative, Check Internet Connection',
  //                   ),
  //                 ),
  //               timeoutValue,
  //             ),
  //           ),
  //         ]);
  //       }

  //       if (response.ok) {
  //         Alert.alert(
  //           translationManager.getTranslation('alertOTPSent'),
  //           translationManager.getTranslation('alertOTPMobile'),
  //           [
  //             {
  //               text: 'Ok',
  //               onPress: () => {
  //                 console.log('OTP sent to registered mobile number');
  //                 log(
  //                   'LOGIN_SCREEN: handleGetOTP - OTP sent to registered mobile number',
  //                 );
  //                 setCurrentStep(1);
  //                 setShowOtpInput(true);
  //                 // verifyRef.current.focus();
  //               },
  //             },
  //           ],
  //           {cancelable: false},
  //         );
  //         const data = await response.json();
  //         const driverData = data.Driver;
  //         AsyncStorage.setItem('TrackInterval',String(driverData.LatLongPositionCalcTime));

  //         console.log(
  //           'Received Driver Data on GetOTP: ' + JSON.stringify(data),
  //         );
  //         log(
  //           'LOGIN_SCREEN - Received Driver Data on GetOTP: ' + JSON.stringify(data),
  //         );

  //         // Store Driver details in SQLite database
  //         await insertDriverDetails(driverData);
  //       } else {
  //         throw new Error('Failed to request OTP from both endpoints'); // Or a more specific message
  //       }
  //     } catch (error) {
  //       console.error('Error requesting OTP:', error.message);
  //       log(
  //         `ERROR - LOGIN_SCREEN: handleGetOTP - Error requesting OTP ${error.message}`,
  //       );
  //       Alert.alert(
  //         translationManager.getTranslation('alertErrorRequestOtp'),
  //         translationManager.getTranslation('alertCheckConnection'),
  //       );
  //     } finally {
  //       setGetOtpLoading(false);
  //     }
  //   }
  //   log('LOGIN_SCREEN - handleGetOTP - COMPLETED');
  // };

  const handleGetOTP = async () => {
  log('LOGIN_SCREEN - handleGetOTP - STARTED');

  if (enteredMobileNumber === '') {
    Alert.alert(
      translationManager.getTranslation('Error'),
      translationManager.getTranslation('alertRegisteredMobile'),
    );
    return; // Stop execution here
  } 
  
  if (enteredMobileNumber.length < 10) {
    Alert.alert(
      translationManager.getTranslation('Error'),
      translationManager.getTranslation('alertMobileNumber'),
    );
    return; // Stop execution here
  }

  try {
    setGetOtpLoading(true);
    const timeoutValue = 20000;
    let response;

    const performRequest = async (url) => {
      return await Promise.race([
        fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), timeoutValue)
        ),
      ]);
    };

    // --- API Call Logic ---
    try {
      response = await performRequest(config.apiGetOtp + enteredMobileNumber);
    } catch (initialError) {
      log(`WARN - Primary API failed: ${initialError.message}. Trying Alt.`);
      try {
        response = await performRequest(config.apiGetOtpAlt + enteredMobileNumber);
      } catch (altError) {
        throw new Error('CONNECTION_FAILURE');
      }
    }

    // --- Response Handling ---
    // 1. Read JSON ONCE
    const result = await response.json();

    // 2. Check for your specific Driver error in the JSON body
    if (result.StatusMessage === 'Driver details not found for the given phone number') {
      throw new Error('DRIVER_NOT_FOUND');
    }

    if (response.ok) {
      // 3. Use the ALREADY PARSED 'result' instead of calling .json() again
      const driverData = result.Driver || result.Data; // Adjust based on your JSON structure

      if (!driverData) throw new Error('DATA_EMPTY');

      await AsyncStorage.setItem('TrackInterval', String(driverData.LatLongPositionCalcTime));
      await insertDriverDetails(driverData);

      Alert.alert(
        translationManager.getTranslation('alertOTPSent'),
        translationManager.getTranslation('alertOTPMobile'),
        [{ text: 'Ok', onPress: () => {
            setCurrentStep(1);
            setShowOtpInput(true);
        }}]
      );
    } else {
      throw new Error('API_ERROR');
    }

  } catch (error) {
    console.error('Error requesting OTP:', error.message);
    log(`ERROR - LOGIN_SCREEN: handleGetOTP - ${error.message}`);

    if (error.message === 'DRIVER_NOT_FOUND') {
      Alert.alert(
        translationManager.getTranslation('alertErrorRequestOtp'),
        translationManager.getTranslation('alertCheckMobileNo'),
      );
    } else if (error.message === 'CONNECTION_FAILURE'){
      Alert.alert(
        translationManager.getTranslation('alertErrorRequestOtp'),
        translationManager.getTranslation('alertCheckConnection'),
      );
    } else {
      Alert.alert(
        translationManager.getTranslation('alertErrorRequestOtp'),
        translationManager.getTranslation('something'),
      );
    }
  } finally {
    setGetOtpLoading(false);
    log('LOGIN_SCREEN - handleGetOTP - COMPLETED');
  }
};
  const insertDriverDetails = async driver => {
    log('LOGIN_SCREEN - insertDriverDetails - STARTED');

    try {
      // Open database
      const db = await SQLite.openDatabase({
        name: 'expressDb.db',
        location: 'default',
      });
      log('LOGIN_SCREEN: insertDriverDetails - Opened database expressDb.db');

      // Create table if not exists
      await db.executeSql(`
        CREATE TABLE IF NOT EXISTS driverData (
          DriverID INTEGER,
          DriverName TEXT,
          DriverType TEXT,
          AddressLine1 TEXT,
          AddressLine2 TEXT,
          City TEXT,
          DriverPhone TEXT,
          LicenseNumber TEXT,
          LicenseRenewalDate TEXT,
          DateOfJoining TEXT,
          DriverVersion INTEGER
        );
      `);
      log(
        'LOGIN_SCREEN: insertDriverDetails - Created driverData table if not exists',
      );

      // Delete existing driver data
      await db.executeSql(`DELETE FROM driverData`);
      AsyncStorage.removeItem('driverId');
      AsyncStorage.removeItem('driverPhone');

      // Insert driver details
      await db.executeSql(
        `
        INSERT INTO driverData (DriverID, DriverName, DriverType, AddressLine1, AddressLine2, City, DriverPhone, LicenseNumber, LicenseRenewalDate, DateOfJoining, DriverVersion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
        [
          driver.DriverID,
          driver.DriverName,
          driver.DriverType,
          driver.AddressLine1,
          driver.AddressLine2,
          driver.City,
          driver.DriverPhone,
          driver.DrivingLicenseNo,
          driver.DrivingLicenseValidUpto,
          driver.DateOfJoining,
          driver.DriverVersion
        ],
      );
      log(
        'LOGIN_SCREEN: insertDriverDetails - Inserted driver details into driverData table',
      );
      setDriverId(driver.DriverID);
      // Handle driverId
      if (driver.DriverID !== undefined && driver.DriverID !== null) {
        console.log(
          'Driver Id before insert into Async Storage: ' + driver.DriverID,
        );
        AsyncStorage.setItem('driverId', String(driver.DriverID));

      } else {
        AsyncStorage.removeItem('driverId');
      }

      // Handle driverPhone
      if (driver.DriverPhone !== undefined && driver.DriverPhone !== null) {
        console.log(
          'Driver Phone before insert into Async Storage: ' +
            driver.DriverPhone,
        );
        AsyncStorage.setItem('driverPhone', String(driver.DriverPhone));
      } else {
        AsyncStorage.removeItem('driverPhone');
      }

      // Handle trackInterval
      if (driver.LatLongPositionCalcTime !== undefined && driver.LatLongPositionCalcTime !== null) {
        console.log(
          'Track Interval before insert into Async Storage: ' +
            driver.LatLongPositionCalcTime,
        );
        AsyncStorage.setItem('trackInterval', String(driver.LatLongPositionCalcTime));
      } else {
        AsyncStorage.removeItem('trackInterval');
      }

      // Handle driverVersion
      if (driver.DriverVersion !== undefined && driver.DriverVersion !== null) {
        console.log(
          'Driver Version before insert into Async Storage: ' +
            driver.DriverVersion,
        );
        AsyncStorage.setItem('driverVersion', String(driver.DriverVersion));
      } else {
        AsyncStorage.removeItem('driverVersion');
      }

      const asyncDriverId = await AsyncStorage.getItem('driverId');
      const asyncDriverPhone = await AsyncStorage.getItem('driverPhone');
      const asyncTrackInterval = await AsyncStorage.getItem('TrackInterval');
      const asyncDriverVersion = await AsyncStorage.getItem('driverVersion');

      console.log('Saved Track Interval : ', Number(asyncTrackInterval));
      console.log('Saved Driver Version : ', Number(asyncDriverVersion));
      console.log(
        'Async Stored Driver Details: ' +
          asyncDriverId +
          '; ' +
          asyncDriverPhone,
      );

      // Close database
      await db.close();
      log('LOGIN_SCREEN: insertDriverDetails - Closed database expressDb.db');
      console.log('Driver details inserted successfully.');
    } catch (error) {
      console.log('Error inserting driver details:', error);
      log(
        `ERROR - LOGIN_SCREEN: insertDriverDetails - Error inserting Driver details: ${error.message}`,
      );
    }
    log('LOGIN_SCREEN - insertDriverDetails - COMPLETED');
  };

  const changeLanguage = () => {
    log('LOGIN_SCREEN - changeLanguage - STARTED');

    Alert.alert(
      translationManager.getTranslation('alertChangeLanguage'),
      translationManager.getTranslation('alertSelectLanguage'),
      [
        {
          text: 'English',
          onPress: async () => {
            translationManager.changeLanguage('en');
            await AsyncStorage.setItem('language', 'en');
            console.log('Language changed to English.');
            log('LOGIN_SCREEN: changeLanguage - Language changed to English.');
            setRender(!render);
          },
        },
        {
          text: 'हिंदी',
          onPress: async () => {
            translationManager.changeLanguage('hi');
            await AsyncStorage.setItem('language', 'hi');
            console.log('Language changed to Hindi.');
            log('LOGIN_SCREEN: changeLanguage - Language changed to Hindi.');
            setRender(!render);
          },
        },
      ],
      {cancelable: false},
    );
    log('LOGIN_SCREEN - changeLanguage - COMPLETED');
  };

  const getLocationPermission = async () => {
    let granted = false;
    let deniedOnce = false; // Flag to track if permission was denied at least once
    while (!granted) {
      try {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app requires access to your location.',
            buttonPositive: 'OK',
          },
        );
        granted = result === PermissionsAndroid.RESULTS.GRANTED;
        if (!granted) {
          if (deniedOnce) {
            break;
          } // If permission denied more than once, break out of the loop
          deniedOnce = true;
          Alert.alert(
            'Permission Denied',
            'Location permission is required to use this app.',
          );
          log('LOGIN_SCREEN: getLocationPermission - Location permission denied');
        }
      } catch (err) {
        console.error('Error checking location permission:', err);
        log(`LOGIN_SCREEN: getLocationPermission - Error checking location permission: ${err.message}`);
      }
    }
    if (granted) {
      log('LOGIN_SCREEN: getLocationPermission - Location permission granted');
    }
  };

  // useEffect(() => {
  //   // getLocationPermission();
  //   getToken();
  // }, []); // Empty dependency array means this effect runs only once, on mount

  // const handleVerifyOTP = async () => {
  //   log('LOGIN_SCREEN - handleVerifyOTP - STARTED');

  //   // console.log('Received OTP:', otp);
  //   console.log('Entered OTP:', enteredOtp);
  //   log(`LOGIN_SCREEN: handleVerifyOTP - Entered OTP: ${enteredOtp}`);
   
  //   try {
  //     setVerifyOtpLoading(true);
  //     const timeoutValue = 10000; // 10 seconds

  //     // Function to make the API call with a given URL
  //     const callVerifyOtpApi = async url => {
  //       console.log('VerifyOTP URL: ' + url);
  //       log(`LOGIN_SCREEN: handleVerifyOTP - VerifyOTP API URL: ${url}`);

  //       const response = await Promise.race([
  //         fetch(url, {
  //           method: 'GET',
  //           headers: {
  //             'Content-Type': 'application/json',
  //           },
  //         }),
  //         new Promise((_, reject) =>
  //           setTimeout(
  //             () =>
  //               reject(
  //                 new Error('Request timed out, Check Internet Connection'),
  //               ),
  //             timeoutValue,
  //           ),
  //         ),
  //       ]);
  //       return response;
  //     };

  //     let response;
  //     try {
  //       const primaryApiUrl =
  //         config.apiUrl +
  //         'VerifyOtp?otp=' +
  //         enteredOtp +
  //         '&did=' +
  //         driverId +
  //         '&fct=' +
  //         fcmToken;
  //       response = await callVerifyOtpApi(primaryApiUrl);
  //     } catch (initialError) {
  //       console.warn(
  //         'Initial Verify OTP API call failed, attempting alternative:',
  //         initialError.message,
  //       );
  //       log(
  //         `WARN - LOGIN_SCREEN: handleVerifyOTP - Initial Verify OTP API call failed, attempting alternative: ${initialError.message}`,
  //       );

  //       const altApiUrl =
  //         config.apiUrlAlt +
  //         'VerifyOtp?otp=' +
  //         enteredOtp +
  //         '&did=' +
  //         driverId +
  //         '&fct=' +
  //         fcmToken;
  //       response = await callVerifyOtpApi(altApiUrl);
  //     }

  //     const data = await response.json();
  //     console.log('Response from VerifyOtp: ' + JSON.stringify(data));

  //     AsyncStorage.setItem('API_AUTH_TOKEN', data.token);
  //     AsyncStorage.setItem(
  //       'MAPPLS_CONFIG.CLIENT_ID',
  //       data.MAPPLS_CONFIG.CLIENT_ID,
  //     );
  //     AsyncStorage.setItem(
  //       'MAPPLS_CONFIG.CLIENT_SECRET',
  //       data.MAPPLS_CONFIG.CLIENT_SECRET,
  //     );
  //     AsyncStorage.setItem('MAPPLS_CONFIG.API_KEY', data.MAPPLS_CONFIG.API_KEY);
  //     AsyncStorage.setItem(
  //       'MAPPLS_CONFIG.BASE_URL_OAUTH',
  //       data.MAPPLS_CONFIG.BASE_URL_OAUTH,
  //     );
  //     AsyncStorage.setItem(
  //       'MAPPLS_CONFIG.BASE_URL_GEOCODE',
  //       data.MAPPLS_CONFIG.BASE_URL_GEOCODE,
  //     );
  //     AsyncStorage.setItem(
  //       'MAPPLS_CONFIG.BASE_URL_PLACE_DETAIL',
  //       data.MAPPLS_CONFIG.BASE_URL_PLACE_DETAIL,
  //     );
  //     AsyncStorage.setItem(
  //       'MAPPLS_CONFIG.BASE_URL_REVERSE_GEOCODE',
  //       data.MAPPLS_CONFIG.BASE_URL_REVERSE_GEOCODE,
  //     );
  //     AsyncStorage.setItem(
  //       'MAPPLS_CONFIG.BASE_URL_DISTANCE',
  //       data.MAPPLS_CONFIG.BASE_URL_DISTANCE,
  //     );

  //     const storedURL = await AsyncStorage.getItem(
  //       'MAPPLS_CONFIG.BASE_URL_GEOCODE',
  //     );
  //     const storedClientId = await AsyncStorage.getItem(
  //       'MAPPLS_CONFIG.CLIENT_ID',
  //     );
  //     console.log(
  //       '*****************************Added MAPPLS Details into Async Storage: ' +
  //         storedURL,
  //     );
  //     console.log(
  //       '*****************************Added MAPPLS ClientId into Async Storage: ' +
  //         storedClientId,
  //     );
  //     log(
  //       `TEST - LOGIN_SCREEN: handleVerifyOTP - Test if the MAPPLS_CONFIG get updated or not: ${MAPPLS_CONFIG.BASE_URL_OAUTH}`,
  //     );

  //     if (response.ok) {
  //       console.log('Response from VerifyOtp: ' + response);
  //       log(
  //         `LOGIN_SCREEN: handleVerifyOTP - Response from VerifyOtp API Call: ${response}`,
  //       );

  //       console.log('OTP verified successfully');
  //       log('LOGIN_SCREEN: handleVerifyOTP - OTP verified successfully');

  //       if (data.tripdetails.length !== 0) {
  //         const pendingData = data.tripdetails[0];
  //         const lastStatus = data.tripstatus[data.tripstatus.length - 1].Status;

  //         if (lastStatus === 'GARAGE START') {
  //           console.log('App is in ONGOING State');
  //           const params = {
  //             tripNo: pendingData.TripId,
  //             custName: pendingData.PassengerName,
  //             custMobile: pendingData.PassengerPhone,
  //             reportTime: pendingData.ReportTime,
  //             pickUpLoc: pendingData.PickupAddress1,
  //             dropLoc: pendingData.DropLocation,
  //             driverId: driverId,
  //             driverPhone: pendingData.DriverPhone,
  //             vendorAddress: pendingData.VendorAddress,
  //             bookerName: pendingData.BookerName,
  //             bookerMobile: pendingData.BookerMobile,
  //           };
  //           AsyncStorage.setItem('homeParams', JSON.stringify(params));
  //           AsyncStorage.setItem('currentScreen', 'Arrived');
  //           Alert.alert(
  //             `${translationManager.getTranslation('alertIncompleteTrip')}${
  //               pendingData.TripId
  //             }`,
  //             translationManager.getTranslation('alertProceedTrip'),
  //             [
  //               {
  //                 text: translationManager.getTranslation('alertProceedButton'),
  //                 onPress: () => {
  //                   navigation.navigate('Arrived');
  //                   handleLoginStatus();
  //                 },
  //               },
  //             ],
  //             {cancelable: false},
  //           );
  //         } else if (lastStatus === 'ARRIVED') {
  //           console.log('App is in ARRIVED State');
  //           const params = {
  //             tripNo: pendingData.TripId,
  //             custName: pendingData.PassengerName,
  //             custMobile: pendingData.PassengerPhone,
  //             reportTime: pendingData.ReportTime,
  //             pickUpLoc: pendingData.PickupAddress1,
  //             dropLoc: pendingData.DropLocation,
  //             driverId: driverId,
  //             driverPhone: pendingData.DriverPhone,
  //             vendorAddress: pendingData.VendorAddress,
  //             bookerName: pendingData.BookerName,
  //             bookerMobile: pendingData.BookerMobile,
  //             startKmReadings: '0',
  //           };
  //           AsyncStorage.setItem('homeParams', JSON.stringify(params));
  //           AsyncStorage.setItem('currentScreen', 'Pickedup');
  //           Alert.alert(
  //             `${translationManager.getTranslation('alertIncompleteTrip')}${
  //               pendingData.TripId
  //             }`,
  //             translationManager.getTranslation('alertProceedTrip'),
  //             [
  //               {
  //                 text: translationManager.getTranslation('alertProceedButton'),
  //                 onPress: () => {
  //                   navigation.navigate('Pickedup');
  //                   handleLoginStatus();
  //                 },
  //               },
  //             ],
  //             {cancelable: false},
  //           );
  //         } else if (lastStatus === 'PICKEDUP') {
  //           console.log(
  //             'Have Start Kms and Pickup Kms: ' +
  //               data.tripstatus[0].Kms +
  //               ',' +
  //               data.tripstatus[2].Kms,
  //           );
  //           console.log('App is in PICKEDUP State');
  //           const pickupLocation = {
  //             latitude: data.tripstatus[2].Latitude,
  //             longitude: data.tripstatus[2].Longitude,
  //           };
  //           const params = {
  //             tripNo: pendingData.TripId,
  //             custName: pendingData.PassengerName,
  //             custMobile: pendingData.PassengerPhone,
  //             reportTime: pendingData.ReportTime,
  //             pickUpLoc: pendingData.PickupAddress1,
  //             dropLoc: pendingData.DropLocation,
  //             driverId: driverId,
  //             driverPhone: pendingData.DriverPhone,
  //             vendorAddress: pendingData.VendorAddress,
  //             bookerName: pendingData.BookerName,
  //             bookerMobile: pendingData.BookerMobile,
  //             startKmReadings: data.tripstatus[0].Kms.toString(),
  //             pickupKmReadings: data.tripstatus[2].Kms.toString(),
  //             pickupLatLong: pickupLocation,
  //           };
  //           AsyncStorage.setItem('homeParams', JSON.stringify(params));
  //           AsyncStorage.setItem('currentScreen', 'Drop');
  //           Alert.alert(
  //             `${translationManager.getTranslation('alertIncompleteTrip')}${
  //               pendingData.TripId
  //             }`,
  //             translationManager.getTranslation('alertProceedTrip'),
  //             [
  //               {
  //                 text: translationManager.getTranslation('alertProceedButton'),
  //                 onPress: () => {
  //                   navigation.navigate('Drop');
  //                   handleLoginStatus();
  //                 },
  //               },
  //             ],
  //             {cancelable: false},
  //           );
  //         } else if (lastStatus === 'DROPPED') {
  //           console.log('Trip is in TRIP COMPLETE State');
  //           const dropLocation = {
  //             latitude: data.tripstatus[3].Latitude,
  //             longitude: data.tripstatus[3].Longitude,
  //           };
  //           const pickupLocation = {
  //             latitude: data.tripstatus[2].Latitude,
  //             longitude: data.tripstatus[2].Longitude,
  //           };
  //           const params = {
  //             tripNo: pendingData.TripId,
  //             custName: pendingData.PassengerName,
  //             custMobile: pendingData.PassengerPhone,
  //             reportTime: pendingData.ReportTime,
  //             pickUpLoc: pendingData.PickupAddress1,
  //             dropLoc: pendingData.DropLocation,
  //             driverId: driverId,
  //             driverPhone: pendingData.DriverPhone,
  //             vendorAddress: pendingData.VendorAddress,
  //             startKmReadings: data.tripstatus[0].Kms.toString(),
  //             pickupKmReadings: data.tripstatus[2].Kms.toString(),
  //             endKmReadings: data.tripstatus[3].Kms.toString(),
  //             tripCompletedTime: data.tripstatus[3].TimeStamp,
  //             tripCompleteLoc: dropLocation,
  //             bookerName: pendingData.BookerName,
  //             bookerMobile: pendingData.BookerMobile,
  //             pickupLatLong: pickupLocation,
  //             dropLatLong: dropLocation,
  //           };
  //           AsyncStorage.setItem('signParams', JSON.stringify(params));
  //           AsyncStorage.setItem('currentScreen', 'Signature');
  //           Alert.alert(
  //             `${translationManager.getTranslation('alertIncompleteTrip')}${
  //               pendingData.TripId
  //             }`,
  //             translationManager.getTranslation('alertProceedTrip'),
  //             [
  //               {
  //                 text: translationManager.getTranslation('alertProceedButton'),
  //                 onPress: () => {
  //                   navigation.navigate('Signature');
  //                   handleLoginStatus();
  //                 },
  //               },
  //             ],
  //             {cancelable: false},
  //           );
  //         } else if (lastStatus === 'SIGNED') {
  //           console.log('The Trip is in SIGNED State');
  //           const dropLocation = {
  //             latitude: data.tripstatus[3].Latitude,
  //             longitude: data.tripstatus[3].Longitude,
  //           };
  //           const pickupLocation = {
  //             latitude: data.tripstatus[2].Latitude,
  //             longitude: data.tripstatus[2].Longitude,
  //           };
  //           const params = {
  //             signatureData: null,
  //             tripNo: pendingData.TripId,
  //             custName: pendingData.PassengerName,
  //             custMobile: pendingData.PassengerPhone,
  //             pickUpLoc: pendingData.PickupAddress1,
  //             dropLoc: pendingData.DropLocation,
  //             driverId: driverId,
  //             driverPhone: pendingData.DriverPhone,
  //             vendorAddress: pendingData.VendorAddress,
  //             startKmReadings: data.tripstatus[0].Kms.toString(),
  //             pickupKmReadings: data.tripstatus[2].Kms.toString(),
  //             endKmReadings: data.tripstatus[3].Kms.toString(),
  //             tripCompletedTime: data.tripstatus[3].TimeStamp,
  //             tripCompleteLoc: dropLocation,
  //             pickupLatLong: pickupLocation,
  //             dropLatLong: dropLocation,
  //             signTime: data.tripstatus[4].TimeStamp,
  //             isNoSignChecked: false,
  //           };
  //           AsyncStorage.setItem('submitParams', JSON.stringify(params));
  //           AsyncStorage.setItem('currentScreen', 'Submit');
  //           Alert.alert(
  //             `${translationManager.getTranslation('alertIncompleteTrip')}${
  //               pendingData.TripId
  //             }`,
  //             translationManager.getTranslation('alertProceedTrip'),
  //             [
  //               {
  //                 text: translationManager.getTranslation('alertProceedButton'),
  //                 onPress: () => {
  //                   navigation.navigate('Submit');
  //                   handleLoginStatus();
  //                 },
  //               },
  //             ],
  //             {cancelable: false},
  //           );
  //         }
  //       } else {
  //         console.log('Dont Have any Pending Trips.');
  //         handleLoginStatus();
  //         navigation.replace('BookingList');
  //         AsyncStorage.setItem('currentScreen', 'BookingList');
  //       }
  //     } else {
  //       Alert.alert(
  //         translationManager.getTranslation('alertError'),
  //         translationManager.getTranslation('alertOtpVerificationFailed'),
  //       );
  //       console.error('OTP verification failed');
  //       log('LOGIN_SCREEN: handleVerifyOTP - OTP verification failed');
  //       setShowResendOtp(1);
  //       setEnteredOtp('');
  //     }
  //   } catch (error) {
  //     console.error('API Error', error);
  //     Alert.alert(
  //       translationManager.getTranslation('alertError'),
  //       translationManager.getTranslation('alertFailedVerifyOtp'),
  //     );
  //     log(
  //       `ERROR - LOGIN_SCREEN: handleVerifyOTP - Verify OTP API Error: ${error.message}`,
  //     );
  //     setCurrentStep(0);
  //     setEnteredOtp('');
  //   } finally {
  //     setVerifyOtpLoading(false);
  //   }
  //   log('LOGIN_SCREEN - handleVerifyOTP - COMPLETED');
  // };

  const handleVerifyOTP = async () => {
  log('LOGIN_SCREEN - handleVerifyOTP - STARTED');
  
  try {
    setVerifyOtpLoading(true);
    setIsVerificationFailed(false);
    const timeoutValue = 15000; // Increased to 15s for stability

    const callVerifyOtpApi = async url => {
      return await Promise.race([
        fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), timeoutValue)
        ),
      ]);
    };

    let response;
    const queryParams = `VerifyOtp?otp=${enteredOtp}&did=${driverId}&fct=${fcmToken}`;

    try {
      response = await callVerifyOtpApi(config.apiUrl + queryParams);
    } catch (err) {
      console.log('Verify OTP Error : '+err.message);
      log(`WARN - Primary Verify failed. Trying Alt.`);
      try {
        response = await callVerifyOtpApi(config.apiUrlAlt + queryParams);
      } catch (altErr) {
        throw new Error('CONNECTION_FAILURE');
      }
    }

    // 1. Read JSON ONCE
    const data = await response.json();

    // 2. CHECK SUCCESS STATUS FIRST
    if (response.ok && data) {
      log('LOGIN_SCREEN - OTP verified successfully');

      // 3. SAFE STORAGE (Only if data exists)
      if (data.token) await AsyncStorage.setItem('API_AUTH_TOKEN', data.token);
      
      if (data.MAPPLS_CONFIG) {
        const m = data.MAPPLS_CONFIG;
        await AsyncStorage.setItem('MAPPLS_CONFIG.CLIENT_ID', m.CLIENT_ID || '');
        await AsyncStorage.setItem('MAPPLS_CONFIG.CLIENT_SECRET', m.CLIENT_SECRET || '');
        await AsyncStorage.setItem('MAPPLS_CONFIG.API_KEY', m.API_KEY || '');
        await AsyncStorage.setItem('MAPPLS_CONFIG.BASE_URL_OAUTH', m.BASE_URL_OAUTH || '');
        await AsyncStorage.setItem('MAPPLS_CONFIG.BASE_URL_GEOCODE', m.BASE_URL_GEOCODE || '');
        await AsyncStorage.setItem('MAPPLS_CONFIG.BASE_URL_PLACE_DETAIL', m.BASE_URL_PLACE_DETAIL || '');
        await AsyncStorage.setItem('MAPPLS_CONFIG.BASE_URL_REVERSE_GEOCODE', m.BASE_URL_REVERSE_GEOCODE || '');
        await AsyncStorage.setItem('MAPPLS_CONFIG.BASE_URL_DISTANCE', m.BASE_URL_DISTANCE || '');
      }

      // 4. PENDING TRIP LOGIC
      if (data.tripdetails && data.tripdetails.length > 0) {
        const pendingData = data.tripdetails[0];
        const statusArray = data.tripstatus || [];
        const lastStatus = statusArray.length > 0 ? statusArray[statusArray.length - 1].Status : '';

        // Helper to handle navigation params
        const baseParams = {
          tripNo: pendingData.TripId,
          custName: pendingData.PassengerName,
          custMobile: pendingData.PassengerPhone,
          reportTime: pendingData.ReportTime,
          pickUpLoc: pendingData.PickupAddress1,
          dropLoc: pendingData.DropLocation,
          driverId: driverId,
          driverPhone: pendingData.DriverPhone,
          vendorAddress: pendingData.VendorAddress,
          bookerName: pendingData.BookerName,
          bookerMobile: pendingData.BookerMobile,
        };

        let targetScreen = '';
        let storageKey = 'homeParams';
        let finalParams = { ...baseParams };

        if (lastStatus === 'GARAGE START') {
          targetScreen = 'Arrived';
        } else if (lastStatus === 'ARRIVED') {
          targetScreen = 'Pickedup';
          finalParams.startKmReadings = '0';
        } else if (lastStatus === 'PICKEDUP') {
          targetScreen = 'Drop';
          finalParams.startKmReadings = statusArray[0]?.Kms?.toString() || '0';
          finalParams.pickupKmReadings = statusArray[2]?.Kms?.toString() || '0';
          finalParams.pickupLatLong = { latitude: statusArray[2]?.Latitude, longitude: statusArray[2]?.Longitude };
        } else if (lastStatus === 'DROPPED') {
          targetScreen = 'Signature';
          storageKey = 'signParams';
          finalParams.endKmReadings = statusArray[3]?.Kms?.toString() || '0';
        }

        if (targetScreen) {
          await AsyncStorage.setItem(storageKey, JSON.stringify(finalParams));
          await AsyncStorage.setItem('currentScreen', targetScreen);
          
          Alert.alert(
            `${translationManager.getTranslation('alertIncompleteTrip')}${pendingData.TripId}`,
            translationManager.getTranslation('alertProceedTrip'),
            [{ text: translationManager.getTranslation('alertProceedButton'), 
               onPress: () => { navigation.navigate(targetScreen); handleLoginStatus(); } 
            }]
          );
        }
      } else {
        // No Pending Trips
        handleLoginStatus();
        AsyncStorage.setItem('currentScreen', 'BookingList');
        navigation.replace('BookingList');
      }

    } else {
      // Handle 401/400 Errors (Wrong OTP)
      throw new Error('VERIFICATION_FAILED');
    }

  } catch (error) {
    log(`ERROR - handleVerifyOTP: ${error.message}`);
    console.log(`ERROR - handleVerifyOTP: ${error.message}`);
    setIsVerificationFailed(true);
    setEnteredOtp('');
    
    const title = translationManager.getTranslation('alertError');
    const msg = error.message === 'VERIFICATION_FAILED' 
      ? translationManager.getTranslation('alertOtpVerificationFailed')
      : translationManager.getTranslation('alertFailedVerifyOtp');
    
    Alert.alert(title, msg);
    if (error.message !== 'VERIFICATION_FAILED') {
      setCurrentStep(0);
      setIsVerificationFailed(false);
    };
  } finally {
    setVerifyOtpLoading(false);
  }
};
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.mainContent}>
        <View style={styles.card}>
          <View style={styles.title}>
            <Text allowFontScaling={false} style={styles.headerText}>
              {translationManager.getTranslation('headerText')}
            </Text>
          </View>

          {/* Logo */}
          <Image style={styles.logo} source={require('../logo.png')} />

          {/* Input Fields */}
          <View style={styles.inputs}>
            {showOtpInput ? (
              <>
                <TextInput
                  //style={styles.textInput}
                  style={{
                    borderWidth: 1,
                    padding: 10,
                    width: '100%',
                    backgroundColor: '#fff',
                    color: '#333',
                  }}
                  placeholder={translationManager.getTranslation(
                    'enterOtpPlaceholder',
                  )}
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={4}
                  onChangeText={setEnteredOtp}
                  value={enteredOtp}
                />
                <ModernButton2
                  onPress={handleVerifyOTP}
                  disabled={verifyOtpLoading || (currentStep !== 1 && !isVerificationFailed)}
                  loading={verifyOtpLoading}
                  style={[
                    styles.button,
                    (currentStep !== 1 && !isVerificationFailed) && styles.disabledButton,
                  ]}
                  text={translationManager.getTranslation(
                    'verifyOtpButton',
                  )}></ModernButton2>
                {/* <TouchableOpacity
                  onPress={handleGetOTP}
                  disabled={!showOtpInput || getOtpLoading}>
                  <Text allowFontScaling={false} style={styles.linkButton}>
                    {translationManager.getTranslation('resendOtpButton')}
                  </Text>
                </TouchableOpacity> */}
                {isVerificationFailed && (
                  <TouchableOpacity
                    onPress={() => {
                      setIsVerificationFailed(false); // Hide until next failure
                      handleGetOTP();
                    }}
                    disabled={getOtpLoading}>
                    <Text allowFontScaling={false} style={styles.linkButton}>
                      {translationManager.getTranslation('resendOtpButton')}
                    </Text>
                  </TouchableOpacity>
                )}
                <Text allowFontScaling={false} style={styles.versionText}>
                  v{config.appVersion}
                </Text>
              </>
            ) : (
              <>
                <TextInput
                  //style={styles.textInput}
                  style={{
                    borderWidth: 1,
                    padding: 10,
                    width: '100%',
                    backgroundColor: '#fff',
                    color: '#333',
                  }}
                  placeholder={translationManager.getTranslation(
                    'enterMobilePlaceholder',
                  )}
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={10}
                  onChangeText={setEnteredMobileNumber}
                  value={enteredMobileNumber}
                />
                <ModernButton
                  onPress={handleGetOTP}
                  disabled={currentStep !== 0}
                  loading={getOtpLoading}
                  style={[
                    styles.button,
                    currentStep !== 0 && styles.disabledButton,
                  ]}
                  text={translationManager.getTranslation(
                    'getOtpButton',
                  )}></ModernButton>

                {/* <TouchableOpacity onPress={changeLanguage}>
                  <Text allowFontScaling={false} style={styles.linkButton}>
                    {translationManager.getTranslation('changeLanguageLabel')}
                  </Text>
                </TouchableOpacity> */}
                <Text allowFontScaling={false} style={styles.versionText}>
                  v{config.appVersion}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
      {/* Footer */}
      <NewFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E1EBEE',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  title: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    fontFamily: 'sans-serif-condensed',
  },
  versionText: {
    fontSize: 10,
    color: '#555',
    marginTop: 5,
    fontFamily: 'sans-serif-condensed',
    alignSelf: 'flex-end',
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  inputs: {
    width: '100%',
    alignItems: 'center',
  },
  textInput: {
    width: '100%',
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#DDD',
    color: '#333',
    marginBottom: 15,
    fontFamily: 'sans-serif-condensed',
  },
  //   button: {
  //     width: '100%',
  //     backgroundColor: '#0056A1',
  //     borderRadius: 10,
  //     paddingVertical: 12,
  //     alignItems: 'center',
  //     marginBottom: 10,
  //   },
  //   buttonText: {
  //     color: '#FFF',
  //     fontSize: 16,
  //     fontWeight: '800',
  //     fontFamily: 'sans-serif-condensed',
  //   },
  //   disabledButton: {
  //     backgroundColor: '#CCC',
  //   },
  button: {
    backgroundColor: '#4CAF50', // Fallback solid color for gradient
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30, // Rounded corners
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5, // For Android shadow
    width: '100%',
  },
  buttonGradient: {
    ...StyleSheet.absoluteFillObject, // To ensure the gradient fills the button
    borderRadius: 30, // Match the button's borderRadius
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'sans-serif-medium', // Modern font
  },
  disabledButton: {
    backgroundColor: '#A9A9A9', // Gray color for disabled state
    shadowOpacity: 0, // Remove shadow for disabled button
  },
  linkButton: {
    color: '#0056A1',
    fontSize: 14,
    textDecorationLine: 'underline',
    marginTop: 10,
    fontFamily: 'sans-serif-condensed',
  },
});

//   return (
//     <View style={styles.container}>
//       <View style={styles.maincontent}>
//         <View style={styles.title}>
//           <Text allowFontScaling={false} style={styles.headerText}>{translations[lang].headerText}</Text>
//           <View style={styles.version}>
//             <Text allowFontScaling={false} style={styles.versionText}>v{config.appVersion}</Text>
//           </View>
//         </View>
//         <Image style={styles.logo} source={require('../logo.png')} />

//         <View style={styles.inputs}>
//           {showOtpInput ? (
//             <>
//               <TextInput
//                 ref={verifyRef}
//                 style={styles.textinput}
//                 placeholder={translations[lang].enterOtpPlaceholder}
//                 placeholderTextColor={'#808080'}
//                 keyboardType="numeric"
//                 onChangeText={text => setEnteredOtp(text)}
//                 maxLength={4}
//                 value={enteredOtp}
//               />
//               <MyButton
//                 title={translations[lang].vertifyOtpButton}
//                 onPress={handleVerifyOTP}
//                 disabled={currentStep !== 1}
//                 disabledStyle={currentStep !== 1 ? styles.disabledButton : null}
//               />
//               <TouchableOpacity
//                 // style={[styles.container, disabled && styles.disabledButton]}
//                 onPress={handleGetOTP}
//                 disabled={showResendOtp === 0}>
//                 <Text allowFontScaling={false} style={styles.resend}>Resend OTP</Text>
//               </TouchableOpacity>
//             </>
//           ) : (
//             <>
//               <TextInput
//                 ref={getRef}
//                 style={styles.textinput}
//                 placeholder={translations[lang].enterMobilePlaceholder}
//                 placeholderTextColor={'#808080'}
//                 keyboardType="numeric"
//                 maxLength={10}
//                 value={enteredMobileNumber}
//                 onChangeText={text => setEnteredMobileNumber(text)}
//               />
//               <MyButton
//                 title={translations[lang].getOtpButton}
//                 onPress={handleGetOTP}
//                 disabled={currentStep !== 0}
//                 disabledStyle={currentStep !== 0 ? styles.disabledButton : null}
//               />
//             </>
//           )}
//         </View>
//       </View>
//       {!isKeyboardVisible && <Footer />}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   header: {
//     // height: '10%',
//     width: '100%',
//     aspectRatio: 10 / 1.5,
//     backgroundColor: '#e6ffff',
//     justifyContent: 'center',
//     alignSelf: 'center',
//     flexDirection: 'row',
//   },
//   headerTextView: {
//     width: '100%',
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingLeft: '2%',
//   },
//   headerText: {
//     fontSize: 35,
//     fontWeight: 'bold',
//     textAlign: 'center',
//     fontStyle: 'italic',
//     fontFamily: 'Roboto-Black',
//     color: 'black',
//   },
//   versionText: {
//     fontSize: 12,
//     color: 'black',
//     alignSelf: 'center',
//   },
//   version: {
//     alignContent: 'center',
//   },
//   container: {
//     flex: 1,
//     justifyContent: 'space-between',
//     backgroundColor: 'white',
//   },
//   maincontent: {
//     height: '80%',
//     paddingHorizontal: '5%',
//   },
//   title: {
//     marginTop: '25%',
//   },
//   heading: {
//     fontSize: 20,
//     color: 'black',
//     fontWeight: '700',
//     textAlign: 'center',
//   },
//   inputs: {
//     alignItems: 'center',
//     marginTop: '5%',
//   },
//   logo: {
//     height: '30%',
//     width: '70%',
//     alignSelf: 'center',
//   },
//   textinput: {
//     aspectRatio: 10 / 2,
//     width: '70%',
//     borderColor: '#012169',
//     borderWidth: 1.7,
//     marginBottom: '2%',
//     marginTop: '2%',
//     color: 'black',
//   },
//   resend: {
//     marginTop: '3%',
//     color: 'blue',
//     textDecorationLine: 'underline',
//   },

export default LoginScreen;
