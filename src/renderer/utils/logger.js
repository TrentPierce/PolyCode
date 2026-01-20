/**
 * Renderer Process Logger
 *
 * Sends logs to the main process via IPC.
 * Provides console logging in development mode only.
 */

// Log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Determine if development mode
const isDevelopment = window.location.hostname === 'localhost' ||
                       window.location.protocol === 'file:' ||
                       window.electronAPI?.getNodeEnv?.() !== 'production';

// Current log level (can be changed via configure)
let currentLevel = isDevelopment ? 'debug' : 'info';

// Check if log should be output based on level
function shouldLog(level) {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

// Sanitize data to remove sensitive information
function sanitizeData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apikey',
    'api_key',
    'auth',
    'credential',
    'private_key',
    'access_token',
    'refresh_token'
  ];

  const sanitized = { ...data };

  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  });

  return sanitized;
}

// Get error stack trace
function getStackTrace() {
  const error = new Error();
  return error.stack;
}

// Format log entry
function formatLogEntry(level, message, context = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...sanitizeData(context)
  };

  // Add stack trace for errors
  if (level === 'error') {
    entry.stack = getStackTrace();
  }

  return entry;
}

// Send log to main process
async function sendToMain(level, message, context = {}) {
  try {
    if (window.electronAPI && window.electronAPI.logMessage) {
      await window.electronAPI.logMessage(level, message, context);
    }
  } catch (error) {
    // Fallback to console if IPC fails
    console.error('[Logger IPC Error]:', error);
  }
}

// Console logging (development only)
function logToConsole(level, message, context = {}) {
  if (!isDevelopment) {
    return;
  }

  const consoleMethod = level === 'error' ? console.error :
                        level === 'warn' ? console.warn :
                        level === 'info' ? console.info :
                        console.log;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (Object.keys(context).length > 0) {
    consoleMethod(prefix, message, sanitizeData(context));
  } else {
    consoleMethod(prefix, message);
  }
}

// Logger methods
const logger = {
  error: (message, context = {}) => {
    if (!shouldLog('error')) return;

    const entry = formatLogEntry('error', message, context);
    logToConsole('error', message, context);
    sendToMain('error', message, context);
  },

  warn: (message, context = {}) => {
    if (!shouldLog('warn')) return;

    const entry = formatLogEntry('warn', message, context);
    logToConsole('warn', message, context);
    sendToMain('warn', message, context);
  },

  info: (message, context = {}) => {
    if (!shouldLog('info')) return;

    const entry = formatLogEntry('info', message, context);
    logToConsole('info', message, context);
    sendToMain('info', message, context);
  },

  debug: (message, context = {}) => {
    if (!shouldLog('debug')) return;

    const entry = formatLogEntry('debug', message, context);
    logToConsole('debug', message, context);
    sendToMain('debug', message, context);
  },

  // Configure logger at runtime
  configure: async (options = {}) => {
    if (options.level && LOG_LEVELS[options.level] !== undefined) {
      currentLevel = options.level;
      logger.info(`Renderer log level changed to ${options.level}`, {
        oldLevel: currentLevel,
        newLevel: options.level
      });
    }

    // Get config from main process
    try {
      if (window.electronAPI && window.electronAPI.logGetConfig) {
        const config = await window.electronAPI.logGetConfig();
        logger.debug('Logger configuration retrieved from main', config);
        return config;
      }
    } catch (error) {
      console.error('[Logger] Failed to get config:', error);
    }

    return {
      level: currentLevel,
      isDevelopment,
      process: 'renderer'
    };
  },

  // Child logger with additional context
  child: (context = {}) => {
    return {
      error: (message, additionalContext = {}) => {
        logger.error(message, { ...context, ...additionalContext });
      },
      warn: (message, additionalContext = {}) => {
        logger.warn(message, { ...context, ...additionalContext });
      },
      info: (message, additionalContext = {}) => {
        logger.info(message, { ...context, ...additionalContext });
      },
      debug: (message, additionalContext = {}) => {
        logger.debug(message, { ...context, ...additionalContext });
      }
    };
  },

  // Get logger configuration
  getConfig: () => {
    return {
      level: currentLevel,
      isDevelopment,
      process: 'renderer'
    };
  }
};

// Log renderer startup
logger.info('Renderer logger initialized', {
  level: currentLevel,
  hostname: window.location.hostname,
  href: window.location.href,
  userAgent: navigator.userAgent
});

export default logger;
