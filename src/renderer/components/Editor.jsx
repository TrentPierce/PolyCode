import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';

function Editor({ filePath, content, language, onSave, onContentChange, onRun }) {
  const [editorContent, setEditorContent] = useState(content);
  const editorRef = useRef(null);

  useEffect(() => {
    // Update editor content when prop changes (only if different to prevent loops)
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      if (content !== currentValue) {
        editorRef.current.setValue(content);
        setEditorContent(content);
      }
    } else {
      // If editor not mounted yet, just update state
      setEditorContent(content);
    }
  }, [content, filePath]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
    
    // Add Run shortcut (Ctrl+R or Cmd+R)
    if (onRun) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => {
        const currentContent = editor.getValue();
        onRun(filePath, language, currentContent);
      });
    }
  };

  const handleEditorChange = (value) => {
    const newValue = value || '';
    setEditorContent(newValue);
    // Notify parent of content changes (debounced to prevent excessive updates)
    if (onContentChange) {
      // Use a small timeout to debounce rapid changes
      clearTimeout(handleEditorChange.timeout);
      handleEditorChange.timeout = setTimeout(() => {
        onContentChange(newValue);
      }, 300);
    }
  };

  const handleSave = () => {
    if (editorRef.current) {
      const currentContent = editorRef.current.getValue();
      onSave(filePath, currentContent);
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
            onClick={() => onRun(filePath, language, editorContent)}
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
          theme="vs-dark"
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true
          }}
        />
      </div>
    </div>
  );
}

export default Editor;

