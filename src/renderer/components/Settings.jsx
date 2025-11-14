import React, { useState, useEffect } from 'react';

function Settings({ isOpen, onClose }) {
  const [settings, setSettings] = useState({
    lmstudioUrl: 'http://localhost:1234',
    selectedModels: []
  });
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadAvailableModels();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const result = await window.electronAPI.getSettings();
      if (result.success) {
        setSettings({
          lmstudioUrl: result.data.lmstudioUrl || 'http://localhost:1234',
          selectedModels: result.data.selectedModels || []
        });
        setError(null);
      } else {
        setError('Failed to load settings');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const loadAvailableModels = async () => {
    setLoadingModels(true);
    try {
      const result = await window.electronAPI.getModels();
      if (result.success) {
        setAvailableModels(result.data || []);
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleModelToggle = (modelId) => {
    const currentSelected = settings.selectedModels || [];
    const newSelected = currentSelected.includes(modelId)
      ? currentSelected.filter(id => id !== modelId)
      : [...currentSelected, modelId];
    setSettings({ ...settings, selectedModels: newSelected });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setTestResult(null);

    try {
      // Validate URL format
      try {
        new URL(settings.lmstudioUrl);
      } catch {
        setError('Invalid URL format. Please use format: http://hostname:port');
        setSaving(false);
        return;
      }

      const result = await window.electronAPI.saveSettings(settings);
      if (result.success) {
        setTestResult({ success: true, message: 'Settings saved successfully!' });
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setError(result.error || 'Failed to save settings');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      // Validate URL format
      try {
        new URL(settings.lmstudioUrl);
      } catch {
        setError('Invalid URL format. Please use format: http://hostname:port');
        setLoading(false);
        return;
      }

      const result = await window.electronAPI.testConnection(settings.lmstudioUrl);
      if (result.success) {
        if (result.connected) {
          setTestResult({ success: true, message: 'Connection successful! LMStudio is accessible.' });
        } else {
          setTestResult({ success: false, message: `Connection failed: ${result.error || 'Unknown error'}` });
        }
      } else {
        setError(result.error || 'Failed to test connection');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>LMStudio Configuration</h3>
            
            <div className="settings-field">
              <label htmlFor="lmstudio-url">LMStudio API URL</label>
              <input
                id="lmstudio-url"
                type="text"
                value={settings.lmstudioUrl}
                onChange={(e) => setSettings({ ...settings, lmstudioUrl: e.target.value })}
                placeholder="http://localhost:1234"
                disabled={saving}
              />
              <p className="settings-hint">
                Enter the URL where LMStudio API server is running (e.g., http://localhost:1234 or http://192.168.1.100:1234)
              </p>
            </div>

            <div className="settings-actions">
              <button
                className="settings-button secondary"
                onClick={handleTest}
                disabled={loading || saving}
              >
                {loading ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                className="settings-button primary"
                onClick={handleSave}
                disabled={saving || loading}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            {testResult && (
              <div className={`settings-message ${testResult.success ? 'success' : 'error'}`}>
                {testResult.message}
              </div>
            )}

            {error && (
              <div className="settings-message error">
                {error}
              </div>
            )}
          </div>

          <div className="settings-section">
            <h3>Model Selection</h3>
            
            {loadingModels ? (
              <div className="settings-message" style={{ color: '#858585' }}>
                Loading available models...
              </div>
            ) : availableModels.length === 0 ? (
              <div className="settings-message error">
                No models available. Please ensure LMStudio is running and models are loaded.
              </div>
            ) : (
              <>
                <div className="settings-field">
                  <label>Select models to use for code generation:</label>
                  <div className="model-list">
                    {availableModels.map((model) => (
                      <label key={model} className="model-checkbox">
                        <input
                          type="checkbox"
                          checked={(settings.selectedModels || []).includes(model)}
                          onChange={() => handleModelToggle(model)}
                          disabled={saving}
                        />
                        <span>{model}</span>
                      </label>
                    ))}
                  </div>
                  <p className="settings-hint">
                    Select one or more models. The app will use multi-model deliberation with selected models.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;

