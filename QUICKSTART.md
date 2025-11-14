# PolyCode IDE - Quick Start Guide

## Prerequisites

1. **Install Node.js** (v18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)

2. **Install LMStudio**
   - Download from [lmstudio.ai](https://lmstudio.ai)
   - Install and open LMStudio
   - Download at least one language model (e.g., Llama 2, Mistral, or CodeLlama)
   - In LMStudio, go to the "Local Server" tab
   - Click "Start Server" (runs on http://localhost:1234 by default)

## Installation Steps

1. **Install dependencies:**
```bash
npm install
```

2. **Build the renderer (React app):**
```bash
npm run build:renderer
```

3. **Start the IDE:**
```bash
npm start
```

## First Time Setup

1. **Ensure LMStudio is running:**
   - Open LMStudio
   - Load at least one model
   - Start the local server (port 1234)

2. **Verify connection:**
   - When PolyCode IDE starts, check the status bar
   - Should show "✓ LMStudio" if connected
   - If not connected, the AI panel will show a warning

## Using the IDE

### Creating a File

1. Click the "+" button in the file explorer
2. Enter a filename (e.g., `example.js`)
3. Press Enter

### Generating Code

1. Open or create a file
2. In the AI Panel, select "Generate Code" mode
3. Enter a prompt like: "Create a function that calculates fibonacci numbers"
4. Click "Generate Code"
5. Review the generated code in the result panel
6. Click "Apply to Editor" to insert it

### Editing Code

1. Open a file with existing code
2. Select "Edit Code" mode in the AI Panel
3. Enter an instruction like: "Add error handling to this function"
4. Click "Edit Code"
5. Review and apply the edited version

### Analyzing Code

1. Open a file with code
2. Select "Analyze Code" mode
3. Click "Analyze Code"
4. Review the multi-model analysis and rubric scores

## Development Mode

For development with auto-rebuild:

```bash
# Terminal 1: Watch for changes
npm run watch

# Terminal 2: Run Electron
npm run dev
```

## Troubleshooting

### LMStudio Connection Issues

- **Problem**: Status shows "✗ LMStudio"
- **Solution**: 
  - Ensure LMStudio is running
  - Check that the server is started (Local Server tab)
  - Verify the port is 1234 (default)
  - Try restarting LMStudio

### Build Errors

- **Problem**: `npm run build:renderer` fails
- **Solution**:
  - Delete `node_modules` and `package-lock.json`
  - Run `npm install` again
  - Check Node.js version (should be v18+)

### No Models Available

- **Problem**: "No models found" error
- **Solution**:
  - Load at least one model in LMStudio
  - Ensure the model is fully loaded
  - Restart PolyCode IDE

## Architecture Overview

PolyCode IDE uses a multi-model deliberation system:

1. **Multiple LLMs** generate code in parallel (each with different personas)
2. **Cross-evaluation** - models evaluate each other's outputs
3. **Weighted voting** - scores are aggregated
4. **Best selection** - highest-scoring generation is selected

This ensures higher quality code by leveraging multiple perspectives.

## Next Steps

- Customize the rubric in `src/main/core/rubric.js`
- Configure model personas in `src/main/core/orchestrator.js`
- Add your own file templates
- Extend language support

