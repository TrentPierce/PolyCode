# PolyCode IDE - Logging Guide

## Overview

PolyCode IDE uses a centralized logging framework based on Winston for the main process and a custom logger for the renderer process. All logs are structured, include timestamps, and can be configured at runtime.

### Key Features

- **Structured logging** with JSON format for main process
- **Multiple log levels**: error, warn, info, debug, verbose
- **Multiple transports**: Console (dev) and File (always)
- **Log rotation**: Automatic file rotation at 10MB with max 10 files
- **Environment-aware**: Different log levels for development vs production
- **Sensitive data protection**: Automatic redaction of passwords, tokens, and API keys
- **Stack traces**: Automatic capture for error-level logs
- **IPC bridge**: Renderer sends logs to main process for centralized storage

## Log Levels

### error (0)
Critical errors that prevent the application from functioning or cause significant issues.

**When to use:**
- Application crashes
- Failed initialization
- Critical API failures
- Unhandled exceptions

**Example:**
```javascript
logger.error('Failed to initialize orchestrator', {
  error: error.message,
  stack: error.stack
});
```

### warn (1)
Warning messages for potentially harmful situations that don't prevent the application from running.

**When to use:**
- Deprecated feature usage
- Failed but non-critical operations
- Invalid user input that's handled
- Recoverable errors

**Example:**
```javascript
logger.warn('Invalid file path detected', {
  path: filePath,
  reason: 'Path traversal detected'
});
```

### info (1)
Informational messages that highlight the progress of the application.

**When to use:**
- Application startup/shutdown
- Major user actions (open project, save file)
- Successful operations
- Configuration changes

**Example:**
```javascript
logger.info('Project saved successfully', {
  path: result.path,
  fileCount: Object.keys(files).length
});
```

### debug (3)
Detailed diagnostic information for troubleshooting.

**When to use:**
- Variable states
- Function entry/exit
- Detailed operation steps
- Configuration values

**Example:**
```javascript
logger.debug('Loading file from disk', {
  filePath,
  size: fileStats.size
});
```

### verbose (4)
Highly detailed logging for deep troubleshooting.

**When to use:**
- Individual iteration loops
- Detailed API responses
- Internal state changes
- Granular operation tracking

**Example:**
```javascript
logger.verbose('Processing file chunk', {
  chunkNumber,
  chunkSize,
  totalChunks
});
```

## Configuration

### Main Process Configuration

The main process logger is configured in `src/main/core/logger.js`.

**Default Settings:**
- Log level: `debug` (development) / `warn` (production)
- Log directory: `<userData>/logs/`
- Max file size: 10MB
- Max files: 10 (error + combined)
- Date files: 30 days retention

**Change Log Level:**
```javascript
logger.configure({ level: 'info' });
```

**Add Custom Transport:**
```javascript
const customTransport = new winston.transports.File({
  filename: 'custom.log',
  format: customFormat
});
logger.configure({ transports: [customTransport] });
```

### Renderer Process Configuration

The renderer logger is configured in `src/renderer/utils/logger.js`.

**Default Settings:**
- Log level: `debug` (development) / `info` (production)
- Sends all logs to main process
- Console output in development only

**Change Log Level:**
```javascript
await logger.configure({ level: 'warn' });
```

## Log Files

### File Locations

Logs are stored in the application's user data directory:
- **Windows:** `%APPDATA%/polycode-ide/logs/`
- **macOS:** `~/Library/Application Support/polycode-ide/logs/`
- **Linux:** `~/.config/polycode-ide/logs/`

### Log File Types

1. **polycode-error.log** - Only error-level messages
2. **polycode-combined.log** - All log messages combined
3. **polycode-YYYY-MM-DD.log** - Date-based archival logs

### Viewing Logs

**Through IPC (from renderer):**
```javascript
// Get list of log files
const result = await window.electronAPI.logGetLogs();
console.log('Available logs:', result.files);

// View a specific log file
const content = await window.electronAPI.logViewFile('polycode-combined.log');
console.log(content.content);
```

**Direct file access:**
```bash
# Windows
type %APPDATA%\polycode-ide\logs\polycode-combined.log

# macOS/Linux
cat ~/Library/Application\ Support/polycode-ide/logs/polycode-combined.log
```

## How to Enable Debug Logging

### Main Process

Set environment variable before starting:
```bash
NODE_ENV=development npm start
```

Or programmatically:
```javascript
const logger = require('./core/logger');
logger.configure({ level: 'debug' });
```

### Renderer Process

```javascript
import logger from './utils/logger';
await logger.configure({ level: 'debug' });
```

Or through IPC from main process:
```javascript
await window.electronAPI.logSetLevel('debug');
```

## Archiving Logs

### Manual Archiving

Logs are automatically rotated, but you can manually archive:

```bash
# Create archive directory
mkdir logs-archive
cd logs

# Compress old logs
tar -czf ../logs-archive/polycode-logs-$(date +%Y%m%d).tar.gz *.log

# Remove old log files
rm *.log
```

### Automated Archiving

The logger automatically:
- Rotates logs when they reach 10MB
- Keeps 10 rotated files
- Creates date-based logs for 30 days retention

## Best Practices

### 1. Use Structured Logging

Always use structured data with context:
```javascript
// Good
logger.info('File saved', {
  filePath,
  size: content.length,
  language
});

// Avoid
logger.info(`File ${filePath} saved with size ${content.length}`);
```

### 2. Don't Log Sensitive Data

The logger automatically redacts sensitive keys, but be careful:
```javascript
// Don't log this
logger.info('User credentials', {
  username,
  password // Will be redacted, but better to not include
});

// Log this instead
logger.info('User logged in', { username });
```

### 3. Use Appropriate Log Levels

```javascript
// Error: Application cannot continue
logger.error('Database connection failed', { error });

// Warn: Problem but application continues
logger.warn('Retrying connection', { attempt: 3 });

// Info: Normal operation
logger.info('Connection established', { host: 'db.example.com' });

// Debug: Troubleshooting details
logger.debug('Query executed', { query, duration: '50ms' });
```

### 4. Include Context

Always include relevant context for troubleshooting:
```javascript
logger.error('Failed to save file', {
  filePath,
  error: err.message,
  attempt: retryCount,
  lastSavedTime
});
```

### 5. Use Child Loggers for Modules

```javascript
// Create child logger with module context
const projectLogger = logger.child({ module: 'ProjectManager' });

// All logs automatically include module context
projectLogger.info('Project loaded', { path });
```

### 6. Don't Over-log in Production

In production, the log level is set to `warn` by default. This reduces console output and log file size while still capturing important information.

## Example Usage

### Main Process

```javascript
const logger = require('./core/logger');

// Startup
logger.info('Application starting', {
  version: '1.0.0',
  platform: process.platform
});

// Error handling
try {
  await someOperation();
} catch (error) {
  logger.error('Operation failed', {
    operation: 'someOperation',
    error: error.message,
    stack: error.stack
  });
}

// Debug information
logger.debug('Processing request', {
  requestId,
  params: { /* sanitized */ }
});
```

### Renderer Process

```javascript
import logger from './utils/logger';

// User action
function handleSave() {
  logger.info('User saved file', {
    filePath,
    hasUnsavedChanges: true
  });
  // ... save logic
}

// Error handling
try {
  await loadData();
} catch (error) {
  logger.error('Failed to load data', {
    source: 'renderer',
    error: error.message
  });
}

// Debug
function handleFileSelect(filePath) {
  logger.debug('File selected', { filePath });
  // ... selection logic
}
```

## Troubleshooting

### Logs Not Appearing

1. Check log level is set correctly
2. Verify log directory exists and is writable
3. Check for errors in the logger initialization
4. Ensure logs aren't being filtered

### Log Files Too Large

1. Reduce log level (e.g., from `debug` to `info`)
2. Check for unnecessary logging in hot paths
3. Verify log rotation is working
4. Manually archive old logs

### Performance Issues

Logging in development can impact performance:
- Reduce log level in hot paths
- Use conditional logging: `if (logger.isDebugEnabled()) logger.debug(...)`
- Avoid expensive object serialization in debug logs

## API Reference

### Main Process Logger

```javascript
// Logging methods
logger.error(message, metadata);
logger.warn(message, metadata);
logger.info(message, metadata);
logger.debug(message, metadata);
logger.verbose(message, metadata);

// Configuration
logger.configure({ level, transports });
const config = logger.getConfig();

// Log file operations
const { files } = logger.getLogFiles();
const { content } = logger.viewLogFile(filename);

// Child logger
const childLogger = logger.child({ context });
```

### Renderer Process Logger

```javascript
// Logging methods
logger.error(message, metadata);
logger.warn(message, metadata);
logger.info(message, metadata);
logger.debug(message, metadata);

// Configuration
const config = await logger.configure({ level });
const currentConfig = logger.getConfig();

// Child logger
const childLogger = logger.child({ context });
```

### IPC API (Renderer)

```javascript
// Send log to main
await window.electronAPI.logMessage('info', 'Message', { context });

// Get logger config
const config = await window.electronAPI.logGetConfig();

// Set log level
await window.electronAPI.logSetLevel('debug');

// Get log files
const result = await window.electronAPI.logGetLogs();

// View log file
const content = await window.electronAPI.logViewFile('polycode-combined.log');
```

## Summary

The PolyCode logging framework provides:

✅ Centralized, structured logging
✅ Multiple log levels with appropriate use cases
✅ Automatic log rotation and archival
✅ Environment-aware configuration
✅ Sensitive data protection
✅ Stack trace capture for errors
✅ IPC bridge for renderer-to-main logging
✅ Console output in development
✅ File logging in all environments

For more information, see the inline documentation in `src/main/core/logger.js` and `src/renderer/utils/logger.js`.
