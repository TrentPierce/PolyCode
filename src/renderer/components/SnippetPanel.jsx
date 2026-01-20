import React, { useState, useEffect } from 'react';
import snippetManager, { getSnippets, addCustomSnippet, deleteCustomSnippet, getAllSnippets } from '../utils/snippets';

function SnippetPanel({ isOpen, onClose, currentLanguage, onSnippetSelect, editorRef }) {
  const [snippets, setSnippets] = useState({});
  const [filter, setFilter] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage || 'javascript');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSnippet, setNewSnippet] = useState({
    prefix: '',
    description: '',
    body: '',
    language: currentLanguage || 'javascript'
  });
  const [selectedSnippet, setSelectedSnippet] = useState(null);

  // Load snippets when panel opens or language changes
  useEffect(() => {
    if (isOpen) {
      loadAllSnippets();
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentLanguage) {
      setSelectedLanguage(currentLanguage);
      setNewSnippet(prev => ({ ...prev, language: currentLanguage }));
    }
  }, [currentLanguage]);

  const loadAllSnippets = async () => {
    try {
      const allSnippets = snippetManager.getAllSnippets();
      setSnippets(allSnippets);
    } catch (error) {
      console.error('Failed to load snippets:', error);
    }
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const handleLanguageChange = (e) => {
    setSelectedLanguage(e.target.value);
  };

  const handleSnippetClick = (snippet) => {
    setSelectedSnippet(snippet);
    if (onSnippetSelect && snippet) {
      onSnippetSelect(snippet);
    }
  };

  const handleInsertSnippet = (snippet) => {
    if (onSnippetSelect) {
      onSnippetSelect(snippet);
      // Optional: Close panel after insert
      // onClose();
    }
  };

  const handleCreateNewSnippet = () => {
    setShowCreateForm(true);
    setNewSnippet({
      prefix: '',
      description: '',
      body: '',
      language: selectedLanguage
    });
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setNewSnippet({
      prefix: '',
      description: '',
      body: '',
      language: selectedLanguage
    });
  };

  const handleSaveSnippet = async (e) => {
    e.preventDefault();

    // Validate
    if (!newSnippet.prefix.trim()) {
      alert('Prefix is required');
      return;
    }
    if (!newSnippet.body.trim()) {
      alert('Body is required');
      return;
    }

    // Parse body (can be array or string)
    let body;
    try {
      if (newSnippet.body.startsWith('[')) {
        body = JSON.parse(newSnippet.body);
      } else {
        body = newSnippet.body.split('\n');
      }
    } catch {
      // If not JSON, treat as newline-separated
      body = newSnippet.body.split('\n');
    }

    const snippetToSave = {
      prefix: newSnippet.prefix,
      description: newSnippet.description || newSnippet.prefix,
      body: body,
      language: newSnippet.language
    };

    try {
      await addCustomSnippet(snippetToSave, newSnippet.language);
      await loadAllSnippets();
      setShowCreateForm(false);
      setNewSnippet({
        prefix: '',
        description: '',
        body: '',
        language: selectedLanguage
      });
    } catch (error) {
      alert('Failed to save snippet: ' + error.message);
    }
  };

  const handleDeleteSnippet = async (snippet) => {
    if (!confirm(`Are you sure you want to delete "${snippet.description || snippet.prefix}"?`)) {
      return;
    }

    try {
      await deleteCustomSnippet(snippet.prefix, snippet.language);
      await loadAllSnippets();
      if (selectedSnippet?.prefix === snippet.prefix && selectedSnippet?.language === snippet.language) {
        setSelectedSnippet(null);
      }
    } catch (error) {
      alert('Failed to delete snippet: ' + error.message);
    }
  };

  const getFilteredSnippets = () => {
    const langSnippets = snippets[selectedLanguage] || [];

    if (!filter) {
      return langSnippets;
    }

    const lowerFilter = filter.toLowerCase();
    return langSnippets.filter(snippet =>
      snippet.prefix?.toLowerCase().includes(lowerFilter) ||
      snippet.description?.toLowerCase().includes(lowerFilter)
    );
  };

  const getAvailableLanguages = () => {
    const languages = ['javascript', 'react', 'node', 'typescript', 'python', 'html', 'css', 'json'];
    return languages.filter(lang => snippets[lang] && snippets[lang].length > 0);
  };

  if (!isOpen) return null;

  const filteredSnippets = getFilteredSnippets();
  const availableLanguages = getAvailableLanguages();

  return (
    <div className="snippet-panel">
      <div className="snippet-panel-header">
        <h2>Snippets</h2>
        <button className="snippet-panel-close" onClick={onClose}>×</button>
      </div>

      <div className="snippet-panel-controls">
        <input
          type="text"
          className="snippet-filter-input"
          placeholder="Filter snippets..."
          value={filter}
          onChange={handleFilterChange}
        />
        <select
          className="snippet-language-select"
          value={selectedLanguage}
          onChange={handleLanguageChange}
        >
          <option value="javascript">JavaScript</option>
          <option value="react">React</option>
          <option value="node">Node.js</option>
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="json">JSON</option>
        </select>
        <button
          className="btn btn-primary snippet-create-button"
          onClick={handleCreateNewSnippet}
        >
          + New Snippet
        </button>
      </div>

      {showCreateForm ? (
        <div className="snippet-create-form">
          <h3>Create Custom Snippet</h3>
          <form onSubmit={handleSaveSnippet}>
            <div className="form-group">
              <label htmlFor="snippet-prefix">Prefix *</label>
              <input
                id="snippet-prefix"
                type="text"
                className="form-control"
                placeholder="e.g., mysnippet"
                value={newSnippet.prefix}
                onChange={(e) => setNewSnippet({ ...newSnippet, prefix: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="snippet-description">Description</label>
              <input
                id="snippet-description"
                type="text"
                className="form-control"
                placeholder="Snippet description"
                value={newSnippet.description}
                onChange={(e) => setNewSnippet({ ...newSnippet, description: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="snippet-language">Language</label>
              <select
                id="snippet-language"
                className="form-control"
                value={newSnippet.language}
                onChange={(e) => setNewSnippet({ ...newSnippet, language: e.target.value })}
              >
                <option value="javascript">JavaScript</option>
                <option value="react">React</option>
                <option value="node">Node.js</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="snippet-body">Body * (one line per array item)</label>
              <textarea
                id="snippet-body"
                className="form-control snippet-body-textarea"
                placeholder="line 1&#10;line 2&#10;line 3"
                value={newSnippet.body}
                onChange={(e) => setNewSnippet({ ...newSnippet, body: e.target.value })}
                required
                rows={6}
              />
              <small className="form-hint">Use {'${1:placeholder}'} for placeholders, {'${0}'} for final tabstop</small>
            </div>
            <div className="snippet-form-actions">
              <button type="button" className="btn btn-secondary" onClick={handleCancelCreate}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Snippet
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="snippet-list">
            {filteredSnippets.length === 0 ? (
              <div className="snippet-empty">
                {filter ? 'No snippets match your filter' : 'No snippets available for this language'}
              </div>
            ) : (
              filteredSnippets.map((snippet, index) => (
                <div
                  key={`${snippet.prefix}-${index}`}
                  className={`snippet-item ${selectedSnippet?.prefix === snippet.prefix ? 'active' : ''}`}
                  onClick={() => handleSnippetClick(snippet)}
                >
                  <div className="snippet-item-header">
                    <span className="snippet-prefix">{snippet.prefix}</span>
                    {snippet.isCustom && (
                      <button
                        className="snippet-delete-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSnippet(snippet);
                        }}
                        title="Delete custom snippet"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="snippet-description">{snippet.description}</div>
                </div>
              ))
            )}
          </div>

          {selectedSnippet && (
            <div className="snippet-preview">
              <h3>Preview: {selectedSnippet.description}</h3>
              <pre className="snippet-preview-code">
                {Array.isArray(selectedSnippet.body)
                  ? selectedSnippet.body.join('\n')
                  : selectedSnippet.body}
              </pre>
              <button
                className="btn btn-primary snippet-insert-button"
                onClick={() => handleInsertSnippet(selectedSnippet)}
              >
                Insert Snippet
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SnippetPanel;
