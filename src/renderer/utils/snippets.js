/**
 * Snippet Management System
 * Provides functionality to load, manage, and insert code snippets
 */

class SnippetManager {
  constructor() {
    this.snippets = new Map();
    this.customSnippets = new Map();
    this.loadedLanguages = new Set();
  }

  /**
   * Load snippets for a specific language
   * @param {string} language - Language identifier (e.g., 'javascript', 'react', 'node')
   * @returns {Promise<Array>} Array of snippets for the language
   */
  async loadSnippets(language) {
    if (this.loadedLanguages.has(language)) {
      return this.getSnippets(language);
    }

    try {
      // Load default snippets from file system
      const defaultSnippets = await this.loadDefaultSnippets(language);

      // Load custom snippets from localStorage
      const customSnippets = this.loadCustomSnippets(language);

      // Merge snippets (custom override default)
      const mergedSnippets = this.mergeSnippets(defaultSnippets, customSnippets);

      this.snippets.set(language, mergedSnippets);
      this.loadedLanguages.add(language);

      return mergedSnippets;
    } catch (error) {
      console.error(`Failed to load snippets for ${language}:`, error);
      return this.loadCustomSnippets(language);
    }
  }

  /**
   * Load default snippets from JSON files
   * @param {string} language - Language identifier
   * @returns {Promise<Array>} Array of snippets
   */
  async loadDefaultSnippets(language) {
    try {
      const snippetFiles = {
        javascript: '/snippets/javascript.json',
        react: '/snippets/react.json',
        node: '/snippets/node.json',
        typescript: '/snippets/typescript.json',
        python: '/snippets/python.json',
        html: '/snippets/html.json',
        css: '/snippets/css.json',
        json: '/snippets/json.json'
      };

      const filePath = snippetFiles[language];
      if (!filePath) return [];

      const response = await fetch(filePath);
      if (!response.ok) return [];

      const data = await response.json();
      return Array.isArray(data) ? data : Object.values(data);
    } catch (error) {
      console.error(`Error loading default snippets for ${language}:`, error);
      return [];
    }
  }

  /**
   * Load custom snippets from localStorage
   * @param {string} language - Language identifier
   * @returns {Array} Array of custom snippets
   */
  loadCustomSnippets(language) {
    try {
      const customKey = `custom-snippets-${language}`;
      const stored = localStorage.getItem(customKey);
      if (!stored) return [];

      const data = JSON.parse(stored);
      return Array.isArray(data) ? data : Object.values(data);
    } catch (error) {
      console.error(`Error loading custom snippets for ${language}:`, error);
      return [];
    }
  }

  /**
   * Merge default and custom snippets
   * @param {Array} defaultSnippets - Default snippets
   * @param {Array} customSnippets - Custom snippets
   * @returns {Array} Merged snippets
   */
  mergeSnippets(defaultSnippets, customSnippets) {
    const merged = new Map();

    // Add default snippets
    defaultSnippets.forEach(snippet => {
      if (snippet.prefix) {
        merged.set(snippet.prefix, snippet);
      }
    });

    // Override/add custom snippets
    customSnippets.forEach(snippet => {
      if (snippet.prefix) {
        merged.set(snippet.prefix, { ...snippet, isCustom: true });
      }
    });

    return Array.from(merged.values());
  }

  /**
   * Get snippets for a language
   * @param {string} language - Language identifier
   * @returns {Array} Array of snippets
   */
  getSnippets(language) {
    return this.snippets.get(language) || [];
  }

  /**
   * Get all snippets for all loaded languages
   * @returns {Object} Snippets grouped by language
   */
  getAllSnippets() {
    const result = {};
    for (const [language, snippets] of this.snippets) {
      result[language] = snippets;
    }
    return result;
  }

  /**
   * Find snippets by prefix
   * @param {string} prefix - Snippet prefix
   * @param {string} language - Language identifier (optional)
   * @returns {Array} Matching snippets
   */
  findSnippets(prefix, language = null) {
    let snippets = language
      ? this.getSnippets(language)
      : Object.values(this.snippets).flat();

    return snippets.filter(snippet =>
      snippet.prefix && snippet.prefix.toLowerCase().startsWith(prefix.toLowerCase())
    );
  }

  /**
   * Find snippet by exact prefix
   * @param {string} prefix - Snippet prefix
   * @param {string} language - Language identifier
   * @returns {Object|null} Matching snippet or null
   */
  findSnippet(prefix, language) {
    const snippets = this.getSnippets(language);
    return snippets.find(s => s.prefix === prefix) || null;
  }

  /**
   * Insert snippet into Monaco editor
   * @param {Object} editor - Monaco editor instance
   * @param {Object} snippet - Snippet object
   * @returns {boolean} Success status
   */
  insertSnippet(editor, snippet) {
    if (!editor || !snippet || !snippet.body) {
      return false;
    }

    try {
      // Get current position
      const position = editor.getPosition();
      if (!position) return false;

      // Process snippet body and placeholders
      const { text, tabStops } = this.processSnippetBody(snippet.body);

      // Get current line to extract the prefix if user typed it
      const line = editor.getModel().getLineContent(position.lineNumber);
      const lineStart = new monaco.Selection(
        position.lineNumber,
        1,
        position.lineNumber,
        position.column
      );
      const match = line.match(/(\w+)$/);

      // Get the range to replace (prefix if it exists)
      let range;
      if (match && match[1]) {
        const prefix = match[1];
        const prefixStart = position.column - prefix.length;
        range = new monaco.Range(
          position.lineNumber,
          prefixStart,
          position.lineNumber,
          position.column
        );
      } else {
        range = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
      }

      // Insert the snippet
      editor.executeEdits('snippet-insert', [
        {
          range: range,
          text: text
        }
      ]);

      // Set cursor position to first tab stop or end
      if (tabStops.length > 0) {
        // Find first tab stop (not ${0})
        const firstTabStop = tabStops.find(ts => ts.number !== 0) || tabStops[0];
        const newPosition = {
          lineNumber: position.lineNumber + firstTabStop.lineOffset,
          column: firstTabStop.column
        };
        editor.setPosition(newPosition);
        editor.trigger('keyboard', 'type', { text: '' });

        // Add tab stop decorations if needed
        this.addTabStopDecorations(editor, tabStops, position.lineNumber);
      } else {
        // Move cursor to end of inserted text
        const newColumn = position.column + text.length - (match ? match[1].length : 0);
        editor.setPosition({
          lineNumber: position.lineNumber,
          column: newColumn
        });
      }

      return true;
    } catch (error) {
      console.error('Error inserting snippet:', error);
      return false;
    }
  }

  /**
   * Process snippet body and extract placeholders
   * @param {Array|string} body - Snippet body
   * @returns {Object} Processed text and tab stops
   */
  processSnippetBody(body) {
    const bodyArray = Array.isArray(body) ? body : [body];
    let text = '';
    const tabStops = [];
    let lineOffset = 0;

    for (const line of bodyArray) {
      const processedLine = line.replace(/\$(\d+):?\{([^}]*)\}/g, (match, number, placeholder) => {
        const tabStopNum = parseInt(number, 10);
        tabStops.push({
          number: tabStopNum,
          placeholder: placeholder,
          column: text.length - (text.lastIndexOf('\n') === -1 ? 0 : text.lastIndexOf('\n')) + 1,
          lineOffset: lineOffset
        });
        return placeholder;
      });

      const processedLine2 = processedLine.replace(/\$\{(\d+)\}/g, (match, number) => {
        const tabStopNum = parseInt(number, 10);
        tabStops.push({
          number: tabStopNum,
          placeholder: '',
          column: text.length - (text.lastIndexOf('\n') === -1 ? 0 : text.lastIndexOf('\n')) + 1,
          lineOffset: lineOffset
        });
        return '';
      });

      text += processedLine2 + '\n';
      lineOffset++;
    }

    // Remove trailing newline
    text = text.replace(/\n$/, '');

    return { text, tabStops };
  }

  /**
   * Add visual decorations for tab stops
   * @param {Object} editor - Monaco editor instance
   * @param {Array} tabStops - Array of tab stops
   * @param {number} startLine - Starting line number
   */
  addTabStopDecorations(editor, tabStops, startLine) {
    // Monaco doesn't have built-in snippet decorations, so we skip this
    // Tab navigation would need to be implemented with editor commands
  }

  /**
   * Add custom snippet
   * @param {Object} snippet - Snippet object
   * @param {string} language - Language identifier
   * @returns {boolean} Success status
   */
  addCustomSnippet(snippet, language) {
    if (!snippet || !snippet.prefix || !snippet.body) {
      return false;
    }

    try {
      const customKey = `custom-snippets-${language}`;
      let customSnippets = this.loadCustomSnippets(language);

      // Check if snippet with same prefix exists and update it
      const existingIndex = customSnippets.findIndex(s => s.prefix === snippet.prefix);
      if (existingIndex !== -1) {
        customSnippets[existingIndex] = { ...snippet, isCustom: true };
      } else {
        customSnippets.push({ ...snippet, isCustom: true });
      }

      // Save to localStorage
      localStorage.setItem(customKey, JSON.stringify(customSnippets));

      // Reload snippets for this language
      this.loadedLanguages.delete(language);
      this.loadSnippets(language);

      return true;
    } catch (error) {
      console.error('Error adding custom snippet:', error);
      return false;
    }
  }

  /**
   * Delete custom snippet
   * @param {string} prefix - Snippet prefix
   * @param {string} language - Language identifier
   * @returns {boolean} Success status
   */
  deleteCustomSnippet(prefix, language) {
    try {
      const customKey = `custom-snippets-${language}`;
      let customSnippets = this.loadCustomSnippets(language);

      customSnippets = customSnippets.filter(s => s.prefix !== prefix);

      localStorage.setItem(customKey, JSON.stringify(customSnippets));

      // Reload snippets for this language
      this.loadedLanguages.delete(language);
      this.loadSnippets(language);

      return true;
    } catch (error) {
      console.error('Error deleting custom snippet:', error);
      return false;
    }
  }

  /**
   * Export custom snippets
   * @param {string} language - Language identifier (optional, if omitted exports all)
   * @returns {Object} Custom snippets
   */
  exportCustomSnippets(language = null) {
    if (language) {
      return this.loadCustomSnippets(language);
    }

    const result = {};
    const languages = ['javascript', 'react', 'node', 'typescript', 'python', 'html', 'css', 'json'];
    languages.forEach(lang => {
      const snippets = this.loadCustomSnippets(lang);
      if (snippets.length > 0) {
        result[lang] = snippets;
      }
    });
    return result;
  }

  /**
   * Import custom snippets
   * @param {Object} snippets - Snippets to import
   * @returns {boolean} Success status
   */
  importCustomSnippets(snippets) {
    try {
      Object.entries(snippets).forEach(([language, langSnippets]) => {
        const customKey = `custom-snippets-${language}`;
        let existingSnippets = this.loadCustomSnippets(language);

        langSnippets.forEach(snippet => {
          const existingIndex = existingSnippets.findIndex(s => s.prefix === snippet.prefix);
          if (existingIndex !== -1) {
            existingSnippets[existingIndex] = { ...snippet, isCustom: true };
          } else {
            existingSnippets.push({ ...snippet, isCustom: true });
          }
        });

        localStorage.setItem(customKey, JSON.stringify(existingSnippets));

        // Reload snippets
        this.loadedLanguages.delete(language);
        this.loadSnippets(language);
      });

      return true;
    } catch (error) {
      console.error('Error importing custom snippets:', error);
      return false;
    }
  }

  /**
   * Reset all custom snippets for a language
   * @param {string} language - Language identifier
   * @returns {boolean} Success status
   */
  resetCustomSnippets(language) {
    try {
      const customKey = `custom-snippets-${language}`;
      localStorage.removeItem(customKey);

      // Reload snippets
      this.loadedLanguages.delete(language);
      this.loadSnippets(language);

      return true;
    } catch (error) {
      console.error('Error resetting custom snippets:', error);
      return false;
    }
  }
}

// Create singleton instance
const snippetManager = new SnippetManager();

// Export utility functions
export const loadSnippets = (language) => snippetManager.loadSnippets(language);
export const getSnippets = (language) => snippetManager.getSnippets(language);
export const getAllSnippets = () => snippetManager.getAllSnippets();
export const findSnippets = (prefix, language) => snippetManager.findSnippets(prefix, language);
export const findSnippet = (prefix, language) => snippetManager.findSnippet(prefix, language);
export const insertSnippet = (editor, snippet) => snippetManager.insertSnippet(editor, snippet);
export const addCustomSnippet = (snippet, language) => snippetManager.addCustomSnippet(snippet, language);
export const deleteCustomSnippet = (prefix, language) => snippetManager.deleteCustomSnippet(prefix, language);
export const exportCustomSnippets = (language) => snippetManager.exportCustomSnippets(language);
export const importCustomSnippets = (snippets) => snippetManager.importCustomSnippets(snippets);
export const resetCustomSnippets = (language) => snippetManager.resetCustomSnippets(language);
export default snippetManager;
