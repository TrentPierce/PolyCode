import React from 'react';

function DebugToolbar({
  debugSession,
  onStartDebug,
  onStopDebug,
  onPause,
  onResume,
  onStepOver,
  onStepInto,
  onStepOut,
  onContinue
}) {
  const isSessionActive = debugSession && debugSession.status !== 'stopped';
  const isPaused = debugSession && debugSession.paused;

  return (
    <div className="debug-toolbar">
      <div className="debug-toolbar-title">Debug</div>
      <div className="debug-toolbar-controls">
        {!isSessionActive ? (
          <button
            className="debug-toolbar-button debug-start-button"
            onClick={onStartDebug}
            title="Start Debug (F5)"
          >
            ▶ Start Debugging
          </button>
        ) : (
          <>
            <button
              className="debug-toolbar-button debug-stop-button"
              onClick={onStopDebug}
              title="Stop Debug (Shift+F5)"
            >
              ⏹ Stop
            </button>
            <div className="debug-toolbar-separator" />
            <button
              className={`debug-toolbar-button ${isPaused ? 'debug-pause-active' : ''}`}
              onClick={onPause}
              disabled={isPaused}
              title="Pause"
            >
              ⏸ Pause
            </button>
            <button
              className="debug-toolbar-button"
              onClick={onResume}
              disabled={!isPaused}
              title="Resume (F5)"
            >
              ▶ Resume
            </button>
            <div className="debug-toolbar-separator" />
            <button
              className="debug-toolbar-button"
              onClick={onStepOver}
              disabled={!isPaused}
              title="Step Over (F10)"
            >
              ⤵ Step Over
            </button>
            <button
              className="debug-toolbar-button"
              onClick={onStepInto}
              disabled={!isPaused}
              title="Step Into (F11)"
            >
              ⤶ Step Into
            </button>
            <button
              className="debug-toolbar-button"
              onClick={onStepOut}
              disabled={!isPaused}
              title="Step Out (Shift+F11)"
            >
              ⤴ Step Out
            </button>
            <button
              className="debug-toolbar-button"
              onClick={onContinue}
              disabled={!isPaused}
              title="Continue"
            >
              ⏩ Continue
            </button>
          </>
        )}
      </div>
      <div className="debug-toolbar-status">
        {debugSession ? (
          <span className={`debug-status-indicator debug-status-${debugSession.status}`}>
            {debugSession.status === 'running' && '● Running'}
            {debugSession.status === 'paused' && '⏸ Paused'}
            {debugSession.status === 'stopped' && '⏹ Stopped'}
            {debugSession.status === 'starting' && '⟳ Starting...'}
          </span>
        ) : (
          <span className="debug-status-indicator debug-status-inactive">
            ○ Not Debugging
          </span>
        )}
      </div>
    </div>
  );
}

export default DebugToolbar;
