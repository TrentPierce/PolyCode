# PolyCode IDE - Setup Guide

This guide provides detailed instructions for setting up PolyCode IDE on your development machine.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps)
- [Configuration Steps](#configuration-steps)
- [First-Time Setup](#first-time-setup)
- [Troubleshooting](#troubleshooting)
- [Platform-Specific Notes](#platform-specific-notes)

---

## Prerequisites

### Required Software

#### Node.js and npm

**Node.js v18 or higher** is required for running the application.

**To install:**

1. Download the LTS version from [nodejs.org](https://nodejs.org/)
2. Run the installer and follow the prompts
3. Verify installation:
   ```bash
   node --version  # Should show v18.x.x or higher
   npm --version   # Should show 9.x.x or higher
   ```

**Alternative: Using Node Version Manager (NVM)**

On Linux/macOS:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

On Windows:
- Download and install [nvm-windows](https://github.com/coreybutler/nvm-windows/releases)

#### LMStudio

**LMStudio** is required for running local LLMs. It provides the API interface for PolyCode IDE.

**To install:**

1. Download LMStudio from [lmstudio.ai](https://lmstudio.ai)
2. Run the installer for your platform
3. Launch LMStudio after installation

**Required Settings:**
- Ensure the API server is running on `http://localhost:1234`
- Load at least one language model
- The API server should be accessible from your local network

#### Git

**Git** is recommended for version control.

**To install:**

- **Windows**: Download from [git-scm.com](https://git-scm.com/download/win)
- **macOS**: Comes with Xcode Command Line Tools, or install via Homebrew: `brew install git`
- **Linux**: Install via package manager (e.g., `sudo apt-get install git`)

Verify installation:
```bash
git --version
```

### Optional Software

- **VS Code**: Recommended IDE for development
- **Chrome/Edge**: For debugging with DevTools
- **Python**: Required for some LLM models (LMStudio will prompt if needed)

---

## Installation Steps

### 1. Clone or Navigate to Project

If you're cloning the repository:
```bash
git clone <repository-url>
cd PolyCode
```

If you already have the project, navigate to it:
```bash
cd path/to/PolyCode
```

### 2. Install Dependencies

Install all required npm packages:
```bash
npm install
```

This will install:
- Electron (desktop framework)
- React and ReactDOM (UI framework)
- Monaco Editor (code editor)
- TypeScript (type checking)
- Babel (JavaScript transpiler)
- Webpack (module bundler)
- Electron Builder (app packaging)
- Axios (HTTP client)
- And all other dependencies

**Troubleshooting:**
- If installation fails, try clearing npm cache:
  ```bash
  npm cache clean --force
  rm -rf node_modules package-lock.json
  npm install
  ```

- On Windows, you may need to run as administrator if permission issues occur

### 3. Verify Installation

Check that all dependencies are installed:
```bash
ls node_modules  # Should show many packages
```

---

## Configuration Steps

### 1. Configure LMStudio

#### Start LMStudio API Server

1. Open LMStudio
2. Click on the "AI" icon (left sidebar)
3. Click "Start Server" button
4. Verify server is running on `http://localhost:1234`
5. Check the server status (should show "Running")

#### Load Language Models

1. In LMStudio, click "My Models" (left sidebar)
2. Click "Search" or "Download"
3. Search for a model, e.g., "Llama-3.2-3B-Instruct"
4. Click download and wait for completion
5. Recommended models:
   - **Code Generation**: Llama-3.2-3B-Instruct, CodeLlama-7B
   - **General Purpose**: Llama-3.2-3B, Mistral-7B
   - **Lightweight**: Phi-3-mini-4k

#### Test Connection

Test the API connection:
```bash
curl http://localhost:1234/v1/models
```

You should see a JSON response with available models.

### 2. Configure Project Settings (Optional)

Create a `.env` file in the root directory (if not exists):

```env
# LMStudio Configuration
LMSTUDIO_URL=http://localhost:1234
LMSTUDIO_TIMEOUT=120000

# Development Settings
ELECTRON_IS_DEV=1

# Application Settings
DEFAULT_MODEL=llama-3.2-3b-instruct
MAX_CONCURRENT_MODELS=4

# Cache Settings
ENABLE_CACHE=true
CACHE_SIZE=100

# Logging
LOG_LEVEL=info
```

### 3. Configure VS Code (Recommended)

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
    "dist/": true,
    ".cache/": true
  },
  "search.exclude": {
    "node_modules/": true,
    "dist/": true
  }
}
```

Recommended VS Code extensions:
- ESLint
- Prettier
- Material Icon Theme
- TypeScript Vue Plugin (Volar)
- Auto Rename Tag
- Bracket Colorizer

---

## First-Time Setup

### 1. Build the Project

Build the React frontend:
```bash
npm run build:renderer
```

This creates the bundled files in the `dist/` directory.

### 2. Start the Application

Run in development mode:
```bash
npm start
```

The application will:
1. Build the frontend (if not already built)
2. Launch Electron
3. Open the main window
4. Open DevTools (in development mode)

### 3. Initial Configuration

#### Check Connection

1. The status bar should show "Connected" in green
2. If it shows "Disconnected", check LMStudio is running

#### Load Available Models

1. Click on the AI panel (right side)
2. The models dropdown should show available models from LMStudio
3. Select the models you want to use (up to 4)

#### Test Code Generation

1. Create a new file (Ctrl/Cmd + N)
2. Enter a simple prompt in the AI panel:
   - Example: "Create a function that calculates the factorial of a number in JavaScript"
3. Click "Generate" or press Enter
4. Wait for the generation to complete (may take 30-60 seconds)
5. The generated code should appear in the AI panel

### 4. Verify All Features

Test the following features:
- ✅ File creation and saving
- ✅ Code generation
- ✅ Code editing
- ✅ Code analysis
- ✅ Model switching
- ✅ Keyboard shortcuts

---

## Troubleshooting

### Common Setup Issues

#### Issue: Node.js Version Too Old

**Error**: `Node version too old. Requires v18 or higher`

**Solution**:
```bash
# Install latest Node.js v18
nvm install 18
nvm use 18
```

#### Issue: npm Install Fails

**Error**: `npm ERR! code ELIFECYCLE` or similar

**Solution**:
```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# On Windows:
npm cache clean --force
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

#### Issue: LMStudio Not Connecting

**Error**: Status bar shows "Disconnected" in red

**Solution**:
1. Ensure LMStudio is running
2. Check the API server is started (should show "Running" in LMStudio)
3. Verify the URL is `http://localhost:1234`
4. Test with `curl http://localhost:1234/v1/models`
5. Check if firewall is blocking the connection
6. Try restarting LMStudio and PolyCode IDE

#### Issue: No Models Found

**Error**: "No models available" in AI panel

**Solution**:
1. Open LMStudio
2. Download at least one model
3. Ensure the model is loaded (check "My Models")
4. Restart PolyCode IDE
5. Check LMStudio API server is running

#### Issue: Build Fails

**Error**: Webpack or TypeScript errors

**Solution**:
```bash
# Clear build cache
rm -rf dist .cache

# Rebuild
npm run build:renderer

# If TypeScript errors, check types
npx tsc --noEmit
```

#### Issue: Application Won't Start

**Error**: Electron window doesn't appear

**Solution**:
1. Check if the build completed successfully
2. Look at the terminal/console for errors
3. Ensure no other instances are running (kill existing Electron processes)
4. Try `npm run dev` for more detailed error messages
5. Check if antivirus is blocking the application

#### Issue: DevTools Not Opening

**Error**: Can't see DevTools in development mode

**Solution**:
1. Check if `mainWindow.webContents.openDevTools()` is in `src/main/main.ts`
2. Manually open with Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (Mac)
3. Check if `ELECTRON_IS_DEV` is set to `1` in `.env`

#### Issue: Monaco Editor Not Loading

**Error**: Editor area is blank or shows errors

**Solution**:
1. Check the console for Monaco loader errors
2. Verify `@monaco-editor/react` is installed
3. Check if the build succeeded (`npm run build:renderer`)
4. Clear browser cache: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### Getting Help

If you encounter issues not covered here:

1. **Check the logs**: Look at the terminal/console for error messages
2. **Review the documentation**: Read [ARCHITECTURE.md](../ARCHITECTURE.md) and [README.md](../README.md)
3. **Search existing issues**: Check GitHub Issues
4. **Create a new issue**: Include:
   - Your operating system and version
   - Node.js version (`node --version`)
   - npm version (`npm --version`)
   - LMStudio version
   - Full error messages and stack traces
   - Steps to reproduce the issue

---

## Platform-Specific Notes

### Windows

#### Installation

- Use the installer from nodejs.org
- Run Command Prompt or PowerShell as Administrator if permission issues occur
- Add Node.js and npm to PATH (installer should do this automatically)

#### LMStudio

- Download the Windows installer from lmstudio.ai
- Run as administrator if needed
- Allow LMStudio through Windows Firewall

#### Known Issues

- **Path length limit**: Windows has a 260-character path limit
  - Solution: Enable long path support or install in a short path (e.g., `C:\PolyCode`)

- **Antivirus blocking**: Some antivirus software may block Electron or LMStudio
  - Solution: Add exclusions for the project directory and Electron

- **Network issues**: Windows Defender may block local network connections
  - Solution: Allow LMStudio through Windows Firewall

#### PowerShell Commands

```powershell
# Clear cache
Remove-Item -Recurse -Force node_modules, package-lock.json

# Check versions
node --version
npm --version
```

### macOS

#### Installation

- Install Homebrew if not already installed:
  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```

- Install Node.js:
  ```bash
  brew install node@18
  ```

- Install Git:
  ```bash
  brew install git
  ```

#### LMStudio

- Download the .dmg file from lmstudio.ai
- Drag LMStudio to Applications
- Open from Applications (may need to right-click and "Open" for first launch)

#### Known Issues

- **Gatekeeper**: macOS may block unsigned apps
  - Solution: Right-click and "Open", or disable Gatekeeper (not recommended)

- **Permissions**: LMStudio may need additional permissions
  - Solution: Grant Full Disk Access in System Settings > Privacy & Security

- **Node version conflicts**: macOS may have multiple Node versions
  - Solution: Use `nvm` to manage versions

#### Terminal Commands

```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check versions
node --version
npm --version
```

### Linux

#### Installation

**Ubuntu/Debian:**
```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt-get install git

# Install build tools
sudo apt-get install build-essential
```

**Fedora/RHEL:**
```bash
# Install Node.js via NodeSource
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# Install Git
sudo dnf install git

# Install build tools
sudo dnf groupinstall "Development Tools"
```

#### LMStudio

- Download the AppImage from lmstudio.ai
- Make it executable:
  ```bash
  chmod +x lmstudio.AppImage
  ```
- Run it:
  ```bash
  ./lmstudio.AppImage
  ```

#### Known Issues

- **Missing dependencies**: Linux may need additional libraries
  - Solution: Install `build-essential` or equivalent

- **Permission issues**: Node modules may have permission issues
  - Solution: Don't use `sudo npm install` (fix permissions instead)

- **Network firewall**: Firewall may block LMStudio API
  - Solution: Allow connections to localhost:1234

#### Terminal Commands

```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check versions
node --version
npm --version

# Fix permissions (if needed)
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) node_modules
```

---

## Next Steps

After completing setup:

1. Read the [Developer Guide](./DEVELOPER_GUIDE.md) for development workflow
2. Review the [Architecture Documentation](../ARCHITECTURE.md) for technical details
3. Check the [Code Style Guide](./CODE_STYLE.md) for coding standards
4. Follow the [Testing Guide](./TESTING.md) to learn how to write tests

---

**Happy developing! 🚀**
