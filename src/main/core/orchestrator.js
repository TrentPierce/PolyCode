const { LMStudioClient } = require('./lmstudio-client');
const { EnhancedCodeRubric } = require('./rubric');
const { LLMEvaluator } = require('./llm-evaluator');
const { detectLanguage } = require('../utils/helpers');

/**
 * @typedef {Object} GenerationResult
 * @property {string} code - Generated code
 * @property {Object<string, string>} files - Map of filenames to file contents (for multi-file projects)
 * @property {boolean} isMultiFile - Whether this is a multi-file project
 * @property {string} model - The model that generated the best code
 * @property {number} score - Quality score (0-10)
 * @property {Array<Object>} allGenerations - All model generations with scores
 * @property {Object} deliberation - Deliberation metadata
 * @property {number} deliberation.rounds - Number of deliberation rounds
 * @property {number} deliberation.totalGenerations - Total generations attempted
 * @property {number} deliberation.totalEvaluations - Total evaluations performed
 * @property {Array<Object>} deliberationData - Detailed deliberation messages
 */

/**
 * @typedef {Object} DeliberationMessage
 * @property {string} type - Message type ('deliberation', 'consensus', 'generation', 'evaluation', 'file-edit')
 * @property {string} model - Model identifier
 * @property {string} content - Message content
 * @property {string} phase - Current phase (e.g., 'Deliberation Round 1', 'Consensus')
 * @property {string} [fileName] - Filename for file-edit messages
 * @property {string} [operation] - Operation type ('created', 'modified', 'deleted')
 * @property {Array<Object>} [diff] - Diff information for file edits
 */

/**
 * @typedef {Object} ModelConfig
 * @property {Array<string>} models - List of model IDs to use
 * @property {Array<string>} personas - List of persona names to assign
 */

/**
 * PolyCouncil-Inspired Orchestrator
 *
 * Coordinates multiple LLMs with rubric-based scoring and weighted voting.
 * Implements a multi-model deliberation architecture where models discuss,
 * reach consensus, generate code, and cross-evaluate each other's work.
 *
 * Architecture:
 * 1. Deliberation: Models discuss the project and decide on approach (sequential)
 * 2. Consensus: Models agree on the best approach (parallel)
 * 3. Code Generation: Models generate code based on consensus (parallel)
 * 4. Cross-evaluation: Models evaluate each other's code (parallel)
 * 5. Aggregation: Scores are aggregated and best code is selected
 *
 * Features:
 * - Response caching via LMStudioClient for performance
 * - Multi-file project support
 * - Real-time progress updates via onProgress callback
 * - Diff tracking for code changes
 * - Configurable model selection
 *
 * @example
 * ```javascript
 * const orchestrator = new PolyCouncilOrchestrator('http://localhost:1234');
 * await orchestrator.initialize(['model1', 'model2']);
 *
 * const result = await orchestrator.generateCode(
 *   'Create a React todo app',
 *   'current code context',
 *   null,
 *   (update) => console.log(update.phase, update.content)
 * );
 * console.log(result.code, result.score);
 * ```
 *
 * @class
 */
class PolyCouncilOrchestrator {
  /**
   * Initialize the orchestrator with LMStudio connection
   *
   * @param {string} baseURL - Base URL for LMStudio API (default: 'http://localhost:1234')
   * @example
   * ```javascript
   * const orchestrator = new PolyCouncilOrchestrator('http://localhost:1234');
   * ```
   */
  constructor(baseURL = 'http://localhost:1234') {
    this.lmClient = new LMStudioClient(baseURL);
    this.rubric = new EnhancedCodeRubric();
    this.llmEvaluator = new LLMEvaluator(baseURL);
    this.models = [];
    this.modelConfigs = {};
    this.personas = {
      architect: 'You are a senior software architect. Focus on code structure, design patterns, and scalability.',
      engineer: 'You are a practical software engineer. Focus on functionality, correctness, and maintainability.',
      reviewer: 'You are a code reviewer. Focus on code quality, best practices, and potential issues.',
      optimizer: 'You are a performance engineer. Focus on efficiency, optimization, and resource usage.'
    };
  }

  /**
   * Update the LMStudio URL and reinitialize the client
   *
   * @async
   * @param {string} baseURL - New base URL for LMStudio API
   * @returns {Promise<Object>} Result object with success status
   * @returns {boolean} return.success - Whether update was successful
   * @returns {string} [return.error] - Error message if failed
   * @example
   * ```javascript
   * const result = await orchestrator.updateBaseURL('http://localhost:5678');
   * if (result.success) {
   *   console.log('Updated successfully');
   * }
   * ```
   */
  async updateBaseURL(baseURL) {
    this.lmClient = new LMStudioClient(baseURL);
    // Reinitialize to test connection
    try {
      await this.initialize();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Set cache configuration
   * @param {Object} config - Cache configuration
   */
  setCacheConfig(config) {
    // Cache is managed in LMStudioClient, no direct method here
    // This method is called via settings through orchestrator re-initialization
    console.log('Cache configuration update requested:', config);
  }

  /**
   * Initialize and configure available models
   * @param {Array} selectedModels - Optional array of model IDs from settings
   */
  async initialize(selectedModels = []) {
    try {
      const connection = await this.lmClient.checkConnection();
      if (!connection.connected) {
        throw new Error('LMStudio is not running or not accessible');
      }

      const availableModels = await this.lmClient.getModels();
      this.models = availableModels.map(m => m.id);

      // Only configure models if explicitly provided (from settings)
      // Do NOT auto-select models - require explicit user selection
      if (selectedModels && selectedModels.length > 0) {
        // Filter to only use models that are actually available
        const validModels = selectedModels.filter(model => this.models.includes(model));
        if (validModels.length > 0) {
          this.modelConfigs = {
            models: validModels,
            personas: Object.keys(this.personas).slice(0, validModels.length)
          };
        } else {
          // No valid models from selection, clear config
          this.modelConfigs = { models: [], personas: [] };
        }
      } else {
        // No models selected - require user to select in settings
        this.modelConfigs = { models: [], personas: [] };
      }

      return { success: true, models: this.models };
    } catch (error) {
      console.error('Orchestrator initialization failed:', error);
      throw error;
    }
  }

  /**
   * Configure which models and personas to use
   * Only uses explicitly provided models - no auto-selection
   */
  async configureModels(config) {
    // Validate that configured models exist
    const validModels = (config.models || []).filter(model => this.models.includes(model));
    
    // Only use explicitly selected models - no fallback to auto-selection
    if (validModels.length > 0) {
      this.modelConfigs = {
        models: validModels,
        personas: config.personas || Object.keys(this.personas).slice(0, validModels.length)
      };
    } else {
      // No valid models - clear config (user must select models in settings)
      this.modelConfigs = { models: [], personas: [] };
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels() {
    if (this.models.length === 0) {
      await this.initialize();
    }
    return this.models;
  }

  /**
   * Calculate line-by-line diff between two code strings
   */
  calculateDiff(oldCode, newCode) {
    if (!oldCode) oldCode = '';
    if (!newCode) newCode = '';
    
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    const diff = [];
    
    // Simple line-by-line comparison
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      
      if (oldLine === '' && newLine !== '') {
        // Added line
        diff.push({ type: 'added', line: i + 1, content: newLine });
      } else if (oldLine !== '' && newLine === '') {
        // Deleted line
        diff.push({ type: 'deleted', line: i + 1, content: oldLine });
      } else if (oldLine !== newLine) {
        // Modified line
        diff.push({ type: 'modified', line: i + 1, oldContent: oldLine, newContent: newLine });
      }
    }
    
    return diff;
  }

  /**
   * Generate code using multi-model deliberation
   * Models discuss the project together, then collaborate to generate the best code
   * @param {string} prompt - User's request
   * @param {string} context - Current code context (existing files/code)
   * @param {string} language - Target language (optional, models decide if null)
   * @param {Function} onProgress - Optional callback for real-time updates (message, phase)
   * @param {Object} existingFiles - Optional object with existing file contents { filename: content }
   */
  async generateCode(prompt, context = '', language = null, onProgress = null, existingFiles = {}) {
    if (this.models.length === 0) {
      await this.initialize();
    }

    // Use ONLY configured models from settings - no fallback
    let modelsToUse = this.modelConfigs.models || [];
    // Filter to only use models that are actually available
    modelsToUse = modelsToUse.filter(model => this.models.includes(model));
    
    if (modelsToUse.length === 0) {
      throw new Error('No models available. Please select models in Settings.');
    }
    
    // Ensure context includes current code if provided
    const fullContext = context ? `Current code/files:\n${context}\n\n` : '';

    // Phase 1: Deliberation - Models discuss the project and decide approach (OPTIMIZED: Parallel execution)
    const deliberationResults = [];

    // Sequential deliberation (each model builds on previous) - cannot be fully parallel
    // But we can still optimize by reducing latency between requests
    for (let i = 0; i < modelsToUse.length; i++) {
      const model = modelsToUse[i];
      const otherModels = modelsToUse.filter(m => m !== model);
      const deliberationPrompt = this.buildDeliberationPrompt(prompt, fullContext, otherModels, deliberationResults);
      
      // Send progress update
      if (onProgress) {
        onProgress({
          type: 'deliberation',
          model: model,
          content: `Starting deliberation round ${i + 1}...`,
          phase: `Deliberation Round ${i + 1}`
        });
      }
      
      try {
        const result = await this.lmClient.generateCompletion(model, deliberationPrompt, {
          temperature: 0.7,
          max_tokens: 1500
        });
        
        deliberationResults.push({
          model,
          deliberation: result.text,
          round: i + 1
        });
        
        // Send real-time update with actual deliberation content
        if (onProgress) {
          onProgress({
            type: 'deliberation',
            model: model,
            content: result.text,
            phase: `Deliberation Round ${i + 1}`
          });
        }
      } catch (error) {
        console.error(`Deliberation failed for model ${model}:`, error);
        if (onProgress) {
          onProgress({
            type: 'deliberation',
            model: model,
            content: `Error: ${error.message}`,
            phase: `Deliberation Round ${i + 1} - Failed`
          });
        }
      }
    }
    
    // Phase 2: Consensus - Models agree on the best approach (OPTIMIZED: Parallel execution)
    const consensusPrompt = this.buildConsensusPrompt(prompt, fullContext, deliberationResults);
    const consensusResults = await Promise.all(
      modelsToUse.map(async (model) => {
        // Send progress update
        if (onProgress) {
          onProgress({
            type: 'consensus',
            model: model,
            content: `Reaching consensus...`,
            phase: 'Consensus'
          });
        }

        try {
          const result = await this.lmClient.generateCompletion(model, consensusPrompt, {
            temperature: 0.5,
            max_tokens: 1000
          });
          
          // Send real-time update with consensus content
          if (onProgress) {
            onProgress({
              type: 'consensus',
              model: model,
              content: result.text,
              phase: 'Consensus'
            });
          }

          return {
            model,
            consensus: result.text
          };
        } catch (error) {
          console.error(`Consensus failed for model ${model}:`, error);
          if (onProgress) {
            onProgress({
              type: 'consensus',
              model: model,
              content: `Error: ${error.message}`,
              phase: 'Consensus - Failed'
            });
          }
          // Return null for failed requests to handle in aggregation
          return null;
        }
      })
    );

    // Filter out failed consensus results
    const validConsensusResults = consensusResults.filter(result => result !== null);

    // Phase 3: Code Generation - Models generate code based on their discussion (OPTIMIZED: Parallel execution)
    const generations = await Promise.all(
      modelsToUse.map(async (model) => {
        const generationPrompt = this.buildGenerationPrompt(prompt, fullContext, deliberationResults, validConsensusResults);

        // Send progress update
        if (onProgress) {
          onProgress({
            type: 'generation',
            model: model,
            content: `Generating code...`,
            phase: 'Code Generation'
          });
        }

        try {
          const result = await this.lmClient.generateCompletion(model, generationPrompt, {
            temperature: 0.3,
            max_tokens: 4000,
            useCache: true,
            cacheTTL: 60 * 60 * 1000 // 1 hour TTL
          });

          // Extract code from response (remove markdown code blocks if present)
          let code = result.text.trim();
          if (code.startsWith('```')) {
            const lines = code.split('\n');
            lines.shift(); // Remove first ``` line
            const lastLine = lines[lines.length - 1];
            if (lastLine.trim() === '```') {
              lines.pop(); // Remove last ``` line
            }
            code = lines.join('\n');
          }

          // Send real-time update
          if (onProgress) {
            onProgress({
              type: 'generation',
              model: model,
              content: `Generated ${code.length} characters of code`,
              phase: 'Code Generation'
            });
          }

          return {
            model,
            code: code,
            usage: result.usage
          };
        } catch (error) {
          console.error(`Generation failed for model ${model}:`, error);
          if (onProgress) {
            onProgress({
              type: 'generation',
              model: model,
              content: `Error: ${error.message}`,
              phase: 'Code Generation - Failed'
            });
          }
          // Return null for failed requests
          return null;
        }
      })
    );

    // Filter out failed generations
    const validGenerations = generations.filter(gen => gen !== null);

    if (validGenerations.length === 0) {
      throw new Error('All model generations failed');
    }

    // Phase 4: Cross-evaluation - Models evaluate each other's code (OPTIMIZED: Parallel evaluation)
    const evaluations = [];

    // Create all evaluation tasks
    const evaluationTasks = [];
    for (const generation of validGenerations) {
      for (const evaluatorModel of modelsToUse) {
        if (evaluatorModel === generation.model) continue; // Don't self-evaluate

        // Create evaluation task
        const task = (async () => {
          // Send progress update
          if (onProgress) {
            onProgress({
              type: 'evaluation',
              model: evaluatorModel,
              content: `Evaluating code from ${generation.model}...`,
              phase: 'Evaluation'
            });
          }

          try {
            const score = await this.evaluateGeneration(
              evaluatorModel,
              generation.code,
              prompt,
              null // Let evaluator determine language
            );

            // Send real-time update
            if (onProgress) {
              onProgress({
                type: 'evaluation',
                model: evaluatorModel,
                content: `Scored ${generation.model}'s code: ${score.toFixed(2)}/10`,
                phase: 'Evaluation'
              });
            }

            return {
              generation,
              evaluator: evaluatorModel,
              score
            };
          } catch (error) {
            console.error(`Evaluation failed for model ${evaluatorModel}:`, error);
            if (onProgress) {
              onProgress({
                type: 'evaluation',
                model: evaluatorModel,
                content: `Error evaluating: ${error.message}`,
                phase: 'Evaluation - Failed'
              });
            }
            // Return null for failed evaluations
            return null;
          }
        })();

        evaluationTasks.push(task);
      }
    }

    // Execute all evaluations in parallel with controlled concurrency
    const evaluationResults = await Promise.all(
      evaluationTasks.map(async (task, index) => {
        // Add small delay between batches to avoid overwhelming LMStudio
        if (index > 0 && index % 4 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        return await task();
      })
    );

    // Filter out failed evaluations
    evaluationResults.push(...evaluationResults.filter(result => result !== null));
    
    // Phase 5: Aggregate scores and select best
    const aggregatedScores = this.aggregateScores(validGenerations, evaluationResults);
    const bestGeneration = this.selectBestGeneration(validGenerations, aggregatedScores);

    // Phase 6: Parse multiple files if this is a web project
    const parsedFiles = this.parseMultipleFiles(bestGeneration.code);
    const isMultiFile = Object.keys(parsedFiles).length > 1;
    
    // Send file edit updates for each file (real-time diff display)
    if (onProgress) {
      for (const [fileName, newContent] of Object.entries(parsedFiles)) {
        const oldContent = existingFiles[fileName] || '';
        const diff = this.calculateDiff(oldContent, newContent);
        
        if (diff.length > 0 || !oldContent) {
          // Determine file operation type
          let operation = 'modified';
          if (!oldContent && newContent) {
            operation = 'created';
          } else if (oldContent && !newContent) {
            operation = 'deleted';
          }
          
          onProgress({
            type: 'file-edit',
            model: bestGeneration.model,
            fileName: fileName,
            operation: operation,
            diff: diff,
            content: newContent,
            phase: 'Code Generation'
          });
        }
      }
      
      // If single file (not multi-file), send edit update
      if (!isMultiFile && bestGeneration.code) {
        const oldContent = context || '';
        const diff = this.calculateDiff(oldContent, bestGeneration.code);
        
        if (diff.length > 0 || !oldContent) {
          onProgress({
            type: 'file-edit',
            model: bestGeneration.model,
            fileName: 'generated code',
            operation: oldContent ? 'modified' : 'created',
            diff: diff,
            content: bestGeneration.code,
            phase: 'Code Generation'
          });
        }
      }
    }

    // Build deliberation data for UI display
    const deliberationData = [];
    
    // Add deliberation phase messages
    deliberationResults.forEach((delib, idx) => {
      deliberationData.push({
        type: 'deliberation',
        model: delib.model,
        content: delib.deliberation,
        phase: `Deliberation Round ${delib.round}`
      });
    });
    
    // Add consensus phase messages
    consensusResults.forEach((consensus) => {
      deliberationData.push({
        type: 'consensus',
        model: consensus.model,
        content: consensus.consensus,
        phase: 'Consensus'
      });
    });
    
    // Add generation phase messages
    generations.forEach((gen) => {
      deliberationData.push({
        type: 'generation',
        model: gen.model,
        content: `Generated code (${gen.code.length} characters)`,
        phase: 'Code Generation'
      });
    });
    
    // Add evaluation summary
    if (evaluations.length > 0) {
      const avgScore = Object.values(aggregatedScores).reduce((a, b) => a + b, 0) / Object.keys(aggregatedScores).length;
      deliberationData.push({
        type: 'evaluation',
        model: 'System',
        content: `Evaluation complete. Average score: ${avgScore.toFixed(2)}/10. Best model: ${bestGeneration.model}`,
        phase: 'Evaluation'
      });
    }

    return {
      code: bestGeneration.code, // Keep original for single-file compatibility
      files: parsedFiles, // New: multiple files
      isMultiFile: isMultiFile,
      model: bestGeneration.model,
      score: aggregatedScores[bestGeneration.model] || 0,
      allGenerations: generations.map(g => ({
        model: g.model,
        score: aggregatedScores[g.model] || 0
      })),
      deliberation: {
        rounds: deliberationResults.length,
        totalGenerations: generations.length,
        totalEvaluations: evaluations.length
      },
      deliberationData: deliberationData // New: detailed deliberation messages
    };
  }

  /**
   * Build deliberation prompt for models to discuss the project
   */
  buildDeliberationPrompt(prompt, context, otherModels, previousDeliberations) {
    let deliberationText = `You are part of a team of AI developers working together to build a project.\n\n`;
    deliberationText += `User's Request: ${prompt}\n\n`;
    
    if (context && context.trim()) {
      deliberationText += `Current Code Context:\n${context}\n\n`;
      deliberationText += `IMPORTANT: Review the existing code above before making any changes. Understand the current implementation, structure, and patterns before proposing modifications.\n\n`;
    }
    
    if (previousDeliberations.length > 0) {
      deliberationText += `Previous team discussions:\n`;
      previousDeliberations.forEach((delib, idx) => {
        deliberationText += `\n${delib.model}: ${delib.deliberation}\n`;
      });
      deliberationText += `\n`;
    } else {
      deliberationText += `You are the first to analyze this project. `;
    }
    
    deliberationText += `Your task: Analyze this project request and discuss:\n`;
    deliberationText += `1. What type of project is this? (web app, website, CLI tool, API, library, etc.)\n`;
    deliberationText += `2. What technologies, frameworks, and programming languages would be best for this project?\n`;
    deliberationText += `3. What is the best architecture, structure, and approach?\n`;
    deliberationText += `4. What are the key requirements, features, and components needed?\n`;
    deliberationText += `5. What file structure and organization should we use?\n\n`;
    deliberationText += `Provide your detailed analysis and recommendations. Be specific about technology choices, architecture, and implementation approach.`;
    
    return deliberationText;
  }

  /**
   * Build consensus prompt for models to agree on approach
   */
  buildConsensusPrompt(prompt, context, deliberationResults) {
    let consensusText = `Based on the team's discussion, we need to reach consensus on the best approach.\n\n`;
    consensusText += `User's Request: ${prompt}\n\n`;
    
    if (context && context.trim()) {
      consensusText += `Current Code Context:\n${context}\n\n`;
      consensusText += `IMPORTANT: Consider the existing code when reaching consensus. Ensure your approach is compatible with the current implementation.\n\n`;
    }
    
    consensusText += `Team Discussion Summary:\n`;
    deliberationResults.forEach((delib, idx) => {
      consensusText += `\n${delib.model}: ${delib.deliberation}\n`;
    });
    
    consensusText += `\n\nYour task: Synthesize the discussion and provide a consensus on:\n`;
    consensusText += `1. Final technology stack and languages\n`;
    consensusText += `2. Architecture and structure\n`;
    consensusText += `3. Implementation approach\n`;
    consensusText += `4. File structure and organization\n\n`;
    consensusText += `Provide a clear, actionable consensus that the team can use to generate code.`;
    
    return consensusText;
  }

  /**
   * Build final generation prompt based on deliberation and consensus
   */
  buildGenerationPrompt(prompt, context, deliberationResults, consensusResults) {
    let genText = `Generate the complete, production-ready code for this project.\n\n`;
    genText += `User's Request: ${prompt}\n\n`;
    
    if (context && context.trim()) {
      genText += `Current Code Context:\n${context}\n\n`;
      genText += `IMPORTANT: Review the existing code above. If you are modifying existing code, preserve the structure and patterns. Only change what is necessary based on the user's request.\n\n`;
    }
    
    genText += `Team Consensus:\n`;
    consensusResults.forEach(consensus => {
      genText += `${consensus.model}: ${consensus.consensus}\n\n`;
    });
    
    genText += `Requirements:\n`;
    genText += `- Based on the team's consensus, determine the appropriate file structure and organization\n`;
    genText += `- Generate all necessary files for the project\n`;
    genText += `- If multiple files are needed, format your response as follows:\n`;
    genText += `  FILE: filename.ext\n`;
    genText += `  [file content here]\n`;
    genText += `  \n`;
    genText += `  FILE: anotherfile.ext\n`;
    genText += `  [file content here]\n`;
    genText += `- If only a single file is needed, generate just that file without FILE: markers\n`;
    genText += `- Each file should be complete and production-ready\n`;
    genText += `- Follow the team's consensus on technology, language, and architecture\n`;
    genText += `- Include proper error handling\n`;
    genText += `- Use best practices for the chosen technology stack\n`;
    genText += `- Return ONLY the code, no comments, no explanations\n\n`;
    
    genText += `Code:`;
    
    return genText;
  }


  /**
   * Parse generated code to extract multiple files
   */
  parseMultipleFiles(code) {
    const files = {};
    const filePattern = /FILE:\s*([^\n]+)\n([\s\S]*?)(?=FILE:|$)/g;
    let match;
    
    while ((match = filePattern.exec(code)) !== null) {
      const fileName = match[1].trim();
      const fileContent = match[2].trim();
      if (fileName && fileContent) {
        files[fileName] = fileContent;
      }
    }
    
    // If no FILE: markers found, treat as single file
    if (Object.keys(files).length === 0) {
      // Return as single file with appropriate default name based on content
      const detectedLang = this.detectLanguage(code);
      const defaultNames = {
        python: 'main.py',
        javascript: 'script.js',
        typescript: 'script.ts',
        java: 'Main.java',
        cpp: 'main.cpp',
        c: 'main.c',
        html: 'index.html',
        css: 'style.css'
      };
      const defaultName = defaultNames[detectedLang] || 'main.txt';
      files[defaultName] = code;
    }
    
    return files;
  }


  /**
   * Edit existing code using multi-model deliberation
   */
  async editCode(code, instruction, context = '', onProgress = null) {
    // Include the current code as context so models can review it before editing
    const fullContext = `Current code to edit:\n${code}\n\n${context ? `Additional context: ${context}\n` : ''}`;
    const prompt = `Edit the code according to this instruction: ${instruction}\n\nIMPORTANT: Review the current code above carefully. Only make the changes requested. Preserve existing functionality unless explicitly asked to change it.`;
    // Detect language from existing code, but let models deliberate on the edit approach
    const detectedLang = this.detectLanguage(code);
    // Pass existing code as existingFiles so diff can be calculated
    const existingFiles = { 'current file': code };
    return await this.generateCode(prompt, fullContext, detectedLang, onProgress, existingFiles);
  }

  /**
   * Analyze code quality using LLM evaluator
   */
  async analyzeCode(code, language = 'javascript') {
    if (this.models.length === 0) {
      await this.initialize();
    }

    // Use LLM evaluator for detailed scoring
    const evaluation = await this.llmEvaluator.evaluateCode(code, language);

    // Use enhanced rubric to calculate weighted score
    const rubricResult = this.rubric.evaluateCode(evaluation.scores, {
      codeHash: evaluation.codeHash,
      language
    });

    // Optional: Get qualitative analysis from models
    let analyses = [];
    const modelsToUse = (this.modelConfigs.models || []).filter(model => this.models.includes(model));

    if (modelsToUse.length > 0) {
      for (const model of modelsToUse) {
        try {
          const analysisPrompt = `Provide a brief qualitative analysis of this ${language} code. Focus on strengths and weaknesses:\n\n${code}`;
          const result = await this.lmClient.generateCompletion(model, analysisPrompt, {
            temperature: 0.5,
            max_tokens: 500,
            useCache: true
          });
          analyses.push({
            model,
            analysis: result.text
          });
        } catch (error) {
          console.error(`Analysis failed for model ${model}:`, error);
        }
      }
    }

    // Get quality grade
    const grade = this.rubric.getQualityGrade(rubricResult.weightedScore);

    return {
      evaluation: evaluation.scores,
      rubricScores: rubricResult.scores,
      weightedScore: rubricResult.weightedScore,
      grade: grade.label,
      gradeColor: grade.color,
      criteria: rubricResult.criteria,
      analyses,
      fromCache: evaluation.fromCache || false,
      recommendation: rubricResult.weightedScore >= 7 ? 'high' : rubricResult.weightedScore >= 5 ? 'medium' : 'low'
    };
  }

  /**
   * Build prompt with persona assignment (kept for backward compatibility)
   */
  buildPersonaPrompt(prompt, persona, language, context) {
    const personaDescription = this.personas[persona] || this.personas.engineer;
    return `${personaDescription}\n\nLanguage: ${language}\n\n${context ? `Context: ${context}\n\n` : ''}Task: ${prompt}`;
  }

  /**
   * Evaluate a code generation using LLM evaluator
   */
  async evaluateGeneration(evaluatorModel, code, originalPrompt, language) {
    try {
      // Detect language if not provided
      const detectedLang = language || this.detectLanguage(code);

      // Use LLM evaluator for detailed scoring
      const evaluation = await this.llmEvaluator.evaluateCode(code, detectedLang, {
        prompt: originalPrompt
      });

      // Use enhanced rubric to calculate weighted score
      const rubricResult = this.rubric.evaluateCode(evaluation.scores, {
        codeHash: evaluation.codeHash,
        language: detectedLang,
        model: evaluatorModel
      });

      return rubricResult.weightedScore;
    } catch (error) {
      console.error('Evaluation failed:', error);
      return 5; // Default score
    }
  }

  /**
   * Aggregate scores from multiple evaluations using weighted voting
   */
  aggregateScores(generations, evaluations) {
    const scores = {};
    
    // Initialize scores
    for (const gen of generations) {
      scores[gen.model] = [];
    }

    // Collect all scores for each generation
    for (const evaluation of evaluations) {
      if (scores[evaluation.generation.model]) {
        scores[evaluation.generation.model].push(evaluation.score);
      }
    }

    // Calculate weighted average (could weight by evaluator model quality)
    const aggregated = {};
    for (const [model, modelScores] of Object.entries(scores)) {
      if (modelScores.length > 0) {
        aggregated[model] = modelScores.reduce((a, b) => a + b, 0) / modelScores.length;
      } else {
        aggregated[model] = 0;
      }
    }

    return aggregated;
  }

  /**
   * Select best generation based on aggregated scores
   */
  selectBestGeneration(generations, aggregatedScores) {
    let best = generations[0];
    let bestScore = aggregatedScores[best.model] || 0;

    for (const gen of generations) {
      const score = aggregatedScores[gen.model] || 0;
      if (score > bestScore) {
        best = gen;
        bestScore = score;
      }
    }

    return best;
  }

  /**
   * Detect programming language from code
   * REFACTORED: Now uses shared detectLanguage utility from helpers.js
   * This method is kept as a wrapper for backward compatibility
   */
  detectLanguage(code) {
    // Use the shared utility to avoid code duplication
    return detectLanguage(code);
  }

  /**
   * Get rubric criteria configuration
   */
  getRubricCriteria() {
    return this.rubric.getCriteria();
  }

  /**
   * Set rubric weights
   */
  setRubricWeights(weights) {
    return this.rubric.setWeights(weights);
  }

  /**
   * Reset rubric weights to defaults
   */
  resetRubricWeights() {
    return this.rubric.resetWeights();
  }

  /**
   * Get evaluation history
   */
  getEvaluationHistory(limit = 50) {
    return this.rubric.getHistory(limit);
  }

  /**
   * Get average scores from history
   */
  getAverageScores() {
    return this.rubric.getAverageScores();
  }

  /**
   * Get score trend from history
   */
  getScoreTrend(windowSize = 10) {
    return this.rubric.getScoreTrend(windowSize);
  }

  /**
   * Export rubric configuration
   */
  exportRubric() {
    return this.rubric.export();
  }

  /**
   * Import rubric configuration
   */
  importRubric(config) {
    return this.rubric.import(config);
  }

  /**
   * Evaluate code using LLM and return detailed results
   */
  async evaluateCode(code, language = 'javascript', options = {}) {
    const evaluation = await this.llmEvaluator.evaluateCode(code, language, options);
    const rubricResult = this.rubric.evaluateCode(evaluation.scores, {
      codeHash: evaluation.codeHash,
      language
    });

    return {
      scores: rubricResult.scores,
      weightedScore: rubricResult.weightedScore,
      criteria: rubricResult.criteria,
      grade: this.rubric.getQualityGrade(rubricResult.weightedScore),
      fromCache: evaluation.fromCache,
      timestamp: rubricResult.timestamp
    };
  }

  /**
   * Clear evaluation history
   */
  clearEvaluationHistory() {
    return this.rubric.clearHistory();
  }

  /**
   * Clear LLM evaluator cache
   */
  clearEvaluationCache() {
    return this.llmEvaluator.clearCache();
  }
}

module.exports = { PolyCouncilOrchestrator };

