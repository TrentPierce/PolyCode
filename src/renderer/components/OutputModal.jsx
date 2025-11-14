import React from 'react';

function OutputModal({ isOpen, onClose, title, message, isError = false }) {
  if (!isOpen) return null;

  return (
    <div 
      className="output-modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
    >
      <div 
        className="output-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1e1e1e',
          border: `1px solid ${isError ? '#ff6b6b' : '#4ec9b0'}`,
          borderRadius: '8px',
          padding: '1.5rem',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          borderBottom: '1px solid #3e3e42',
          paddingBottom: '0.5rem'
        }}>
          <h3 style={{
            margin: 0,
            color: isError ? '#ff6b6b' : '#4ec9b0',
            fontSize: '1.1rem'
          }}>
            {title || (isError ? 'Error' : 'Output')}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#858585',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0 0.5rem',
              lineHeight: '1'
            }}
            onMouseEnter={(e) => e.target.style.color = '#fff'}
            onMouseLeave={(e) => e.target.style.color = '#858585'}
          >
            ×
          </button>
        </div>
        <div style={{
          color: '#d4d4d4',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          lineHeight: '1.5',
          maxHeight: '60vh',
          overflow: 'auto'
        }}>
          {message}
        </div>
        <div style={{
          marginTop: '1rem',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#4ec9b0',
              border: 'none',
              color: '#1e1e1e',
              padding: '0.5rem 1.5rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}
            onMouseEnter={(e) => e.target.style.background = '#5ddcc0'}
            onMouseLeave={(e) => e.target.style.background = '#4ec9b0'}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default OutputModal;

