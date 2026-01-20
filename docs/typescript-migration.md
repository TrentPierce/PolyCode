# TypeScript Migration Guide

## Overview

This guide walks you through the process of migrating PolyCode IDE from JavaScript/JSX to TypeScript/TSX. TypeScript provides:
- **Type Safety**: Catch errors at compile-time instead of runtime
- **Better IDE Support**: Enhanced IntelliSense, autocompletion, and refactoring
- **Improved Maintainability**: Self-documenting code through type annotations
- **Early Bug Detection**: Catch common mistakes before they reach production

## Prerequisites

Ensure you have installed all TypeScript dependencies:
```bash
npm install --save-dev typescript @types/node @types/react @types/react-dom
npm install --save-dev ts-loader @babel/preset-typescript fork-ts-checker-webpack-plugin
```

## Migration Status

- [x] TypeScript configured (`tsconfig.json`)
- [x] Webpack builds TypeScript
- [x] Type checking in build process
- [ ] Core files migrated (~20% complete)
- [ ] All components migrated
- [ ] All utility files migrated
- [ ] All tests migrated

## Step-by-Step Migration Guide

### 1. Understanding the TypeScript Configuration

The `tsconfig.json` is configured with:
- **Strict mode enabled** for maximum type safety
- **ES2020 target** for modern JavaScript features
- **React JSX transform** for seamless React integration
- **Source maps** for debugging
- **Declaration files** for better editor support

### 2. Migrating a JavaScript File to TypeScript

#### Step 2.1: Rename the File
```bash
# Rename .js to .ts for regular files
mv src/main/file.js src/main/file.ts

# Rename .jsx to .tsx for React components
mv src/renderer/components/File.jsx src/renderer/components/File.tsx
```

#### Step 2.2: Add Type Annotations to Functions

**Before (JavaScript):**
```javascript
function add(a, b) {
  return a + b;
}
```

**After (TypeScript):**
```typescript
function add(a: number, b: number): number {
  return a + b;
}
```

#### Step 2.3: Type React Components

**Before (JSX):**
```javascript
function Editor({ filePath, content, onSave }) {
  const [value, setValue] = useState('');

  return <div>{value}</div>;
}
```

**After (TSX):**
```typescript
interface EditorProps {
  filePath: string;
  content: string;
  onSave: (path: string, content: string) => void;
}

const Editor: React.FC<EditorProps> = ({ filePath, content, onSave }) => {
  const [value, setValue] = useState<string>('');

  return <div>{value}</div>;
};
```

### 3. Common Type Patterns

#### 3.1 React Hooks with Types

**useState:**
```typescript
const [count, setCount] = useState<number>(0);
const [items, setItems] = useState<ItemType[]>([]);
const [user, setUser] = useState<User | null>(null);
```

**useEffect:**
```typescript
useEffect(() => {
  const fetchData = async () => {
    const result = await api.getData();
    setData(result);
  };

  fetchData();
}, []); // Empty dependency array: runs once on mount
```

**useRef:**
```typescript
const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
const timerRef = useRef<NodeJS.Timeout | null>(null);
```

**useCallback:**
```typescript
const handleSave = useCallback(
  (content: string) => {
    onSave(filePath, content);
  },
  [filePath, onSave]
);
```

#### 3.2 Event Handlers

```typescript
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  // Handle click
};

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // Handle form submission
};
```

#### 3.3 IPC Handlers (Electron Main Process)

```typescript
import { ipcMain, IpcMainInvokeEvent } from 'electron';

ipcMain.handle('generate-code', async (
  event: IpcMainInvokeEvent,
  { prompt, context }: { prompt: string; context?: string }
): Promise<{ success: boolean; data?: CodeGenerationResult; error?: string }> => {
  try {
    const result = await orchestrator.generateCode(prompt, context);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});
```

#### 3.4 API Response Types

```typescript
interface GenerateResult {
  code: string;
  isMultiFile: boolean;
  files?: Record<string, string>;
  model: string;
  score: number;
  deliberation?: DeliberationData;
}

interface DeliberationData {
  rounds: number;
  totalGenerations: number;
  totalEvaluations: number;
}
```

#### 3.5 Props Interfaces for React Components

```typescript
interface EditorProps {
  filePath: string;
  content: string;
  language: string;
  previousContent?: string;
  onSave: (path: string, content: string) => void;
  onContentChange?: (content: string) => void;
  onRun?: (code: string) => void;
  isDirty: boolean;
  onDirtyChange: (isDirty: boolean) => void;
}

interface AIPanelProps {
  activeFile: string | null;
  code: string;
  language: string;
  models: string[];
  isConnected: boolean;
  files?: Record<string, string>;
  onCodeGenerated: (result: GenerateResult) => void;
  onDeliberationUpdate?: (messages: DeliberationMessage[]) => void;
}
```

### 4. Troubleshooting Common Type Errors

#### Error: "Property 'X' does not exist on type 'Y'"

**Solution 1:** Type assertion (use sparingly):
```typescript
const data = someValue as ExpectedType;
```

**Solution 2:** Proper interface:
```typescript
interface ExpectedType {
  x: string;
  y: number;
}
```

**Solution 3:** Index signature (when object structure is dynamic):
```typescript
const data: Record<string, unknown> = someValue;
```

#### Error: "Argument of type 'any' is not assignable to parameter"

**Solution:** Define the type:
```typescript
// Bad
function process(data: any) { }

// Good
interface Data {
  id: string;
  value: number;
}
function process(data: Data) { }
```

#### Error: "Object is possibly 'null' or 'undefined'"

**Solution 1:** Non-null assertion (only when you're certain):
```typescript
const value = potentiallyNull!.someProperty;
```

**Solution 2:** Optional chaining:
```typescript
const value = potentiallyNull?.someProperty;
```

**Solution 3:** Null check:
```typescript
if (potentiallyNull) {
  const value = potentiallyNull.someProperty;
}
```

#### Error: "Cannot find module" or "Could not find declaration file"

**Solution:** Install @types package:
```bash
npm install --save-dev @types/package-name
```

#### Error: "Type 'X' is not assignable to type 'Y'"

**Solution:** Check your types are compatible:
```typescript
// Ensure the interface matches the actual data structure
interface Expected {
  name: string;
  age: number;
}

// Use Partial if some fields are optional
function update(data: Partial<Expected>) { }
```

### 5. Best Practices

1. **Prefer Interfaces over Type Aliases** for object shapes
2. **Use strict mode** to catch more errors
3. **Avoid 'any' type** - use `unknown` or proper types instead
4. **Document types with comments** for complex structures
5. **Use utility types** like `Partial<T>`, `Pick<T>`, `Omit<T>`
6. **Keep components small** - easier to type and maintain
7. **Type props explicitly** even with React.FC for clarity
8. **Use readonly** for immutable arrays/objects

### 6. Migration Checklist

For each file you migrate:

- [ ] Rename file extension (.js → .ts, .jsx → .tsx)
- [ ] Add type annotations to all function parameters
- [ ] Add return type annotations to functions
- [ ] Create interfaces for component props
- [ ] Type all useState hooks
- [ ] Type all useRef hooks
- [ ] Type all useCallback and useMemo dependencies
- [ ] Type event handlers
- [ ] Fix import/require statements
- [ ] Run `npm run build` to check for type errors
- [ ] Test the application still works

### 7. Running Type Checks

```bash
# Type check all files
npx tsc --noEmit

# Type check with watch mode
npx tsc --noEmit --watch

# Build with type checking (webpack will do this automatically)
npm run build:renderer
```

### 8. Advanced Tips

#### Using Generic Types
```typescript
interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  // Implementation
}
```

#### Union Types
```typescript
type Status = 'loading' | 'success' | 'error';
type FileOrFolder = File | Folder;
```

#### Discriminated Unions
```typescript
interface SuccessResponse {
  status: 'success';
  data: string;
}

interface ErrorResponse {
  status: 'error';
  error: string;
}

type Response = SuccessResponse | ErrorResponse;

function handleResponse(response: Response) {
  if (response.status === 'success') {
    // TypeScript knows response.data exists here
    console.log(response.data);
  } else {
    // TypeScript knows response.error exists here
    console.error(response.error);
  }
}
```

## Progress Tracking

### Migrated Files (3/15 = 20%)

1. ✅ `src/main/main.ts` - Main Electron process
2. ✅ `src/renderer/components/Editor.tsx` - Code editor component
3. ✅ `src/renderer/components/AIPanel.tsx` - AI panel component

### Files Still to Migrate

- `src/renderer/app.tsx`
- `src/renderer/components/ProjectPanel.tsx`
- `src/renderer/components/Settings.tsx`
- `src/renderer/components/SaveDialog.tsx`
- `src/renderer/components/Welcome.tsx`
- `src/renderer/utils/monaco-config.ts`
- `src/renderer/utils/shortcuts.ts`
- `src/main/core/*.ts` (all core modules)
- `src/main/preload.ts`

## Notes

- Use `any` as a temporary fix if stuck on complex types, but document it
- Run tests after migrating each file to ensure functionality is preserved
- Check the console for type errors during development
- Incremental migration is fine - you can migrate file by file
- The build process will fail if there are type errors (strict mode)

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Electron TypeScript Starter](https://www.electronjs.org/docs/latest/tutorial/typescript)
- [Monaco Editor TypeScript API](https://microsoft.github.io/monaco-editor/api/index.html)
