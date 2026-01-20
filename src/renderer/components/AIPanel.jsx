import React, { useEffect, useRef } from 'react';
import { useStore } from '../store';

/**
 * @typedef {Object} AIPanelProps
 * @property {string} [activeFile] - Currently active file path/name
 * @property {string} [code] - Current code content
 * @property {string} [language] - Programming language
 * @property {Array<string>} [models] - Available models list
 * @property {boolean} isConnected - Whether LMStudio is connected
 * @property {Object<string, string>} [files] - Map of existing file contents for multi-file projects
 * @property {Function} [onCodeGenerated] - Callback when code is generated
 * @property {Function} [onDeliberationUpdate] - Callback for deliberation updates
 */

/**
 * AI Panel Component
 *
 * Provides UI for AI-assisted code generation, editing, and analysis.
 * Supports three modes: Generate Code, Edit Code, and Analyze Code.
 * Integrates with the PolyCouncil orchestrator for multi-model deliberation.
 *
 * Features:
 * - Multi-mode operation (generate, edit, analyze)
 * - Real-time progress tracking with phase updates
 * - File diff visualization
 * - Multi-file project support
 * - Safety mechanisms to prevent stuck loading states
 * - Connection status indicator
 * - Error handling and display
 *
 * @param {AIPanelProps} props - Component props
 * @returns {JSX.Element} AI Panel component
 */
function AIPanel({ activeFile, code, language, files = {}, onCodeGenerated, onDeliberationUpdate }) {
  // Select state from store
  const currentPrompt = useStore(state => state.ai.currentPrompt);
  const currentInstruction = useStore(state => state.ai.currentInstruction);
  const loading = useStore(state => state.ai.loading);
  const result = useStore(state => state.ai.result);
  const error = useStore(state => state.ai.error);
  const mode = useStore(state => state.ai.mode);
  const deliberationMessages = useStore(state => state.ai.deliberationMessages);
  const currentPhase = useStore(state => state.ai.currentPhase);
  const progressPercent = useStore(state => state.ai.progressPercent);
  const isConnected = useStore(state => state.ai.isConnected);

  // Select actions from store
  const setCurrentPrompt = useStore(state => state.setCurrentPrompt);
  const setCurrentInstruction = useStore(state => state.setCurrentInstruction);
  const setAiLoading = useStore(state => state.setAiLoading);
  const setAiError = useStore(state => state.setAiError);
  const setAiResult = useStore(state => state.setAiResult);
  const setAiMode = useStore(state => state.setAiMode);
  const setDeliberationMessages = useStore(state => state.setDeliberationMessages);
  const setAiPhase = useStore(state => state.setAiPhase);
  const setAiProgress = useStore(state => state.setAiProgress);

  const textareaRef = useRef(null);

  // Safety check: Ensure loading state doesn't get stuck
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn('Loading state stuck for 5 minutes, resetting...');
        setAiLoading(false);
        setAiPhase('');
        setAiProgress(0);
      }, 5 * 60 * 1000);
      return () => clearTimeout(timeout);
    }
  }, [loading, setAiLoading, setAiPhase, setAiProgress]);

  // Debug: Log state changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('AIPanel state changed:', { loading, isConnected, hasPrompt: !!currentPrompt.trim() });
    }
  }, [loading, isConnected, currentPrompt]);

  // Safety mechanism: Ensure loading state is reset if it's been false for a while
  useEffect(() => {
    if (!loading) {
      const checkInterval = setInterval(() => {
        if (!loading && (currentPhase || progressPercent > 0)) {
          console.warn('Resetting stuck progress state');
          setAiPhase('');
          setAiProgress(0);
        }
      }, 1000);
      return () => clearInterval(checkInterval);
    }
  }, [loading, currentPhase, progressPercent, setAiPhase, setAiProgress]);

  // Force enable textarea when loading becomes false
  useEffect(() => {
    if (!loading && textareaRef.current) {
      textareaRef.current.disabled = false;
      textareaRef.current.readOnly = false;
      if (document.activeElement !== textareaRef.current) {
        textareaRef.current.focus();
        setTimeout(() => {
          if (textareaRef.current && document.activeElement !== textareaRef.current) {
            textareaRef.current.blur();
          }
        }, 10);
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('Forced textarea enable, disabled:', textareaRef.current.disabled);
      }
    }
  }, [loading]);

  // Listen for window events that might indicate a re-render is needed
  useEffect(() => {
    const handleWindowEvent = () => {
      if (!loading && textareaRef.current && textareaRef.current.disabled) {
        console.warn('Window event detected, forcing textarea enable');
        textareaRef.current.disabled = false;
        textareaRef.current.readOnly = false;
      }
    };

    window.addEventListener('focus', handleWindowEvent);
    window.addEventListener('resize', handleWindowEvent);
    window.addEventListener('visibilitychange', handleWindowEvent);

    return () => {
      window.removeEventListener('focus', handleWindowEvent);
      window.removeEventListener('resize', handleWindowEvent);
      window.removeEventListener('visibilitychange', handleWindowEvent);
    };
  }, [loading]);

  const handleGenerate = async () => {
    if (!currentPrompt.trim() || !isConnected) return;
    if (loading) {
      console.warn('Generation already in progress, ignoring request');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    setAiPhase('Initializing...');
    setAiProgress(0);
    const prompt = currentPrompt; // Save prompt before clearing

    // Clear previous deliberation messages and add initial message
    const initialMessages = [{
      type: 'deliberation',
      model: 'System',
      content: `Starting deliberation for: "${prompt}"`,
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
          setAiPhase(message.phase);
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
          setAiProgress(progress);
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
      const currentCodeContext = code || '';
      const existingFiles = files || {};
      const response = await window.electronAPI.generateCode(prompt, currentCodeContext, null, existingFiles);
      if (response.success) {
        const resultData = response.data;

        let updatedMessages = [...initialMessages];

        if (resultData.deliberationData) {
          updatedMessages = [...updatedMessages, ...resultData.deliberationData];
        }

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

        setAiResult({
          type: 'generation',
          code: resultData.code,
          files: resultData.files,
          isMultiFile: resultData.isMultiFile,
          model: resultData.model,
          score: resultData.score,
          deliberation: resultData.deliberation
        });

        if (onCodeGenerated) {
          onCodeGenerated(resultData);
        }

        // Clear prompt after successful generation
        setCurrentPrompt('');
      } else {
        setAiError(response.error || 'Generation failed');
        setAiLoading(false);
      }
    } catch (err) {
      setAiError(err.message || 'An error occurred');
      setAiLoading(false);
    } finally {
      setAiLoading(false);
      setAiPhase('');
      setAiProgress(0);
    }
  };

  const handleEdit = async () => {
    if (!currentInstruction.trim() || !code || !isConnected || loading) return;

    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    setAiPhase('Initializing edit...');
    setAiProgress(0);
    const instruction = currentInstruction; // Save instruction before clearing

    // Set up IPC listener for this edit session
    if (window.electronAPI && window.electronAPI.onDeliberationUpdate) {
      // Remove any existing listeners first
      if (window.electronAPI.removeDeliberationListener) {
        window.electronAPI.removeDeliberationListener();
      }

      // Set up new listener for real-time updates
      const handleUpdate = (message) => {
        if (message.phase) {
          setAiPhase(message.phase);
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
          setAiProgress(progress);
        }
      };

      window.electronAPI.onDeliberationUpdate(handleUpdate);
    }

    try {
      const response = await window.electronAPI.editCode(code, instruction, '');
      if (response.success) {
        const editedCode = response.data.code;
        setAiResult({
          type: 'edit',
          code: editedCode,
          model: response.data.model,
          score: response.data.score
        });
        if (onCodeGenerated) {
          onCodeGenerated(editedCode, instruction);
        }
        setCurrentInstruction('');
      } else {
        setAiError(response.error || 'Edit failed');
        setAiLoading(false);
        setAiPhase('');
        setAiProgress(0);
      }
    } catch (err) {
      setAiError(err.message || 'An error occurred');
      setAiLoading(false);
      setAiPhase('');
      setAiProgress(0);
    } finally {
      setAiLoading(false);
      setAiPhase('');
      setAiProgress(0);
    }
  };

  const handleAnalyze = async () => {
    if (!code || !isConnected) return;

    setAiLoading(true);
    setAiError(null);
    setAiResult(null);

    try {
      const response = await window.electronAPI.analyzeCode(code, language);
      if (response.success) {
        setAiResult({
          type: 'analysis',
          analyses: response.data.analyses,
          rubricScores: response.data.rubricScores,
          weightedScore: response.data.weightedScore,
          recommendation: response.data.recommendation
        });
      } else {
        setAiError(response.error || 'Analysis failed');
      }
    } catch (err) {
      setAiError(err.message || 'An error occurred');
    } finally {
      setAiLoading(false);
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
          <select value={mode} onChange={(e) => setAiMode(e.target.value)}>
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
                ref={textareaRef}
                value={currentPrompt}
                onChange={(e) => {
                  setCurrentPrompt(e.target.value);
                }}
                placeholder="Describe what code you want to generate..."
                disabled={loading}
                readOnly={false}
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
              disabled={!currentPrompt.trim() || loading || !isConnected}
              title={!isConnected ? 'Please connect to LMStudio first (check Settings)' : !currentPrompt.trim() ? 'Enter a prompt' : loading ? 'Generating...' : 'Generate Code'}
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
              </div>
            )}
          </>
        )}

        {mode === 'edit' && (
          <>
            <div className="ai-input-group">
              <label>Edit Instruction</label>
              <textarea
                value={currentInstruction}
                onChange={(e) => setCurrentInstruction(e.target.value)}
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
              disabled={!currentInstruction.trim() || loading || !isConnected || !activeFile}
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
