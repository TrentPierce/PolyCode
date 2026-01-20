# PolyCode IDE - Developer Guide

## Table of Contents

- [Quick Start for New Developers](#quick-start-for-new-developers)
- [Project Structure Overview](#project-structure-overview)
- [Architecture Overview](#architecture-overview)
  - [Main Process](#main-process)
  - [Renderer Process](#renderer-process)
  - [IPC Communication](#ipc-communication)
- [Development Environment Setup](#development-environment-setup)
- [Common Development Tasks](#common-development-tasks)
  - [Adding New AI Features](#adding-new-ai-features)
  - [Extending Language Support](#extending-language-support)
  - [Modifying the UI](#modifying-the-ui)
  - [Adding New Commands](#adding-new-commands)
- [Debugging Guide](#debugging-guide)
- [Resources and Links](#resources-and-links)

---

## Quick Start for New Developers

Welcome to the PolyCode IDE development team! This guide will help you get up and running quickly.

### Prerequisites

Before you start, make sure you have:

- **Node.js** v18 or higher
- **npm** (comes with Node.js)
- **Git** (for version control)
- **LMStudio** for local LLM support
- A code editor (VS Code recommended)

### Setup Steps

1. **Clone the repository** (if not already done)
   ```bash
   git clone <repository-url>
   cd PolyCode
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start LMStudio**
   - Open LMStudio
   - Load at least one language model
   - Start the local server (port 1234)

4. **Run in development mode**
   ```bash
   npm run dev
   ```

5. **Make changes and test**
   - Edit files
   - The app will reload automatically
   - Check the console for errors

### Understanding the Codebase

- Read the [Architecture Documentation](../ARCHITECTURE.md) for technical details
- Review the [Project Summary](../PROJECT_SUMMARY.md) for an overview
- Check the [Setup Guide](./SETUP.md) for detailed installation instructions

---

## Project Structure Overview

```
PolyCode/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts             # Main entry point, IPC handlers
│   │   ├── preload.ts          # Secure IPC bridge
│   │   └── core/
│   │       ├── orchestrator.ts       # Multi-model coordination
│   │       ├── lmstudio-client.ts    # LMStudio API client
│   │       ├── rubric.ts             # Code evaluation system
│   │       ├── lsp.ts                # Language Server Protocol
│   │       ├── git.ts                # Git integration
│   │       ├── terminal.ts           # Terminal integration
│   │       ├── cache.ts              # Caching system
│   │       ├── recovery.ts          # Error recovery
│   │       ├── error-handler.ts      # Error handling
│   │       ├── sandbox.ts            # Code sandbox
│   │       ├── validation.ts         # Input validation
│   │       └── settings.ts           # Application settings
│   └── renderer/                # React frontend
│       ├── app.ts              # Main React app
│       ├── index.html          # HTML entry point
│       ├── components/         # React components
│       │   ├── Editor.tsx      # Monaco editor wrapper
│       │   ├── FileExplorer.tsx # File tree navigation
│       │   ├── AIPanel.tsx    # AI interaction UI
│       │   ├── StatusBar.tsx   # Status display
│       │   ├── Terminal.tsx    # Terminal component
│       │   └── GitPanel.tsx    # Git operations panel
│       └── utils/
│           ├── lsp-monaco-bridge.ts # LSP integration
│           ├── monaco-config.ts     # Monaco configuration
│           ├── shortcuts.ts         # Keyboard shortcuts
│           └── snippets.ts          # Code snippets
├── docs/                       # Documentation
│   ├── DEVELOPER_GUIDE.md     # This file
│   ├── SETUP.md               # Setup instructions
│   ├── CONTRIBUTING.md        # Contribution guidelines
│   ├── CODE_STYLE.md          # Code style guide
│   ├── TESTING.md             # Testing guide
│   ├── DEPLOYMENT.md          # Deployment guide
│   ├── lsp-setup.md           # LSP setup guide
│   ├── typescript-migration.md # TypeScript migration notes
│   └── shortcuts.md           # Keyboard shortcuts
├── assets/                    # App icons and resources
├── package.json               # Dependencies & scripts
├── webpack.config.js          # Build configuration
├── webpack.config.optimized.js # Optimized build config
├── .babelrc                   # Babel configuration
├── tsconfig.json              # TypeScript configuration
├── README.md                  # Main documentation
├── QUICKSTART.md              # Quick start guide
├── ARCHITECTURE.md            # Architecture details
└── PROJECT_SUMMARY.md         # Project summary
```

### Key Directories Explained

- **`src/main/`**: Electron main process code, runs in Node.js environment
  - Handles OS-level operations
  - Manages windows and IPC
  - Contains core business logic

- **`src/renderer/`**: React frontend code, runs in browser environment
  - UI components
  - User interactions
  - Monaco Editor integration

- **`docs/`**: All documentation files

- **`assets/`**: Static assets (icons, images)

---

## Architecture Overview

PolyCode IDE follows Electron's multi-process architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         PolyCouncil Orchestrator                      │  │
│  │  - Parallel Model Execution                           │  │
│  │  - Rubric-Based Scoring                               │  │
│  │  - Weighted Voting                                    │  │
│  │  - Persona Assignment                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Core Services                               │  │
│  │  - LMStudio Client (LLM integration)                │  │
│  │  - LSP Client (language support)                    │  │
│  │  - Git Client (version control)                     │  │
│  │  - Terminal (command execution)                     │  │
│  │  - Cache (performance optimization)                 │  │
│  │  - Sandbox (code safety)                             │  │
│  │  - Error Handler (graceful failures)                │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Code Rubric                                   │  │
│  │  - Evaluation Criteria                                │  │
│  │  - Weighted Scoring                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │ IPC
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Electron Renderer Process                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ FileExplorer │  │   Editor     │  │   AIPanel    │    │
│  │              │  │ (Monaco)     │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Terminal     │  │ GitPanel     │  │ StatusBar    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              React Application                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Main Process

The main process is the heart of the application, responsible for:

- **Window Management**: Creating and managing Electron windows
- **IPC Handling**: Processing messages from the renderer process
- **Core Business Logic**: Orchestrating AI operations, file system access
- **External Integrations**: LLM, Git, LSP, Terminal
- **System Resources**: Managing memory, CPU, and network

**Key Files:**
- `src/main/main.ts`: Entry point, IPC handler registration
- `src/main/preload.ts`: Secure bridge between main and renderer
- `src/main/core/orchestrator.ts`: Multi-model coordination
- `src/main/core/lmstudio-client.ts`: LLM API client

### Renderer Process

The renderer process runs the React UI:

- **UI Components**: File explorer, editor, AI panel, terminal, etc.
- **User Interactions**: Handling clicks, keyboard shortcuts, drag-and-drop
- **State Management**: Managing application state
- **Monaco Integration**: Code editing with syntax highlighting

**Key Files:**
- `src/renderer/app.ts`: Main React component
- `src/renderer/components/`: UI components
- `src/renderer/utils/`: Utility functions

### IPC Communication

Electron uses Inter-Process Communication (IPC) to allow the main and renderer processes to communicate safely.

**IPC Handlers (Main Process):**
```typescript
ipcMain.handle('generate-code', async (event, prompt) => {
  const result = await orchestrator.generateCode(prompt);
  return result;
});

ipcMain.handle('edit-code', async (event, code, instruction) => {
  const result = await orchestrator.editCode(code, instruction);
  return result;
});

ipcMain.handle('analyze-code', async (event, code) => {
  const result = await orchestrator.analyzeCode(code);
  return result;
});
```

**IPC Calls (Renderer Process):**
```typescript
const result = await window.electronAPI.generateCode(prompt);
const editedCode = await window.electronAPI.editCode(code, instruction);
const analysis = await window.electronAPI.analyzeCode(code);
```

**Available IPC Channels:**
- `generate-code`: Generate code from prompt
- `edit-code`: Edit existing code
- `analyze-code`: Analyze code quality
- `get-models`: Get available LLM models
- `configure-models`: Configure model selection
- `file:create`: Create new file
- `file:save`: Save file content
- `file:delete`: Delete file
- `git:status`: Get Git status
- `git:commit`: Create commit
- `terminal:execute`: Execute terminal command

---

## Development Environment Setup

### Recommended Tools

- **IDE**: VS Code with extensions:
  - ESLint
  - Prettier
  - TypeScript Vue Plugin (Volar)
  - Material Icon Theme
- **Browser**: Chrome DevTools (built into Electron)

### VS Code Settings

Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.exclude": {
    "node_modules/": true,
    "dist/": true
  }
}
```

### Environment Variables

Create `.env` file (optional):
```env
# LMStudio Configuration
LMSTUDIO_URL=http://localhost:1234

# Development Settings
ELECTRON_IS_DEV=1
```

### Hot Reload

The project uses hot reload in development mode:
```bash
npm run dev
```

Changes to React components will automatically reload the renderer process.

---

## Common Development Tasks

### Adding New AI Features

1. **Define the feature** in the orchestrator (`src/main/core/orchestrator.ts`):
   ```typescript
   async newFeature(params) {
     // Implementation
   }
   ```

2. **Create IPC handler** in `src/main/main.ts`:
   ```typescript
   ipcMain.handle('new-feature', async (event, params) => {
     return await orchestrator.newFeature(params);
   });
   ```

3. **Add TypeScript types** in `src/main/preload.ts`:
   ```typescript
   newFeature: (params: any) => Promise<any>
   ```

4. **Create UI component** in `src/renderer/components/`:
   ```typescript
   const handleNewFeature = async () => {
     const result = await window.electronAPI.newFeature(params);
   };
   ```

### Extending Language Support

1. **Add language configuration** to Monaco (`src/renderer/utils/monaco-config.ts`):
   ```typescript
   monaco.languages.register({ id: 'newlang' });
   monaco.languages.setLanguageConfiguration('newlang', { ... });
   ```

2. **Install LSP server** (if applicable):
   - Update `src/main/core/lsp.ts`
   - Add language-specific configuration

3. **Add syntax highlighting** (optional):
   - Monaco Editor supports many languages out-of-the-box
   - Custom grammars can be added if needed

### Modifying the UI

1. **Edit React components** in `src/renderer/components/`
2. **Update styles** in `src/renderer/styles/`
3. **Use consistent design patterns** (see [CODE_STYLE.md](./CODE_STYLE.md))

### Adding New Commands

1. **Define command** in main process:
   ```typescript
   const executeCommand = async (command: string) => {
     // Implementation
   };
   ```

2. **Register IPC handler**:
   ```typescript
   ipcMain.handle('execute-command', async (event, command) => {
     return await executeCommand(command);
   });
   ```

3. **Add keyboard shortcut** (optional):
   ```typescript
   // src/renderer/utils/shortcuts.ts
   const shortcuts = {
     'Ctrl+Shift+X': 'execute-command'
   };
   ```

---

## Debugging Guide

### Debugging Main Process

1. **Use VS Code debugger**:
   ```json
   {
     "type": "node",
     "request": "launch",
     "name": "Electron Main",
     "runtimeExecutable": "npm",
     "runtimeArgs": ["run", "dev"],
     "console": "integratedTerminal"
   }
   ```

2. **Or use Chrome DevTools**:
   - Run `npm run dev`
   - The DevTools will open automatically

### Debugging Renderer Process

1. **Use Chrome DevTools**:
   - Press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
   - Or set `mainWindow.webContents.openDevTools()` in main.ts

2. **Use React DevTools**:
   - Install the React DevTools extension
   - It will automatically detect the Electron app

### Common Issues

**Issue**: LMStudio not connecting
- **Solution**: Check if LMStudio is running and server is started on port 1234

**Issue**: Build fails
- **Solution**: Delete `node_modules` and `.cache`, then run `npm install`

**Issue**: TypeScript errors
- **Solution**: Run `npx tsc --noEmit` to check types, update tsconfig.json if needed

**Issue**: IPC not working
- **Solution**: Check preload.ts for proper API exposure, verify channel names match

---

## Resources and Links

### Official Documentation
- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Monaco Editor Documentation](https://microsoft.github.io/monaco-editor)
- [LMStudio Documentation](https://lmstudio.ai/docs)

### Project Documentation
- [README.md](../README.md) - Main project documentation
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Technical architecture
- [PROJECT_SUMMARY.md](../PROJECT_SUMMARY.md) - Project overview
- [SETUP.md](./SETUP.md) - Setup instructions
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [CODE_STYLE.md](./CODE_STYLE.md) - Code style guide
- [TESTING.md](./TESTING.md) - Testing guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide

### Additional Guides
- [LSP Setup](./lsp-setup.md) - Language Server Protocol setup
- [TypeScript Migration](./typescript-migration.md) - TypeScript migration notes
- [Keyboard Shortcuts](./shortcuts.md) - Available shortcuts

### Community
- GitHub Issues: Report bugs and request features
- GitHub Discussions: Ask questions and share ideas

---

**Happy coding! 🚀**
