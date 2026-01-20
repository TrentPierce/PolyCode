import React, { useState, useEffect } from 'react';

/**
 * RubricEditor Component
 * UI to customize rubric weights and configuration
 */
function RubricEditor({ onClose, onSave }) {
  const [weights, setWeights] = useState({
    correctness: 0.3,
    quality: 0.2,
    bestPractices: 0.2,
    performance: 0.1,
    security: 0.1,
    maintainability: 0.1
  });

  const [criteria, setCriteria] = useState({});
  const [totalWeight, setTotalWeight] = useState(1.0);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importError, setImportError] = useState('');
  const [importText, setImportText] = useState('');

  // Load criteria from main process
  useEffect(() => {
    loadCriteria();
  }, []);

  const loadCriteria = async () => {
    try {
      const result = await window.electronAPI.rubricGetCriteria();
      if (result.success && result.criteria) {
        const initialWeights = {};
        for (const [key, value] of Object.entries(result.criteria)) {
          initialWeights[key] = value.weight;
        }
        setWeights(initialWeights);
        setCriteria(result.criteria);
      }
    } catch (error) {
      console.error('Failed to load criteria:', error);
    }
  };

  // Calculate total weight
  useEffect(() => {
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    setTotalWeight(total);
  }, [weights]);

  // Handle weight change
  const handleWeightChange = (criterion, value) => {
    const newWeights = { ...weights };
    newWeights[criterion] = parseFloat(value) || 0;
    setWeights(newWeights);
    setHasChanges(true);
  };

  // Normalize weights to sum to 1.0
  const normalizeWeights = () => {
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    if (total > 0) {
      const normalized = {};
      for (const [key, value] of Object.entries(weights)) {
        normalized[key] = value / total;
      }
      setWeights(normalized);
      setHasChanges(true);
    }
  };

  // Reset to default weights
  const resetToDefaults = () => {
    const defaultWeights = {
      correctness: 0.3,
      quality: 0.2,
      bestPractices: 0.2,
      performance: 0.1,
      security: 0.1,
      maintainability: 0.1
    };
    setWeights(defaultWeights);
    setHasChanges(true);
  };

  // Save weights
  const handleSave = async () => {
    try {
      // Auto-normalize if not already normalized
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        normalizeWeights();
        return; // Let the effect handle the next save
      }

      const result = await window.electronAPI.rubricSetWeights(weights);
      if (result.success) {
        setHasChanges(false);
        if (onSave) {
          onSave(result.weights);
        }
        alert('Rubric weights saved successfully!');
      } else {
        alert(`Failed to save weights: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to save weights:', error);
      alert(`Failed to save weights: ${error.message}`);
    }
  };

  // Export rubric
  const handleExport = async () => {
    try {
      const result = await window.electronAPI.rubricExport();
      if (result.success && result.config) {
        const blob = new Blob([JSON.stringify(result.config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rubric-config-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export rubric:', error);
      alert(`Failed to export rubric: ${error.message}`);
    }
  };

  // Import rubric
  const handleImport = () => {
    try {
      const config = JSON.parse(importText);
      const result = window.electronAPI.rubricImport(config);
      if (result.success) {
        setImportError('');
        setImportText('');
        loadCriteria(); // Reload criteria to get updated weights
        alert('Rubric imported successfully!');
      } else {
        setImportError(result.error || 'Failed to import rubric');
      }
    } catch (error) {
      setImportError('Invalid JSON format');
    }
  };

  // Load import from file
  const handleImportFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImportText(e.target.result);
    };
    reader.readAsText(file);
  };

  // Criterion display names and descriptions
  const criterionInfo = {
    correctness: {
      label: 'Correctness',
      description: 'Code correctness and functionality',
      max: 10
    },
    quality: {
      label: 'Code Quality',
      description: 'Code quality, readability, and maintainability',
      max: 10
    },
    bestPractices: {
      label: 'Best Practices',
      description: 'Adherence to language-specific best practices',
      max: 10
    },
    performance: {
      label: 'Performance',
      description: 'Code efficiency and performance',
      max: 10
    },
    security: {
      label: 'Security',
      description: 'Security considerations and vulnerability checks',
      max: 10
    },
    maintainability: {
      label: 'Maintainability',
      description: 'Ease of maintenance and extensibility',
      max: 10
    }
  };

  return (
    <div className="rubric-editor-overlay">
      <div className="rubric-editor">
        <div className="editor-header">
          <h2>Rubric Configuration</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="editor-content">
          <div className="weights-section">
            <h3>Criteria Weights</h3>
            <p className="section-description">
              Adjust the weight for each evaluation criterion. Weights should sum to 1.0.
            </p>

            {Object.entries(weights).map(([criterion, weight]) => (
              <div key={criterion} className="weight-row">
                <div className="criterion-info">
                  <div className="criterion-label">
                    {criterionInfo[criterion]?.label || criterion}
                  </div>
                  <div className="criterion-description">
                    {criterionInfo[criterion]?.description || criteria[criterion]?.description}
                  </div>
                </div>
                <div className="weight-control">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={weight}
                    onChange={(e) => handleWeightChange(criterion, e.target.value)}
                    className="weight-slider"
                  />
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={weight.toFixed(2)}
                    onChange={(e) => handleWeightChange(criterion, e.target.value)}
                    className="weight-input"
                  />
                </div>
              </div>
            ))}

            <div className="total-weight-indicator">
              <span className="weight-label">Total Weight:</span>
              <span className={`weight-value ${Math.abs(totalWeight - 1.0) > 0.01 ? 'warning' : ''}`}>
                {totalWeight.toFixed(2)}
              </span>
              {Math.abs(totalWeight - 1.0) > 0.01 && (
                <span className="weight-warning">
                  ⚠️ Weights don't sum to 1.0
                </span>
              )}
            </div>

            <div className="weight-actions">
              <button onClick={normalizeWeights} className="normalize-button">
                Normalize Weights
              </button>
              <button onClick={resetToDefaults} className="reset-button">
                Reset to Defaults
              </button>
              <button
                onClick={handleSave}
                className={`save-button ${!hasChanges ? 'disabled' : ''}`}
                disabled={!hasChanges}
              >
                Save Weights
              </button>
            </div>
          </div>

          <div className="preview-section">
            <h3>Preview</h3>
            <button
              className="toggle-preview"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Hide' : 'Show'} Preview
            </button>

            {showPreview && (
              <div className="preview-content">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Criterion</th>
                      <th>Weight</th>
                      <th>Max Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(weights).map(([criterion, weight]) => (
                      <tr key={criterion}>
                        <td>{criterionInfo[criterion]?.label || criterion}</td>
                        <td>{(weight * 100).toFixed(0)}%</td>
                        <td>{criterionInfo[criterion]?.max || 10}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="import-export-section">
            <h3>Import/Export</h3>
            <div className="export-actions">
              <button onClick={handleExport} className="export-button">
                Export Configuration
              </button>
            </div>

            <div className="import-area">
              <label className="import-label">
                Import Configuration (JSON)
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="import-file-input"
                />
              </label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='Paste rubric configuration JSON here...'
                className="import-textarea"
              />
              {importError && (
                <div className="import-error">{importError}</div>
              )}
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className={`import-button ${!importText.trim() ? 'disabled' : ''}`}
              >
                Import Configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RubricEditor;
