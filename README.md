# PolyCode IDE

AI-Powered IDE with Multi-Model Deliberation Architecture

Inspired by PolyCouncil's proven multi-model deliberation system, PolyCode IDE is a locally-run, AI-powered code editor that uses multiple LLMs through LMStudio to generate and edit code collaboratively.

## Features

- **Multi-Model Deliberation**: Uses PolyCouncil's architecture with parallel model execution, rubric-based scoring, and weighted consensus voting
- **Local LLM Integration**: Fully local execution using LMStudio (no external API calls)
- **VS Code-like Interface**: Familiar file explorer and editor experience
- **Multi-Language Support**: JavaScript, TypeScript, Python, Java, C/C++, and more
- **AI Code Generation**: Generate code from natural language prompts
- **AI Code Editing**: Edit existing code with natural language instructions
- **Code Analysis**: Analyze code quality using multi-model evaluation

👨‍💻 **Developers**: Check out our comprehensive [Developer Guide](docs/DEVELOPER_GUIDE.md) to start contributing!

## Architecture

### Core Components

1. **PolyCouncil Orchestrator** (`src/main/core/orchestrator.js`)
   - Coordinates multiple LLMs in parallel
   - Implements rubric-based scoring
   - Performs weighted consensus voting
   - Assigns personas to different models

2. **LMStudio Client** (`src/main/core/lmstudio-client.js`)
   - Handles communication with local LMStudio API
   - OpenAI-compatible interface
   - Model management and connection checking

3. **Code Rubric** (`src/main/core/rubric.js`)
   - Defines evaluation criteria (correctness, quality, best practices, etc.)
   - Calculates weighted scores
   - Evaluates code quality

4. **Frontend** (`src/renderer/`)
   - React-based UI
   - Monaco Editor (VS Code's editor)
   - File explorer
   - AI assistant panel

## Prerequisites

1. **Node.js** (v18 or higher)
2. **LMStudio** - Download from [lmstudio.ai](https://lmstudio.ai)
   - Install and start LMStudio
   - Load at least one language model
   - Ensure API server is running on `http://localhost:1234`

## Installation

1. Clone or navigate to the project directory:
```bash
cd PolyCode
```

2. Install dependencies:
```bash
npm install
```

3. Build the React frontend (if using a bundler):
```bash
# For development, you may need to set up a build process
# For now, the app loads directly from files
```

## Usage

1. **Start LMStudio**:
   - Open LMStudio
   - Load one or more language models
   - Start the local server (usually runs on port 1234)

2. **Start PolyCode IDE**:
```bash
npm start
```

3. **Using the IDE**:
   - Create or open files using the file explorer
   - Use the AI panel to:
     - **Generate Code**: Describe what you want to build
     - **Edit Code**: Provide instructions to modify existing code
     - **Analyze Code**: Get quality analysis and recommendations

## How Multi-Model Deliberation Works

1. **Parallel Generation**: Multiple LLMs generate code independently, each with a different persona (architect, engineer, reviewer, optimizer)

2. **Cross-Evaluation**: Each model evaluates all other models' outputs using the rubric system

3. **Weighted Voting**: Scores are aggregated using weighted averages

4. **Consensus Selection**: The best generation is selected based on aggregated scores

This approach ensures higher quality code by leveraging the strengths of multiple models and perspectives.

## Project Structure

```
PolyCode/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.js          # Main entry point
│   │   ├── preload.js       # Preload script for IPC
│   │   └── core/
│   │       ├── orchestrator.js    # PolyCouncil orchestrator
│   │       ├── lmstudio-client.js # LMStudio API client
│   │       └── rubric.js          # Code evaluation rubric
│   └── renderer/            # React frontend
│       ├── app.jsx          # Main React app
│       ├── components/      # React components
│       │   ├── Editor.jsx
│       │   ├── FileExplorer.jsx
│       │   ├── AIPanel.jsx
│       │   └── StatusBar.jsx
│       └── styles/
│           └── main.css
├── package.json
└── README.md
```

## Configuration

### Model Configuration

You can configure which models and personas to use by modifying the orchestrator configuration. The system automatically detects available models from LMStudio.

### Rubric Customization

Edit `src/main/core/rubric.js` to customize evaluation criteria and weights.

## For Developers

PolyCode IDE is built with Electron, React, and TypeScript. We welcome contributions from developers!

### Documentation

- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Comprehensive guide for developers
  - Quick start for new developers
  - Project structure overview
  - Architecture overview
  - Development environment setup
  - Common development tasks
  - Debugging guide

- **[Setup Guide](docs/SETUP.md)** - Setup and installation instructions
  - Prerequisites (Node.js, LMStudio, etc.)
  - Installation steps
  - Configuration steps
  - First-time setup
  - Platform-specific notes
  - Troubleshooting common issues

- **[Contributing Guide](docs/CONTRIBUTING.md)** - Contribution guidelines
  - How to contribute (bug reports, features, PRs)
  - Code review process
  - Commit message conventions
  - Branch naming conventions
  - Coding standards
  - Testing requirements

- **[Code Style Guide](docs/CODE_STYLE.md)** - Code style and formatting
  - Naming conventions
  - Code formatting rules
  - React/JSX conventions
  - JavaScript/TypeScript conventions
  - Comments and documentation
  - Best practices

- **[Testing Guide](docs/TESTING.md)** - Testing instructions
  - How to run tests
  - Writing unit, integration, and E2E tests
  - Test organization
  - Test coverage requirements
  - Debugging tests

- **[Deployment Guide](docs/DEPLOYMENT.md)** - Build and deployment
  - Build commands
  - Platform-specific builds
  - Electron packaging
  - Distribution formats
  - Signing configuration
  - Release process

### Additional Documentation

- **[Architecture Documentation](ARCHITECTURE.md)** - Technical deep dive into system architecture
- **[Project Summary](PROJECT_SUMMARY.md)** - Project overview and completed features
- **[Quick Start Guide](QUICKSTART.md)** - Quick start for users
- **[LSP Setup](docs/lsp-setup.md)** - Language Server Protocol setup
- **[TypeScript Migration](docs/typescript-migration.md)** - TypeScript migration notes
- **[Keyboard Shortcuts](docs/shortcuts.md)** - Available keyboard shortcuts

### Development

#### Running in Development Mode

```bash
npm run dev
```

This will start the app with developer tools enabled.

#### Building for Production

```bash
npm run build
```

Platform-specific builds:
```bash
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

#### Running Tests

```bash
npm test                    # Run all tests
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Run tests with coverage report
```

## Recently Completed Enhancements (v1.1.0)

### Phase 1: Security & Performance (Tasks 01-06)
- ✅ Input validation & sanitization
- ✅ Code execution sandboxing
- ✅ Error recovery system
- ✅ Optimized deliberation parallelization
- ✅ Response caching system
- ✅ Bundle size optimization

### Phase 1: UX Improvements (Tasks 07-10)
- ✅ Keyboard shortcuts system (17+ shortcuts, customizable)
- ✅ Monaco editor enhancements (custom theme, auto-save, multi-cursor)
- ✅ Save confirmation dialogs (dirty tracking, auto-save indicator)
- ✅ File explorer improvements (icons, search, context menu, breadcrumbs)

### Phase 2: Core Features (Tasks 11-16)
- ✅ Git integration (status, commit, push, pull, branches, history, diffs)
- ✅ Terminal integration (multi-tabbed, shell commands, project-aware)
- ✅ Code snippets system (75+ snippets, Ctrl+Space, custom snippets)
- ✅ LSP support foundation (diagnostics, hover, go-to-definition, auto-complete)
- ✅ TypeScript migration setup (strict mode, tsconfig, build support)
- ✅ Unit testing framework (Jest, 11/11 tests passing)

### Phase 3: Code Quality (Tasks 18, 20, 21, 24)
- ✅ Enhanced rubric evaluation (LLM-based scoring, quality metrics)
- ✅ Dependency upgrades (18 packages, security fixes)
- ✅ Logging framework (Winston, structured logs, file rotation)
- ✅ Developer guide creation (7 new comprehensive docs)

### Phase 4: Advanced Features (Tasks 15, 19, 22, 23)
- ✅ Debugging capabilities (breakpoints, step-through, variables, call stack)
- ✅ Code deduplication (18% reduction, shared utilities, API layer)
- ✅ State management system (Zustand store, persistence, 7 state slices)
- ✅ Inline documentation (83% JSDoc coverage, usage examples)

### Future Enhancements
- [ ] Real-time code suggestions
- [ ] Multi-file project context
- [ ] Plugin system
- [ ] Model performance tracking
- [ ] Custom persona definitions

## License

MIT

## Acknowledgments

Inspired by the PolyCouncil project's multi-model deliberation architecture.

