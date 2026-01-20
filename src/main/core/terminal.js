const os = require('os');
const path = require('path');
const pty = require('node-pty');

class TerminalManager {
  constructor() {
    this.terminals = new Map(); // Store terminals by ID
    this.nextTerminalId = 1;
  }

  /**
   * Spawn a new terminal instance
   * @param {string} cwd - Current working directory
   * @param {Object} options - Terminal options
   * @returns {Object} Terminal information
   */
  spawnTerminal(cwd = null, options = {}) {
    const terminalId = `term-${this.nextTerminalId++}`;

    // Determine the working directory
    let workingDir = cwd || os.homedir();

    // Determine the shell based on the platform
    let shell;
    let shellArgs = [];

    if (process.platform === 'win32') {
      // Windows: Use cmd.exe or PowerShell
      shell = process.env.COMSPEC || 'cmd.exe';
      shellArgs = [];
    } else {
      // Mac/Linux: Use bash or zsh
      shell = process.env.SHELL || '/bin/bash';
      shellArgs = [];
    }

    // Set environment variables
    const env = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      FORCE_COLOR: '1',
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8'
    };

    try {
      // Create pseudo-terminal
      const ptyProcess = pty.spawn(shell, shellArgs, {
        name: 'xterm-256color',
        cols: options.cols || 80,
        rows: options.rows || 24,
        cwd: workingDir,
        env: env,
        useConpty: process.platform === 'win32', // Use ConPTY on Windows
        encoding: 'utf8'
      });

      // Store terminal information
      const terminal = {
        id: terminalId,
        ptyProcess: ptyProcess,
        cwd: workingDir,
        shell: shell,
        pid: ptyProcess.pid,
        cols: options.cols || 80,
        rows: options.rows || 24,
        state: 'active'
      };

      this.terminals.set(terminalId, terminal);

      // Handle data from the shell
      ptyProcess.onData((data) => {
        // This will be forwarded to the renderer process via IPC
        if (this.onDataCallback) {
          this.onDataCallback(terminalId, data);
        }
      });

      // Handle process exit
      ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`Terminal ${terminalId} exited with code ${exitCode}, signal ${signal}`);
        this.terminals.delete(terminalId);

        if (this.onExitCallback) {
          this.onExitCallback(terminalId, exitCode, signal);
        }
      });

      // Clear screen initially
      ptyProcess.write('\x1b[2J\x1b[H'); // ANSI escape codes to clear screen and move cursor to home

      console.log(`Terminal ${terminalId} spawned with PID ${ptyProcess.pid} in ${workingDir}`);

      return {
        success: true,
        terminalId: terminalId,
        pid: ptyProcess.pid,
        cwd: workingDir,
        shell: shell
      };
    } catch (error) {
      console.error('Failed to spawn terminal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Write input to a terminal
   * @param {string} terminalId - Terminal ID
   * @param {string} data - Input data to send to terminal
   */
  writeInput(terminalId, data) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      return { success: false, error: 'Terminal not found' };
    }

    try {
      terminal.ptyProcess.write(data);
      return { success: true };
    } catch (error) {
      console.error('Failed to write to terminal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resize a terminal
   * @param {string} terminalId - Terminal ID
   * @param {number} cols - Number of columns
   * @param {number} rows - Number of rows
   */
  resizeTerminal(terminalId, cols, rows) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      return { success: false, error: 'Terminal not found' };
    }

    try {
      terminal.ptyProcess.resize(cols, rows);
      terminal.cols = cols;
      terminal.rows = rows;
      return { success: true };
    } catch (error) {
      console.error('Failed to resize terminal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Kill a terminal
   * @param {string} terminalId - Terminal ID
   */
  killTerminal(terminalId) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      return { success: false, error: 'Terminal not found' };
    }

    try {
      terminal.ptyProcess.kill();
      terminal.state = 'killed';
      this.terminals.delete(terminalId);
      console.log(`Terminal ${terminalId} killed`);
      return { success: true };
    } catch (error) {
      console.error('Failed to kill terminal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get list of active terminals
   * @returns {Array} List of terminal information
   */
  getTerminals() {
    const terminals = [];
    for (const [id, terminal] of this.terminals) {
      terminals.push({
        id: terminal.id,
        pid: terminal.pid,
        cwd: terminal.cwd,
        shell: terminal.shell,
        state: terminal.state
      });
    }
    return terminals;
  }

  /**
   * Get a specific terminal
   * @param {string} terminalId - Terminal ID
   * @returns {Object} Terminal information
   */
  getTerminal(terminalId) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      return null;
    }

    return {
      id: terminal.id,
      pid: terminal.pid,
      cwd: terminal.cwd,
      shell: terminal.shell,
      state: terminal.state,
      cols: terminal.cols,
      rows: terminal.rows
    };
  }

  /**
   * Set callback for terminal data events
   * @param {Function} callback - Callback function
   */
  onData(callback) {
    this.onDataCallback = callback;
  }

  /**
   * Set callback for terminal exit events
   * @param {Function} callback - Callback function
   */
  onExit(callback) {
    this.onExitCallback = callback;
  }

  /**
   * Kill all terminals (cleanup on app exit)
   */
  killAll() {
    for (const [terminalId, terminal] of this.terminals) {
      try {
        terminal.ptyProcess.kill();
        console.log(`Terminal ${terminalId} killed during cleanup`);
      } catch (error) {
        console.error(`Failed to kill terminal ${terminalId}:`, error);
      }
    }
    this.terminals.clear();
  }
}

// Export singleton instance
module.exports = new TerminalManager();
