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

function Editor({ filePath, content, language, previousContent, onSave, onContentChange, onRun, isDirty, onDirtyChange, onSnippetInsert }) {
  const [editorContent, setEditorContent] = useState(content);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [isFileDirty, setIsFileDirty] = useState(false);
  const [lspStatus, setLspStatus] = useState('disconnected');
  const [snippets, setSnippets] = useState([]);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
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

