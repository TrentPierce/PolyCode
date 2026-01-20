# PolyCode IDE - Code Style Guide

This document outlines the coding standards and style guidelines for PolyCode IDE development.

## Table of Contents

- [Naming Conventions](#naming-conventions)
  - [Files and Directories](#files-and-directories)
  - [Variables](#variables)
  - [Functions](#functions)
  - [Classes](#classes)
  - [Constants](#constants)
  - [Interfaces and Types](#interfaces-and-types)
- [Code Formatting Rules](#code-formatting-rules)
  - [Indentation and Spacing](#indentation-and-spacing)
  - [Line Length](#line-length)
  - [Blank Lines](#blank-lines)
  - [Braces](#braces)
  - [Quotes](#quotes)
  - [Trailing Commas](#trailing-commas)
  - [Semicolons](#semicolons)
- [React/JSX Conventions](#reactjsx-conventions)
- [JavaScript/TypeScript Conventions](#javascripttypescript-conventions)
- [Comments and Documentation](#comments-and-documentation)
- [Imports and Exports](#imports-and-exports)
- [Best Practices](#best-practices)

---

## Naming Conventions

### Files and Directories

**Files:**
- Use **lowercase** with **kebab-case**
- TypeScript files: `.ts` or `.tsx` extension
- JavaScript files: `.js` or `.jsx` extension

```
✅ Good:
orchestrator.ts
lmstudio-client.ts
file-explorer.tsx
code-editor.tsx

❌ Bad:
Orchestrator.ts
LMStudioClient.ts
fileExplorer.tsx
code-editor.TS
```

**Directories:**
- Use **lowercase** with **kebab-case**

```
✅ Good:
src/main/core/
src/renderer/components/
src/renderer/utils/

❌ Bad:
src/main/Core/
src/renderer/Components/
src/renderer/utils/
```

### Variables

- Use **camelCase**
- Descriptive names that explain purpose
- Avoid abbreviations unless widely understood

```typescript
✅ Good:
let userId = 123;
const fileName = 'example.txt';
let isConnecting = true;

❌ Bad:
let uid = 123;
const fn = 'example.txt';
let flag = true;
```

**Booleans:**
- Prefix with `is`, `has`, `can`, `should`, `will`

```typescript
✅ Good:
let isVisible = true;
let hasPermission = false;
let canEdit = true;

❌ Bad:
let visible = true;
let permission = false;
let edit = true;
```

### Functions

- Use **camelCase**
- Names should be verbs or verb phrases
- Descriptive names that explain what they do

```typescript
✅ Good:
function calculateFactorial(n: number): number { }
async function generateCode(prompt: string): Promise<Code> { }
function handleSaveFile(fileName: string): void { }

❌ Bad:
function factorial(n: number): number { }
async function code(prompt: string): Promise<Code> { }
function save(fileName: string): void { }
```

**Event Handlers:**
- Prefix with `handle` for event callbacks
- Use `on` for props that accept event handlers

```typescript
✅ Good:
const handleClick = (e: MouseEvent) => { };
const handleSave = () => { };
<AIPanel onSave={handleSave} />

❌ Bad:
const click = (e: MouseEvent) => { };
const save = () => { };
<AIPanel save={save} />
```

### Classes

- Use **PascalCase**
- Single responsibility principle
- Prefix interfaces with `I` (optional, not strictly required)

```typescript
✅ Good:
class Orchestrator { }
interface ILMStudioClient { }
class FileManager { }

❌ Bad:
class orchestrator { }
class file_manager { }
class FileManagerClass { }
```

### Constants

- Use **UPPER_SNAKE_CASE**
- Use `const` declaration
- Group related constants together

```typescript
✅ Good:
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 30000;
const API_ENDPOINT = 'http://localhost:1234';

❌ Bad:
const maxRetries = 3;
const default_timeout = 30000;
const apiEndpoint = 'http://localhost:1234';
```

### Interfaces and Types

- Use **PascalCase**
- Descriptive names that represent concepts

```typescript
✅ Good:
interface CodeGeneration { }
type ModelConfig = { }
interface UserSettings { }

❌ Bad:
interface codeGeneration { }
type modelConfig = { }
interface user_settings { }
```

**Type vs Interface:**
- Use `interface` for object shapes that can be extended
- Use `type` for unions, intersections, primitives

```typescript
✅ Good:
interface User {
  id: number;
  name: string;
}

type Status = 'pending' | 'success' | 'error';
type ID = string | number;

❌ Bad:
type User = {
  id: number;
  name: string;
};
interface Status = 'pending' | 'success' | 'error';
```

---

## Code Formatting Rules

### Indentation and Spacing

- Use **2 spaces** for indentation (no tabs)
- Consistent spacing around operators
- Space after keywords (`if`, `for`, `while`, `function`)

```typescript
✅ Good:
function add(a: number, b: number): number {
  return a + b;
}

if (condition) {
  doSomething();
}

❌ Bad:
function add(a:number,b:number):number{
  return a+b;
}

if(condition){
  doSomething();
}
```

### Line Length

- Maximum **120 characters** per line
- Break long lines logically
- Align multi-line arguments/parameters

```typescript
✅ Good:
const result = await orchestrator.generateCode(
  prompt,
  { model: 'llama-3.2', temperature: 0.7 }
);

interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

❌ Bad:
const result = await orchestrator.generateCode(prompt, { model: 'llama-3.2', temperature: 0.7 });

interface User { id: number; name: string; email: string; createdAt: Date; }
```

### Blank Lines

- One blank line between functions and classes
- No blank lines inside functions (unless logical grouping)
- Two blank lines between top-level code blocks

```typescript
✅ Good:
function calculateSum(a: number, b: number): number {
  return a + b;
}

function calculateProduct(a: number, b: number): number {
  return a * b;
}

class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }
}

❌ Bad:
function calculateSum(a: number, b: number): number {
  return a + b;
}

function calculateProduct(a: number, b: number): number {
  return a * b;
}
```

### Braces

- Use **K&R style** (opening brace on same line)
- Always use braces for control structures (even single statements)
- No braces for single-line arrow functions (unless needed)

```typescript
✅ Good:
if (condition) {
  doSomething();
}

function add(a: number, b: number): number {
  return a + b;
}

const sum = (a: number, b: number) => a + b;

❌ Bad:
if (condition)
{
  doSomething();
}

function add(a: number, b: number): number
{
  return a + b;
}
```

### Quotes

- Use **single quotes** by default
- Use double quotes when string contains single quotes
- Use backticks for template literals

```typescript
✅ Good:
const message = 'Hello, world!';
const greeting = "It's a beautiful day!";
const name = 'John';
const template = `Hello, ${name}!`;

❌ Bad:
const message = "Hello, world!";
const greeting = 'It\'s a beautiful day!';
const name = "John";
const template = "Hello, " + name + "!";
```

### Trailing Commas

- Use trailing commas in multi-line arrays, objects, and function parameters
- Improves readability and reduces diff noise

```typescript
✅ Good:
const items = [
  'item1',
  'item2',
  'item3',
];

const config = {
  model: 'llama-3.2',
  temperature: 0.7,
  maxTokens: 1000,
];

function process(
  input: string,
  options?: ProcessOptions,
): Promise<Result> {
  // ...
}

❌ Bad:
const items = [
  'item1',
  'item2',
  'item3'
];

const config = {
  model: 'llama-3.2',
  temperature: 0.7,
  maxTokens: 1000
};
```

### Semicolons

- Always use semicolons
- Required for consistent JavaScript parsing

```typescript
✅ Good:
const x = 5;
function add(a: number, b: number): number {
  return a + b;
}

❌ Bad:
const x = 5
function add(a: number, b: number): number {
  return a + b
}
```

---

## React/JSX Conventions

### Component Naming

- Use **PascalCase** for component names
- Default export for main component
- Named exports for utilities

```typescript
✅ Good:
export const AIPanel: React.FC<AIPanelProps> = ({ onGenerate }) => { };
export const Editor: React.FC = () => { };
export function FileExplorer(): JSX.Element { }

❌ Bad:
export const aiPanel = () => { };
export const editor = () => { };
export function fileExplorer() { }
```

### Props

- Define props interface before component
- Use TypeScript for type safety
- Destructure props in function signature

```typescript
✅ Good:
interface AIPanelProps {
  onGenerate: (prompt: string) => Promise<void>;
  models: Model[];
  disabled?: boolean;
}

export const AIPanel: React.FC<AIPanelProps> = ({ onGenerate, models, disabled = false }) => {
  // ...
};

❌ Bad:
export const AIPanel: React.FC = (props) => {
  const { onGenerate, models, disabled = false } = props;
  // ...
};
```

### JSX

- Self-closing tags for components without children
- Use parentheses for multi-line JSX
- Align attributes on same line or vertically

```typescript
✅ Good:
const element = <div>Hello, world!</div>;

const complex = (
  <AIPanel
    onGenerate={handleGenerate}
    models={models}
    disabled={isDisabled}
  />
);

const list = (
  <ul>
    {items.map(item => (
      <li key={item.id}>{item.name}</li>
    ))}
  </ul>
);

❌ Bad:
const element = <div>Hello, world!</div>;

const complex = <AIPanel
  onGenerate={handleGenerate}
  models={models}
  disabled={isDisabled}
/>;

const list = <ul>{items.map(item => <li key={item.id}>{item.name}</li>)}</ul>;
```

### Hooks

- Use hooks in order: State, Effects, Refs, Memo
- No hooks inside conditions or loops
- Custom hooks should start with `use`

```typescript
✅ Good:
export const useCodeGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // effect
  }, []);

  const generate = useCallback(async (prompt: string) => {
    // ...
  }, []);

  return { loading, error, generate };
};

export const AIPanel: React.FC = () => {
  const { loading, error, generate } = useCodeGenerator();
  // ...
};

❌ Bad:
export const useCodeGenerator = () => {
  useEffect(() => {
    // effect
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (prompt: string) => {
    // ...
  }, []);

  return { loading, error, generate };
};
```

### Fragments

- Use `<>...</>` for fragments without props
- Use `<React.Fragment>` when adding keys

```typescript
✅ Good:
return (
  <>
    <Header />
    <Content />
    <Footer />
  </>
);

return (
  <React.Fragment>
    {items.map(item => (
      <React.Fragment key={item.id}>
        <ItemTitle>{item.title}</ItemTitle>
        <ItemDescription>{item.description}</ItemDescription>
      </React.Fragment>
    ))}
  </React.Fragment>
);

❌ Bad:
return (
  <div>
    <Header />
    <Content />
    <Footer />
  </div>
);

return (
  <>
    {items.map(item => (
      <React.Fragment key={item.id}>
        <ItemTitle>{item.title}</ItemTitle>
        <ItemDescription>{item.description}</ItemDescription>
      </React.Fragment>
    ))}
  </>
);
```

---

## JavaScript/TypeScript Conventions

### Type Annotations

- Explicit types for function parameters and return values
- Use `any` only as last resort
- Prefer `unknown` over `any`

```typescript
✅ Good:
function add(a: number, b: number): number {
  return a + b;
}

async function fetchData(url: string): Promise<Data> {
  const response = await fetch(url);
  return response.json();
}

function process(data: unknown): Result {
  // Type guard
  if (isValidData(data)) {
    return transform(data);
  }
  throw new Error('Invalid data');
}

❌ Bad:
function add(a: any, b: any): any {
  return a + b;
}

async function fetchData(url) {
  const response = await fetch(url);
  return response.json();
}
```

### Async/Await

- Prefer `async/await` over `.then()`
- Handle errors with try/catch
- Use `Promise.all()` for parallel operations

```typescript
✅ Good:
async function generateCode(prompt: string): Promise<Code> {
  try {
    const result = await orchestrator.generateCode(prompt);
    return result;
  } catch (error) {
    console.error('Generation failed:', error);
    throw error;
  }
}

async function generateMultiple(prompts: string[]): Promise<Code[]> {
  const results = await Promise.all(
    prompts.map(prompt => orchestrator.generateCode(prompt))
  );
  return results;
}

❌ Bad:
function generateCode(prompt: string): Promise<Code> {
  return orchestrator.generateCode(prompt)
    .then(result => result)
    .catch(error => {
      console.error('Generation failed:', error);
      throw error;
    });
}
```

### Error Handling

- Always handle errors explicitly
- Use descriptive error messages
- Throw appropriate error types

```typescript
✅ Good:
async function connectToLMStudio(): Promise<void> {
  try {
    await client.connect();
  } catch (error) {
    if (error instanceof NetworkError) {
      throw new Error('Failed to connect to LMStudio API');
    }
    throw error;
  }
}

function validateInput(input: string): void {
  if (!input) {
    throw new Error('Input cannot be empty');
  }
  if (input.length > 1000) {
    throw new Error('Input exceeds maximum length of 1000 characters');
  }
}

❌ Bad:
async function connectToLMStudio(): Promise<void> {
  await client.connect();
}

function validateInput(input: string): void {
  if (!input || input.length > 1000) {
    throw new Error('Invalid input');
  }
}
```

### Destructuring

- Use destructuring for objects and arrays
- Rename properties when needed

```typescript
✅ Good:
function processUser(user: User): void {
  const { id, name, email } = user;
  // ...
}

function processData({ data, timestamp }: Response): void {
  // ...
}

function getCoordinates({ x, y }: Point): [number, number] {
  return [x, y];
}

❌ Bad:
function processUser(user: User): void {
  const id = user.id;
  const name = user.name;
  const email = user.email;
  // ...
}
```

---

## Comments and Documentation

### JSDoc Comments

- Use JSDoc for functions, classes, and interfaces
- Document parameters, return values, and exceptions

```typescript
/**
 * Generates code from a natural language prompt
 * @param prompt - Natural language prompt describing desired code
 * @param options - Generation options
 * @param options.model - Model to use for generation
 * @param options.temperature - Creativity level (0-1)
 * @returns Generated code and metadata
 * @throws {Error} When LMStudio is not connected
 * @throws {TimeoutError} When generation exceeds timeout
 */
async function generateCode(
  prompt: string,
  options: GenerateOptions
): Promise<CodeGeneration> {
  // ...
}
```

### Inline Comments

- Use inline comments for complex logic
- Explain "why", not "what"
- Keep comments concise and up-to-date

```typescript
✅ Good:
// Calculate weighted score based on rubric criteria
const weightedScore = criteria.reduce((sum, criterion) => {
  return sum + (criterion.score * criterion.weight);
}, 0);

// Retry up to 3 times for transient network errors
for (let i = 0; i < MAX_RETRIES; i++) {
  try {
    return await makeRequest();
  } catch (error) {
    if (i === MAX_RETRIES - 1) throw error;
    await delay(RETRY_DELAY);
  }
}

❌ Bad:
// Calculate sum
const sum = a + b;

// Loop
for (let i = 0; i < 10; i++) {
  // Do something
}
```

### TODO Comments

- Use TODO for future improvements
- Include what needs to be done and why

```typescript
✅ Good:
// TODO: Implement caching to reduce API calls (performance optimization)
// TODO: Add support for streaming responses (UX improvement)

❌ Bad:
// TODO: fix this
// TODO: improve
```

---

## Imports and Exports

### Import Order

1. External libraries (npm packages)
2. Internal modules (relative imports)
3. Type imports

```typescript
✅ Good:
import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import axios from 'axios';

import { Orchestrator } from '../core/orchestrator';
import { Editor } from './Editor';
import type { Code, Prompt } from '../types';

❌ Bad:
import type { Code } from '../types';
import React from 'react';
import { Orchestrator } from '../core/orchestrator';
import { ipcRenderer } from 'electron';
```

### Named vs Default Exports

- Prefer named exports for utilities and components
- Use default exports for main entry points

```typescript
✅ Good:
// utils/helpers.ts
export const formatDate = (date: Date): string => { };
export const validateEmail = (email: string): boolean => { };

// components/AIPanel.tsx
export const AIPanel: React.FC<AIPanelProps> = ({ ... }) => { };

// index.ts
export { AIPanel } from './components/AIPanel';
export { formatDate } from './utils/helpers';

❌ Bad:
// utils/helpers.ts
export default function formatDate(date: Date): string { }
export default function validateEmail(email: string): boolean { }
```

---

## Best Practices

### Avoid Globals

- Use ES modules instead of global variables
- Pass dependencies as parameters

```typescript
✅ Good:
class CodeGenerator {
  constructor(private apiClient: ApiClient) { }

  generate(prompt: string): Promise<Code> {
    return this.apiClient.generate(prompt);
  }
}

❌ Bad:
const apiClient = new ApiClient();

function generate(prompt: string): Promise<Code> {
  return apiClient.generate(prompt);
}
```

### Use const and let

- Use `const` by default
- Use `let` only when reassignment is needed
- Never use `var`

```typescript
✅ Good:
const userId = 123;
const userName = 'John';

let counter = 0;
counter++;

❌ Bad:
var userId = 123;
var userName = 'John';
let counter = 0;
counter = counter + 1;
```

### Early Returns

- Return early to reduce nesting
- Guard clauses at the top of functions

```typescript
✅ Good:
function processUser(user: User | null): string {
  if (!user) {
    return 'No user';
  }

  if (user.isBlocked) {
    return 'User is blocked';
  }

  return `Hello, ${user.name}!`;
}

❌ Bad:
function processUser(user: User | null): string {
  if (user) {
    if (!user.isBlocked) {
      return `Hello, ${user.name}!`;
    } else {
      return 'User is blocked';
    }
  } else {
    return 'No user';
  }
}
```

### DRY (Don't Repeat Yourself)

- Extract repeated code into functions
- Use constants for repeated values

```typescript
✅ Good:
const API_BASE_URL = 'http://localhost:1234';

async function makeRequest(endpoint: string, data: any): Promise<Response> {
  return fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// Usage
await makeRequest('/generate', { prompt });
await makeRequest('/edit', { code, instruction });

❌ Bad:
async function generate(prompt: string): Promise<Response> {
  return fetch('http://localhost:1234/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
}

async function edit(code: string, instruction: string): Promise<Response> {
  return fetch('http://localhost:1234/edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, instruction }),
  });
}
```

### Immutability

- Prefer immutable operations
- Use spread operator for objects/arrays

```typescript
✅ Good:
const user = { name: 'John', age: 30 };
const updatedUser = { ...user, age: 31 };

const items = [1, 2, 3];
const newItems = [...items, 4];

❌ Bad:
const user = { name: 'John', age: 30 };
user.age = 31;

const items = [1, 2, 3];
items.push(4);
```

---

## Linting and Formatting

We use ESLint and Prettier for code quality:

- **ESLint**: Linting and code quality checks
- **Prettier**: Code formatting

Run locally:
```bash
npm run lint
npm run format
```

Both tools will automatically run on commit hooks.

---

**Follow these guidelines to keep the codebase clean, readable, and maintainable! 🎨**
