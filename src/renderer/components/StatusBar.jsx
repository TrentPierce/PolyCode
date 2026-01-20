import React from 'react';

function StatusBar({
  language,
  isConnected,
  activeFile,
  onSettingsClick,
  isDirty,
  lastSaved,
  lspStatus
}) {
  const formatLastSaved = (timestamp) => {
    if (!timestamp) return 'Not saved';
    const now = new Date();
    const saved = new Date(timestamp);
    const diff = now - saved;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return saved.toLocaleDateString();
  };

  const getLSPStatusDisplay = () => {
    switch (lspStatus) {
      case 'connected':
        return { icon: '✓', text: 'LSP', color: '#4ec9b0' };
      case 'starting':
        return { icon: '⟳', text: 'LSP...', color: '#cca700' };
      case 'error':
        return { icon: '✗', text: 'LSP Error', color: '#f14c4c' };
      case 'disconnected':
      default:
        return { icon: '○', text: 'No LSP', color: '#858585' };
    }
  };

  const lspDisplay = getLSPStatusDisplay();

  return (
    <div className="status-bar">
      <div className="status-item">
        {isConnected ? '✓ LMStudio Connected' : '✗ LMStudio Disconnected'}
      </div>
      <div className="status-item" style={{ color: lspDisplay.color, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {lspDisplay.icon} {lspDisplay.text}
      </div>
      {activeFile && (
        <div className="status-item">
          {activeFile}
          {isDirty && (
            <span
              className="dirty-indicator"
              title="Unsaved changes"
              style={{
                marginLeft: '0.5rem',
                color: '#ffa500',
                fontSize: '0.8rem'
              }}
            >
              ●
            </span>
          )}
        </div>
      )}
      {activeFile && (
        <div className="status-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem' }}>💾</span>
          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
            Last saved: {formatLastSaved(lastSaved)}
          </span>
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
          onMouseEnter={(e) => (e.target.style.opacity = '1')}
          onMouseLeave={(e) => (e.target.style.opacity = '0.8')}
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


