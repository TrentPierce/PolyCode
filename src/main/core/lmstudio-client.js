const axios = require('axios');

/**
 * LMStudio Client - Handles communication with local LMStudio API
 * Compatible with OpenAI API format
 */
class LMStudioClient {
  constructor(baseURL = 'http://localhost:1234') {
    this.setBaseURL(baseURL);
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
   * Generate completion using a specific model
   * @param {string} model - Model identifier
   * @param {string} prompt - Input prompt
   * @param {object} options - Generation options
   */
  async generateCompletion(model, prompt, options = {}) {
    const {
      temperature = 0.7,
      max_tokens = 2000,
      top_p = 0.9,
      stop = null
    } = options;

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

      return {
        text: response.data.choices[0].message.content,
        model: response.data.model,
        usage: response.data.usage
      };
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
}

module.exports = { LMStudioClient };

