const axios = require('axios');
const { getCache } = require('./cache');

/**
 * LMStudio Client - Handles communication with local LMStudio API
 * Compatible with OpenAI API format
 * WITH RESPONSE CACHING
 */
class LMStudioClient {
  constructor(baseURL = 'http://localhost:1234') {
    this.setBaseURL(baseURL);
    this.cache = getCache(); // Get global cache instance
  }

  /**
   * Update the base URL and recreate the API client
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
   * @param {string} model - Model ID to clear (or null for all)
   * @returns {number} Number of entries cleared
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
