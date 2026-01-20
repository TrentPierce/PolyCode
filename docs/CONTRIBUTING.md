# PolyCode IDE - Contributing Guide

Thank you for your interest in contributing to PolyCode IDE! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Submitting Pull Requests](#submitting-pull-requests)
- [Code Review Process](#code-review-process)
- [Commit Message Conventions](#commit-message-conventions)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [License Agreement](#license-agreement)

---

## How to Contribute

### Reporting Bugs

Before reporting a bug, please:

1. **Search existing issues** to avoid duplicates
2. **Check the troubleshooting section** in [SETUP.md](./SETUP.md) for known issues
3. **Gather information** about the bug:
   - Your operating system and version
   - Node.js version (`node --version`)
   - LMStudio version
   - Steps to reproduce the issue
   - Expected vs actual behavior
   - Screenshots or error messages (if applicable)

**Bug Report Template:**

```markdown
### Bug Description
A clear and concise description of what the bug is.

### Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

### Expected Behavior
A clear and concise description of what you expected to happen.

### Actual Behavior
A clear and concise description of what actually happened.

### Screenshots
If applicable, add screenshots to help explain your problem.

### Environment
- OS: [e.g., Windows 10, macOS 14, Ubuntu 22.04]
- Node.js: [e.g., v18.17.0]
- LMStudio: [e.g., v0.2.15]
- PolyCode IDE: [e.g., v1.0.0]

### Additional Context
Add any other context about the problem here.
```

### Suggesting Features

We appreciate feature suggestions! Before submitting:

1. **Search existing issues** to avoid duplicates
2. **Check the project goals** to ensure alignment
3. **Provide details** about the feature:
   - Problem statement (what problem does it solve?)
   - Proposed solution (how should it work?)
   - Alternative solutions considered
   - Use cases and examples
   - Potential challenges or trade-offs

**Feature Request Template:**

```markdown
### Feature Description
A clear and concise description of the feature you'd like to see.

### Problem Statement
What problem does this feature solve? What value does it add?

### Proposed Solution
A detailed description of how you envision the feature working.

### Use Cases
Describe specific use cases or scenarios where this feature would be helpful.

### Implementation Ideas (Optional)
Any ideas on how this could be implemented.

### Additional Context
Add any other context about the feature request here.
```

### Submitting Pull Requests

We welcome pull requests! Please follow these guidelines:

#### 1. Set Up Your Development Environment

See [SETUP.md](./SETUP.md) for detailed instructions.

#### 2. Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/PolyCode.git
   cd PolyCode
   ```

3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/PolyCode.git
   ```

#### 3. Create a Feature Branch

Create a new branch for your contribution:
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b bugfix/your-bug-fix
# or
git checkout -b docs/update-documentation
```

See [Branch Naming Conventions](#branch-naming-conventions) for guidelines.

#### 4. Make Your Changes

- Write clean, readable code following the [Code Style Guide](./CODE_STYLE.md)
- Add or update tests (see [Testing Guide](./TESTING.md))
- Update documentation as needed
- Ensure all tests pass

#### 5. Commit Your Changes

Follow the [Commit Message Conventions](#commit-message-conventions):
```bash
git add .
git commit -m "feat: add keyboard shortcut for code formatting"
```

#### 6. Sync with Upstream

Before submitting, sync your branch with the upstream repository:
```bash
git fetch upstream
git rebase upstream/main
```

Resolve any conflicts if they arise.

#### 7. Push to Your Fork

Push your branch to your fork:
```bash
git push origin feature/your-feature-name
```

#### 8. Create Pull Request

1. Go to the original repository on GitHub
2. Click "New Pull Request"
3. Select your branch from the dropdown
4. Fill in the PR template:
   - Title should be clear and concise
   - Description should include:
     - What changes were made and why
     - How the changes were tested
     - Screenshots (if applicable)
     - References to related issues
   - Link to related issues using `#123` format

#### 9. Respond to Feedback

- Review and address all feedback from maintainers
- Make necessary updates to your branch
- Push new commits to your branch
- Comment on the PR when changes are ready for review

#### 10. Approval and Merge

Once approved:
- A maintainer will merge your PR
- Your contribution will be included in the next release

---

## Code Review Process

All contributions go through code review to ensure quality and consistency.

### What We Look For

1. **Code Quality**: Clean, readable, well-structured code
2. **Functionality**: Does it solve the intended problem?
3. **Testing**: Are tests included? Do they pass?
4. **Documentation**: Is the code documented? Are docs updated?
5. **Style**: Does it follow the [Code Style Guide](./CODE_STYLE.md)?
6. **Performance**: No performance regressions
7. **Security**: No security vulnerabilities introduced

### Review Timeline

- **Initial review**: Within 1-3 business days
- **Response time**: Respond to feedback within 1 week
- **Merge**: After all feedback is addressed and approved

### Getting Your PR Merged

1. **Ensure all CI checks pass** (tests, linting, build)
2. **Address all review comments** from maintainers
3. **Keep your branch up to date** with main branch
4. **Be responsive** to review feedback
5. **Be patient**: Review is voluntary and may take time

---

## Commit Message Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding or updating tests
- `chore`: Changes to the build process or auxiliary tools
- `ci`: Changes to CI configuration

### Scopes

Common scopes include:
- `main`: Main process code
- `renderer`: Renderer process code
- `orchestrator`: Multi-model orchestration
- `ui`: User interface components
- `lsp`: Language Server Protocol
- `git`: Git integration
- `terminal`: Terminal integration
- `docs`: Documentation
- `tests`: Testing

### Examples

```
feat(orchestrator): add support for custom personas

Users can now define custom personas in the configuration file.
This allows for more flexible and tailored code generation.

Closes #123
```

```
fix(renderer): resolve memory leak in editor component

The Monaco Editor was not being properly cleaned up when the
component unmounted, causing memory to accumulate.

Fixes #456
```

```
docs(setup): update LMStudio installation instructions

Added clearer steps for Mac and Linux users. Improved
troubleshooting section with common issues and solutions.
```

```
perf(orchestrator): optimize parallel model execution

Reduced latency by 30% by implementing request batching
and connection pooling for LMStudio API calls.
```

### Breaking Changes

If your PR includes breaking changes, append `!` to the type and describe in the body:

```
feat(orchestrator)!: change API signature for generateCode()

The generateCode() method now requires a configuration object
instead of separate parameters. This provides better flexibility
for future enhancements.

BREAKING CHANGE: The signature has changed from:
  generateCode(prompt, model, params)
To:
  generateCode({ prompt, model, ...params })

Migration guide: See docs/API_MIGRATION.md
```

---

## Branch Naming Conventions

Use descriptive branch names that follow these patterns:

### Feature Branches

```
feature/<short-description>
```

Examples:
- `feature/add-syntax-highlighting`
- `feature/custom-keyboard-shortcuts`
- `feature/lsp-support-for-rust`

### Bug Fix Branches

```
bugfix/<short-description>
```

Examples:
- `bugfix/memory-leak-editor`
- `bugfix/lmstudio-connection-fail`
- `bugfix/save-dialog-issues`

### Hotfix Branches

```
hotfix/<version>-<short-description>
```

Examples:
- `hotfix/1.0.1-critical-security-fix`
- `hotfix/1.2.0-crash-on-startup`

### Documentation Branches

```
docs/<short-description>
```

Examples:
- `docs/update-readme`
- `docs/add-api-documentation`
- `docs/fix-typo-guide`

### Refactor Branches

```
refactor/<short-description>
```

Examples:
- `refactor/clean-up-orcchestrator`
- `refactor/simplify-ipc-handlers`
- `refactor/extract-constants`

### Release Branches

```
release/<version>
```

Examples:
- `release/1.0.0`
- `release/2.0.0`

### Best Practices

- Use lowercase letters
- Use hyphens to separate words
- Keep names short but descriptive (max 50 characters)
- Avoid numbers unless referring to an issue number
- Examples of bad branch names:
  - ❌ `feature123`
  - ❌ `fix-stuff`
  - ❌ `NEW_FEATURE_XYZ`

---

## Coding Standards

### General Guidelines

- **Follow the Code Style Guide**: See [CODE_STYLE.md](./CODE_STYLE.md)
- **Write clean code**: Keep functions small and focused
- **Add comments**: Explain complex logic and algorithms
- **Use TypeScript**: Prefer TypeScript over JavaScript
- **Handle errors**: Always handle errors gracefully
- **Avoid side effects**: Make functions pure where possible
- **Use meaningful names**: Variables, functions, classes should be self-documenting

### Specific Standards

#### Main Process

- Use TypeScript interfaces for type safety
- Implement proper error handling
- Use async/await for asynchronous operations
- Document IPC handlers with JSDoc comments

```typescript
/**
 * Generates code from a natural language prompt
 * @param event - IPC event
 * @param prompt - Natural language prompt
 * @returns Generated code and metadata
 */
ipcMain.handle('generate-code', async (event, prompt: string) => {
  try {
    const result = await orchestrator.generateCode(prompt);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

#### Renderer Process

- Use functional components with hooks
- Avoid class components
- Use TypeScript for props and state
- Keep components small and focused
- Use proper React patterns (memo, useCallback, useMemo)

```typescript
interface AIPanelProps {
  onGenerate: (prompt: string) => Promise<void>;
  models: Model[];
}

export const AIPanel: React.FC<AIPanelProps> = ({ onGenerate, models }) => {
  const [prompt, setPrompt] = useState('');

  const handleGenerate = useCallback(async () => {
    await onGenerate(prompt);
  }, [prompt, onGenerate]);

  // ... rest of component
};
```

#### Tests

- Write unit tests for utilities and business logic
- Write integration tests for IPC communication
- Write E2E tests for critical user flows
- Use descriptive test names

```typescript
describe('Orchestrator', () => {
  describe('generateCode', () => {
    it('should generate code from prompt', async () => {
      const orchestrator = new Orchestrator(config);
      const result = await orchestrator.generateCode(
        'Create a hello world function in JavaScript'
      );

      expect(result).toBeDefined();
      expect(result.code).toContain('function');
    });

    it('should handle API errors gracefully', async () => {
      const orchestrator = new Orchestrator(config);
      // Mock API failure
      await expect(orchestrator.generateCode('test'))
        .rejects.toThrow('API Error');
    });
  });
});
```

---

## Testing Requirements

All contributions must include tests (unless explicitly waived).

### When Tests Are Required

- New features: Must have unit tests
- Bug fixes: Must have tests that verify the fix
- Refactoring: All existing tests must pass
- Documentation: No tests required (unless code examples)

### Test Coverage

- Aim for **70%+ code coverage**
- Critical paths must be covered
- Edge cases should be tested

### Running Tests

Before submitting, run the test suite:
```bash
npm test
```

Run with coverage:
```bash
npm run test:coverage
```

### Test Organization

- Place tests in `__tests__/` directories
- Name test files `<module>.test.ts` or `<module>.spec.ts`
- Use `describe` blocks for logical grouping
- Use `it` or `test` for individual tests

See [TESTING.md](./TESTING.md) for detailed testing guidelines.

---

## License Agreement

By contributing to PolyCode IDE, you agree that your contributions will be licensed under the MIT License.

### What This Means

- Your contributions will be available to the public
- Others can use, modify, and distribute your code
- You retain copyright to your contributions
- The project as a whole is MIT licensed

### CLA (Contributor License Agreement)

Currently, we do not have a formal CLA. By submitting a pull request, you implicitly agree to license your contributions under the MIT License.

### Third-Party Code

If your contribution includes third-party code:
- Ensure it is compatible with MIT license
- Add attribution in the code comments
- Document the source and license in a comment block

---

## Recognition

Contributors are recognized in the following ways:

- **Contributors list**: Displayed in the README
- **Release notes**: Your name will appear in release notes
- **Documentation**: Contributors are thanked in documentation

We appreciate all contributions, big and small!

---

## Questions?

If you have questions about contributing:

1. Check this guide first
2. Review the [Developer Guide](./DEVELOPER_GUIDE.md)
3. Search or ask in GitHub Discussions
4. Create an issue with the "question" label

---

**Thank you for contributing to PolyCode IDE! 🎉**
