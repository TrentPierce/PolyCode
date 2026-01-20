/**
 * Input Validation Module
 *
 * Provides comprehensive input validation for IPC channels and user inputs
 * Prevents path traversal, injection attacks, and XSS vulnerabilities
 */

const path = require('path');

/**
 * Validation results
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {string[]} errors - List of validation errors
 * @property {*} sanitized - Sanitized value (if applicable)
 */

/**
 * Validate and sanitize user prompts
 * @param {string} prompt - User input prompt
 * @returns {ValidationResult}
 */
function validatePrompt(prompt) {
  const errors = [];

  // Check type
  if (typeof prompt !== 'string') {
    errors.push('Prompt must be a string');
    return { isValid: false, errors, sanitized: '' };
  }

  // Check length
  if (prompt.length === 0) {
    errors.push('Prompt cannot be empty');
    return { isValid: false, errors, sanitized: '' };
  }

  if (prompt.length > 50000) {
    errors.push('Prompt exceeds maximum length (50000 characters)');
    return { isValid: false, errors, sanitized: '' };
  }

  // Sanitize prompt - remove potentially dangerous patterns
  const sanitized = prompt
    // Remove null bytes
    .replace(/\0/g, '')
    // Limit consecutive whitespace
    .replace(/\s{10,}/g, ' '.repeat(3));

  return { isValid: true, errors: [], sanitized };
}

/**
 * Validate file path to prevent path traversal
 * @param {string} filePath - File path to validate
 * @param {string} basePath - Base project path (for resolution)
 * @returns {ValidationResult}
 */
function validateFilePath(filePath, basePath) {
  const errors = [];

  // Check type
  if (typeof filePath !== 'string') {
    errors.push('File path must be a string');
    return { isValid: false, errors, sanitized: '' };
  }

  if (filePath.length === 0) {
    errors.push('File path cannot be empty');
    return { isValid: false, errors, sanitized: '' };
  }

  // Check for path traversal patterns
  const normalizedPath = path.normalize(filePath);

  if (normalizedPath.includes('..')) {
    errors.push('File path cannot contain parent directory references (..)');
  }

  // Check for absolute paths (should be relative to project)
  if (path.isAbsolute(filePath)) {
    errors.push('File path must be relative to project directory');
  }

  // Check for null bytes
  if (filePath.includes('\0')) {
    errors.push('File path contains null bytes');
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /%2e%2e/i,  // URL-encoded ..
    /\.\.[\\/]/,   // ..\ or ../
    /[\\/]\.\.[\\/]/ // \..\
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(filePath)) {
      errors.push('File path contains suspicious patterns');
      break;
    }
  }

  // Validate against base path if provided
  if (basePath && errors.length === 0) {
    try {
      const resolvedPath = path.resolve(basePath, filePath);
      if (!resolvedPath.startsWith(path.resolve(basePath))) {
        errors.push('File path resolves outside project directory');
      }
    } catch (err) {
      errors.push(`Failed to resolve file path: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors, sanitized: '' };
  }

  // Return sanitized path
  return {
    isValid: true,
    errors: [],
    sanitized: normalizedPath
  };
}

/**
 * Validate project path
 * @param {string} projectPath - Project directory path
 * @returns {ValidationResult}
 */
function validateProjectPath(projectPath) {
  const errors = [];

  if (typeof projectPath !== 'string') {
    errors.push('Project path must be a string');
    return { isValid: false, errors, sanitized: '' };
  }

  if (projectPath.length === 0) {
    errors.push('Project path cannot be empty');
    return { isValid: false, errors, sanitized: '' };
  }

  try {
    const normalized = path.normalize(projectPath);

    // Check for path traversal
    if (normalized.includes('..')) {
      errors.push('Project path cannot contain parent directory references');
    }

    // Check for null bytes
    if (projectPath.includes('\0')) {
      errors.push('Project path contains null bytes');
    }

    if (errors.length > 0) {
      return { isValid: false, errors, sanitized: '' };
    }

    return { isValid: true, errors: [], sanitized: normalized };
  } catch (err) {
    errors.push(`Invalid project path: ${err.message}`);
    return { isValid: false, errors, sanitized: '' };
  }
}

/**
 * Validate code instruction for edit operations
 * @param {string} instruction - Edit instruction
 * @returns {ValidationResult}
 */
function validateInstruction(instruction) {
  const errors = [];

  if (typeof instruction !== 'string') {
    errors.push('Instruction must be a string');
    return { isValid: false, errors, sanitized: '' };
  }

  if (instruction.length === 0) {
    errors.push('Instruction cannot be empty');
    return { isValid: false, errors, sanitized: '' };
  }

  if (instruction.length > 10000) {
    errors.push('Instruction exceeds maximum length (10000 characters)');
    return { isValid: false, errors, sanitized: '' };
  }

  // Sanitize
  const sanitized = instruction
    .replace(/\0/g, '')
    .replace(/\s{10,}/g, ' '.repeat(3));

  return { isValid: true, errors: [], sanitized };
}

/**
 * Validate code content
 * @param {string} code - Code content
 * @returns {ValidationResult}
 */
function validateCode(code) {
  const errors = [];

  if (typeof code !== 'string') {
    errors.push('Code must be a string');
    return { isValid: false, errors, sanitized: '' };
  }

  // Empty code is allowed (for new files)
  if (code.length === 0) {
    return { isValid: true, errors: [], sanitized: '' };
  }

  if (code.length > 1000000) { // 1MB limit
    errors.push('Code exceeds maximum size (1MB)');
    return { isValid: false, errors, sanitized: '' };
  }

  // Sanitize - remove null bytes, limit excessive whitespace
  const sanitized = code
    .replace(/\0/g, '');

  return { isValid: true, errors: [], sanitized };
}

/**
 * Validate model configuration
 * @param {Array} models - Array of model IDs
 * @param {Array} availableModels - Available models from LMStudio
 * @returns {ValidationResult}
 */
function validateModels(models, availableModels) {
  const errors = [];

  if (!Array.isArray(models)) {
    errors.push('Models must be an array');
    return { isValid: false, errors, sanitized: [] };
  }

  if (models.length === 0) {
    // Empty array is valid (no models selected)
    return { isValid: true, errors: [], sanitized: [] };
  }

  if (models.length > 4) {
    errors.push('Cannot select more than 4 models');
    return { isValid: false, errors, sanitized: [] };
  }

  // Check all models are available
  const sanitized = [];
  for (const model of models) {
    if (typeof model !== 'string') {
      errors.push('Model ID must be a string');
      continue;
    }

    if (!availableModels.includes(model)) {
      errors.push(`Model "${model}" is not available`);
      continue;
    }

    sanitized.push(model);
  }

  if (errors.length > 0) {
    return { isValid: false, errors, sanitized: [] };
  }

  return { isValid: true, errors: [], sanitized };
}

/**
 * Validate IPC request parameters
 * @param {string} channel - IPC channel name
 * @param {Object} data - Request data
 * @returns {ValidationResult}
 */
function validateIPCRequest(channel, data) {
  const errors = [];

  // Validate channel name
  const validChannels = [
    'generate-code',
    'edit-code',
    'analyze-code',
    'get-models',
    'configure-models',
    'get-settings',
    'save-settings',
    'test-connection',
    'new-project',
    'open-project',
    'save-project',
    'get-project-path',
    'save-file',
    'run-code'
  ];

  if (!validChannels.includes(channel)) {
    errors.push(`Invalid IPC channel: ${channel}`);
  }

  // Validate data structure
  if (data && typeof data !== 'object') {
    errors.push('Request data must be an object');
  }

  // Channel-specific validation
  if (channel === 'generate-code') {
    if (!data.prompt) {
      errors.push('generate-code requires prompt');
    }
  }

  if (channel === 'edit-code') {
    if (!data.code) {
      errors.push('edit-code requires code');
    }
    if (!data.instruction) {
      errors.push('edit-code requires instruction');
    }
  }

  if (channel === 'save-file' || channel === 'run-code') {
    if (!data.filePath) {
      errors.push(`${channel} requires filePath`);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors, sanitized: data };
  }

  return { isValid: true, errors: [], sanitized: data };
}

/**
 * Sanitize HTML content for XSS prevention
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeHTML(html) {
  if (typeof html !== 'string') {
    return '';
  }

  return html
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove dangerous event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: protocol
    .replace(/javascript\s*:/gi, '')
    // Remove data URIs
    .replace(/data\s*:\s*[^,\s]*/gi, '')
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

module.exports = {
  validatePrompt,
  validateFilePath,
  validateProjectPath,
  validateInstruction,
  validateCode,
  validateModels,
  validateIPCRequest,
  sanitizeHTML
};
