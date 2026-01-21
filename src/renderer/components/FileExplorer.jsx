import React, { useState, useEffect } from 'react';
import FileContextMenu from './FileContextMenu';
import Breadcrumbs from './Breadcrumbs';

function FileExplorer({
  files,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
  onFolderCreate,
  activeFile,
  projectPath,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onFilesUpdate
}) {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHiddenFiles, setShowHiddenFiles] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMenuTarget, setContextMenuTarget] = useState(null);
  const [draggedFile, setDraggedFile] = useState(null);

  // Debug: Log files when they change (removed for performance)
  useEffect(() => {
    // Logging removed
  }, [files]);

  const getFileIcon = (fileName) => {
    if (fileName.includes('/')) {
      fileName = fileName.split('/').pop();
    }
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = {
      'js': '⚛️',
      'jsx': '⚛️',
      'ts': '🔷',
      'tsx': '🔷',
      'py': '🐍',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️',
      'html': '🏗️',
      'css': '🎨',
      'json': '📋',
      'md': '📝'
    };
    return icons[ext] || '📄';
  };

  const toggleFolder = (folder) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folder]: !prev[folder]
    }));
  };

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      const fileName = newFileName.includes('.') ? newFileName : `${newFileName}.js`;
      onFileCreate(fileName);
      setNewFileName('');
      setShowNewFileInput(false);
    }
  };

  const handleContextMenu = (event, filePath, isFolder = false) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    setContextMenu({
      x: rect.right,
      y: rect.top
    });
    setContextMenuTarget({ filePath, isFolder });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
    setContextMenuTarget(null);
  };

  const handleRename = () => {
    if (!contextMenuTarget) return;

    const newName = prompt('Enter new name:', contextMenuTarget.filePath.split('/').pop());
    if (newName && newName.trim()) {
      let newPath;
      if (contextMenuTarget.filePath.includes('/')) {
        const parts = contextMenuTarget.filePath.split('/');
        parts[parts.length - 1] = newName;
        newPath = parts.join('/');
      } else {
        newPath = newName;
      }

      if (onFileRename) {
        onFileRename(contextMenuTarget.filePath, newPath);
      } else {
        // Update files state directly if no callback provided
        const updatedFiles = {};
        Object.entries(files).forEach(([path, content]) => {
          if (path === contextMenuTarget.filePath) {
            updatedFiles[newPath] = content;
          } else {
            updatedFiles[path] = content;
          }
        });
        if (onFilesUpdate) onFilesUpdate(updatedFiles);
      }
    }
  };

  const handleDelete = () => {
    if (!contextMenuTarget) return;

    const fileName = contextMenuTarget.filePath.split('/').pop();
    const confirmed = window.confirm(`Are you sure you want to delete "${fileName}"?`);
    if (confirmed) {
      if (onFileDelete) {
        onFileDelete(contextMenuTarget.filePath);
      } else {
        // Update files state directly if no callback provided
        const updatedFiles = {};
        Object.entries(files).forEach(([path, content]) => {
          if (path !== contextMenuTarget.filePath) {
            updatedFiles[path] = content;
          }
        });
        if (onFilesUpdate) onFilesUpdate(updatedFiles);

        // Clear active file if it was the deleted file
        if (activeFile === contextMenuTarget.filePath && onFileSelect) {
          onFileSelect(null, null);
        }
      }
    }
  };

  const handleNewFile = () => {
    const fileName = prompt('Enter file name:', 'newfile.js');
    if (fileName && fileName.trim()) {
      const fullPath = contextMenuTarget?.filePath
        ? contextMenuTarget.isFolder
          ? `${contextMenuTarget.filePath}/${fileName}`
          : contextMenuTarget.filePath.substring(0, contextMenuTarget.filePath.lastIndexOf('/')) + `/${fileName}`
        : fileName;

      if (onFileCreate) {
        onFileCreate(fullPath);
      } else {
        const updatedFiles = { ...files, [fullPath]: '' };
        if (onFilesUpdate) onFilesUpdate(updatedFiles);
      }
    }
  };

  const handleNewFolder = () => {
    const folderName = prompt('Enter folder name:', 'newfolder');
    if (folderName && folderName.trim()) {
      const folderPath = contextMenuTarget?.filePath
        ? contextMenuTarget.isFolder
          ? `${contextMenuTarget.filePath}/${folderName}`
          : contextMenuTarget.filePath.substring(0, contextMenuTarget.filePath.lastIndexOf('/')) + `/${folderName}`
        : folderName;

      // Create a placeholder file in the folder
      const placeholderFile = `${folderPath}/.gitkeep`;

      if (onFileCreate) {
        onFileCreate(placeholderFile);
      } else {
        const updatedFiles = { ...files, [placeholderFile]: '' };
        if (onFilesUpdate) onFilesUpdate(updatedFiles);
      }
    }
  };

  const handleCopyPath = () => {
    if (!contextMenuTarget) return;

    navigator.clipboard.writeText(contextMenuTarget.filePath);
    alert('Path copied to clipboard!');
  };

  const handleDragStart = (e, filePath) => {
    setDraggedFile(filePath);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetPath) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetPath) => {
    e.preventDefault();

    if (!draggedFile || draggedFile === targetPath) return;

    // Don't allow dropping into itself or its children
    if (targetPath.startsWith(draggedFile + '/')) return;

    // Update file path
    const newFilePath = targetPath + '/' + draggedFile.split('/').pop();
    const updatedFiles = {};

    Object.entries(files).forEach(([path, content]) => {
      if (path === draggedFile) {
        updatedFiles[newFilePath] = content;
      } else {
        updatedFiles[path] = content;
      }
    });

    if (onFilesUpdate) onFilesUpdate(updatedFiles);

    // Update active file if needed
    if (activeFile === draggedFile && onFileSelect) {
      onFileSelect(newFilePath, files[draggedFile]);
    }

    setDraggedFile(null);
  };

  const handleDragEnd = () => {
    setDraggedFile(null);
  };

  const organizeFiles = () => {
    const folders = {};
    const rootFiles = [];

    Object.keys(files).forEach(filePath => {
      // Skip hidden files if toggle is off
      const fileName = filePath.split('/').pop();
      if (!showHiddenFiles && fileName.startsWith('.')) {
        return;
      }

      // Filter by search query
      if (searchQuery && !filePath.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }

      const parts = filePath.split(/[/\\]/);
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

      {/* Breadcrumbs */}
      {activeFile && (
        <Breadcrumbs
          projectPath={projectPath}
          activeFile={activeFile}
          onNavigate={(path) => {
            // Navigate to path - could expand folder or open file
            if (files[path]) {
              onFileSelect(path, files[path]);
            } else {
              // It's a folder, toggle expansion
              const folderName = path.split('/')[0];
              setExpandedFolders(prev => ({ ...prev, [folderName]: true }));
            }
          }}
        />
      )}

      {projectPath && (
        <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#858585', borderBottom: '1px solid #3e3e42' }}>
          📁 {projectPath.split(/[/\\]/).pop()}
        </div>
      )}

      {/* Search and Controls */}
      <div style={{ padding: '0.5rem', borderBottom: '1px solid #3e3e42' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files..."
          style={{
            width: '100%',
            padding: '0.5rem',
            background: '#1e1e1e',
            border: '1px solid #3e3e42',
            borderRadius: '3px',
            color: '#d4d4d4',
            fontSize: '0.85rem',
            marginBottom: '0.5rem'
          }}
        />
        <button
          onClick={() => setShowHiddenFiles(!showHiddenFiles)}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: showHiddenFiles ? '#0e639c' : '#3e3e42',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.85rem',
            marginBottom: '0.5rem'
          }}
          title="Toggle hidden files"
        >
          {showHiddenFiles ? '👁️ Show Hidden' : '👁️‍🗨️ Show Hidden'}
        </button>
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
          onClick={() => {
            console.log('Open Folder clicked');
            if (onOpenProject) onOpenProject();
          }}
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
          Open Folder
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
                onContextMenu={(e) => handleContextMenu(e, folder, true)}
                onDragOver={(e) => handleDragOver(e, folder)}
                onDrop={(e) => handleDrop(e, folder)}
                style={{
                  color: '#858585',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span className="file-icon">
                  {expandedFolders[folder] ? '📂' : '📁'}
                </span>
                <span>{folder}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#858585' }}>
                  ({folders[folder].length})
                </span>
              </div>
              {expandedFolders[folder] && (
                <ul style={{ marginLeft: '1rem', listStyle: 'none' }}>
                  {folders[folder].map(filePath => (
                    <li key={filePath}>
                      <div
                        className={`file-item ${activeFile === filePath ? 'active' : ''}`}
                        onClick={() => onFileSelect(filePath, files[filePath])}
                        onContextMenu={(e) => handleContextMenu(e, filePath)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, filePath)}
                        onDragEnd={handleDragEnd}
                        style={{
                          padding: '0.25rem 0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer',
                          background: activeFile === filePath ? '#37373d' : 'transparent'
                        }}
                      >
                        <span className="file-icon">{getFileIcon(filePath)}</span>
                        <span>{filePath.split('/').pop()}</span>
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
                onContextMenu={(e) => handleContextMenu(e, filePath)}
                draggable
                onDragStart={(e) => handleDragStart(e, filePath)}
                onDragEnd={handleDragEnd}
                style={{
                  padding: '0.25rem 0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  background: activeFile === filePath ? '#37373d' : 'transparent'
                }}
              >
                <span className="file-icon">{getFileIcon(filePath)}</span>
                <span>{filePath}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {contextMenu && (
        <FileContextMenu
          position={contextMenu}
          onClose={closeContextMenu}
          onRename={handleRename}
          onDelete={handleDelete}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onCopyPath={handleCopyPath}
        />
      )}
    </div>
  );
}

export default FileExplorer;
