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
  }
});

