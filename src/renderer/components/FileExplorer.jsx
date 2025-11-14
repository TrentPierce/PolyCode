import React, { useState, useEffect } from 'react';

function FileExplorer({ files, onFileSelect, onFileCreate, activeFile, projectPath, onNewProject, onOpenProject, onSaveProject }) {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  // Debug: Log files when they change
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('FileExplorer received files:', Object.keys(files).length, 'files');
      if (Object.keys(files).length > 0) {
        console.log('File paths:', Object.keys(files));
      }
    }
  }, [files]);

  const toggleFolder = (folder) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folder]: !prev[folder]
    }));
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = {
      'js': '📄',
      'jsx': '⚛️',
      'ts': '📘',
      'tsx': '⚛️',
      'py': '🐍',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️',
      'html': '🌐',
      'css': '🎨',
      'json': '📋',
      'md': '📝'
    };
    return icons[ext] || '📄';
  };

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      const fileName = newFileName.includes('.') ? newFileName : `${newFileName}.js`;
      onFileCreate(fileName);
      setNewFileName('');
      setShowNewFileInput(false);
    }
  };

  const organizeFiles = () => {
    const folders = {};
    const rootFiles = [];

    Object.keys(files).forEach(filePath => {
      const parts = filePath.split('/');
      if (parts.length > 1) {
        const folder = parts[0];
        if (!folders[folder]) {
          folders[folder] = [];
        }
        folders[folder].push(filePath);
      } else {
        rootFiles.push(filePath);
      }
    });

    return { folders, rootFiles };
  };

  const { folders, rootFiles } = organizeFiles();

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <h3>EXPLORER</h3>
        <button
          onClick={() => setShowNewFileInput(!showNewFileInput)}
          style={{
            background: 'none',
            border: 'none',
            color: '#cccccc',
            cursor: 'pointer',
            fontSize: '1.2rem',
            padding: '0.25rem 0.5rem'
          }}
          title="New File"
        >
          +
        </button>
      </div>

      {projectPath && (
        <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#858585', borderBottom: '1px solid #3e3e42' }}>
          📁 {projectPath.split(/[/\\]/).pop()}
        </div>
      )}

      <div style={{ padding: '0.5rem', borderBottom: '1px solid #3e3e42' }}>
        <button
          onClick={onNewProject}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: '#0e639c',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.85rem',
            marginBottom: '0.25rem'
          }}
        >
          New Project
        </button>
        <button
          onClick={onOpenProject}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: '#3e3e42',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.85rem',
            marginBottom: '0.25rem'
          }}
        >
          Open Project
        </button>
        {projectPath && (
          <button
            onClick={onSaveProject}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: '#3e3e42',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Save Project
          </button>
        )}
      </div>

      {showNewFileInput && (
        <div style={{ padding: '0.5rem', borderBottom: '1px solid #3e3e42' }}>
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateFile()}
            placeholder="filename.js"
            style={{
              width: '100%',
              padding: '0.25rem',
              background: '#1e1e1e',
              border: '1px solid #3e3e42',
              borderRadius: '3px',
              color: '#d4d4d4',
              fontSize: '0.85rem'
            }}
            autoFocus
          />
        </div>
      )}

      {Object.keys(files).length === 0 ? (
        <div style={{ 
          padding: '1rem', 
          color: '#858585', 
          fontSize: '0.85rem',
          textAlign: 'center'
        }}>
          {projectPath ? 'No files in project folder' : 'No project folder selected'}
        </div>
      ) : (
        <ul className="file-tree">
          {Object.keys(folders).map(folder => (
            <li key={folder}>
              <div
                className="file-item"
                onClick={() => toggleFolder(folder)}
                style={{ color: '#858585' }}
              >
                <span className="file-icon">
                  {expandedFolders[folder] ? '📂' : '📁'}
                </span>
                {folder}
              </div>
              {expandedFolders[folder] && (
                <ul style={{ marginLeft: '1rem', listStyle: 'none' }}>
                  {folders[folder].map(filePath => (
                    <li key={filePath}>
                      <div
                        className={`file-item ${activeFile === filePath ? 'active' : ''}`}
                        onClick={() => onFileSelect(filePath, files[filePath])}
                      >
                        <span className="file-icon">{getFileIcon(filePath)}</span>
                        {filePath.split('/').pop()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
          {rootFiles.map(filePath => (
            <li key={filePath}>
              <div
                className={`file-item ${activeFile === filePath ? 'active' : ''}`}
                onClick={() => onFileSelect(filePath, files[filePath])}
              >
                <span className="file-icon">{getFileIcon(filePath)}</span>
                {filePath}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FileExplorer;

