import React from 'react';

function StatusBar({ language, isConnected, activeFile, onSettingsClick }) {
  return (
    <div className="status-bar">
      <div className="status-item">
        {isConnected ? '✓ LMStudio' : '✗ LMStudio'}
      </div>
      {language && (
        <div className="status-item">
          {language}
        </div>
      )}
      {activeFile && (
        <div className="status-item">
          {activeFile}
        </div>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={onSettingsClick}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.75rem',
            padding: '0.25rem 0.5rem',
            borderRadius: '3px',
            opacity: 0.8
          }}
          onMouseEnter={(e) => e.target.style.opacity = '1'}
          onMouseLeave={(e) => e.target.style.opacity = '0.8'}
          title="Settings"
        >
          ⚙️ Settings
        </button>
        <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>
          PolyCode IDE v1.0.0
        </div>
      </div>
    </div>
  );
}

export default StatusBar;

