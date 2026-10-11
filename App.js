import 'react-native-gesture-handler';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import React, {useEffect, useState, useRef} from 'react';
import Navigator from './Navigator';
import {AuthProvider} from './components/AuthContext';
import {
  PermissionsAndroid,
  Alert,
  Platform,
  AppState,
  BackHandler,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import {NavigationContainer} from '@react-navigation/native';
import {log, readLog} from './components/Logger';
import config from './config';
import DeviceInfo from 'react-native-device-info';
import {requestNotifications, RESULTS} from 'react-native-permissions';
import {useNetInfo} from '@react-native-community/netinfo';
import ETCLoader from './components/ETCLoader';
import CheckInternet from './components/AuthContext';
import {TranslationProvider} from './translationContext';

const App = () => {
  const version = DeviceInfo.getVersion();
  const [storagePermissionGranted, setStoragePermissionGranted] =
    useState(false);
  const [isVersionCorrect, setIsVersionCorrect] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const netInfo = useNetInfo();
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [showAlert, setShowAlert] = useState(false);
  const alertInterval = 30000; // 30 seconds
  const [alertShown, setAlertShown] = useState(false);
  const appState = useRef(AppState.currentState);
  const [hasCheckedVersion, setHasCheckedVersion] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] =
    useState(false);
 

  const checkVersion = async () => {
    setIsLoading(true);
    try {
      const apiUrl = config.apiGetVersion;
      console.log('Version check API Url: ', apiUrl);
      log(`APP: Version check API Url: ${apiUrl}`);

      const timeoutValue = parseInt(config.timeoutValue); //2 minutes..
      console.log('Timeout value: ', timeoutValue);
      log(`APP: Timeout value: ${timeoutValue}`);

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
              reject(new Error('Request timed out, Check Internet Connection')),
            10000,
          ),
        ),
      ]);

      if (!response) {
        console.log('Version API Response Failed');
      }
      console.log('API Response: ', response);
      const responseData = await response.json();
      console.log('Received MapTimeout Value: ', responseData.MapTimeout);
      log(`APP: Received MapTimeout Value: ${responseData.MapTimeout}`);

      config.trackInterval = parseInt(responseData.MapTimeout) * 60000;
      console.log('Track Interval Value: ', config.trackInterval);
      log(`APP: Track Interval Value: ${config.trackInterval}`);

      config.connectionTimeoutValue =
        parseInt(responseData.NetworkTimeout) * 60000;
      console.log('Connection Timeout Value: ', config.connectionTimeoutValue);
      log(`APP: Connection Timeout Value: ${config.connectionTimeoutValue}`);

      console.log(
        'System v & Received v :' +
          config.appVersion +
          ' & ' +
          responseData.Version,
      );
      log(
        `APP: System v & Received v :${config.appVersion} & ${responseData.Version}`,
      );

      if (responseData.Version === config.appVersion) {
        setIsVersionCorrect(true);
        log('APP: App version is correct.');
      } else {
        setIsVersionCorrect(false);
        log(
          `APP: Incorrect Version: Actual-${config.appVersion}, Latest-${responseData.Version}`,
        );
        Alert.alert(
          'Incorrect Version',
          `Latest version available(${responseData.Version}). Please update your app.`,
          [{text: 'OK', onPress: () => console.log('OK Pressed')}],
        );
      }
    } catch (error) {
      Alert.alert(
        'Low or No Network Connection',
        'Check you Internet connection and try again.',
        [
          {
            text: 'OK',
            onPress: () => {
              checkVersion(); // Retry API call when OK is pressed
            },
          },
        ],
      );
    } finally {
      setIsLoading(false);
    }
  };

  //Request All Permissions....
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        const storageGranted = await checkStoragePermission();
        if (storageGranted) {
          await createAppFolder();
        }

        await requestNotificationPermission();
        await requestLocationPermission();
        await requestCameraPermission();
        // await requestIgnoreBatteryOptimization();
      }
    };

    requestPermissions();
  }, []);

  const requestIgnoreBatteryOptimization = async () => {
    const permission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
    );

    if (permission) {
      console.log('Permission is already granted');
    } else {
      const requestPermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      );
      if (requestPermission === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Permission granted');
      } else {
        console.log('Permission denied');
      }
    }
  };

  const checkStoragePermission = async () => {
    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      );
      if (!granted) {
        console.log('Storage permission not granted, requesting...');
        return await requestStoragePermission(); // Request permission if not granted
      }
      console.log('Storage permission already granted.');
      return true; // Permission already granted
      // setStoragePermissionGranted(granted);
      // log(`APP: Storage permission check: ${granted}`);

      // if (!granted) {
      //   requestStoragePermission();
      // }
    } catch (err) {
      console.warn('Error checking storage permission:', err);
      log(`ERROR - APP: Error checking storage permission: ${err.message}`);
      return false;
    }
  };

  const requestStoragePermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission Required',
          message: 'This app needs access to your storage.',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      log(`APP: Storage permission request result: ${granted}`);

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        setStoragePermissionGranted(true);
        log('APP: Storage permission granted.');
        console.log('APP: Storage permission granted.');
        return true;
      } else {
        console.log('Storage permission denied.');
        log('APP: Storage permission denied.');
        return false;
      }
    } catch (err) {
      console.warn('Error requesting storage permission:', err);
      log(`APP: Error requesting storage permission: ${err.message}`);
      return false;
    }
  };

  const createAppFolder = async () => {
    try {
      const folderPath =
        RNFS.DocumentDirectoryPath + '/ETC/com.trivecta.expresstravel';
      console.log('Attempting to create folder at:', folderPath); // Log folder path
      log(`APP: Attempting to create folder at: ${folderPath}`);

      const exists = await RNFS.exists(folderPath);
      if (!exists) {
        await RNFS.mkdir(folderPath);
        console.log('App folder created successfully');
        log('APP: App folder created successfully');
      } else {
        console.log('App folder already exists');
        log('APP: App folder already exists');
      }
    } catch (error) {
      console.log('Error creating app folder:', error); // Log detailed error // TESTING>>>>
    }
  };

  const requestNotificationPermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const {status} = await requestNotifications();
        if (status === RESULTS.GRANTED) {
          console.log('Notification permission granted.');
          log('APP: Notification permission granted.');
        } else if (status === RESULTS.DENIED) {
          console.log('Notification permission denied.');
          log('APP: Notification permission denied.');
        } else {
          console.log(
            'Something else is happened in Notification permission.',
            status,
          );
        }
      } catch (error) {
        console.warn('Error requesting notification permission:', error);
        log(`APP: Error requesting notification permission: ${error.message}`);
      }
    }
  };

  const requestLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app requires location access to function properly.',
          buttonPositive: 'OK', // Only "OK" button is shown here
          cancelable: 'false',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        setLocationPermissionGranted(true);
        console.log('Location permission granted');
      } else {
        Alert.alert(
          'Permission Required',
          'Location permission is mandatory to use this app.',
          [
            {text: 'OK', onPress: requestLocationPermission}, // Single "OK" button
          ],
        );
      }
    } catch (err) {
      console.warn(err);
    }
  };

  async function requestCameraPermission() {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'This app needs access to your camera to take photos.',
          // buttonNeutral: "Ask Me Later",
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('You can use the camera');
      } else {
        console.log('Camera permission denied');
      }
    } catch (err) {
      console.warn(err);
    }
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <SafeAreaView style={{flex: 1, backgroundColor: '#065758'}}>
          <StatusBar barStyle="light-content" backgroundColor="#065758" />
          <TranslationProvider>
            <Navigator />
          </TranslationProvider>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    // <>
    //   {isLoading ? (
    //     // <ActivityIndicator size="large" color="#0000ff" />
    //     <ETCLoader />
    //   ) : (
    //     // isVersionCorrect && <Navigator />
    //     <Navigator />
    //   )}
    // </>
  );
};

export default App;
