const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

/**
 * Debug Session Manager
 * Manages debug sessions for various languages
 */
class DebugSessionManager {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.sessions = new Map(); // Map of sessionId -> session info
    this.breakpoints = new Map(); // Map of uri -> Set of line numbers
    this.watchExpressions = new Map(); // Map of sessionId -> Array of watch expressions
    this.nextSessionId = 1;
  }

  /**
   * Start a debug session for a file
   */
  startSession(uri, language) {
    logger.info('Starting debug session', { uri, language });

    const sessionId = `debug-${this.nextSessionId++}`;
    const filePath = this.resolvePath(uri);

    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: `File not found: ${filePath}`
      };
    }

    try {
      let debugAdapter;
      const session = {
        id: sessionId,
        uri,
        filePath,
        language,
        status: 'starting',
        paused: false,
        currentPosition: null,
        variables: {},
        callStack: [],
        createdAt: new Date(),
        debugAdapter: null
      };

      // Initialize debug adapter based on language
      debugAdapter = this.createDebugAdapter(session);
      session.debugAdapter = debugAdapter;

      this.sessions.set(sessionId, session);

      logger.info('Debug session started', { sessionId, uri, language });
      return {
        success: true,
        sessionId,
        uri,
        language
      };
    } catch (error) {
      logger.error('Failed to start debug session', { error: error.message, uri, language });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stop a debug session
   */
  stopSession(sessionId) {
    logger.info('Stopping debug session', { sessionId });

    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: `Session not found: ${sessionId}`
      };
    }

    try {
      // Stop debug adapter if it has a stop method
      if (session.debugAdapter && typeof session.debugAdapter.stop === 'function') {
        session.debugAdapter.stop();
      }

      session.status = 'stopped';
      this.sessions.delete(sessionId);

      logger.info('Debug session stopped', { sessionId });
      return {
        success: true,
        sessionId
      };
    } catch (error) {
      logger.error('Failed to stop debug session', { error: error.message, sessionId });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Pause debug session
   */
  pause(sessionId) {
    logger.debug('Pausing debug session', { sessionId });

    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    session.paused = true;
    session.status = 'paused';

    return { success: true, paused: true };
  }

  /**
   * Resume debug session
   */
  resume(sessionId) {
    logger.debug('Resuming debug session', { sessionId });

    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    session.paused = false;
    session.status = 'running';

    return { success: true, paused: false };
  }

  /**
   * Step over
   */
  stepOver(sessionId) {
    logger.debug('Step over', { sessionId });

    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // Simulate step over by updating position
    if (session.currentPosition) {
      session.currentPosition.line += 1;
      this.updateVariables(session);
    }

    return { success: true, position: session.currentPosition };
  }

  /**
   * Step into
   */
  stepInto(sessionId) {
    logger.debug('Step into', { sessionId });

    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // Simulate step into by adding to call stack
    if (session.currentPosition) {
      const frame = {
        name: `function_${session.callStack.length + 1}`,
        file: session.uri,
        line: session.currentPosition.line
      };
      session.callStack.unshift(frame);
      session.currentPosition.line += 1;
      this.updateVariables(session);
    }

    return { success: true, position: session.currentPosition, callStack: session.callStack };
  }

  /**
   * Step out
   */
  stepOut(sessionId) {
    logger.debug('Step out', { sessionId });

    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // Simulate step out by removing from call stack
    if (session.callStack.length > 0) {
      const frame = session.callStack.shift();
      session.currentPosition = { file: frame.file, line: frame.line };
      this.updateVariables(session);
    }

    return { success: true, position: session.currentPosition, callStack: session.callStack };
  }

  /**
   * Continue execution
   */
  continue(sessionId) {
    logger.debug('Continue execution', { sessionId });

    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    session.paused = false;
    session.status = 'running';

    return { success: true, status: session.status };
  }

  /**
   * Set breakpoint
   */
  setBreakpoint(uri, line, condition = null) {
    logger.debug('Setting breakpoint', { uri, line, condition });

    if (!this.breakpoints.has(uri)) {
      this.breakpoints.set(uri, new Set());
    }

    const fileBreakpoints = this.breakpoints.get(uri);
    fileBreakpoints.add(line);

    logger.info('Breakpoint set', { uri, line, condition });
    return {
      success: true,
      uri,
      line,
      condition,
      enabled: true
    };
  }

  /**
   * Remove breakpoint
   */
  removeBreakpoint(uri, line) {
    logger.debug('Removing breakpoint', { uri, line });

    const fileBreakpoints = this.breakpoints.get(uri);
    if (fileBreakpoints) {
      fileBreakpoints.delete(line);

      if (fileBreakpoints.size === 0) {
        this.breakpoints.delete(uri);
      }
    }

    logger.info('Breakpoint removed', { uri, line });
    return {
      success: true,
      uri,
      line
    };
  }

  /**
   * Clear all breakpoints for a file
   */
  clearBreakpoints(uri) {
    logger.debug('Clearing breakpoints', { uri });

    this.breakpoints.delete(uri);

    logger.info('All breakpoints cleared', { uri });
    return {
      success: true,
      uri
    };
  }

  /**
   * Get breakpoints for a file
   */
  getBreakpoints(uri) {
    const fileBreakpoints = this.breakpoints.get(uri);
    if (!fileBreakpoints) {
      return [];
    }

    return Array.from(fileBreakpoints).map(line => ({
      line,
      enabled: true
    }));
  }

  /**
   * Get all breakpoints
   */
  getAllBreakpoints() {
    const allBreakpoints = [];
    for (const [uri, lines] of this.breakpoints.entries()) {
      for (const line of lines) {
        allBreakpoints.push({
          uri,
          line,
          enabled: true
        });
      }
    }
    return allBreakpoints;
  }

  /**
   * Get variables for current position
   */
  getVariables(sessionId, uri) {
    logger.debug('Getting variables', { sessionId, uri });

    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found', variables: [] };
    }

    // Return cached variables
    return {
      success: true,
      variables: Object.entries(session.variables || {}).map(([name, info]) => ({
        name,
        type: info.type || 'unknown',
        value: info.value,
        scope: info.scope || 'local'
      }))
    };
  }

  /**
   * Get call stack
   */
  getCallStack(sessionId) {
    logger.debug('Getting call stack', { sessionId });

    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found', callStack: [] };
    }

    return {
      success: true,
      callStack: session.callStack || []
    };
  }

  /**
   * Add watch expression
   */
  addWatch(sessionId, expression) {
    logger.debug('Adding watch expression', { sessionId, expression });

    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (!this.watchExpressions.has(sessionId)) {
      this.watchExpressions.set(sessionId, []);
    }

    const watchId = `watch-${Date.now()}`;
    const watches = this.watchExpressions.get(sessionId);
    watches.push({
      id: watchId,
      expression,
      value: this.evaluateWatch(session, expression)
    });

    logger.info('Watch expression added', { sessionId, expression, watchId });
    return {
      success: true,
      watchId,
      expression,
      value: watches[watches.length - 1].value
    };
  }

  /**
   * Remove watch expression
   */
  removeWatch(sessionId, watchId) {
    logger.debug('Removing watch expression', { sessionId, watchId });

    const watches = this.watchExpressions.get(sessionId);
    if (!watches) {
      return { success: false, error: 'No watches for this session' };
    }

    const index = watches.findIndex(w => w.id === watchId);
    if (index === -1) {
      return { success: false, error: 'Watch not found' };
    }

    watches.splice(index, 1);

    logger.info('Watch expression removed', { sessionId, watchId });
    return { success: true, watchId };
  }

  /**
   * Get watch expressions for a session
   */
  getWatches(sessionId) {
    const watches = this.watchExpressions.get(sessionId);
    if (!watches) {
      return [];
    }

    const session = this.sessions.get(sessionId);
    return watches.map(watch => ({
      id: watch.id,
      expression: watch.expression,
      value: session ? this.evaluateWatch(session, watch.expression) : watch.value
    }));
  }

  /**
   * Get session info
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      id: session.id,
      uri: session.uri,
      filePath: session.filePath,
      language: session.language,
      status: session.status,
      paused: session.paused,
      currentPosition: session.currentPosition,
      breakpoints: this.getBreakpoints(session.uri),
      watchExpressions: this.getWatches(sessionId)
    };
  }

  /**
   * Get all sessions
   */
  getAllSessions() {
    const sessions = [];
    for (const session of this.sessions.values()) {
      sessions.push(this.getSession(session.id));
    }
    return sessions;
  }

  /**
   * Update session state from debug adapter
   */
  updateSession(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    Object.assign(session, updates);

    // Notify main window of update
    logger.debug('Session updated', { sessionId, updates });

    return { success: true, session: this.getSession(sessionId) };
  }

  /**
   * Create debug adapter for language
   */
  createDebugAdapter(session) {
    // This is a simplified adapter. In production, you'd integrate with actual debug adapters
    // like Chrome DevTools Protocol for JavaScript, pdb for Python, etc.

    return {
      type: 'mock',
      language: session.language,

      start: () => {
        session.status = 'running';
        session.currentPosition = { file: session.uri, line: 1 };
        this.updateVariables(session);
      },

      stop: () => {
        session.status = 'stopped';
      }
    };
  }

  /**
   * Update variables (simulate)
   */
  updateVariables(session) {
    // Simulate variable updates based on position
    session.variables = {
      counter: {
        type: 'number',
        value: session.currentPosition?.line || 0,
        scope: 'local'
      },
      fileName: {
        type: 'string',
        value: path.basename(session.filePath),
        scope: 'local'
      },
      isRunning: {
        type: 'boolean',
        value: session.status === 'running',
        scope: 'local'
      }
    };

    // Add global variables
    session.variables.globalVar = {
      type: 'string',
      value: 'global value',
      scope: 'global'
    };
  }

  /**
   * Evaluate watch expression
   */
  evaluateWatch(session, expression) {
    try {
      // Simple evaluation - in production, use actual debugger evaluation
      if (expression === 'counter') {
        return session.variables.counter?.value || 0;
      }
      if (expression === 'fileName') {
        return session.variables.fileName?.value || '';
      }
      if (expression === 'isRunning') {
        return session.variables.isRunning?.value || false;
      }
      return `<${expression}>`;
    } catch (error) {
      return `<error: ${error.message}>`;
    }
  }

  /**
   * Resolve file path from URI
   */
  resolvePath(uri) {
    if (uri.startsWith('file://')) {
      return uri.replace('file://', '');
    }
    if (path.isAbsolute(uri)) {
      return uri;
    }
    return path.join(this.projectPath || '.', uri);
  }

  /**
   * Stop all sessions
   */
  stopAll() {
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      this.stopSession(sessionId);
    }
    this.breakpoints.clear();
    this.watchExpressions.clear();
  }
}

// Export singleton instance
let debugSessionManager = null;

function initDebugSessionManager(projectPath) {
  if (!debugSessionManager) {
    debugSessionManager = new DebugSessionManager(projectPath);
  } else if (projectPath) {
    debugSessionManager.projectPath = projectPath;
  }
  return debugSessionManager;
}

function getDebugSessionManager() {
  return debugSessionManager;
}

module.exports = {
  DebugSessionManager,
  initDebugSessionManager,
  getDebugSessionManager
};
