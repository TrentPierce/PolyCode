/**
 * Global Error Handler
 *
 * Provides centralized error handling and logging for the application
 */

/**
 * Error severity levels
 * @typedef {'critical'|'error'|'warning'|'info'|'debug'} ErrorSeverity
 */

/**
 * Error categories
 * @typedef {'validation'|'execution'|'network'|'llm'|'fs'|'unknown'} ErrorCategory
 */

/**
 * Application error state
 */
let errorState = {
  errors: [],
  lastError: null,
  recoveryAttempts: 0,
  maxRecoveryAttempts: 3
};

/**
 * Error details
 * @typedef {Object} ErrorDetails
 * @property {ErrorCategory} category - Error category
 * @property {ErrorSeverity} severity - Error severity
 * @property {string} message - Error message
 * @property {Error} originalError - Original error object
 * @property {string} context - Context where error occurred
 * @property {Date} timestamp - When error occurred
 */

/**
 * Categorize error based on type and message
 * @param {Error} error - Error object
 * @returns {ErrorCategory} Error category
 */
function categorizeError(error) {
  const message = error.message?.toLowerCase() || '';
  const stack = error.stack?.toLowerCase() || '';

  if (message.includes('validation') || message.includes('invalid')) {
    return 'validation';
  }

  if (message.includes('timeout') || message.includes('network') || stack.includes('axios')) {
    return 'network';
  }

  if (message.includes('lmstudio') || message.includes('model') || stack.includes('lmstudio')) {
    return 'llm';
  }

  if (message.includes('enoent') || message.includes('file not found') || message.includes('permission')) {
    return 'fs';
  }

  if (message.includes('spawn') || message.includes('execution') || message.includes('compile')) {
    return 'execution';
  }

  return 'unknown';
}

/**
 * Determine error severity
 * @param {ErrorCategory} category - Error category
 * @returns {ErrorSeverity} Error severity
 */
function getSeverity(category) {
  const severityMap = {
    validation: 'warning',
    execution: 'error',
    network: 'error',
    llm: 'error',
    fs: 'critical',
    unknown: 'error'
  };

  return severityMap[category] || 'error';
}

/**
 * Create error details object
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @returns {ErrorDetails} Formatted error details
 */
function createErrorDetails(error, context = '') {
  const category = categorizeError(error);
  const severity = getSeverity(category);

  return {
    category,
    severity,
    message: error.message || 'Unknown error occurred',
    originalError: error,
    context,
    timestamp: new Date()
  };
}

/**
 * Log error to console with formatting
 * @param {ErrorDetails} details - Error details
 */
function logError(details) {
  const { category, severity, message, context, timestamp } = details;

  const logLevel = severity === 'critical' ? console.error :
                    severity === 'error' ? console.error :
                    severity === 'warning' ? console.warn :
                    console.log;

  logLevel(`[${timestamp.toISOString()}] [${category.toUpperCase()}] [${severity.toUpperCase()}]`, {
    context,
    message
  });

  if (details.originalError && details.originalError.stack) {
    logLevel('Stack trace:', details.originalError.stack);
  }
}

/**
 * Handle error with recovery logic
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @param {Function} recoveryFn - Recovery function to attempt
 * @returns {Promise<{success: boolean, recovered: boolean, error?: string}>}
 */
async function handleError(error, context = '', recoveryFn = null) {
  const details = createErrorDetails(error, context);

  // Store error in state
  errorState.errors.push(details);
  errorState.lastError = details;

  // Log error
  logError(details);

  // Check if we've exceeded max recovery attempts
  if (errorState.recoveryAttempts >= errorState.maxRecoveryAttempts) {
    errorState.recoveryAttempts = 0;
    return {
      success: false,
      recovered: false,
      error: `Max recovery attempts (${errorState.maxRecoveryAttempts}) exceeded`
    };
  }

  // Attempt recovery if function provided
  if (recoveryFn) {
    errorState.recoveryAttempts++;
    try {
      await recoveryFn(details);
      errorState.recoveryAttempts = 0; // Reset on successful recovery
      return { success: true, recovered: true };
    } catch (recoveryError) {
      const recoveryDetails = createErrorDetails(recoveryError, `Recovery attempt ${errorState.recoveryAttempts}`);
      logError(recoveryDetails);
      return {
        success: false,
        recovered: false,
        error: `Recovery failed: ${recoveryError.message}`
      };
    }
  }

  return { success: false, recovered: false };
}

/**
 * Get current error state
 * @returns {{errors: ErrorDetails[], lastError: ErrorDetails|null, recoveryAttempts: number}}
 */
function getErrorState() {
  return { ...errorState };
}

/**
 * Clear error state
 */
function clearErrors() {
  errorState.errors = [];
  errorState.lastError = null;
  errorState.recoveryAttempts = 0;
}

/**
 * Get recent errors
 * @param {number} count - Number of recent errors to return
 * @returns {ErrorDetails[]} Recent errors
 */
function getRecentErrors(count = 10) {
  return errorState.errors.slice(-count);
}

/**
 * Get errors by category
 * @param {ErrorCategory} category - Category to filter by
 * @returns {ErrorDetails[]} Errors in category
 */
function getErrorsByCategory(category) {
  return errorState.errors.filter(err => err.category === category);
}

/**
 * Reset recovery attempts
 */
function resetRecoveryAttempts() {
  errorState.recoveryAttempts = 0;
}

/**
 * Get user-friendly error message
 * @param {ErrorDetails} details - Error details
 * @returns {string} User-friendly message
 */
function getUserFriendlyMessage(details) {
  const { category, message } = details;

  const friendlyMessages = {
    validation: `Validation failed: ${message}`,
    execution: `Code execution failed: ${message}`,
    network: `Connection failed: ${message}. Please check your internet connection.`,
    llm: `AI model error: ${message}. Please check LMStudio is running.`,
    fs: `File system error: ${message}. Please check file permissions.`,
    unknown: `An error occurred: ${message}`
  };

  return friendlyMessages[category] || friendlyMessages.unknown;
}

/**
 * Setup global error handlers
 */
function setupGlobalHandlers() {
  // Unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    const details = createErrorDetails(error, 'Unhandled Promise Rejection');
    logError(details);
  });

  // Uncaught exceptions
  process.on('uncaughtException', (error) => {
    const details = createErrorDetails(error, 'Uncaught Exception');
    logError(details);

    // For critical errors, we might want to restart
    if (details.severity === 'critical') {
      console.error('Critical error occurred. Application may need to be restarted.');
    }
  });

  // Unhandled warnings
  process.on('warning', (warning) => {
    console.warn('[WARNING]', warning);
  });
}

/**
 * Teardown global error handlers (for testing)
 */
function teardownGlobalHandlers() {
  process.removeAllListeners('unhandledRejection');
  process.removeAllListeners('uncaughtException');
  process.removeAllListeners('warning');
}

/**
 * Create a safe wrapper for async functions
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context description
 * @returns {Function} Wrapped function with error handling
 */
function safeAsync(fn, context = '') {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const result = await handleError(error, context);
      throw error; // Re-throw after logging
    }
  };
}

/**
 * Create a safe wrapper for sync functions
 * @param {Function} fn - Function to wrap
 * @param {string} context - Context description
 * @returns {Function} Wrapped function with error handling
 */
function safeSync(fn, context = '') {
  return (...args) => {
    try {
      return fn(...args);
    } catch (error) {
      handleError(error, context);
      throw error; // Re-throw after logging
    }
  };
}

module.exports = {
  categorizeError,
  getSeverity,
  createErrorDetails,
  logError,
  handleError,
  getErrorState,
  clearErrors,
  getRecentErrors,
  getErrorsByCategory,
  resetRecoveryAttempts,
  getUserFriendlyMessage,
  setupGlobalHandlers,
  teardownGlobalHandlers,
  safeAsync,
  safeSync
};
