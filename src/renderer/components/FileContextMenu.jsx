import React, { useState, useEffect, useRef } from 'react';

function FileContextMenu({ position, onClose, onRename, onDelete, onNewFile, onNewFolder, onCopyPath }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleAction = (action) => {
    action();
    onClose();
  };

  const style = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    background: '#252526',
    border: '1px solid #3e3e42',
    borderRadius: '4px',
    padding: '0.25rem 0',
    minWidth: '180px',
    zIndex: 1000,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
  };

  const itemStyle = {
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    color: '#cccccc',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'background 0.1s'
  };

  const itemHoverStyle = {
    ...itemStyle,
    background: '#094771'
  };

  const separatorStyle = {
    height: '1px',
    background: '#3e3e42',
    margin: '0.25rem 0'
  };

  return (
    <div ref={menuRef} style={style}>
      <div
        style={itemStyle}
        onMouseEnter={(e) => Object.assign(e.target.style, itemHoverStyle)}
        onMouseLeave={(e) => Object.assign(e.target.style, itemStyle)}
        onClick={() => handleAction(onRename)}
      >
        ✏️ Rename
      </div>
      <div
        style={itemStyle}
        onMouseEnter={(e) => Object.assign(e.target.style, itemHoverStyle)}
        onMouseLeave={(e) => Object.assign(e.target.style, itemStyle)}
        onClick={() => handleAction(onNewFile)}
      >
        📄 New File
      </div>
      <div
        style={itemStyle}
        onMouseEnter={(e) => Object.assign(e.target.style, itemHoverStyle)}
        onMouseLeave={(e) => Object.assign(e.target.style, itemStyle)}
        onClick={() => handleAction(onNewFolder)}
      >
        📁 New Folder
      </div>
      <div style={separatorStyle}></div>
      <div
        style={itemStyle}
        onMouseEnter={(e) => Object.assign(e.target.style, itemHoverStyle)}
        onMouseLeave={(e) => Object.assign(e.target.style, itemStyle)}
        onClick={() => handleAction(onCopyPath)}
      >
        📋 Copy Path
      </div>
      <div style={separatorStyle}></div>
      <div
        style={{ ...itemStyle, color: '#f85149' }}
        onMouseEnter={(e) => Object.assign(e.target.style, { ...itemHoverStyle, color: '#f85149' })}
        onMouseLeave={(e) => Object.assign(e.target.style, { ...itemStyle, color: '#f85149' })}
        onClick={() => handleAction(onDelete)}
      >
        🗑️ Delete
      </div>
    </div>
  );
}

export default FileContextMenu;
