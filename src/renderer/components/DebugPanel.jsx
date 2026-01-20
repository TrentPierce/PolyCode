import React, { useState, useEffect } from 'react';

function DebugPanel({
  debugSession,
  variables = [],
  callStack = [],
  breakpoints = [],
  watchExpressions = [],
  onPause,
  onResume,
  onStepOver,
  onStepInto,
  onStepOut,
  onContinue,
  onBreakpointRemove,
  onWatchAdd,
  onWatchRemove,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('variables');
  const [newWatchExpression, setNewWatchExpression] = useState('');

  const handleAddWatch = () => {
    if (newWatchExpression.trim()) {
      onWatchAdd(newWatchExpression);
      setNewWatchExpression('');
    }
  };

  const handleWatchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddWatch();
    }
  };

  return (
    <div className="debug-panel">
      <div className="debug-panel-header">
        <h3>Debug</h3>
        <button className="debug-close-button" onClick={onClose}>×</button>
      </div>

      <div className="debug-panel-tabs">
        <button
          className={`debug-tab ${activeTab === 'variables' ? 'active' : ''}`}
          onClick={() => setActiveTab('variables')}
        >
          Variables
        </button>
        <button
          className={`debug-tab ${activeTab === 'callstack' ? 'active' : ''}`}
          onClick={() => setActiveTab('callstack')}
        >
          Call Stack
        </button>
        <button
          className={`debug-tab ${activeTab === 'breakpoints' ? 'active' : ''}`}
          onClick={() => setActiveTab('breakpoints')}
        >
          Breakpoints
        </button>
        <button
          className={`debug-tab ${activeTab === 'watch' ? 'active' : ''}`}
          onClick={() => setActiveTab('watch')}
        >
          Watch
        </button>
      </div>

      <div className="debug-panel-content">
        {activeTab === 'variables' && (
          <div className="debug-section">
            <div className="debug-section-title">Variables</div>
            {debugSession?.currentPosition && (
              <div className="debug-current-position">
                <span className="debug-position-label">Current:</span>
                <span className="debug-position-value">
                  {debugSession.currentPosition.file}:{debugSession.currentPosition.line}
                </span>
              </div>
            )}
            <table className="debug-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {variables.length > 0 ? (
                  variables.map((variable, index) => (
                    <tr
                      key={index}
                      className={`debug-variable-row debug-variable-${variable.scope}`}
                    >
                      <td className="debug-variable-name">{variable.name}</td>
                      <td className="debug-variable-type">{variable.type}</td>
                      <td className="debug-variable-value">{variable.value}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="debug-empty-state">
                      No variables to display
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'callstack' && (
          <div className="debug-section">
            <div className="debug-section-title">Call Stack</div>
            {callStack.length > 0 ? (
              <ul className="debug-callstack-list">
                {callStack.map((frame, index) => (
                  <li key={index} className="debug-callstack-frame">
                    <span className="debug-frame-name">{frame.name}</span>
                    <span className="debug-frame-location">
                      {frame.file}:{frame.line}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="debug-empty-state">
                No call stack information available
              </div>
            )}
          </div>
        )}

        {activeTab === 'breakpoints' && (
          <div className="debug-section">
            <div className="debug-section-title">Breakpoints</div>
            {breakpoints.length > 0 ? (
              <ul className="debug-breakpoints-list">
                {breakpoints.map((bp, index) => (
                  <li key={index} className="debug-breakpoint-item">
                    <span className="debug-breakpoint-line">{bp.line}</span>
                    <span className="debug-breakpoint-file">
                      {bp.uri.split('/').pop()}
                    </span>
                    <button
                      className="debug-breakpoint-remove"
                      onClick={() => onBreakpointRemove(bp.uri, bp.line)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="debug-empty-state">
                No breakpoints set. Click on the gutter to add breakpoints.
              </div>
            )}
          </div>
        )}

        {activeTab === 'watch' && (
          <div className="debug-section">
            <div className="debug-section-title">Watch Expressions</div>
            <div className="debug-watch-input-container">
              <input
                type="text"
                className="debug-watch-input"
                placeholder="Enter expression to watch..."
                value={newWatchExpression}
                onChange={(e) => setNewWatchExpression(e.target.value)}
                onKeyPress={handleWatchKeyPress}
              />
              <button
                className="debug-watch-add"
                onClick={handleAddWatch}
              >
                Add
              </button>
            </div>
            {watchExpressions.length > 0 ? (
              <ul className="debug-watch-list">
                {watchExpressions.map((watch, index) => (
                  <li key={index} className="debug-watch-item">
                    <span className="debug-watch-expression">{watch.expression}</span>
                    <span className="debug-watch-value">{watch.value}</span>
                    <button
                      className="debug-watch-remove"
                      onClick={() => onWatchRemove(watch.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="debug-empty-state">
                No watch expressions. Add expressions above to monitor their values.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="debug-panel-footer">
        <div className="debug-controls">
          {debugSession?.status !== 'stopped' && (
            <>
              <button
                className="debug-control-button"
                onClick={onPause}
                disabled={!debugSession || debugSession.paused}
                title="Pause"
              >
                ⏸
              </button>
              <button
                className="debug-control-button"
                onClick={onResume}
                disabled={!debugSession || !debugSession.paused}
                title="Resume"
              >
                ▶
              </button>
              <button
                className="debug-control-button"
                onClick={onStepOver}
                disabled={!debugSession || !debugSession.paused}
                title="Step Over (F10)"
              >
                ⤵
              </button>
              <button
                className="debug-control-button"
                onClick={onStepInto}
                disabled={!debugSession || !debugSession.paused}
                title="Step Into (F11)"
              >
                ⤶
              </button>
              <button
                className="debug-control-button"
                onClick={onStepOut}
                disabled={!debugSession || !debugSession.paused}
                title="Step Out (Shift+F11)"
              >
                ⤴
              </button>
              <button
                className="debug-control-button"
                onClick={onContinue}
                disabled={!debugSession || !debugSession.paused}
                title="Continue"
              >
                ⏩
              </button>
            </>
          )}
          {debugSession?.status === 'stopped' && (
            <div className="debug-stopped-message">
              Debug session stopped. Start debugging to continue.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DebugPanel;
