import RNFS from 'react-native-fs';
import config from '../config';
import { ToastAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safe dynamic getter for the log file path
const getLogFilePath = () => {
  try {
    const baseDir = RNFS?.DocumentDirectoryPath || RNFS?.CachesDirectoryPath;
    if (!baseDir) {
      return null;
    }
    return `${baseDir}/app.log`;
  } catch (error) {
    console.error('Error getting log file path:', error?.message);
    return null;
  }
};

// Safe timestamp formatter
const getTimestamp = () => {
  try {
    return new Date().toLocaleString();
  } catch (_) {
    return new Date().toISOString();
  }
};

// Promise-based sequential queue to prevent concurrent file I/O race conditions
let logQueue = Promise.resolve();

const queueOperation = task => {
  logQueue = logQueue
    .then(async () => {
      try {
        await task();
      } catch (err) {
        console.warn('Logger task warning:', err?.message || err);
      }
    })
    .catch(err => {
      console.warn('Logger queue warning:', err?.message || err);
    });
  return logQueue;
};

let writeCounter = 0;
const MAX_LOG_SIZE_BYTES = 1024 * 1024; // 1 MB
const MAX_LOG_LINES = 3000;

// Main logging function
const log = async (message, ...extraArgs) => {
  return <></>;
  try {
    const timestamp = getTimestamp();
    const appVersion = config?.appVersion || 'unknown';
    let logMessage = `${timestamp}: (v${appVersion}) - ${message}`;

    if (extraArgs.length > 0) {
      const formattedExtras = extraArgs
        .map(arg => {
          if (arg === undefined || arg === null) return '';
          if (typeof arg === 'object') {
            try {
              if (arg instanceof Error) {
                return `${arg.message || ''} ${arg.stack || ''}`.trim();
              }
              return JSON.stringify(arg);
            } catch (_) {
              return String(arg);
            }
          }
          return String(arg);
        })
        .filter(Boolean)
        .join(' ');

      if (formattedExtras) {
        logMessage += ` ${formattedExtras}`;
      }
    }

    logMessage += '\n';

    const logFilePath = getLogFilePath();
    if (!logFilePath || !RNFS) {
      return;
    }

    // Queue file operations so multiple concurrent logs never corrupt or lock the file
    queueOperation(async () => {
      try {
        const fileExists = await RNFS.exists(logFilePath);
        if (!fileExists) {
          await RNFS.writeFile(logFilePath, '', 'utf8');
        }

        await RNFS.appendFile(logFilePath, logMessage, 'utf8');
        writeCounter++;

        // Only check file size and trim every 100 writes to avoid heavy I/O freezes
        if (writeCounter % 100 === 0) {
          try {
            const fileStat = await RNFS.stat(logFilePath);
            if (fileStat && fileStat.size > MAX_LOG_SIZE_BYTES) {
              const content = await RNFS.readFile(logFilePath, 'utf8');
              const lines = content.split('\n');
              if (lines.length > MAX_LOG_LINES) {
                const trimmed = lines
                  .slice(lines.length - MAX_LOG_LINES)
                  .join('\n');
                await RNFS.writeFile(logFilePath, trimmed, 'utf8');
              }
            }
          } catch (trimError) {
            console.warn('Logger trim check error:', trimError?.message);
          }
        }
      } catch (writeError) {
        console.warn('Error writing to log file:', writeError?.message);
      }
    });
  } catch (error) {
    console.error('Error in log():', error?.message);
  }
};

// Function to create the log file if it doesn't exist
const createLogFile = async () => {
  const logFilePath = getLogFilePath();
  if (!logFilePath || !RNFS) return;
  try {
    await queueOperation(async () => {
      const exists = await RNFS.exists(logFilePath);
      if (!exists) {
        await RNFS.writeFile(logFilePath, '', 'utf8');
        console.log('Log file created:', logFilePath);
      }
    });
  } catch (error) {
    console.error('Error creating log file:', error?.message);
  }
};

// Function to read the log file
const readLog = async () => {
  const logFilePath = getLogFilePath();
  if (!logFilePath || !RNFS) return '';
  try {
    const exists = await RNFS.exists(logFilePath);
    if (!exists) {
      return '';
    }
    const content = await RNFS.readFile(logFilePath, 'utf8');
    return content || '';
  } catch (err) {
    console.warn('Error reading log file:', err?.message);
    return '';
  }
};

// Function to clear log file
const clearLogFile = async () => {
  const logFilePath = getLogFilePath();
  if (!logFilePath || !RNFS) return;
  try {
    await queueOperation(async () => {
      await RNFS.writeFile(logFilePath, '', 'utf8');
      console.log('Log file cleared.');
    });
  } catch (error) {
    console.error('Error clearing log file:', error?.message);
  }
};

// Function to send log file to the server
const sendLogFile = async (did, dphone) => {
  const logFilePath = getLogFilePath();
  if (!logFilePath || !RNFS) {
    if (Platform.OS === 'android') {
      ToastAndroid.showWithGravity(
        'Log file path unavailable.',
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    }
    return;
  }

  const uploadLog = async baseUrl => {
    const url = `${baseUrl}${did}&dphone=${dphone}`;
    console.log('Send Error Report URL : ' + url);

    const exists = await RNFS.exists(logFilePath);
    if (!exists) {
      await RNFS.writeFile(logFilePath, '', 'utf8');
    }

    const formData = new FormData();
    formData.append('logFile', {
      uri: `file://${logFilePath}`,
      type: 'text/plain',
      name: 'log.txt',
    });

    const authToken = await AsyncStorage.getItem('API_AUTH_TOKEN');
    const headers = {};
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await Promise.race([
      fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      }),
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(new Error('Request timed out, check internet connection')),
          30000,
        ),
      ),
    ]);

    if (!response.ok) {
      throw new Error(
        `Failed to send log file to server from ${baseUrl}: ${response.statusText}`,
      );
    }
    return response;
  };

  try {
    try {
      await uploadLog(config.apiPostErrReport);
      console.log('Primary log file upload successful.');
    } catch (initialError) {
      console.warn(
        'Primary log file upload failed, attempting alternative:',
        initialError.message,
      );
      await uploadLog(config.apiPostErrReportAlt);
      console.log('Alternative log file upload successful.');
    }

    console.log('Log file sent to server successfully.');
    if (Platform.OS === 'android') {
      ToastAndroid.showWithGravity(
        'Error report sent successfully.',
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    }
    await clearLogFile();
  } catch (error) {
    console.error('Error sending log file to server:', error.message);
    if (Platform.OS === 'android') {
      ToastAndroid.showWithGravity(
        'Failed to send error report. Please check network.',
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    }
  }
};

// Export the logging functions
export { log, sendLogFile, readLog, clearLogFile, getLogFilePath };
export default log;
