/**
 * Recovery System
 *
 * Provides automatic recovery strategies for common failure scenarios
 */

const path = require('path');
const fs = require('fs');

/**
 * Recovery action types
 * @typedef {'retry'|'fallback'|'skip'|'restart'|'user_action'} RecoveryAction
 */

/**
 * Recovery result
 * @typedef {Object} RecoveryResult
 * @property {boolean} success - Whether recovery succeeded
 * @property {RecoveryAction} action - Action taken
 * @property {string} message - Description of recovery action
 * @property {*} data - Additional data from recovery
 */

/**
 * Recovery strategies for different error types
 */
const recoveryStrategies = {
  /**
   * Recovery strategy for network errors
   * @param {Object} details - Error details
   * @returns {Promise<RecoveryResult>}
   */
  network: async (details) => {
    const { message } = details;

    // Check if it's a timeout
    if (message.includes('timeout')) {
      return {
        success: false,
        action: 'user_action',
        message: 'Request timed out. Please try again or increase timeout in settings.',
        data: { suggestRetry: true }
      };
    }

    // Check if it's a connection error
    if (message.includes('ECONNREFUSED') || message.includes('connect')) {
      return {
        success: false,
        action: 'user_action',
        message: 'Cannot connect to LMStudio. Please ensure LMStudio is running.',
        data: { suggestRestart: true }
      };
    }

    // Generic network error - suggest retry
    return {
      success: false,
        action: 'user_action',
        message: 'Network error occurred. Please check your connection and try again.',
        data: { suggestRetry: true }
      };
  },

  /**
   * Recovery strategy for LLM errors
   * @param {Object} details - Error details
   * @returns {Promise<RecoveryResult>}
   */
  llm: async (details) => {
    const { message } = details;

    // Check if it's a model load error
    if (message.includes('not available') || message.includes('load')) {
      return {
        success: false,
        action: 'fallback',
        message: 'Model not available. Please check your model selection in Settings.',
        data: { openSettings: true }
      };
    }

    // Check if it's a generation error
    if (message.includes('generation failed') || message.includes('completion failed')) {
      return {
        success: false,
        action: 'retry',
        message: 'Generation failed. You can try again or select a different model.',
        data: { suggestRetry: true, differentModel: true }
      };
    }

    // Generic LLM error
    return {
      success: false,
      action: 'user_action',
      message: 'AI model error. Please check LMStudio and try again.',
      data: { checkLMStudio: true }
    };
  },

  /**
   * Recovery strategy for execution errors
   * @param {Object} details - Error details
   * @returns {Promise<RecoveryResult>}
   */
  execution: async (details) => {
    const { message } = details;

    // Check if it's a compilation error
    if (message.includes('Compilation failed')) {
      return {
        success: false,
        action: 'skip',
        message: 'Code compilation failed. Please check the code for syntax errors.',
        data: { type: 'compilation_error' }
      };
    }

    // Check if it's a timeout
    if (message.includes('timeout')) {
      return {
        success: false,
        action: 'user_action',
        message: 'Code execution timed out. There may be an infinite loop.',
        data: { type: 'timeout', suggestOptimize: true }
      };
    }

    // Generic execution error
    return {
      success: false,
      action: 'user_action',
      message: 'Code execution failed. Please check the code for errors.',
      data: { type: 'execution_error' }
    };
  },

  /**
   * Recovery strategy for validation errors
   * @param {Object} details - Error details
   * @returns {Promise<RecoveryResult>}
   */
  validation: async (details) => {
    const { message } = details;

    // Specific validation errors
    if (message.includes('path')) {
      return {
        success: false,
        action: 'user_action',
        message: 'Invalid file path. Please check the file path and try again.',
        data: { type: 'path_error' }
      };
    }

    if (message.includes('prompt')) {
      return {
        success: false,
        action: 'user_action',
        message: 'Invalid prompt. Please check your input and try again.',
        data: { type: 'prompt_error' }
      };
    }

    // Generic validation error
    return {
      success: false,
      action: 'user_action',
      message: 'Validation failed. Please check your input and try again.',
      data: { type: 'validation_error' }
    };
  },

  /**
   * Recovery strategy for file system errors
   * @param {Object} details - Error details
   * @returns {Promise<RecoveryResult>}
   */
  fs: async (details) => {
    const { message } = details;

    // Check if it's a permission error
    if (message.includes('permission') || message.includes('EACCES') || message.includes('EPERM')) {
      return {
        success: false,
        action: 'user_action',
        message: 'Permission denied. Please check file permissions.',
        data: { type: 'permission_error' }
      };
    }

    // Check if it's a not found error
    if (message.includes('not found') || message.includes('ENOENT')) {
      return {
        success: false,
        action: 'user_action',
        message: 'File not found. Please check the file path.',
        data: { type: 'not_found_error' }
      };
    }

    // Generic FS error
    return {
      success: false,
      action: 'user_action',
      message: 'File system error. Please check the file and try again.',
      data: { type: 'fs_error' }
    };
  },

  /**
   * Recovery strategy for unknown errors
   * @param {Object} details - Error details
   * @returns {Promise<RecoveryResult>}
   */
  unknown: async (details) => {
    return {
      success: false,
      action: 'user_action',
      message: 'An unknown error occurred. Please try again or restart the application.',
      data: { type: 'unknown_error', suggestRestart: true }
    };
  }
};

/**
 * Attempt recovery for an error
 * @param {Object} errorDetails - Error details from error handler
 * @param {Object} context - Additional context for recovery
 * @returns {Promise<RecoveryResult>}
 */
async function recover(errorDetails, context = {}) {
  const { category } = errorDetails;

  // Get recovery strategy for error category
  const strategy = recoveryStrategies[category] || recoveryStrategies.unknown;

  // Attempt recovery
  try {
    const result = await strategy(errorDetails);
    return result;
  } catch (recoveryError) {
    return {
      success: false,
      action: 'user_action',
      message: `Recovery failed: ${recoveryError.message}`,
      data: { recoveryError: recoveryError.message }
    };
  }
}

/**
 * Automatic retry with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxAttempts - Maximum retry attempts
 * @param {number} initialDelay - Initial delay in milliseconds
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function retryWithBackoff(fn, maxAttempts = 3, initialDelay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      return { success: true, data: result };
    } catch (error) {
      lastError = error;

      // If last attempt, fail
      if (attempt === maxAttempts) {
        return {
          success: false,
          error: error.message,
          attempts: attempt
        };
      }

      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt - 1);

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Create retry function with context
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Function} Retry function
 */
function createRetryFunction(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    shouldRetry = (error) => true
  } = options;

  return async (...args) => {
    return await retryWithBackoff(
      () => fn(...args),
      maxAttempts,
      initialDelay
    );
  };
}

/**
 * Graceful degradation - continue with reduced functionality
 * @param {string} feature - Feature that failed
 * @param {string} alternative - Alternative approach
 * @returns {{success: boolean, message: string, alternative: string}}
 */
function gracefulDegradation(feature, alternative) {
  return {
    success: true,
    message: `${feature} is unavailable. Using alternative: ${alternative}`,
    alternative
  };
}

/**
 * Check system health and suggest recovery
 * @returns {Promise<{healthy: boolean, issues: string[]}>}
 */
async function checkSystemHealth() {
  const issues = [];

  // Check if LMStudio is running
  try {
    const { LMStudioClient } = require('./lmstudio-client');
    const client = new LMStudioClient();
    const connection = await client.checkConnection();
    if (!connection.connected) {
      issues.push('LMStudio is not running or not accessible');
    }
  } catch (error) {
    issues.push(`Cannot check LMStudio: ${error.message}`);
  }

  // Check project path
  if (global.projectPath && !fs.existsSync(global.projectPath)) {
    issues.push(`Project path does not exist: ${global.projectPath}`);
  }

  return {
    healthy: issues.length === 0,
    issues
  };
}

/**
 * Get suggested actions for recovery result
 * @param {RecoveryResult} result - Recovery result
 * @returns {string[]} Suggested actions
 */
function getSuggestedActions(result) {
  const actions = [];

  if (result.data?.suggestRetry) {
    actions.push('Try again');
  }

  if (result.data?.suggestRestart) {
    actions.push('Restart the application');
  }

  if (result.data?.openSettings) {
    actions.push('Open Settings to configure models');
  }

  if (result.data?.checkLMStudio) {
    actions.push('Check LMStudio is running');
  }

  if (result.data?.suggestOptimize) {
    actions.push('Optimize the code for better performance');
  }

  if (result.data?.differentModel) {
    actions.push('Try a different model');
  }

  return actions;
}

module.exports = {
  recover,
  retryWithBackoff,
  createRetryFunction,
  gracefulDegradation,
  checkSystemHealth,
  getSuggestedActions
};
