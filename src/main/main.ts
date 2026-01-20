import { app, BrowserWindow, ipcMain, dialog, Menu, IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { PolyCouncilOrchestrator } from './core/orchestrator';
import { LMStudioClient } from './core/lmstudio-client';
import { SettingsManager } from './core/settings';
import {
  validatePrompt,
  validateFilePath,
  validateProjectPath,
  validateInstruction,
  validateCode,
  validateModels
} from './core/validation';
import { executeInSandbox, validateCodeForExecution } from './core/sandbox';
import {
  setupGlobalHandlers,
  handleError,
  getUserFriendlyMessage
} from './core/error-handler';
import {
  createRetryFunction
} from './core/recovery';
import { updateCacheConfig } from './core/cache';

let mainWindow: BrowserWindow | null = null;
let orchestrator: PolyCouncilOrchestrator | null = null;
let settingsManager: SettingsManager | null = null;
let projectPath: string | null = null; // Current project folder path
let allowWindowClose: boolean = false; // Flag to allow window close after confirmation

function createWindow(): void {
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
      e.preventDefault();
      // Ask renderer to check for unsaved changes
      mainWindow?.webContents.send('check-unsaved-changes');
    }
  });

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
ipcMain.handle('generate-code', async (
  _event: IpcMainInvokeEvent,
  { prompt, context, existingFiles }: {
    prompt: string;
    context?: string;
    existingFiles?: Record<string, string>;
  }
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    // Get cache settings
    const cacheSettings = settingsManager!.getSetting('cacheEnabled') !== undefined
      ? {
          enabled: settingsManager!.getSetting('cacheEnabled'),
          maxSize: settingsManager!.getSetting('cacheMaxSize') || 100,
          maxEntrySize: settingsManager!.getSetting('cacheMaxSize') || 1000,
          ttl: (settingsManager!.getSetting('cacheTTL') || 60) * 60 * 1000
        }
      : { enabled: true, maxSize: 100, maxEntrySize: 1000, ttl: 3600000 };

    // Validate inputs
    const promptValidation = validatePrompt(prompt);
    if (!promptValidation.isValid) {
      const errorDetails = await handleError(new Error(promptValidation.errors.join(', ')), 'generate-code validation');
      return { success: false, error: getUserFriendlyMessage(errorDetails as any) };
    }

    const contextValidation = validateCode(context || '');
    if (!contextValidation.isValid) {
      const errorDetails = await handleError(new Error(contextValidation.errors.join(', ')), 'generate-code validation');
      return { success: false, error: getUserFriendlyMessage(errorDetails as any) };
    }

    // Create progress callback to send real-time updates
    const onProgress = (message: any) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deliberation-update', message);
      }
    };

    // Use retry function for generation with cache settings
    const generateWithRetry = createRetryFunction(
      async () => {
        const result = await orchestrator!.generateCode(
          promptValidation.sanitized,
          contextValidation.sanitized,
          undefined,
          onProgress,
          existingFiles || {},
          cacheSettings
        );
        return { success: true, data: result };
      },
      {
        maxAttempts: 2, // Retry once on failure
        initialDelay: 2000,
        shouldRetry: (error: Error) => {
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
    const errorDetails = await handleError(error as Error, 'generate-code');
    return { success: false, error: getUserFriendlyMessage(errorDetails as any) };
  }
});

ipcMain.handle('edit-code', async (
  _event: IpcMainInvokeEvent,
  { code, instruction, context }: { code: string; instruction: string; context?: string }
): Promise<{ success: boolean; data?: any; error?: string }> => {
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
    const onProgress = (message: any) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deliberation-update', message);
      }
    };

    const result = await orchestrator!.editCode(
      codeValidation.sanitized,
      instructionValidation.sanitized,
      contextValidation.sanitized,
      onProgress
    );
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('analyze-code', async (
  _event: IpcMainInvokeEvent,
  { code, language }: { code: string; language: string }
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const result = await orchestrator!.analyzeCode(code, language);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-models', async (): Promise<{ success: boolean; data?: string[]; error?: string }> => {
  try {
    const models = await orchestrator!.getAvailableModels();
    return { success: true, data: models };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('configure-models', async (
  _event: IpcMainInvokeEvent,
  config: { models: string[]; cacheEnabled?: boolean; cacheMaxSize?: number; cacheTTL?: number }
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Validate models
    const availableModels = await orchestrator!.getAvailableModels();
    const validation = validateModels(config.models || [], availableModels);

    if (!validation.isValid) {
      return { success: false, error: `Invalid models: ${validation.errors.join(', ')}` };
    }

    await orchestrator!.configureModels({
      ...config,
      models: validation.sanitized
    });

    // Update cache configuration if provided
    if (config.cacheEnabled !== undefined) {
      updateCacheConfig({
        maxSize: config.cacheMaxSize || 100,
        maxEntrySize: (config.cacheMaxSize || 100) * 10,
        ttl: (config.cacheTTL || 60) * 60 * 1000 // Convert minutes to milliseconds
      });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Cache management IPC handlers
ipcMain.handle('get-cache-stats', async (): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const { getCache } = require('./core/cache');
    const cache = getCache();
    const stats = cache.getStats();
    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('clean-cache', async (): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const { getCache } = require('./core/cache');
    const cache = getCache();
    const cleaned = cache.cleanExpired();
    return { success: true, data: { cleaned } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('optimize-cache', async (
  _event: IpcMainInvokeEvent,
  keep?: number
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const { getCache } = require('./core/cache');
    const cache = getCache();
    const removed = cache.optimize(keep || 50);
    return { success: true, data: { removed } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('clear-cache', async (
  _event: IpcMainInvokeEvent,
  model?: string | null
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const { getCache } = require('./core/cache');
    const cache = getCache();
    const cleared = model ? cache.evictModel(model) : cache.clear();
    return { success: true, data: { cleared } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Settings IPC Handlers
ipcMain.handle('get-settings', async (): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const settings = settingsManager!.getAllSettings();
    return { success: true, data: settings };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('save-settings', async (
  _event: IpcMainInvokeEvent,
  newSettings: any
): Promise<{ success: boolean; error?: string }> => {
  try {
    const result = settingsManager!.saveSettings(newSettings);
    if (result.success) {
      // Update orchestrator with new URL if changed
      if (newSettings.lmstudioUrl && newSettings.lmstudioUrl !== settingsManager!.getSetting('lmstudioUrl')) {
        const updateResult = await orchestrator!.updateBaseURL(newSettings.lmstudioUrl);
        if (!updateResult.success) {
          return { success: false, error: `Settings saved but connection failed: ${updateResult.error}` };
        }
        // Re-initialize with new URL and selected models
        const selectedModels = newSettings.selectedModels || settingsManager!.getSetting('selectedModels') || [];
        await orchestrator!.initialize(selectedModels);
        if (selectedModels.length > 0) {
          await orchestrator!.configureModels({ models: selectedModels });
        }
      } else {
        // Update selected models if changed (URL unchanged)
        if (newSettings.selectedModels !== undefined) {
          if (newSettings.selectedModels.length > 0) {
            await orchestrator!.configureModels({ models: newSettings.selectedModels });
          } else {
            // Clear models if empty array
            await orchestrator!.configureModels({ models: [] });
          }
        }
      }
      return { success: true };
    }
    return { success: false, error: 'Failed to save settings' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('test-connection', async (
  _event: IpcMainInvokeEvent,
  url: string
): Promise<{ success: boolean; connected?: boolean; error?: string }> => {
  try {
    const testClient = new LMStudioClient(url);
    const connection = await testClient.checkConnection();
    return { success: true, connected: connection.connected, error: connection.error };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Project Management IPC Handlers
ipcMain.handle('new-project', async (): Promise<{ success: boolean; path?: string; files?: Record<string, string>; cancelled?: boolean; error?: string }> => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select or Create Project Folder'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      projectPath = result.filePaths[0];
      // Load any existing files from the project folder
      const files: Record<string, string> = {};
      if (fs.existsSync(projectPath)) {
        const loadFiles = (dir: string, basePath: string = '') => {
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
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('open-project', async (): Promise<{ success: boolean; path?: string; files?: Record<string, string>; cancelled?: boolean; error?: string }> => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'Open Project Folder',
      defaultPath: os.homedir(),
      // Don't use filters - show all files and folders
      // The openDirectory property allows selecting folders but still shows files
    });

    if (!result.canceled && result.filePaths.length > 0) {
      projectPath = result.filePaths[0];
      // Load all files from the project folder
      const files: Record<string, string> = {};
      const loadFiles = (dir: string, basePath: string = '') => {
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
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('save-project', async (
  _event: IpcMainInvokeEvent,
  files: Record<string, string>
): Promise<{ success: boolean; path?: string; cancelled?: boolean; error?: string }> => {
  try {
    if (!projectPath) {
      const result = await dialog.showOpenDialog(mainWindow!, {
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
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-project-path', async (): Promise<{ success: boolean; path?: string | null }> => {
  return { success: true, path: projectPath };
});

ipcMain.handle('save-file', async (
  _event: IpcMainInvokeEvent,
  filePath: string,
  content: string
): Promise<{ success: boolean; path?: string; error?: string }> => {
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
    return { success: false, error: (error as Error).message };
  }
});

// File operation IPC handlers
ipcMain.handle('rename-file', async (
  _event: IpcMainInvokeEvent,
  filePath: string,
  newPath: string
): Promise<{ success: boolean; newPath?: string; error?: string }> => {
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
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('delete-file', async (
  _event: IpcMainInvokeEvent,
  filePath: string
): Promise<{ success: boolean; error?: string }> => {
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
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('create-folder', async (
  _event: IpcMainInvokeEvent,
  folderName: string,
  parentPath?: string
): Promise<{ success: boolean; path?: string; error?: string }> => {
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
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('create-file', async (
  _event: IpcMainInvokeEvent,
  fileName: string,
  parentPath?: string
): Promise<{ success: boolean; path?: string; error?: string }> => {
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
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-file-stats', async (
  _event: IpcMainInvokeEvent,
  filePath: string
): Promise<{ success: boolean; stats?: any; error?: string }> => {
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
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('run-code', async (
  _event: IpcMainInvokeEvent,
  { filePath, code }: { filePath: string; language: string; code: string }
): Promise<any> => {
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

    // Normalize the file path
    let fullPath: string;
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
      'javascript', // TODO: Make this dynamic based on file extension
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
    return { success: false, error: (error as Error).message };
  }
});


// Create application menu
function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow!, {
              properties: ['openDirectory', 'createDirectory'],
              title: 'Select or Create Project Folder'
            });
            if (!result.canceled && result.filePaths.length > 0) {
              projectPath = result.filePaths[0];
              mainWindow!.webContents.send('project-opened', { path: projectPath });
            }
          }
        },
        {
          label: 'Open Project',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow!, {
              properties: ['openDirectory'],
              title: 'Open Project Folder'
            });
            if (!result.canceled && result.filePaths.length > 0) {
              projectPath = result.filePaths[0];
              mainWindow!.webContents.send('project-opened', { path: projectPath });
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow!.webContents.send('save-project-request');
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
            dialog.showMessageBox(mainWindow!, {
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

ipcMain.handle('save-as-dialog', async (): Promise<{ success: boolean; path?: string; cancelled?: boolean; error?: string }> => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
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
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-recent-files', async (): Promise<{ success: boolean; files?: string[] }> => {
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

ipcMain.handle('save-recent-file', async (
  _event: IpcMainInvokeEvent,
  filePath: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const userDataPath = app.getPath('userData');
    const recentFilesPath = path.join(userDataPath, 'recent-files.json');

    let recentFiles: string[] = [];
    if (fs.existsSync(recentFilesPath)) {
      const data = fs.readFileSync(recentFilesPath, 'utf8');
      recentFiles = JSON.parse(data);
    }

    // Add file to beginning of list
    recentFiles = [filePath, ...recentFiles.filter(f => f !== filePath)];

    // Keep only last 10 files
    recentFiles = recentFiles.slice(0, 10);

    fs.writeFileSync(recentFilesPath, JSON.stringify(recentFiles, null, 2), 'utf8');

    return { success: true };
  } catch (error) {
    console.error('Failed to save recent file:', error);
    return { success: false, error: (error as Error).message };
  }
});
