import React, { useEffect, useRef } from 'react';

function DeliberationChat({ messages, isActive }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getMessageTypeColor = (type) => {
    switch (type) {
      case 'deliberation':
        return '#4ec9b0';
      case 'consensus':
        return '#dcdcaa';
      case 'generation':
        return '#569cd6';
      case 'evaluation':
        return '#ce9178';
      case 'file':
        return '#4ec9b0';
      case 'file-edit':
        return '#4ec9b0';
      default:
        return '#858585';
    }
  };

  const getMessageTypeIcon = (type) => {
    switch (type) {
      case 'deliberation':
        return '💭';
      case 'consensus':
        return '🤝';
      case 'generation':
        return '⚙️';
      case 'evaluation':
        return '⭐';
      case 'file':
        return '📄';
      case 'file-edit':
        return '✏️';
      default:
        return '💬';
    }
  };

  const getOperationIcon = (operation) => {
    switch (operation) {
      case 'created':
        return '➕';
      case 'modified':
        return '✏️';
      case 'deleted':
        return '🗑️';
      default:
        return '📝';
    }
  };

  const renderFileDiff = (diff, fileName) => {
    if (!diff || diff.length === 0) return null;

    return (
      <div style={{
        marginTop: '0.75rem',
        border: '1px solid #3e3e42',
        borderRadius: '4px',
        overflow: 'hidden',
        background: '#1e1e1e'
      }}>
        <div style={{
          padding: '0.5rem',
          background: '#2d2d30',
          borderBottom: '1px solid #3e3e42',
          fontSize: '0.8rem',
          fontWeight: '600',
          color: '#4ec9b0',
          fontFamily: 'monospace'
        }}>
          {fileName}
        </div>
        <div style={{
          maxHeight: '300px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          lineHeight: '1.4'
        }}>
          {diff.map((change, idx) => {
            if (change.type === 'added') {
              return (
                <div key={idx} style={{
                  padding: '0.25rem 0.5rem',
                  background: 'rgba(0, 255, 0, 0.1)',
                  borderLeft: '3px solid #4ec9b0',
                  color: '#d4d4d4',
                  display: 'flex',
                  alignItems: 'flex-start'
                }}>
                  <span style={{ 
                    color: '#4ec9b0', 
                    marginRight: '0.5rem',
                    fontWeight: 'bold',
                    minWidth: '20px'
                  }}>+</span>
                  <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {change.content || '\u00A0'}
                  </span>
                </div>
              );
            } else if (change.type === 'deleted') {
              return (
                <div key={idx} style={{
                  padding: '0.25rem 0.5rem',
                  background: 'rgba(255, 0, 0, 0.1)',
                  borderLeft: '3px solid #ff6b6b',
                  color: '#858585',
                  textDecoration: 'line-through',
                  display: 'flex',
                  alignItems: 'flex-start'
                }}>
                  <span style={{ 
                    color: '#ff6b6b', 
                    marginRight: '0.5rem',
                    fontWeight: 'bold',
                    minWidth: '20px'
                  }}>-</span>
                  <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {change.content || '\u00A0'}
                  </span>
                </div>
              );
            } else if (change.type === 'modified') {
              return (
                <div key={idx}>
                  <div style={{
                    padding: '0.25rem 0.5rem',
                    background: 'rgba(255, 0, 0, 0.1)',
                    borderLeft: '3px solid #ff6b6b',
                    color: '#858585',
                    textDecoration: 'line-through',
                    display: 'flex',
                    alignItems: 'flex-start'
                  }}>
                    <span style={{ 
                      color: '#ff6b6b', 
                      marginRight: '0.5rem',
                      fontWeight: 'bold',
                      minWidth: '20px'
                    }}>-</span>
                    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {change.oldContent || '\u00A0'}
                    </span>
                  </div>
                  <div style={{
                    padding: '0.25rem 0.5rem',
                    background: 'rgba(0, 255, 0, 0.1)',
                    borderLeft: '3px solid #4ec9b0',
                    color: '#d4d4d4',
                    display: 'flex',
                    alignItems: 'flex-start'
                  }}>
                    <span style={{ 
                      color: '#4ec9b0', 
                      marginRight: '0.5rem',
                      fontWeight: 'bold',
                      minWidth: '20px'
                    }}>+</span>
                    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {change.newContent || '\u00A0'}
                    </span>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className="deliberation-chat" style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#1e1e1e',
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: '1rem', 
        borderBottom: '1px solid #3e3e42',
        background: '#2d2d30'
      }}>
        <h3 style={{ margin: 0, color: '#4ec9b0', fontSize: '1rem' }}>
          🤖 Model Deliberation
        </h3>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#858585' }}>
          Watch models discuss and collaborate in real-time
        </p>
      </div>
      
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {messages.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#858585', 
            padding: '2rem',
            fontSize: '0.9rem'
          }}>
            No deliberation activity yet. Start generating code to see models collaborate!
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                background: '#252526',
                border: `1px solid ${getMessageTypeColor(msg.type)}`,
                borderRadius: '6px',
                padding: '0.75rem',
                borderLeft: `4px solid ${getMessageTypeColor(msg.type)}`
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '0.5rem',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1rem' }}>
                  {getMessageTypeIcon(msg.type)}
                </span>
                <span style={{ 
                  color: getMessageTypeColor(msg.type), 
                  fontWeight: '600',
                  fontSize: '0.85rem'
                }}>
                  {msg.model || msg.type}
                </span>
                {msg.fileName && (
                  <span style={{
                    color: '#858585',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    marginLeft: '0.5rem'
                  }}>
                    {getOperationIcon(msg.operation)} {msg.fileName}
                  </span>
                )}
                <span style={{ 
                  color: '#666', 
                  fontSize: '0.7rem',
                  marginLeft: 'auto'
                }}>
                  {msg.phase || msg.type}
                </span>
              </div>
              
              {msg.type === 'file-edit' && msg.diff ? (
                renderFileDiff(msg.diff, msg.fileName)
              ) : (
                <div style={{ 
                  color: '#d4d4d4', 
                  fontSize: '0.85rem',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  lineHeight: '1.5'
                }}>
                  {msg.content}
                </div>
              )}
              
              {msg.files && msg.type !== 'file-edit' && (
                <div style={{ 
                  marginTop: '0.5rem', 
                  paddingTop: '0.5rem',
                  borderTop: '1px solid #3e3e42',
                  fontSize: '0.75rem',
                  color: '#858585'
                }}>
                  📁 Files: {msg.files.join(', ')}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default DeliberationChat;
