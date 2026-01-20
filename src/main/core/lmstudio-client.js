const axios = require('axios');
const { getCache } = require('./cache');

/**
 * @typedef {Object} GenerationOptions
 * @property {number} [temperature=0.7] - Sampling temperature (0-2, higher = more random)
 * @property {number} [max_tokens=2000] - Maximum tokens to generate
 * @property {number} [top_p=0.9] - Nucleus sampling threshold
 * @property {string|string[]} [stop] - Stop sequences
 * @property {boolean} [useCache=true] - Whether to use response caching
 * @property {number} [cacheTTL] - Cache time-to-live in milliseconds
 */

/**
 * @typedef {Object} GenerationResult
 * @property {string} text - Generated text
 * @property {string} model - Model identifier used
 * @property {Object} usage - Token usage statistics
 * @property {number} usage.prompt_tokens - Tokens in prompt
 * @property {number} usage.completion_tokens - Tokens generated
 * @property {number} usage.total_tokens - Total tokens
 * @property {boolean} fromCache - Whether result came from cache
 * @property {number} [cacheAge] - Age of cached entry in milliseconds
 */

/**
 * LMStudio Client - Handles communication with local LMStudio API
 *
 * Compatible with OpenAI API format for seamless integration.
 * Implements response caching to improve performance and reduce API calls.
 *
 * Features:
 * - OpenAI-compatible API client
 * - Response caching with configurable TTL
 * - Automatic error handling and retries
 * - Connection management
 * - Timeout protection
 *
 * @example
 * ```javascript
 * const client = new LMStudioClient('http://localhost:1234');
 *
 * const result = await client.generateCompletion(
 *   'model-name',
 *   'Write a function to add two numbers',
 *   { temperature: 0.5, max_tokens: 500, useCache: true }
 * );
 *
 * console.log(result.text);
 * console.log('From cache:', result.fromCache);
 * ```
 *
 * @class
 */
class LMStudioClient {
  /**
   * Initialize LMStudio client
   *
   * @param {string} baseURL - Base URL for LMStudio API (default: 'http://localhost:1234')
   * @example
   * ```javascript
   * const client = new LMStudioClient('http://localhost:1234');
   * ```
   */
  constructor(baseURL = 'http://localhost:1234') {
    this.setBaseURL(baseURL);
    this.cache = getCache(); // Get global cache instance
  }

  /**
   * Update the base URL and recreate the API client
   *
   * Creates a new axios instance with the updated URL and default configuration.
   * The timeout is set to 10 minutes to accommodate large code generation tasks.
   *
   * @param {string} baseURL - New base URL for LMStudio API
   * @example
   * ```javascript
   * client.setBaseURL('http://localhost:5678');
   * ```
   */
  setBaseURL(baseURL) {
    this.baseURL = baseURL;
    this.apiClient = axios.create({
      baseURL: `${baseURL}/v1`,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 600000 // 10 minutes for large code generation (increased for slower PCs)
    });
  }

  /**
   * Check if LMStudio is running and accessible
   *
   * Tests the connection by attempting to fetch the available models list.
   * This is useful for validating connection settings before making generation requests.
   *
   * @async
   * @returns {Promise<Object>} Connection status object
   * @returns {boolean} return.connected - Whether connection was successful
   * @returns {Object} [return.models] - Models data if connected
   * @returns {string} [return.error] - Error message if connection failed
   * @example
   * ```javascript
   * const status = await client.checkConnection();
   * if (status.connected) {
   *   console.log('LMStudio is running!');
   * } else {
   *   console.error('Connection failed:', status.error);
   * }
   * ```
   */
  async checkConnection() {
    try {
      const response = await this.apiClient.get('/models');
      return { connected: true, models: response.data };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  /**
   * Get available models from LMStudio
   *
   * Retrieves the list of all models available in the running LMStudio instance.
   * Returns model ID and metadata for each available model.
   *
   * @async
   * @returns {Promise<Array<Object>>} Array of model objects
   * @returns {string} return[].id - Model identifier
   * @returns {string} return[].object - Object type (should be 'model')
   * @returns {number} return[].created - Creation timestamp
   * @returns {string} return[].owned_by - Model owner
   * @throws {Error} If request to LMStudio fails
   * @example
   * ```javascript
   * const models = await client.getModels();
   * models.forEach(model => {
   *   console.log('Model ID:', model.id);
   * });
   * ```
   */
  async getModels() {
    try {
      const response = await this.apiClient.get('/models');
      return response.data.data || [];
    } catch (error) {
      throw new Error(`Failed to fetch models: ${error.message}`);
    }
  }

  /**
   * Generate completion using a specific model (with caching support)
   * @param {string} model - Model identifier
   * @param {string} prompt - Input prompt
   * @param {object} options - Generation options
   * @returns {object} Result with text, model, usage, fromCache, cacheAge
   */
  async generateCompletion(model, prompt, options = {}) {
    const {
      temperature = 0.7,
      max_tokens = 2000,
      top_p = 0.9,
      stop = null,
      useCache = true,
      cacheTTL = null
    } = options;

    // Check cache first if enabled
    if (useCache) {
      const cached = this.cache.get(prompt, model, {
        temperature,
        max_tokens,
        top_p,
        stop,
        ttl: cacheTTL
      });

      if (cached) {
        console.log(`[CACHE HIT] Model: ${model}, Key: ${cached.key.substring(0, 16)}...`);
        return {
          text: cached.value.text,
          model: cached.value.model,
          usage: cached.value.usage,
          fromCache: true,
          cacheAge: cached.age
        };
      }
    }

    // Cache miss - generate new response
    try {
      const response = await this.apiClient.post('/chat/completions', {
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature,
        max_tokens,
        top_p,
        stop
      });

      const result = {
        text: response.data.choices[0].message.content,
        model: response.data.model,
        usage: response.data.usage,
        fromCache: false
      };

      // Cache the result for future requests
      this.cache.set(prompt, model, result, {
        temperature,
        max_tokens,
        top_p,
        stop,
        ttl: cacheTTL
      });

      console.log(`[CACHE MISS] Model: ${model}, Cached response for future requests`);

      return result;
    } catch (error) {
      throw new Error(`Generation failed: ${error.message}`);
    }
  }

  /**
   * Generate code with specific formatting
   *
   * Convenience method that builds a code-specific prompt and generates completion.
   * Uses lower temperature (0.3) for more deterministic code generation.
   *
   * TODO: Consider adding code validation or linting in the future.
   *
   * @async
   * @param {string} model - Model identifier to use
   * @param {string} prompt - Code generation request
   * @param {string} language - Target programming language
   * @param {string} [context=''] - Additional context for code generation
   * @returns {Promise<GenerationResult>} Generation result with generated code
   * @example
   * ```javascript
   * const result = await client.generateCode(
   *   'model-name',
   *   'Create a function to sort an array',
   *   'javascript',
   *   'Existing code context here'
   * );
   * console.log(result.text);
   * ```
   */
  async generateCode(model, prompt, language, context = '') {
    const codePrompt = this.buildCodePrompt(prompt, language, context);
    return await this.generateCompletion(model, codePrompt, {
      temperature: 0.3, // Lower temperature for more deterministic code
      max_tokens: 4000
    });
  }

  /**
   * Build a structured prompt for code generation
   *
   * Creates a well-structured prompt optimized for generating high-quality code.
   * Includes language-specific instructions and requirements.
   *
   * @param {string} prompt - Code generation request
   * @param {string} language - Target programming language
   * @param {string} [context=''] - Additional context to include
   * @returns {string} Formatted prompt string
   * @example
   * ```javascript
   * const codePrompt = client.buildCodePrompt(
   *   'Write a function to add two numbers',
   *   'javascript',
   *   'Context: This is for a calculator app'
   * );
   * console.log(codePrompt);
   * ```
   */
  buildCodePrompt(prompt, language, context) {
    let fullPrompt = `You are an expert ${language} developer. Generate clean, well-documented, production-ready code.\n\n`;

    if (context) {
      fullPrompt += `Context:\n${context}\n\n`;
    }

    fullPrompt += `Task: ${prompt}\n\n`;
    fullPrompt += `Requirements:\n`;
    fullPrompt += `- Write complete, runnable code\n`;
    fullPrompt += `- Include proper error handling\n`;
    fullPrompt += `- Add meaningful comments\n`;
    fullPrompt += `- Follow ${language} best practices\n`;
    fullPrompt += `- Return ONLY the code, no explanations outside code comments\n\n`;
    fullPrompt += `Code:`;

    return fullPrompt;
  }

  /**
   * Clear cache for specific model or all models
   *
   * Clears cached responses to free up memory or force fresh generation.
   * Useful when you want to ensure the LLM generates new responses instead
   * of returning cached results.
   *
   * @param {string} [model=null] - Model ID to clear (or null to clear all)
   * @returns {number} Number of entries cleared
   * @example
   * ```javascript
   * // Clear all cache
   * const cleared = client.clearCache();
   * console.log(`Cleared ${cleared} entries`);
   *
   * // Clear specific model cache
   * const cleared = client.clearCache('model-name');
   * console.log(`Cleared ${cleared} entries for model-name`);
   * ```
   */
  clearCache(model = null) {
    if (model) {
      return this.cache.evictModel(model);
    } else {
      return this.cache.clear();
    }
  }
}

module.exports = { LMStudioClient };
