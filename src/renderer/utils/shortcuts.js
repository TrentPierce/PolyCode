/**
 * Keyboard Shortcuts Manager
 *
 * Manages global keyboard shortcuts with configurable bindings
 */

/**
 * Default keyboard shortcuts
 */
const DEFAULT_SHORTCUTS = {
  // File operations
  'newFile': { key: 'Ctrl+N', mac: 'Cmd+N', action: 'new-file', description: 'Create new file' },
  'openFile': { key: 'Ctrl+O', mac: 'Cmd+O', action: 'open-file', description: 'Open file' },
  'saveFile': { key: 'Ctrl+S', mac: 'Cmd+S', action: 'save-file', description: 'Save file' },
  'saveAs': { key: 'Ctrl+Shift+S', mac: 'Cmd+Shift+S', action: 'save-as', description: 'Save file as' },
  'closeFile': { key: 'Ctrl+W', mac: 'Cmd+W', action: 'close-file', description: 'Close file' },

  // Editor operations
  'undo': { key: 'Ctrl+Z', mac: 'Cmd+Z', action: 'undo', description: 'Undo' },
  'redo': { key: 'Ctrl+Y', mac: 'Cmd+Y', action: 'redo', description: 'Redo' },
  'find': { key: 'Ctrl+F', mac: 'Cmd+F', action: 'find', description: 'Find' },
  'replace': { key: 'Ctrl+H', mac: 'Cmd+H', action: 'replace', description: 'Find and replace' },
  'format': { key: 'Shift+Alt+F', mac: 'Shift+Alt+F', action: 'format', description: 'Format code' },

  // IDE operations
  'toggleTerminal': { key: 'Ctrl+`', mac: 'Cmd+`', action: 'toggle-terminal', description: 'Toggle terminal' },
  'toggleSidebar': { key: 'Ctrl+B', mac: 'Cmd+B', action: 'toggle-sidebar', description: 'Toggle sidebar' },
  'toggleSettings': { key: 'Ctrl+,', mac: 'Cmd+,', action: 'toggle-settings', description: 'Open settings' },
  'showShortcuts': { key: 'Ctrl+/', mac: 'Cmd+/', action: 'show-shortcuts', description: 'Show keyboard shortcuts' },
  'runCode': { key: 'Ctrl+R', mac: 'Cmd+R', action: 'run-code', description: 'Run code' },

  // AI operations
  'generateCode': { key: 'Ctrl+Shift+G', mac: 'Cmd+Shift+G', action: 'generate-code', description: 'Generate code' },
  'editCode': { key: 'Ctrl+Shift+E', mac: 'Cmd+Shift+E', action: 'edit-code', description: 'Edit code' },
  'analyzeCode': { key: 'Ctrl+Shift+A', mac: 'Cmd+Shift+A', action: 'analyze-code', description: 'Analyze code' },
  'toggleAI': { key: 'Ctrl+I', mac: 'Cmd+I', action: 'toggle-ai', description: 'Toggle AI panel' }
};

/**
 * Shortcuts Manager Class
 */
class ShortcutsManager {
  constructor() {
    this.shortcuts = { ...DEFAULT_SHORTCUTS };
    this.listeners = new Map();
    this.isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    this.enabled = true;
  }

  /**
   * Get platform-specific key binding
   * @param {string} shortcutName - Name of the shortcut
   * @returns {string} Key binding for current platform
   */
  getKeyBinding(shortcutName) {
    const shortcut = this.shortcuts[shortcutName];
    if (!shortcut) return null;

    return this.isMac ? shortcut.mac : shortcut.key;
  }

  /**
   * Parse key event into standardized format
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {string} Normalized key combination
   */
  parseKeyEvent(event) {
    const parts = [];

    // Modifiers
    if (event.ctrlKey || event.metaKey) {
      parts.push(this.isMac ? 'Cmd' : 'Ctrl');
    }
    if (event.altKey) {
      parts.push('Alt');
    }
    if (event.shiftKey) {
      parts.push('Shift');
    }

    // Main key
    let key = event.key;
    // Handle special keys
    if (key === ' ') key = 'Space';
    else if (key === '`') key = '`';
    else if (key === ',') key = ',';

    // Capitalize key for display
    key = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
    parts.push(key);

    return parts.join('+');
  }

  /**
   * Find shortcut by key event
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {Object|null} Shortcut object or null
   */
  findShortcut(event) {
    const keyBinding = this.parseKeyEvent(event);

    for (const [name, shortcut] of Object.entries(this.shortcuts)) {
      const binding = this.isMac ? shortcut.mac : shortcut.key;
      if (binding === keyBinding) {
        return { name, ...shortcut };
      }
    }

    return null;
  }

  /**
   * Register a keyboard shortcut listener
   * @param {string} action - Action name
   * @param {Function} callback - Callback function
   */
  on(action, callback) {
    if (!this.listeners.has(action)) {
      this.listeners.set(action, []);
    }
    this.listeners.get(action).push(callback);
  }

  /**
   * Unregister a keyboard shortcut listener
   * @param {string} action - Action name
   * @param {Function} callback - Callback function
   */
  off(action, callback) {
    if (!this.listeners.has(action)) return;

    const callbacks = this.listeners.get(action);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Trigger an action
   * @param {string} action - Action name
   * @param {KeyboardEvent} event - Original keyboard event
   */
  trigger(action, event) {
    if (!this.listeners.has(action)) return;

    const callbacks = this.listeners.get(action);
    for (const callback of callbacks) {
      callback(event);
    }
  }

  /**
   * Handle keyboard event
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {boolean} True if shortcut was handled
   */
  handleEvent(event) {
    if (!this.enabled) return false;

    // Don't handle if in input field (unless it's a command key)
    const target = event.target;
    const isInput = target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.contentEditable === 'true';

    if (isInput && !event.ctrlKey && !event.metaKey) {
      return false;
    }

    const shortcut = this.findShortcut(event);
    if (shortcut) {
      event.preventDefault();
      this.trigger(shortcut.action, event);
      return true;
    }

    return false;
  }

  /**
   * Enable shortcut handling
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable shortcut handling
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Check for conflicts in shortcuts
   * @returns {Array} Array of conflicts
   */
  checkConflicts() {
    const conflicts = [];
    const usedBindings = new Map();

    for (const [name, shortcut] of Object.entries(this.shortcuts)) {
      const binding = this.isMac ? shortcut.mac : shortcut.key;

      if (usedBindings.has(binding)) {
        conflicts.push({
          binding,
          shortcuts: [usedBindings.get(binding), name]
        });
      } else {
        usedBindings.set(binding, name);
      }
    }

    return conflicts;
  }

  /**
   * Get all shortcuts
   * @returns {Object} All shortcuts with platform-specific bindings
   */
  getAllShortcuts() {
    const result = {};
    for (const [name, shortcut] of Object.entries(this.shortcuts)) {
      result[name] = {
        ...shortcut,
        binding: this.isMac ? shortcut.mac : shortcut.key
      };
    }
    return result;
  }

  /**
   * Update a shortcut
   * @param {string} name - Shortcut name
   * @param {string} key - New key binding (non-Mac)
   * @param {string} mac - New key binding (Mac)
   */
  updateShortcut(name, key, mac) {
    if (!this.shortcuts[name]) return;

    this.shortcuts[name].key = key;
    if (mac) {
      this.shortcuts[name].mac = mac;
    } else {
      this.shortcuts[name].mac = key.replace('Ctrl', 'Cmd');
    }
  }

  /**
   * Reset a shortcut to default
   * @param {string} name - Shortcut name
   */
  resetShortcut(name) {
    if (DEFAULT_SHORTCUTS[name]) {
      this.shortcuts[name] = { ...DEFAULT_SHORTCUTS[name] };
    }
  }

  /**
   * Reset all shortcuts to defaults
   */
  resetAll() {
    this.shortcuts = { ...DEFAULT_SHORTCUTS };
  }

  /**
   * Export shortcuts as JSON
   * @returns {string} JSON string
   */
  export() {
    return JSON.stringify(this.shortcuts, null, 2);
  }

  /**
   * Import shortcuts from JSON
   * @param {string} json - JSON string
   * @returns {boolean} True if import succeeded
   */
  import(json) {
    try {
      const shortcuts = JSON.parse(json);
      this.shortcuts = { ...DEFAULT_SHORTCUTS, ...shortcuts };
      return true;
    } catch (error) {
      console.error('Failed to import shortcuts:', error);
      return false;
    }
  }
}

/**
 * Create global shortcuts manager instance
 */
let globalShortcutsManager = null;

/**
 * Get or create global shortcuts manager
 * @returns {ShortcutsManager} Shortcuts manager instance
 */
function getShortcutsManager() {
  if (!globalShortcutsManager) {
    globalShortcutsManager = new ShortcutsManager();
  }
  return globalShortcutsManager;
}

/**
 * Initialize keyboard shortcuts
 * @param {Function} handlers - Map of action names to handler functions
 * @returns {ShortcutsManager} Initialized shortcuts manager
 */
function initializeShortcuts(handlers = {}) {
  const manager = getShortcutsManager();

  // Register handlers
  for (const [action, handler] of Object.entries(handlers)) {
    manager.on(action, handler);
  }

  // Add global event listener
  document.addEventListener('keydown', (event) => {
    manager.handleEvent(event);
  });

  return manager;
}

module.exports = {
  ShortcutsManager,
  getShortcutsManager,
  initializeShortcuts,
  DEFAULT_SHORTCUTS
};
