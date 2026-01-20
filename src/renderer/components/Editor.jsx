import React, { useState, useEffect, useRef, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import {
  configureMonaco,
  getEditorOptions,
  setupAutoSave,
  AUTO_SAVE_CONFIG,
} from '../utils/monaco-config';

function Editor({ filePath, content, language, previousContent, onSave, onContentChange, onRun, isDirty, onDirtyChange }) {
  const [editorContent, setEditorContent] = useState(content);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [isFileDirty, setIsFileDirty] = useState(false);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const autoSaveCleanupRef = useRef(null);
  const isUserTypingRef = useRef(false);
  const lastContentRef = useRef(content);
  const currentFilePathRef = useRef(filePath);
  const originalContentRef = useRef(content); // Track original content for dirty state
  const dirtyCheckTimeoutRef = useRef(null);

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

  // Cleanup effect for auto-save
  useEffect(() => {
    return () => {
      // Cleanup auto-save when component unmounts
      if (autoSaveCleanupRef.current) {
        autoSaveCleanupRef.current();
        autoSaveCleanupRef.current = null;
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
  }, [autoSaveEnabled, content, filePath, onDirtyChange, onSave, onRun, previousContent]);

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
          })}
        />
      </div>
    </div>
  );
}

export default Editor;

