/**
 * Monaco to LSP Bridge
 * Bridges Monaco Editor features with Language Server Protocol
 */

class LSPMonacoBridge {
  constructor() {
    this.monaco = null;
    this.editor = null;
    this.filePath = null;
    this.language = null;
    this.providers = [];
    this.completionCache = new Map();
    this.debounceTimers = new Map();
    this.debounceDelay = 500;
    this.lspStatus = 'disconnected';
  }

  /**
   * Initialize the bridge with Monaco instance
   */
  initialize(monaco, editor, filePath, language) {
    this.monaco = monaco;
    this.editor = editor;
    this.filePath = filePath;
    this.language = language;
    this.lspStatus = 'connected';
  }

  /**
   * Convert Monaco position to LSP position
   */
  monacoToLSPPosition(position) {
    return {
      line: position.lineNumber - 1,
      character: position.column - 1
    };
  }

  /**
   * Convert LSP position to Monaco position
   */
  lspToMonacoPosition(position) {
    return {
      lineNumber: position.line + 1,
      column: position.character + 1
    };
  }

  /**
   * Convert Monaco range to LSP range
   */
  monacoToLSPRange(range) {
    return {
      start: this.monacoToLSPPosition(range.getStartPosition()),
      end: this.monacoToLSPPosition(range.getEndPosition())
    };
  }

  /**
   * Convert LSP range to Monaco range
   */
  lspToMonacoRange(range) {
    return new this.monaco.Range(
      range.start.line + 1,
      range.start.character + 1,
      range.end.line + 1,
      range.end.character + 1
    );
  }

  /**
   * Convert LSP diagnostic to Monaco marker
   */
  lspToMonacoDiagnostic(diagnostic) {
    return {
      severity: this.convertLSPDiagnosticSeverity(diagnostic.severity),
      message: diagnostic.message,
      source: diagnostic.source,
      code: diagnostic.code,
      startLineNumber: diagnostic.range.start.line + 1,
      startColumn: diagnostic.range.start.character + 1,
      endLineNumber: diagnostic.range.end.line + 1,
      endColumn: diagnostic.range.end.character + 1
    };
  }

  /**
   * Convert LSP diagnostic severity to Monaco severity
   */
  convertLSPDiagnosticSeverity(severity) {
    switch (severity) {
      case 1: // Error
        return this.monaco.MarkerSeverity.Error;
      case 2: // Warning
        return this.monaco.MarkerSeverity.Warning;
      case 3: // Information
        return this.monaco.MarkerSeverity.Info;
      case 4: // Hint
        return this.monaco.MarkerSeverity.Hint;
      default:
        return this.monaco.MarkerSeverity.Info;
    }
  }

  /**
   * Convert LSP completion item to Monaco completion item
   */
  lspToMonacoCompletion(item) {
    const kindMap = {
      1: this.monaco.languages.CompletionItemKind.Text,
      2: this.monaco.languages.CompletionItemKind.Method,
      3: this.monaco.languages.CompletionItemKind.Function,
      4: this.monaco.languages.CompletionItemKind.Constructor,
      5: this.monaco.languages.CompletionItemKind.Field,
      6: this.monaco.languages.CompletionItemKind.Variable,
      7: this.monaco.languages.CompletionItemKind.Class,
      8: this.monaco.languages.CompletionItemKind.Interface,
      9: this.monaco.languages.CompletionItemKind.Module,
      10: this.monaco.languages.CompletionItemKind.Property,
      11: this.monaco.languages.CompletionItemKind.Unit,
      12: this.monaco.languages.CompletionItemKind.Value,
      13: this.monaco.languages.CompletionItemKind.Enum,
      14: this.monaco.languages.CompletionItemKind.Keyword,
      15: this.monaco.languages.CompletionItemKind.Snippet,
      16: this.monaco.languages.CompletionItemKind.Color,
      17: this.monaco.languages.CompletionItemKind.File,
      18: this.monaco.languages.CompletionItemKind.Reference,
      19: this.monaco.languages.CompletionItemKind.Folder,
      20: this.monaco.languages.CompletionItemKind.EnumMember,
      21: this.monaco.languages.CompletionItemKind.Constant,
      22: this.monaco.languages.CompletionItemKind.Struct,
      23: this.monaco.languages.CompletionItemKind.Event,
      24: this.monaco.languages.CompletionItemKind.Operator,
      25: this.monaco.languages.CompletionItemKind.TypeParameter
    };

    return {
      label: item.label,
      kind: kindMap[item.kind] || this.monaco.languages.CompletionItemKind.Text,
      detail: item.detail || '',
      documentation: this.extractDocumentation(item.documentation),
      sortText: item.sortText,
      filterText: item.filterText,
      insertText: item.insertText || item.label,
      insertTextRules: item.insertTextFormat === 2
        ? this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        : undefined,
      additionalTextEdits: item.additionalTextEdits?.map(edit => ({
        range: this.lspToMonacoRange(edit.range),
        text: edit.newText
      })),
      commitCharacters: item.commitCharacters,
      command: item.command ? {
        id: item.command.command,
        arguments: item.command.arguments
      } : undefined
    };
  }

  /**
   * Extract documentation from LSP documentation object
   */
  extractDocumentation(doc) {
    if (!doc) return undefined;

    if (typeof doc === 'string') {
      return { value: doc, isTrusted: true };
    }

    if (doc.kind === 'markdown') {
      return { value: doc.value, isTrusted: true, supportHtml: true };
    }

    if (doc.kind === 'plaintext') {
      return { value: doc.value, isTrusted: true };
    }

    return { value: String(doc), isTrusted: true };
  }

  /**
   * Create diagnostics provider
   */
  registerDiagnosticsProvider() {
    if (!this.monaco) return null;

    const model = this.editor?.getModel();
    if (!model) return null;

    const provider = {
      provideDiagnostics: async (document, token) => {
        try {
          const diagnostics = await this.getDiagnostics(model.uri.toString());
          return diagnostics.map(d => this.lspToMonacoDiagnostic(d));
        } catch (error) {
          console.error('Diagnostics provider error:', error);
          return [];
        }
      }
    };

    const disposable = this.monaco.languages.registerDiagnosticsProvider(this.language, provider);
    this.providers.push(disposable);
    return disposable;
  }

  /**
   * Create completion provider
   */
  registerCompletionProvider() {
    if (!this.monaco) return null;

    const provider = {
      provideCompletionItems: async (model, position, context, token) => {
        try {
          // Check cache first
          const cacheKey = `${model.uri.toString()}:${position.lineNumber}:${position.column}`;
          if (this.completionCache.has(cacheKey)) {
            return this.completionCache.get(cacheKey);
          }

          const lspPosition = this.monacoToLSPPosition(position);
          const result = await this.provideCompletionItems(model.uri.toString(), lspPosition);

          // Create Monaco completion list
          const suggestions = result.items?.map(item => this.lspToMonacoCompletion(item)) || [];

          const completions = {
            suggestions,
            incomplete: result.isIncomplete || false
          };

          // Cache for performance
          this.completionCache.set(cacheKey, completions);
          setTimeout(() => this.completionCache.delete(cacheKey), 5000);

          return completions;
        } catch (error) {
          console.error('Completion provider error:', error);
          return { suggestions: [] };
        }
      }
    };

    const disposable = this.monaco.languages.registerCompletionItemProvider(this.language, provider);
    this.providers.push(disposable);
    return disposable;
  }

  /**
   * Create hover provider
   */
  registerHoverProvider() {
    if (!this.monaco) return null;

    const provider = {
      provideHover: async (model, position, token) => {
        try {
          const lspPosition = this.monacoToLSPPosition(position);
          const result = await this.provideHover(model.uri.toString(), lspPosition);

          if (!result || !result.contents) {
            return null;
          }

          return {
            range: this.lspToMonacoRange(result.range),
            contents: this.extractDocumentation(result.contents)
          };
        } catch (error) {
          console.error('Hover provider error:', error);
          return null;
        }
      }
    };

    const disposable = this.monaco.languages.registerHoverProvider(this.language, provider);
    this.providers.push(disposable);
    return disposable;
  }

  /**
   * Create definition provider
   */
  registerDefinitionProvider() {
    if (!this.monaco) return null;

    const provider = {
      provideDefinition: async (model, position, token) => {
        try {
          const lspPosition = this.monacoToLSPPosition(position);
          const result = await this.provideDefinition(model.uri.toString(), lspPosition);

          if (!result || !result.location) {
            return null;
          }

          // Handle single location or array of locations
          if (Array.isArray(result.location)) {
            return result.location.map(loc => ({
              uri: this.monaco.Uri.parse(loc.uri),
              range: this.lspToMonacoRange(loc.range)
            }));
          }

          return {
            uri: this.monaco.Uri.parse(result.location.uri),
            range: this.lspToMonacoRange(result.location.range)
          };
        } catch (error) {
          console.error('Definition provider error:', error);
          return null;
        }
      }
    };

    const disposable = this.monaco.languages.registerDefinitionProvider(this.language, provider);
    this.providers.push(disposable);
    return disposable;
  }

  /**
   * Get diagnostics from LSP
   */
  async getDiagnostics(uri) {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      return [];
    }

    try {
      const result = await window.electronAPI.lspDiagnostics(uri);
      if (result.success) {
        return result.diagnostics || [];
      }
    } catch (error) {
      console.error('Failed to get diagnostics:', error);
    }

    return [];
  }

  /**
   * Provide completion items from LSP
   */
  async provideCompletionItems(position) {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      return { items: [] };
    }

    try {
      const uri = this.filePath ? `file://${this.filePath}` : 'file://untitled';
      const result = await window.electronAPI.lspCompletion(uri, position);
      if (result.success) {
        return result;
      }
    } catch (error) {
      console.error('Failed to get completions:', error);
    }

    return { items: [] };
  }

  /**
   * Provide hover info from LSP
   */
  async provideHover(position) {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      return null;
    }

    try {
      const uri = this.filePath ? `file://${this.filePath}` : 'file://untitled';
      const result = await window.electronAPI.lspHover(uri, position);
      if (result.success) {
        return result;
      }
    } catch (error) {
      console.error('Failed to get hover info:', error);
    }

    return null;
  }

  /**
   * Provide definition from LSP
   */
  async provideDefinition(position) {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      return null;
    }

    try {
      const uri = this.filePath ? `file://${this.filePath}` : 'file://untitled';
      const result = await window.electronAPI.lspDefinition(uri, position);
      if (result.success) {
        return result;
      }
    } catch (error) {
      console.error('Failed to get definition:', error);
    }

    return null;
  }

  /**
   * Debounce a function call
   */
  debounce(key, func) {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        const result = await func();
        this.debounceTimers.delete(key);
        resolve(result);
      }, this.debounceDelay);

      this.debounceTimers.set(key, timer);
    });
  }

  /**
   * Update diagnostics in editor (debounced)
   */
  async updateDiagnostics(uri) {
    const model = this.editor?.getModel();
    if (!model) return;

    const diagnostics = await this.debounce(
      `diagnostics:${uri}`,
      async () => this.getDiagnostics(uri)
    );

    const monacoMarkers = diagnostics.map(d => this.lspToMonacoDiagnostic(d));
    this.monaco.editor.setModelMarkers(model, this.language, monacoMarkers);
  }

  /**
   * Trigger diagnostics update
   */
  triggerDiagnostics() {
    if (!this.filePath) return;

    const uri = `file://${this.filePath}`;
    this.updateDiagnostics(uri);
  }

  /**
   * Dispose all providers
   */
  dispose() {
    this.providers.forEach(disposable => {
      if (disposable && disposable.dispose) {
        disposable.dispose();
      }
    });
    this.providers = [];
    this.completionCache.clear();

    // Clear all debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    this.lspStatus = 'disconnected';
  }

  /**
   * Get current LSP status
   */
  getStatus() {
    return this.lspStatus;
  }
}

// Export singleton instance
let bridgeInstance = null;

function createLSPBridge() {
  if (!bridgeInstance) {
    bridgeInstance = new LSPMonacoBridge();
  }
  return bridgeInstance;
}

function getLSPBridge() {
  return bridgeInstance;
}

module.exports = {
  LSPMonacoBridge,
  createLSPBridge,
  getLSPBridge
};
