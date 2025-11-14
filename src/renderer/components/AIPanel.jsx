import React, { useState } from 'react';

function AIPanel({ activeFile, code, language, models, isConnected, onCodeGenerated }) {
  const [prompt, setPrompt] = useState('');
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('generate'); // 'generate', 'edit', 'analyze'

  const handleGenerate = async () => {
    if (!prompt.trim() || !isConnected) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Pass null for language - let models decide during deliberation
      const response = await window.electronAPI.generateCode(prompt, code || '', null);
      if (response.success) {
        const generatedCode = response.data.code;
        setResult({
          type: 'generation',
          code: generatedCode,
          model: response.data.model,
          score: response.data.score,
          deliberation: response.data.deliberation
        });
        // Insert code into editor if callback provided (pass prompt for language detection)
        if (onCodeGenerated) {
          onCodeGenerated(generatedCode, prompt);
        }
      } else {
        setError(response.error || 'Generation failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!instruction.trim() || !code || !isConnected) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await window.electronAPI.editCode(code, instruction, '');
      if (response.success) {
        const editedCode = response.data.code;
        setResult({
          type: 'edit',
          code: editedCode,
          model: response.data.model,
          score: response.data.score
        });
        // Insert edited code into editor if callback provided
        if (onCodeGenerated) {
          onCodeGenerated(editedCode, instruction);
        }
      } else {
        setError(response.error || 'Edit failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!code || !isConnected) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await window.electronAPI.analyzeCode(code, language);
      if (response.success) {
        setResult({
          type: 'analysis',
          analyses: response.data.analyses,
          rubricScores: response.data.rubricScores,
          weightedScore: response.data.weightedScore,
          recommendation: response.data.recommendation
        });
      } else {
        setError(response.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const applyResult = () => {
    if (result && result.code) {
      // This would typically update the editor content
      // For now, we'll just show it - integration with editor would be next step
      alert('Code generated! Check the result below. Integration with editor coming soon.');
    }
  };

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <h3>AI Assistant</h3>
        <div style={{ fontSize: '0.75rem', color: isConnected ? '#4ec9b0' : '#ff6b6b' }}>
          {isConnected ? '✓ Connected' : '✗ Disconnected'}
        </div>
      </div>

      <div className="ai-panel-content" style={{ overflowY: 'auto', flex: 1 }}>
        <div className="ai-input-group">
          <label>Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="generate">Generate Code</option>
            <option value="edit">Edit Code</option>
            <option value="analyze">Analyze Code</option>
          </select>
        </div>

        {mode === 'generate' && (
          <>
            <div className="ai-input-group">
              <label>Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what code you want to generate..."
                disabled={!isConnected}
              />
            </div>
            <button
              className="ai-button"
              onClick={handleGenerate}
              disabled={!prompt.trim() || loading || !isConnected}
            >
              {loading ? 'Generating...' : 'Generate Code'}
            </button>
          </>
        )}

        {mode === 'edit' && (
          <>
            <div className="ai-input-group">
              <label>Edit Instruction</label>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Describe how to edit the code..."
                disabled={!isConnected || !activeFile}
              />
            </div>
            <button
              className="ai-button"
              onClick={handleEdit}
              disabled={!instruction.trim() || loading || !isConnected || !activeFile}
            >
              {loading ? 'Editing...' : 'Edit Code'}
            </button>
          </>
        )}

        {mode === 'analyze' && (
          <>
            <div className="ai-input-group">
              <label>Code Analysis</label>
              <p style={{ fontSize: '0.85rem', color: '#858585', marginTop: '0.5rem' }}>
                Analyze the current file for quality, correctness, and best practices.
              </p>
            </div>
            <button
              className="ai-button"
              onClick={handleAnalyze}
              disabled={loading || !isConnected || !activeFile}
            >
              {loading ? 'Analyzing...' : 'Analyze Code'}
            </button>
          </>
        )}

        {loading && (
          <div className="ai-loading">
            <div>Models are discussing the project...</div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#858585' }}>
              Phase 1: Deliberation → Phase 2: Consensus → Phase 3: Code Generation → Phase 4: Evaluation
            </div>
            <div style={{ fontSize: '0.7rem', marginTop: '0.5rem', color: '#666' }}>
              This may take a moment as models collaborate...
            </div>
          </div>
        )}

        {error && (
          <div className="ai-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="ai-result">
            <div className="ai-result-header">
              <span>
                {result.type === 'generation' && 'Generated Code'}
                {result.type === 'edit' && 'Edited Code'}
                {result.type === 'analysis' && 'Code Analysis'}
              </span>
              {result.model && (
                <span style={{ fontSize: '0.75rem' }}>
                  Model: {result.model}
                </span>
              )}
            </div>

                {result.code && (
              <>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#4ec9b0', marginBottom: '0.5rem' }}>
                  ✓ Code has been inserted into the editor
                </div>
                {result.score !== undefined && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#858585' }}>
                    Quality Score: {result.score.toFixed(2)}/10
                  </div>
                )}
                {result.deliberation && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#858585' }}>
                    {result.deliberation.rounds || 0} deliberation rounds, {result.deliberation.totalGenerations} generations, {result.deliberation.totalEvaluations} evaluations
                  </div>
                )}
              </>
            )}

            {result.analyses && (
              <div>
                {result.analyses.map((analysis, idx) => (
                  <div key={idx} style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#858585', marginBottom: '0.25rem' }}>
                      {analysis.model}
                    </div>
                    <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                      {analysis.analysis}
                    </div>
                  </div>
                ))}
                {result.rubricScores && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #3e3e42' }}>
                    <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      <strong>Rubric Scores:</strong>
                    </div>
                    {Object.entries(result.rubricScores).map(([criterion, score]) => (
                      <div key={criterion} style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        {criterion}: {score.toFixed(1)}/10
                      </div>
                    ))}
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      <strong>Weighted Score: {result.weightedScore.toFixed(2)}/10</strong>
                      <span style={{ marginLeft: '0.5rem', color: result.recommendation === 'high' ? '#4ec9b0' : result.recommendation === 'medium' ? '#dcdcaa' : '#ff6b6b' }}>
                        ({result.recommendation} quality)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!isConnected && (
          <div style={{ padding: '1rem', background: '#2d2d30', borderRadius: '4px', marginTop: '1rem' }}>
            <div style={{ fontSize: '0.85rem', color: '#ff6b6b', marginBottom: '0.5rem' }}>
              LMStudio not connected
            </div>
            <div style={{ fontSize: '0.75rem', color: '#858585' }}>
              Please start LMStudio and ensure it's running on http://localhost:1234
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AIPanel;

