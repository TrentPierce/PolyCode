import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// Initial state structure
const getInitialState = () => {
  // Try to load from localStorage first
  const savedState = localStorage.getItem('polycode-store');
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      return {
        settings: parsed.settings || {},
        files: parsed.files || {},
        ai: parsed.ai || {},
        project: parsed.project || {},
        editor: parsed.editor || {},
        debug: parsed.debug || {},
        ui: parsed.ui || {}
      };
    } catch (error) {
      console.error('Failed to parse saved state:', error);
    }
  }

  // Default initial state
  return {
    settings: {
      theme: 'dark',
      language: 'javascript',
      editorConfig: {
        fontSize: 14,
        fontFamily: "'Fira Code', 'Consolas', monospace",
        tabSize: 2,
        wordWrap: 'off',
        minimap: true,
        lineNumbers: 'on',
        autoClosingBrackets: true,
        autoIndent: 'full',
        formatOnSave: true
      },
      autoSaveInterval: 30000, // 30 seconds
      lmstudioUrl: 'http://localhost:1234',
      selectedModels: []
    },

    files: {
      openFiles: [],
      activeFile: null,
      fileContents: {},
      unsavedChanges: {},
      recentFiles: [],
      fileVersions: {},
      dirtyFiles: {},
      lastSavedTimes: {}
    },

    ai: {
      models: [],
      chatHistory: [],
      currentPrompt: '',
      currentInstruction: '',
      generatedCode: null,
      deliberationMessages: [],
      currentPhase: '',
      progressPercent: 0,
      loading: false,
      error: null,
      result: null,
      mode: 'generate', // 'generate', 'edit', 'analyze'
      isConnected: false
    },

    project: {
      projectPath: null,
      gitBranch: null,
      lastCommit: null
    },

    editor: {
      fontSize: 14,
      fontFamily: "'Fira Code', 'Consolas', monospace",
      tabSize: 2,
      wordWrap: 'off',
      minimap: true,
      lineNumbers: 'on',
      autoClosingBrackets: true,
      autoIndent: 'full',
      formatOnSave: true
    },

    debug: {
      debugSession: null,
      breakpoints: {},
      variables: {},
      callStack: [],
      paused: false,
      currentLine: null
    },

    ui: {
      showTerminal: false,
      showSnippetPanel: false,
      showDebugPanel: false,
      showQualityPanel: false,
      sidebarVisible: true,
      showSettings: false,
      showShortcuts: false,
      showRubricEditor: false,
      activeTab: 'editor', // 'editor' or 'deliberation'
      outputModal: {
        isOpen: false,
        title: '',
        message: '',
        isError: false
      },
      saveDialog: {
        isOpen: false,
        fileName: '',
        multiple: false,
        unsavedFiles: []
      },
      terminals: [],
      activeTerminalId: null,
      lspServers: {},
      evaluationData: null,
      evaluationHistory: []
    }
  };
};

// Helper function to save state to localStorage with debounce
let saveTimeout;
const debouncedSave = (state) => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const stateToSave = {
        settings: state.settings,
        files: {
          recentFiles: state.files.recentFiles
        },
        ai: {
          chatHistory: state.ai.chatHistory.slice(-50) // Keep only last 50 messages
        },
        project: state.project,
        editor: state.editor,
        ui: {
          showTerminal: state.ui.showTerminal,
          showSnippetPanel: state.ui.showSnippetPanel,
          sidebarVisible: state.ui.sidebarVisible
        }
      };
      localStorage.setItem('polycode-store', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
    }
  }, 1000); // Debounce for 1 second
};

// Action types (for consistency and to avoid typos)
export const ActionTypes = {
  // Settings
  SET_THEME: 'SET_THEME',
  SET_LANGUAGE: 'SET_LANGUAGE',
  SET_EDITOR_CONFIG: 'SET_EDITOR_CONFIG',
  SET_AUTO_SAVE_INTERVAL: 'SET_AUTO_SAVE_INTERVAL',
  SET_LMSTUDIO_URL: 'SET_LMSTUDIO_URL',
  SET_SELECTED_MODELS: 'SET_SELECTED_MODELS',
  RESET_SETTINGS: 'RESET_SETTINGS',

  // Files
  SET_ACTIVE_FILE: 'SET_ACTIVE_FILE',
  SET_FILE_CONTENT: 'SET_FILE_CONTENT',
  CREATE_FILE: 'CREATE_FILE',
  DELETE_FILE: 'DELETE_FILE',
  RENAME_FILE: 'RENAME_FILE',
  SAVE_FILE: 'SAVE_FILE',
  MARK_UNSAVED: 'MARK_UNSAVED',
  CLEAR_UNSAVED: 'CLEAR_UNSAVED',
  SET_FILE_VERSIONS: 'SET_FILE_VERSIONS',
  ADD_RECENT_FILE: 'ADD_RECENT_FILE',
  SET_RECENT_FILES: 'SET_RECENT_FILES',

  // AI
  SET_MODELS: 'SET_MODELS',
  SET_CHAT_HISTORY: 'SET_CHAT_HISTORY',
  ADD_CHAT_MESSAGE: 'ADD_CHAT_MESSAGE',
  CLEAR_CHAT_HISTORY: 'CLEAR_CHAT_HISTORY',
  SET_CURRENT_PROMPT: 'SET_CURRENT_PROMPT',
  SET_CURRENT_INSTRUCTION: 'SET_CURRENT_INSTRUCTION',
  SET_GENERATED_CODE: 'SET_GENERATED_CODE',
  SET_DELIBERATION_MESSAGES: 'SET_DELIBERATION_MESSAGES',
  SET_AI_LOADING: 'SET_AI_LOADING',
  SET_AI_ERROR: 'SET_AI_ERROR',
  SET_AI_RESULT: 'SET_AI_RESULT',
  SET_AI_MODE: 'SET_AI_MODE',
  SET_AI_PHASE: 'SET_AI_PHASE',
  SET_AI_PROGRESS: 'SET_AI_PROGRESS',
  SET_AI_CONNECTED: 'SET_AI_CONNECTED',

  // Project
  SET_PROJECT_PATH: 'SET_PROJECT_PATH',
  SET_GIT_BRANCH: 'SET_GIT_BRANCH',
  SET_LAST_COMMIT: 'SET_LAST_COMMIT',

  // Editor
  SET_FONT_SIZE: 'SET_FONT_SIZE',
  SET_FONT_FAMILY: 'SET_FONT_FAMILY',
  SET_TAB_SIZE: 'SET_TAB_SIZE',
  SET_WORD_WRAP: 'SET_WORD_WRAP',
  SET_MINIMAP: 'SET_MINIMAP',
  SET_LINE_NUMBERS: 'SET_LINE_NUMBERS',
  SET_AUTO_CLOSING_BRACKETS: 'SET_AUTO_CLOSING_BRACKETS',
  SET_AUTO_INDENT: 'SET_AUTO_INDENT',
  SET_FORMAT_ON_SAVE: 'SET_FORMAT_ON_SAVE',

  // UI
  TOGGLE_TERMINAL: 'TOGGLE_TERMINAL',
  TOGGLE_SNIPPET_PANEL: 'TOGGLE_SNIPPET_PANEL',
  TOGGLE_DEBUG_PANEL: 'TOGGLE_DEBUG_PANEL',
  TOGGLE_QUALITY_PANEL: 'TOGGLE_QUALITY_PANEL',
  SET_SIDEBAR_VISIBLE: 'SET_SIDEBAR_VISIBLE',
  SET_SHOW_SETTINGS: 'SET_SHOW_SETTINGS',
  SET_SHOW_SHORTCUTS: 'SET_SHOW_SHORTCUTS',
  SET_SHOW_RUBRIC_EDITOR: 'SET_SHOW_RUBRIC_EDITOR',
  SET_ACTIVE_TAB: 'SET_ACTIVE_TAB',
  SET_OUTPUT_MODAL: 'SET_OUTPUT_MODAL',
  SET_SAVE_DIALOG: 'SET_SAVE_DIALOG',
  SET_TERMINALS: 'SET_TERMINALS',
  SET_ACTIVE_TERMINAL_ID: 'SET_ACTIVE_TERMINAL_ID',
  SET_LSP_SERVERS: 'SET_LSP_SERVERS',
  SET_EVALUATION_DATA: 'SET_EVALUATION_DATA',
  SET_EVALUATION_HISTORY: 'SET_EVALUATION_HISTORY',

  // Debug
  SET_DEBUG_SESSION: 'SET_DEBUG_SESSION',
  ADD_BREAKPOINT: 'ADD_BREAKPOINT',
  REMOVE_BREAKPOINT: 'REMOVE_BREAKPOINT',
  PAUSE_DEBUG: 'PAUSE_DEBUG',
  RESUME_DEBUG: 'RESUME_DEBUG',
  STEP_DEBUG: 'STEP_DEBUG',
  STOP_DEBUG: 'STOP_DEBUG',
  SET_DEBUG_VARIABLES: 'SET_DEBUG_VARIABLES',
  SET_DEBUG_CALL_STACK: 'SET_DEBUG_CALL_STACK',
  SET_DEBUG_PAUSED: 'SET_DEBUG_PAUSED',
  SET_DEBUG_CURRENT_LINE: 'SET_DEBUG_CURRENT_LINE'
};

// Create the store with Immer middleware for immutable updates
export const useStore = create(
  immer((set, get) => ({
    ...getInitialState(),

    // ==================== Settings Actions ====================
    setTheme: (theme) => {
      set((state) => {
        state.settings.theme = theme;
      });
      debouncedSave(get());
    },

    setLanguage: (language) => {
      set((state) => {
        state.settings.language = language;
        state.files.activeFile = null; // Reset active file when language changes
      });
      debouncedSave(get());
    },

    setEditorConfig: (config) => {
      set((state) => {
        state.settings.editorConfig = { ...state.settings.editorConfig, ...config };
        state.editor = { ...state.editor, ...config };
      });
      debouncedSave(get());
    },

    setAutoSaveInterval: (interval) => {
      set((state) => {
        state.settings.autoSaveInterval = interval;
      });
      debouncedSave(get());
    },

    setLmstudioUrl: (url) => {
      set((state) => {
        state.settings.lmstudioUrl = url;
      });
      debouncedSave(get());
    },

    setSelectedModels: (models) => {
      set((state) => {
        state.settings.selectedModels = models;
      });
      debouncedSave(get());
    },

    resetSettings: () => {
      set((state) => {
        const defaults = getInitialState();
        state.settings = defaults.settings;
      });
      debouncedSave(get());
    },

    // ==================== Files Actions ====================
    setActiveFile: (filePath) => {
      set((state) => {
        state.files.activeFile = filePath;
      });
      // Don't save to localStorage - this is ephemeral
    },

    setFileContent: (filePath, content) => {
      set((state) => {
        state.files.fileContents[filePath] = content;
      });
      // Don't save file contents to localStorage - ephemeral
    },

    setFileContents: (contents) => {
      set((state) => {
        state.files.fileContents = contents;
      });
    },

    createFile: (filePath) => {
      set((state) => {
        state.files.fileContents[filePath] = '';
        if (!state.files.openFiles.includes(filePath)) {
          state.files.openFiles.push(filePath);
        }
      });
    },

    deleteFile: (filePath) => {
      set((state) => {
        delete state.files.fileContents[filePath];
        delete state.files.unsavedChanges[filePath];
        delete state.files.dirtyFiles[filePath];
        state.files.openFiles = state.files.openFiles.filter(f => f !== filePath);
        if (state.files.activeFile === filePath) {
          state.files.activeFile = null;
        }
      });
    },

    renameFile: (oldPath, newPath) => {
      set((state) => {
        const content = state.files.fileContents[oldPath];
        if (content !== undefined) {
          state.files.fileContents[newPath] = content;
          delete state.files.fileContents[oldPath];
        }

        const unsaved = state.files.unsavedChanges[oldPath];
        if (unsaved !== undefined) {
          state.files.unsavedChanges[newPath] = unsaved;
          delete state.files.unsavedChanges[oldPath];
        }

        const dirty = state.files.dirtyFiles[oldPath];
        if (dirty !== undefined) {
          state.files.dirtyFiles[newPath] = dirty;
          delete state.files.dirtyFiles[oldPath];
        }

        const lastSaved = state.files.lastSavedTimes[oldPath];
        if (lastSaved !== undefined) {
          state.files.lastSavedTimes[newPath] = lastSaved;
          delete state.files.lastSavedTimes[oldPath];
        }

        state.files.openFiles = state.files.openFiles.map(f => f === oldPath ? newPath : f);
        if (state.files.activeFile === oldPath) {
          state.files.activeFile = newPath;
        }
      });
    },

    saveFile: (filePath, content) => {
      set((state) => {
        state.files.fileContents[filePath] = content;
        state.files.dirtyFiles[filePath] = false;
        state.files.lastSavedTimes[filePath] = new Date().toISOString();
      });
    },

    markUnsaved: (filePath, isDirty) => {
      set((state) => {
        state.files.dirtyFiles[filePath] = isDirty;
      });
    },

    clearUnsaved: (filePath) => {
      set((state) => {
        state.files.dirtyFiles[filePath] = false;
      });
    },

    setFileVersions: (versions) => {
      set((state) => {
        state.files.fileVersions = { ...state.files.fileVersions, ...versions };
      });
    },

    addRecentFile: (filePath) => {
      set((state) => {
        const recents = state.files.recentFiles.filter(f => f !== filePath);
        state.files.recentFiles = [filePath, ...recents].slice(0, 20); // Keep last 20
      });
      debouncedSave(get());
    },

    setRecentFiles: (files) => {
      set((state) => {
        state.files.recentFiles = files || [];
      });
      debouncedSave(get());
    },

    // ==================== AI Actions ====================
    setModels: (models) => {
      set((state) => {
        state.ai.models = models;
      });
    },

    setChatHistory: (history) => {
      set((state) => {
        state.ai.chatHistory = history;
      });
      debouncedSave(get());
    },

    addChatMessage: (message) => {
      set((state) => {
        state.ai.chatHistory.push(message);
      });
      debouncedSave(get());
    },

    clearChatHistory: () => {
      set((state) => {
        state.ai.chatHistory = [];
      });
      debouncedSave(get());
    },

    setCurrentPrompt: (prompt) => {
      set((state) => {
        state.ai.currentPrompt = prompt;
      });
    },

    setCurrentInstruction: (instruction) => {
      set((state) => {
        state.ai.currentInstruction = instruction;
      });
    },

    setGeneratedCode: (code) => {
      set((state) => {
        state.ai.generatedCode = code;
      });
    },

    setDeliberationMessages: (messages) => {
      set((state) => {
        state.ai.deliberationMessages = messages;
      });
    },

    setAiLoading: (loading) => {
      set((state) => {
        state.ai.loading = loading;
      });
    },

    setAiError: (error) => {
      set((state) => {
        state.ai.error = error;
      });
    },

    setAiResult: (result) => {
      set((state) => {
        state.ai.result = result;
      });
    },

    setAiMode: (mode) => {
      set((state) => {
        state.ai.mode = mode;
      });
    },

    setAiPhase: (phase) => {
      set((state) => {
        state.ai.currentPhase = phase;
      });
    },

    setAiProgress: (percent) => {
      set((state) => {
        state.ai.progressPercent = percent;
      });
    },

    setAiConnected: (connected) => {
      set((state) => {
        state.ai.isConnected = connected;
      });
    },

    // ==================== Project Actions ====================
    setProjectPath: (path) => {
      set((state) => {
        state.project.projectPath = path;
      });
      debouncedSave(get());
    },

    setGitBranch: (branch) => {
      set((state) => {
        state.project.gitBranch = branch;
      });
    },

    setLastCommit: (commit) => {
      set((state) => {
        state.project.lastCommit = commit;
      });
    },

    // ==================== Editor Actions ====================
    setFontSize: (size) => {
      set((state) => {
        state.editor.fontSize = size;
        state.settings.editorConfig.fontSize = size;
      });
      debouncedSave(get());
    },

    setFontFamily: (family) => {
      set((state) => {
        state.editor.fontFamily = family;
        state.settings.editorConfig.fontFamily = family;
      });
      debouncedSave(get());
    },

    setTabSize: (size) => {
      set((state) => {
        state.editor.tabSize = size;
        state.settings.editorConfig.tabSize = size;
      });
      debouncedSave(get());
    },

    setWordWrap: (wrap) => {
      set((state) => {
        state.editor.wordWrap = wrap;
        state.settings.editorConfig.wordWrap = wrap;
      });
      debouncedSave(get());
    },

    setMinimap: (enabled) => {
      set((state) => {
        state.editor.minimap = enabled;
        state.settings.editorConfig.minimap = enabled;
      });
      debouncedSave(get());
    },

    setLineNumbers: (value) => {
      set((state) => {
        state.editor.lineNumbers = value;
        state.settings.editorConfig.lineNumbers = value;
      });
      debouncedSave(get());
    },

    setAutoClosingBrackets: (enabled) => {
      set((state) => {
        state.editor.autoClosingBrackets = enabled;
        state.settings.editorConfig.autoClosingBrackets = enabled;
      });
      debouncedSave(get());
    },

    setAutoIndent: (value) => {
      set((state) => {
        state.editor.autoIndent = value;
        state.settings.editorConfig.autoIndent = value;
      });
      debouncedSave(get());
    },

    setFormatOnSave: (enabled) => {
      set((state) => {
        state.editor.formatOnSave = enabled;
        state.settings.editorConfig.formatOnSave = enabled;
      });
      debouncedSave(get());
    },

    // ==================== UI Actions ====================
    toggleTerminal: () => {
      set((state) => {
        state.ui.showTerminal = !state.ui.showTerminal;
      });
      debouncedSave(get());
    },

    toggleSnippetPanel: () => {
      set((state) => {
        state.ui.showSnippetPanel = !state.ui.showSnippetPanel;
      });
      debouncedSave(get());
    },

    toggleDebugPanel: () => {
      set((state) => {
        state.ui.showDebugPanel = !state.ui.showDebugPanel;
      });
    },

    toggleQualityPanel: () => {
      set((state) => {
        state.ui.showQualityPanel = !state.ui.showQualityPanel;
      });
    },

    setSidebarVisible: (visible) => {
      set((state) => {
        state.ui.sidebarVisible = visible;
      });
      debouncedSave(get());
    },

    setShowSettings: (show) => {
      set((state) => {
        state.ui.showSettings = show;
      });
    },

    setShowShortcuts: (show) => {
      set((state) => {
        state.ui.showShortcuts = show;
      });
    },

    setShowRubricEditor: (show) => {
      set((state) => {
        state.ui.showRubricEditor = show;
      });
    },

    setActiveTab: (tab) => {
      set((state) => {
        state.ui.activeTab = tab;
      });
    },

    setOutputModal: (modal) => {
      set((state) => {
        state.ui.outputModal = modal;
      });
    },

    setSaveDialog: (dialog) => {
      set((state) => {
        state.ui.saveDialog = dialog;
      });
    },

    setTerminals: (terminals) => {
      set((state) => {
        state.ui.terminals = terminals;
      });
    },

    addTerminal: (terminal) => {
      set((state) => {
        state.ui.terminals.push(terminal);
      });
    },

    removeTerminal: (terminalId) => {
      set((state) => {
        state.ui.terminals = state.ui.terminals.filter(t => t.id !== terminalId);
        if (state.ui.activeTerminalId === terminalId) {
          state.ui.activeTerminalId = state.ui.terminals[0]?.id || null;
        }
      });
    },

    setActiveTerminalId: (id) => {
      set((state) => {
        state.ui.activeTerminalId = id;
      });
    },

    setLspServers: (servers) => {
      set((state) => {
        state.ui.lspServers = servers;
      });
    },

    setEvaluationData: (data) => {
      set((state) => {
        state.ui.evaluationData = data;
      });
    },

    setEvaluationHistory: (history) => {
      set((state) => {
        state.ui.evaluationHistory = history;
      });
    },

    // ==================== Debug Actions ====================
    setDebugSession: (session) => {
      set((state) => {
        state.debug.debugSession = session;
      });
    },

    addBreakpoint: (filePath, line) => {
      set((state) => {
        if (!state.debug.breakpoints[filePath]) {
          state.debug.breakpoints[filePath] = [];
        }
        if (!state.debug.breakpoints[filePath].includes(line)) {
          state.debug.breakpoints[filePath].push(line);
        }
      });
    },

    removeBreakpoint: (filePath, line) => {
      set((state) => {
        if (state.debug.breakpoints[filePath]) {
          state.debug.breakpoints[filePath] = state.debug.breakpoints[filePath].filter(l => l !== line);
        }
      });
    },

    pauseDebug: () => {
      set((state) => {
        state.debug.paused = true;
      });
    },

    resumeDebug: () => {
      set((state) => {
        state.debug.paused = false;
      });
    },

    stepDebug: (stepType) => {
      // stepType: 'stepOver', 'stepInto', 'stepOut'
      // This would trigger the actual debug step via IPC
      console.log('Debug step:', stepType);
    },

    stopDebug: () => {
      set((state) => {
        state.debug.debugSession = null;
        state.debug.paused = false;
        state.debug.currentLine = null;
        state.debug.variables = {};
        state.debug.callStack = [];
      });
    },

    setDebugVariables: (variables) => {
      set((state) => {
        state.debug.variables = variables;
      });
    },

    setDebugCallStack: (callStack) => {
      set((state) => {
        state.debug.callStack = callStack;
      });
    },

    setDebugPaused: (paused) => {
      set((state) => {
        state.debug.paused = paused;
      });
    },

    setDebugCurrentLine: (line) => {
      set((state) => {
        state.debug.currentLine = line;
      });
    }
  }))
);

// Selector helpers for cleaner component code
export const selectSettings = (state) => state.settings;
export const selectFiles = (state) => state.files;
export const selectActiveFile = (state) => state.files.activeFile;
export const selectFileContent = (state) => (filePath) => state.files.fileContents[filePath];
export const selectAI = (state) => state.ai;
export const selectProject = (state) => state.project;
export const selectEditor = (state) => state.editor;
export const selectUI = (state) => state.ui;
export const selectDebug = (state) => state.debug;

// Async action creators (for operations requiring IPC)
export const asyncActions = {
  // File operations
  loadFile: async (filePath) => {
    if (!window.electronAPI) return null;
    try {
      const result = await window.electronAPI.readFile(filePath);
      return result;
    } catch (error) {
      console.error('Failed to load file:', error);
      return null;
    }
  },

  saveFileAsync: async (filePath, content) => {
    if (!window.electronAPI) return null;
    try {
      const result = await window.electronAPI.saveFile(filePath, content);
      return result;
    } catch (error) {
      console.error('Failed to save file:', error);
      return null;
    }
  },

  // AI operations
  generateCode: async (prompt, context, language, existingFiles) => {
    if (!window.electronAPI) return null;
    try {
      const result = await window.electronAPI.generateCode(prompt, context, language, existingFiles);
      return result;
    } catch (error) {
      console.error('Failed to generate code:', error);
      return null;
    }
  },

  editCode: async (code, instruction, language) => {
    if (!window.electronAPI) return null;
    try {
      const result = await window.electronAPI.editCode(code, instruction, language);
      return result;
    } catch (error) {
      console.error('Failed to edit code:', error);
      return null;
    }
  },

  analyzeCode: async (code, language) => {
    if (!window.electronAPI) return null;
    try {
      const result = await window.electronAPI.analyzeCode(code, language);
      return result;
    } catch (error) {
      console.error('Failed to analyze code:', error);
      return null;
    }
  },

  // Settings operations
  getModels: async () => {
    if (!window.electronAPI) return null;
    try {
      const result = await window.electronAPI.getModels();
      return result;
    } catch (error) {
      console.error('Failed to get models:', error);
      return null;
    }
  },

  testConnection: async (url) => {
    if (!window.electronAPI) return null;
    try {
      const result = await window.electronAPI.testConnection(url);
      return result;
    } catch (error) {
      console.error('Failed to test connection:', error);
      return null;
    }
  },

  saveSettings: async (settings) => {
    if (!window.electronAPI) return null;
    try {
      const result = await window.electronAPI.saveSettings(settings);
      return result;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return null;
    }
  },

  // Git operations
  getGitStatus: async () => {
    if (!window.electronAPI) return null;
    try {
      const result = await window.electronAPI.getGitStatus?.();
      return result;
    } catch (error) {
      console.error('Failed to get git status:', error);
      return null;
    }
  }
};

// Export a default export for convenience
export default useStore;
