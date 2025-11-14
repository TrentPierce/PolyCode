import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Editor from './components/Editor';
import FileExplorer from './components/FileExplorer';
import AIPanel from './components/AIPanel';
import StatusBar from './components/StatusBar';
import Settings from './components/Settings';
import DeliberationChat from './components/DeliberationChat';
import './styles/main.css';

function App() {
  const [files, setFiles] = useState({});
  const [activeFile, setActiveFile] = useState(null);
  const [language, setLanguage] = useState('javascript');
  const [models, setModels] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [projectPath, setProjectPath] = useState(null);
  const [deliberationMessages, setDeliberationMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' or 'deliberation'
  const [fileVersions, setFileVersions] = useState({}); // Track previous versions for diff

  useEffect(() => {
    // Check LMStudio connection and load models
    checkConnection();
    
    // Check for existing project path
    window.electronAPI.getProjectPath().then(result => {
      if (result.success && result.path) {
        setProjectPath(result.path);
      }
    });
  }, []);

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
  };

  const handleFileSave = (filePath, content) => {
    setFiles(prev => ({
      ...prev,
      [filePath]: content
    }));
  };

  const handleFileCreate = (filePath) => {
    setFiles(prev => ({
      ...prev,
      [filePath]: ''
    }));
    setActiveFile(filePath);
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
    const result = await window.electronAPI.openProject();
    if (result.success && result.files) {
      setProjectPath(result.path);
      setFiles(result.files);
      // Open first file if available
      const firstFile = Object.keys(result.files)[0];
      if (firstFile) {
        handleFileSelect(firstFile, result.files[firstFile]);
      }
    }
  };

  const handleSaveProject = async () => {
    if (Object.keys(files).length === 0) {
      alert('No files to save');
      return;
    }
    const result = await window.electronAPI.saveProject(files);
    if (result.success) {
      setProjectPath(result.path);
      alert(`Project saved to: ${result.path}`);
    } else if (!result.cancelled) {
      alert(`Failed to save project: ${result.error}`);
    }
  };

  const handleRunCode = async (filePath, language, code) => {
    if (!projectPath) {
      alert('Please select a project folder first (New Project or Open Project)');
      return;
    }

    try {
      const result = await window.electronAPI.runCode(filePath, language, code);
      if (result.success) {
        // Show output in a dialog or terminal panel
        const output = result.output || result.stdout || 'Code executed successfully!';
        alert(`Output:\n\n${output}`);
      } else {
        const errorMsg = result.error || result.stderr || 'Execution failed';
        alert(`Error:\n\n${errorMsg}`);
      }
    } catch (error) {
      alert(`Failed to run code: ${error.message}`);
    }
  };

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
          activeFile={activeFile}
          projectPath={projectPath}
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
          onSaveProject={handleSaveProject}
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
        onSettingsClick={() => setShowSettings(true)}
      />
      <Settings
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          // Reload connection status after settings change
          checkConnection();
        }}
      />
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);

