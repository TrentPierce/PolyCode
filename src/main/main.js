const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { PolyCouncilOrchestrator } = require('./core/orchestrator');
const { LMStudioClient } = require('./core/lmstudio-client');
const { SettingsManager } = require('./core/settings');

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
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
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
    // Create progress callback to send real-time updates
    const onProgress = (message) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deliberation-update', message);
      }
    };
    
    // Pass null for language to let models decide, and progress callback
    // Pass existingFiles to track file changes
    const result = await orchestrator.generateCode(prompt, context, null, onProgress, existingFiles || {});
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('edit-code', async (event, { code, instruction, context }) => {
  try {
    // Create progress callback to send real-time updates
    const onProgress = (message) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deliberation-update', message);
      }
    };
    
    const result = await orchestrator.editCode(code, instruction, context, onProgress);
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
    await orchestrator.configureModels(config);
    return { success: true };
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
      projectPath = result.filePaths[0];
    }

    // Save all files to the project folder
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(projectPath, filePath);
      const dir = path.dirname(fullPath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write file
      fs.writeFileSync(fullPath, content, 'utf8');
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

    const fullPath = path.join(projectPath, filePath);
    const dir = path.dirname(fullPath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(fullPath, content, 'utf8');
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

    const { spawn } = require('child_process');
    
    // Normalize the file path - handle both relative and absolute paths
    let fullPath;
    if (path.isAbsolute(filePath)) {
      fullPath = filePath;
    } else {
      fullPath = path.join(projectPath, filePath);
    }
    
    // Normalize the path to handle any path separators correctly
    fullPath = path.normalize(fullPath);
    
    // Ensure the file exists, create it if it doesn't
    if (!fs.existsSync(fullPath)) {
      // Ensure the directory exists
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, code, 'utf8');
    } else {
      // File exists, update it with current code
      fs.writeFileSync(fullPath, code, 'utf8');
    }
    
    // Verify it's actually a file, not a directory
    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      return { success: false, error: `Path is a directory, not a file: ${fullPath}` };
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

    // Execute the code
    // On Windows, we need to handle paths with spaces carefully
    const isWindows = process.platform === 'win32';
    const spawnOptions = {
      cwd: projectPath
    };
    
    // For Windows with paths containing spaces, use shell: false
    // This ensures paths are passed directly to the process without shell interpretation
    if (isWindows) {
      spawnOptions.shell = false;
    } else {
      spawnOptions.shell = true;
    }
    
    // Additional debug logging
    console.log('Spawning process:', {
      command,
      args,
      cwd: projectPath,
      shell: spawnOptions.shell,
      platform: process.platform
    });
    
    const childProcess = spawn(command, args, spawnOptions);

    let stdout = '';
    let stderr = '';

    childProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    childProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    return new Promise((resolve) => {
      childProcess.on('close', (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          stdout,
          stderr,
          output: stdout || stderr
        });
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        childProcess.kill();
        resolve({
          success: false,
          error: 'Execution timeout (30 seconds)',
          stdout,
          stderr
        });
      }, 30000);
    });
  } catch (error) {
    return { success: false, error: error.message };
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

