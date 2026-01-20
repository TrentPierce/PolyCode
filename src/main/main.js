const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { PolyCouncilOrchestrator } = require('./core/orchestrator');
const { LMStudioClient } = require('./core/lmstudio-client');
const { SettingsManager } = require('./core/settings');
const { GitManager } = require('./core/git');
const terminalManager = require('./core/terminal');
const { initLSPManager, getLSPManager } = require('./core/lsp');
const { initDebugSessionManager, getDebugSessionManager } = require('./core/debugger');
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
const logger = require('./core/logger');

let mainWindow;
let orchestrator;
let settingsManager;
let gitManager;
let projectPath = null; // Current project folder path
let allowWindowClose = false; // Flag to allow window close after confirmation

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

  mainWindow.on('close', (e) => {
    // Prevent close if not allowed (waiting for save confirmation)
    if (!allowWindowClose) {
      logger.debug('Window close prevented, checking for unsaved changes');
      e.preventDefault();
      // Ask renderer to check for unsaved changes
      mainWindow.webContents.send('check-unsaved-changes');
    } else {
      logger.info('Window closing');
    }
  });

  mainWindow.on('closed', () => {
    logger.info('Window closed');
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  logger.info('Application ready', {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome
  });

  // Setup global error handlers first
  logger.debug('Setting up global error handlers');
  setupGlobalHandlers();

  // Initialize settings manager
  logger.debug('Initializing settings manager');
  settingsManager = new SettingsManager();
  const settings = settingsManager.getAllSettings();
  logger.info('Settings loaded', { settingsCount: Object.keys(settings).length });

  // Initialize git manager
  logger.debug('Initializing git manager');
  gitManager = new GitManager();

  // Initialize LSP manager (will be configured when project is opened)
  logger.debug('Initializing LSP manager');
  initLSPManager(null);

  // Initialize debug session manager
  logger.debug('Initializing debug session manager');
  initDebugSessionManager(null);

  // Create application menu
  logger.debug('Creating application menu');
  createMenu();

  // Create main window
  logger.debug('Creating main window');
  createWindow();

  // Initialize PolyCouncil orchestrator with settings
  logger.info('Initializing PolyCouncil orchestrator', {
    url: settings.lmstudioUrl || 'default'
  });
  orchestrator = new PolyCouncilOrchestrator(settings.lmstudioUrl);
  try {
    // Pass selected models from settings to orchestrator
    const selectedModels = settings.selectedModels || [];
    logger.debug('Initializing orchestrator with models', { modelCount: selectedModels.length });
    await orchestrator.initialize(selectedModels);

    // If models were selected, configure them
    if (selectedModels.length > 0) {
      logger.debug('Configuring orchestrator models', { models: selectedModels });
      await orchestrator.configureModels({ models: selectedModels });
    }

    logger.info('PolyCouncil orchestrator initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize orchestrator', { error: error.message, stack: error.stack });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      logger.info('Activating application, creating new window');
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  logger.info('All windows closed');

  // Cleanup all terminals before quitting
  terminalManager.killAll();
  logger.debug('All terminals killed');

  if (process.platform !== 'darwin') {
    logger.info('Quitting application');
    app.quit();
  }
});

app.on('before-quit', () => {
  logger.info('Application about to quit');

  // Cleanup all terminals before quitting
  terminalManager.killAll();
  logger.debug('All terminals killed on before-quit');
});

// IPC Handlers for AI operations
ipcMain.handle('generate-code', async (event, { prompt, context, language, existingFiles }) => {
  logger.debug('Generate code requested', { language, hasContext: !!context, filesCount: existingFiles ? Object.keys(existingFiles).length : 0 });

  try {
    // Get cache settings
    const cacheSettings = settingsManager.getSetting('cacheEnabled') !== undefined
      ? {
          enabled: settingsManager.getSetting('cacheEnabled'),
          maxSize: settingsManager.getSetting('cacheMaxSize') || 100,
          ttl: (settingsManager.getSetting('cacheTTL') || 60) * 60 * 1000
        }
      : { enabled: true, maxSize: 100, ttl: 3600000 };

    logger.debug('Cache settings loaded', { cacheEnabled: cacheSettings.enabled });

    // Validate inputs
    const promptValidation = validatePrompt(prompt);
    if (!promptValidation.isValid) {
      logger.warn('Prompt validation failed', { errors: promptValidation.errors });
      const errorDetails = await handleError(new Error(promptValidation.errors.join(', ')), 'generate-code validation');
      return { success: false, error: getUserFriendlyMessage(errorDetails) };
    }

    const contextValidation = validateCode(context || '');
    if (!contextValidation.isValid) {
      logger.warn('Context validation failed', { errors: contextValidation.errors });
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

    if (result.success) {
      logger.info('Code generation completed successfully');
    } else {
      logger.warn('Code generation failed after retries');
    }

    return result;
  } catch (error) {
    logger.error('Generate code error', { error: error.message, stack: error.stack });
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
      logger.info('Cache cleared', { model, clearedCount: cleared });
      return { success: true, data: { cleared } };
    } catch (error) {
      logger.error('Clear cache error', { error: error.message });
      return { success: false, error: error.message };
    }
  });

// Logging IPC Handlers
ipcMain.handle('log-message', async (event, level, message, context = {}) => {
  try {
    // Log renderer messages with context
    if (logger[level] && typeof logger[level] === 'function') {
      logger[level](message, {
        ...context,
        source: 'renderer',
        timestamp: new Date().toISOString()
      });
    }

    return { success: true };
  } catch (error) {
    logger.error('Log message error', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('log-get-config', async () => {
  try {
    const config = logger.getConfig();
    logger.debug('Logger config requested', { level: config.level });
    return { success: true, config };
  } catch (error) {
    logger.error('Get log config error', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('log-set-level', async (event, level) => {
  try {
    const result = logger.configure({ level });
    logger.info('Log level changed', { level, previousLevel: result.level });
    return { success: true, level: result.level };
  } catch (error) {
    logger.error('Set log level error', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('log-get-logs', async () => {
  try {
    const result = logger.getLogFiles();
    logger.debug('Log files list requested', { fileCount: result.files?.length || 0 });
    return result;
  } catch (error) {
    logger.error('Get log files error', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('log-view-file', async (event, filename) => {
  try {
    const result = logger.viewLogFile(filename);
    logger.debug('Log file viewed', { filename, success: result.success });
    return result;
  } catch (error) {
    logger.error('View log file error', { error: error.message });
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
  logger.info('Open project requested');

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
      logger.info('Project path selected', { projectPath });

      // Initialize git manager with project path
      gitManager.initialize(projectPath);

      // Initialize LSP manager with project path
      initLSPManager(projectPath);

      // Load all files from the project folder
      const files = {};
      const loadFiles = (dir, basePath = '') => {
        try {
          if (!fs.existsSync(dir)) {
            logger.warn(`Directory does not exist: ${dir}`);
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
              } catch (err) {
                logger.error(`Failed to read file ${fullPath}`, { error: err.message });
              }
            }
          });
        } catch (err) {
          logger.error(`Error reading directory ${dir}`, { error: err.message });
        }
      };
      loadFiles(projectPath);
      logger.info(`Loaded ${Object.keys(files).length} files from project`, { projectPath, fileCount: Object.keys(files).length });
      return { success: true, path: projectPath, files };
    }
    logger.info('Open project dialog cancelled');
    return { success: false, cancelled: true };
  } catch (error) {
    logger.error('Open project error', { error: error.message, stack: error.stack });
    return { success: false, error: error.message };
  }
});

 ipcMain.handle('save-project', async (event, files) => {
  logger.info('Save project requested', { fileCount: Object.keys(files).length, projectPath });

  try {
    if (!projectPath) {
      logger.debug('No project path set, prompting user');
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Project Folder to Save'
      });
      if (result.canceled || result.filePaths.length === 0) {
        logger.info('Save project dialog cancelled');
        return { success: false, cancelled: true };
      }
      // Validate project path
      const pathValidation = validateProjectPath(result.filePaths[0]);
      if (!pathValidation.isValid) {
        logger.warn('Invalid project path', { errors: pathValidation.errors });
        return { success: false, error: `Invalid project path: ${pathValidation.errors.join(', ')}` };
      }
      projectPath = pathValidation.sanitized;
      logger.info('New project path set', { projectPath });
    }

    // Save all files to the project folder with validation
    let savedCount = 0;
    let skippedCount = 0;

    for (const [filePath, content] of Object.entries(files)) {
      // Validate file path
      const pathValidation = validateFilePath(filePath, projectPath);
      if (!pathValidation.isValid) {
        logger.warn(`Skipping invalid file path: ${filePath}`, { errors: pathValidation.errors });
        skippedCount++;
        continue;
      }

      // Validate code content
      const codeValidation = validateCode(content);
      if (!codeValidation.isValid) {
        logger.warn(`Skipping invalid code in: ${filePath}`, { errors: codeValidation.errors });
        skippedCount++;
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
      savedCount++;
    }

    logger.info('Project saved successfully', { savedCount, skippedCount, projectPath });
    return { success: true, path: projectPath };
  } catch (error) {
    logger.error('Save project error', { error: error.message, stack: error.stack });
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

  // File operation IPC handlers
  ipcMain.handle('rename-file', async (event, filePath, newPath) => {
    try {
      if (!projectPath) {
        return { success: false, error: 'No project folder selected' };
      }

      const oldFullPath = path.join(projectPath, filePath);
      const newFullPath = path.join(projectPath, newPath);

      // Check if source exists
      if (!fs.existsSync(oldFullPath)) {
        return { success: false, error: 'File not found' };
      }

      // Check if destination already exists
      if (fs.existsSync(newFullPath)) {
        return { success: false, error: 'Destination file already exists' };
      }

      // Ensure destination directory exists
      const newDir = path.dirname(newFullPath);
      if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
      }

      // Rename/move the file
      fs.renameSync(oldFullPath, newFullPath);

      return { success: true, newPath: newFullPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-file', async (event, filePath) => {
    try {
      if (!projectPath) {
        return { success: false, error: 'No project folder selected' };
      }

      const fullPath = path.join(projectPath, filePath);

      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        return { success: false, error: 'File not found' };
      }

      // Delete file or directory (recursively for directories)
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('create-folder', async (event, folderName, parentPath) => {
    try {
      if (!projectPath) {
        return { success: false, error: 'No project folder selected' };
      }

      const fullPath = parentPath
        ? path.join(projectPath, parentPath, folderName)
        : path.join(projectPath, folderName);

      // Check if folder already exists
      if (fs.existsSync(fullPath)) {
        return { success: false, error: 'Folder already exists' };
      }

      // Create folder
      fs.mkdirSync(fullPath, { recursive: true });

      return { success: true, path: fullPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('create-file', async (event, fileName, parentPath) => {
    try {
      if (!projectPath) {
        return { success: false, error: 'No project folder selected' };
      }

      const fullPath = parentPath
        ? path.join(projectPath, parentPath, fileName)
        : path.join(projectPath, fileName);

      // Check if file already exists
      if (fs.existsSync(fullPath)) {
        return { success: false, error: 'File already exists' };
      }

      // Ensure directory exists
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Create empty file
      fs.writeFileSync(fullPath, '', 'utf8');

      return { success: true, path: fullPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-file-stats', async (event, filePath) => {
    try {
      if (!projectPath) {
        return { success: false, error: 'No project folder selected' };
      }

      const fullPath = path.join(projectPath, filePath);

      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        return { success: false, error: 'File not found' };
      }

      // Get file stats
      const stats = fs.statSync(fullPath);

      return {
        success: true,
        stats: {
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory()
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

// Git Integration IPC Handlers
ipcMain.handle('git-status', async () => {
  try {
    if (!projectPath) {
      return { success: false, error: 'No project folder opened' };
    }
    
    const isRepo = await gitManager.isGitRepo();
    if (!isRepo) {
      return { 
        success: true, 
        isGitRepo: false,
        branch: null,
        changedFiles: [],
        lastCommit: null
      };
    }

    const status = await gitManager.getStatus();
    const history = await gitManager.getHistory(1);
    const lastCommit = history.commits.length > 0 ? history.commits[0] : null;

    return {
      success: true,
      isGitRepo: true,
      branch: status.current,
      tracking: status.tracking,
      changedFiles: status.files,
      ahead: status.ahead,
      behind: status.behind,
      lastCommit
    };
  } catch (error) {
    console.error('Error getting git status:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-commit', async (event, message, authorInfo = {}) => {
  try {
    if (!projectPath) {
      return { success: false, error: 'No project folder opened' };
    }

    const result = await gitManager.commit(message, authorInfo);
    
    // Refresh status after commit
    const status = await gitManager.getStatus();
    const history = await gitManager.getHistory(1);
    const lastCommit = history.commits.length > 0 ? history.commits[0] : null;

    return {
      success: true,
      commit: result.commit,
      branch: result.branch,
      status: {
        branch: status.current,
        changedFiles: status.files,
        lastCommit
      }
    };
  } catch (error) {
    console.error('Error committing:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-push', async () => {
  try {
    if (!projectPath) {
      return { success: false, error: 'No project folder opened' };
    }

    const result = await gitManager.push();
    
    // Refresh status after push
    const status = await gitManager.getStatus();

    return {
      success: true,
      ...result,
      status: {
        branch: status.current,
        ahead: status.ahead,
        behind: status.behind
      }
    };
  } catch (error) {
    console.error('Error pushing:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-pull', async () => {
  try {
    if (!projectPath) {
      return { success: false, error: 'No project folder opened' };
    }

    const result = await gitManager.pull();
    
    // Refresh status after pull
    const status = await gitManager.getStatus();

    return {
      success: true,
      ...result,
      status: {
        branch: status.current,
        ahead: status.ahead,
        behind: status.behind
      }
    };
  } catch (error) {
    console.error('Error pulling:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-branch-list', async () => {
  try {
    if (!projectPath) {
      return { success: false, error: 'No project folder opened' };
    }

    const branches = await gitManager.getBranches();
    
    return {
      success: true,
      current: branches.current,
      branches: branches.all
    };
  } catch (error) {
    console.error('Error getting branches:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-checkout', async (event, branchName) => {
  try {
    if (!projectPath) {
      return { success: false, error: 'No project folder opened' };
    }

    if (!branchName) {
      return { success: false, error: 'Branch name is required' };
    }

    const result = await gitManager.checkout(branchName);
    
    // Refresh status after checkout
    const status = await gitManager.getStatus();
    const history = await gitManager.getHistory(1);
    const lastCommit = history.commits.length > 0 ? history.commits[0] : null;

    return {
      success: true,
      branch: result.branch,
      status: {
        branch: status.current,
        changedFiles: status.files,
        lastCommit
      }
    };
  } catch (error) {
    console.error('Error checking out branch:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-create-branch', async (event, branchName) => {
  try {
    if (!projectPath) {
      return { success: false, error: 'No project folder opened' };
    }

    if (!branchName) {
      return { success: false, error: 'Branch name is required' };
    }

    const result = await gitManager.createBranch(branchName);
    
    // Refresh status after creating branch
    const status = await gitManager.getStatus();
    const history = await gitManager.getHistory(1);
    const lastCommit = history.commits.length > 0 ? history.commits[0] : null;

    return {
      success: true,
      branch: result.branch,
      status: {
        branch: status.current,
        changedFiles: status.files,
        lastCommit
      }
    };
  } catch (error) {
    console.error('Error creating branch:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-history', async (event, maxCount = 20) => {
  try {
    if (!projectPath) {
      return { success: false, error: 'No project folder opened' };
    }

    const history = await gitManager.getHistory(maxCount);
    
    return {
      success: true,
      commits: history.commits,
      total: history.total
    };
  } catch (error) {
    console.error('Error getting history:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-diff', async (event, filePath) => {
  try {
    if (!projectPath) {
      return { success: false, error: 'No project folder opened' };
    }

    if (!filePath) {
      return { success: false, error: 'File path is required' };
    }

    const diffResult = await gitManager.getDiff(filePath);
    const parsedDiff = gitManager.parseDiff(diffResult.diff);
    
    return {
      success: true,
      filePath: diffResult.filePath,
      diff: diffResult.diff,
      hunks: parsedDiff.hunks,
      summary: diffResult.summary
    };
  } catch (error) {
    console.error('Error getting diff:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-init', async () => {
  try {
    if (!projectPath) {
      return { success: false, error: 'No project folder opened' };
    }

    const result = await gitManager.init();
    
    // Refresh status after init
    const status = await gitManager.getStatus();

    return {
      success: true,
      path: result.path,
      status: {
        branch: status.current,
        changedFiles: status.files
      }
    };
  } catch (error) {
    console.error('Error initializing git:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-is-repo', async () => {
  try {
    if (!projectPath) {
      return { success: true, isRepo: false };
    }

    const isRepo = await gitManager.isGitRepo();
    
    return { success: true, isRepo };
  } catch (error) {
    console.error('Error checking git repo:', error);
    return { success: false, error: error.message };
  }
});

// Terminal IPC Handlers
ipcMain.handle('terminal-create', async (event, cwd = null) => {
  try {
    const workingDir = cwd || projectPath || os.homedir();
    const result = terminalManager.spawnTerminal(workingDir);
    return result;
  } catch (error) {
    console.error('Failed to create terminal:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('terminal-input', async (event, terminalId, data) => {
  try {
    const result = terminalManager.writeInput(terminalId, data);
    return result;
  } catch (error) {
    console.error('Failed to write to terminal:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('terminal-resize', async (event, terminalId, cols, rows) => {
  try {
    const result = terminalManager.resizeTerminal(terminalId, cols, rows);
    return result;
  } catch (error) {
    console.error('Failed to resize terminal:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('terminal-kill', async (event, terminalId) => {
  try {
    const result = terminalManager.killTerminal(terminalId);
    return result;
  } catch (error) {
    console.error('Failed to kill terminal:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('terminal-list', async () => {
  try {
    const terminals = terminalManager.getTerminals();
    return { success: true, terminals };
  } catch (error) {
    console.error('Failed to get terminal list:', error);
    return { success: false, error: error.message };
  }
});

// Set up terminal data and exit callbacks to forward to renderer process
terminalManager.onData((terminalId, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('terminal-data', { terminalId, data });
  }
});

terminalManager.onExit((terminalId, exitCode, signal) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('terminal-exit', { terminalId, exitCode, signal });
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

// LSP IPC Handlers
ipcMain.handle('lsp-start', async (event, language) => {
  try {
    const lspManager = getLSPManager();
    if (!lspManager) {
      return { success: false, error: 'LSP manager not initialized' };
    }

    const result = lspManager.startServer(language);
    return result;
  } catch (error) {
    console.error('Failed to start LSP server:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('lsp-stop', async (event, language) => {
  try {
    const lspManager = getLSPManager();
    if (!lspManager) {
      return { success: false, error: 'LSP manager not initialized' };
    }

    const result = lspManager.stopServer(language);
    return result;
  } catch (error) {
    console.error('Failed to stop LSP server:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('lsp-diagnostics', async (event, uri) => {
  try {
    const lspManager = getLSPManager();
    if (!lspManager) {
      return { success: false, error: 'LSP manager not initialized' };
    }

    // Extract language from URI or use default
    const language = 'javascript'; // Default to JavaScript for now
    const result = await lspManager.requestDiagnostics(language, uri);
    return result;
  } catch (error) {
    console.error('Failed to get LSP diagnostics:', error);
    return { success: false, error: error.message, diagnostics: [] };
  }
});

ipcMain.handle('lsp-completion', async (event, uri, position) => {
  try {
    const lspManager = getLSPManager();
    if (!lspManager) {
      return { success: false, error: 'LSP manager not initialized', items: [] };
    }

    const language = 'javascript'; // Default to JavaScript for now
    const result = await lspManager.requestCompletion(language, uri, position);
    return result;
  } catch (error) {
    console.error('Failed to get LSP completions:', error);
    return { success: false, error: error.message, items: [] };
  }
});

ipcMain.handle('lsp-hover', async (event, uri, position) => {
  try {
    const lspManager = getLSPManager();
    if (!lspManager) {
      return { success: false, error: 'LSP manager not initialized', contents: null };
    }

    const language = 'javascript'; // Default to JavaScript for now
    const result = await lspManager.requestHover(language, uri, position);
    return result;
  } catch (error) {
    console.error('Failed to get LSP hover info:', error);
    return { success: false, error: error.message, contents: null };
  }
});

ipcMain.handle('lsp-definition', async (event, uri, position) => {
  try {
    const lspManager = getLSPManager();
    if (!lspManager) {
      return { success: false, error: 'LSP manager not initialized', location: null };
    }

    const language = 'javascript'; // Default to JavaScript for now
    const result = await lspManager.requestDefinition(language, uri, position);
    return result;
  } catch (error) {
    console.error('Failed to get LSP definition:', error);
    return { success: false, error: error.message, location: null };
  }
});

ipcMain.handle('lsp-get-status', async (event, language) => {
  try {
    const lspManager = getLSPManager();
    if (!lspManager) {
      return { success: false, status: 'not-initialized' };
    }

    const status = lspManager.getServerStatus(language);
    return { success: true, status };
  } catch (error) {
    console.error('Failed to get LSP status:', error);
    return { success: false, error: error.message, status: 'error' };
  }
});

ipcMain.handle('lsp-get-running-servers', async () => {
  try {
    const lspManager = getLSPManager();
    if (!lspManager) {
      return { success: false, servers: [] };
    }

    const servers = lspManager.getRunningServers();
    return { success: true, servers };
  } catch (error) {
    console.error('Failed to get running LSP servers:', error);
    return { success: false, error: error.message, servers: [] };
  }
});

// Debug IPC Handlers
ipcMain.handle('debug-start', async (event, filePath, language) => {
  try {
    logger.info('Starting debug session', { filePath, language });

    const debugManager = getDebugSessionManager();
    if (!debugManager) {
      return { success: false, error: 'Debug manager not initialized' };
    }

    const result = debugManager.startSession(filePath, language);

    if (result.success) {
      // Notify renderer about session start
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('debug-session-started', result);
      }
    }

    return result;
  } catch (error) {
    logger.error('Failed to start debug session', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('debug-stop', async (event, sessionId) => {
  try {
    logger.info('Stopping debug session', { sessionId });

    const debugManager = getDebugSessionManager();
    if (!debugManager) {
      return { success: false, error: 'Debug manager not initialized' };
    }

    const result = debugManager.stopSession(sessionId);

    if (result.success) {
      // Notify renderer about session stop
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('debug-session-stopped', { sessionId });
      }
    }

    return result;
  } catch (error) {
    logger.error('Failed to stop debug session', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('debug-pause', async (event, sessionId) => {
  try {
    const debugManager = getDebugSessionManager();
    if (!debugManager) {
      return { success: false, error: 'Debug manager not initialized' };
    }

    const result = debugManager.pause(sessionId);

    if (result.success && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('debug-session-paused', { sessionId });
    }

    return result;
  } catch (error) {
    logger.error('Failed to pause debug session', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('debug-resume', async (event, sessionId) => {
  try {
    const debugManager = getDebugSessionManager();
    if (!debugManager) {
      return { success: false, error: 'Debug manager not initialized' };
    }

    const result = debugManager.resume(sessionId);

    if (result.success && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('debug-session-resumed', { sessionId });
    }

    return result;
  } catch (error) {
    logger.error('Failed to resume debug session', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('debug-step-over', async (event, sessionId) => {
  try {
    const debugManager = getDebugSessionManager();
    if (!debugManager) {
      return { success: false, error: 'Debug manager not initialized' };
    }

    const result = debugManager.stepOver(sessionId);

    if (result.success && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('debug-step-completed', { sessionId, type: 'over', position: result.position });
    }

    return result;
  } catch (error) {
    logger.error('Failed to step over', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('debug-step-into', async (event, sessionId) => {
  try {
    const debugManager = getDebugSessionManager();
    if (!debugManager) {
      return { success: false, error: 'Debug manager not initialized' };
    }

    const result = debugManager.stepInto(sessionId);

    if (result.success && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('debug-step-completed', { sessionId, type: 'into', position: result.position, callStack: result.callStack });
    }

    return result;
  } catch (error) {
    logger.error('Failed to step into', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('debug-step-out', async (event, sessionId) => {
  try {
    const debugManager = getDebugSessionManager();
    if (!debugManager) {
      return { success: false, error: 'Debug manager not initialized' };
    }

    const result = debugManager.stepOut(sessionId);

    if (result.success && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('debug-step-completed', { sessionId, type: 'out', position: result.position, callStack: result.callStack });
    }

    return result;
  } catch (error) {
    logger.error('Failed to step out', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('debug-continue', async (event, sessionId) => {
  try {
    const debugManager = getDebugSessionManager();
    if (!debugManager) {
      return { success: false, error: 'Debug manager not initialized' };
    }

    const result = debugManager.continue(sessionId);

    if (result.success && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('debug-continued', { sessionId });
    }

    return result;
  } catch (error) {
    logger.error('Failed to continue execution', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('debug-set-breakpoint', async (event, sessionId, uri, line, condition = null) => {
  try {
    logger.debug('Setting breakpoint', { sessionId, uri, line, condition });

    const debugManager = getDebugSessionManager();
    if (!debugManager) {
      return { success: false, error: 'Debug manager not initialized' };
    }

    const result = debugManager.setBreakpoint(uri, line, condition);

    if (result.success && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('debug-breakpoint-set', { uri, line, condition });
    }

    return result;
  } catch (error) {
    logger.error('Failed to set breakpoint', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('debug-remove-breakpoint', async (event, sessionId, uri, line) => {
  try {
    logger.debug('Removing breakpoint', { sessionId, uri, line });

    const debugManager = getDebugSessionManager();
    if (!debugManager) {
      return { success: false, error: 'Debug manager not initialized' };
    }

    const result = debugManager.removeBreakpoint(uri, line);

    if (result.success && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('debug-breakpoint-removed', { uri, line });
    }

    return result;
  } catch (error) {
    logger.error('Failed to remove breakpoint', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('debug-clear-breakpoints', async (event, sessionId, uri) => {
  try {
    logger.debug('Clearing breakpoints', { sessionId, uri });

    const debugManager = getDebugSessionManager();
    if (!debugManager) {
      return { success: false, error: 'Debug manager not initialized' };
    }

    const result = debugManager.clearBreakpoints(uri);

    if (result.success && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('debug-breakpoints-cleared', { uri });
    }

    return result;
  } catch (error) {
    logger.error('Failed to clear breakpoints', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('debug-get-variables', async (event, sessionId, uri) => {
  try {
    const debugManager = getDebugSessionManager();
    if (!debugManager) {
      return { success: false, error: 'Debug manager not initialized', variables: [] };
    }

    const result = debugManager.getVariables(sessionId, uri);
    return result;
  } catch (error) {
    logger.error('Failed to get variables', { error: error.message });
    return { success: false, error: error.message, variables: [] };
  }
});

ipcMain.handle('debug-get-callstack', async (event, sessionId) => {
  try {
    const debugManager = getDebugSessionManager();
    if (!debugManager) {
      return { success: false, error: 'Debug manager not initialized', callStack: [] };
    }

    const result = debugManager.getCallStack(sessionId);
    return result;
  } catch (error) {
    logger.error('Failed to get call stack', { error: error.message });
    return { success: false, error: error.message, callStack: [] };
  }
});

ipcMain.handle('debug-get-breakpoints', async (event, uri) => {
  try {
    const debugManager = getDebugSessionManager();
    if (!debugManager) {
      return { success: false, error: 'Debug manager not initialized', breakpoints: [] };
    }

    const breakpoints = debugManager.getBreakpoints(uri);
    return { success: true, breakpoints };
  } catch (error) {
    logger.error('Failed to get breakpoints', { error: error.message });
    return { success: false, error: error.message, breakpoints: [] };
  }
});

ipcMain.handle('debug-add-watch', async (event, sessionId, expression) => {
  try {
    logger.debug('Adding watch expression', { sessionId, expression });

    const debugManager = getDebugSessionManager();
    if (!debugManager) {
      return { success: false, error: 'Debug manager not initialized' };
    }

    const result = debugManager.addWatch(sessionId, expression);

    if (result.success && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('debug-watch-added', { sessionId, ...result });
    }

    return result;
  } catch (error) {
    logger.error('Failed to add watch expression', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('debug-remove-watch', async (event, sessionId, watchId) => {
  try {
    logger.debug('Removing watch expression', { sessionId, watchId });

    const debugManager = getDebugSessionManager();
    if (!debugManager) {
      return { success: false, error: 'Debug manager not initialized' };
    }

    const result = debugManager.removeWatch(sessionId, watchId);

    if (result.success && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('debug-watch-removed', { sessionId, watchId });
    }

    return result;
  } catch (error) {
    logger.error('Failed to remove watch expression', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('debug-get-session', async (event, sessionId) => {
  try {
    const debugManager = getDebugSessionManager();
    if (!debugManager) {
      return { success: false, error: 'Debug manager not initialized' };
    }

    const session = debugManager.getSession(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    return { success: true, session };
  } catch (error) {
    logger.error('Failed to get session', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('debug-get-sessions', async () => {
  try {
    const debugManager = getDebugSessionManager();
    if (!debugManager) {
      return { success: false, error: 'Debug manager not initialized', sessions: [] };
    }

    const sessions = debugManager.getAllSessions();
    return { success: true, sessions };
  } catch (error) {
    logger.error('Failed to get sessions', { error: error.message });
    return { success: false, error: error.message, sessions: [] };
  }
});

// Rubric Evaluation IPC Handlers
ipcMain.handle('rubric-get-criteria', async () => {
  try {
    if (!orchestrator) {
      return { success: false, error: 'Orchestrator not initialized' };
    }
    const criteria = orchestrator.getRubricCriteria();
    return { success: true, criteria };
  } catch (error) {
    console.error('Failed to get rubric criteria:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rubric-set-weights', async (event, weights) => {
  try {
    if (!orchestrator) {
      return { success: false, error: 'Orchestrator not initialized' };
    }
    const result = orchestrator.setRubricWeights(weights);
    return result;
  } catch (error) {
    console.error('Failed to set rubric weights:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rubric-get-history', async (event, limit = 50) => {
  try {
    if (!orchestrator) {
      return { success: false, error: 'Orchestrator not initialized' };
    }
    const history = orchestrator.getEvaluationHistory(limit);
    return { success: true, history };
  } catch (error) {
    console.error('Failed to get evaluation history:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rubric-export', async () => {
  try {
    if (!orchestrator) {
      return { success: false, error: 'Orchestrator not initialized' };
    }
    const config = orchestrator.exportRubric();
    return { success: true, config };
  } catch (error) {
    console.error('Failed to export rubric:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rubric-import', async (event, config) => {
  try {
    if (!orchestrator) {
      return { success: false, error: 'Orchestrator not initialized' };
    }
    const result = orchestrator.importRubric(config);
    return result;
  } catch (error) {
    console.error('Failed to import rubric:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rubric-evaluate', async (event, code, language, options = {}) => {
  try {
    if (!orchestrator) {
      return { success: false, error: 'Orchestrator not initialized' };
    }

    // Validate code
    const codeValidation = validateCode(code);
    if (!codeValidation.isValid) {
      return { success: false, error: `Invalid code: ${codeValidation.errors.join(', ')}` };
    }

    const result = await orchestrator.evaluateCode(
      codeValidation.sanitized,
      language,
      options
    );
    return { success: true, ...result };
  } catch (error) {
    console.error('Failed to evaluate code:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rubric-reset-weights', async () => {
  try {
    if (!orchestrator) {
      return { success: false, error: 'Orchestrator not initialized' };
    }
    const result = orchestrator.resetRubricWeights();
    return result;
  } catch (error) {
    console.error('Failed to reset rubric weights:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rubric-clear-history', async () => {
  try {
    if (!orchestrator) {
      return { success: false, error: 'Orchestrator not initialized' };
    }
    const result = orchestrator.clearEvaluationHistory();
    return result;
  } catch (error) {
    console.error('Failed to clear evaluation history:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rubric-get-averages', async () => {
  try {
    if (!orchestrator) {
      return { success: false, error: 'Orchestrator not initialized' };
    }
    const averages = orchestrator.getAverageScores();
    return { success: true, averages };
  } catch (error) {
    console.error('Failed to get average scores:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rubric-get-trend', async (event, windowSize = 10) => {
  try {
    if (!orchestrator) {
      return { success: false, error: 'Orchestrator not initialized' };
    }
    const trend = orchestrator.getScoreTrend(windowSize);
    return { success: true, trend };
  } catch (error) {
    console.error('Failed to get score trend:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rubric-clear-cache', async () => {
  try {
    if (!orchestrator) {
      return { success: false, error: 'Orchestrator not initialized' };
    }
    const result = orchestrator.clearEvaluationCache();
    return result;
  } catch (error) {
    console.error('Failed to clear evaluation cache:', error);
    return { success: false, error: error.message };
  }
});

// Clean up LSP servers on app quit
app.on('before-quit', () => {
  const lspManager = getLSPManager();
  if (lspManager) {
    lspManager.stopAll();
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

// Window close and save confirmation IPC handlers
ipcMain.on('allow-window-close', () => {
  allowWindowClose = true;
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.on('cancel-window-close', () => {
  allowWindowClose = false;
});

ipcMain.handle('save-as-dialog', async () => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save File As',
      defaultPath: os.homedir(),
      filters: [
        { name: 'JavaScript Files', extensions: ['js', 'jsx'] },
        { name: 'TypeScript Files', extensions: ['ts', 'tsx'] },
        { name: 'Python Files', extensions: ['py'] },
        { name: 'HTML Files', extensions: ['html'] },
        { name: 'CSS Files', extensions: ['css'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      return { success: true, path: result.filePath };
    }
    return { success: false, cancelled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-recent-files', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const recentFilesPath = path.join(userDataPath, 'recent-files.json');

    if (fs.existsSync(recentFilesPath)) {
      const data = fs.readFileSync(recentFilesPath, 'utf8');
      const recentFiles = JSON.parse(data);
      return { success: true, files: recentFiles };
    }
    return { success: true, files: [] };
  } catch (error) {
    console.error('Failed to get recent files:', error);
    return { success: true, files: [] };
  }
});

ipcMain.handle('save-recent-file', async (event, filePath) => {
  try {
    const userDataPath = app.getPath('userData');
    const recentFilesPath = path.join(userDataPath, 'recent-files.json');

    let recentFiles = [];
    if (fs.existsSync(recentFilesPath)) {
      const data = fs.readFileSync(recentFilesPath, 'utf8');
      recentFiles = JSON.parse(data);
    }

    // Add file to the beginning of the list
    recentFiles = [filePath, ...recentFiles.filter(f => f !== filePath)];

    // Keep only last 10 files
    recentFiles = recentFiles.slice(0, 10);

    fs.writeFileSync(recentFilesPath, JSON.stringify(recentFiles, null, 2), 'utf8');

    return { success: true };
  } catch (error) {
    console.error('Failed to save recent file:', error);
    return { success: false, error: error.message };
  }
});


