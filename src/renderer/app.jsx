import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Editor from './components/Editor';
import FileExplorer from './components/FileExplorer';
import AIPanel from './components/AIPanel';
import StatusBar from './components/StatusBar';
import Settings from './components/Settings';
import DeliberationChat from './components/DeliberationChat';
import OutputModal from './components/OutputModal';
import SaveDialog from './components/SaveDialog';
import ShortcutHelp from './components/ShortcutHelp';
import TerminalPanel from './components/Terminal';
import SnippetPanel from './components/SnippetPanel';
import QualityMetrics from './components/QualityMetrics';
import RubricEditor from './components/RubricEditor';
import DebugPanel from './components/DebugPanel';
import DebugToolbar from './components/DebugToolbar';
import { initializeShortcuts } from './utils/shortcuts';
import snippetManager from './utils/snippets';
import logger from './utils/logger';
import { useStore } from './store';
import './styles/main.css';

function App() {
  // Select state from store
  const files = useStore(state => state.files.fileContents);
  const activeFile = useStore(state => state.files.activeFile);
  const language = useStore(state => state.settings.language);
  const models = useStore(state => state.ai.models);
  const isConnected = useStore(state => state.ai.isConnected);
  const showSettings = useStore(state => state.ui.showSettings);
  const projectPath = useStore(state => state.project.projectPath);
  const deliberationMessages = useStore(state => state.ai.deliberationMessages);
  const activeTab = useStore(state => state.ui.activeTab);
  const fileVersions = useStore(state => state.files.fileVersions);
  const outputModal = useStore(state => state.ui.outputModal);
  const showShortcuts = useStore(state => state.ui.showShortcuts);
  const dirtyFiles = useStore(state => state.files.dirtyFiles);
  const lastSavedTimes = useStore(state => state.files.lastSavedTimes);
  const saveDialog = useStore(state => state.ui.saveDialog);
  const recentFiles = useStore(state => state.files.recentFiles);
  const lspServers = useStore(state => state.ui.lspServers);
  const terminals = useStore(state => state.ui.terminals);
  const activeTerminalId = useStore(state => state.ui.activeTerminalId);
  const showTerminal = useStore(state => state.ui.showTerminal);
  const showSnippetPanel = useStore(state => state.ui.showSnippetPanel);
  const showQualityMetrics = useStore(state => state.ui.showQualityPanel);
  const showRubricEditor = useStore(state => state.ui.showRubricEditor);
  const evaluationData = useStore(state => state.ui.evaluationData);
  const evaluationHistory = useStore(state => state.ui.evaluationHistory);

  // Select actions from store
  const setActiveFileAction = useStore(state => state.setActiveFile);
  const setLanguageAction = useStore(state => state.setLanguage);
  const setModelsAction = useStore(state => state.setModels);
  const setAiConnectedAction = useStore(state => state.setAiConnected);
  const setShowSettingsAction = useStore(state => state.setShowSettings);
  const setProjectPathAction = useStore(state => state.setProjectPath);
  const setActiveTabAction = useStore(state => state.setActiveTab);
  const setFileVersionsAction = useStore(state => state.setFileVersions);
  const setOutputModalAction = useStore(state => state.setOutputModal);
  const setShowShortcutsAction = useStore(state => state.setShowShortcuts);
  const markUnsavedAction = useStore(state => state.markUnsaved);
  const setSaveDialogAction = useStore(state => state.setSaveDialog);
  const setRecentFilesAction = useStore(state => state.setRecentFiles);
  const setLspServersAction = useStore(state => state.setLspServers);
  const setTerminalsAction = useStore(state => state.setTerminals);
  const setActiveTerminalIdAction = useStore(state => state.setActiveTerminalId);
  const toggleTerminalAction = useStore(state => state.toggleTerminal);
  const toggleSnippetPanelAction = useStore(state => state.toggleSnippetPanel);
  const setShowQualityMetricsAction = useStore(state => state.toggleQualityPanel);
  const setShowRubricEditorAction = useStore(state => state.setShowRubricEditor);
  const setEvaluationDataAction = useStore(state => state.setEvaluationData);
  const setEvaluationHistoryAction = useStore(state => state.setEvaluationHistory);
  const setFileContentsAction = useStore(state => state.setFileContents);
  const createFileAction = useStore(state => state.createFile);
  const deleteFileAction = useStore(state => state.deleteFile);
  const renameFileAction = useStore(state => state.renameFile);
  const saveFileAction = useStore(state => state.saveFile);
  const setDeliberationMessagesAction = useStore(state => state.setDeliberationMessages);
  const addRecentFileAction = useStore(state => state.addRecentFile);
  const removeTerminalAction = useStore(state => state.removeTerminal);
  const addTerminalAction = useStore(state => state.addTerminal);

  const editorRef = useRef(null); // Editor ref for snippet insertion

  // Debug state (local for now, can be moved to store later)
  const [debugSession, setDebugSession] = useState(null);
  const [debugVariables, setDebugVariables] = useState([]);
  const [debugCallStack, setDebugCallStack] = useState([]);
  const [debugBreakpoints, setDebugBreakpoints] = useState([]);
  const [debugWatchExpressions, setDebugWatchExpressions] = useState([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  useEffect(() => {
    logger.info('App component mounted');

    // Check LMStudio connection and load models
    checkConnection();

    // Check for existing project path
    window.electronAPI.getProjectPath().then(result => {
      if (result.success && result.path) {
        setProjectPath(result.path);
      }
    });

    // Load recent files
    window.electronAPI.getRecentFiles().then(result => {
      if (result.success) {
        setRecentFiles(result.files || []);
      }
    });

    // Load evaluation history
    loadEvaluationHistory();

    // Load recent files
    window.electronAPI.getRecentFiles().then(result => {
      if (result.success) {
        setRecentFiles(result.files || []);
        logger.debug('Recent files loaded', { count: result.files?.length || 0 });
      }
    });

    // Listen for window close check
    const handleUnsavedCheck = () => {
      const unsaved = Object.keys(dirtyFiles).filter(filePath => dirtyFiles[filePath]);
      if (unsaved.length > 0) {
        logger.info('Unsaved changes detected on close', { unsavedCount: unsaved.length, files: unsaved });
        setSaveDialog({
          isOpen: true,
          fileName: activeFile || 'multiple files',
          multiple: unsaved.length > 1,
          unsavedFiles: unsaved
        });
      } else {
        logger.debug('No unsaved changes, allowing window close');
        // No unsaved changes, allow close
        window.electronAPI.allowWindowClose();
      }
    };

    window.electronAPI.onUnsavedChangesCheck?.(handleUnsavedCheck);
    window.addEventListener('check-unsaved-changes', handleUnsavedCheck);

    // Listen for debug events
    const handleDebugSessionStarted = (data) => {
      logger.info('Debug session started', data);
      setDebugSession(data);
      setShowDebugPanel(true);
      loadDebugData(data);
    };

    const handleDebugSessionStopped = (data) => {
      logger.info('Debug session stopped', data);
      setDebugSession(null);
      setDebugVariables([]);
      setDebugCallStack([]);
      setShowDebugPanel(false);
    };

    const handleDebugStepCompleted = (data) => {
      logger.debug('Debug step completed', data);
      if (debugSession) {
        loadDebugData({ ...debugSession, currentPosition: data.position });
      }
    };

    const handleDebugBreakpointSet = (data) => {
      logger.debug('Breakpoint set', data);
      loadDebugBreakpoints();
    };

    const handleDebugBreakpointRemoved = (data) => {
      logger.debug('Breakpoint removed', data);
      loadDebugBreakpoints();
    };

    window.electronAPI.onDebugSessionStarted?.(handleDebugSessionStarted);
    window.electronAPI.onDebugSessionStopped?.(handleDebugSessionStopped);
    window.electronAPI.onDebugStepCompleted?.(handleDebugStepCompleted);
    window.electronAPI.onDebugBreakpointSet?.(handleDebugBreakpointSet);
    window.electronAPI.onDebugBreakpointRemoved?.(handleDebugBreakpointRemoved);

    // Initialize keyboard shortcuts
    const handlers = {
      'new-file': handleFileCreate,
      'open-file': handleOpenProject,
      'save-file': handleSaveProject,
      'save-as': handleSaveAs,
      'toggle-settings': () => setShowSettings(true),
      'show-shortcuts': () => setShowShortcuts(true),
      'run-code': () => handleRunCode(),
      'toggle-terminal': handleToggleTerminal,
      'toggle-snippets': () => setShowSnippetPanel(prev => !prev)
    };

    const shortcutsManager = initializeShortcuts(handlers);
    logger.debug('Keyboard shortcuts initialized');

    return () => {
      logger.info('App component unmounting');
      shortcutsManager.disable();
      window.removeEventListener('check-unsaved-changes', handleUnsavedCheck);
      window.electronAPI.removeUnsavedChangesListener?.();
      window.electronAPI.removeTerminalListeners?.();
      window.electronAPI.removeDebugListeners?.();
    };
  }, [dirtyFiles, activeFile]);

  const checkConnection = async () => {
    try {
      const result = await window.electronAPI.getModels();
      if (result.success) {
        setModels(result.data);
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      setIsConnected(false);
    }
  };

  const handleFileSelect = (filePath, content) => {
    logger.info('File selected', { filePath });
    setActiveFile(filePath);
    const ext = filePath.split('.').pop();
    const langMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'html': 'html',
      'css': 'css',
      'json': 'json'
    };
    setLanguage(langMap[ext] || 'javascript');

    // Auto-start LSP server for TypeScript files
    if (langMap[ext] === 'typescript' || langMap[ext] === 'javascript') {
      startLanguageServer(langMap[ext]);
    }
  };

  const startLanguageServer = async (language) => {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      return;
    }

    try {
      const result = await window.electronAPI.lspStart(language);
      if (result.success) {
        setLspServers(prev => ({
          ...prev,
          [language]: { status: 'connected', pid: result.pid }
        }));
      } else {
        console.error('Failed to start LSP server:', result.error);
        setLspServers(prev => ({
          ...prev,
          [language]: { status: 'error', error: result.error }
        }));
      }
    } catch (error) {
      console.error('Error starting LSP server:', error);
      setLspServers(prev => ({
        ...prev,
        [language]: { status: 'error', error: error.message }
      }));
    }
  };

  const loadEvaluationHistory = async () => {
    try {
      const result = await window.electronAPI.rubricGetHistory(50);
      if (result.success) {
        setEvaluationHistory(result.history || []);
      }
    } catch (error) {
      console.error('Failed to load evaluation history:', error);
    }
  };

  const handleEvaluateCode = async () => {
    if (!activeFile || !files[activeFile]) {
      alert('No file is currently open');
      return;
    }

    const code = files[activeFile];
    if (!code || code.trim().length === 0) {
      alert('The current file is empty. Nothing to evaluate.');
      return;
    }

    try {
      const result = await window.electronAPI.rubricEvaluate(code, language, {});
      if (result.success) {
        setEvaluationData(result);
        setShowQualityMetrics(true);
        // Reload history to get the new entry
        loadEvaluationHistory();
      } else {
        alert(`Evaluation failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to evaluate code:', error);
      alert(`Evaluation failed: ${error.message}`);
    }
  };

  const handleRubricSave = (updatedWeights) => {
    logger.info('Rubric weights updated', updatedWeights);
    loadEvaluationHistory(); // Refresh history to reflect any changes
  };

  // Debug handler functions
  const handleDebugStart = async () => {
    if (!activeFile) {
      alert('Please open a file first to start debugging');
      return;
    }

    if (!projectPath) {
      alert('Please select a project folder first');
      return;
    }

    try {
      const result = await window.electronAPI.debugStart(activeFile, language);
      if (result.success) {
        logger.info('Debug session started', result);
        setDebugSession(result);
        setShowDebugPanel(true);
      } else {
        alert(`Failed to start debug session: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to start debug:', error);
      alert(`Failed to start debug: ${error.message}`);
    }
  };

  const handleDebugStop = async () => {
    if (!debugSession) return;

    try {
      const result = await window.electronAPI.debugStop(debugSession.id);
      if (result.success) {
        logger.info('Debug session stopped');
        setDebugSession(null);
        setDebugVariables([]);
        setDebugCallStack([]);
        setShowDebugPanel(false);
      }
    } catch (error) {
      console.error('Failed to stop debug:', error);
    }
  };

  const handleDebugPause = async () => {
    if (!debugSession) return;

    try {
      const result = await window.electronAPI.debugPause(debugSession.id);
      if (result.success) {
        setDebugSession(prev => ({ ...prev, paused: true, status: 'paused' }));
      }
    } catch (error) {
      console.error('Failed to pause debug:', error);
    }
  };

  const handleDebugResume = async () => {
    if (!debugSession) return;

    try {
      const result = await window.electronAPI.debugResume(debugSession.id);
      if (result.success) {
        setDebugSession(prev => ({ ...prev, paused: false, status: 'running' }));
      }
    } catch (error) {
      console.error('Failed to resume debug:', error);
    }
  };

  const handleDebugStepOver = async () => {
    if (!debugSession) return;

    try {
      const result = await window.electronAPI.debugStepOver(debugSession.id);
      if (result.success) {
        loadDebugData(debugSession);
      }
    } catch (error) {
      console.error('Failed to step over:', error);
    }
  };

  const handleDebugStepInto = async () => {
    if (!debugSession) return;

    try {
      const result = await window.electronAPI.debugStepInto(debugSession.id);
      if (result.success) {
        loadDebugData(debugSession);
      }
    } catch (error) {
      console.error('Failed to step into:', error);
    }
  };

  const handleDebugStepOut = async () => {
    if (!debugSession) return;

    try {
      const result = await window.electronAPI.debugStepOut(debugSession.id);
      if (result.success) {
        loadDebugData(debugSession);
      }
    } catch (error) {
      console.error('Failed to step out:', error);
    }
  };

  const handleDebugContinue = async () => {
    if (!debugSession) return;

    try {
      const result = await window.electronAPI.debugContinue(debugSession.id);
      if (result.success) {
        setDebugSession(prev => ({ ...prev, paused: false, status: 'running' }));
      }
    } catch (error) {
      console.error('Failed to continue debug:', error);
    }
  };

  const handleBreakpointToggle = (uri, line) => {
    // Breakpoint toggle is handled in Editor component
    logger.debug('Breakpoint toggled', { uri, line });
  };

  const handleBreakpointRemove = (uri, line) => {
    logger.debug('Breakpoint removed', { uri, line });
  };

  const handleDebugWatchAdd = async (expression) => {
    if (!debugSession) return;

    try {
      const result = await window.electronAPI.debugAddWatch(debugSession.id, expression);
      if (result.success) {
        loadDebugData(debugSession);
      }
    } catch (error) {
      console.error('Failed to add watch:', error);
    }
  };

  const handleDebugWatchRemove = async (watchId) => {
    if (!debugSession) return;

    try {
      const result = await window.electronAPI.debugRemoveWatch(debugSession.id, watchId);
      if (result.success) {
        loadDebugData(debugSession);
      }
    } catch (error) {
      console.error('Failed to remove watch:', error);
    }
  };

  const loadDebugData = async (session) => {
    if (!session) return;

    try {
      // Load variables
      const varsResult = await window.electronAPI.debugGetVariables(session.id, activeFile || session.uri);
      if (varsResult.success) {
        setDebugVariables(varsResult.variables);
      }

      // Load call stack
      const stackResult = await window.electronAPI.debugGetCallstack(session.id);
      if (stackResult.success) {
        setDebugCallStack(stackResult.callStack);
      }

      // Load watch expressions
      const manager = window.electronAPI;
      const watchData = await manager.debugGetSessions();
      if (watchData.success && watchData.sessions.length > 0) {
        const currentSession = watchData.sessions.find(s => s.id === session.id);
        if (currentSession && currentSession.watchExpressions) {
          setDebugWatchExpressions(currentSession.watchExpressions);
        }
      }
    } catch (error) {
      console.error('Failed to load debug data:', error);
    }
  };

  const loadDebugBreakpoints = async () => {
    if (!activeFile) return;

    try {
      const result = await window.electronAPI.debugGetBreakpoints(activeFile);
      if (result.success) {
        setDebugBreakpoints(result.breakpoints);
      }
    } catch (error) {
      console.error('Failed to load breakpoints:', error);
    }
  };

  const stopLanguageServer = async (language) => {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      return;
    }

    try {
      const result = await window.electronAPI.lspStop(language);
      if (result.success) {
        setLspServers(prev => {
          const newServers = { ...prev };
          delete newServers[language];
          return newServers;
        });
      } else {
        console.error('Failed to stop LSP server:', result.error);
      }
    } catch (error) {
      console.error('Error stopping LSP server:', error);
    }
  };

  const handleFileSave = async (filePath, content) => {
    // Update local state
    setFiles(prev => ({
      ...prev,
      [filePath]: content
    }));

    // If we have a project path, save to disk
    if (projectPath) {
      try {
        const result = await window.electronAPI.saveFile(filePath, content);
        if (result.success) {
          // Update dirty state
          setDirtyFiles(prev => ({
            ...prev,
            [filePath]: false
          }));

          // Update last saved time
          setLastSavedTimes(prev => ({
            ...prev,
            [filePath]: new Date().toISOString()
          }));

          // Add to recent files
          const fullPath = result.path;
          window.electronAPI.saveRecentFile(fullPath);
        }
      } catch (error) {
        console.error('Failed to save file:', error);
      }
    }
  };

  const handleDirtyChange = (filePath, isDirty) => {
    setDirtyFiles(prev => ({
      ...prev,
      [filePath]: isDirty
    }));
  };

  const handleSaveAs = async () => {
    if (!activeFile) {
      alert('No file is currently open');
      return;
    }

    const result = await window.electronAPI.saveAsDialog();
    if (result.success && result.path) {
      const content = files[activeFile] || '';
      // Save to the new location
      try {
        const fs = require('fs');
        fs.writeFileSync(result.path, content, 'utf8');
        alert(`File saved to: ${result.path}`);
        // Add to recent files
        window.electronAPI.saveRecentFile(result.path);
      } catch (error) {
        alert(`Failed to save file: ${error.message}`);
      }
    }
  };

  const handleSaveDialogSave = async () => {
    setSaveDialog({ isOpen: false, fileName: '', multiple: false, unsavedFiles: [] });

    const unsavedFiles = saveDialog.unsavedFiles.length > 0
      ? saveDialog.unsavedFiles
      : [activeFile].filter(Boolean);

    // Save all unsaved files
    for (const filePath of unsavedFiles) {
      const content = files[filePath] || '';
      await window.electronAPI.saveFile(filePath, content);
      setDirtyFiles(prev => ({
        ...prev,
        [filePath]: false
      }));
      setLastSavedTimes(prev => ({
        ...prev,
        [filePath]: new Date().toISOString()
      }));
    }

    // Allow window close after saving
    window.electronAPI.allowWindowClose();
  };

  const handleSaveDialogDontSave = () => {
    setSaveDialog({ isOpen: false, fileName: '', multiple: false, unsavedFiles: [] });
    // Allow window close without saving
    window.electronAPI.allowWindowClose();
  };

  const handleSaveDialogCancel = () => {
    setSaveDialog({ isOpen: false, fileName: '', multiple: false, unsavedFiles: [] });
    // Cancel window close
    window.electronAPI.cancelWindowClose();
  };

  const handleFileCreate = (filePath) => {
    setFiles(prev => ({
      ...prev,
      [filePath]: ''
    }));
    setActiveFile(filePath);
  };

  const handleFileDelete = async (filePath) => {
    try {
      const result = await window.electronAPI.deleteFile(filePath);
      if (result.success) {
        setFiles(prev => {
          const newFiles = { ...prev };
          delete newFiles[filePath];
          return newFiles;
        });

        // Clear active file if it was deleted
        if (activeFile === filePath) {
          setActiveFile(null);
        }
      } else {
        alert(`Failed to delete file: ${result.error}`);
      }
    } catch (error) {
      alert(`Error deleting file: ${error.message}`);
    }
  };

  const handleFileRename = async (oldPath, newPath) => {
    try {
      const result = await window.electronAPI.renameFile(oldPath, newPath);
      if (result.success) {
        setFiles(prev => {
          const newFiles = {};
          Object.entries(prev).forEach(([path, content]) => {
            if (path === oldPath) {
              newFiles[newPath] = content;
            } else {
              newFiles[path] = content;
            }
          });
          return newFiles;
        });

        // Update active file if needed
        if (activeFile === oldPath) {
          setActiveFile(newPath);
        }
      } else {
        alert(`Failed to rename file: ${result.error}`);
      }
    } catch (error) {
      alert(`Error renaming file: ${error.message}`);
    }
  };

  const handleFolderCreate = async (folderName, parentPath) => {
    try {
      const result = await window.electronAPI.createFolder(folderName, parentPath);
      if (!result.success) {
        alert(`Failed to create folder: ${result.error}`);
      }
      // Refresh project files after folder creation
      if (projectPath) {
        const openResult = await window.electronAPI.openProject();
        if (openResult.success) {
          setFiles(openResult.files);
        }
      }
    } catch (error) {
      alert(`Error creating folder: ${error.message}`);
    }
  };

  const handleFilesUpdate = (updatedFiles) => {
    setFiles(updatedFiles);
  };

  const detectLanguageFromPrompt = (prompt, generatedCode) => {
    const lowerPrompt = prompt.toLowerCase();
    const lowerCode = generatedCode.toLowerCase();
    
    // Check for HTML/website keywords
    if (lowerPrompt.includes('website') || lowerPrompt.includes('web page') || 
        lowerPrompt.includes('html') || lowerCode.includes('<!doctype') || 
        lowerCode.includes('<html') || lowerCode.includes('<body')) {
      return 'html';
    }
    
    // Check for CSS
    if (lowerPrompt.includes('css') || lowerPrompt.includes('stylesheet') ||
        lowerCode.includes('@media') || lowerCode.includes('background:')) {
      return 'css';
    }
    
    // Check for Python
    if (lowerPrompt.includes('python') || lowerCode.includes('def ') || 
        lowerCode.includes('import ') || lowerCode.includes('print(')) {
      return 'python';
    }
    
    // Check for JavaScript
    if (lowerPrompt.includes('javascript') || lowerPrompt.includes('js') ||
        lowerCode.includes('function') || lowerCode.includes('const ') || 
        lowerCode.includes('let ') || lowerCode.includes('=>')) {
      return 'javascript';
    }
    
    // Check for TypeScript
    if (lowerPrompt.includes('typescript') || lowerPrompt.includes('ts') ||
        lowerCode.includes('interface ') || lowerCode.includes(': string')) {
      return 'typescript';
    }
    
    // Default to current language or javascript
    return language || 'javascript';
  };

  const handleCodeGenerated = async (result) => {
    logger.info('Code generated', { isMultiFile: result.isMultiFile });
    // Store previous versions before updating for change tracking
    const updateFileVersions = (fileList) => {
      setFileVersions(prev => {
        const newVersions = { ...prev };
        Object.keys(fileList).forEach(fileName => {
          if (files[fileName] !== undefined) {
            newVersions[fileName] = files[fileName];
          }
        });
        return newVersions;
      });
    };
    
    // Handle multiple files if generated
    if (result.files && result.isMultiFile) {
      const newFiles = {};
      
      // Track previous versions
      updateFileVersions(result.files);
      
      // Add all generated files to state
      Object.entries(result.files).forEach(([fileName, content]) => {
        newFiles[fileName] = content;
      });
      
      setFiles(prev => ({
        ...prev,
        ...newFiles
      }));
      
      // Open the first file (usually index.html for websites)
      const firstFile = Object.keys(newFiles)[0];
      if (firstFile) {
        const ext = firstFile.split('.').pop();
        const langMap = {
          'js': 'javascript',
          'html': 'html',
          'css': 'css',
          'ts': 'typescript',
          'py': 'python',
          'java': 'java',
          'cpp': 'cpp',
          'c': 'c'
        };
        setLanguage(langMap[ext] || 'javascript');
        setActiveFile(firstFile);
      }
      
      // Auto-save all files to project folder
      if (projectPath) {
        try {
          for (const [fileName, content] of Object.entries(newFiles)) {
            const saveResult = await window.electronAPI.saveFile(fileName, content);
            if (saveResult.success) {
              console.log(`File auto-saved: ${fileName} -> ${saveResult.path}`);
            }
          }
        } catch (error) {
          console.error('Failed to auto-save files:', error);
        }
      }
    } else {
      // Single file generation (backward compatibility)
      const generatedCode = result.code || result;
      const prompt = result.prompt || '';
      
      // Detect language from prompt and generated code
      const detectedLang = detectLanguageFromPrompt(prompt, generatedCode);
      setLanguage(detectedLang);
      
      // Determine file name based on detected language
      const getDefaultFileName = (lang) => {
        const extensions = {
          javascript: 'index.js',
          typescript: 'index.ts',
          python: 'main.py',
          java: 'Main.java',
          cpp: 'main.cpp',
          c: 'main.c',
          html: 'index.html',
          css: 'style.css'
        };
        return extensions[lang] || 'generated.js';
      };
      
      const fileName = activeFile || getDefaultFileName(detectedLang);
      
      // Track previous version
      if (files[fileName] !== undefined) {
        setFileVersions(prev => ({
          ...prev,
          [fileName]: files[fileName]
        }));
      }
      
      setFiles(prev => ({
        ...prev,
        [fileName]: generatedCode
      }));
      setActiveFile(fileName);
      
      // Auto-save to project folder if project is open
      if (projectPath) {
        try {
          const saveResult = await window.electronAPI.saveFile(fileName, generatedCode);
          if (saveResult.success) {
            console.log(`File auto-saved to: ${saveResult.path}`);
          }
        } catch (error) {
          console.error('Failed to auto-save file:', error);
        }
      }
    }
  };

  const handleEditorContentChange = (filePath, content) => {
    // Track previous version for change highlighting
    if (!fileVersions[filePath]) {
      setFileVersions(prev => ({
        ...prev,
        [filePath]: files[filePath] || ''
      }));
    }
    
    setFiles(prev => ({
      ...prev,
      [filePath]: content
    }));
  };

  const handleNewProject = async () => {
    const result = await window.electronAPI.newProject();
    if (result.success && result.path) {
      setProjectPath(result.path);
      // Load existing files if any
      if (result.files && Object.keys(result.files).length > 0) {
        setFiles(result.files);
        const firstFile = Object.keys(result.files)[0];
        if (firstFile) {
          handleFileSelect(firstFile, result.files[firstFile]);
        }
      } else {
        setFiles({});
        setActiveFile(null);
      }
    }
  };

  const handleOpenProject = async () => {
    logger.info('Open project requested');
    const result = await window.electronAPI.openProject();
    logger.debug('Open project result', { success: result.success, cancelled: result.cancelled, path: result.path });
    if (result.success) {
      setProjectPath(result.path);
      if (result.files && Object.keys(result.files).length > 0) {
        logger.info(`Loaded ${Object.keys(result.files).length} files from project`);
        setFiles(result.files);
        // Open first file if available
        const firstFile = Object.keys(result.files)[0];
        if (firstFile) {
          handleFileSelect(firstFile, result.files[firstFile]);
        }
      } else {
        logger.warn('No files found in project folder', { path: result.path });
        setFiles({});
      }
    } else if (!result.cancelled) {
      logger.error('Failed to open project', { error: result.error });
    }
  };

  const handleSaveProject = async () => {
    if (Object.keys(files).length === 0) {
      logger.warn('Save project attempted with no files');
      alert('No files to save');
      return;
    }
    logger.info('Save project requested', { fileCount: Object.keys(files).length });
    const result = await window.electronAPI.saveProject(files);
    if (result.success) {
      setProjectPath(result.path);
      logger.info('Project saved successfully', { path: result.path });
      alert(`Project saved to: ${result.path}`);
    } else if (!result.cancelled) {
      logger.error('Failed to save project', { error: result.error });
      alert(`Failed to save project: ${result.error}`);
    }
  };

  const handleRunCode = async (editorContent) => {
    // Use the currently open file in the editor
    if (!activeFile) {
      alert('No file is currently open. Please open a file to run.');
      return;
    }

    if (!projectPath) {
      alert('Please select a project folder first (New Project or Open Project)');
      return;
    }

    // Use the content from the editor if provided, otherwise fall back to files state
    const currentCode = editorContent || files[activeFile] || '';
    if (!currentCode.trim()) {
      alert('The current file is empty. Nothing to run.');
      return;
    }

    // Update files state with the latest content from editor
    if (editorContent && editorContent !== files[activeFile]) {
      setFiles(prev => ({
        ...prev,
        [activeFile]: editorContent
      }));
    }

    // Detect language from file extension if not already set
    let detectedLanguage = language;
    if (!detectedLanguage || detectedLanguage === 'javascript') {
      const ext = activeFile.split('.').pop()?.toLowerCase();
      const langMap = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'html': 'html',
        'css': 'css'
      };
      detectedLanguage = langMap[ext] || 'javascript';
    }

    // Ensure the file is saved before running
    try {
      await window.electronAPI.saveFile(activeFile, currentCode);
    } catch (error) {
      console.warn('Failed to save file before running:', error);
    }

    // Debug logging
    console.log('Running file:', {
      activeFile,
      projectPath,
      language: detectedLanguage,
      filePathLength: activeFile.length
    });

    try {
      const result = await window.electronAPI.runCode(activeFile, detectedLanguage, currentCode);
      if (result.success) {
        // Show output in a non-blocking modal
        const output = result.output || result.stdout || 'Code executed successfully!';
        setOutputModal({
          isOpen: true,
          title: 'Code Execution Output',
          message: output,
          isError: false
        });
      } else {
        const errorMsg = result.error || result.stderr || 'Execution failed';
        setOutputModal({
          isOpen: true,
          title: 'Execution Error',
          message: errorMsg,
          isError: true
        });
      }
    } catch (error) {
      setOutputModal({
        isOpen: true,
        title: 'Execution Failed',
        message: error.message,
        isError: true
      });
    }
  };

  const handleSnippetSelect = (snippet) => {
    if (!activeFile) {
      alert('Please open a file first to insert snippets');
      return;
    }
    console.log('Snippet selected:', snippet);
    // Snippet will be inserted via Editor component's internal handling
  };

  // Listen for menu actions
  useEffect(() => {
    if (projectPath && terminals.length === 0) {
      // Auto-create terminal when project is opened
      handleCreateTerminal();
    }
  }, [projectPath]);

  // Listen for menu actions
  useEffect(() => {
    const handleSaveRequest = () => handleSaveProject();
    // Note: Menu actions are handled in main process, but we can add IPC listeners if needed
    return () => {
      // Cleanup if needed
    };
  }, [files]);

  return (
    <div className="app-container">
      <div className="sidebar">
        <FileExplorer
          files={files}
          onFileSelect={handleFileSelect}
          onFileCreate={handleFileCreate}
          onFileDelete={handleFileDelete}
          onFileRename={handleFileRename}
          onFolderCreate={handleFolderCreate}
          activeFile={activeFile}
          projectPath={projectPath}
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
          onSaveProject={handleSaveProject}
          onFilesUpdate={handleFilesUpdate}
        />
      </div>
      <div className="main-content">
        <div className="editor-container">
          <div className="editor-tabs-container">
            <div className="editor-tab-bar">
              <button
                className={`editor-tab-button ${activeTab === 'editor' ? 'active' : ''}`}
                onClick={() => setActiveTab('editor')}
              >
                📝 Editor
              </button>
              <button
                className={`editor-tab-button ${activeTab === 'deliberation' ? 'active' : ''}`}
                onClick={() => setActiveTab('deliberation')}
              >
                🤖 Deliberation
              </button>
            </div>
          </div>
          {activeTab === 'editor' ? (
            activeFile ? (
              <Editor
                filePath={activeFile}
                content={files[activeFile] || ''}
                previousContent={fileVersions[activeFile]}
                language={language}
                onSave={handleFileSave}
                onContentChange={(content) => handleEditorContentChange(activeFile, content)}
                onRun={handleRunCode}
                isDirty={dirtyFiles[activeFile] || false}
                onDirtyChange={(isDirty) => handleDirtyChange(activeFile, isDirty)}
                onSnippetInsert={handleSnippetSelect}
                debugSession={debugSession}
                onBreakpointToggle={handleBreakpointToggle}
                onBreakpointRemove={handleBreakpointRemove}
              />
            ) : (
              <div className="welcome-screen">
                <h1>PolyCode IDE</h1>
                <p>AI-Powered IDE with Multi-Model Deliberation</p>
                <p className="status">
                  {isConnected ? '✓ Connected to LMStudio' : '✗ LMStudio not connected'}
                </p>
                <p className="hint">Open a file or create a new one to get started</p>
              </div>
            )
          ) : (
            <DeliberationChat
              messages={deliberationMessages}
              isActive={activeTab === 'deliberation'}
            />
          )}
        </div>
        <DebugToolbar
          debugSession={debugSession}
          onStartDebug={handleDebugStart}
          onStopDebug={handleDebugStop}
          onPause={handleDebugPause}
          onResume={handleDebugResume}
          onStepOver={handleDebugStepOver}
          onStepInto={handleDebugStepInto}
          onStepOut={handleDebugStepOut}
          onContinue={handleDebugContinue}
        />
        <AIPanel
          activeFile={activeFile}
          code={activeFile ? files[activeFile] : ''}
          language={language}
          models={models}
          isConnected={isConnected}
          files={files}
          onCodeGenerated={handleCodeGenerated}
          onDeliberationUpdate={(messages) => setDeliberationMessages(messages)}
        />
      </div>
      <StatusBar
        language={language}
        isConnected={isConnected}
        activeFile={activeFile}
        isDirty={dirtyFiles[activeFile] || false}
        lastSaved={lastSavedTimes[activeFile]}
        lspStatus={lspServers[language]?.status || 'disconnected'}
        onSettingsClick={() => setShowSettings(true)}
        onQualityMetricsClick={handleEvaluateCode}
        onRubricEditorClick={() => setShowRubricEditor(true)}
      />
      <Settings
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          // Reload connection status after settings change
          checkConnection();
        }}
      />
      <OutputModal
        isOpen={outputModal.isOpen}
        title={outputModal.title}
        message={outputModal.message}
        isError={outputModal.isError}
        onClose={() => setOutputModal({ isOpen: false, title: '', message: '', isError: false })}
      />
      <SaveDialog
        isOpen={saveDialog.isOpen}
        fileName={saveDialog.fileName}
        multipleFiles={saveDialog.multiple}
        unsavedFiles={saveDialog.unsavedFiles}
        onSave={handleSaveDialogSave}
        onDontSave={handleSaveDialogDontSave}
        onCancel={handleSaveDialogCancel}
      />
      {showTerminal && (
        <TerminalPanel
          terminals={terminals}
          activeTerminalId={activeTerminalId}
          onTerminalSelect={handleTerminalSelect}
          onTerminalClose={handleTerminalClose}
          onTerminalCreate={handleCreateTerminal}
          electronAPI={window.electronAPI}
        />
      )}
      {showSnippetPanel && (
        <SnippetPanel
          isOpen={showSnippetPanel}
          onClose={() => setShowSnippetPanel(false)}
          currentLanguage={language}
          onSnippetSelect={handleSnippetSelect}
          editorRef={editorRef}
        />
      )}
      {showQualityMetrics && (
        <div className="modal-overlay" onClick={() => setShowQualityMetrics(false)}>
          <div className="modal-content quality-metrics-modal" onClick={(e) => e.stopPropagation()}>
            <QualityMetrics
              evaluation={evaluationData}
              history={evaluationHistory}
              onClose={() => setShowQualityMetrics(false)}
            />
          </div>
        </div>
      )}
      {showRubricEditor && (
        <RubricEditor
          onClose={() => setShowRubricEditor(false)}
          onSave={handleRubricSave}
        />
      )}
      {showDebugPanel && (
        <div className="modal-overlay debug-panel-overlay" onClick={() => setShowDebugPanel(false)}>
          <div className="modal-content debug-panel-modal" onClick={(e) => e.stopPropagation()}>
            <DebugPanel
              debugSession={debugSession}
              variables={debugVariables}
              callStack={debugCallStack}
              breakpoints={debugBreakpoints}
              watchExpressions={debugWatchExpressions}
              onPause={handleDebugPause}
              onResume={handleDebugResume}
              onStepOver={handleDebugStepOver}
              onStepInto={handleDebugStepInto}
              onStepOut={handleDebugStepOut}
              onContinue={handleDebugContinue}
              onBreakpointRemove={handleBreakpointRemove}
              onWatchAdd={handleDebugWatchAdd}
              onWatchRemove={handleDebugWatchRemove}
              onClose={() => setShowDebugPanel(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);

