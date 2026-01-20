/**
 * Renderer API Layer
 * Centralized API calls to main process with error handling and caching
 */

// ==================== Type Definitions (JSDoc) ====================

/**
 * @typedef {Object} APIResponse
 * @property {boolean} success - Whether the operation succeeded
 * @property {*} data - Response data
 * @property {string} [error] - Error message if failed
 */

/**
 * @typedef {Object} GenerateCodeOptions
 * @property {string} prompt - User's prompt
 * @property {string} [context] - Current code context
 * @property {string} [language] - Target language
 * @property {Object} [existingFiles] - Existing file contents for diff tracking
 */

/**
 * @typedef {Object} EditCodeOptions
 * @property {string} code - Code to edit
 * @property {string} instruction - Edit instruction
 * @property {string} [context] - Additional context
 */

/**
 * @typedef {Object} AnalyzeCodeOptions
 * @property {string} code - Code to analyze
 * @property {string} [language] - Programming language
 * @property {Object} [options] - Additional options
 */

// ==================== API Error Handling ====================

/**
 * Handle API response with error checking
 * @param {Promise<APIResponse>} apiCall - API promise
 * @param {string} operation - Operation name for error messages
 * @returns {Promise<APIResponse>} Validated response
 */
async function handleAPIResponse(apiCall, operation = 'operation') {
  try {
    const response = await apiCall;

    if (!response || typeof response !== 'object') {
      throw new Error(`Invalid response from ${operation}`);
    }

    if (!response.success) {
      throw new Error(response.error || `${operation} failed`);
    }

    return response;
  } catch (error) {
    console.error(`API Error in ${operation}:`, error);
    return {
      success: false,
      error: error.message || `${operation} failed`
    };
  }
}

// ==================== AI Operations ====================

/**
 * Generate code using multi-model deliberation
 * @param {string} prompt - User's request
 * @param {string} [context] - Current code context
 * @param {string} [language] - Target language
 * @param {Object} [existingFiles] - Existing file contents
 * @returns {Promise<APIResponse>}
 */
async function generateCode(prompt, context = '', language = null, existingFiles = {}) {
  return handleAPIResponse(
    window.electronAPI.generateCode(prompt, context, language, existingFiles),
    'generate code'
  );
}

/**
 * Edit existing code using multi-model deliberation
 * @param {string} code - Code to edit
 * @param {string} instruction - Edit instruction
 * @param {string} [context] - Additional context
 * @returns {Promise<APIResponse>}
 */
async function editCode(code, instruction, context = '') {
  return handleAPIResponse(
    window.electronAPI.editCode(code, instruction, context),
    'edit code'
  );
}

/**
 * Analyze code quality
 * @param {string} code - Code to analyze
 * @param {string} [language] - Programming language
 * @returns {Promise<APIResponse>}
 */
async function analyzeCode(code, language = 'javascript') {
  return handleAPIResponse(
    window.electronAPI.analyzeCode(code, language),
    'analyze code'
  );
}

// ==================== File Operations ====================

/**
 * Save a file
 * @param {string} filePath - File path (relative to project)
 * @param {string} content - File content
 * @returns {Promise<APIResponse>}
 */
async function saveFile(filePath, content) {
  return handleAPIResponse(
    window.electronAPI.saveFile(filePath, content),
    'save file'
  );
}

/**
 * Rename a file
 * @param {string} filePath - Current file path
 * @param {string} newPath - New file path
 * @returns {Promise<APIResponse>}
 */
async function renameFile(filePath, newPath) {
  return handleAPIResponse(
    window.electronAPI.renameFile(filePath, newPath),
    'rename file'
  );
}

/**
 * Delete a file or directory
 * @param {string} filePath - File path to delete
 * @returns {Promise<APIResponse>}
 */
async function deleteFile(filePath) {
  return handleAPIResponse(
    window.electronAPI.deleteFile(filePath),
    'delete file'
  );
}

/**
 * Create a folder
 * @param {string} folderName - Folder name
 * @param {string} [parentPath] - Parent path (optional)
 * @returns {Promise<APIResponse>}
 */
async function createFolder(folderName, parentPath) {
  return handleAPIResponse(
    window.electronAPI.createFolder(folderName, parentPath),
    'create folder'
  );
}

/**
 * Create a new file
 * @param {string} fileName - File name
 * @param {string} [parentPath] - Parent path (optional)
 * @returns {Promise<APIResponse>}
 */
async function createFile(fileName, parentPath) {
  return handleAPIResponse(
    window.electronAPI.createFile(fileName, parentPath),
    'create file'
  );
}

/**
 * Get file statistics
 * @param {string} filePath - File path
 * @returns {Promise<APIResponse>}
 */
async function getFileStats(filePath) {
  return handleAPIResponse(
    window.electronAPI.getFileStats(filePath),
    'get file stats'
  );
}

// ==================== Project Operations ====================

/**
 * Create a new project
 * @returns {Promise<APIResponse>}
 */
async function newProject() {
  return handleAPIResponse(
    window.electronAPI.newProject(),
    'new project'
  );
}

/**
 * Open a project
 * @returns {Promise<APIResponse>}
 */
async function openProject() {
  return handleAPIResponse(
    window.electronAPI.openProject(),
    'open project'
  );
}

/**
 * Save a project
 * @param {Object} files - Files object { filePath: content }
 * @returns {Promise<APIResponse>}
 */
async function saveProject(files) {
  return handleAPIResponse(
    window.electronAPI.saveProject(files),
    'save project'
  );
}

/**
 * Get current project path
 * @returns {Promise<APIResponse>}
 */
async function getProjectPath() {
  return handleAPIResponse(
    window.electronAPI.getProjectPath(),
    'get project path'
  );
}

// ==================== Code Execution ====================

/**
 * Run code
 * @param {string} filePath - File path
 * @param {string} language - Programming language
 * @param {string} code - Code to execute
 * @returns {Promise<APIResponse>}
 */
async function runCode(filePath, language, code) {
  return handleAPIResponse(
    window.electronAPI.runCode(filePath, language, code),
    'run code'
  );
}

// ==================== Settings & Configuration ====================

/**
 * Get application settings
 * @returns {Promise<APIResponse>}
 */
async function getSettings() {
  return handleAPIResponse(
    window.electronAPI.getSettings(),
    'get settings'
  );
}

/**
 * Save application settings
 * @param {Object} settings - Settings object
 * @returns {Promise<APIResponse>}
 */
async function saveSettings(settings) {
  return handleAPIResponse(
    window.electronAPI.saveSettings(settings),
    'save settings'
  );
}

/**
 * Test connection to LMStudio
 * @param {string} url - LMStudio URL
 * @returns {Promise<APIResponse>}
 */
async function testConnection(url) {
  return handleAPIResponse(
    window.electronAPI.testConnection(url),
    'test connection'
  );
}

// ==================== Model Management ====================

/**
 * Get available models
 * @returns {Promise<APIResponse>}
 */
async function getModels() {
  return handleAPIResponse(
    window.electronAPI.getModels(),
    'get models'
  );
}

/**
 * Configure which models to use
 * @param {Object} config - Configuration object
 * @returns {Promise<APIResponse>}
 */
async function configureModels(config) {
  return handleAPIResponse(
    window.electronAPI.configureModels(config),
    'configure models'
  );
}

// ==================== Git Operations ====================

/**
 * Get git status
 * @returns {Promise<APIResponse>}
 */
async function gitStatus() {
  return handleAPIResponse(
    window.electronAPI.gitStatus(),
    'git status'
  );
}

/**
 * Commit changes
 * @param {string} message - Commit message
 * @param {Object} [authorInfo] - Author information
 * @returns {Promise<APIResponse>}
 */
async function gitCommit(message, authorInfo) {
  return handleAPIResponse(
    window.electronAPI.gitCommit(message, authorInfo),
    'git commit'
  );
}

/**
 * Push changes to remote
 * @returns {Promise<APIResponse>}
 */
async function gitPush() {
  return handleAPIResponse(
    window.electronAPI.gitPush(),
    'git push'
  );
}

/**
 * Pull changes from remote
 * @returns {Promise<APIResponse>}
 */
async function gitPull() {
  return handleAPIResponse(
    window.electronAPI.gitPull(),
    'git pull'
  );
}

/**
 * Get list of branches
 * @returns {Promise<APIResponse>}
 */
async function gitBranchList() {
  return handleAPIResponse(
    window.electronAPI.gitBranchList(),
    'git branch list'
  );
}

/**
 * Checkout a branch
 * @param {string} branchName - Branch name
 * @returns {Promise<APIResponse>}
 */
async function gitCheckout(branchName) {
  return handleAPIResponse(
    window.electronAPI.gitCheckout(branchName),
    'git checkout'
  );
}

/**
 * Create a new branch
 * @param {string} branchName - Branch name
 * @returns {Promise<APIResponse>}
 */
async function gitCreateBranch(branchName) {
  return handleAPIResponse(
    window.electronAPI.gitCreateBranch(branchName),
    'git create branch'
  );
}

/**
 * Get commit history
 * @param {number} [maxCount] - Maximum number of commits
 * @returns {Promise<APIResponse>}
 */
async function gitHistory(maxCount = 20) {
  return handleAPIResponse(
    window.electronAPI.gitHistory(maxCount),
    'git history'
  );
}

/**
 * Get diff for a file
 * @param {string} filePath - File path
 * @returns {Promise<APIResponse>}
 */
async function gitDiff(filePath) {
  return handleAPIResponse(
    window.electronAPI.gitDiff(filePath),
    'git diff'
  );
}

/**
 * Initialize git repository
 * @returns {Promise<APIResponse>}
 */
async function gitInit() {
  return handleAPIResponse(
    window.electronAPI.gitInit(),
    'git init'
  );
}

/**
 * Check if path is a git repository
 * @returns {Promise<APIResponse>}
 */
async function gitIsRepo() {
  return handleAPIResponse(
    window.electronAPI.gitIsRepo(),
    'git is repo'
  );
}

// ==================== Cache Management ====================

/**
 * Get cache statistics
 * @returns {Promise<APIResponse>}
 */
async function getCacheStats() {
  return handleAPIResponse(
    window.electronAPI.getCacheStats(),
    'get cache stats'
  );
}

/**
 * Clean expired cache entries
 * @returns {Promise<APIResponse>}
 */
async function cleanCache() {
  return handleAPIResponse(
    window.electronAPI.cleanCache(),
    'clean cache'
  );
}

/**
 * Optimize cache
 * @param {number} [keep] - Number of entries to keep
 * @returns {Promise<APIResponse>}
 */
async function optimizeCache(keep) {
  return handleAPIResponse(
    window.electronAPI.optimizeCache(keep),
    'optimize cache'
  );
}

/**
 * Clear cache
 * @param {string} [model] - Specific model to clear (optional)
 * @returns {Promise<APIResponse>}
 */
async function clearCache(model) {
  return handleAPIResponse(
    window.electronAPI.clearCache(model),
    'clear cache'
  );
}

// ==================== Logging ====================

/**
 * Log a message from renderer
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} [context] - Additional context
 * @returns {Promise<APIResponse>}
 */
async function logMessage(level, message, context) {
  return handleAPIResponse(
    window.electronAPI.logMessage(level, message, context),
    'log message'
  );
}

/**
 * Get logger configuration
 * @returns {Promise<APIResponse>}
 */
async function logGetConfig() {
  return handleAPIResponse(
    window.electronAPI.logGetConfig(),
    'get log config'
  );
}

/**
 * Set log level
 * @param {string} level - Log level
 * @returns {Promise<APIResponse>}
 */
async function logSetLevel(level) {
  return handleAPIResponse(
    window.electronAPI.logSetLevel(level),
    'set log level'
  );
}

/**
 * Get list of log files
 * @returns {Promise<APIResponse>}
 */
async function logGetLogs() {
  return handleAPIResponse(
    window.electronAPI.logGetLogs(),
    'get log files'
  );
}

/**
 * View a log file
 * @param {string} filename - Log file name
 * @returns {Promise<APIResponse>}
 */
async function logViewFile(filename) {
  return handleAPIResponse(
    window.electronAPI.logViewFile(filename),
    'view log file'
  );
}

// ==================== Rubric Evaluation ====================

/**
 * Get rubric criteria
 * @returns {Promise<APIResponse>}
 */
async function rubricGetCriteria() {
  return handleAPIResponse(
    window.electronAPI.rubricGetCriteria(),
    'get rubric criteria'
  );
}

/**
 * Set rubric weights
 * @param {Object} weights - Weight configuration
 * @returns {Promise<APIResponse>}
 */
async function rubricSetWeights(weights) {
  return handleAPIResponse(
    window.electronAPI.rubricSetWeights(weights),
    'set rubric weights'
  );
}

/**
 * Get evaluation history
 * @param {number} [limit] - Maximum number of entries
 * @returns {Promise<APIResponse>}
 */
async function rubricGetHistory(limit) {
  return handleAPIResponse(
    window.electronAPI.rubricGetHistory(limit),
    'get rubric history'
  );
}

/**
 * Export rubric configuration
 * @returns {Promise<APIResponse>}
 */
async function rubricExport() {
  return handleAPIResponse(
    window.electronAPI.rubricExport(),
    'export rubric'
  );
}

/**
 * Import rubric configuration
 * @param {Object} config - Configuration object
 * @returns {Promise<APIResponse>}
 */
async function rubricImport(config) {
  return handleAPIResponse(
    window.electronAPI.rubricImport(config),
    'import rubric'
  );
}

/**
 * Evaluate code with rubric
 * @param {string} code - Code to evaluate
 * @param {string} [language] - Programming language
 * @param {Object} [options] - Additional options
 * @returns {Promise<APIResponse>}
 */
async function rubricEvaluate(code, language, options) {
  return handleAPIResponse(
    window.electronAPI.rubricEvaluate(code, language, options),
    'evaluate code'
  );
}

/**
 * Reset rubric weights to defaults
 * @returns {Promise<APIResponse>}
 */
async function rubricResetWeights() {
  return handleAPIResponse(
    window.electronAPI.rubricResetWeights(),
    'reset rubric weights'
  );
}

/**
 * Clear evaluation history
 * @returns {Promise<APIResponse>}
 */
async function rubricClearHistory() {
  return handleAPIResponse(
    window.electronAPI.rubricClearHistory(),
    'clear rubric history'
  );
}

/**
 * Get average scores
 * @returns {Promise<APIResponse>}
 */
async function rubricGetAverages() {
  return handleAPIResponse(
    window.electronAPI.rubricGetAverages(),
    'get rubric averages'
  );
}

/**
 * Get score trend
 * @param {number} [windowSize] - Window size for trend calculation
 * @returns {Promise<APIResponse>}
 */
async function rubricGetTrend(windowSize) {
  return handleAPIResponse(
    window.electronAPI.rubricGetTrend(windowSize),
    'get rubric trend'
  );
}

/**
 * Clear evaluation cache
 * @returns {Promise<APIResponse>}
 */
async function rubricClearCache() {
  return handleAPIResponse(
    window.electronAPI.rubricClearCache(),
    'clear rubric cache'
  );
}

// ==================== LSP (Language Server Protocol) ====================

/**
 * Start LSP server for a language
 * @param {string} language - Programming language
 * @returns {Promise<APIResponse>}
 */
async function lspStart(language) {
  return handleAPIResponse(
    window.electronAPI.lspStart(language),
    'start LSP server'
  );
}

/**
 * Stop LSP server for a language
 * @param {string} language - Programming language
 * @returns {Promise<APIResponse>}
 */
async function lspStop(language) {
  return handleAPIResponse(
    window.electronAPI.lspStop(language),
    'stop LSP server'
  );
}

/**
 * Get diagnostics for a file
 * @param {string} uri - File URI
 * @returns {Promise<APIResponse>}
 */
async function lspDiagnostics(uri) {
  return handleAPIResponse(
    window.electronAPI.lspDiagnostics(uri),
    'get LSP diagnostics'
  );
}

/**
 * Get code completions
 * @param {string} uri - File URI
 * @param {Object} position - Cursor position
 * @returns {Promise<APIResponse>}
 */
async function lspCompletion(uri, position) {
  return handleAPIResponse(
    window.electronAPI.lspCompletion(uri, position),
    'get LSP completions'
  );
}

/**
 * Get hover information
 * @param {string} uri - File URI
 * @param {Object} position - Cursor position
 * @returns {Promise<APIResponse>}
 */
async function lspHover(uri, position) {
  return handleAPIResponse(
    window.electronAPI.lspHover(uri, position),
    'get LSP hover info'
  );
}

/**
 * Go to definition
 * @param {string} uri - File URI
 * @param {Object} position - Cursor position
 * @returns {Promise<APIResponse>}
 */
async function lspDefinition(uri, position) {
  return handleAPIResponse(
    window.electronAPI.lspDefinition(uri, position),
    'go to definition'
  );
}

/**
 * Get LSP server status
 * @param {string} language - Programming language
 * @returns {Promise<APIResponse>}
 */
async function lspGetStatus(language) {
  return handleAPIResponse(
    window.electronAPI.lspGetStatus(language),
    'get LSP status'
  );
}

/**
 * Get running LSP servers
 * @returns {Promise<APIResponse>}
 */
async function lspGetRunningServers() {
  return handleAPIResponse(
    window.electronAPI.lspGetRunningServers(),
    'get running LSP servers'
  );
}

// ==================== Terminal ====================

/**
 * Create a new terminal
 * @param {string} [cwd] - Working directory
 * @returns {Promise<APIResponse>}
 */
async function terminalCreate(cwd) {
  return handleAPIResponse(
    window.electronAPI.terminalCreate(cwd),
    'create terminal'
  );
}

/**
 * Send input to terminal
 * @param {string} terminalId - Terminal ID
 * @param {string} data - Input data
 * @returns {Promise<APIResponse>}
 */
async function terminalInput(terminalId, data) {
  return handleAPIResponse(
    window.electronAPI.terminalInput(terminalId, data),
    'terminal input'
  );
}

/**
 * Resize terminal
 * @param {string} terminalId - Terminal ID
 * @param {number} cols - Number of columns
 * @param {number} rows - Number of rows
 * @returns {Promise<APIResponse>}
 */
async function terminalResize(terminalId, cols, rows) {
  return handleAPIResponse(
    window.electronAPI.terminalResize(terminalId, cols, rows),
    'resize terminal'
  );
}

/**
 * Kill a terminal
 * @param {string} terminalId - Terminal ID
 * @returns {Promise<APIResponse>}
 */
async function terminalKill(terminalId) {
  return handleAPIResponse(
    window.electronAPI.terminalKill(terminalId),
    'kill terminal'
  );
}

/**
 * List all terminals
 * @returns {Promise<APIResponse>}
 */
async function terminalList() {
  return handleAPIResponse(
    window.electronAPI.terminalList(),
    'list terminals'
  );
}

// ==================== Window Operations ====================

/**
 * Allow window to close
 */
function allowWindowClose() {
  if (window.electronAPI && window.electronAPI.allowWindowClose) {
    window.electronAPI.allowWindowClose();
  }
}

/**
 * Cancel window close
 */
function cancelWindowClose() {
  if (window.electronAPI && window.electronAPI.cancelWindowClose) {
    window.electronAPI.cancelWindowClose();
  }
}

/**
 * Show save as dialog
 * @returns {Promise<APIResponse>}
 */
async function saveAsDialog() {
  return handleAPIResponse(
    window.electronAPI.saveAsDialog(),
    'save as dialog'
  );
}

// ==================== Recent Files ====================

/**
 * Get recent files
 * @returns {Promise<APIResponse>}
 */
async function getRecentFiles() {
  return handleAPIResponse(
    window.electronAPI.getRecentFiles(),
    'get recent files'
  );
}

/**
 * Save a file to recent files
 * @param {string} filePath - File path
 * @returns {Promise<APIResponse>}
 */
async function saveRecentFile(filePath) {
  return handleAPIResponse(
    window.electronAPI.saveRecentFile(filePath),
    'save recent file'
  );
}

// ==================== Event Listeners ====================

/**
 * Register a listener for deliberation updates
 * @param {Function} callback - Callback function
 */
function onDeliberationUpdate(callback) {
  if (window.electronAPI && window.electronAPI.onDeliberationUpdate) {
    window.electronAPI.onDeliberationUpdate(callback);
  }
}

/**
 * Remove deliberation update listener
 */
function removeDeliberationListener() {
  if (window.electronAPI && window.electronAPI.removeDeliberationListener) {
    window.electronAPI.removeDeliberationListener();
  }
}

/**
 * Register listener for unsaved changes check
 * @param {Function} callback - Callback function
 */
function onUnsavedChangesCheck(callback) {
  if (window.electronAPI && window.electronAPI.onUnsavedChangesCheck) {
    window.electronAPI.onUnsavedChangesCheck(callback);
  }
}

/**
 * Remove unsaved changes check listener
 */
function removeUnsavedChangesListener() {
  if (window.electronAPI && window.electronAPI.removeUnsavedChangesListener) {
    window.electronAPI.removeUnsavedChangesListener();
  }
}

/**
 * Register listener for terminal data
 * @param {Function} callback - Callback function
 */
function onTerminalData(callback) {
  if (window.electronAPI && window.electronAPI.onTerminalData) {
    window.electronAPI.onTerminalData(callback);
  }
}

/**
 * Register listener for terminal close
 * @param {Function} callback - Callback function
 */
function onTerminalClose(callback) {
  if (window.electronAPI && window.electronAPI.onTerminalClose) {
    window.electronAPI.onTerminalClose(callback);
  }
}

/**
 * Remove all terminal listeners
 */
function removeTerminalListeners() {
  if (window.electronAPI && window.electronAPI.removeTerminalListeners) {
    window.electronAPI.removeTerminalListeners();
  }
}

// ==================== Exports ====================

export default {
  // AI Operations
  generateCode,
  editCode,
  analyzeCode,

  // File Operations
  saveFile,
  renameFile,
  deleteFile,
  createFolder,
  createFile,
  getFileStats,

  // Project Operations
  newProject,
  openProject,
  saveProject,
  getProjectPath,

  // Code Execution
  runCode,

  // Settings & Configuration
  getSettings,
  saveSettings,
  testConnection,

  // Model Management
  getModels,
  configureModels,

  // Git Operations
  gitStatus,
  gitCommit,
  gitPush,
  gitPull,
  gitBranchList,
  gitCheckout,
  gitCreateBranch,
  gitHistory,
  gitDiff,
  gitInit,
  gitIsRepo,

  // Cache Management
  getCacheStats,
  cleanCache,
  optimizeCache,
  clearCache,

  // Logging
  logMessage,
  logGetConfig,
  logSetLevel,
  logGetLogs,
  logViewFile,

  // Rubric Evaluation
  rubricGetCriteria,
  rubricSetWeights,
  rubricGetHistory,
  rubricExport,
  rubricImport,
  rubricEvaluate,
  rubricResetWeights,
  rubricClearHistory,
  rubricGetAverages,
  rubricGetTrend,
  rubricClearCache,

  // LSP
  lspStart,
  lspStop,
  lspDiagnostics,
  lspCompletion,
  lspHover,
  lspDefinition,
  lspGetStatus,
  lspGetRunningServers,

  // Terminal
  terminalCreate,
  terminalInput,
  terminalResize,
  terminalKill,
  terminalList,

  // Window Operations
  allowWindowClose,
  cancelWindowClose,
  saveAsDialog,

  // Recent Files
  getRecentFiles,
  saveRecentFile,

  // Event Listeners
  onDeliberationUpdate,
  removeDeliberationListener,
  onUnsavedChangesCheck,
  removeUnsavedChangesListener,
  onTerminalData,
  onTerminalClose,
  removeTerminalListeners
};
