/**
 * LLM-based Code Evaluator
 * Uses LMStudio to evaluate code quality across multiple criteria
 */
const { LMStudioClient } = require('./lmstudio-client');
const crypto = require('crypto');

class LLMEvaluator {
  constructor(baseURL = 'http://localhost:1234') {
    this.lmClient = new LMStudioClient(baseURL);
    this.evaluationCache = new Map();
    this.maxCacheSize = 100;
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Evaluate code using LLM
   * @param {string} code - Code to evaluate
   * @param {string} language - Programming language
   * @param {object} options - Additional options (prompt, context, etc.)
   * @returns {object} Evaluation scores for all criteria
   */
  async evaluateCode(code, language, options = {}) {
    try {
      // Check cache first
      const codeHash = this.generateHash(code);
      const cached = this.getFromCache(codeHash, language);
      if (cached) {
        console.log('[EVALUATION CACHE HIT]', codeHash.substring(0, 16));
        return { ...cached, fromCache: true };
      }

      const { prompt = '', context = '' } = options;

      // Evaluate each criterion separately
      const criteria = ['correctness', 'quality', 'bestPractices', 'performance', 'security', 'maintainability'];
      const scores = {};

      for (const criterion of criteria) {
        const score = await this.evaluateCriteria(code, language, criterion, prompt, context);
        scores[criterion] = score;
      }

      const result = {
        scores,
        language,
        codeHash,
        evaluatedAt: new Date().toISOString(),
        fromCache: false
      };

      // Cache the result
      this.addToCache(codeHash, language, result);

      return result;
    } catch (error) {
      console.error('LLM evaluation failed:', error);
      // Return default scores on error
      return this.getDefaultScores(code, language, error);
    }
  }

  /**
   * Evaluate a specific criterion using LLM
   * @param {string} code - Code to evaluate
   * @param {string} language - Programming language
   * @param {string} criterion - Criterion name (correctness, quality, etc.)
   * @param {string} prompt - Original prompt/requirement
   * @param {string} context - Additional context
   * @returns {number} Score (0-10)
   */
  async evaluateCriteria(code, language, criterion, prompt = '', context = '') {
    try {
      const evaluationPrompt = this.buildEvaluationPrompt(code, language, criterion, prompt, context);

      // Use a reasonable model for evaluation (will use the first available)
      const models = await this.lmClient.getModels();
      if (models.length === 0) {
        throw new Error('No models available');
      }

      const model = models[0].id;

      // Generate evaluation
      const result = await this.lmClient.generateCompletion(model, evaluationPrompt, {
        temperature: 0.3,
        max_tokens: 500,
        useCache: true,
        cacheTTL: 60 * 60 * 1000 // 1 hour
      });

      // Parse score from response
      const score = this.parseScoreFromResponse(result.text, criterion);

      return score;
    } catch (error) {
      console.error(`Failed to evaluate criterion ${criterion}:`, error);
      // Return moderate score on failure
      return 5;
    }
  }

  /**
   * Build evaluation prompt for a specific criterion
   * @param {string} code - Code to evaluate
   * @param {string} language - Programming language
   * @param {string} criterion - Criterion name
   * @param {string} prompt - Original prompt
   * @param {string} context - Additional context
   * @returns {string} Evaluation prompt
   */
  buildEvaluationPrompt(code, language, criterion, prompt, context) {
    const criterionPrompts = {
      correctness: `Evaluate the correctness of this ${language} code. Check if it correctly implements the requirements and handles edge cases.`,
      quality: `Evaluate the quality of this ${language} code. Consider readability, naming conventions, code organization, and documentation.`,
      bestPractices: `Evaluate the adherence to ${language} best practices in this code. Consider idiomatic patterns and language-specific conventions.`,
      performance: `Evaluate the performance of this ${language} code. Consider time complexity, space complexity, and efficiency.`,
      security: `Evaluate the security of this ${language} code. Check for potential vulnerabilities, injection risks, and security best practices.`,
      maintainability: `Evaluate the maintainability of this ${language} code. Consider extensibility, modularity, and ease of modification.`
    };

    let evaluationPrompt = criterionPrompts[criterion] || `Evaluate this ${language} code for ${criterion}.`;

    evaluationPrompt += '\n\n';

    // Add original prompt if provided
    if (prompt) {
      evaluationPrompt += `Original Requirement:\n${prompt}\n\n`;
    }

    // Add context if provided
    if (context) {
      evaluationPrompt += `Context:\n${context}\n\n`;
    }

    // Add code
    evaluationPrompt += `Code to evaluate:\n${code}\n\n`;

    evaluationPrompt += `Provide a score from 0-10 based on your evaluation. `;
    evaluationPrompt += `Respond with ONLY the number (e.g., "8" or "7.5") and nothing else.`;

    return evaluationPrompt;
  }

  /**
   * Parse score from LLM response
   * @param {string} response - LLM response text
   * @param {string} criterion - Criterion being evaluated
   * @returns {number} Parsed score
   */
  parseScoreFromResponse(response, criterion) {
    // Try to extract numeric score
    const text = response.trim();

    // Look for patterns like "Score: 8", "8/10", or just "8"
    const patterns = [
      /(?:score|rating)?:?\s*([0-9]+\.?[0-9]*)/i,
      /([0-9]+\.?[0-9]*)\s*\/\s*10/i,
      /^([0-9]+\.?[0-9]*)$/m,
      /([0-9]+\.?[0-9]*)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const score = parseFloat(match[1]);
        if (!isNaN(score) && score >= 0 && score <= 10) {
          return Math.round(score * 10) / 10; // Round to 1 decimal place
        }
      }
    }

    // If parsing fails, use a heuristic based on response content
    console.warn(`Failed to parse score for ${criterion}, response: ${text}`);
    return this.heuristicScore(text);
  }

  /**
   * Generate heuristic score from response content
   * @param {string} text - Response text
   * @returns {number} Heuristic score
   */
  heuristicScore(text) {
    const lowerText = text.toLowerCase();
    let score = 5;

    // Positive indicators
    const positiveWords = ['excellent', 'great', 'good', 'well', 'effective', 'correct', 'proper'];
    const negativeWords = ['poor', 'bad', 'error', 'wrong', 'incorrect', 'inefficient', 'vulnerable'];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of positiveWords) {
      if (lowerText.includes(word)) positiveCount++;
    }
    for (const word of negativeWords) {
      if (lowerText.includes(word)) negativeCount++;
    }

    // Adjust score based on sentiment
    score += positiveCount * 0.5;
    score -= negativeCount * 1;

    return Math.max(0, Math.min(Math.round(score * 10) / 10, 10));
  }

  /**
   * Get default scores when LLM evaluation fails
   * @param {string} code - Code that failed to evaluate
   * @param {string} language - Programming language
   * @param {Error} error - Error that occurred
   * @returns {object} Default scores
   */
  getDefaultScores(code, language, error) {
    console.error('Using default scores due to error:', error.message);

    // Use basic heuristics as fallback
    const scores = {
      correctness: this.heuristicCorrectness(code),
      quality: this.heuristicQuality(code),
      bestPractices: this.heuristicBestPractices(code, language),
      performance: 5,
      security: this.heuristicSecurity(code),
      maintainability: 5
    };

    return {
      scores,
      language,
      codeHash: this.generateHash(code),
      evaluatedAt: new Date().toISOString(),
      fromCache: false,
      fallback: true,
      error: error.message
    };
  }

  /**
   * Heuristic correctness evaluation
   */
  heuristicCorrectness(code) {
    let score = 5;
    if (code.includes('function') || code.includes('def ') || code.includes('class ')) score += 2;
    if (code.includes('return') || code.includes('yield')) score += 1;
    if (code.match(/error|Error|ERROR/)) score -= 2;
    return Math.max(0, Math.min(score, 10));
  }

  /**
   * Heuristic quality evaluation
   */
  heuristicQuality(code) {
    let score = 5;
    const commentRatio = (code.match(/\/\/|\/\*|#/g) || []).length / Math.max(code.split('\n').length, 1);
    score += Math.min(commentRatio * 5, 2);
    if (code.length > 100) score += 1;
    return Math.max(0, Math.min(score, 10));
  }

  /**
   * Heuristic best practices evaluation
   */
  heuristicBestPractices(code, language) {
    let score = 5;

    if (language === 'javascript' || language === 'typescript') {
      if (code.includes('const ') || code.includes('let ')) score += 2;
      if (code.includes('async') || code.includes('await')) score += 1;
    } else if (language === 'python') {
      if (code.includes('def ') && code.includes('return')) score += 2;
      if (code.includes('import ')) score += 1;
    }

    return Math.max(0, Math.min(score, 10));
  }

  /**
   * Heuristic security evaluation
   */
  heuristicSecurity(code) {
    let score = 8; // Start high, deduct for issues

    // Common security issues
    const securityIssues = [
      'eval(', 'innerHTML', 'document.write', // JS issues
      'exec(', 'subprocess.call', 'pickle.load' // Python issues
    ];

    for (const issue of securityIssues) {
      if (code.includes(issue)) score -= 2;
    }

    return Math.max(0, Math.min(score, 10));
  }

  /**
   * Generate hash for code
   * @param {string} code - Code to hash
   * @returns {string} Hash string
   */
  generateHash(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Add result to cache
   */
  addToCache(codeHash, language, result) {
    const key = `${codeHash}:${language}`;
    const entry = {
      data: result,
      timestamp: Date.now()
    };

    this.evaluationCache.set(key, entry);

    // Trim cache if needed
    if (this.evaluationCache.size > this.maxCacheSize) {
      const keys = Array.from(this.evaluationCache.keys());
      const oldestKey = keys[0];
      this.evaluationCache.delete(oldestKey);
    }
  }

  /**
   * Get result from cache
   */
  getFromCache(codeHash, language) {
    const key = `${codeHash}:${language}`;
    const entry = this.evaluationCache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.cacheTimeout) {
      this.evaluationCache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Clear evaluation cache
   */
  clearCache() {
    this.evaluationCache.clear();
    return { success: true };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.evaluationCache.size,
      maxSize: this.maxCacheSize
    };
  }
}

module.exports = { LLMEvaluator };
