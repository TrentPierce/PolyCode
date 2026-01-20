/**
 * @typedef {Object} CriterionConfig
 * @property {number} weight - Weight for this criterion (0-1)
 * @property {string} description - Human-readable description
 * @property {number} maxScore - Maximum possible score
 * @property {string} evaluationPrompt - Prompt for LLM evaluation
 */

/**
 * @typedef {Object} EvaluationResult
 * @property {Object<string, number>} scores - Individual criterion scores
 * @property {number} weightedScore - Overall weighted score (0-10)
 * @property {CriterionConfig} criteria - Criteria configuration
 * @property {string} timestamp - ISO timestamp of evaluation
 */

/**
 * @typedef {Object} EvaluationEntry
 * @property {string} timestamp - ISO timestamp
 * @property {Object<string, number>} scores - Individual scores
 * @property {number} weightedScore - Weighted total
 * @property {string} rubricVersion - Rubric version used
 * @property {string} [codeHash] - Hash of evaluated code
 * @property {string} [language] - Programming language
 * @property {string} [model] - Model that performed evaluation
 */

/**
 * Enhanced Rubric System - Multi-criteria evaluation with LLM-based scoring
 *
 * Implements a weighted rubric system for evaluating code quality across multiple dimensions.
 * Supports configurable criteria, evaluation history tracking, and export/import functionality.
 *
 * Default Criteria:
 * - Correctness (30%): Code correctness and functionality
 * - Quality (20%): Code quality, readability, maintainability
 * - Best Practices (20%): Language-specific best practices
 * - Performance (10%): Code efficiency and performance
 * - Security (10%): Security considerations and vulnerability checks
 * - Maintainability (10%): Ease of maintenance and extensibility
 *
 * Features:
 * - Weighted scoring with normalization
 * - Evaluation history tracking (max 50 entries)
 * - Configurable criteria weights
 * - Export/import configuration
 * - Quality grade assignment
 * - Score trend analysis
 *
 * @example
 * ```javascript
 * const rubric = new EnhancedCodeRubric();
 *
 * const result = rubric.evaluateCode({
 *   correctness: 8,
 *   quality: 7,
 *   bestPractices: 9,
 *   performance: 6,
 *   security: 8,
 *   maintainability: 7
 * }, { language: 'javascript', codeHash: 'abc123' });
 *
 * console.log('Weighted Score:', result.weightedScore);
 * console.log('Grade:', rubric.getQualityGrade(result.weightedScore));
 * ```
 *
 * @class
 */
class EnhancedCodeRubric {
  /**
   * Initialize the enhanced rubric system
   *
   * Sets up default criteria with weights and initializes history tracking.
   *
   * @example
   * ```javascript
   * const rubric = new EnhancedCodeRubric();
   * ```
   */
  constructor() {
    // Default criteria with weights
    this.criteria = {
      correctness: {
        weight: 0.3,
        description: 'Code correctness and functionality',
        maxScore: 10,
        evaluationPrompt: 'Evaluate if the code correctly implements the requirements and handles edge cases.'
      },
      quality: {
        weight: 0.2,
        description: 'Code quality, readability, and maintainability',
        maxScore: 10,
        evaluationPrompt: 'Evaluate code quality including readability, naming conventions, and documentation.'
      },
      bestPractices: {
        weight: 0.2,
        description: 'Adherence to language-specific best practices',
        maxScore: 10,
        evaluationPrompt: 'Evaluate adherence to best practices for this programming language.'
      },
      performance: {
        weight: 0.1,
        description: 'Code efficiency and performance',
        maxScore: 10,
        evaluationPrompt: 'Evaluate performance considerations and efficiency of the solution.'
      },
      security: {
        weight: 0.1,
        description: 'Security considerations and vulnerability checks',
        maxScore: 10,
        evaluationPrompt: 'Evaluate security considerations and potential vulnerabilities.'
      },
      maintainability: {
        weight: 0.1,
        description: 'Ease of maintenance and extensibility',
        maxScore: 10,
        evaluationPrompt: 'Evaluate how maintainable and extensible the code is.'
      }
    };

    // Evaluation history (max 50 entries)
    this.history = [];
    this.maxHistorySize = 50;

    // Rubric version for tracking changes
    this.version = '1.0.0';
  }

  /**
   * Evaluate code using LLM-based scoring
   *
   * Takes scores from an LLM evaluation and calculates the weighted total.
   * Validates and clamps scores to valid ranges before calculation.
   * Automatically adds the evaluation to history.
   *
   * @param {Object<string, number>} criterionScores - Scores from LLM for each criterion
   * @param {Object} [metadata={}] - Additional metadata for tracking
   * @param {string} [metadata.codeHash] - Hash of the evaluated code
   * @param {string} [metadata.language] - Programming language
   * @param {string} [metadata.model] - Model that performed evaluation
   * @returns {EvaluationResult} Evaluation results with weighted score
   * @example
   * ```javascript
   * const result = rubric.evaluateCode(
   *   { correctness: 8, quality: 7, bestPractices: 9 },
   *   { language: 'javascript', codeHash: 'abc123' }
   * );
   * console.log(result.weightedScore); // e.g., 7.8
   * ```
   */
  evaluateCode(criterionScores, metadata = {}) {
    // Validate scores
    const scores = {};
    for (const [criterion, score] of Object.entries(criterionScores)) {
      if (this.criteria[criterion]) {
        // Clamp score to valid range [0, maxScore]
        scores[criterion] = Math.max(0, Math.min(score, this.criteria[criterion].maxScore));
      }
    }

    // Calculate weighted score
    const weightedScore = this.calculateWeightedScore(scores);

    // Add to history
    this.addEvaluation({
      timestamp: new Date().toISOString(),
      scores,
      weightedScore,
      rubricVersion: this.version,
      codeHash: metadata.codeHash,
      language: metadata.language,
      model: metadata.model
    });

    return {
      scores,
      weightedScore,
      criteria: this.getCriteria(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate weighted total score
   *
   * Computes the weighted average of all criterion scores.
   * Automatically normalizes if weights don't sum to 1.0.
   *
   * @param {Object<string, number>} scores - Scores for each criterion
   * @returns {number} Weighted score (0-10)
   * @example
   * ```javascript
   * const weighted = rubric.calculateWeightedScore({
   *   correctness: 8,
   *   quality: 7
   * });
   * console.log(weighted); // e.g., 7.5 (depends on weights)
   * ```
   */
  calculateWeightedScore(scores) {
    let total = 0;
    let weightSum = 0;

    for (const [criterion, score] of Object.entries(scores)) {
      if (this.criteria[criterion]) {
        total += score * this.criteria[criterion].weight;
        weightSum += this.criteria[criterion].weight;
      }
    }

    // Normalize if weights don't sum to 1
    return weightSum > 0 ? (total / weightSum) : 0;
  }

  /**
   * Get current criteria and weights
   *
   * Returns a copy of the current criteria configuration.
   *
   * @returns {Object<string, CriterionConfig>} Criteria configuration
   * @example
   * ```javascript
   * const criteria = rubric.getCriteria();
   * console.log('Correctness weight:', criteria.correctness.weight);
   * ```
   */
  getCriteria() {
    return { ...this.criteria };
  }

  /**
   * Get specific criterion information
   *
   * Retrieves configuration for a single criterion by name.
   *
   * @param {string} criterionName - Name of the criterion
   * @returns {CriterionConfig|null} Criterion configuration or null if not found
   * @example
   * ```javascript
   * const correctnessCrit = rubric.getCriterion('correctness');
   * if (correctnessCrit) {
   *   console.log(correctnessCrit.description);
   * }
   * ```
   */
  getCriterion(criterionName) {
    return this.criteria[criterionName] || null;
  }

  /**
   * Set custom weights for criteria
   *
   * Updates weights for specified criteria after normalizing them.
   * Only updates weights for valid criteria that exist in the rubric.
   *
   * TODO: Add validation to ensure minimum/maximum weight limits
   *
   * @param {Object<string, number>} weights - Object with criterion names as keys and weights as values
   * @returns {Object} Result with success status and normalized weights
   * @returns {boolean} return.success - Whether update was successful
   * @returns {Object<string, CriterionConfig>} return.weights - Updated criteria configuration
   * @example
   * ```javascript
   * const result = rubric.setWeights({
   *   correctness: 0.4,
   *   quality: 0.3,
   *   bestPractices: 0.3
   * });
   * console.log(result.weights.correctness.weight); // Normalized value
   * ```
   */
  setWeights(weights) {
    const normalized = this.normalizeWeights(weights);

    // Update weights
    for (const [criterion, weight] of Object.entries(normalized)) {
      if (this.criteria[criterion]) {
        this.criteria[criterion].weight = weight;
      }
    }

    return {
      success: true,
      weights: this.getCriteria()
    };
  }

  /**
   * Normalize weights to sum to 1.0
   *
   * Ensures all weights sum to exactly 1.0 for proper calculation.
   * Filters out invalid criteria and weights before normalization.
   *
   * @param {Object<string, number>} weights - Object with criterion weights
   * @returns {Object<string, number>} Normalized weights summing to 1.0
   * @example
   * ```javascript
   * const normalized = rubric.normalizeWeights({
   *   correctness: 0.5,
   *   quality: 0.5
   * });
   * console.log(normalized); // Both weights normalized if they didn't sum to 1.0
   * ```
   */
  normalizeWeights(weights) {
    // Filter to valid criteria only
    const validWeights = {};
    for (const [criterion, weight] of Object.entries(weights)) {
      if (this.criteria[criterion] && typeof weight === 'number' && weight >= 0) {
        validWeights[criterion] = weight;
      }
    }

    // Calculate sum
    const sum = Object.values(validWeights).reduce((a, b) => a + b, 0);

    // Normalize if sum is non-zero
    if (sum > 0) {
      for (const criterion in validWeights) {
        validWeights[criterion] = validWeights[criterion] / sum;
      }
    }

    return validWeights;
  }

  /**
   * Reset weights to default values
   *
   * Restores all criteria to their default weight values.
   * Default: correctness (0.3), quality (0.2), bestPractices (0.2),
   * performance (0.1), security (0.1), maintainability (0.1)
   *
   * @returns {Object} Result with success status and updated weights
   * @returns {boolean} return.success - Whether reset was successful
   * @returns {Object<string, CriterionConfig>} return.weights - Updated criteria configuration
   * @example
   * ```javascript
   * const result = rubric.resetWeights();
   * console.log('Reset to defaults');
   * ```
   */
  resetWeights() {
    this.criteria.correctness.weight = 0.3;
    this.criteria.quality.weight = 0.2;
    this.criteria.bestPractices.weight = 0.2;
    this.criteria.performance.weight = 0.1;
    this.criteria.security.weight = 0.1;
    this.criteria.maintainability.weight = 0.1;

    return {
      success: true,
      weights: this.getCriteria()
    };
  }

  /**
   * Add evaluation to history
   *
   * Adds evaluation record to the beginning of history.
   * Automatically trims history to maximum size (50 entries).
   *
   * TODO: Consider persisting history to disk for long-term tracking
   *
   * @param {EvaluationEntry} evaluation - Evaluation record to add
   * @example
   * ```javascript
   * rubric.addEvaluation({
   *   timestamp: new Date().toISOString(),
   *   scores: { correctness: 8, quality: 7 },
   *   weightedScore: 7.5,
   *   rubricVersion: '1.0.0'
   * });
   * ```
   */
  addEvaluation(evaluation) {
    this.history.unshift(evaluation);

    // Trim history to max size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Get evaluation history
   *
   * Returns recent evaluation entries, most recent first.
   *
   * @param {number} [limit=this.maxHistorySize] - Maximum number of history entries to return
   * @returns {Array<EvaluationEntry>} Evaluation history, most recent first
   * @example
   * ```javascript
   * const recent = rubric.getHistory(10);
   * console.log(`Last 10 evaluations`);
   * ```
   */
  getHistory(limit = this.maxHistorySize) {
    return this.history.slice(0, limit);
  }

  /**
   * Clear evaluation history
   *
   * Removes all evaluation records from history.
   * Useful for starting fresh or clearing sensitive data.
   *
   * @returns {Object} Result with success status
   * @returns {boolean} return.success - Always true
   * @example
   * ```javascript
   * rubric.clearHistory();
   * console.log('History cleared');
   * ```
   */
  clearHistory() {
    this.history = [];
    return { success: true };
  }

  /**
   * Get average scores from history
   *
   * Calculates average score for each criterion across all evaluations.
   * Useful for tracking overall performance over time.
   *
   * @returns {Object<string, number>} Average scores for each criterion
   * @example
   * ```javascript
   * const averages = rubric.getAverageScores();
   * console.log('Average correctness:', averages.correctness);
   * ```
   */
  getAverageScores() {
    if (this.history.length === 0) {
      return {};
    }

    const averages = {};
    const counts = {};

    for (const evaluation of this.history) {
      for (const [criterion, score] of Object.entries(evaluation.scores)) {
        if (!averages[criterion]) {
          averages[criterion] = 0;
          counts[criterion] = 0;
        }
        averages[criterion] += score;
        counts[criterion]++;
      }
    }

    // Calculate averages
    for (const criterion in averages) {
      averages[criterion] = averages[criterion] / counts[criterion];
    }

    return averages;
  }

  /**
   * Get score trend from history
   *
   * Analyzes recent evaluations to determine if scores are improving,
   * declining, or stable. Uses a configurable window size.
   *
   * TODO: Consider adding more sophisticated trend analysis (moving averages, etc.)
   *
   * @param {number} [windowSize=10] - Number of recent evaluations to analyze
   * @returns {Object} Trend data
   * @returns {string} return.trend - 'improving', 'declining', 'stable', or 'insufficient_data'
   * @returns {number} return.change - Score difference (newest - oldest)
   * @returns {number} return.oldest - Oldest weighted score in window
   * @returns {number} return.newest - Newest weighted score in window
   * @example
   * ```javascript
   * const trend = rubric.getScoreTrend(20);
   * console.log(`Trend: ${trend.trend}, Change: ${trend.change}`);
   * ```
   */
  getScoreTrend(windowSize = 10) {
    const recent = this.history.slice(0, windowSize);
    if (recent.length < 2) {
      return { trend: 'insufficient_data', change: 0 };
    }

    const oldest = recent[recent.length - 1].weightedScore;
    const newest = recent[0].weightedScore;
    const change = newest - oldest;

    let trend = 'stable';
    if (change > 0.5) {
      trend = 'improving';
    } else if (change < -0.5) {
      trend = 'declining';
    }

    return { trend, change, oldest, newest };
  }

  /**
   * Export rubric configuration as JSON
   *
   * Exports current rubric configuration including version and criteria.
   * Useful for backup or sharing configurations.
   *
   * @returns {Object} Rubric configuration
   * @returns {string} return.version - Rubric version
   * @returns {Object<string, CriterionConfig>} return.criteria - Criteria configuration
   * @returns {string} return.exportedAt - ISO timestamp
   * @example
   * ```javascript
   * const config = rubric.export();
   * console.log(JSON.stringify(config, null, 2));
   * ```
   */
  export() {
    return {
      version: this.version,
      criteria: this.getCriteria(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import rubric configuration from JSON
   *
   * Imports rubric configuration and validates it before applying.
   * Only updates weights for valid criteria that exist in the rubric.
   *
   * TODO: Add support for importing custom criteria definitions
   *
   * @param {Object} config - Rubric configuration
   * @param {string} config.version - Rubric version (optional)
   * @param {Object} config.criteria - Criteria configuration to import
   * @returns {Object} Result with success status
   * @returns {boolean} return.success - Whether import was successful
   * @returns {string} [return.error] - Error message if failed
   * @returns {Object<string, CriterionConfig>} [return.weights] - Updated criteria if successful
   * @example
   * ```javascript
   * const config = {
   *   version: '1.0.0',
   *   criteria: {
   *     correctness: { weight: 0.4, maxScore: 10 },
   *     quality: { weight: 0.6, maxScore: 10 }
   *   }
   * };
   * const result = rubric.import(config);
   * if (result.success) {
   *   console.log('Imported successfully');
   * }
   * ```
   */
  import(config) {
    try {
      if (!config || !config.criteria) {
        throw new Error('Invalid rubric configuration');
      }

      // Validate criteria
      for (const criterion in config.criteria) {
        if (!this.criteria[criterion]) {
          throw new Error(`Unknown criterion: ${criterion}`);
        }

        // Validate weight
        const weight = config.criteria[criterion].weight;
        if (typeof weight !== 'number' || weight < 0 || weight > 1) {
          throw new Error(`Invalid weight for ${criterion}`);
        }
      }

      // Import criteria
      for (const criterion in config.criteria) {
        this.criteria[criterion].weight = config.criteria[criterion].weight;
        if (config.criteria[criterion].description) {
          this.criteria[criterion].description = config.criteria[criterion].description;
        }
        if (config.criteria[criterion].evaluationPrompt) {
          this.criteria[criterion].evaluationPrompt = config.criteria[criterion].evaluationPrompt;
        }
      }

      return {
        success: true,
        weights: this.getCriteria()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get evaluation prompt for a specific criterion
   *
   * Returns the LLM prompt used to evaluate a specific criterion.
   *
   * @param {string} criterionName - Name of the criterion
   * @returns {string} Evaluation prompt or empty string if not found
   * @example
   * ```javascript
   * const prompt = rubric.getEvaluationPrompt('correctness');
   * console.log('Evaluation prompt:', prompt);
   * ```
   */
  getEvaluationPrompt(criterionName) {
    const criterion = this.criteria[criterionName];
    if (!criterion) {
      return '';
    }
    return criterion.evaluationPrompt;
  }

  /**
   * Get quality grade based on weighted score
   *
   * Maps a weighted score to a human-readable grade with color.
   * Grade thresholds: Excellent (8.5+), Good (7.0+), Fair (5.5+),
   * Poor (4.0+), Very Poor (< 4.0)
   *
   * @param {number} score - Weighted score (0-10)
   * @returns {Object} Grade with label and color
   * @returns {string} return.label - Grade label
   * @returns {string} return.color - Hex color code for display
   * @example
   * ```javascript
   * const grade = rubric.getQualityGrade(8.2);
   * console.log(`${grade.label} (${grade.color})`); // "Good (#34d399)"
   * ```
   */
  getQualityGrade(score) {
    if (score >= 8.5) {
      return { label: 'Excellent', color: '#10b981' }; // green
    } else if (score >= 7.0) {
      return { label: 'Good', color: '#34d399' }; // light green
    } else if (score >= 5.5) {
      return { label: 'Fair', color: '#f59e0b' }; // yellow
    } else if (score >= 4.0) {
      return { label: 'Poor', color: '#f97316' }; // orange
    } else {
      return { label: 'Very Poor', color: '#ef4444' }; // red
    }
  }
}

module.exports = { EnhancedCodeRubric };
