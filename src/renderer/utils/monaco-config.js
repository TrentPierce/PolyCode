/**
 * Monaco Editor Configuration Utilities
 *
 * Provides configuration, theming, and utility functions for Monaco Editor
 */

import monaco from '@monaco-editor/react';

/**
 * Default Monaco editor options
 */
export const DEFAULT_EDITOR_OPTIONS = {
  // Layout
  automaticLayout: true,
  scrollBeyondLastLine: false,
  roundedSelection: false,

  // Line numbers and gutter
  lineNumbers: 'on',
  glyphMargin: true,
  folding: true,
  foldingStrategy: 'indentation',
  showFoldingControls: 'always',
  lineDecorationsWidth: 10,
  lineNumbersMinChars: 4,

  // Minimap
  minimap: {
    enabled: true,
    showSlider: 'mouseover',
    renderCharacters: true,
    maxColumn: 120,
  },

  // Typography
  fontSize: 14,
  fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
  lineHeight: 21,
  letterSpacing: 0,

  // Indentation and spacing
  tabSize: 2,
  indentSize: 2,
  insertSpaces: true,
  detectIndentation: true,
  wordWrap: 'on',
  wordWrapColumn: 120,

  // Editing
  autoClosingBrackets: 'always',
  autoClosingQuotes: 'always',
  autoIndent: 'advanced',
  formatOnPaste: true,
  formatOnType: true,
  formatOnSave: true,

  // Cursor and selection
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  cursorStyle: 'line',
  multiCursorModifier: 'ctrlCmd',
  multiCursorPaste: 'spread',
  selectionHighlight: true,
  occurrencesHighlight: true,
  highlightActiveIndentGuide: true,
  bracketPairColorization: {
    enabled: true,
  },

  // Code lens and decorations
  codeLens: true,
  renderLineHighlight: 'all',
  renderWhitespace: 'selection',
  renderControlCharacters: false,
  renderIndentGuides: true,
  linkedEditing: true,

  // Find/Replace
  find: {
    autoFindInSelection: 'multiline',
    seedSearchStringFromSelection: 'always',
  },

  // Behavior
  contextmenu: true,
  mouseWheelZoom: true,
  quickSuggestions: {
    other: true,
    comments: true,
    strings: true,
  },
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'on',
  tabCompletion: 'on',
  suggestSelection: 'recentlyUsed',
  wordBasedSuggestions: true,

  // Diff editor
  diffAlgorithm: 'advanced',
  diffWordWrap: 'inherit',
  renderSideBySide: true,
  renderLineRevertType: 2,

  // Accessibility
  accessibilitySupport: 'auto',
  unforcedLineHeight: 0,

  // LSP integration
  enableLSP: false,
};

/**
 * Auto-save configuration
 */
export const AUTO_SAVE_CONFIG = {
  enabled: true,
  delay: 30000, // 30 seconds in milliseconds
  showNotification: true,
  onSave: null, // Callback function when auto-save occurs
};

/**
 * Custom Monaco theme (dark)
 */
export const CUSTOM_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Default colors
    { token: '', foreground: 'd4d4d4', background: '1e1e1e' },

    // Comments
    { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
    { token: 'comment.doc', foreground: '6a9955', fontStyle: 'italic' },

    // Strings
    { token: 'string', foreground: 'ce9178' },
    { token: 'string.escape', foreground: 'dcdcaa' },
    { token: 'string.sql', foreground: 'ce9178' },

    // Numbers
    { token: 'number', foreground: 'b5cea8' },
    { token: 'number.hex', foreground: 'b5cea8' },

    // Keywords
    { token: 'keyword', foreground: '569cd6' },
    { token: 'keyword.control', foreground: '569cd6' },
    { token: 'keyword.operator', foreground: 'd4d4d4' },

    // Operators
    { token: 'operator', foreground: 'd4d4d4' },
    { token: 'operator.key', foreground: '9cdcfe' },

    // Identifiers
    { token: 'identifier', foreground: '9cdcfe' },
    { token: 'identifier.function', foreground: 'dcdcaa' },
    { token: 'identifier.variable', foreground: '9cdcfe' },

    // Types
    { token: 'type', foreground: '4ec9b0' },
    { token: 'type.class', foreground: '4ec9b0' },
    { token: 'type.interface', foreground: '4ec9b0' },
    { token: 'type.enum', foreground: '4ec9b0' },

    // Functions
    { token: 'function', foreground: 'dcdcaa' },
    { token: 'function.call', foreground: 'dcdcaa' },
    { token: 'function.declaration', foreground: 'dcdcaa' },
    { token: 'function.definition', foreground: 'dcdcaa' },

    // Variables
    { token: 'variable', foreground: '9cdcfe' },
    { token: 'variable.readonly', foreground: '9cdcfe' },
    { token: 'variable.parameter', foreground: '9cdcfe' },

    // Constants
    { token: 'constant', foreground: '4fc1ff' },
    { token: 'constant.language', foreground: '569cd6' },

    // Properties
    { token: 'property', foreground: '9cdcfe' },
    { token: 'property.access', foreground: '9cdcfe' },

    // Labels
    { token: 'tag', foreground: '569cd6' },
    { token: 'tag.name', foreground: '569cd6' },
    { token: 'tag.attribute', foreground: '9cdcfe' },
    { token: 'tag.value', foreground: 'ce9178' },

    // Punctuation
    { token: 'delimiter', foreground: 'd4d4d4' },
    { token: 'delimiter.bracket', foreground: 'ffd700' },
    { token: 'delimiter.parenthesis', foreground: 'ffd700' },
    { token: 'delimiter.curly', foreground: 'ffd700' },
    { token: 'delimiter.square', foreground: 'ffd700' },
    { token: 'delimiter.angle', foreground: 'ffd700' },

    // Annotations
    { token: 'annotation', foreground: 'dcdcaa' },

    // RegEx
    { token: 'regexp', foreground: 'd16969' },

    // Meta
    { token: 'meta', foreground: 'd4d4d4' },

    // Error and warning
    { token: 'invalid', foreground: 'f44747', fontStyle: 'bold' },
    { token: 'invalid.illegal', foreground: 'f44747', fontStyle: 'bold' },
    { token: 'invalid.deprecated', foreground: 'f44747', fontStyle: 'italic' },

    // Links
    { token: 'link', foreground: '3794ff', fontStyle: 'underline' },

    // Diff colors
    { token: 'diff.added', foreground: 'b4d3b4', background: '2c422c' },
    { token: 'diff.removed', foreground: 'd4b3b3', background: '422222' },

    // Git lens
    { token: 'gitlens', foreground: '6a9955' },
    { token: 'gitlens.uncommitted', foreground: 'cca700' },
    { token: 'gitlens.head', foreground: 'd16969' },

    // Bracket pair colors
    { token: 'bracket.angle.foreground', foreground: 'ffd700' },
    { token: 'bracket.curly.foreground', foreground: 'da70d6' },
    { token: 'bracket.round.foreground', foreground: '4ec9b0' },
    { token: 'bracket.square.foreground', foreground: '87cefa' },

    // Guide
    { token: 'indentGuide.foreground', foreground: '404040' },
    { token: 'activeIndentGuide.foreground', foreground: '707070' },

    // Line highlight
    { token: 'lineHighlight', foreground: '000000', background: 'ffffff08' },
  ],
  colors: {
    // Basic colors
    'editor.background': '#1e1e1e',
    'editor.foreground': '#d4d4d4',
    'editor.inactiveSelectionBackground': '#3a3d41',
    'editor.selectionBackground': '#264f78',

    // Cursor
    'editor.cursor.foreground': '#aeafad',
    'editor.cursor.background': '#1e1e1e',

    // Line numbers
    'editorLineNumber.foreground': '#858585',
    'editorLineNumber.activeForeground': '#c6c6c6',
    'editorLineNumber.dimmedForeground': '#555555',

    // Minimap
    'editor.lineHighlightBackground': '#2a2d2e',
    'editor.lineHighlightBorder': '#00000000',
    'minimap.background': '#1e1e1e',
    'minimap.findMatchHighlight': '#d18616',
    'minimap.selectionHighlight': '#264f78',
    'minimap.errorHighlight': '#f44747',
    'minimap.warningHighlight': '#cca700',
    'minimapSlider.background': '#424242',
    'minimapSlider.hoverBackground': '#424242',
    'minimapSlider.activeBackground': '#424242',

    // Folding
    'editor.foldBackground': '#2a2d2e',
    'editorGutter.foldingControlForeground': '#c5c5c5',

    // Brackets
    'editorBracketMatch.background': '#0b3d49',
    'editorBracketMatch.border': '#808080',

    // Whitespace
    'editorWhitespace.foreground': '#3e3e42',

    // Indent guides
    'editorIndentGuide.background': '#404040',
    'editorIndentGuide.activeBackground': '#707070',

    // Guides
    'editorGuide.background': '#404040',

    // Rulers
    'editorRuler.foreground': '#404040',

    // Code lens
    'editorCodeLens.foreground': '#999999',
    'editorCodeLens.background': '#1e1e1e',

    // Active line
    'editorActiveLine.background': '#2a2d2e',
    'editorActiveLine.border': '#00000000',

    // Find matches
    'editor.findMatchBackground': '#515c6a',
    'editor.findMatchHighlightBackground': '#613214',
    'editor.findRangeHighlightBackground': '#3a3d41',

    // Hover
    'editorHoverWidget.background': '#252526',
    'editorHoverWidget.border': '#454545',
    'editorHoverWidget.foreground': '#cccccc',

    // Inline hints
    'editorInlayHint.background': '#252526',
    'editorInlayHint.foreground': '#8a8a8a',
    'editorInlayHint.typeForeground': '#9e9e9e',
    'editorInlayHint.parameterForeground': '#8a8a8a',

    // Links
    'editorLink.activeForeground': '#4fc1ff',

    // Overview ruler
    'editorOverviewRuler.border': '#007acc',
    'editorOverviewRuler.findMatchForeground': '#d18616',
    'editorOverviewRuler.rangeHighlightForeground': '#007acc',
    'editorOverviewRuler.selectionHighlightForeground': '#a0a0a0',
    'editorOverviewRuler.wordHighlightForeground': '#a0a0a0',
    'editorOverviewRuler.wordHighlightStrongForeground': '#c0c0c0',
    'editorOverviewRuler.modifiedForeground': '#e2c08d',
    'editorOverviewRuler.addedForeground': '#81b88b',
    'editorOverviewRuler.deletedForeground': '#c74e39',
    'editorOverviewRuler.errorForeground': '#f14c4c',
    'editorOverviewRuler.warningForeground': '#cca700',
    'editorOverviewRuler.infoForeground': '#75beff',

    // Selection
    'editor.selectionForeground': '#ffffff',

    // Word highlight
    'editor.wordHighlightBackground': '#57575740',
    'editor.wordHighlightStrongBackground': '#00497240',
    'editor.wordHighlightTextBackground': '#57575740',

    // Status bar
    'statusBar.background': '#007acc',
    'statusBar.foreground': '#ffffff',
    'statusBar.noFolderBackground': '#68217a',
    'statusBar.border': '#007acc',
    'statusBar.debuggingBackground': '#cc6633',
    'statusBar.debuggingForeground': '#ffffff',

    // Activity bar
    'activityBar.background': '#333333',
    'activityBar.foreground': '#ffffff',
    'activityBar.inactiveForeground': '#969696',
    'activityBarBadge.background': '#007acc',
    'activityBarBadge.foreground': '#ffffff',

    // Sidebar
    'sideBar.background': '#252526',
    'sideBar.foreground': '#cccccc',
    'sideBarSectionHeader.background': '#333333',
    'sideBarSectionHeader.foreground': '#bbbbbb',

    // Title bar
    'titleBar.activeBackground': '#3c3c3c',
    'titleBar.activeForeground': '#cccccc',
    'titleBar.inactiveBackground': '#2d2d2d',
    'titleBar.inactiveForeground': '#999999',

    // Panel
    'panel.background': '#1e1e1e',
    'panel.border': '#808080',

    // Notifications
    'notifications.background': '#252526',
    'notifications.foreground': '#cccccc',
    'notificationLink.foreground': '#3794ff',

    // Widgets
    'widget.shadow': '#00000066',
    'editorWidget.background': '#252526',
    'editorWidget.foreground': '#cccccc',
    'editorWidget.border': '#454545',

    // Scrollbar
    'scrollbar.shadow': '#000000',
    'scrollbarSlider.background': '#424242',
    'scrollbarSlider.hoverBackground': '#4f4f4f',
    'scrollbarSlider.activeBackground': '#bfbfbf',

    // Progress bar
    'progressBar.background': '#0e70c0',

    // Errors and warnings
    'errorForeground': '#f14c4c',
    'errorBackground': '#5a1d1d',
    'warningForeground': '#cca700',
    'warningBackground': '#6c6a00',
    'infoForeground': '#75beff',
    'infoBackground': '#385b70',

    // Diff
    'diffEditor.insertedTextBackground': '#9bb95533',
    'diffEditor.removedTextBackground': '#ff000033',
    'diffEditor.insertedTextBorder': '#9bb955',
    'diffEditor.removedTextBorder': '#ff0000',
  },
};

/**
 * Monaco language configurations
 */
export const LANGUAGE_CONFIGURATIONS = {
  javascript: {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '`', close: '`' },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '`', close: '`' },
      { open: '<', close: '>' },
    ],
    folding: {
      markers: {
        start: /^\s*\/\/#region/,
        end: /^\s*\/\/#endregion/,
      },
    },
  },
  typescript: {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '`', close: '`' },
      { open: '<', close: '>' },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '`', close: '`' },
      { open: '<', close: '>' },
    ],
    folding: {
      markers: {
        start: /^\s*\/\/#region/,
        end: /^\s*\/\/#endregion/,
      },
    },
  },
  html: {
    comments: {
      blockComment: ['<!--', '-->'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
      ['<', '>'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '<', close: '>' },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '<', close: '>' },
    ],
  },
  css: {
    comments: {
      blockComment: ['/*', '*/'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  },
  json: {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '"', close: '"' },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '"', close: '"' },
    ],
  },
  python: {
    comments: {
      lineComment: '#',
      blockComment: ['"""', '"""'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '"""', close: '"""' },
      { open: "'''", close: "'''" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '"""', close: '"""' },
      { open: "'''", close: "'''" },
    ],
    folding: {
      offSide: true,
    },
  },
};

/**
 * Configure Monaco editor with custom theme and options
 * @param {Object} monaco - Monaco instance
 * @param {Object} themeData - Custom theme data (optional, uses default if not provided)
 * @param {Object} options - Editor options (optional, uses default if not provided)
 */
export function configureMonaco(monaco, themeData = CUSTOM_THEME, options = DEFAULT_EDITOR_OPTIONS) {
  // Define custom theme
  monaco.editor.defineTheme('custom-dark', themeData);

  // Set custom theme
  monaco.editor.setTheme('custom-dark');

  // Configure language support
  configureLanguageSupport(monaco);

  // Configure keyboard shortcuts
  configureKeyboardShortcuts(monaco);
}

/**
 * Configure language support for Monaco
 * @param {Object} monaco - Monaco instance
 */
function configureLanguageSupport(monaco) {
  // Register language configurations
  Object.entries(LANGUAGE_CONFIGURATIONS).forEach(([language, config]) => {
    monaco.languages.setLanguageConfiguration(language, config);
  });
}

/**
 * Configure keyboard shortcuts for Monaco
 * @param {Object} monaco - Monaco instance
 */
function configureKeyboardShortcuts(monaco) {
  // Monaco's default keyboard shortcuts include:
  // - Ctrl/Cmd + F: Find
  // - Ctrl/Cmd + H: Replace
  // - Ctrl/Cmd + Shift + F: Find in files
  // - Alt + Click: Add cursor
  // - Ctrl/Cmd + Alt + Up/Down: Add cursor above/below
  // - Ctrl/Cmd + D: Select word and add cursor

  // These are already built-in, but we can customize them if needed
}

/**
 * Get editor options with custom overrides
 * @param {Object} overrides - Custom options to override defaults
 * @returns {Object} Merged editor options
 */
export function getEditorOptions(overrides = {}) {
  return {
    ...DEFAULT_EDITOR_OPTIONS,
    ...overrides,
  };
}

/**
 * Get Monaco configuration
 * @param {Object} overrides - Custom config to override defaults
 * @returns {Object} Monaco configuration object
 */
export function getMonacoConfig(overrides = {}) {
  return {
    theme: 'custom-dark',
    options: getEditorOptions(overrides.options),
    autoSave: {
      ...AUTO_SAVE_CONFIG,
      ...overrides.autoSave,
    },
    language: overrides.language || 'javascript',
  };
}

/**
 * Setup auto-save for editor
 * @param {Object} editor - Monaco editor instance
 * @param {Function} saveCallback - Callback function to save content
 * @param {Object} config - Auto-save configuration
 * @returns {Function} Cleanup function to stop auto-save
 */
export function setupAutoSave(editor, saveCallback, config = AUTO_SAVE_CONFIG) {
  if (!config.enabled || !editor) {
    return () => {};
  }

  let timeoutId = null;
  let isDirty = false;

  // Track changes
  const contentChangeListener = editor.onDidChangeModelContent(() => {
    isDirty = true;
    scheduleAutoSave();
  });

  // Schedule auto-save
  function scheduleAutoSave() {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (isDirty) {
        const content = editor.getValue();
        saveCallback(content);

        if (config.showNotification) {
          showAutoSaveNotification();
        }

        if (config.onSave) {
          config.onSave(content);
        }

        isDirty = false;
      }
    }, config.delay);
  }

  // Show auto-save notification
  function showAutoSaveNotification() {
    // Implementation depends on how notifications are handled in the app
    console.log('Auto-saved file at:', new Date().toLocaleTimeString());
  }

  // Cleanup function
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (contentChangeListener) {
      contentChangeListener.dispose();
    }
  };
}

/**
 * Register custom Monaco commands
 * @param {Object} editor - Monaco editor instance
 * @param {Object} commands - Map of command names to functions
 */
export function registerCommands(editor, commands = {}) {
  Object.entries(commands).forEach(([name, handler]) => {
    editor.addAction({
      id: name,
      label: name,
      keybindings: [],
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: 'navigation',
      run: handler,
    });
  });
}

/**
 * Get Monaco editor instance from container
 * @param {HTMLElement} container - Container element
 * @returns {Object|null} Monaco editor instance or null
 */
export function getEditorFromContainer(container) {
  // Monaco doesn't provide a direct way to get editor from container
  // This is a placeholder for custom implementations
  return null;
}

export default {
  DEFAULT_EDITOR_OPTIONS,
  AUTO_SAVE_CONFIG,
  CUSTOM_THEME,
  LANGUAGE_CONFIGURATIONS,
  configureMonaco,
  getEditorOptions,
  getMonacoConfig,
  setupAutoSave,
  registerCommands,
  getEditorFromContainer,
};
