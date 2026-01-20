const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

/**
 * Main Process Helper Utilities
 * Shared utilities for file operations, validation, string manipulation, and error handling
 */

// ==================== File Operations ====================

/**
 * Read a file asynchronously
 * @param {string} filePath - Path to the file
 * @param {string} encoding - File encoding (default: 'utf8')
 * @returns {Promise<string>} File content
 */
async function readFileAsync(filePath, encoding = 'utf8') {
  try {
    return await fs.readFile(filePath, encoding);
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error.message}`);
  }
}

/**
 * Write a file asynchronously
 * @param {string} filePath - Path to the file
 * @param {string} content - Content to write
 * @param {string} encoding - File encoding (default: 'utf8')
 * @returns {Promise<void>}
 */
async function writeFileAsync(filePath, content, encoding = 'utf8') {
  try {
    await fs.writeFile(filePath, content, encoding);
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error.message}`);
  }
}

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dirPath - Directory path
 * @returns {Promise<void>}
 */
async function ensureDirAsync(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
    }
  }
}

/**
 * Read a file synchronously (for use in synchronous contexts)
 * @param {string} filePath - Path to the file
 * @param {string} encoding - File encoding (default: 'utf8')
 * @returns {string} File content
 */
function readFileSync(filePath, encoding = 'utf8') {
  try {
    return fsSync.readFileSync(filePath, encoding);
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error.message}`);
  }
}

/**
 * Write a file synchronously (for use in synchronous contexts)
 * @param {string} filePath - Path to the file
 * @param {string} content - Content to write
 * @param {string} encoding - File encoding (default: 'utf8')
 * @returns {void}
 */
function writeFileSync(filePath, content, encoding = 'utf8') {
  try {
    fsSync.writeFileSync(filePath, content, encoding);
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error.message}`);
  }
}

/**
 * Check if a path exists
 * @param {string} filePath - Path to check
 * @returns {boolean} True if path exists
 */
function pathExists(filePath) {
  return fsSync.existsSync(filePath);
}

// ==================== String Utilities ====================

/**
 * Sanitize a file path for security
 * @param {string} filePath - Path to sanitize
 * @returns {string} Sanitized path
 */
function sanitizePath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = filePath.replace(/\0/g, '');

  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\.+/g, '');

  // Normalize path separators
  sanitized = path.normalize(sanitized);

  return sanitized;
}

/**
 * Format a date to a readable string
 * @param {Date|string|number} date - Date to format
 * @param {string} format - Format type ('iso', 'locale', 'time')
 * @returns {string} Formatted date string
 */
function formatDate(date, format = 'locale') {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  switch (format) {
    case 'iso':
      return d.toISOString();
    case 'time':
      return d.toLocaleTimeString();
    case 'locale':
    default:
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }
}

/**
 * Truncate a string to a maximum length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add if truncated (default: '...')
 * @returns {string} Truncated string
 */
function truncateString(str, maxLength = 100, suffix = '...') {
  if (!str || str.length <= maxLength) {
    return str || '';
  }

  return str.substring(0, maxLength - suffix.length) + suffix;
}

// ==================== Array Utilities ====================

/**
 * Split an array into chunks
 * @param {Array} arr - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array<Array>} Array of chunks
 */
function chunk(arr, size) {
  if (!Array.isArray(arr)) {
    return [];
  }

  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }

  return chunks;
}

/**
 * Flatten nested arrays
 * @param {Array} arr - Array to flatten
 * @returns {Array} Flattened array
 */
function flatten(arr) {
  if (!Array.isArray(arr)) {
    return [];
  }

  return arr.flat(Infinity);
}

/**
 * Get unique elements from an array
 * @param {Array} arr - Array to deduplicate
 * @returns {Array} Array with unique elements
 */
function unique(arr) {
  if (!Array.isArray(arr)) {
    return [];
  }

  return [...new Set(arr)];
}

// ==================== Validation Utilities ====================

/**
 * Validate a file path
 * @param {string} filePath - Path to validate
 * @param {string} basePath - Base path to validate against (optional)
 * @returns {Object} { isValid: boolean, sanitized: string, errors: string[] }
 */
function validatePath(filePath, basePath = null) {
  const errors = [];

  if (!filePath || typeof filePath !== 'string') {
    return { isValid: false, sanitized: '', errors: ['Path is required and must be a string'] };
  }

  // Sanitize the path
  const sanitized = sanitizePath(filePath);

  // Check for path traversal
  if (sanitized.includes('..') || sanitized.startsWith('/')) {
    errors.push('Path traversal detected');
  }

  // Check against base path if provided
  if (basePath) {
    const resolvedPath = path.resolve(basePath, sanitized);
    const resolvedBase = path.resolve(basePath);

    if (!resolvedPath.startsWith(resolvedBase)) {
      errors.push('Path is outside base directory');
    }
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}

/**
 * Validate a filename
 * @param {string} filename - Filename to validate
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
function validateFilename(filename) {
  const errors = [];

  if (!filename || typeof filename !== 'string') {
    return { isValid: false, errors: ['Filename is required and must be a string'] };
  }

  // Check length
  if (filename.length > 255) {
    errors.push('Filename is too long (max 255 characters)');
  }

  // Check for invalid characters
  const invalidChars = /[<>:"|?*\\]/g;
  if (invalidChars.test(filename)) {
    errors.push('Filename contains invalid characters');
  }

  // Check for reserved names (Windows)
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  if (reservedNames.test(filename.split('.')[0])) {
    errors.push('Filename is a reserved name');
  }

  return {
    isValid: errors.length === 0,
    filename,
    errors
  };
}

// ==================== Error Handling ====================

/**
 * Wrap a function with error logging
 * @param {Function} fn - Function to wrap
 * @param {string} context - Context description for error logging
 * @returns {Function} Wrapped function
 */
function withErrorLogging(fn, context = 'operation') {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`Error in ${context}:`, error);
      throw error;
    }
  };
}

/**
 * Wrap an async function with error logging
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context description for error logging
 * @returns {Function} Wrapped async function
 */
function asyncErrorLogging(fn, context = 'async operation') {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`Error in ${context}:`, error);
      throw error;
    }
  };
}

// ==================== Async Utilities ====================

/**
 * Promisify a callback-based function
 * @param {Function} fn - Function with callback (last argument)
 * @returns {Function} Promisified function
 */
function promisify(fn) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      fn(...args, (err, ...result) => {
        if (err) return reject(err);
        resolve(...result);
      });
    });
  };
}

/**
 * Delay execution for a specified time
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== Language Detection ====================

/**
 * Detect programming language from code
 * @param {string} code - Code to analyze
 * @returns {string} Detected language
 */
function detectLanguage(code) {
  const patterns = {
    html: /(<!doctype|<html|<head|<body|<div|<script|<style)/i,
    css: /(@media|@import|@keyframes|background:|color:|margin:|padding:)/,
    javascript: /(function|const |let |var |=>|require\(|module\.exports)/,
    python: /(def |import |from |print\(|if __name__)/,
    java: /(public class|import java|@Override|System\.out)/,
    cpp: /(#include|using namespace|std::|int main)/,
    c: /(#include|int main|printf|malloc)/,
    typescript: /(interface |type |: string|: number|export )/
  };

  // Check each pattern
  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(code)) {
      return lang;
    }
  }

  return 'javascript'; // Default
}

/**
 * Get default file extension for a language
 * @param {string} language - Programming language
 * @returns {string} File extension
 */
function getLanguageExtension(language) {
  const extensions = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    html: 'html',
    css: 'css',
    json: 'json',
    markdown: 'md'
  };

  return extensions[language] || 'js';
}

// ==================== File Loading ====================

/**
 * Recursively load all files from a directory
 * @param {string} dir - Directory path
 * @param {string} basePath - Base path for relative paths
 * @param {Object} options - Options { skipHidden, skipNodeModules }
 * @returns {Promise<Object>} Object with file paths as keys and contents as values
 */
async function loadFilesFromDir(dir, basePath = '', options = {}) {
  const {
    skipHidden = true,
    skipNodeModules = true,
    skipGit = true
  } = options;

  const files = {};

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;
      const normalizedPath = relativePath.replace(/\\/g, '/');

      // Skip files/folders based on options
      if (skipHidden && entry.name.startsWith('.')) continue;
      if (skipNodeModules && entry.name === 'node_modules') continue;
      if (skipGit && entry.name === '.git') continue;

      if (entry.isDirectory()) {
        const subFiles = await loadFilesFromDir(fullPath, relativePath, options);
        Object.assign(files, subFiles);
      } else if (entry.isFile()) {
        try {
          const content = await readFileAsync(fullPath);
          files[normalizedPath] = content;
        } catch (error) {
          console.error(`Failed to read file ${fullPath}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }

  return files;
}

// ==================== Exports ====================

module.exports = {
  // File operations
  readFileAsync,
  writeFileAsync,
  ensureDirAsync,
  readFileSync,
  writeFileSync,
  pathExists,
  loadFilesFromDir,

  // String utilities
  sanitizePath,
  formatDate,
  truncateString,

  // Array utilities
  chunk,
  flatten,
  unique,

  // Validation utilities
  validatePath,
  validateFilename,

  // Error handling
  withErrorLogging,
  asyncErrorLogging,

  // Async utilities
  promisify,
  delay,

  // Language detection
  detectLanguage,
  getLanguageExtension
};
