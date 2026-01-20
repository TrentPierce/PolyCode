const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  generateCode: (prompt, context, language, existingFiles) => 
    ipcRenderer.invoke('generate-code', { prompt, context, language, existingFiles }),
  
  editCode: (code, instruction, context) => 
    ipcRenderer.invoke('edit-code', { code, instruction, context }),
  
  analyzeCode: (code, language) => 
    ipcRenderer.invoke('analyze-code', { code, language }),
  
  getModels: () => 
    ipcRenderer.invoke('get-models'),
  
  configureModels: (config) => 
    ipcRenderer.invoke('configure-models', config),
  
  getSettings: () => 
    ipcRenderer.invoke('get-settings'),
  
  saveSettings: (settings) => 
    ipcRenderer.invoke('save-settings', settings),
  
  testConnection: (url) => 
    ipcRenderer.invoke('test-connection', url),
  
  newProject: () => 
    ipcRenderer.invoke('new-project'),
  
  openProject: () => 
    ipcRenderer.invoke('open-project'),
  
  saveProject: (files) => 
    ipcRenderer.invoke('save-project', files),
  
  getProjectPath: () => 
    ipcRenderer.invoke('get-project-path'),
  
  saveFile: (filePath, content) =>
    ipcRenderer.invoke('save-file', filePath, content),

  runCode: (filePath, language, code) =>
    ipcRenderer.invoke('run-code', filePath, language, code),

  // File operation IPC functions
  renameFile: (filePath, newPath) =>
    ipcRenderer.invoke('rename-file', filePath, newPath),

  deleteFile: (filePath) =>
    ipcRenderer.invoke('delete-file', filePath),

  createFolder: (folderName, parentPath) =>
    ipcRenderer.invoke('create-folder', folderName, parentPath),

  createFile: (fileName, parentPath) =>
    ipcRenderer.invoke('create-file', fileName, parentPath),

  getFileStats: (filePath) =>
    ipcRenderer.invoke('get-file-stats', filePath),

  // Window close and save confirmation IPC functions
  saveAsDialog: () =>
    ipcRenderer.invoke('save-as-dialog'),

  getRecentFiles: () =>
    ipcRenderer.invoke('get-recent-files'),

  saveRecentFile: (filePath) =>
    ipcRenderer.invoke('save-recent-file', filePath),

  allowWindowClose: () =>
    ipcRenderer.send('allow-window-close'),

  cancelWindowClose: () =>
    ipcRenderer.send('cancel-window-close'),

  onUnsavedChangesCheck: (callback) => {
    ipcRenderer.on('check-unsaved-changes', callback);
  },

  // Cache management IPC functions
  getCacheStats: () =>
    ipcRenderer.invoke('get-cache-stats'),

  cleanCache: () =>
    ipcRenderer.invoke('clean-cache'),

  optimizeCache: (keep) =>
    ipcRenderer.invoke('optimize-cache', keep),

  clearCache: (model = null) =>
    ipcRenderer.invoke('clear-cache', model),

  // Git integration IPC functions
  gitStatus: () =>
    ipcRenderer.invoke('git-status'),

  gitCommit: (message, authorInfo) =>
    ipcRenderer.invoke('git-commit', message, authorInfo),

  gitPush: () =>
    ipcRenderer.invoke('git-push'),

  gitPull: () =>
    ipcRenderer.invoke('git-pull'),

  gitBranchList: () =>
    ipcRenderer.invoke('git-branch-list'),

  gitCheckout: (branchName) =>
    ipcRenderer.invoke('git-checkout', branchName),

  gitCreateBranch: (branchName) =>
    ipcRenderer.invoke('git-create-branch', branchName),

  gitHistory: (maxCount = 20) =>
    ipcRenderer.invoke('git-history', maxCount),

  gitDiff: (filePath) =>
    ipcRenderer.invoke('git-diff', filePath),

  gitInit: () =>
    ipcRenderer.invoke('git-init'),

  gitIsRepo: () =>
    ipcRenderer.invoke('git-is-repo'),

  // Listen for real-time deliberation updates
  onDeliberationUpdate: (callback) => {
    ipcRenderer.on('deliberation-update', (event, message) => callback(message));
  },

  // Remove deliberation update listener
  removeDeliberationListener: () => {
    ipcRenderer.removeAllListeners('deliberation-update');
  },

  // Remove unsaved changes check listener
  removeUnsavedChangesListener: () => {
    ipcRenderer.removeAllListeners('check-unsaved-changes');
  },

  // Terminal IPC functions
  terminalCreate: (cwd = null) =>
    ipcRenderer.invoke('terminal-create', cwd),

  terminalInput: (terminalId, data) =>
    ipcRenderer.invoke('terminal-input', terminalId, data),

  terminalResize: (terminalId, cols, rows) =>
    ipcRenderer.invoke('terminal-resize', terminalId, cols, rows),

  terminalKill: (terminalId) =>
    ipcRenderer.invoke('terminal-kill', terminalId),

  terminalList: () =>
    ipcRenderer.invoke('terminal-list'),

  onTerminalData: (callback) => {
    ipcRenderer.on('terminal-data', (event, message) => callback(event, message));
  },

  onTerminalClose: (callback) => {
    ipcRenderer.on('terminal-exit', (event, message) => callback(event, message));
  },

  removeTerminalListeners: () => {
    ipcRenderer.removeAllListeners('terminal-data');
    ipcRenderer.removeAllListeners('terminal-exit');
  },

  // LSP IPC functions
  lspStart: (language) =>
    ipcRenderer.invoke('lsp-start', language),

  lspStop: (language) =>
    ipcRenderer.invoke('lsp-stop', language),

  lspDiagnostics: (uri) =>
    ipcRenderer.invoke('lsp-diagnostics', uri),

  lspCompletion: (uri, position) =>
    ipcRenderer.invoke('lsp-completion', uri, position),

  lspHover: (uri, position) =>
    ipcRenderer.invoke('lsp-hover', uri, position),

  lspDefinition: (uri, position) =>
    ipcRenderer.invoke('lsp-definition', uri, position),

  lspGetStatus: (language) =>
    ipcRenderer.invoke('lsp-get-status', language),

  lspGetRunningServers: () =>
    ipcRenderer.invoke('lsp-get-running-servers'),

  // Logging IPC functions
  logMessage: (level, message, context) =>
    ipcRenderer.invoke('log-message', level, message, context),

  logGetConfig: () =>
    ipcRenderer.invoke('log-get-config'),

  logSetLevel: (level) =>
    ipcRenderer.invoke('log-set-level', level),

  logGetLogs: () =>
    ipcRenderer.invoke('log-get-logs'),

  logViewFile: (filename) =>
    ipcRenderer.invoke('log-view-file', filename),

  getNodeEnv: () => process.env.NODE_ENV,

  // Rubric evaluation IPC functions
  rubricGetCriteria: () =>
    ipcRenderer.invoke('rubric-get-criteria'),

  rubricSetWeights: (weights) =>
    ipcRenderer.invoke('rubric-set-weights', weights),

  rubricGetHistory: (limit) =>
    ipcRenderer.invoke('rubric-get-history', limit),

  rubricExport: () =>
    ipcRenderer.invoke('rubric-export'),

  rubricImport: (config) =>
    ipcRenderer.invoke('rubric-import', config),

  rubricEvaluate: (code, language, options) =>
    ipcRenderer.invoke('rubric-evaluate', code, language, options),

  rubricResetWeights: () =>
    ipcRenderer.invoke('rubric-reset-weights'),

  rubricClearHistory: () =>
    ipcRenderer.invoke('rubric-clear-history'),

  rubricGetAverages: () =>
    ipcRenderer.invoke('rubric-get-averages'),

  rubricGetTrend: (windowSize) =>
    ipcRenderer.invoke('rubric-get-trend', windowSize),

  rubricClearCache: () =>
    ipcRenderer.invoke('rubric-clear-cache'),

  // Debug IPC functions
  debugStart: (filePath, language) =>
    ipcRenderer.invoke('debug-start', filePath, language),

  debugStop: (sessionId) =>
    ipcRenderer.invoke('debug-stop', sessionId),

  debugPause: (sessionId) =>
    ipcRenderer.invoke('debug-pause', sessionId),

  debugResume: (sessionId) =>
    ipcRenderer.invoke('debug-resume', sessionId),

  debugStepOver: (sessionId) =>
    ipcRenderer.invoke('debug-step-over', sessionId),

  debugStepInto: (sessionId) =>
    ipcRenderer.invoke('debug-step-into', sessionId),

  debugStepOut: (sessionId) =>
    ipcRenderer.invoke('debug-step-out', sessionId),

  debugContinue: (sessionId) =>
    ipcRenderer.invoke('debug-continue', sessionId),

  debugSetBreakpoint: (sessionId, uri, line, condition) =>
    ipcRenderer.invoke('debug-set-breakpoint', sessionId, uri, line, condition),

  debugRemoveBreakpoint: (sessionId, uri, line) =>
    ipcRenderer.invoke('debug-remove-breakpoint', sessionId, uri, line),

  debugClearBreakpoints: (sessionId, uri) =>
    ipcRenderer.invoke('debug-clear-breakpoints', sessionId, uri),

  debugGetVariables: (sessionId, uri) =>
    ipcRenderer.invoke('debug-get-variables', sessionId, uri),

  debugGetCallstack: (sessionId) =>
    ipcRenderer.invoke('debug-get-callstack', sessionId),

  debugGetBreakpoints: (uri) =>
    ipcRenderer.invoke('debug-get-breakpoints', uri),

  debugAddWatch: (sessionId, expression) =>
    ipcRenderer.invoke('debug-add-watch', sessionId, expression),

  debugRemoveWatch: (sessionId, watchId) =>
    ipcRenderer.invoke('debug-remove-watch', sessionId, watchId),

  debugGetSession: (sessionId) =>
    ipcRenderer.invoke('debug-get-session', sessionId),

  debugGetSessions: () =>
    ipcRenderer.invoke('debug-get-sessions'),

  // Debug event listeners
  onDebugSessionStarted: (callback) => {
    ipcRenderer.on('debug-session-started', (event, data) => callback(data));
  },

  onDebugSessionStopped: (callback) => {
    ipcRenderer.on('debug-session-stopped', (event, data) => callback(data));
  },

  onDebugStepCompleted: (callback) => {
    ipcRenderer.on('debug-step-completed', (event, data) => callback(data));
  },

  onDebugBreakpointSet: (callback) => {
    ipcRenderer.on('debug-breakpoint-set', (event, data) => callback(data));
  },

  onDebugBreakpointRemoved: (callback) => {
    ipcRenderer.on('debug-breakpoint-removed', (event, data) => callback(data));
  },

  removeDebugListeners: () => {
    ipcRenderer.removeAllListeners('debug-session-started');
    ipcRenderer.removeAllListeners('debug-session-stopped');
    ipcRenderer.removeAllListeners('debug-step-completed');
    ipcRenderer.removeAllListeners('debug-breakpoint-set');
    ipcRenderer.removeAllListeners('debug-breakpoint-removed');
  }
});

