# PolyCode IDE - Testing Guide

This guide provides instructions and best practices for testing PolyCode IDE.

## Table of Contents

- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
  - [Unit Tests](#unit-tests)
  - [Integration Tests](#integration-tests)
  - [E2E Tests](#e2e-tests)
- [Test Organization](#test-organization)
- [Test Coverage](#test-coverage)
- [Testing Best Practices](#testing-best-practices)
- [Common Testing Scenarios](#common-testing-scenarios)
- [Debugging Tests](#debugging-tests)
- [Test Data and Fixtures](#test-data-and-fixtures)

---

## Running Tests

### Basic Test Commands

Run all tests:
```bash
npm test
```

Run tests in watch mode (re-runs on file changes):
```bash
npm run test:watch
```

Run tests with coverage report:
```bash
npm run test:coverage
```

Run specific test file:
```bash
npm test -- orchestrator.test.ts
```

Run tests matching a pattern:
```bash
npm test -- --testNamePattern="should generate code"
```

### Test Output

Successful test run:
```
PASS  src/main/core/orchestrator.test.ts
  Orchestrator
    generateCode
      ✓ should generate code from prompt (45ms)
      ✓ should handle API errors (12ms)
    editCode
      ✓ should edit code with instruction (34ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        2.345s
```

---

## Writing Tests

### Unit Tests

Unit tests test individual functions and components in isolation.

#### Testing Main Process Functions

```typescript
// src/main/core/__tests__/rubric.test.ts
import { Rubric } from '../rubric';

describe('Rubric', () => {
  let rubric: Rubric;

  beforeEach(() => {
    rubric = new Rubric();
  });

  describe('evaluateCode', () => {
    it('should calculate correct score for valid code', () => {
      const code = `
        function add(a, b) {
          return a + b;
        }
      `;

      const result = rubric.evaluateCode(code);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(10);
    });

    it('should penalize code with errors', () => {
      const code = `
        function add(a, b) {
          return a + 
        }
      `;

      const result = rubric.evaluateCode(code);

      expect(result.score).toBeLessThan(5);
    });

    it('should handle empty code', () => {
      const result = rubric.evaluateCode('');

      expect(result.score).toBe(0);
    });
  });

  describe('calculateWeightedScore', () => {
    it('should calculate correct weighted average', () => {
      const criteria = [
        { name: 'correctness', score: 8, weight: 0.3 },
        { name: 'quality', score: 7, weight: 0.25 },
        { name: 'bestPractices', score: 9, weight: 0.2 },
      ];

      const result = rubric.calculateWeightedScore(criteria);

      // Expected: (8 * 0.3) + (7 * 0.25) + (9 * 0.2) = 2.4 + 1.75 + 1.8 = 5.95
      expect(result).toBeCloseTo(5.95, 2);
    });
  });
});
```

#### Testing Renderer Components

```typescript
// src/renderer/components/__tests__/AIPanel.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIPanel } from '../AIPanel';

// Mock IPC
jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
  },
}));

// Mock window.electronAPI
global.window.electronAPI = {
  generateCode: jest.fn(),
  editCode: jest.fn(),
  analyzeCode: jest.fn(),
};

describe('AIPanel', () => {
  const defaultProps = {
    onGenerate: jest.fn(),
    models: [
      { id: 'llama-3.2', name: 'Llama 3.2' },
      { id: 'mistral-7b', name: 'Mistral 7B' },
    ],
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render AI panel', () => {
    render(<AIPanel {...defaultProps} />);

    expect(screen.getByText('Generate Code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument();
  });

  it('should show model dropdown', () => {
    render(<AIPanel {...defaultProps} />);

    expect(screen.getByText('Llama 3.2')).toBeInTheDocument();
    expect(screen.getByText('Mistral 7B')).toBeInTheDocument();
  });

  it('should call onGenerate when Generate button is clicked', async () => {
    const user = userEvent.setup();
    render(<AIPanel {...defaultProps} />);

    const input = screen.getByPlaceholderText('Enter your prompt...');
    const generateButton = screen.getByRole('button', { name: 'Generate' });

    await user.type(input, 'Create a hello world function');
    await user.click(generateButton);

    expect(defaultProps.onGenerate).toHaveBeenCalledWith(
      'Create a hello world function'
    );
  });

  it('should disable button when disabled prop is true', () => {
    render(<AIPanel {...defaultProps} disabled={true} />);

    const generateButton = screen.getByRole('button', { name: 'Generate' });
    expect(generateButton).toBeDisabled();
  });

  it('should show loading state during generation', async () => {
    const user = userEvent.setup();
    defaultProps.onGenerate.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<AIPanel {...defaultProps} />);

    const generateButton = screen.getByRole('button', { name: 'Generate' });
    await user.click(generateButton);

    expect(screen.getByText('Generating...')).toBeInTheDocument();
  });
});
```

### Integration Tests

Integration tests test multiple components working together.

```typescript
// src/main/__tests__/integration/orchestrator-integration.test.ts
import { Orchestrator } from '../../core/orchestrator';
import { LMStudioClient } from '../../core/lmstudio-client';
import { Rubric } from '../../core/rubric';

describe('Orchestrator Integration', () => {
  let orchestrator: Orchestrator;
  let mockClient: jest.Mocked<LMStudioClient>;
  let mockRubric: jest.Mocked<Rubric>;

  beforeEach(() => {
    mockClient = {
      generateCode: jest.fn(),
      generateCompletion: jest.fn(),
      getModels: jest.fn(),
      checkConnection: jest.fn(),
    } as any;

    mockRubric = {
      evaluateCode: jest.fn(),
      calculateWeightedScore: jest.fn(),
    } as any;

    orchestrator = new Orchestrator(
      {
        models: ['llama-3.2', 'mistral-7b'],
        maxConcurrency: 2,
      },
      mockClient,
      mockRubric
    );
  });

  it('should orchestrate full code generation flow', async () => {
    // Mock LMStudio responses
    mockClient.generateCode
      .mockResolvedValueOnce({
        code: 'function add(a, b) { return a + b; }',
        model: 'llama-3.2',
      })
      .mockResolvedValueOnce({
        code: 'function sum(a, b) { return a + b; }',
        model: 'mistral-7b',
      });

    // Mock rubric evaluation
    mockRubric.evaluateCode
      .mockReturnValueOnce({ score: 8.5, criteria: [] })
      .mockReturnValueOnce({ score: 7.8, criteria: [] });

    const result = await orchestrator.generateCode('Create add function');

    expect(mockClient.generateCode).toHaveBeenCalledTimes(2);
    expect(mockRubric.evaluateCode).toHaveBeenCalledTimes(2);
    expect(result).toBeDefined();
    expect(result.code).toBe('function add(a, b) { return a + b; }');
  });

  it('should handle partial failures gracefully', async () => {
    mockClient.generateCode
      .mockResolvedValueOnce({
        code: 'function add(a, b) { return a + b; }',
        model: 'llama-3.2',
      })
      .mockRejectedValueOnce(new Error('API Error'));

    mockRubric.evaluateCode.mockReturnValueOnce({
      score: 8.5,
      criteria: [],
    });

    const result = await orchestrator.generateCode('Create add function');

    expect(result).toBeDefined();
    expect(result.code).toBe('function add(a, b) { return a + b; }');
  });
});
```

### E2E Tests

E2E tests test the entire application flow from user perspective.

```typescript
// src/__e2e__/code-generation.e2e.test.ts
import { Application } from 'spectron';

describe('Code Generation E2E', () => {
  let app: Application;

  beforeEach(async () => {
    app = new Application({
      path: electronPath,
      args: ['.'],
    });

    await app.start();
    await app.client.waitUntilWindowLoaded();
  });

  afterEach(async () => {
    if (app && app.isRunning()) {
      await app.stop();
    }
  });

  it('should generate code and display result', async () => {
    // Click on AI panel
    await app.client.click('.ai-panel');

    // Enter prompt
    const promptInput = await app.client.$('#prompt-input');
    await promptInput.setValue('Create a factorial function');

    // Click generate button
    await app.client.click('#generate-button');

    // Wait for result
    await app.client.waitUntil(
      async () => {
        const resultText = await app.client.getText('.result-content');
        return resultText.includes('function');
      },
      { timeout: 60000 }
    );

    // Verify result
    const resultText = await app.client.getText('.result-content');
    expect(resultText).toContain('function');
    expect(resultText).toContain('factorial');
  });

  it('should handle LMStudio connection error', async () => {
    // Ensure LMStudio is not running
    // ... setup code ...

    // Try to generate code
    await app.client.click('.ai-panel');
    const promptInput = await app.client.$('#prompt-input');
    await promptInput.setValue('Test');

    await app.client.click('#generate-button');

    // Wait for error message
    await app.client.waitUntil(
      async () => {
        const errorMsg = await app.client.getText('.error-message');
        return errorMsg.includes('Failed to connect');
      },
      { timeout: 5000 }
    );
  });
});
```

---

## Test Organization

### Directory Structure

```
src/
├── main/
│   ├── core/
│   │   ├── orchestrator.ts
│   │   └── __tests__/
│   │       ├── orchestrator.test.ts
│   │       └── rubric.test.ts
│   └── __tests__/
│       └── integration/
│           └── orchestrator-integration.test.ts
├── renderer/
│   ├── components/
│   │   ├── AIPanel.tsx
│   │   └── __tests__/
│   │       └── AIPanel.test.tsx
│   └── __tests__/
│       └── utils/
│           └── monaco-config.test.ts
└── __e2e__/
    └── code-generation.e2e.test.ts
```

### File Naming

- **Unit tests**: `<module>.test.ts` or `<module>.test.tsx`
- **Integration tests**: `<feature>-integration.test.ts`
- **E2E tests**: `<feature>.e2e.test.ts`

**Examples:**
- `orchestrator.test.ts` - Unit tests for orchestrator
- `AIPanel.test.tsx` - Unit tests for AIPanel component
- `code-generation-integration.test.ts` - Integration tests for code generation
- `user-workflow.e2e.test.ts` - E2E tests for user workflows

### Test Structure

Use `describe` blocks for logical grouping:
```typescript
describe('FeatureName', () => {
  describe('FunctionName', () => {
    it('should do something', () => { });

    it('should handle edge case', () => { });
  });
});
```

---

## Test Coverage

### Coverage Goals

- **Overall**: Aim for **70%+** coverage
- **Critical paths**: 90%+ coverage required
- **Utilities**: 90%+ coverage recommended
- **UI components**: 70%+ coverage

### Checking Coverage

Run coverage report:
```bash
npm run test:coverage
```

Coverage output:
```
-----------------------|---------|----------|---------|---------|-------------------
File                   | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------------|---------|----------|---------|---------|-------------------
All files              |   78.5  |    75.2  |   82.1  |   78.3  |
 main/core             |   85.3  |    82.1  |   90.5  |   85.0  |
  orchestrator.ts      |   90.2  |    88.5  |   95.0  |   90.0  | 145,156
  rubric.ts            |   82.1  |    78.9  |   85.7  |   82.0  | 67,78
 renderer/components   |   72.3  |    68.4  |   75.0  |   72.0  |
  AIPanel.tsx          |   75.5  |    72.0  |   80.0  |   75.2  | 45,67
  Editor.tsx           |   68.1  |    62.5  |   70.0  |   68.0  | 23,34,56
-----------------------|---------|----------|---------|---------|-------------------
```

### Coverage Configuration

In `jest.config.js`:
```javascript
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

---

## Testing Best Practices

### 1. Write Descriptive Test Names

```typescript
✅ Good:
it('should generate code when valid prompt is provided', () => { });
it('should throw error when LMStudio is not connected', () => { });
it('should calculate weighted score correctly', () => { });

❌ Bad:
it('test1', () => { });
it('works', () => { });
it('should do the thing', () => { });
```

### 2. Use Arrange-Act-Assert (AAA) Pattern

```typescript
✅ Good:
it('should calculate sum of two numbers', () => {
  // Arrange
  const a = 5;
  const b = 10;
  const calculator = new Calculator();

  // Act
  const result = calculator.add(a, b);

  // Assert
  expect(result).toBe(15);
});

❌ Bad:
it('should calculate sum', () => {
  const calculator = new Calculator();
  expect(calculator.add(5, 10)).toBe(15);
});
```

### 3. Mock External Dependencies

```typescript
✅ Good:
describe('Orchestrator', () => {
  const mockClient = {
    generateCode: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use client to generate code', async () => {
    mockClient.generateCode.mockResolvedValue({ code: 'test' });
    const orchestrator = new Orchestrator({}, mockClient);

    await orchestrator.generateCode('prompt');

    expect(mockClient.generateCode).toHaveBeenCalledWith('prompt');
  });
});

❌ Bad:
it('should generate code', async () => {
  // This makes actual API calls!
  const orchestrator = new Orchestrator();
  await orchestrator.generateCode('prompt');
});
```

### 4. Test Edge Cases

```typescript
✅ Good:
describe('validateInput', () => {
  it('should accept valid input', () => {
    expect(validateInput('Hello, world!')).toBe(true);
  });

  it('should reject empty input', () => {
    expect(validateInput('')).toBe(false);
  });

  it('should reject null input', () => {
    expect(validateInput(null)).toBe(false);
  });

  it('should reject undefined input', () => {
    expect(validateInput(undefined)).toBe(false);
  });

  it('should reject input exceeding max length', () => {
    expect(validateInput('x'.repeat(1001))).toBe(false);
  });
});
```

### 5. Keep Tests Isolated

```typescript
✅ Good:
describe('FileStore', () => {
  let fileStore: FileStore;

  beforeEach(() => {
    // Create fresh instance for each test
    fileStore = new FileStore();
  });

  it('should store file', () => {
    fileStore.save('test.txt', 'content');
    expect(fileStore.read('test.txt')).toBe('content');
  });

  it('should not share state between tests', () => {
    // This test doesn't see data from previous test
    expect(fileStore.read('test.txt')).toBe(null);
  });
});

❌ Bad:
const fileStore = new FileStore(); // Shared across tests!

describe('FileStore', () => {
  it('should store file', () => {
    fileStore.save('test.txt', 'content');
    expect(fileStore.read('test.txt')).toBe('content');
  });

  it('should fail due to shared state', () => {
    // This test sees data from previous test!
    expect(fileStore.read('test.txt')).toBe(null); // Fails!
  });
});
```

---

## Common Testing Scenarios

### Testing Async Code

```typescript
✅ Good:
it('should generate code asynchronously', async () => {
  const orchestrator = new Orchestrator();
  const result = await orchestrator.generateCode('prompt');

  expect(result).toBeDefined();
});

it('should handle async errors', async () => {
  const orchestrator = new Orchestrator();
  await expect(orchestrator.generateCode('')).rejects.toThrow(
    'Prompt cannot be empty'
  );
});

❌ Bad:
it('should generate code', () => {
  const orchestrator = new Orchestrator();
  const result = orchestrator.generateCode('prompt');
  expect(result).toBeDefined(); // Fails - returns a promise!
});
```

### Testing React Events

```typescript
✅ Good:
it('should call onGenerate when button is clicked', async () => {
  const user = userEvent.setup();
  const onGenerate = jest.fn();
  render(<AIPanel onGenerate={onGenerate} />);

  const button = screen.getByRole('button', { name: 'Generate' });
  await user.click(button);

  expect(onGenerate).toHaveBeenCalled();
});

it('should update input on change', async () => {
  const user = userEvent.setup();
  render(<AIPanel onGenerate={jest.fn()} />);

  const input = screen.getByPlaceholderText('Enter prompt...');
  await user.type(input, 'Hello world');

  expect(input).toHaveValue('Hello world');
});

❌ Bad:
it('should call onGenerate', () => {
  const onGenerate = jest.fn();
  render(<AIPanel onGenerate={onGenerate} />);

  const button = screen.getByRole('button', { name: 'Generate' });
  fireEvent.click(button);

  // Doesn't wait for async handlers!
  expect(onGenerate).toHaveBeenCalled();
});
```

### Testing IPC Communication

```typescript
✅ Good:
it('should handle generate-code IPC call', async () => {
  const { ipcMain } = require('electron');
  const mockEvent = { sender: { send: jest.fn() } };
  ipcMain.emit('generate-code', mockEvent, 'test prompt');

  // Wait for async handler
  await new Promise(resolve => setTimeout(resolve, 100));

  expect(mockEvent.sender.send).toHaveBeenCalledWith(
    'generate-code-result',
    expect.any(Object)
  );
});
```

---

## Debugging Tests

### Using Debugger

Add `debugger` statement:
```typescript
it('should do something', () => {
  const result = calculate(5, 10);
  debugger; // Execution stops here
  expect(result).toBe(15);
});
```

### Console Logging

```typescript
it('should generate code', async () => {
  const orchestrator = new Orchestrator();
  const prompt = 'Create a function';

  console.log('Generating with prompt:', prompt);
  const result = await orchestrator.generateCode(prompt);
  console.log('Generated code:', result);

  expect(result).toBeDefined();
});
```

### Test-Only Mode

Run specific test:
```bash
npm test -- --testNamePattern="should generate code"
```

### Jest Configuration

Enable verbose output in `jest.config.js`:
```javascript
module.exports = {
  verbose: true,
  bail: false, // Don't stop on first failure
  detectOpenHandles: true, // Detect async issues
};
```

---

## Test Data and Fixtures

### Using Fixtures

Create fixture files:
```typescript
// src/__fixtures__/code-samples.ts
export const validCode = `
function add(a, b) {
  return a + b;
}
`;

export const invalidCode = `
function add(a, b) {
  return a + 
}
`;

export const codeSamples = {
  javascript: validCode,
  python: 'def add(a, b):\n    return a + b',
  java: 'public int add(int a, int b) { return a + b; }',
};
```

Use in tests:
```typescript
import { codeSamples } from '__fixtures__/code-samples';

describe('Rubric', () => {
  it('should evaluate JavaScript code', () => {
    const result = rubric.evaluateCode(codeSamples.javascript);
    expect(result.score).toBeGreaterThan(5);
  });
});
```

### Using Factories

```typescript
// src/__fixtures__/model-factory.ts
export class ModelFactory {
  static createModel(overrides = {}): Model {
    return {
      id: 'test-model',
      name: 'Test Model',
      size: '3B',
      ...overrides,
    };
  }

  static createCode(overrides = {}): Code {
    return {
      content: 'function test() {}',
      language: 'javascript',
      ...overrides,
    };
  }
}

// Usage
const model = ModelFactory.createModel({ name: 'Custom Model' });
const code = ModelFactory.createCode({ language: 'python' });
```

---

## Continuous Integration

Tests run automatically on:
- Every pull request
- Every push to main branch
- Scheduled nightly runs

### CI Configuration

Example `.github/workflows/test.yml`:
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v2
```

---

**Keep your tests green! 🧪**
