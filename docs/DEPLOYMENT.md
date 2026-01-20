# PolyCode IDE - Deployment Guide

This guide covers building, packaging, and distributing PolyCode IDE for various platforms.

## Table of Contents

- [Build Commands](#build-commands)
- [Platform-Specific Builds](#platform-specific-builds)
- [Electron Packaging with electron-builder](#electron-packaging-with-electron-builder)
- [Distribution Formats](#distribution-formats)
- [Signing Configuration](#signing-configuration)
- [Release Process](#release-process)
- [Automated Deployment (CI/CD)](#automated-deployment-cicd)
- [Troubleshooting Builds](#troubleshooting-builds)

---

## Build Commands

### Development Build

Build the renderer in development mode (with sourcemaps and no minification):
```bash
npm run build:renderer
```

This creates the bundled files in the `dist/` directory.

### Production Build

Build and package for production:
```bash
npm run build
```

This:
1. Builds the renderer (optimized)
2. Packages the application using electron-builder
3. Creates distribution files in the `dist/` directory

### Analyzing Build Output

Analyze bundle size and dependencies:
```bash
npm run analyze
```

This opens a bundle analyzer showing the size of each module.

---

## Platform-Specific Builds

### Windows

Build for Windows:
```bash
npm run build:win
```

**Output formats:**
- `.exe` - NSIS installer (default)
- `.exe` - Portable executable
- `.nupkg` - NuGet package (if configured)

**Supported Windows versions:**
- Windows 10 (64-bit)
- Windows 11 (64-bit)

### macOS

Build for macOS:
```bash
npm run build:mac
```

**Output formats:**
- `.dmg` - Disk image (default)
- `.pkg` - macOS installer package

**Supported macOS versions:**
- macOS 11 (Big Sur) or later
- Both Intel and Apple Silicon (M1/M2/M3)

**Note:** For Apple Silicon builds, run on an Apple Silicon machine or use cross-compilation.

### Linux

Build for Linux:
```bash
npm run build:linux
```

**Output formats:**
- `.AppImage` - Universal Linux package (default)
- `.deb` - Debian/Ubuntu package
- `.rpm` - Red Hat/Fedora package
- `.tar.gz` - Tarball archive

**Supported Linux distributions:**
- Ubuntu 20.04+
- Debian 11+
- Fedora 34+
- Arch Linux (via AppImage)

---

## Electron Packaging with electron-builder

### Configuration

The `electron-builder` configuration is in `package.json`:

```json
{
  "build": {
    "appId": "com.polycode.ide",
    "productName": "PolyCode IDE",
    "directories": {
      "output": "dist"
    },
    "files": [
      "src/**/*",
      "node_modules/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "assets/icon.png"
    }
  }
}
```

### Advanced Configuration Options

Create a separate `electron-builder.yml` for more complex configurations:

```yaml
appId: com.polycode.ide
productName: PolyCode IDE
directories:
  output: dist
  buildResources: build

files:
  - src/**/*
  - package.json

extraMetadata:
  main: dist/main.js

win:
  target:
    - nsis
    - portable
  icon: assets/icon.ico
  artifactName: ${productName}-${version}-${arch}.${ext}

mac:
  target:
    - dmg
    - pkg
  icon: assets/icon.icns
  category: public.app-category.developer-tools
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist

linux:
  target:
    - AppImage
    - deb
    - rpm
  icon: assets/icon.png
  category: Development

afterPack: scripts/afterPack.js
afterSign: scripts/afterSign.js
```

### Including/Excluding Files

Control what files are included in the package:

**In `package.json`:**
```json
{
  "build": {
    "files": [
      "src/**/*",
      "dist/**/*",
      "package.json",
      "!src/**/*.test.ts",
      "!src/**/*.spec.ts",
      "!node_modules/**/*.{ts,js,map}"
    ],
    "asar": true,
    "asarUnpack": [
      "node_modules/**/@monaco-editor/**"
    ]
  }
}
```

### Environment Variables

Set environment variables at build time:

```bash
# Windows
set ELECTRON_IS_DEV=0&& npm run build:win

# Linux/macOS
ELECTRON_IS_DEV=0 npm run build
```

---

## Distribution Formats

### Windows

#### NSIS Installer

The default Windows installer with:
- Installation wizard
- Desktop shortcut creation
- Start menu entry
- Uninstaller

**Configuration:**
```json
{
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      }
    ],
    "installerIcon": "assets/icon.ico",
    "uninstallerIcon": "assets/icon.ico",
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "PolyCode IDE"
  }
}
```

#### Portable EXE

A standalone executable that doesn't require installation:

```json
{
  "win": {
    "target": [
      {
        "target": "portable",
        "arch": ["x64"]
      }
    ]
  }
}
```

### macOS

#### DMG (Disk Image)

Standard macOS disk image with drag-and-drop installation:

```json
{
  "mac": {
    "target": "dmg",
    "icon": "assets/icon.icns",
    "dmgContents": [
      {
        "x": 130,
        "y": 220
      },
      {
        "x": 410,
        "y": 220,
        "type": "link",
        "path": "/Applications"
      }
    ]
  }
}
```

#### PKG (Installer Package)

Apple installer package with more options:

```json
{
  "mac": {
    "target": "pkg",
    "icon": "assets/icon.icns"
  }
}
```

### Linux

#### AppImage

Universal Linux package that works on most distributions:

```json
{
  "linux": {
    "target": [
      {
        "target": "AppImage",
        "arch": ["x64"]
      }
    ],
    "icon": "assets/icon.png",
    "category": "Development"
  }
}
```

#### DEB (Debian/Ubuntu)

```json
{
  "linux": {
    "target": [
      {
        "target": "deb",
        "arch": ["x64"]
      }
    ],
    "maintainer": "Your Name <email@example.com>",
    "category": "Development"
  }
}
```

#### RPM (Red Hat/Fedora)

```json
{
  "linux": {
    "target": [
      {
        "target": "rpm",
        "arch": ["x64"]
      }
    ],
    "maintainer": "Your Name <email@example.com>",
    "category": "Development"
  }
}
```

---

## Signing Configuration

### Windows Code Signing

To sign Windows executables, you need a code signing certificate.

**Prerequisites:**
1. Purchase a code signing certificate from a trusted CA (e.g., DigiCert, Sectigo)
2. Install the certificate on your build machine
3. Configure `electron-builder`

**Configuration:**
```json
{
  "win": {
    "certificateFile": "path/to/certificate.pfx",
    "certificatePassword": "password",
    "signingHashAlgorithms": ["sha256"]
  }
}
```

**Environment variables (recommended for security):**
```bash
# Store password in environment variable
CSC_KEY_PASSWORD="your-password" npm run build:win
```

### macOS Code Signing

To sign macOS applications and notarize for distribution:

**Prerequisites:**
1. Apple Developer account ($99/year)
2. Create certificates in Apple Developer portal
3. Configure Xcode command-line tools

**Configuration:**
```json
{
  "mac": {
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist",
    "provisioningProfile": "build/embedded.provisionprofile"
  }
}
```

**Entitlements file (`build/entitlements.mac.plist`):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
  </dict>
</plist>
```

**Notarization:**
After signing, notarize with Apple:
```bash
# Set environment variables
export APPLE_ID="your-apple-id@example.com"
export APPLE_ID_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="your-team-id"

# Build with notarization
npm run build:mac
```

### Linux Code Signing

Linux packages can be signed with GPG:

```bash
# Generate GPG key (if needed)
gpg --gen-key

# Sign package
gpg --detach-sign --armor dist/PolyCode-IDE-1.0.0.AppImage
```

---

## Release Process

### Version Management

Update version in `package.json`:
```json
{
  "name": "polycode-ide",
  "version": "1.0.0"
}
```

Use semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Incompatible API changes
- **MINOR**: Backward-compatible functionality
- **PATCH**: Backward-compatible bug fixes

### Creating a Release

1. **Update version and changelog**
   ```bash
   # Update version in package.json
   # Update CHANGELOG.md
   ```

2. **Commit changes**
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: bump version to 1.0.0"
   ```

3. **Create git tag**
   ```bash
   git tag v1.0.0
   git push origin main
   git push origin v1.0.0
   ```

4. **Build release**
   ```bash
   npm run build
   ```

5. **Upload to GitHub**
   - Go to GitHub releases
   - Click "Draft a new release"
   - Select the tag `v1.0.0`
   - Add release notes
   - Attach build artifacts from `dist/`

### Changelog Format

```markdown
# [1.0.0] - 2024-01-20

## Added
- Multi-model code generation
- LMStudio integration
- Monaco Editor with syntax highlighting
- File explorer with tree view
- Git integration
- Terminal integration

## Changed
- Improved build performance
- Updated dependencies

## Fixed
- Fixed memory leak in editor
- Fixed connection issues with LMStudio

## Security
- Added content security policy
- Improved IPC security
```

---

## Automated Deployment (CI/CD)

### GitHub Actions Example

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: polycode-${{ matrix.os }}
          path: dist/*

      - name: Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        with:
          files: dist/*
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Environment Variables in CI

Set secrets in GitHub repository settings:
- `CSC_LINK`: Certificate file (base64 encoded)
- `CSC_KEY_PASSWORD`: Certificate password
- `APPLE_ID`: Apple ID for notarization
- `APPLE_ID_PASSWORD`: App-specific password
- `APPLE_TEAM_ID`: Apple team ID

---

## Troubleshooting Builds

### Build Fails on Windows

**Problem:** `Error: Module not found`
```bash
Solution:
npm install --save-dev windows-build-tools
npm rebuild
```

**Problem:** `Error: ENOENT: no such file or directory`
```bash
Solution:
rm -rf node_modules dist
npm install
npm run build:renderer
```

### Build Fails on macOS

**Problem:** `Error: Code signing failed`
```bash
Solution:
# Check certificate
security find-identity -v -p codesigning

# Reset keychain (last resort)
security unlock-keychain ~/Library/Keychains/login.keychain
```

**Problem:** `Error: Notarization failed`
```bash
Solution:
# Check notarization status
xcrun notarytool history

# Resubmit
xcrun notarytool submit dist/PolyCode-IDE.dmg --apple-id "$APPLE_ID" --password "$APPLE_ID_PASSWORD" --team-id "$APPLE_TEAM_ID"
```

### Build Fails on Linux

**Problem:** Missing dependencies
```bash
Solution:
# Ubuntu/Debian
sudo apt-get install -y libgtk-3-dev libnotify-dev

# Fedora
sudo dnf install gtk3-devel libnotify-devel
```

**Problem:** Permission denied
```bash
Solution:
# Don't use sudo with npm install
sudo chown -R $(whoami) ~/.npm
```

### Large Bundle Size

**Problem:** Application size is too large (>200MB)

**Solutions:**
1. Exclude unnecessary files:
   ```json
   {
     "build": {
       "files": [
         "src/**/*",
         "package.json",
         "!src/**/*.test.ts",
         "!src/**/*.spec.ts",
         "!node_modules/**/*.md",
         "!node_modules/**/*.{ts,js.map}"
       ]
     }
   }
   ```

2. Use `asar` packing (enabled by default)

3. Analyze bundle:
   ```bash
   npm run analyze
   ```

4. Remove unused dependencies:
   ```bash
   npx depcheck
   ```

### Out of Memory During Build

**Problem:** `JavaScript heap out of memory`

**Solution:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

Or in `package.json`:
```json
{
  "scripts": {
    "build": "node --max-old-space-size=4096 ./node_modules/.bin/electron-builder"
  }
}
```

---

## Best Practices

1. **Always test builds locally** before releasing
2. **Keep dependencies updated** regularly
3. **Use semantic versioning** for releases
4. **Maintain a changelog** for users
5. **Sign your builds** for security and trust
6. **Test on multiple platforms** before release
7. **Automate releases** with CI/CD
8. **Backup build artifacts** in multiple locations

---

## Next Steps

After successful deployment:

1. Monitor for user feedback
2. Track issues and bugs
3. Plan next release
4. Update documentation

---

**Happy deploying! 🚀**
