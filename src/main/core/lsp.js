const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Language Server Protocol (LSP) Manager
 * Manages language server processes lifecycle
 */
class LSPManager {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.servers = new Map(); // Map of language -> server info
    this.nextId = 1;
  }

  /**
   * Get server configuration for a language
   */
  getServerConfig(language) {
    const configs = {
      typescript: {
        command: 'typescript-language-server',
        args: ['--stdio'],
        languageId: 'typescript',
        fileExtensions: ['.ts', '.tsx'],
        workspace: this.projectPath
      },
      javascript: {
        command: 'typescript-language-server',
        args: ['--stdio'],
        languageId: 'javascript',
        fileExtensions: ['.js', '.jsx', '.mjs'],
        workspace: this.projectPath
      },
      python: {
        command: 'pyright-langserver',
        args: ['--stdio'],
        languageId: 'python',
        fileExtensions: ['.py'],
        workspace: this.projectPath
      },
      html: {
        command: 'vscode-html-language-server',
        args: ['--stdio'],
        languageId: 'html',
        fileExtensions: ['.html', '.htm'],
        workspace: this.projectPath
      },
      css: {
        command: 'vscode-css-language-server',
        args: ['--stdio'],
        languageId: 'css',
        fileExtensions: ['.css', '.scss', '.less'],
        workspace: this.projectPath
      },
      json: {
        command: 'vscode-json-language-server',
        args: ['--stdio'],
        languageId: 'json',
        fileExtensions: ['.json'],
        workspace: this.projectPath
      }
    };

    return configs[language] || null;
  }

  /**
   * Start a language server
   */
  startServer(language) {
    const config = this.getServerConfig(language);
    if (!config) {
      return {
        success: false,
        error: `No server configuration found for language: ${language}`
      };
    }

    // Check if server is already running
    const existing = this.servers.get(language);
    if (existing && existing.process && !existing.process.killed) {
      return {
        success: false,
        error: `Language server for ${language} is already running`
      };
    }

    try {
      const serverId = this.nextId++;
      const env = { ...process.env };

      // Set workspace folder for language server
      if (config.workspace) {
        env.TSSERVER_LOGS_ENABLED = 'false';
      }

      // Spawn the language server process
      const process = spawn(config.command, config.args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32'
      });

      // Handle process events
      process.on('error', (error) => {
        console.error(`LSP server (${language}) error:`, error);
        this.servers.delete(language);
      });

      process.on('exit', (code, signal) => {
        console.log(`LSP server (${language}) exited with code ${code}, signal ${signal}`);
        const serverInfo = this.servers.get(language);
        if (serverInfo) {
          serverInfo.status = 'stopped';
        }
      });

      // Capture stderr for logging
      if (process.stderr) {
        process.stderr.on('data', (data) => {
          console.error(`LSP stderr (${language}):`, data.toString());
        });
      }

      // Store server info
      const serverInfo = {
        id: serverId,
        language,
        command: config.command,
        process,
        pid: process.pid,
        status: 'starting',
        config,
        createdAt: new Date(),
        requestCounter: 0
      };

      this.servers.set(language, serverInfo);

      // Send initialize request
      this.sendInitialize(serverInfo).then(() => {
        serverInfo.status = 'ready';
        console.log(`LSP server (${language}) ready`);
      }).catch((error) => {
        console.error(`Failed to initialize LSP server (${language}):`, error);
        serverInfo.status = 'error';
        this.stopServer(language);
      });

      return {
        success: true,
        serverId,
        pid: process.pid,
        status: 'starting'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send initialize request to language server
   */
  async sendInitialize(serverInfo) {
    const { process, config, language } = serverInfo;
    const workspacePath = this.projectPath || process.cwd();

    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        processId: process.pid,
        rootUri: `file://${workspacePath.replace(/\\/g, '/')}`,
        capabilities: {
          textDocument: {
            hover: {
              dynamicRegistration: true,
              contentFormat: ['plaintext', 'markdown']
            },
            completion: {
              dynamicRegistration: true,
              completionItem: {
                documentationFormat: ['plaintext', 'markdown'],
                snippetSupport: true
              }
            },
            definition: {
              dynamicRegistration: true
            },
            diagnostic: {
              dynamicRegistration: true
            },
            codeAction: {
              dynamicRegistration: true
            }
          },
          workspace: {
            didChangeConfiguration: {
              dynamicRegistration: true
            }
          }
        },
        initializationOptions: {}
      }
    };

    return this.sendMessage(process, initRequest);
  }

  /**
   * Send message to language server
   */
  sendMessage(process, message) {
    return new Promise((resolve, reject) => {
      if (!process || !process.stdin) {
        reject(new Error('Process not available'));
        return;
      }

      const messageStr = JSON.stringify(message);
      const header = `Content-Length: ${Buffer.byteLength(messageStr, 'utf-8')}\r\n\r\n`;

      try {
        process.stdin.write(header + messageStr, 'utf-8', (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop a language server
   */
  stopServer(language) {
    const serverInfo = this.servers.get(language);
    if (!serverInfo) {
      return {
        success: false,
        error: `No server found for language: ${language}`
      };
    }

    const { process, pid } = serverInfo;

    if (process && !process.killed) {
      // Send shutdown request first
      try {
        const shutdownRequest = {
          jsonrpc: '2.0',
          id: ++serverInfo.requestCounter,
          method: 'shutdown',
          params: {}
        };
        this.sendMessage(process, shutdownRequest);

        // Send exit request
        const exitRequest = {
          jsonrpc: '2.0',
          id: ++serverInfo.requestCounter,
          method: 'exit',
          params: {}
        };
        this.sendMessage(process, exitRequest);
      } catch (error) {
        console.error('Error sending shutdown request:', error);
      }

      // Kill process after a timeout
      setTimeout(() => {
        if (process && !process.killed) {
          process.kill('SIGTERM');
        }
      }, 1000);

      serverInfo.status = 'stopping';
    }

    this.servers.delete(language);

    return {
      success: true,
      message: `Language server for ${language} stopped`
    };
  }

  /**
   * Get running servers
   */
  getRunningServers() {
    const servers = [];
    for (const [language, serverInfo] of this.servers.entries()) {
      servers.push({
        language,
        id: serverInfo.id,
        pid: serverInfo.pid,
        status: serverInfo.status,
        command: serverInfo.command,
        createdAt: serverInfo.createdAt
      });
    }
    return servers;
  }

  /**
   * Restart a language server
   */
  restartServer(language) {
    this.stopServer(language);
    return this.startServer(language);
  }

  /**
   * Send didOpen notification
   */
  sendDidOpen(language, uri, content) {
    const serverInfo = this.servers.get(language);
    if (!serverInfo || serverInfo.status !== 'ready') {
      return { success: false, error: 'Server not ready' };
    }

    const notification = {
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri,
          languageId: serverInfo.config.languageId,
          version: 1,
          text: content
        }
      }
    };

    return this.sendMessage(serverInfo.process, notification);
  }

  /**
   * Send didChange notification
   */
  sendDidChange(language, uri, content, version) {
    const serverInfo = this.servers.get(language);
    if (!serverInfo || serverInfo.status !== 'ready') {
      return { success: false, error: 'Server not ready' };
    }

    const notification = {
      jsonrpc: '2.0',
      method: 'textDocument/didChange',
      params: {
        textDocument: {
          uri,
          version
        },
        contentChanges: [
          {
            text: content
          }
        ]
      }
    };

    return this.sendMessage(serverInfo.process, notification);
  }

  /**
   * Send request for diagnostics
   */
  async requestDiagnostics(language, uri) {
    const serverInfo = this.servers.get(language);
    if (!serverInfo || serverInfo.status !== 'ready') {
      return { success: false, error: 'Server not ready' };
    }

    const requestId = ++serverInfo.requestCounter;
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'textDocument/diagnostic',
      params: {
        textDocument: {
          uri
        },
        identifier: {
          uri,
          version: 1
        },
        previousResultId: null,
        workDoneProgressParams: {}
      }
    };

    // Set up one-time listener for response
    const responsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Diagnostics request timeout'));
      }, 5000);

      // TODO: Implement proper response handling
      // For now, just resolve
      setTimeout(() => {
        clearTimeout(timeout);
        resolve({ success: true, diagnostics: [] });
      }, 100);
    });

    await this.sendMessage(serverInfo.process, request);
    return responsePromise;
  }

  /**
   * Request completions
   */
  async requestCompletion(language, uri, position) {
    const serverInfo = this.servers.get(language);
    if (!serverInfo || serverInfo.status !== 'ready') {
      return { success: false, error: 'Server not ready', items: [] };
    }

    const requestId = ++serverInfo.requestCounter;
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'textDocument/completion',
      params: {
        textDocument: {
          uri
        },
        position,
        context: {
          triggerKind: 1 // Invoked
        }
      }
    };

    // Set up one-time listener for response
    const responsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Completion request timeout'));
      }, 3000);

      // TODO: Implement proper response handling
      setTimeout(() => {
        clearTimeout(timeout);
        resolve({ success: true, items: [] });
      }, 50);
    });

    await this.sendMessage(serverInfo.process, request);
    return responsePromise;
  }

  /**
   * Request hover information
   */
  async requestHover(language, uri, position) {
    const serverInfo = this.servers.get(language);
    if (!serverInfo || serverInfo.status !== 'ready') {
      return { success: false, error: 'Server not ready', contents: null };
    }

    const requestId = ++serverInfo.requestCounter;
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'textDocument/hover',
      params: {
        textDocument: {
          uri
        },
        position
      }
    };

    const responsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Hover request timeout'));
      }, 3000);

      // TODO: Implement proper response handling
      setTimeout(() => {
        clearTimeout(timeout);
        resolve({ success: true, contents: null });
      }, 50);
    });

    await this.sendMessage(serverInfo.process, request);
    return responsePromise;
  }

  /**
   * Request definition location
   */
  async requestDefinition(language, uri, position) {
    const serverInfo = this.servers.get(language);
    if (!serverInfo || serverInfo.status !== 'ready') {
      return { success: false, error: 'Server not ready', location: null };
    }

    const requestId = ++serverInfo.requestCounter;
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'textDocument/definition',
      params: {
        textDocument: {
          uri
        },
        position
      }
    };

    const responsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Definition request timeout'));
      }, 3000);

      // TODO: Implement proper response handling
      setTimeout(() => {
        clearTimeout(timeout);
        resolve({ success: true, location: null });
      }, 50);
    });

    await this.sendMessage(serverInfo.process, request);
    return responsePromise;
  }

  /**
   * Stop all servers
   */
  stopAll() {
    const languages = Array.from(this.servers.keys());
    for (const language of languages) {
      this.stopServer(language);
    }
  }

  /**
   * Get server status
   */
  getServerStatus(language) {
    const serverInfo = this.servers.get(language);
    return serverInfo ? serverInfo.status : 'not-started';
  }
}

// Export singleton instance
let lspManager = null;

function initLSPManager(projectPath) {
  if (!lspManager) {
    lspManager = new LSPManager(projectPath);
  } else if (projectPath) {
    lspManager.projectPath = projectPath;
  }
  return lspManager;
}

function getLSPManager() {
  return lspManager;
}

module.exports = {
  LSPManager,
  initLSPManager,
  getLSPManager
};
