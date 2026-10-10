const config = {
  //Live Server (Old Payana)....
  // apiGetVersion: 'https://etcdriverapp.in/WebApi/App/Version',
  // apiGetOtp: 'https://etcdriverapp.in/WebApi/App/GetOtp?ph=',
  // apiUrl: 'https://etcdriverapp.in/WebApi/App/',
  // apiPostBookings: 'https://etcdriverapp.in/WebApi/App/Bookings?did=',
  // apiPostKmReading: 'https://etcdriverapp.in/WebApi/App/KmReading?tripNo=',
  // apiPostLocation: 'https://etcdriverapp.in/WebApi/App/Location?loc=',
  // apiGetStatus: 'https://etcdriverapp.in/WebApi/App/Status?tripNo=',
  // apiPostFinalSubmit: 'https://etcdriverapp.in/WebApi/App/Complete?tid=',
  // apiPostErrReport: 'https://etcdriverapp.in/WebApi/App/ErrReport?did=',
  // apiPostUpload: 'https://etcdriverapp.in/WebApi/App/Upload?tid=',
  // apiGetIdle: 'https://etcdriverapp.in/WebApi/App/idle?tid=',
  // apiPostTripHistory: 'https://etcdriverapp.in/WebApi/App/TripHistory?did=',

  // // ------------------------------------------------------------------------------
  // //Live Server(Fallback http Server)....
  // apiGetVersionAlt: 'http://13.201.219.65/WebApi/App/Version',
  // apiGetOtpAlt: 'http://13.201.219.65/WebApi/App/GetOtp?ph=',
  // apiUrlAlt: 'http://13.201.219.65/WebApi/App/',
  // apiPostBookingsAlt: 'http://13.201.219.65/WebApi/App/Bookings?did=',
  // apiPostKmReadingAlt: 'http://13.201.219.65/WebApi/App/KmReading?tripNo=',
  // apiPostLocationAlt: 'http://13.201.219.65/WebApi/App/Location?loc=',
  // apiGetStatusAlt: 'http://13.201.219.65/WebApi/App/Status?tripNo=',
  // apiPostFinalSubmitAlt: 'http://13.201.219.65/WebApi/App/Complete?tid=',
  // apiPostErrReportAlt: 'http://13.201.219.65/WebApi/App/ErrReport?did=',
  // apiPostUploadAlt: 'http://13.201.219.65/WebApi/App/Upload?tid=',
  // apiGetIdleAlt: 'http://13.201.219.65/WebApi/App/idle?tid=',
  // apiPostTripHistoryAlt: 'http://13.201.219.65/WebApi/App/TripHistory?did=',

  // ------------------------------------------------------------------------------
  //Staging Server(65) (Old Payana)....
  // apiGetVersion: 'https://etcdriverapp.in/ApiDev/App/Version',
  // apiGetOtp: 'https://etcdriverapp.in/ApiDev/App/GetOtp?ph=',
  // apiUrl: 'https://etcdriverapp.in/ApiDev/App/',
  // apiPostBookings: 'https://etcdriverapp.in/ApiDev/App/Bookings?did=',
  // apiPostKmReading: 'https://etcdriverapp.in/ApiDev/App/KmReading?tripNo=',
  // apiPostLocation: 'https://etcdriverapp.in/ApiDev/App/Location?loc=',
  // apiGetStatus: 'https://etcdriverapp.in/ApiDev/App/Status?tripNo=',
  // apiPostFinalSubmit: 'https://etcdriverapp.in/ApiDev/App/Complete?tid=',
  // apiPostErrReport: 'https://etcdriverapp.in/ApiDev/App/ErrReport?did=',
  // apiPostUpload: 'https://etcdriverapp.in/ApiDev/App/Upload?tid=',
  // apiGetIdle: 'https://etcdriverapp.in/ApiDev/App/idle?tid=',
  // apiPostTripHistory: 'https://etcdriverapp.in/ApiDev/App/TripHistory?did=',

  // //------------------------------------------------------------------------------
  // //Staging Server(65)(Fallback http Server)....
  // apiGetVersionAlt: 'http://13.201.219.65/ApiDev/App/Version',
  // apiGetOtpAlt: 'http://13.201.219.65/ApiDev/App/GetOtp?ph=',
  // apiUrlAlt: 'http://13.201.219.65/ApiDev/App/',
  // apiPostBookingsAlt: 'http://13.201.219.65/ApiDev/App/Bookings?did=',
  // apiPostKmReadingAlt: 'http://13.201.219.65/ApiDev/App/KmReading?tripNo=',
  // apiPostLocationAlt: 'http://13.201.219.65/ApiDev/App/Location?loc=',
  // apiGetStatusAlt: 'http://13.201.219.65/ApiDev/App/Status?tripNo=',
  // apiPostFinalSubmitAlt: 'http://13.201.219.65/ApiDev/App/Complete?tid=',
  // apiPostErrReportAlt: 'http://13.201.219.65/ApiDev/App/ErrReport?did=',
  // apiPostUploadAlt: 'http://13.201.219.65/ApiDev/App/Upload?tid=',
  // apiGetIdleAlt: 'http://13.201.219.65/ApiDev/App/idle?tid=',
  // apiPostTripHistoryAlt: 'http://13.201.219.65/ApiDev/App/TripHistory?did=',

  // ------------------------------------------------------------------------------
  //TravelEx Database(65)....
  apiServer: 'TX',
  apiGetVersion: 'https://etcdriverapp.in/TravelExApi/App/Version',
  apiGetOtp: 'https://etcdriverapp.in/TravelExApi/App/GetOtp?ph=',
  apiUrl: 'https://etcdriverapp.in/TravelExApi/App/',
  apiPostBookings: 'https://etcdriverapp.in/TravelExApi/App/Bookings?did=',
  apiPostKmReading: 'https://etcdriverapp.in/TravelExApi/App/KmReading?tripNo=',
  apiPostLocation: 'https://etcdriverapp.in/TravelExApi/App/Location?loc=',
  apiGetStatus: 'https://etcdriverapp.in/TravelExApi/App/Status?tripNo=',
  apiPostFinalSubmit: 'https://etcdriverapp.in/TravelExApi/App/Complete?tid=',
  apiPostErrReport: 'https://etcdriverapp.in/TravelExApi/App/ErrReport?did=',
  apiPostUpload: 'https://etcdriverapp.in/TravelExApi/App/Upload?tid=',
  apiGetIdle: 'https://etcdriverapp.in/TravelExApi/App/idle?tid=',
  apiPostTripHistory:
    'https://etcdriverapp.in/TravelExApi/App/TripHistory?did=',

  // ------------------------------------------------------------------------------
  //TravelEx Database(Alternate http Server)....
  apiGetVersionAlt: 'http://13.201.219.65/TravelExApi/App/Version',
  apiGetOtpAlt: 'http://13.201.219.65/TravelExApi/App/GetOtp?ph=',
  apiUrlAlt: 'http://13.201.219.65/TravelExApi/App/',
  apiPostBookingsAlt: 'http://13.201.219.65/TravelExApi/App/Bookings?did=',
  apiPostKmReadingAlt: 'http://13.201.219.65/TravelExApi/App/KmReading?tripNo=',
  apiPostLocationAlt: 'http://13.201.219.65/TravelExApi/App/Location?loc=',
  apiGetStatusAlt: 'http://13.201.219.65/TravelExApi/App/Status?tripNo=',
  apiPostFinalSubmitAlt: 'http://13.201.219.65/TravelExApi/App/Complete?tid=',
  apiPostErrReportAlt: 'http://13.201.219.65/TravelExApi/App/ErrReport?did=',
  apiPostUploadAlt: 'http://13.201.219.65/TravelExApi/App/Upload?tid=',
  apiGetIdleAlt: 'http://13.201.219.65/TravelExApi/App/idle?tid=',
  apiPostTripHistoryAlt:
    'http://13.201.219.65/TravelExApi/App/TripHistory?did=',
  // ------------------------------------------------------------------------------

  //Local Development Server(221)....
  // apiServer: '221',
  // apiGetVersion: 'http://192.168.1.13:8095/WebApi/App/Version',
  // apiGetOtp: 'http://192.168.1.13:8095/WebApi/App/GetOtp?ph=',
  // apiUrl: 'http://192.168.1.13:8095/WebApi/App/',
  // apiPostBookings: 'http://192.168.1.13:8095/WebApi/App/Bookings?did=',
  // apiPostKmReading: 'http://192.168.1.13:8095/WebApi/App/KmReading?tripNo=',
  // apiPostLocation: 'http://192.168.1.13:8095/WebApi/App/Location?loc=',
  // apiGetStatus: 'http://192.168.1.13:8095/WebApi/App/Status?tripNo=',
  // apiPostFinalSubmit: 'http://192.168.1.13:8095/WebApi/App/Complete?tid=',
  // apiPostErrReport: 'http://192.168.1.13:8095/WebApi/App/ErrReport?did=',
  // apiPostUpload: 'http://192.168.1.13:8095/WebApi/App/Upload?tid=',
  // apiGetIdle: 'http://192.168.1.13:8095/WebApi/App/idle?tid=',
  // apiPostTripHistory: 'http://192.168.1.13:8095/WebApi/App/TripHistory?did=',

  // Local Development Server(221) (Fallback)....
  // apiGetVersionAlt: 'http://192.168.1.13:8095/WebApi/App/Version',
  // apiGetOtpAlt: 'http://192.168.1.13:8095/WebApi/App/GetOtp?ph=',
  // apiUrlAlt: 'http://192.168.1.13:8095/WebApi/App/',
  // apiPostBookingsAlt: 'http://192.168.1.13:8095/WebApi/App/Bookings?did=',
  // apiPostKmReadingAlt: 'http://192.168.1.13:8095/WebApi/App/KmReading?tripNo=',
  // apiPostLocationAlt: 'http://192.168.1.13:8095/WebApi/App/Location?loc=',
  // apiGetStatusAlt: 'http://192.168.1.13:8095/WebApi/App/Status?tripNo=',
  // apiPostFinalSubmitAlt: 'http://192.168.1.13:8095/WebApi/App/Complete?tid=',
  // apiPostErrReportAlt: 'http://192.168.1.13:8095/WebApi/App/ErrReport?did=',
  // apiPostUploadAlt: 'http://192.168.1.13:8095/WebApi/App/Upload?tid=',
  // apiGetIdleAlt: 'http://192.168.1.13:8095/WebApi/App/idle?tid=',
  // apiPostTripHistoryAlt: 'http://192.168.1.13:8095/WebApi/App/TripHistory?did=',

  //Local Development Server(221)....
  // apiServer: '221',
  // apiGetVersion: 'http://192.168.0.221/WebApi/App/Version',
  // apiGetOtp: 'http://192.168.0.221/WebApi/App/GetOtp?ph=',
  // apiUrl: 'http://192.168.0.221/WebApi/App/',
  // apiPostBookings: 'http://192.168.0.221/WebApi/App/Bookings?did=',
  // apiPostKmReading: 'http://192.168.0.221/WebApi/App/KmReading?tripNo=',
  // apiPostLocation: 'http://192.168.0.221/WebApi/App/Location?loc=',
  // apiGetStatus: 'http://192.168.0.221/WebApi/App/Status?tripNo=',
  // apiPostFinalSubmit: 'http://192.168.0.221/WebApi/App/Complete?tid=',
  // apiPostErrReport: 'http://192.168.0.221/WebApi/App/ErrReport?did=',
  // apiPostUpload: 'http://192.168.0.221/WebApi/App/Upload?tid=',
  // apiGetIdle: 'http://192.168.0.221/WebApi/App/idle?tid=',
  // apiPostTripHistory: 'http://192.168.0.221/WebApi/App/TripHistory?did=',

  // Local Development Server(221) (Fallback)....
  // apiGetVersionAlt: 'http://192.168.0.221/WebApi/App/Version',
  // apiGetOtpAlt: 'http://192.168.0.221/WebApi/App/GetOtp?ph=',
  // apiUrlAlt: 'http://192.168.0.221/WebApi/App/',
  // apiPostBookingsAlt: 'http://192.168.0.221/WebApi/App/Bookings?did=',
  // apiPostKmReadingAlt: 'http://192.168.0.221/WebApi/App/KmReading?tripNo=',
  // apiPostLocationAlt: 'http://192.168.0.221/WebApi/App/Location?loc=',
  // apiGetStatusAlt: 'http://192.168.0.221/WebApi/App/Status?tripNo=',
  // apiPostFinalSubmitAlt: 'http://192.168.0.221/WebApi/App/Complete?tid=',
  // apiPostErrReportAlt: 'http://192.168.0.221/WebApi/App/ErrReport?did=',
  // apiPostUploadAlt: 'http://192.168.0.221/WebApi/App/Upload?tid=',
  // apiGetIdleAlt: 'http://192.168.0.221/WebApi/App/idle?tid=',
  // apiPostTripHistoryAlt: 'http://192.168.0.221/WebApi/App/TripHistory?did=',
  //---------------------------------------------------------------------------------------------

  //Local Development Server(102)....
  // apiGetVersion: 'http://192.168.0.102/WebApi/App/Version',
  // apiGetOtp: 'http://192.168.0.102/WebApi/App/GetOtp?ph=',
  // apiUrl: 'http://192.168.0.102/WebApi/App/',
  // apiPostBookings: 'http://192.168.0.102/WebApi/App/Bookings?did=',
  // apiPostKmReading: 'http://192.168.0.102/WebApi/App/KmReading?tripNo=',
  // apiPostLocation: 'http://192.168.0.102/WebApi/App/Location?loc=',
  // apiGetStatus: 'http://192.168.0.102/WebApi/App/Status?tripNo=',
  // apiPostFinalSubmit: 'http://192.168.0.102/WebApi/App/Complete?tid=',
  // apiPostErrReport: 'http://192.168.0.102/WebApi/App/ErrReport?did=',
  // apiPostUpload: 'http://192.168.0.102/WebApi/App/Upload?tid=',
  // apiGetIdle: 'http://192.168.0.102/WebApi/App/idle?tid=',
  // apiPostTripHistory: 'http://192.168.0.102/WebApi/App/TripHistory?did=',

  // // Local Development Server(102) (Fallback)....
  // apiGetVersionAlt: 'http://192.168.0.102/WebApi/App/Version',
  // apiGetOtpAlt: 'http://192.168.0.102/WebApi/App/GetOtp?ph=',
  // apiUrlAlt: 'http://192.168.0.102/WebApi/App/',
  // apiPostBookingsAlt: 'http://192.168.0.102/WebApi/App/Bookings?did=',
  // apiPostKmReadingAlt: 'http://192.168.0.102/WebApi/App/KmReading?tripNo=',
  // apiPostLocationAlt: 'http://192.168.0.102/WebApi/App/Location?loc=',
  // apiGetStatusAlt: 'http://192.168.0.102/WebApi/App/Status?tripNo=',
  // apiPostFinalSubmitAlt: 'http://192.168.0.102/WebApi/App/Complete?tid=',
  // apiPostErrReportAlt: 'http://192.168.0.102/WebApi/App/ErrReport?did=',
  // apiPostUploadAlt: 'http://192.168.0.102/WebApi/App/Upload?tid=',
  // apiGetIdleAlt: 'http://192.168.0.102/WebApi/App/idle?tid=',
  // apiPostTripHistoryAlt: 'http://192.168.0.102/WebApi/App/TripHistory?did=',

  tomTomApiKey: 'zwkA3jHm1HwPDIbg1STbFDSGjT1YmNac',
  timeoutValue: '180000',
  connectionTimeoutValue: null,
  get appVersion() {
    return `2.0.22(${config.apiServer})`;
  },
  trackInterval: null,
  versionNote: '(2.0.15)Implemented MAPPLS Route API instead of Distance API', // 2.0.15 on 27th October 2025
  versionNote: '(2.0.16)Added Trip Drawer to Navigate to Trip List Page', // 2.0.16 on 02nd December 2025
  versionNote: '(2.0.17)Added VIP Indication',
  versionNote: '(2.0.18)Added Missing Timeouts in Pickedup and Drop Screen',
  versionNote:
    '(2.0.19)LatLongCalcTime is assigned based on Duty Type LOCAL/OUTSTATION',
  versionNote: '(2.0.20)Added Geometry Logic to plot Map on Roadways.',
  versionNote: '(2.0.21)Improved Error Logs and Alerts.',
  versionNote: '(2.0.22)Improved Verify OTP Logic in Login Screen.',
};

export const MAPPLS_CONFIG = {
  // ETC Production Account..
  CLIENT_ID: null,
  CLIENT_SECRET: null,
  API_KEY: null,
  BASE_URL_OAUTH: null,
  BASE_URL_GEOCODE: null,
  BASE_URL_PLACE_DETAIL: null,
  BASE_URL_REVERSE_GEOCODE: null,
  BASE_URL_DISTANCE: null,
  TOKEN_STORAGE_KEY: 'mappls_oauth_token',
};

export const Colors = {
  // Primary Theme Colors
  primary: '#FF6B6B', // Coral red – eye-catching & energetic
  secondary: '#4ECDC4', // Aqua – calm and modern contrast

  // Layout Backgrounds
  background: '#F0F4F8', // Light cool gray-blue – clean and soft
  cardBackground: '#FFFFFF', // Pure white for contrast and clarity
  actionButtons: '#355E3B',
  buttons: '#0c4160',
  completeCardBg: '#FAFDF8',

  // Text Colors
  text: '#2E2E2E', // Neutral deep gray – less harsh than black
  headingText: '#0C4160', // Deep teal – elegant and readable
  label: '#B23A48', // Dusty crimson – muted but distinct
  value: '#1A3C40', // Match headingText for visual consistency

  // Accent Areas
  heading: '#E3EAF2', // Cool pale blue – modern section header bg
  border: '#DCE3E8', // Light neutral for subtle dividers

  // Status Colors
  danger: '#FF4C4C', // Vivid red – clean error highlight
  success: '#2ECC71', // Fresh green – positive affirmations
  warning: '#FFA630', // Soft orange – attention without aggression

  // Date-Time Fields
  dateTimeBackground: '#F8F4E3', // Medium blue – stands out on light bg
  dateTimeText: '#0c4160', // White text for strong contrast
};
export default config;
