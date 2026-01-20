const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { PolyCouncilOrchestrator } = require('./core/orchestrator');
const { LMStudioClient } = require('./core/lmstudio-client');
const { SettingsManager } = require('./core/settings');
const {
  validatePrompt,
  validateFilePath,
  validateProjectPath,
  validateInstruction,
  validateCode,
  validateModels,
  validateIPCRequest
} = require('./core/validation');
const { executeInSandbox, validateCodeForExecution } = require('./core/sandbox');
const {
  setupGlobalHandlers,
  handleError,
  getUserFriendlyMessage
} = require('./core/error-handler');
const {
  createRetryFunction,
  recover
} = require('./core/recovery');
const { updateCacheConfig } = require('./core/cache');

let mainWindow;
let orchestrator;
let settingsManager;
let projectPath = null; // Current project folder path

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../../assets/icon.png')
  });

  // Load the React app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Setup global error handlers first
  setupGlobalHandlers();

  // Initialize settings manager
  settingsManager = new SettingsManager();
  const settings = settingsManager.getAllSettings();

  // Create application menu
  createMenu();

  createWindow();

  // Initialize PolyCouncil orchestrator with settings
  orchestrator = new PolyCouncilOrchestrator(settings.lmstudioUrl);
  try {
    // Pass selected models from settings to orchestrator
    const selectedModels = settings.selectedModels || [];
    await orchestrator.initialize(selectedModels);
    
    // If models were selected, configure them
    if (selectedModels.length > 0) {
      await orchestrator.configureModels({ models: selectedModels });
    }
    
    console.log('PolyCouncil orchestrator initialized successfully');
  } catch (error) {
    console.error('Failed to initialize orchestrator:', error);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for AI operations
ipcMain.handle('generate-code', async (event, { prompt, context, language, existingFiles }) => {
  try {
    // Get cache settings
    const cacheSettings = settingsManager.getSetting('cacheEnabled') !== undefined
      ? {
          enabled: settingsManager.getSetting('cacheEnabled'),
          maxSize: settingsManager.getSetting('cacheMaxSize') || 100,
          ttl: (settingsManager.getSetting('cacheTTL') || 60) * 60 * 1000
        }
      : { enabled: true, maxSize: 100, ttl: 3600000 };

    // Validate inputs
    const promptValidation = validatePrompt(prompt);
    if (!promptValidation.isValid) {
      const errorDetails = await handleError(new Error(promptValidation.errors.join(', ')), 'generate-code validation');
      return { success: false, error: getUserFriendlyMessage(errorDetails) };
    }

    const contextValidation = validateCode(context || '');
    if (!contextValidation.isValid) {
      const errorDetails = await handleError(new Error(contextValidation.errors.join(', ')), 'generate-code validation');
      return { success: false, error: getUserFriendlyMessage(errorDetails) };
    }

    // Create progress callback to send real-time updates
    const onProgress = (message) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deliberation-update', message);
      }
    };

    // Use retry function for generation with cache settings
    const generateWithRetry = createRetryFunction(
      async () => {
        const result = await orchestrator.generateCode(
          promptValidation.sanitized,
          contextValidation.sanitized,
          null,
          onProgress,
          existingFiles || {},
          cacheSettings
        );
        return { success: true, data: result };
      },
      {
        maxAttempts: 2, // Retry once on failure
        initialDelay: 2000,
        shouldRetry: (error) => {
          // Retry on network or temporary errors
          return error.message.includes('timeout') ||
                 error.message.includes('network') ||
                 error.message.includes('ECONNREFUSED');
        }
      }
    );

    const result = await generateWithRetry();
    return result;
  } catch (error) {
    const errorDetails = await handleError(error, 'generate-code');
    return { success: false, error: getUserFriendlyMessage(errorDetails) };
  }
});

ipcMain.handle('edit-code', async (event, { code, instruction, context }) => {
  try {
    // Validate inputs
    const codeValidation = validateCode(code);
    if (!codeValidation.isValid) {
      return { success: false, error: `Invalid code: ${codeValidation.errors.join(', ')}` };
    }

    const instructionValidation = validateInstruction(instruction);
    if (!instructionValidation.isValid) {
      return { success: false, error: `Invalid instruction: ${instructionValidation.errors.join(', ')}` };
    }

    const contextValidation = validateCode(context || '');
    if (!contextValidation.isValid) {
      return { success: false, error: `Invalid context: ${contextValidation.errors.join(', ')}` };
    }

    // Create progress callback to send real-time updates
    const onProgress = (message) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deliberation-update', message);
      }
    };

    const result = await orchestrator.editCode(
      codeValidation.sanitized,
      instructionValidation.sanitized,
      contextValidation.sanitized,
      onProgress
    );
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('analyze-code', async (event, { code, language }) => {
  try {
    const result = await orchestrator.analyzeCode(code, language);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-models', async () => {
  try {
    const models = await orchestrator.getAvailableModels();
    return { success: true, data: models };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

  ipcMain.handle('configure-models', async (event, config) => {
    try {
      // Validate models
      const availableModels = await orchestrator.getAvailableModels();
      const validation = validateModels(config.models || [], availableModels);

      if (!validation.isValid) {
        return { success: false, error: `Invalid models: ${validation.errors.join(', ')}` };
      }

      await orchestrator.configureModels({
        ...config,
        models: validation.sanitized
      });
      
      // Update cache configuration if provided
      if (config.cacheEnabled !== undefined) {
        updateCacheConfig({
          maxSize: config.cacheMaxSize || 100,
          ttl: (config.cacheTTL || 60) * 60 * 1000 // Convert minutes to milliseconds
        });
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Cache management IPC handlers
  ipcMain.handle('get-cache-stats', async () => {
    try {
      const { getCache } = require('./core/cache');
      const cache = getCache();
      const stats = cache.getStats();
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('clean-cache', async () => {
    try {
      const { getCache } = require('./core/cache');
      const cache = getCache();
      const cleaned = cache.cleanExpired();
      return { success: true, data: { cleaned } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('optimize-cache', async (event, keep) => {
    try {
      const { getCache } = require('./core/cache');
      const cache = getCache();
      const removed = cache.optimize(keep || 50);
      return { success: true, data: { removed } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('clear-cache', async (event, model = null) => {
    try {
      const { getCache } = require('./core/cache');
      const cache = getCache();
      const cleared = model ? cache.evictModel(model) : cache.clear();
      return { success: true, data: { cleared } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

// Settings IPC Handlers
ipcMain.handle('get-settings', async () => {
  try {
    const settings = settingsManager.getAllSettings();
    return { success: true, data: settings };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-settings', async (event, newSettings) => {
  try {
    const result = settingsManager.saveSettings(newSettings);
    if (result.success) {
      // Update orchestrator with new URL if changed
      if (newSettings.lmstudioUrl && newSettings.lmstudioUrl !== settingsManager.getSetting('lmstudioUrl')) {
        const updateResult = await orchestrator.updateBaseURL(newSettings.lmstudioUrl);
        if (!updateResult.success) {
          return { success: false, error: `Settings saved but connection failed: ${updateResult.error}` };
        }
        // Re-initialize with new URL and selected models
        const selectedModels = newSettings.selectedModels || settingsManager.getSetting('selectedModels') || [];
        await orchestrator.initialize(selectedModels);
        if (selectedModels.length > 0) {
          await orchestrator.configureModels({ models: selectedModels });
        }
      } else {
        // Update selected models if changed (URL unchanged)
        if (newSettings.selectedModels !== undefined) {
          if (newSettings.selectedModels.length > 0) {
            await orchestrator.configureModels({ models: newSettings.selectedModels });
          } else {
            // Clear models if empty array
            await orchestrator.configureModels({ models: [] });
          }
        }
      }
      return { success: true };
    }
    return { success: false, error: 'Failed to save settings' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('test-connection', async (event, url) => {
  try {
    const testClient = new LMStudioClient(url);
    const connection = await testClient.checkConnection();
    return { success: true, connected: connection.connected, error: connection.error };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Project Management IPC Handlers
ipcMain.handle('new-project', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select or Create Project Folder'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      projectPath = result.filePaths[0];
      // Load any existing files from the project folder
      const files = {};
      if (fs.existsSync(projectPath)) {
        const loadFiles = (dir, basePath = '') => {
          try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            entries.forEach(entry => {
              const fullPath = path.join(dir, entry.name);
              const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
              if (entry.isDirectory()) {
                loadFiles(fullPath, relativePath);
              } else if (entry.isFile()) {
                try {
                  const content = fs.readFileSync(fullPath, 'utf8');
                  files[relativePath] = content;
                } catch (err) {
                  console.error(`Failed to read file ${fullPath}:`, err);
                }
              }
            });
          } catch (err) {
            console.error(`Failed to read directory ${dir}:`, err);
          }
        };
        loadFiles(projectPath);
      }
      return { success: true, path: projectPath, files };
    }
    return { success: false, cancelled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-project', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Open Project Folder',
      defaultPath: os.homedir(),
      // Don't use filters - show all files and folders
      // The openDirectory property allows selecting folders but still shows files
    });

    if (!result.canceled && result.filePaths.length > 0) {
      projectPath = result.filePaths[0];
      // Load all files from the project folder
      const files = {};
      const loadFiles = (dir, basePath = '') => {
        try {
          if (!fs.existsSync(dir)) {
            console.warn(`Directory does not exist: ${dir}`);
            return;
          }
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          entries.forEach(entry => {
            const fullPath = path.join(dir, entry.name);
            // Normalize path separators to forward slashes for consistency
            const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
            const normalizedPath = relativePath.replace(/\\/g, '/');
            
            // Skip hidden files and common ignore patterns
            if (entry.name.startsWith('.') || 
                entry.name === 'node_modules' || 
                entry.name === '.git') {
              return;
            }
            
            if (entry.isDirectory()) {
              loadFiles(fullPath, relativePath);
            } else if (entry.isFile()) {
              try {
                const content = fs.readFileSync(fullPath, 'utf8');
                files[normalizedPath] = content;
                console.log(`Loaded file: ${normalizedPath}`);
              } catch (err) {
                console.error(`Failed to read file ${fullPath}:`, err);
              }
            }
          });
        } catch (err) {
          console.error(`Error reading directory ${dir}:`, err);
        }
      };
      loadFiles(projectPath);
      console.log(`Loaded ${Object.keys(files).length} files from ${projectPath}`);
      return { success: true, path: projectPath, files };
    }
    return { success: false, cancelled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-project', async (event, files) => {
  try {
    if (!projectPath) {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Project Folder to Save'
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, cancelled: true };
      }
      // Validate project path
      const pathValidation = validateProjectPath(result.filePaths[0]);
      if (!pathValidation.isValid) {
        return { success: false, error: `Invalid project path: ${pathValidation.errors.join(', ')}` };
      }
      projectPath = pathValidation.sanitized;
    }

    // Save all files to the project folder with validation
    for (const [filePath, content] of Object.entries(files)) {
      // Validate file path
      const pathValidation = validateFilePath(filePath, projectPath);
      if (!pathValidation.isValid) {
        console.warn(`Skipping invalid file path: ${filePath}`);
        continue;
      }

      // Validate code content
      const codeValidation = validateCode(content);
      if (!codeValidation.isValid) {
        console.warn(`Skipping invalid code in: ${filePath}`);
        continue;
      }

      const fullPath = path.join(projectPath, pathValidation.sanitized);
      const dir = path.dirname(fullPath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(fullPath, codeValidation.sanitized, 'utf8');
    }

    return { success: true, path: projectPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-project-path', async () => {
  return { success: true, path: projectPath };
});

ipcMain.handle('save-file', async (event, filePath, content) => {
  try {
    if (!projectPath) {
      return { success: false, error: 'No project folder selected' };
    }

    // Validate file path
    const pathValidation = validateFilePath(filePath, projectPath);
    if (!pathValidation.isValid) {
      return { success: false, error: `Invalid file path: ${pathValidation.errors.join(', ')}` };
    }

    // Validate code content
    const codeValidation = validateCode(content);
    if (!codeValidation.isValid) {
      return { success: false, error: `Invalid code: ${codeValidation.errors.join(', ')}` };
    }

    const fullPath = path.join(projectPath, pathValidation.sanitized);
    const dir = path.dirname(fullPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(fullPath, codeValidation.sanitized, 'utf8');
    return { success: true, path: fullPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('run-code', async (event, filePath, language, code) => {
  try {
    if (!projectPath) {
      return { success: false, error: 'No project folder selected' };
    }

    if (!filePath || !filePath.trim()) {
      return { success: false, error: 'No file specified to run' };
    }

    // Validate file path
    const pathValidation = validateFilePath(filePath, projectPath);
    if (!pathValidation.isValid) {
      return { success: false, error: `Invalid file path: ${pathValidation.errors.join(', ')}` };
    }

    // Validate code content
    const codeValidation = validateCode(code);
    if (!codeValidation.isValid) {
      return { success: false, error: `Invalid code: ${codeValidation.errors.join(', ')}` };
    }

    // Validate code for dangerous patterns
    const codeSafetyCheck = validateCodeForExecution(codeValidation.sanitized, language);
    if (!codeSafetyCheck.isValid) {
      return {
        success: false,
        error: `Code contains potentially dangerous patterns: ${codeSafetyCheck.warnings.join(', ')}`
      };
    }

    // Normalize the file path
    let fullPath;
    if (path.isAbsolute(filePath)) {
      fullPath = path.join(process.cwd(), filePath);
    } else {
      fullPath = path.join(projectPath, pathValidation.sanitized);
    }
    fullPath = path.normalize(fullPath);

    // Ensure the file exists
    if (!fs.existsSync(fullPath)) {
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, codeValidation.sanitized, 'utf8');
    } else {
      fs.writeFileSync(fullPath, codeValidation.sanitized, 'utf8');
    }

    // Verify it's actually a file, not a directory
    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      return { success: false, error: `Path is a directory, not a file: ${fullPath}` };
    }

    // Execute in sandbox
    const result = await executeInSandbox(
      codeValidation.sanitized,
      language,
      {
        timeout: 30000,
        maxMemory: 512,
        allowNetwork: false,
        allowFS: true,
        workDir: path.dirname(fullPath)
      },
      fullPath
    );

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }

    // Debug logging
    console.log('Running code:', {
      filePath,
      projectPath,
      fullPath,
      language,
      fileExists: fs.existsSync(fullPath),
      isFile: stats.isFile()
    });

    let command;
    let args = [];
    
    // Determine command based on language
    switch (language) {
      case 'javascript':
        command = 'node';
        // Use normalized absolute path
        args = [fullPath];
        break;
      case 'typescript':
        command = 'ts-node';
        args = [fullPath];
        break;
      case 'python':
        // On Windows, ensure we use the full normalized path
        command = 'python';
        // Use the absolute path, properly normalized
        args = [fullPath];
        break;
      case 'java': {
        // Java requires compilation first
        const className = path.basename(filePath, '.java');
        const classPath = path.dirname(fullPath);
        const isWindows = process.platform === 'win32';
        const javaCompile = spawn('javac', [fullPath], { 
          cwd: classPath,
          shell: isWindows ? false : true
        });
        await new Promise((resolve, reject) => {
          javaCompile.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error('Compilation failed'));
            }
          });
        });
        command = 'java';
        args = ['-cp', classPath, className];
        break;
      }
      case 'cpp':
      case 'c': {
        // C/C++ requires compilation
        const ext = language === 'cpp' ? '.cpp' : '.c';
        const outputName = path.basename(filePath, ext);
        const outputPath = path.join(path.dirname(fullPath), outputName);
        const compiler = language === 'cpp' ? 'g++' : 'gcc';
        const isWindows = process.platform === 'win32';
        const cppCompile = spawn(compiler, [fullPath, '-o', outputPath], {
          shell: isWindows ? false : true
        });
        await new Promise((resolve, reject) => {
          cppCompile.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error('Compilation failed'));
            }
          });
        });
        command = outputPath;
        args = [];
        break;
      }
      default:
        return { success: false, error: `Language ${language} is not supported for execution` };
    }
});


// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory', 'createDirectory'],
              title: 'Select or Create Project Folder'
            });
            if (!result.canceled && result.filePaths.length > 0) {
              projectPath = result.filePaths[0];
              mainWindow.webContents.send('project-opened', { path: projectPath });
            }
          }
        },
        {
          label: 'Open Project',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory'],
              title: 'Open Project Folder'
            });
            if (!result.canceled && result.filePaths.length > 0) {
              projectPath = result.filePaths[0];
              mainWindow.webContents.send('project-opened', { path: projectPath });
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('save-project-request');
          }
        },
        { type: 'separator' },
        {
          role: 'quit'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About PolyCode IDE',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About PolyCode IDE',
              message: 'PolyCode IDE',
              detail: 'AI-Powered IDE with Multi-Model Deliberation\nVersion 1.0.0'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

