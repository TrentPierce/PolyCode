// Reducers for state management
// This file exports reducer functions that can be used for external state transformations
// Note: Zustand uses actions for state updates, but reducers are provided for compatibility

import { ActionTypes } from './index';

// ==================== Settings Reducer ====================
export const settingsReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_THEME:
      return {
        ...state,
        settings: {
          ...state.settings,
          theme: action.payload
        }
      };

    case ActionTypes.SET_LANGUAGE:
      return {
        ...state,
        settings: {
          ...state.settings,
          language: action.payload
        }
      };

    case ActionTypes.SET_EDITOR_CONFIG:
      return {
        ...state,
        settings: {
          ...state.settings,
          editorConfig: {
            ...state.settings.editorConfig,
            ...action.payload
          }
        }
      };

    case ActionTypes.SET_AUTO_SAVE_INTERVAL:
      return {
        ...state,
        settings: {
          ...state.settings,
          autoSaveInterval: action.payload
        }
      };

    case ActionTypes.SET_LMSTUDIO_URL:
      return {
        ...state,
        settings: {
          ...state.settings,
          lmstudioUrl: action.payload
        }
      };

    case ActionTypes.SET_SELECTED_MODELS:
      return {
        ...state,
        settings: {
          ...state.settings,
          selectedModels: action.payload
        }
      };

    case ActionTypes.RESET_SETTINGS:
      const getInitialState = require('./index').getInitialState;
      return {
        ...state,
        settings: getInitialState().settings
      };

    default:
      return state;
  }
};

// ==================== Files Reducer ====================
export const filesReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_ACTIVE_FILE:
      return {
        ...state,
        files: {
          ...state.files,
          activeFile: action.payload
        }
      };

    case ActionTypes.SET_FILE_CONTENT:
      return {
        ...state,
        files: {
          ...state.files,
          fileContents: {
            ...state.files.fileContents,
            [action.payload.filePath]: action.payload.content
          }
        }
      };

    case ActionTypes.CREATE_FILE:
      return {
        ...state,
        files: {
          ...state.files,
          fileContents: {
            ...state.files.fileContents,
            [action.payload]: ''
          },
          openFiles: state.files.openFiles.includes(action.payload)
            ? state.files.openFiles
            : [...state.files.openFiles, action.payload]
        }
      };

    case ActionTypes.DELETE_FILE:
      const newFileContents = { ...state.files.fileContents };
      const newDirtyFiles = { ...state.files.dirtyFiles };
      const newLastSavedTimes = { ...state.files.lastSavedTimes };
      const newUnsavedChanges = { ...state.files.unsavedChanges };

      delete newFileContents[action.payload];
      delete newDirtyFiles[action.payload];
      delete newLastSavedTimes[action.payload];
      delete newUnsavedChanges[action.payload];

      return {
        ...state,
        files: {
          ...state.files,
          fileContents: newFileContents,
          dirtyFiles: newDirtyFiles,
          lastSavedTimes: newLastSavedTimes,
          unsavedChanges: newUnsavedChanges,
          openFiles: state.files.openFiles.filter(f => f !== action.payload),
          activeFile: state.files.activeFile === action.payload ? null : state.files.activeFile
        }
      };

    case ActionTypes.RENAME_FILE:
      const { oldPath, newPath } = action.payload;
      const renamedFileContents = { ...state.files.fileContents };
      const renamedDirtyFiles = { ...state.files.dirtyFiles };
      const renamedLastSavedTimes = { ...state.files.lastSavedTimes };
      const renamedUnsavedChanges = { ...state.files.unsavedChanges };

      if (renamedFileContents[oldPath] !== undefined) {
        renamedFileContents[newPath] = renamedFileContents[oldPath];
        delete renamedFileContents[oldPath];
      }

      if (renamedDirtyFiles[oldPath] !== undefined) {
        renamedDirtyFiles[newPath] = renamedDirtyFiles[oldPath];
        delete renamedDirtyFiles[oldPath];
      }

      if (renamedLastSavedTimes[oldPath] !== undefined) {
        renamedLastSavedTimes[newPath] = renamedLastSavedTimes[oldPath];
        delete renamedLastSavedTimes[oldPath];
      }

      if (renamedUnsavedChanges[oldPath] !== undefined) {
        renamedUnsavedChanges[newPath] = renamedUnsavedChanges[oldPath];
        delete renamedUnsavedChanges[oldPath];
      }

      return {
        ...state,
        files: {
          ...state.files,
          fileContents: renamedFileContents,
          dirtyFiles: renamedDirtyFiles,
          lastSavedTimes: renamedLastSavedTimes,
          unsavedChanges: renamedUnsavedChanges,
          openFiles: state.files.openFiles.map(f => f === oldPath ? newPath : f),
          activeFile: state.files.activeFile === oldPath ? newPath : state.files.activeFile
        }
      };

    case ActionTypes.SAVE_FILE:
      return {
        ...state,
        files: {
          ...state.files,
          fileContents: {
            ...state.files.fileContents,
            [action.payload.filePath]: action.payload.content
          },
          dirtyFiles: {
            ...state.files.dirtyFiles,
            [action.payload.filePath]: false
          },
          lastSavedTimes: {
            ...state.files.lastSavedTimes,
            [action.payload.filePath]: new Date().toISOString()
          }
        }
      };

    case ActionTypes.MARK_UNSAVED:
      return {
        ...state,
        files: {
          ...state.files,
          dirtyFiles: {
            ...state.files.dirtyFiles,
            [action.payload.filePath]: action.payload.isDirty
          }
        }
      };

    case ActionTypes.CLEAR_UNSAVED:
      return {
        ...state,
        files: {
          ...state.files,
          dirtyFiles: {
            ...state.files.dirtyFiles,
            [action.payload]: false
          }
        }
      };

    case ActionTypes.SET_FILE_VERSIONS:
      return {
        ...state,
        files: {
          ...state.files,
          fileVersions: {
            ...state.files.fileVersions,
            ...action.payload
          }
        }
      };

    case ActionTypes.ADD_RECENT_FILE:
      const filteredRecents = state.files.recentFiles.filter(f => f !== action.payload);
      return {
        ...state,
        files: {
          ...state.files,
          recentFiles: [action.payload, ...filteredRecents].slice(0, 20)
        }
      };

    case ActionTypes.SET_RECENT_FILES:
      return {
        ...state,
        files: {
          ...state.files,
          recentFiles: action.payload || []
        }
      };

    default:
      return state;
  }
};

// ==================== AI Reducer ====================
export const aiReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_MODELS:
      return {
        ...state,
        ai: {
          ...state.ai,
          models: action.payload
        }
      };

    case ActionTypes.SET_CHAT_HISTORY:
      return {
        ...state,
        ai: {
          ...state.ai,
          chatHistory: action.payload
        }
      };

    case ActionTypes.ADD_CHAT_MESSAGE:
      return {
        ...state,
        ai: {
          ...state.ai,
          chatHistory: [...state.ai.chatHistory, action.payload]
        }
      };

    case ActionTypes.CLEAR_CHAT_HISTORY:
      return {
        ...state,
        ai: {
          ...state.ai,
          chatHistory: []
        }
      };

    case ActionTypes.SET_CURRENT_PROMPT:
      return {
        ...state,
        ai: {
          ...state.ai,
          currentPrompt: action.payload
        }
      };

    case ActionTypes.SET_CURRENT_INSTRUCTION:
      return {
        ...state,
        ai: {
          ...state.ai,
          currentInstruction: action.payload
        }
      };

    case ActionTypes.SET_GENERATED_CODE:
      return {
        ...state,
        ai: {
          ...state.ai,
          generatedCode: action.payload
        }
      };

    case ActionTypes.SET_DELIBERATION_MESSAGES:
      return {
        ...state,
        ai: {
          ...state.ai,
          deliberationMessages: action.payload
        }
      };

    case ActionTypes.SET_AI_LOADING:
      return {
        ...state,
        ai: {
          ...state.ai,
          loading: action.payload
        }
      };

    case ActionTypes.SET_AI_ERROR:
      return {
        ...state,
        ai: {
          ...state.ai,
          error: action.payload
        }
      };

    case ActionTypes.SET_AI_RESULT:
      return {
        ...state,
        ai: {
          ...state.ai,
          result: action.payload
        }
      };

    case ActionTypes.SET_AI_MODE:
      return {
        ...state,
        ai: {
          ...state.ai,
          mode: action.payload
        }
      };

    case ActionTypes.SET_AI_PHASE:
      return {
        ...state,
        ai: {
          ...state.ai,
          currentPhase: action.payload
        }
      };

    case ActionTypes.SET_AI_PROGRESS:
      return {
        ...state,
        ai: {
          ...state.ai,
          progressPercent: action.payload
        }
      };

    case ActionTypes.SET_AI_CONNECTED:
      return {
        ...state,
        ai: {
          ...state.ai,
          isConnected: action.payload
        }
      };

    default:
      return state;
  }
};

// ==================== Project Reducer ====================
export const projectReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_PROJECT_PATH:
      return {
        ...state,
        project: {
          ...state.project,
          projectPath: action.payload
        }
      };

    case ActionTypes.SET_GIT_BRANCH:
      return {
        ...state,
        project: {
          ...state.project,
          gitBranch: action.payload
        }
      };

    case ActionTypes.SET_LAST_COMMIT:
      return {
        ...state,
        project: {
          ...state.project,
          lastCommit: action.payload
        }
      };

    default:
      return state;
  }
};

// ==================== Editor Reducer ====================
export const editorReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_FONT_SIZE:
      return {
        ...state,
        editor: {
          ...state.editor,
          fontSize: action.payload
        },
        settings: {
          ...state.settings,
          editorConfig: {
            ...state.settings.editorConfig,
            fontSize: action.payload
          }
        }
      };

    case ActionTypes.SET_FONT_FAMILY:
      return {
        ...state,
        editor: {
          ...state.editor,
          fontFamily: action.payload
        },
        settings: {
          ...state.settings,
          editorConfig: {
            ...state.settings.editorConfig,
            fontFamily: action.payload
          }
        }
      };

    case ActionTypes.SET_TAB_SIZE:
      return {
        ...state,
        editor: {
          ...state.editor,
          tabSize: action.payload
        },
        settings: {
          ...state.settings,
          editorConfig: {
            ...state.settings.editorConfig,
            tabSize: action.payload
          }
        }
      };

    case ActionTypes.SET_WORD_WRAP:
      return {
        ...state,
        editor: {
          ...state.editor,
          wordWrap: action.payload
        },
        settings: {
          ...state.settings,
          editorConfig: {
            ...state.settings.editorConfig,
            wordWrap: action.payload
          }
        }
      };

    case ActionTypes.SET_MINIMAP:
      return {
        ...state,
        editor: {
          ...state.editor,
          minimap: action.payload
        },
        settings: {
          ...state.settings,
          editorConfig: {
            ...state.settings.editorConfig,
            minimap: action.payload
          }
        }
      };

    case ActionTypes.SET_LINE_NUMBERS:
      return {
        ...state,
        editor: {
          ...state.editor,
          lineNumbers: action.payload
        },
        settings: {
          ...state.settings,
          editorConfig: {
            ...state.settings.editorConfig,
            lineNumbers: action.payload
          }
        }
      };

    case ActionTypes.SET_AUTO_CLOSING_BRACKETS:
      return {
        ...state,
        editor: {
          ...state.editor,
          autoClosingBrackets: action.payload
        },
        settings: {
          ...state.settings,
          editorConfig: {
            ...state.settings.editorConfig,
            autoClosingBrackets: action.payload
          }
        }
      };

    case ActionTypes.SET_AUTO_INDENT:
      return {
        ...state,
        editor: {
          ...state.editor,
          autoIndent: action.payload
        },
        settings: {
          ...state.settings,
          editorConfig: {
            ...state.settings.editorConfig,
            autoIndent: action.payload
          }
        }
      };

    case ActionTypes.SET_FORMAT_ON_SAVE:
      return {
        ...state,
        editor: {
          ...state.editor,
          formatOnSave: action.payload
        },
        settings: {
          ...state.settings,
          editorConfig: {
            ...state.settings.editorConfig,
            formatOnSave: action.payload
          }
        }
      };

    default:
      return state;
  }
};

// ==================== UI Reducer ====================
export const uiReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.TOGGLE_TERMINAL:
      return {
        ...state,
        ui: {
          ...state.ui,
          showTerminal: !state.ui.showTerminal
        }
      };

    case ActionTypes.TOGGLE_SNIPPET_PANEL:
      return {
        ...state,
        ui: {
          ...state.ui,
          showSnippetPanel: !state.ui.showSnippetPanel
        }
      };

    case ActionTypes.TOGGLE_DEBUG_PANEL:
      return {
        ...state,
        ui: {
          ...state.ui,
          showDebugPanel: !state.ui.showDebugPanel
        }
      };

    case ActionTypes.TOGGLE_QUALITY_PANEL:
      return {
        ...state,
        ui: {
          ...state.ui,
          showQualityPanel: !state.ui.showQualityPanel
        }
      };

    case ActionTypes.SET_SIDEBAR_VISIBLE:
      return {
        ...state,
        ui: {
          ...state.ui,
          sidebarVisible: action.payload
        }
      };

    case ActionTypes.SET_SHOW_SETTINGS:
      return {
        ...state,
        ui: {
          ...state.ui,
          showSettings: action.payload
        }
      };

    case ActionTypes.SET_SHOW_SHORTCUTS:
      return {
        ...state,
        ui: {
          ...state.ui,
          showShortcuts: action.payload
        }
      };

    case ActionTypes.SET_SHOW_RUBRIC_EDITOR:
      return {
        ...state,
        ui: {
          ...state.ui,
          showRubricEditor: action.payload
        }
      };

    case ActionTypes.SET_ACTIVE_TAB:
      return {
        ...state,
        ui: {
          ...state.ui,
          activeTab: action.payload
        }
      };

    case ActionTypes.SET_OUTPUT_MODAL:
      return {
        ...state,
        ui: {
          ...state.ui,
          outputModal: action.payload
        }
      };

    case ActionTypes.SET_SAVE_DIALOG:
      return {
        ...state,
        ui: {
          ...state.ui,
          saveDialog: action.payload
        }
      };

    case ActionTypes.SET_TERMINALS:
      return {
        ...state,
        ui: {
          ...state.ui,
          terminals: action.payload
        }
      };

    case ActionTypes.SET_ACTIVE_TERMINAL_ID:
      return {
        ...state,
        ui: {
          ...state.ui,
          activeTerminalId: action.payload
        }
      };

    case ActionTypes.SET_LSP_SERVERS:
      return {
        ...state,
        ui: {
          ...state.ui,
          lspServers: action.payload
        }
      };

    case ActionTypes.SET_EVALUATION_DATA:
      return {
        ...state,
        ui: {
          ...state.ui,
          evaluationData: action.payload
        }
      };

    case ActionTypes.SET_EVALUATION_HISTORY:
      return {
        ...state,
        ui: {
          ...state.ui,
          evaluationHistory: action.payload
        }
      };

    default:
      return state;
  }
};

// ==================== Debug Reducer ====================
export const debugReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_DEBUG_SESSION:
      return {
        ...state,
        debug: {
          ...state.debug,
          debugSession: action.payload
        }
      };

    case ActionTypes.ADD_BREAKPOINT:
      const { filePath, line } = action.payload;
      const existingBreakpoints = state.debug.breakpoints[filePath] || [];
      return {
        ...state,
        debug: {
          ...state.debug,
          breakpoints: {
            ...state.debug.breakpoints,
            [filePath]: existingBreakpoints.includes(line)
              ? existingBreakpoints
              : [...existingBreakpoints, line]
          }
        }
      };

    case ActionTypes.REMOVE_BREAKPOINT:
      const { filePath: fp, line: ln } = action.payload;
      const fileBreakpoints = state.debug.breakpoints[fp] || [];
      return {
        ...state,
        debug: {
          ...state.debug,
          breakpoints: {
            ...state.debug.breakpoints,
            [fp]: fileBreakpoints.filter(l => l !== ln)
          }
        }
      };

    case ActionTypes.PAUSE_DEBUG:
      return {
        ...state,
        debug: {
          ...state.debug,
          paused: true
        }
      };

    case ActionTypes.RESUME_DEBUG:
      return {
        ...state,
        debug: {
          ...state.debug,
          paused: false
        }
      };

    case ActionTypes.STOP_DEBUG:
      return {
        ...state,
        debug: {
          ...state.debug,
          debugSession: null,
          paused: false,
          currentLine: null,
          variables: {},
          callStack: []
        }
      };

    case ActionTypes.SET_DEBUG_VARIABLES:
      return {
        ...state,
        debug: {
          ...state.debug,
          variables: action.payload
        }
      };

    case ActionTypes.SET_DEBUG_CALL_STACK:
      return {
        ...state,
        debug: {
          ...state.debug,
          callStack: action.payload
        }
      };

    case ActionTypes.SET_DEBUG_PAUSED:
      return {
        ...state,
        debug: {
          ...state.debug,
          paused: action.payload
        }
      };

    case ActionTypes.SET_DEBUG_CURRENT_LINE:
      return {
        ...state,
        debug: {
          ...state.debug,
          currentLine: action.payload
        }
      };

    default:
      return state;
  }
};

// ==================== Root Reducer ====================
// Combines all reducers into a root reducer
export const rootReducer = (state, action) => {
  const newState = settingsReducer(state, action);
  const newFilesState = filesReducer(newState, action);
  const newAIState = aiReducer(newFilesState, action);
  const newProjectState = projectReducer(newAIState, action);
  const newEditorState = editorReducer(newProjectState, action);
  const newUIState = uiReducer(newEditorState, action);
  const newDebugState = debugReducer(newUIState, action);

  return newDebugState;
};

// Export all reducers
export default rootReducer;

// Export reducer map for easy access
export const reducers = {
  settings: settingsReducer,
  files: filesReducer,
  ai: aiReducer,
  project: projectReducer,
  editor: editorReducer,
  ui: uiReducer,
  debug: debugReducer
};
