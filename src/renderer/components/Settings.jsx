import React, { useEffect } from 'react';
import { useStore } from '../store';

function Settings({ isOpen, onClose }) {
  // Select state from store
  const settings = useStore(state => state.settings);
  const showSettings = useStore(state => state.ui.showSettings);
  
  // Select actions from store
  const setLmstudioUrl = useStore(state => state.setLmstudioUrl);
  const setLmstudioPort = useStore(state => state.setLmstudioPort);
  const setSelectedModels = useStore(state => state.setSelectedModels);

  // Local component state
  const [availableModels, setAvailableModels] = React.useState([]);
  const [loadingModels, setLoadingModels] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [testResult, setTestResult] = React.useState(null);
  const [error, setError] = React.useState(null);

  useEffect(() => {
    if (isOpen) {
      loadAvailableModels();
    }
  }, [isOpen]);

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
    setSelectedModels(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setTestResult(null);
    
    try {
      // Validate URL format (hostname only, port separate)
      const urlPattern = /^https?:\/\/[^:\/]+$/;
      if (!urlPattern.test(settings.lmstudioUrl)) {
        setError('Invalid URL format. Please use format: http://hostname (without port)');
        setSaving(false);
        return;
      }

      // Validate port format (number)
      const port = parseInt(settings.lmstudioPort, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        setError('Invalid port number. Please enter a value between 1 and 65535');
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
    const loading = true;
    setError(null);
    setTestResult(null);
    
    try {
      // Construct full URL from hostname and port
      const { lmstudioUrl, lmstudioPort } = settings;
      const urlPattern = /^https?:\/\/[^:\/]+$/;
      
      // Validate hostname (URL without port)
      if (!urlPattern.test(lmstudioUrl)) {
        setError('Invalid URL format. Please use format: http://hostname (without port)');
        setLoadingModels(false);
        return;
      }

      // Validate port format
      const port = parseInt(lmstudioPort, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        setError('Invalid port number. Please enter a value between 1 and 65535');
        setLoadingModels(false);
        return;
      }

      // Build full URL with port if specified
      const fullUrl = port && port !== '1234' 
        ? `${lmstudioUrl.replace(/\/$/, '')}:${port}` 
        : lmstudioUrl;

      const result = await window.electronAPI.testConnection(fullUrl);
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
      setLoadingModels(false);
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
                onChange={(e) => setLmstudioUrl(e.target.value)}
                placeholder="http://localhost"
                disabled={saving}
              />
              <p className="settings-hint">
                Hostname or IP address (e.g., localhost, 192.168.1.100)
              </p>
            </div>

            <div className="settings-field">
              <label htmlFor="lmstudio-port">LMStudio Port</label>
              <input
                id="lmstudio-port"
                type="text"
                value={settings.lmstudioPort}
                onChange={(e) => setLmstudioPort(e.target.value)}
                placeholder="1234"
                disabled={saving}
              />
              <p className="settings-hint">
                Port number (default: 1234)
              </p>
            </div>

            <div className="settings-actions">
              <button
                className="settings-button secondary"
                onClick={handleTest}
                disabled={loadingModels || saving}
              >
                {loadingModels ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                className="settings-button primary"
                onClick={handleSave}
                disabled={saving || loadingModels}
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
