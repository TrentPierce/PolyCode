import React, { useState } from 'react';

function AIPanel({ activeFile, code, language, models, isConnected, files = {}, onCodeGenerated, onDeliberationUpdate }) {
  const [prompt, setPrompt] = useState('');
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('generate'); // 'generate', 'edit', 'analyze'
  const [deliberationMessages, setDeliberationMessages] = useState([]);
  const [currentPhase, setCurrentPhase] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  // Note: IPC listener is set up dynamically in handleGenerate to ensure it's active during generation

  const handleGenerate = async () => {
    if (!prompt.trim() || !isConnected) return;
    if (loading) {
      console.warn('Generation already in progress, ignoring request');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentPhase('Initializing...');
    setProgressPercent(0);
    const currentPrompt = prompt; // Save prompt before clearing

    // Clear previous deliberation messages and add initial message
    const initialMessages = [{
      type: 'deliberation',
      model: 'System',
      content: `Starting deliberation for: "${currentPrompt}"`,
      phase: 'Initialization'
    }];
    setDeliberationMessages(initialMessages);
    if (onDeliberationUpdate) {
      onDeliberationUpdate(initialMessages);
    }
    
    // Set up IPC listener for this generation session
    if (window.electronAPI && window.electronAPI.onDeliberationUpdate) {
      // Remove any existing listeners first
      if (window.electronAPI.removeDeliberationListener) {
        window.electronAPI.removeDeliberationListener();
      }
      
      // Set up new listener for real-time updates
      const handleUpdate = (message) => {
        // Update current phase and progress
        if (message.phase) {
          setCurrentPhase(message.phase);
          // Estimate progress based on phase
          let progress = 0;
          if (message.phase.includes('Deliberation')) {
            progress = 25;
          } else if (message.phase.includes('Consensus')) {
            progress = 50;
          } else if (message.phase.includes('Generation')) {
            progress = 75;
          } else if (message.phase.includes('Evaluation')) {
            progress = 90;
          } else if (message.phase.includes('Complete')) {
            progress = 100;
          }
          setProgressPercent(progress);
        }
        
        setDeliberationMessages(prev => {
          const updated = [...prev, message];
          if (onDeliberationUpdate) {
            onDeliberationUpdate(updated);
          }
          return updated;
        });
      };
      
      window.electronAPI.onDeliberationUpdate(handleUpdate);
    }

    try {
      // Pass current code as context so models can review it before making changes
      // Pass null for language - let models decide during deliberation
      const currentCodeContext = code || '';
      // Pass existing files to track changes (for multi-file projects)
      const existingFiles = files || {};
      const response = await window.electronAPI.generateCode(currentPrompt, currentCodeContext, null, existingFiles);
      if (response.success) {
        const resultData = response.data;
        
        // Build updated messages with deliberation data
        let updatedMessages = [...initialMessages];
        
        // Add deliberation messages from result
        if (resultData.deliberationData) {
          updatedMessages = [...updatedMessages, ...resultData.deliberationData];
        }
        
        // Add final result message
        if (resultData.files && resultData.isMultiFile) {
          updatedMessages.push({
            type: 'file',
            model: resultData.model,
            content: `Generated ${Object.keys(resultData.files).length} files based on team consensus`,
            files: Object.keys(resultData.files),
            phase: 'Complete'
          });
        } else {
          updatedMessages.push({
            type: 'generation',
            model: resultData.model,
            content: `Code generation complete. Quality score: ${resultData.score?.toFixed(2) || 'N/A'}/10`,
            phase: 'Complete'
          });
        }
        
        setDeliberationMessages(updatedMessages);
        if (onDeliberationUpdate) {
          onDeliberationUpdate(updatedMessages);
        }
        
        setResult({
          type: 'generation',
          code: resultData.code,
          files: resultData.files,
          isMultiFile: resultData.isMultiFile,
          model: resultData.model,
          score: resultData.score,
          deliberation: resultData.deliberation
        });
        // Pass full result to handler for multi-file support
        if (onCodeGenerated) {
          onCodeGenerated(resultData);
        }
        // Clear prompt after successful generation so user can type new request
        setPrompt('');
      } else {
        setError(response.error || 'Generation failed');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    } finally {
      // Always reset loading state
      setLoading(false);
      setCurrentPhase('');
      setProgressPercent(0);
    }
  };

  const handleEdit = async () => {
    if (!instruction.trim() || !code || !isConnected || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentPhase('Initializing edit...');
    setProgressPercent(0);
    const currentInstruction = instruction; // Save instruction before clearing

    // Set up IPC listener for this edit session
    if (window.electronAPI && window.electronAPI.onDeliberationUpdate) {
      // Remove any existing listeners first
      if (window.electronAPI.removeDeliberationListener) {
        window.electronAPI.removeDeliberationListener();
      }
      
      // Set up new listener for real-time updates
      const handleUpdate = (message) => {
        // Update current phase and progress
        if (message.phase) {
          setCurrentPhase(message.phase);
          // Estimate progress based on phase
          let progress = 0;
          if (message.phase.includes('Deliberation')) {
            progress = 25;
          } else if (message.phase.includes('Consensus')) {
            progress = 50;
          } else if (message.phase.includes('Generation')) {
            progress = 75;
          } else if (message.phase.includes('Evaluation')) {
            progress = 90;
          } else if (message.phase.includes('Complete')) {
            progress = 100;
          }
          setProgressPercent(progress);
        }
      };
      
      window.electronAPI.onDeliberationUpdate(handleUpdate);
    }

    try {
      const response = await window.electronAPI.editCode(code, currentInstruction, '');
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
          onCodeGenerated(editedCode, currentInstruction);
        }
        // Clear instruction after successful edit so user can type new request
        setInstruction('');
      } else {
        setError(response.error || 'Edit failed');
        setLoading(false);
        setCurrentPhase('');
        setProgressPercent(0);
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      setLoading(false);
      setCurrentPhase('');
      setProgressPercent(0);
    } finally {
      // Always reset loading state
      setLoading(false);
      setCurrentPhase('');
      setProgressPercent(0);
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
                disabled={loading}
                readOnly={loading}
                style={{ 
                  cursor: loading ? 'not-allowed' : 'text',
                  opacity: loading ? 0.6 : 1,
                  backgroundColor: loading ? '#1a1a1a' : '#1e1e1e'
                }}
              />
            </div>
            <button
              className="ai-button"
              onClick={handleGenerate}
              disabled={!prompt.trim() || loading || !isConnected}
              title={!isConnected ? 'Please connect to LMStudio first (check Settings)' : !prompt.trim() ? 'Enter a prompt' : loading ? 'Generating...' : 'Generate Code'}
            >
              {loading ? 'Generating...' : !isConnected ? 'Not Connected' : 'Generate Code'}
            </button>
            {loading && mode === 'generate' && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  fontSize: '0.85rem',
                  color: '#858585'
                }}>
                  <div className="spinner" style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #3e3e42',
                    borderTop: '2px solid #4ec9b0',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span>{currentPhase || 'Processing...'}</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: '#3e3e42',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    backgroundColor: '#4ec9b0',
                    transition: 'width 0.3s ease',
                    borderRadius: '2px'
                  }}></div>
                </div>
                <div style={{ 
                  fontSize: '0.7rem', 
                  color: '#666', 
                  marginTop: '0.25rem',
                  textAlign: 'center'
                }}>
                  This may take several minutes on slower systems...
                </div>
              </div>
            )}
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
                disabled={!isConnected || !activeFile || loading}
                style={{ 
                  cursor: (!isConnected || !activeFile || loading) ? 'not-allowed' : 'text',
                  opacity: (!isConnected || !activeFile || loading) ? 0.6 : 1
                }}
              />
            </div>
            <button
              className="ai-button"
              onClick={handleEdit}
              disabled={!instruction.trim() || loading || !isConnected || !activeFile}
            >
              {loading ? 'Editing...' : 'Edit Code'}
            </button>
            {loading && mode === 'edit' && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  fontSize: '0.85rem',
                  color: '#858585'
                }}>
                  <div className="spinner" style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #3e3e42',
                    borderTop: '2px solid #4ec9b0',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span>{currentPhase || 'Processing edit...'}</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: '#3e3e42',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    backgroundColor: '#4ec9b0',
                    transition: 'width 0.3s ease',
                    borderRadius: '2px'
                  }}></div>
                </div>
                <div style={{ 
                  fontSize: '0.7rem', 
                  color: '#666', 
                  marginTop: '0.25rem',
                  textAlign: 'center'
                }}>
                  This may take several minutes on slower systems...
                </div>
              </div>
            )}
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
                  {result.isMultiFile && result.files ? (
                    <>✓ {Object.keys(result.files).length} files created and inserted into the editor</>
                  ) : (
                    <>✓ Code has been inserted into the editor</>
                  )}
                </div>
                {result.isMultiFile && result.files && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#858585' }}>
                    Files: {Object.keys(result.files).join(', ')}
                  </div>
                )}
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

