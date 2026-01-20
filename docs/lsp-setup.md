# LSP Setup Guide

This guide explains how to set up and configure Language Server Protocol (LSP) support in PolyCode IDE.

## Overview

PolyCode IDE includes built-in support for Language Server Protocol (LSP), which provides advanced code intelligence features like:

- **Diagnostics**: Real-time error and warning detection
- **Auto-completion**: Context-aware code suggestions
- **Hover**: Show documentation when hovering over code
- **Go to Definition**: Navigate to symbol definitions (F12 or Ctrl+Click)
- **Code Actions**: Quick fixes and refactorings

## Installation

Language servers are managed automatically when you open a project. However, you may need to install language servers manually if they're not found.

### Installing Language Servers

#### TypeScript/JavaScript Server

The TypeScript Language Server is included with TypeScript installation. If not available:

```bash
# Using npm
npm install -g typescript-language-server

# Or using yarn
yarn global add typescript-language-server
```

#### Python Language Server (pyright)

```bash
# Using pip
pip install pyright

# Or using npm
npm install -g pyright
```

#### HTML Language Server

```bash
npm install -g vscode-html-language-server
```

#### CSS Language Server

```bash
npm install -g vscode-css-language-server
```

#### JSON Language Server

```bash
npm install -g vscode-json-language-server
```

### ESLint Language Server

For JavaScript/TypeScript linting:

```bash
npm install -g eslint-language-server
```

## Configuration

### Auto-Starting Language Servers

PolyCode IDE automatically starts language servers for supported file types:

| Language | Extensions | Language Server |
|----------|------------|-----------------|
| TypeScript | `.ts`, `.tsx` | typescript-language-server |
| JavaScript | `.js`, `.jsx` | typescript-language-server |
| Python | `.py` | pyright-langserver |
| HTML | `.html`, `.htm` | vscode-html-language-server |
| CSS | `.css`, `.scss`, `.less` | vscode-css-language-server |
| JSON | `.json` | vscode-json-language-server |

### LSP Status Indicator

The editor shows the LSP connection status in the header:

- **✓ LSP Connected** - Language server is active
- **⟳ LSP Starting...** - Server is initializing
- **✗ LSP Error** - Server failed to start or crashed
- **○ LSP Disconnected** - No language server for this file type

### Custom Language Server Configuration

To add support for additional languages, you can configure custom language servers in the settings:

1. Open Settings (Ctrl+, or Cmd+,)
2. Navigate to "Language Servers"
3. Add custom server configuration:

```json
{
  "language": "rust",
  "command": "rust-analyzer",
  "args": ["--stdio"],
  "fileExtensions": [".rs"]
}
```

## Features

### Diagnostics

Errors and warnings are displayed directly in the editor:

- **Red squiggles** - Errors
- **Yellow squiggles** - Warnings
- **Blue squiggles** - Information

Diagnostics are updated automatically as you type (debounced to 500ms).

### Auto-completion

- Trigger: `Ctrl+Space` or type to trigger automatically
- Shows: Function signatures, variable types, and documentation
- Supports: Snippets, parameter hints, and additional text edits

### Hover

- Hover over any symbol to see documentation
- Shows: Type information, function signatures, and JSDoc comments
- Supports: Markdown-formatted documentation

### Go to Definition

- Keyboard: `F12`
- Mouse: `Ctrl+Click` or `Cmd+Click` (Mac)
- Navigates to symbol definitions across files

## Troubleshooting

### Language Server Not Starting

**Problem**: LSP status shows "Error" or "Disconnected"

**Solutions**:

1. **Check if language server is installed**:
   ```bash
   # Check TypeScript language server
   which typescript-language-server

   # Check pyright
   which pyright
   ```

2. **Install missing language server** (see Installation section above)

3. **Check project path**: LSP requires a project folder to be open
   - File → Open Project (Ctrl+O)

4. **Check console for errors**:
   - Open DevTools (Ctrl+Shift+I or Cmd+Shift+I)
   - Look for LSP-related error messages

### Server Timeout or Crashes

**Problem**: Language server crashes or times out

**Solutions**:

1. **Restart the language server**:
   - Close and reopen the file
   - Or restart PolyCode IDE

2. **Check server logs**:
   ```bash
   # TypeScript language server logs
   ~/Library/Logs/typescript-language-server/  # Mac
   %LOCALAPPDATA%\typescript-language-server\logs\  # Windows
   ~/.cache/typescript-language-server/logs/  # Linux
   ```

3. **Increase timeout settings**:
   - Open Settings → Language Servers
   - Adjust "Server startup timeout" (default: 5000ms)

### Diagnostics Not Updating

**Problem**: Errors/warnings not showing in editor

**Solutions**:

1. **Check LSP status**: Should be "Connected"
2. **Verify language detection**: File extension should match supported languages
3. **Force refresh**: Type in the editor to trigger update
4. **Check project configuration**: Some language servers require project files (e.g., `tsconfig.json` for TypeScript)

### TypeScript Specific Issues

**Problem**: TypeScript errors not appearing

**Solutions**:

1. **Create `tsconfig.json`** in your project root:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "commonjs",
       "strict": true
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules"]
   }
   ```

2. **Check installed TypeScript version**:
   ```bash
   tsc --version
   ```

3. **Ensure `node_modules` is excluded**: Language servers may index `node_modules`, causing performance issues

### Python Specific Issues

**Problem**: Python errors not appearing or incorrect

**Solutions**:

1. **Ensure pyright is installed**:
   ```bash
   pip install pyright
   ```

2. **Create `pyrightconfig.json`** in your project root:
   ```json
   {
     "include": ["src"],
     "exclude": ["**/node_modules",
                 "**/__pycache__",
                 "**/.venv"]
   }
   ```

3. **Set Python path correctly**:
   - Ensure your Python environment is active
   - Check `which python` or `where python` returns correct path

### Performance Issues

**Problem**: Editor becomes slow when LSP is active

**Solutions**:

1. **Reduce diagnostics scope**:
   - Use `.gitignore` patterns in project config
   - Exclude large directories (node_modules, build, dist)

2. **Disable unused features**:
   - Settings → Language Servers
   - Uncheck features you don't need (e.g., hover, completions)

3. **Increase debounce delay**:
   - Settings → Editor → LSP Debounce
   - Increase from 500ms to 1000ms

4. **Restart language server**:
   - Close and reopen the file
   - Language servers cache data that may become stale

## Advanced Configuration

### Workspace Folders

Language servers work best with proper workspace configuration:

- **TypeScript**: Uses `tsconfig.json` for project settings
- **Python**: Uses `pyrightconfig.json` or `.pylintrc`
- **JavaScript**: Can use `jsconfig.json`

### Multiple Projects

When working with multiple projects:

1. Each project should have its own config file
2. Open the correct project folder in PolyCode IDE
3. Language servers will automatically detect project boundaries

### Custom Server Options

For advanced users, you can specify custom command line arguments:

```json
{
  "languageServers": {
    "typescript": {
      "args": ["--stdio", "--log-level=debug"]
    }
  }
}
```

### LSP over TCP/Socket (Experimental)

For remote development, you can configure LSP to use TCP instead of stdio:

```json
{
  "languageServers": {
    "typescript": {
      "transport": "socket",
      "host": "localhost",
      "port": 9559
    }
  }
}
```

Note: This requires the language server to support TCP/Socket transport.

## Security Considerations

### Running Code from LSP

LSP servers are trusted by default and can execute code. For security:

- Only install language servers from trusted sources
- Review server permissions in Settings
- Disable LSP for untrusted projects

### File Access

Language servers have access to all files in your project:

- Be cautious when opening projects with unknown origin
- Consider using a virtual environment for unknown code
- Review LSP server logs for suspicious activity

## Getting Help

If you encounter issues not covered here:

1. Check the [PolyCode GitHub Issues](https://github.com/yourusername/polycode/issues)
2. Review language server documentation:
   - [TypeScript Language Server](https://github.com/typescript-language-server/typescript-language-server)
   - [pyright](https://github.com/microsoft/pyright)
   - [vscode-langservers](https://github.com/vscode-langservers/vscode-langservers)
3. Enable debug logging:
   - Settings → Advanced → Debug Mode
   - Check DevTools console for detailed logs

## Contributing

To add support for a new language server:

1. Update `src/main/core/lsp.js` with server configuration
2. Add language mapping in `src/renderer/App.jsx`
3. Update documentation with installation instructions
4. Submit a pull request with your changes

---

For more information about LSP, visit: https://microsoft.github.io/language-server-protocol/
