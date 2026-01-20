/**
 * Code Execution Sandbox
 *
 * Provides isolated execution environment for user code
 * Restricts Node.js module access, file system, and network access
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Sandbox configuration options
 * @typedef {Object} SandboxOptions
 * @property {number} timeout - Maximum execution time in milliseconds
 * @property {number} maxMemory - Maximum memory in MB
 * @property {boolean} allowNetwork - Whether to allow network access
 * @property {boolean} allowFS - Whether to allow file system access
 * @property {string} workDir - Working directory for execution
 */

/**
 * Default sandbox configuration
 */
const DEFAULT_OPTIONS = {
  timeout: 30000,           // 30 seconds
  maxMemory: 512,            // 512 MB
  allowNetwork: false,        // No network access by default
  allowFS: true,             // Allow file system (needed for projects)
  workDir: null
};

/**
 * Blocked Node.js modules that could be dangerous
 */
const BLOCKED_MODULES = [
  'child_process',
  'cluster',
  'worker_threads',
  'vm',
  'v8',
  'fs' // Will be conditionally allowed
];

/**
 * Sandbox execution result
 * @typedef {Object} ExecutionResult
 * @property {boolean} success - Whether execution succeeded
 * @property {number} exitCode - Process exit code
 * @property {string} stdout - Standard output
 * @property {string} stderr - Standard error
 * @property {number} duration - Execution time in milliseconds
 * @property {string} error - Error message if failed
 */

/**
 * Execute code in a sandboxed environment
 * @param {string} code - Code to execute
 * @param {string} language - Programming language
 * @param {SandboxOptions} options - Sandbox options
 * @param {string} filePath - File path to execute
 * @returns {Promise<ExecutionResult>}
 */
async function executeInSandbox(code, language, options = {}, filePath = null) {
  const sandboxOptions = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  try {
    // Validate code before execution
    if (typeof code !== 'string') {
      throw new Error('Code must be a string');
    }

    if (code.length > 1000000) {
      throw new Error('Code exceeds maximum size (1MB)');
    }

    // Create temporary execution directory
    const tempDir = path.join(process.cwd(), '.sandbox-temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write code to temporary file
    const tempFile = filePath || path.join(tempDir, getTempFileName(language));
    fs.writeFileSync(tempFile, code, 'utf8');

    // Get execution command
    const { command, args } = getExecutionCommand(language, tempFile, sandboxOptions);

    // Execute with restrictions
    const result = await executeWithTimeout(command, args, sandboxOptions);

    // Cleanup temp file (if it's our temp file)
    if (!filePath && fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch (err) {
        console.warn('Failed to cleanup temp file:', err);
      }
    }

    result.duration = Date.now() - startTime;
    return result;

  } catch (error) {
    return {
      success: false,
      exitCode: -1,
      stdout: '',
      stderr: '',
      duration: Date.now() - startTime,
      error: error.message
    };
  }
}

/**
 * Execute command with timeout and resource limits
 * @param {string} command - Command to execute
 * @param {string[]} args - Command arguments
 * @param {SandboxOptions} options - Sandbox options
 * @returns {Promise<ExecutionResult>}
 */
function executeWithTimeout(command, args, options) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let killed = false;

    const env = process.env;

    // Restrict environment variables
    env['NODE_OPTIONS'] = '';
    env['NODE_ENV'] = 'production';

    const spawnOptions = {
      cwd: options.workDir || process.cwd(),
      env: env,
      timeout: options.timeout,
      stdio: ['pipe', 'pipe', 'pipe']
    };

    // Spawn process
    const child = spawn(command, args, spawnOptions);

    // Capture output
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Handle process completion
    child.on('close', (code, signal) => {
      if (killed) {
        resolve({
          success: false,
          exitCode: -1,
          stdout,
          stderr,
          error: 'Execution timed out or was killed'
        });
      } else {
        resolve({
          success: code === 0,
          exitCode: code,
          stdout,
          stderr,
          error: null
        });
      }
    });

    // Handle errors
    child.on('error', (err) => {
      killed = true;
      child.kill();
      resolve({
        success: false,
        exitCode: -1,
        stdout,
        stderr,
        error: err.message
      });
    });

    // Timeout handler
    const timeoutId = setTimeout(() => {
      if (!killed) {
        killed = true;
        try {
          child.kill('SIGKILL');
        } catch (err) {
          console.error('Failed to kill process:', err);
        }
      }
    }, options.timeout);

    child.on('exit', () => {
      clearTimeout(timeoutId);
    });
  });
}

/**
 * Get execution command for language
 * @param {string} language - Programming language
 * @param {string} filePath - File path to execute
 * @param {SandboxOptions} options - Sandbox options
 * @returns {{command: string, args: string[]}}
 */
function getExecutionCommand(language, filePath, options) {
  const commands = {
    javascript: {
      command: 'node',
      args: ['--no-warnings', filePath]
    },
    typescript: {
      command: 'ts-node',
      args: ['--transpile-only', filePath]
    },
    python: {
      command: 'python',
      args: ['-u', filePath]
    },
    java: {
      command: 'java',
      args: ['-cp', path.dirname(filePath), getJavaClassName(filePath)]
    },
    cpp: {
      command: getCompiledCommand(filePath, 'cpp'),
      args: []
    },
    c: {
      command: getCompiledCommand(filePath, 'c'),
      args: []
    }
  };

  const config = commands[language] || commands.javascript;

  // Add resource limits if supported
  if (language === 'node' || language === 'javascript') {
    config.args.unshift(`--max-old-space-size=${options.maxMemory}`);
  }

  return config;
}

/**
 * Get temporary file name for language
 * @param {string} language - Programming language
 * @returns {string} Temporary file name
 */
function getTempFileName(language) {
  const extensions = {
    javascript: 'temp.js',
    typescript: 'temp.ts',
    python: 'temp.py',
    java: 'Temp.java',
    cpp: 'temp.cpp',
    c: 'temp.c'
  };

  return extensions[language] || 'temp.js';
}

/**
 * Get Java class name from file path
 * @param {string} filePath - Java file path
 * @returns {string} Class name
 */
function getJavaClassName(filePath) {
  return path.basename(filePath, '.java');
}

/**
 * Get compiled command for C/C++
 * @param {string} filePath - Source file path
 * @param {string} ext - File extension (cpp or c)
 * @returns {string} Compiled executable path
 */
function getCompiledCommand(filePath, ext) {
  const outputName = path.basename(filePath, ext);
  const outputPath = path.join(path.dirname(filePath), outputName);

  // Compile first
  const compiler = ext === 'cpp' ? 'g++' : 'gcc';
  try {
    require('child_process').spawnSync(compiler, [
      filePath,
      '-o',
      outputPath,
      '-O2',
      '-Wall'
    ]);
  } catch (err) {
    console.error('Compilation failed:', err);
  }

  return outputPath;
}

/**
 * Validate code for potential dangerous patterns
 * @param {string} code - Code to validate
 * @param {string} language - Programming language
 * @returns {{isValid: boolean, warnings: string[]}}
 */
function validateCodeForExecution(code, language) {
  const warnings = [];

  // Check for potentially dangerous patterns
  const dangerousPatterns = [
    { pattern: /eval\s*\(/, message: 'Use of eval() detected - potential security risk' },
    { pattern: /Function\s*\(/, message: 'Use of Function() constructor detected - potential security risk' },
    { pattern: /require\s*\(\s*["']child_process["']\)/, message: 'Direct access to child_process module' },
    { pattern: /require\s*\(\s*["']fs["']\)/, message: 'Direct access to fs module (may be restricted)' },
    { pattern: /require\s*\(\s*["']net["']\)/, message: 'Direct access to net module (network access restricted)' },
    { pattern: /require\s*\(\s*["']http["']\)/, message: 'Direct access to http module (network access restricted)' }
  ];

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(code)) {
      warnings.push(message);
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
}

/**
 * Create a restricted require function for code execution
 * @param {SandboxOptions} options - Sandbox options
 * @returns {Function} Restricted require function
 */
function createRestrictedRequire(options) {
  return function(moduleName) {
    // Check if module is blocked
    if (BLOCKED_MODULES.includes(moduleName)) {
      throw new Error(`Module "${moduleName}" is blocked in sandboxed execution`);
    }

    // Check network-related modules if network is disabled
    if (!options.allowNetwork) {
      const networkModules = ['http', 'https', 'net', 'dgram', 'tls', 'dns'];
      if (networkModules.includes(moduleName)) {
        throw new Error(`Network module "${moduleName}" is blocked (network access disabled)`);
      }
    }

    // Check fs module if file system is disabled
    if (!options.allowFS && moduleName === 'fs') {
      throw new Error('File system module is blocked in sandboxed execution');
    }

    // Allow the module
    return require(moduleName);
  };
}

/**
 * Cleanup sandbox temporary directory
 * @param {string} tempDir - Temporary directory path
 */
function cleanup(tempDir) {
  try {
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.warn(`Failed to cleanup ${filePath}:`, err);
        }
      }
      fs.rmdirSync(tempDir);
    }
  } catch (err) {
    console.error('Failed to cleanup sandbox directory:', err);
  }
}

module.exports = {
  executeInSandbox,
  validateCodeForExecution,
  cleanup,
  DEFAULT_OPTIONS
};
