# PolyCode IDE - Architecture Documentation

## Overview

PolyCode IDE implements a multi-model deliberation architecture inspired by the PolyCouncil project. This document describes the system architecture, components, and data flow.

## System Architecture

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
│  │         LMStudio Client                               │  │
│  │  - HTTP Communication                                 │  │
│  │  - Model Management                                   │  │
│  │  - OpenAI-Compatible API                              │  │
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
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              React Application                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. PolyCouncil Orchestrator (`src/main/core/orchestrator.js`)

The orchestrator is the heart of the multi-model deliberation system.

#### Key Responsibilities:
- **Parallel Generation**: Executes multiple LLMs simultaneously
- **Cross-Evaluation**: Each model evaluates other models' outputs
- **Score Aggregation**: Combines evaluation scores using weighted voting
- **Consensus Selection**: Chooses the best generation based on scores

#### Workflow:

```
1. User Request
   ↓
2. Parallel Generation (Multiple Models + Personas)
   ├─→ Model 1 (Architect Persona) → Code A
   ├─→ Model 2 (Engineer Persona) → Code B
   ├─→ Model 3 (Reviewer Persona) → Code C
   └─→ Model 4 (Optimizer Persona) → Code D
   ↓
3. Cross-Evaluation
   ├─→ Model 1 evaluates A, B, C, D
   ├─→ Model 2 evaluates A, B, C, D
   └─→ ...
   ↓
4. Score Aggregation (Weighted Voting)
   ├─→ Code A: Score 8.2
   ├─→ Code B: Score 7.8
   ├─→ Code C: Score 8.5 ← Highest
   └─→ Code D: Score 7.5
   ↓
5. Return Best Generation (Code C)
```

#### Personas:
- **Architect**: Focuses on structure, design patterns, scalability
- **Engineer**: Focuses on functionality, correctness, maintainability
- **Reviewer**: Focuses on quality, best practices, potential issues
- **Optimizer**: Focuses on efficiency, performance, resource usage

### 2. LMStudio Client (`src/main/core/lmstudio-client.js`)

Handles all communication with the local LMStudio API.

#### Features:
- OpenAI-compatible API interface
- Model discovery and management
- Connection health checking
- Code-specific prompt formatting

#### API Endpoints Used:
- `GET /v1/models` - List available models
- `POST /v1/chat/completions` - Generate completions

### 3. Code Rubric (`src/main/core/rubric.js`)

Defines evaluation criteria for code quality assessment.

#### Criteria (with weights):
1. **Correctness** (30%): Code correctness and functionality
2. **Quality** (25%): Readability and maintainability
3. **Best Practices** (20%): Language-specific best practices
4. **Completeness** (15%): Implementation completeness
5. **Efficiency** (10%): Performance considerations

#### Scoring:
- Each criterion scored 0-10
- Weighted average calculated for total score
- Currently uses heuristics (can be enhanced with LLM evaluators)

### 4. Frontend Components

#### FileExplorer (`src/renderer/components/FileExplorer.jsx`)
- File tree navigation
- File creation
- Active file highlighting

#### Editor (`src/renderer/components/Editor.jsx`)
- Monaco Editor integration
- Syntax highlighting
- Multi-language support
- Save functionality (Ctrl/Cmd+S)

#### AIPanel (`src/renderer/components/AIPanel.jsx`)
- Code generation interface
- Code editing interface
- Code analysis interface
- Results display with scores

#### StatusBar (`src/renderer/components/StatusBar.jsx`)
- Connection status
- Current language
- Active file path

## Data Flow

### Code Generation Flow

```
User Input (Prompt)
    ↓
React Component (AIPanel)
    ↓
IPC: generate-code
    ↓
Main Process: Orchestrator.generateCode()
    ↓
1. Parallel Generation
   ├─→ LMStudioClient.generateCode(model1, prompt)
   ├─→ LMStudioClient.generateCode(model2, prompt)
   └─→ LMStudioClient.generateCode(model3, prompt)
    ↓
2. Cross-Evaluation
   ├─→ Rubric.evaluateCode(code1)
   ├─→ Rubric.evaluateCode(code2)
   └─→ Rubric.evaluateCode(code3)
    ↓
3. Score Aggregation
   └─→ aggregateScores(evaluations)
    ↓
4. Best Selection
   └─→ selectBestGeneration(generations, scores)
    ↓
IPC Response
    ↓
React Component (Display Result)
```

### Code Editing Flow

```
User Input (Code + Instruction)
    ↓
React Component (AIPanel)
    ↓
IPC: edit-code
    ↓
Main Process: Orchestrator.editCode()
    ↓
Build Edit Prompt
    ↓
Same as Generation Flow (above)
    ↓
Return Edited Code
```

### Code Analysis Flow

```
User Action (Analyze Button)
    ↓
React Component (AIPanel)
    ↓
IPC: analyze-code
    ↓
Main Process: Orchestrator.analyzeCode()
    ↓
1. Parallel Analysis
   ├─→ LMStudioClient.generateCompletion(model1, analysisPrompt)
   └─→ LMStudioClient.generateCompletion(model2, analysisPrompt)
    ↓
2. Rubric Evaluation
   └─→ Rubric.evaluateCode(code)
    ↓
3. Combine Results
    ↓
Return Analysis + Scores
```

## IPC Communication

### Main → Renderer
- No direct communication (renderer initiates)

### Renderer → Main
- `generate-code`: Generate code from prompt
- `edit-code`: Edit existing code
- `analyze-code`: Analyze code quality
- `get-models`: Get available models
- `configure-models`: Configure model selection

## Configuration

### Model Configuration
Models are auto-discovered from LMStudio. Configuration allows:
- Selecting which models to use (up to 4)
- Assigning personas to models
- Customizing generation parameters

### Rubric Configuration
Edit `src/main/core/rubric.js` to:
- Adjust criterion weights
- Add/remove criteria
- Modify scoring logic

## Performance Considerations

1. **Parallel Execution**: All model calls run in parallel using `Promise.all()`
2. **Timeout Handling**: 2-minute timeout for large generations
3. **Error Handling**: Failed generations don't block others
4. **Caching**: (Future) Could cache model responses

## Security

- **Context Isolation**: Enabled in Electron
- **Node Integration**: Disabled in renderer
- **Preload Script**: Secure IPC bridge
- **Local Only**: No external API calls

## Future Enhancements

1. **LLM-Based Evaluation**: Replace heuristic scoring with LLM evaluators
2. **Consensus Generation**: Combine best parts of multiple generations
3. **Model Performance Tracking**: Track which models perform best
4. **Custom Personas**: User-defined persona configurations
5. **Multi-File Context**: Consider entire project context
6. **Incremental Generation**: Generate code in steps with feedback
7. **Code Templates**: Pre-defined code patterns

## Dependencies

### Main Process
- `electron`: Desktop framework
- `axios`: HTTP client for LMStudio

### Renderer Process
- `react`: UI framework
- `react-dom`: React DOM rendering
- `@monaco-editor/react`: Code editor
- `monaco-editor`: Editor core

### Build Tools
- `webpack`: Module bundler
- `babel`: JavaScript transpiler
- `electron-builder`: App packaging

