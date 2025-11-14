const { LMStudioClient } = require('./lmstudio-client');
const { CodeRubric } = require('./rubric');

/**
 * PolyCouncil-Inspired Orchestrator
 * Coordinates multiple LLMs with rubric-based scoring and weighted voting
 */
class PolyCouncilOrchestrator {
  constructor(baseURL = 'http://localhost:1234') {
    this.lmClient = new LMStudioClient(baseURL);
    this.rubric = new CodeRubric();
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
   * Update the LMStudio URL and reinitialize
   */
  async updateBaseURL(baseURL) {
    this.lmClient.setBaseURL(baseURL);
    // Reinitialize to test connection
    try {
      await this.initialize();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialize and configure available models
   */
  async initialize() {
    try {
      const connection = await this.lmClient.checkConnection();
      if (!connection.connected) {
        throw new Error('LMStudio is not running or not accessible');
      }

      const availableModels = await this.lmClient.getModels();
      this.models = availableModels.map(m => m.id);

      // Default configuration: use first 2-4 models if available
      if (this.models.length > 0) {
        this.modelConfigs = {
          models: this.models.slice(0, Math.min(4, this.models.length)),
          personas: Object.keys(this.personas).slice(0, Math.min(this.models.length, 4))
        };
      }

      return { success: true, models: this.models };
    } catch (error) {
      console.error('Orchestrator initialization failed:', error);
      throw error;
    }
  }

  /**
   * Configure which models and personas to use
   */
  async configureModels(config) {
    // Validate that configured models exist
    const validModels = (config.models || []).filter(model => this.models.includes(model));
    const modelsToUse = validModels.length > 0 ? validModels : this.models.slice(0, Math.min(4, this.models.length));
    
    this.modelConfigs = {
      models: modelsToUse,
      personas: config.personas || Object.keys(this.personas).slice(0, modelsToUse.length)
    };
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
   * Generate code using multi-model deliberation
   * Models discuss the project together, then collaborate to generate the best code
   */
  async generateCode(prompt, context = '', language = null) {
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

    // Phase 1: Deliberation - Models discuss the project and decide approach
    const deliberationResults = [];
    for (let i = 0; i < modelsToUse.length; i++) {
      const model = modelsToUse[i];
      const otherModels = modelsToUse.filter(m => m !== model);
      const deliberationPrompt = this.buildDeliberationPrompt(prompt, context, otherModels, deliberationResults);
      
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
      } catch (error) {
        console.error(`Deliberation failed for model ${model}:`, error);
      }
    }

    // Phase 2: Consensus - Models agree on the best approach
    const consensusPrompt = this.buildConsensusPrompt(prompt, context, deliberationResults);
    const consensusResults = [];
    for (const model of modelsToUse) {
      try {
        const result = await this.lmClient.generateCompletion(model, consensusPrompt, {
          temperature: 0.5,
          max_tokens: 1000
        });
        consensusResults.push({
          model,
          consensus: result.text
        });
      } catch (error) {
        console.error(`Consensus failed for model ${model}:`, error);
      }
    }

    // Phase 3: Code Generation - Models generate code based on their discussion
    const generations = [];
    for (const model of modelsToUse) {
      const generationPrompt = this.buildGenerationPrompt(prompt, context, deliberationResults, consensusResults);
      
      try {
        const result = await this.lmClient.generateCompletion(model, generationPrompt, {
          temperature: 0.3,
          max_tokens: 4000
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
        
        generations.push({
          model,
          code: code,
          usage: result.usage
        });
      } catch (error) {
        console.error(`Generation failed for model ${model}:`, error);
      }
    }

    if (generations.length === 0) {
      throw new Error('All model generations failed');
    }

    // Phase 4: Cross-evaluation - Models evaluate each other's code
    const evaluations = [];
    for (const generation of generations) {
      for (const evaluatorModel of modelsToUse) {
        if (evaluatorModel === generation.model) continue; // Don't self-evaluate
        
        try {
          const score = await this.evaluateGeneration(
            evaluatorModel,
            generation.code,
            prompt,
            null // Let evaluator determine language
          );
          evaluations.push({
            generation,
            evaluator: evaluatorModel,
            score
          });
        } catch (error) {
          console.error(`Evaluation failed for model ${evaluatorModel}:`, error);
        }
      }
    }

    // Phase 5: Aggregate scores and select best
    const aggregatedScores = this.aggregateScores(generations, evaluations);
    const bestGeneration = this.selectBestGeneration(generations, aggregatedScores);

    return {
      code: bestGeneration.code,
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
      }
    };
  }

  /**
   * Build deliberation prompt for models to discuss the project
   */
  buildDeliberationPrompt(prompt, context, otherModels, previousDeliberations) {
    let deliberationText = `You are part of a team of AI developers working together to build a project.\n\n`;
    deliberationText += `User's Request: ${prompt}\n\n`;
    
    if (context) {
      deliberationText += `Context:\n${context}\n\n`;
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
    
    if (context) {
      consensusText += `Context:\n${context}\n\n`;
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
    
    if (context) {
      genText += `Context:\n${context}\n\n`;
    }
    
    genText += `Team Consensus:\n`;
    consensusResults.forEach(consensus => {
      genText += `${consensus.model}: ${consensus.consensus}\n\n`;
    });
    
    genText += `Requirements:\n`;
    genText += `- Generate complete, runnable code\n`;
    genText += `- Follow the team's consensus on technology and architecture\n`;
    genText += `- Include proper error handling\n`;
    genText += `- Add meaningful comments\n`;
    genText += `- Use best practices for the chosen technology stack\n`;
    genText += `- Return ONLY the code, no explanations outside code comments\n\n`;
    genText += `Code:`;
    
    return genText;
  }

  /**
   * Edit existing code using multi-model deliberation
   */
  async editCode(code, instruction, context = '') {
    const prompt = `Edit the following code according to this instruction: ${instruction}\n\nCurrent code:\n${code}`;
    // Detect language from existing code, but let models deliberate on the edit approach
    const detectedLang = this.detectLanguage(code);
    return await this.generateCode(prompt, context, detectedLang);
  }

  /**
   * Analyze code quality
   */
  async analyzeCode(code, language = 'javascript') {
    if (this.models.length === 0) {
      await this.initialize();
    }

    // Use ONLY configured models from settings
    let modelsToUse = this.modelConfigs.models || [];
    modelsToUse = modelsToUse.filter(model => this.models.includes(model));
    
    if (modelsToUse.length === 0) {
      throw new Error('No models available. Please select models in Settings.');
    }
    
    // Sequential analysis instead of parallel
    const analyses = [];
    for (const model of modelsToUse) {
      try {
        const analysisPrompt = `Analyze the following ${language} code for quality, correctness, and best practices:\n\n${code}\n\nProvide a detailed analysis.`;
        const result = await this.lmClient.generateCompletion(model, analysisPrompt, {
          temperature: 0.5,
          max_tokens: 1000
        });
        analyses.push({
          model,
          analysis: result.text
        });
      } catch (error) {
        console.error(`Analysis failed for model ${model}:`, error);
      }
    }
    
    // Use rubric to score the code
    const rubricScores = await this.rubric.evaluateCode(code, language, '');
    const weightedScore = this.rubric.calculateWeightedScore(rubricScores);

    return {
      analyses,
      rubricScores,
      weightedScore,
      recommendation: weightedScore >= 7 ? 'high' : weightedScore >= 5 ? 'medium' : 'low'
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
   * Evaluate a code generation using rubric
   */
  async evaluateGeneration(evaluatorModel, code, originalPrompt, language) {
    try {
      // Detect language if not provided
      const detectedLang = language || this.detectLanguage(code);
      const scores = await this.rubric.evaluateCode(code, detectedLang, originalPrompt);
      return this.rubric.calculateWeightedScore(scores);
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
   */
  detectLanguage(code) {
    const patterns = {
      html: /(<!doctype|<html|<head|<body|<div|<script|<style)/i,
      css: /(@media|@import|@keyframes|background:|color:|margin:|padding:)/,
      javascript: /(function|const |let |var |=>|require\(|module\.exports)/,
      python: /(def |import |from |print\(|if __name__)/,
      java: /(public class|import java|@Override|System\.out)/,
      cpp: /(#include|using namespace|std::|int main)/,
      c: /(#include|int main|printf|malloc)/,
      typescript: /(interface |type |: string|: number|export )/
    };

    // Check HTML first (most specific)
    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(code)) {
        return lang;
      }
    }

    return 'javascript'; // Default
  }
}

module.exports = { PolyCouncilOrchestrator };

