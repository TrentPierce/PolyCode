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
  
  // Listen for real-time deliberation updates
  onDeliberationUpdate: (callback) => {
    ipcRenderer.on('deliberation-update', (event, message) => callback(message));
  },
  
  // Remove deliberation update listener
  removeDeliberationListener: () => {
    ipcRenderer.removeAllListeners('deliberation-update');
  }
});

