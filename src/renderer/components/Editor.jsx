import React, { useState, useEffect, useRef, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import {
  configureMonaco,
  getEditorOptions,
  setupAutoSave,
  AUTO_SAVE_CONFIG,
} from '../utils/monaco-config';
import { getLSPBridge, createLSPBridge } from '../utils/lsp-monaco-bridge';
import snippetManager from '../utils/snippets';

/**
 * @typedef {Object} EditorProps
 * @property {string} filePath - Path of the file being edited
 * @property {string} content - Initial editor content
 * @property {string} language - Programming language for syntax highlighting
 * @property {string} [previousContent] - Previous content for diff visualization
 * @property {Function} onSave - Callback when file is saved
 * @property {Function} [onContentChange] - Callback when content changes
 * @property {Function} [onRun] - Callback to run code
 * @property {boolean} [isDirty] - Whether file has unsaved changes
 * @property {Function} [onDirtyChange] - Callback when dirty state changes
 * @property {Function} [onSnippetInsert] - Callback when snippet is inserted
 * @property {Object} [debugSession] - Current debug session information
 * @property {Function} [onBreakpointToggle] - Callback when breakpoint is toggled
 * @property {Function} [onBreakpointRemove] - Callback when breakpoint is removed
 */

/**
 * Editor Component
 *
 * Provides a code editor with Monaco Editor integration.
 * Features syntax highlighting, auto-save, LSP integration, snippet support,
 * and change visualization.
 *
 * Features:
 * - Monaco Editor integration with custom theme
 * - Syntax highlighting for multiple languages
 * - Auto-save with configurable delay
 * - LSP integration for diagnostics, completions, and hovers
 * - Code snippet support with tab expansion
 * - Change visualization with color-coded diff
 * - Dirty state tracking
 * - Keyboard shortcuts (Ctrl+S, Ctrl+R)
 * - File diff decoration
 * - Breakpoint support for debugging
 *
 * TODO: Add multi-cursor support
 * TODO: Add split view for side-by-side diff
 * TODO: Add minimap configuration
 * TODO: Add code folding controls
 * TODO: Add bracket pair colorization
 * TODO: Add configurable font size and line height
 *
 * @param {EditorProps} props - Component props
 * @returns {JSX.Element} Editor component
 *
 * @example
 * ```jsx
 * <Editor
 *   filePath="main.js"
 *   content="const x = 5;"
 *   language="javascript"
 *   onSave={(path, content) => console.log('Saved:', path)}
 *   onContentChange={(content) => console.log('Changed:', content)}
 *   onRun={(code) => eval(code)}
 *   isDirty={false}
 *   onDirtyChange={(dirty) => console.log('Dirty:', dirty)}
 * />
 * ```
 */
function Editor({ filePath, content, language, previousContent, onSave, onContentChange, onRun, isDirty, onDirtyChange, onSnippetInsert, debugSession, onBreakpointToggle, onBreakpointRemove }) {
  const [editorContent, setEditorContent] = useState(content);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [isFileDirty, setIsFileDirty] = useState(false);
  const [lspStatus, setLspStatus] = useState('disconnected');
  const [snippets, setSnippets] = useState([]);
  const [breakpoints, setBreakpoints] = useState([]);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const breakpointDecorationsRef = useRef([]);
  const autoSaveCleanupRef = useRef(null);
  const isUserTypingRef = useRef(false);
  const lastContentRef = useRef(content);
  const currentFilePathRef = useRef(filePath);
  const originalContentRef = useRef(content); // Track original content for dirty state
  const dirtyCheckTimeoutRef = useRef(null);
  const lspBridgeRef = useRef(null);
  const documentVersionRef = useRef(1);
  const lspInitializedRef = useRef(false);
  const snippetsLoadedRef = useRef(new Set());
  const snippetInsertRef = useRef(null);

  useEffect(() => {
    // Reset typing flag when file changes
    if (filePath !== currentFilePathRef.current) {
      isUserTypingRef.current = false;
      currentFilePathRef.current = filePath;
      // Reset original content when file changes
      originalContentRef.current = content;
    }

    // Only update if content prop changed externally (not from user typing)
    // and it's different from what's currently in the editor
    if (editorRef.current && !isUserTypingRef.current) {
      const currentValue = editorRef.current.getValue();
      // Only update if the prop content is actually different from editor content
      if (content !== currentValue && content !== lastContentRef.current) {
        const oldContent = currentValue;
        editorRef.current.setValue(content);
        setEditorContent(content);
        lastContentRef.current = content;
        // Update original content reference when file is loaded
        originalContentRef.current = content;

        // Update change decorations if previous content exists
        if (previousContent && previousContent !== content && monacoRef.current) {
          updateChangeDecorations(editorRef.current, monacoRef.current, previousContent, content);
        } else if (oldContent && oldContent !== content && monacoRef.current) {
          // Use current value as previous if no previousContent provided
          updateChangeDecorations(editorRef.current, monacoRef.current, oldContent, content);
        }
      }
    } else if (!editorRef.current) {
      // If editor not mounted yet, just update state
      setEditorContent(content);
      lastContentRef.current = content;
      originalContentRef.current = content;
    }
  }, [content, filePath, previousContent]);

  // LSP initialization effect
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !filePath || !language) {
      return;
    }

    // Initialize LSP bridge if not already initialized
    if (!lspBridgeRef.current) {
      lspBridgeRef.current = createLSPBridge();
    }

    const bridge = lspBridgeRef.current;

    // Initialize bridge with Monaco instance
    bridge.initialize(monacoRef.current, editorRef.current, filePath, language);

    // Register Monaco providers
    const providers = [
      bridge.registerDiagnosticsProvider(),
      bridge.registerCompletionProvider(),
      bridge.registerHoverProvider(),
      bridge.registerDefinitionProvider()
    ];

    // Start language server if not already started
    const startLSPServer = async () => {
      if (!lspInitializedRef.current && window.electronAPI) {
        try {
          setLspStatus('starting');
          const result = await window.electronAPI.lspStart(language);
          if (result.success) {
            setLspStatus('connected');
            lspInitializedRef.current = true;

            // Notify server about open document
            await bridge.sendDidOpen();

            // Trigger initial diagnostics
            setTimeout(() => bridge.triggerDiagnostics(), 1000);
          } else {
            console.error('Failed to start LSP server:', result.error);
            setLspStatus('error');
          }
        } catch (error) {
          console.error('LSP initialization error:', error);
          setLspStatus('error');
        }
      }
    };

    startLSPServer();

    // Cleanup function
    return () => {
      // Dispose all providers
      providers.forEach(disposable => {
        if (disposable && disposable.dispose) {
          disposable.dispose();
        }
      });

      // Note: We don't stop LSP server here as it may be shared across files
    };
  }, [filePath, language]);

  // Load snippets for current language
  useEffect(() => {
    if (!language) return;

    // Check if snippets for this language are already loaded
    if (snippetsLoadedRef.current.has(language)) {
      return;
    }

    const loadLanguageSnippets = async () => {
      try {
        const languageSnippets = await snippetManager.loadSnippets(language);
        setSnippets(languageSnippets);
        snippetsLoadedRef.current.add(language);
      } catch (error) {
        console.error('Failed to load snippets:', error);
      }
    };

    loadLanguageSnippets();
  }, [language]);

  // Load breakpoints from main process when file changes
  useEffect(() => {
    if (!filePath || !window.electronAPI) {
      return;
    }

    const loadBreakpoints = async () => {
      try {
        const result = await window.electronAPI.debugGetBreakpoints(filePath);
        if (result.success) {
          setBreakpoints(result.breakpoints);
        }
      } catch (error) {
        console.error('Failed to load breakpoints:', error);
      }
    };

    loadBreakpoints();
  }, [filePath]);

  // Update breakpoint decorations
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) {
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    // Clear existing breakpoint decorations
    if (breakpointDecorationsRef.current.length > 0) {
      editor.deltaDecorations(breakpointDecorationsRef.current, []);
      breakpointDecorationsRef.current = [];
    }

    // Add new breakpoint decorations
    const breakpointDecorations = breakpoints.map(bp => {
      const line = bp.line;
      return {
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: bp.enabled ? 'breakpoint-glyph' : 'breakpoint-disabled-glyph',
          glyphMarginHoverMessage: { value: `Breakpoint at line ${line}` }
        }
      };
    });

    // Add current execution line decoration if debug session is active
    if (debugSession && debugSession.currentPosition && debugSession.currentPosition.file === filePath) {
      const currentLine = debugSession.currentPosition.line;
      breakpointDecorations.push({
        range: new monaco.Range(currentLine, 1, currentLine, 1),
        options: {
          isWholeLine: true,
          className: 'debug-current-line',
          glyphMarginClassName: 'debug-current-line-glyph'
        }
      });
    }

    if (breakpointDecorations.length > 0) {
      breakpointDecorationsRef.current = editor.deltaDecorations([], breakpointDecorations);
    }
  }, [breakpoints, debugSession, filePath]);

  /**
   * Handle snippet insertion into editor
   *
   * Inserts a code snippet at the current cursor position.
   * Notifies parent component when snippet is inserted.
   *
   * @param {Object} snippet - Snippet to insert with prefix, body, and properties
   * @returns {boolean} Whether insertion was successful
   */
  const handleSnippetInsert = useCallback((snippet) => {
    if (!editorRef.current || !snippet) return false;

    try {
      const success = snippetManager.insertSnippet(editorRef.current, snippet);
      if (success && onSnippetInsert) {
        onSnippetInsert(snippet);
      }
      return success;
    } catch (error) {
      console.error('Error inserting snippet:', error);
      return false;
    }
  }, [onSnippetInsert]);

  // Update snippet insert ref
  useEffect(() => {
    snippetInsertRef.current = handleSnippetInsert;
  }, [handleSnippetInsert]);

  // Cleanup effect for auto-save and LSP
  useEffect(() => {
    return () => {
      // Cleanup auto-save when component unmounts
      if (autoSaveCleanupRef.current) {
        autoSaveCleanupRef.current();
        autoSaveCleanupRef.current = null;
      }

      // Cleanup LSP bridge
      if (lspBridgeRef.current) {
        lspBridgeRef.current.dispose();
        lspBridgeRef.current = null;
      }
    };
  }, []);

  /**
   * Update change decorations for diff visualization
   *
   * Computes line-by-line diff and applies Monaco decorations
   * to show added (green), deleted (red), and modified (yellow) lines.
   *
   * TODO: Use proper diff library for more accurate diffs
   * TODO: Add inline diff support for character-level changes
   *
   * @param {Object} editor - Monaco editor instance
   * @param {Object} monaco - Monaco API instance
   * @param {string} oldText - Previous content
   * @param {string} newText - New content
   */
  const updateChangeDecorations = React.useCallback((editor, monaco, oldText, newText) => {
    // Clear existing decorations
    if (decorationsRef.current.length > 0) {
      editor.deltaDecorations(decorationsRef.current, []);
      decorationsRef.current = [];
    }

    if (!oldText || !newText) return;

    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const decorations = [];

    // Simple line-by-line diff
    // TODO: Replace with proper diff algorithm (e.g., diff-match-patch)
    const maxLines = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';

      if (oldLine !== newLine) {
        if (oldLine === '' && newLine !== '') {
          // Added line (green)
          decorations.push({
            range: new monaco.Range(i + 1, 1, i + 1, newLine.length + 1),
            options: {
              isWholeLine: true,
              className: 'line-added',
              glyphMarginClassName: 'line-added-glyph',
              marginClassName: 'line-added-margin'
            }
          });
        } else if (oldLine !== '' && newLine === '') {
          // Deleted line (red)
          decorations.push({
            range: new monaco.Range(i + 1, 1, i + 1, 1),
            options: {
              isWholeLine: true,
              className: 'line-deleted',
              glyphMarginClassName: 'line-deleted-glyph',
              marginClassName: 'line-deleted-margin'
            }
          });
        } else {
          // Modified line (yellow/orange)
          decorations.push({
            range: new monaco.Range(i + 1, 1, i + 1, newLine.length + 1),
            options: {
              isWholeLine: true,
              className: 'line-modified',
              glyphMarginClassName: 'line-modified-glyph',
              marginClassName: 'line-modified-margin'
            }
          });
        }
      }
    }

    if (decorations.length > 0 && editor && monaco) {
      decorationsRef.current = editor.deltaDecorations([], decorations);
    }
  }, []);

  /**
   * Handle Monaco editor mount
   *
   * Configures Monaco with custom settings, keyboard shortcuts,
   * auto-save, and LSP integration.
   *
   * Keyboard shortcuts:
   * - Ctrl/Cmd+S: Save file
   * - Ctrl/Cmd+R: Run code
   * - Ctrl/Cmd+Space: Trigger snippet completion
   * - Tab: Expand snippet
   *
   * @param {Object} editor - Monaco editor instance
   * @param {Object} monaco - Monaco API instance
   */
  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure Monaco with custom theme and settings
    configureMonaco(monaco);

    // Configure keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });

    // Add Run shortcut (Ctrl+R or Cmd+R)
    if (onRun) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => {
        const currentContent = editor.getValue();
        onRun(currentContent);
      });
    }

    // Add Ctrl+Space to trigger snippet completion
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      const position = editor.getPosition();
      if (!position) return;

      // Get current line content before cursor
      const line = editor.getModel().getLineContent(position.lineNumber);
      const beforeCursor = line.substring(0, position.column - 1);
      const match = beforeCursor.match(/(\w+)$/);

      if (match && match[1]) {
        const prefix = match[1];
        const matchingSnippets = snippets.filter(s =>
          s.prefix && s.prefix.toLowerCase().startsWith(prefix.toLowerCase())
        );

        if (matchingSnippets.length > 0) {
          // Find exact match first
          const exactMatch = matchingSnippets.find(s => s.prefix.toLowerCase() === prefix.toLowerCase());
          if (exactMatch) {
            // Auto-expand exact match
            handleSnippetInsert(exactMatch);
          }
        }
      }
    });

    // Add Tab key handler for snippet expansion
    editor.addCommand(monaco.KeyCode.Tab, () => {
      const position = editor.getPosition();
      if (!position) return;

      // Get current line content before cursor
      const line = editor.getModel().getLineContent(position.lineNumber);
      const beforeCursor = line.substring(0, position.column - 1);
      const match = beforeCursor.match(/(\w+)$/);

      if (match && match[1]) {
        const prefix = match[1];
        const snippet = snippets.find(s => s.prefix === prefix);
        if (snippet) {
          handleSnippetInsert(snippet);
          return true; // Prevent default tab behavior
        }
      }
      return false; // Allow default tab behavior
    });

    // Setup auto-save
    // TODO: Make auto-save delay configurable in settings
    if (autoSaveEnabled) {
      autoSaveCleanupRef.current = setupAutoSave(
        editor,
        (content) => {
          onSave(filePath, content);
          // Update original content reference after auto-save
          originalContentRef.current = content;
          // Reset dirty state
          setIsFileDirty(false);
          if (onDirtyChange) {
            onDirtyChange(false);
          }
        },
        {
          ...AUTO_SAVE_CONFIG,
          delay: 30000, // 30 seconds default
          showNotification: false, // Disable notifications to avoid UI clutter
        }
      );
    }

    // Apply change decorations if previous content exists
    if (previousContent && previousContent !== content) {
      updateChangeDecorations(editor, monaco, previousContent, content);
    }
  }, [autoSaveEnabled, content, filePath, onDirtyChange, onSave, onRun, previousContent, snippets]);

  /**
   * Handle editor content change
   *
   * Tracks dirty state, notifies LSP server of changes,
   * and debounces parent callbacks to avoid excessive updates.
   *
   * @param {string} value - New editor content
   */
  const handleEditorChange = (value) => {
    const newValue = value || '';
    isUserTypingRef.current = true;
    setEditorContent(newValue);
    lastContentRef.current = newValue;

    // Check if content is dirty (different from original)
    const isContentDirty = newValue !== originalContentRef.current;

    // Debounce dirty state check to avoid excessive updates
    clearTimeout(dirtyCheckTimeoutRef.current);
    dirtyCheckTimeoutRef.current = setTimeout(() => {
      if (onDirtyChange) {
        onDirtyChange(isContentDirty);
      }
    }, 500);

    // Notify LSP server about document change
    // TODO: Implement incremental change sending for better performance
    if (lspBridgeRef.current && lspStatus === 'connected') {
      documentVersionRef.current++;
      const bridge = lspBridgeRef.current;
      // Debounce LSP notifications
      clearTimeout(handleEditorChange.lspTimeout);
      handleEditorChange.lspTimeout = setTimeout(() => {
        bridge.sendDidChange(documentVersionRef.current);
        // Trigger diagnostics after change
        setTimeout(() => bridge.triggerDiagnostics(), 500);
      }, 300);
    }

    // Notify parent of content changes (debounced to prevent excessive updates)
    if (onContentChange) {
      // Use a small timeout to debounce rapid changes
      clearTimeout(handleEditorChange.timeout);
      handleEditorChange.timeout = setTimeout(() => {
        isUserTypingRef.current = false;
        onContentChange(newValue);
      }, 300);
    } else {
      // Reset flag after a short delay if no callback
      setTimeout(() => {
        isUserTypingRef.current = false;
      }, 100);
    }
  };

  /**
   * Handle file save
   *
   * Triggers save callback with current editor content.
   * Updates original content reference and resets dirty state.
   *
   * @fires onSave With file path and content
   * @fires onDirtyChange With false to indicate saved
   */
  const handleSave = () => {
    if (editorRef.current) {
      const currentContent = editorRef.current.getValue();
      onSave(filePath, currentContent);
      // Update original content reference after save
      originalContentRef.current = currentContent;
      // Reset dirty state
      if (onDirtyChange) {
        onDirtyChange(false);
      }
    }
  };

  /**
   * Get LSP status information
   *
   * Returns icon, text, and CSS class for displaying LSP status.
   *
   * @returns {Object} LSP status info
   * @returns {string} return.icon - Status icon character
   * @returns {string} return.text - Status description
   * @returns {string} return.className - CSS class name
   */
  const getLSPStatusInfo = () => {
    switch (lspStatus) {
      case 'connected':
        return { icon: '✓', text: 'LSP Connected', className: 'lsp-status-connected' };
      case 'starting':
        return { icon: '⟳', text: 'LSP Starting...', className: 'lsp-status-starting' };
      case 'error':
    return { icon: '✗', text: 'LSP Error', className: 'lsp-status-error' };
      case 'disconnected':
      default:
        return { icon: '○', text: 'LSP Disconnected', className: 'lsp-status-disconnected' };
    }
  };
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure Monaco with custom theme and settings
    configureMonaco(monaco);

    // Configure keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });

    // Add Run shortcut (Ctrl+R or Cmd+R)
    if (onRun) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => {
        const currentContent = editor.getValue();
        onRun(currentContent);
      });
    }

    // Add Ctrl+Space to trigger snippet completion
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      const position = editor.getPosition();
      if (!position) return;

      // Get current line content before cursor
      const line = editor.getModel().getLineContent(position.lineNumber);
      const beforeCursor = line.substring(0, position.column - 1);
      const match = beforeCursor.match(/(\w+)$/);

      if (match && match[1]) {
        const prefix = match[1];
        const matchingSnippets = snippets.filter(s =>
          s.prefix && s.prefix.toLowerCase().startsWith(prefix.toLowerCase())
        );

        if (matchingSnippets.length > 0) {
          // Find exact match first
          const exactMatch = matchingSnippets.find(s => s.prefix.toLowerCase() === prefix.toLowerCase());
          if (exactMatch) {
            // Auto-expand exact match
            handleSnippetInsert(exactMatch);
          }
        }
      }
    });

    // Add Tab key handler for snippet expansion
    editor.addCommand(monaco.KeyCode.Tab, () => {
      const position = editor.getPosition();
      if (!position) return;

      // Get current line content before cursor
      const line = editor.getModel().getLineContent(position.lineNumber);
      const beforeCursor = line.substring(0, position.column - 1);
      const match = beforeCursor.match(/(\w+)$/);

      if (match && match[1]) {
        const prefix = match[1];
        const snippet = snippets.find(s => s.prefix === prefix);
        if (snippet) {
          handleSnippetInsert(snippet);
          return true; // Prevent default tab behavior
        }
      }
      return false; // Allow default tab behavior
    });

    // Setup auto-save
    if (autoSaveEnabled) {
      autoSaveCleanupRef.current = setupAutoSave(
        editor,
        (content) => {
          onSave(filePath, content);
          // Update original content reference after auto-save
          originalContentRef.current = content;
          // Reset dirty state
          setIsFileDirty(false);
          if (onDirtyChange) {
            onDirtyChange(false);
          }
        },
        {
          ...AUTO_SAVE_CONFIG,
          delay: 30000, // 30 seconds default
          showNotification: false, // Disable notifications to avoid UI clutter
        }
      );
    }

    // Add breakpoint toggle on margin click
    editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position.lineNumber;
        handleBreakpointToggle(lineNumber);
      }
    });

    // Apply change decorations if previous content exists
    if (previousContent && previousContent !== content) {
      updateChangeDecorations(editor, monaco, previousContent, content);
    }
  }, [autoSaveEnabled, content, filePath, onDirtyChange, onSave, onRun, previousContent, snippets, breakpoints, debugSession]);

  const handleBreakpointToggle = async (lineNumber) => {
    const existingBp = breakpoints.find(bp => bp.line === lineNumber);
    const sessionId = debugSession?.id || null;

    if (existingBp) {
      // Remove existing breakpoint
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.debugRemoveBreakpoint(sessionId, filePath, lineNumber);
          if (result.success) {
            setBreakpoints(prev => prev.filter(bp => bp.line !== lineNumber));
            if (onBreakpointRemove) {
              onBreakpointRemove(filePath, lineNumber);
            }
          }
        }
      } catch (error) {
        console.error('Failed to remove breakpoint:', error);
      }
    } else {
      // Add new breakpoint
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.debugSetBreakpoint(sessionId, filePath, lineNumber);
          if (result.success) {
            setBreakpoints(prev => [...prev, { line: lineNumber, enabled: true, uri: filePath }]);
            if (onBreakpointToggle) {
              onBreakpointToggle(filePath, lineNumber);
            }
          }
        }
      } catch (error) {
        console.error('Failed to set breakpoint:', error);
      }
    }
  };

  const handleEditorChange = (value) => {
    const newValue = value || '';
    isUserTypingRef.current = true;
    setEditorContent(newValue);
    lastContentRef.current = newValue;

    // Check if content is dirty (different from original)
    const isContentDirty = newValue !== originalContentRef.current;

    // Debounce dirty state check to avoid excessive updates
    clearTimeout(dirtyCheckTimeoutRef.current);
    dirtyCheckTimeoutRef.current = setTimeout(() => {
      if (onDirtyChange) {
        onDirtyChange(isContentDirty);
      }
    }, 500);

    // Notify LSP server about document change
    if (lspBridgeRef.current && lspStatus === 'connected') {
      documentVersionRef.current++;
      const bridge = lspBridgeRef.current;
      // Debounce LSP notifications
      clearTimeout(handleEditorChange.lspTimeout);
      handleEditorChange.lspTimeout = setTimeout(() => {
        bridge.sendDidChange(documentVersionRef.current);
        // Trigger diagnostics after change
        setTimeout(() => bridge.triggerDiagnostics(), 500);
      }, 300);
    }

    // Notify parent of content changes (debounced to prevent excessive updates)
    if (onContentChange) {
      // Use a small timeout to debounce rapid changes
      clearTimeout(handleEditorChange.timeout);
      handleEditorChange.timeout = setTimeout(() => {
        isUserTypingRef.current = false;
        onContentChange(newValue);
      }, 300);
    } else {
      // Reset flag after a short delay if no callback
      setTimeout(() => {
        isUserTypingRef.current = false;
      }, 100);
    }
  };

  const handleSave = () => {
    if (editorRef.current) {
      const currentContent = editorRef.current.getValue();
      onSave(filePath, currentContent);
      // Update original content reference after save
      originalContentRef.current = currentContent;
      // Reset dirty state
      if (onDirtyChange) {
        onDirtyChange(false);
      }
    }
  };

  // Get LSP status icon and text
  const getLSPStatusInfo = () => {
    switch (lspStatus) {
      case 'connected':
        return { icon: '✓', text: 'LSP Connected', className: 'lsp-status-connected' };
      case 'starting':
        return { icon: '⟳', text: 'LSP Starting...', className: 'lsp-status-starting' };
      case 'error':
        return { icon: '✗', text: 'LSP Error', className: 'lsp-status-error' };
      case 'disconnected':
      default:
        return { icon: '○', text: 'LSP Disconnected', className: 'lsp-status-disconnected' };
    }
  };

  const lspStatusInfo = getLSPStatusInfo();

  return (
    <div className="editor-wrapper">
      <div className="editor-tabs">
        <div className="editor-tab active">
          {filePath}
          <span className="editor-tab-close" title="Close">×</span>
        </div>
        {onRun && (
          <button
            className="run-button"
            onClick={() => {
              // Get the latest content directly from the editor
              const currentContent = editorRef.current ? editorRef.current.getValue() : editorContent;
              onRun(currentContent);
            }}
            title="Run Code (Ctrl+R)"
          >
            ▶ Run
          </button>
        )}
        <div className={`lsp-status-indicator ${lspStatusInfo.className}`} title={lspStatusInfo.text}>
          {lspStatusInfo.icon} {lspStatusInfo.text}
        </div>
      </div>
      <div className="monaco-editor-container">
        <MonacoEditor
          height="100%"
          language={language}
          value={editorContent}
          theme="custom-dark"
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={getEditorOptions({
            // Preserve any specific overrides if needed
            language: language,
            enableLSP: lspStatus === 'connected',
          })}
        />
      </div>
    </div>
  );
}

export default Editor;

