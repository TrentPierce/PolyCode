const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Ensure logs directory exists
const logsDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels configuration
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
  silly: 5
};

// Log level colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  verbose: 'blue',
  debug: 'magenta',
  silly: 'gray'
};

winston.addColors(colors);

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format (more readable)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }

    return msg;
  })
);

// Determine log level based on environment
const logLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';

// Create logger instance
const logger = winston.createLogger({
  levels,
  level: logLevel,
  format: logFormat,
  defaultMeta: {
    service: 'polycode-ide',
    process: 'main',
    pid: process.pid,
    platform: process.platform,
    version: app.getVersion()
  },
  transports: [
    // Error log file (only errors)
    new winston.transports.File({
      filename: path.join(logsDir, 'polycode-error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      format: logFormat
    }),

    // Combined log file (all levels)
    new winston.transports.File({
      filename: path.join(logsDir, 'polycode-combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      format: logFormat
    }),

    // Date-based log file (for archival)
    new winston.transports.File({
      filename: path.join(logsDir, `polycode-${new Date().toISOString().split('T')[0]}.log`),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 30, // Keep 30 days
      format: logFormat
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    level: 'debug',
    format: consoleFormat
  }));
}

// Handle logger errors
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

// Logger methods
const loggerMethods = {
  error: (message, meta = {}) => {
    logger.error(message, meta);
  },

  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },

  info: (message, meta = {}) => {
    logger.info(message, meta);
  },

  debug: (message, meta = {}) => {
    logger.debug(message, meta);
  },

  verbose: (message, meta = {}) => {
    logger.verbose(message, meta);
  },

  // Configure logger at runtime
  configure: (options = {}) => {
    if (options.level && levels[options.level] !== undefined) {
      logger.level = options.level;
      logger.info(`Log level changed to ${options.level}`);
    }

    if (options.transports) {
      // Clear existing transports and add new ones
      logger.transports = [];
      options.transports.forEach(transport => {
        logger.add(transport);
      });
      logger.info('Logger transports updated');
    }

    return {
      level: logger.level,
      transports: logger.transports.map(t => t.name)
    };
  },

  // Get current logger configuration
  getConfig: () => {
    return {
      level: logger.level,
      transports: logger.transports.map(t => ({
        name: t.name,
        level: t.level,
        type: t.constructor.name
      })),
      meta: logger.defaultMeta
    };
  },

  // Get list of log files
  getLogFiles: () => {
    try {
      const files = fs.readdirSync(logsDir)
        .filter(file => file.endsWith('.log'))
        .map(file => ({
          filename: file,
          path: path.join(logsDir, file),
          size: fs.statSync(path.join(logsDir, file)).size,
          modified: fs.statSync(path.join(logsDir, file)).mtime
        }))
        .sort((a, b) => b.modified - a.modified);

      return { success: true, files };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Read log file content
  viewLogFile: (filename) => {
    try {
      const filePath = path.join(logsDir, filename);

      // Security check: ensure file is in logs directory
      if (!filePath.startsWith(logsDir)) {
        return { success: false, error: 'Invalid log file path' };
      }

      // Security check: ensure file exists and is a file
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Log file not found' };
      }

      if (!fs.statSync(filePath).isFile()) {
        return { success: false, error: 'Not a log file' };
      }

      const content = fs.readFileSync(filePath, 'utf8');

      // Limit content size for performance
      const maxLines = 1000;
      const lines = content.split('\n');
      const trimmedLines = lines.slice(-maxLines);
      const trimmedContent = trimmedLines.join('\n');

      return {
        success: true,
        content: trimmedContent,
        filename,
        totalLines: lines.length,
        isTrimmed: lines.length > maxLines
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Child logger with additional context
  child: (meta = {}) => {
    const childLogger = logger.child(meta);
    return {
      error: (message, additionalMeta = {}) => childLogger.error(message, additionalMeta),
      warn: (message, additionalMeta = {}) => childLogger.warn(message, additionalMeta),
      info: (message, additionalMeta = {}) => childLogger.info(message, additionalMeta),
      debug: (message, additionalMeta = {}) => childLogger.debug(message, additionalMeta),
      verbose: (message, additionalMeta = {}) => childLogger.verbose(message, additionalMeta)
    };
  }
};

// Log startup
logger.info('PolyCode IDE starting up', {
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch,
  electronVersion: process.versions.electron,
  nodeVersion: process.versions.node,
  nodeEnv: process.env.NODE_ENV,
  userDataPath: app.getPath('userData'),
  logsPath: logsDir
});

module.exports = loggerMethods;
