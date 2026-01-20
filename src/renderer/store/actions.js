// Action creators exported from the store
// This file provides a convenient way to import actions without importing the whole store

import {
  useStore,
  ActionTypes
} from './index';

// ==================== Settings Actions ====================
export const setTheme = (theme) => {
  useStore.getState().setTheme(theme);
  return ActionTypes.SET_THEME;
};

export const setLanguage = (language) => {
  useStore.getState().setLanguage(language);
  return ActionTypes.SET_LANGUAGE;
};

export const setEditorConfig = (config) => {
  useStore.getState().setEditorConfig(config);
  return ActionTypes.SET_EDITOR_CONFIG;
};

export const setAutoSaveInterval = (interval) => {
  useStore.getState().setAutoSaveInterval(interval);
  return ActionTypes.SET_AUTO_SAVE_INTERVAL;
};

export const setLmstudioUrl = (url) => {
  useStore.getState().setLmstudioUrl(url);
  return ActionTypes.SET_LMSTUDIO_URL;
};

export const setSelectedModels = (models) => {
  useStore.getState().setSelectedModels(models);
  return ActionTypes.SET_SELECTED_MODELS;
};

export const resetSettings = () => {
  useStore.getState().resetSettings();
  return ActionTypes.RESET_SETTINGS;
};

// ==================== Files Actions ====================
export const setActiveFile = (filePath) => {
  useStore.getState().setActiveFile(filePath);
  return ActionTypes.SET_ACTIVE_FILE;
};

export const setFileContent = (filePath, content) => {
  useStore.getState().setFileContent(filePath, content);
  return ActionTypes.SET_FILE_CONTENT;
};

export const setFileContents = (contents) => {
  useStore.getState().setFileContents(contents);
  return ActionTypes.SET_FILE_CONTENT;
};

export const createFile = (filePath) => {
  useStore.getState().createFile(filePath);
  return ActionTypes.CREATE_FILE;
};

export const deleteFile = (filePath) => {
  useStore.getState().deleteFile(filePath);
  return ActionTypes.DELETE_FILE;
};

export const renameFile = (oldPath, newPath) => {
  useStore.getState().renameFile(oldPath, newPath);
  return ActionTypes.RENAME_FILE;
};

export const saveFile = (filePath, content) => {
  useStore.getState().saveFile(filePath, content);
  return ActionTypes.SAVE_FILE;
};

export const markUnsaved = (filePath, isDirty) => {
  useStore.getState().markUnsaved(filePath, isDirty);
  return ActionTypes.MARK_UNSAVED;
};

export const clearUnsaved = (filePath) => {
  useStore.getState().clearUnsaved(filePath);
  return ActionTypes.CLEAR_UNSAVED;
};

export const setFileVersions = (versions) => {
  useStore.getState().setFileVersions(versions);
  return ActionTypes.SET_FILE_VERSIONS;
};

export const addRecentFile = (filePath) => {
  useStore.getState().addRecentFile(filePath);
  return ActionTypes.ADD_RECENT_FILE;
};

export const setRecentFiles = (files) => {
  useStore.getState().setRecentFiles(files);
  return ActionTypes.SET_RECENT_FILES;
};

// ==================== AI Actions ====================
export const setModels = (models) => {
  useStore.getState().setModels(models);
  return ActionTypes.SET_MODELS;
};

export const setChatHistory = (history) => {
  useStore.getState().setChatHistory(history);
  return ActionTypes.SET_CHAT_HISTORY;
};

export const addChatMessage = (message) => {
  useStore.getState().addChatMessage(message);
  return ActionTypes.ADD_CHAT_MESSAGE;
};

export const clearChatHistory = () => {
  useStore.getState().clearChatHistory();
  return ActionTypes.CLEAR_CHAT_HISTORY;
};

export const setCurrentPrompt = (prompt) => {
  useStore.getState().setCurrentPrompt(prompt);
  return ActionTypes.SET_CURRENT_PROMPT;
};

export const setCurrentInstruction = (instruction) => {
  useStore.getState().setCurrentInstruction(instruction);
  return ActionTypes.SET_CURRENT_INSTRUCTION;
};

export const setGeneratedCode = (code) => {
  useStore.getState().setGeneratedCode(code);
  return ActionTypes.SET_GENERATED_CODE;
};

export const setDeliberationMessages = (messages) => {
  useStore.getState().setDeliberationMessages(messages);
  return ActionTypes.SET_DELIBERATION_MESSAGES;
};

export const setAiLoading = (loading) => {
  useStore.getState().setAiLoading(loading);
  return ActionTypes.SET_AI_LOADING;
};

export const setAiError = (error) => {
  useStore.getState().setAiError(error);
  return ActionTypes.SET_AI_ERROR;
};

export const setAiResult = (result) => {
  useStore.getState().setAiResult(result);
  return ActionTypes.SET_AI_RESULT;
};

export const setAiMode = (mode) => {
  useStore.getState().setAiMode(mode);
  return ActionTypes.SET_AI_MODE;
};

export const setAiPhase = (phase) => {
  useStore.getState().setAiPhase(phase);
  return ActionTypes.SET_AI_PHASE;
};

export const setAiProgress = (percent) => {
  useStore.getState().setAiProgress(percent);
  return ActionTypes.SET_AI_PROGRESS;
};

export const setAiConnected = (connected) => {
  useStore.getState().setAiConnected(connected);
  return ActionTypes.SET_AI_CONNECTED;
};

// ==================== Project Actions ====================
export const setProjectPath = (path) => {
  useStore.getState().setProjectPath(path);
  return ActionTypes.SET_PROJECT_PATH;
};

export const setGitBranch = (branch) => {
  useStore.getState().setGitBranch(branch);
  return ActionTypes.SET_GIT_BRANCH;
};

export const setLastCommit = (commit) => {
  useStore.getState().setLastCommit(commit);
  return ActionTypes.SET_LAST_COMMIT;
};

// ==================== Editor Actions ====================
export const setFontSize = (size) => {
  useStore.getState().setFontSize(size);
  return ActionTypes.SET_FONT_SIZE;
};

export const setFontFamily = (family) => {
  useStore.getState().setFontFamily(family);
  return ActionTypes.SET_FONT_FAMILY;
};

export const setTabSize = (size) => {
  useStore.getState().setTabSize(size);
  return ActionTypes.SET_TAB_SIZE;
};

export const setWordWrap = (wrap) => {
  useStore.getState().setWordWrap(wrap);
  return ActionTypes.SET_WORD_WRAP;
};

export const setMinimap = (enabled) => {
  useStore.getState().setMinimap(enabled);
  return ActionTypes.SET_MINIMAP;
};

export const setLineNumbers = (value) => {
  useStore.getState().setLineNumbers(value);
  return ActionTypes.SET_LINE_NUMBERS;
};

export const setAutoClosingBrackets = (enabled) => {
  useStore.getState().setAutoClosingBrackets(enabled);
  return ActionTypes.SET_AUTO_CLOSING_BRACKETS;
};

export const setAutoIndent = (value) => {
  useStore.getState().setAutoIndent(value);
  return ActionTypes.SET_AUTO_INDENT;
};

export const setFormatOnSave = (enabled) => {
  useStore.getState().setFormatOnSave(enabled);
  return ActionTypes.SET_FORMAT_ON_SAVE;
};

// ==================== UI Actions ====================
export const toggleTerminal = () => {
  useStore.getState().toggleTerminal();
  return ActionTypes.TOGGLE_TERMINAL;
};

export const toggleSnippetPanel = () => {
  useStore.getState().toggleSnippetPanel();
  return ActionTypes.TOGGLE_SNIPPET_PANEL;
};

export const toggleDebugPanel = () => {
  useStore.getState().toggleDebugPanel();
  return ActionTypes.TOGGLE_DEBUG_PANEL;
};

export const toggleQualityPanel = () => {
  useStore.getState().toggleQualityPanel();
  return ActionTypes.TOGGLE_QUALITY_PANEL;
};

export const setSidebarVisible = (visible) => {
  useStore.getState().setSidebarVisible(visible);
  return ActionTypes.SET_SIDEBAR_VISIBLE;
};

export const setShowSettings = (show) => {
  useStore.getState().setShowSettings(show);
  return ActionTypes.SET_SHOW_SETTINGS;
};

export const setShowShortcuts = (show) => {
  useStore.getState().setShowShortcuts(show);
  return ActionTypes.SET_SHOW_SHORTCUTS;
};

export const setShowRubricEditor = (show) => {
  useStore.getState().setShowRubricEditor(show);
  return ActionTypes.SET_SHOW_RUBRIC_EDITOR;
};

export const setActiveTab = (tab) => {
  useStore.getState().setActiveTab(tab);
  return ActionTypes.SET_ACTIVE_TAB;
};

export const setOutputModal = (modal) => {
  useStore.getState().setOutputModal(modal);
  return ActionTypes.SET_OUTPUT_MODAL;
};

export const setSaveDialog = (dialog) => {
  useStore.getState().setSaveDialog(dialog);
  return ActionTypes.SET_SAVE_DIALOG;
};

export const setTerminals = (terminals) => {
  useStore.getState().setTerminals(terminals);
  return ActionTypes.SET_TERMINALS;
};

export const addTerminal = (terminal) => {
  useStore.getState().addTerminal(terminal);
  return ActionTypes.SET_TERMINALS;
};

export const removeTerminal = (terminalId) => {
  useStore.getState().removeTerminal(terminalId);
  return ActionTypes.SET_TERMINALS;
};

export const setActiveTerminalId = (id) => {
  useStore.getState().setActiveTerminalId(id);
  return ActionTypes.SET_ACTIVE_TERMINAL_ID;
};

export const setLspServers = (servers) => {
  useStore.getState().setLspServers(servers);
  return ActionTypes.SET_LSP_SERVERS;
};

export const setEvaluationData = (data) => {
  useStore.getState().setEvaluationData(data);
  return ActionTypes.SET_EVALUATION_DATA;
};

export const setEvaluationHistory = (history) => {
  useStore.getState().setEvaluationHistory(history);
  return ActionTypes.SET_EVALUATION_HISTORY;
};

// ==================== Debug Actions ====================
export const setDebugSession = (session) => {
  useStore.getState().setDebugSession(session);
  return ActionTypes.SET_DEBUG_SESSION;
};

export const addBreakpoint = (filePath, line) => {
  useStore.getState().addBreakpoint(filePath, line);
  return ActionTypes.ADD_BREAKPOINT;
};

export const removeBreakpoint = (filePath, line) => {
  useStore.getState().removeBreakpoint(filePath, line);
  return ActionTypes.REMOVE_BREAKPOINT;
};

export const pauseDebug = () => {
  useStore.getState().pauseDebug();
  return ActionTypes.PAUSE_DEBUG;
};

export const resumeDebug = () => {
  useStore.getState().resumeDebug();
  return ActionTypes.RESUME_DEBUG;
};

export const stepDebug = (stepType) => {
  useStore.getState().stepDebug(stepType);
  return ActionTypes.STEP_DEBUG;
};

export const stopDebug = () => {
  useStore.getState().stopDebug();
  return ActionTypes.STOP_DEBUG;
};

export const setDebugVariables = (variables) => {
  useStore.getState().setDebugVariables(variables);
  return ActionTypes.SET_DEBUG_VARIABLES;
};

export const setDebugCallStack = (callStack) => {
  useStore.getState().setDebugCallStack(callStack);
  return ActionTypes.SET_DEBUG_CALL_STACK;
};

export const setDebugPaused = (paused) => {
  useStore.getState().setDebugPaused(paused);
  return ActionTypes.SET_DEBUG_PAUSED;
};

export const setDebugCurrentLine = (line) => {
  useStore.getState().setDebugCurrentLine(line);
  return ActionTypes.SET_DEBUG_CURRENT_LINE;
};

// Export all action types
export { ActionTypes };

// Export async actions
export { asyncActions } from './index';

// Export selectors
export { selectSettings, selectFiles, selectActiveFile, selectFileContent, selectAI, selectProject, selectEditor, selectUI, selectDebug } from './index';
