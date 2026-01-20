import React, { useState, useEffect } from 'react';
import { getShortcutsManager } from '../utils/shortcuts';

/**
 * Keyboard Shortcuts Help Dialog
 *
 * Displays all available keyboard shortcuts in a modal
 */

const ShortcutHelp = ({ isOpen, onClose }) => {
  const [shortcuts, setShortcuts] = useState({});
  const [filter, setFilter] = useState('');
  const manager = getShortcutsManager();

  useEffect(() => {
    if (isOpen) {
      setShortcuts(manager.getAllShortcuts());
    }
  }, [isOpen, manager]);

  const groupedShortcuts = () => {
    const groups = {
      'File Operations': [],
      'Editor Operations': [],
      'IDE Operations': [],
      'AI Operations': []
    };

    for (const [name, shortcut] of Object.entries(shortcuts)) {
      if (filter && !name.toLowerCase().includes(filter.toLowerCase()) &&
          !shortcut.description.toLowerCase().includes(filter.toLowerCase())) {
        continue;
      }

      if (['newFile', 'openFile', 'saveFile', 'saveAs', 'closeFile'].includes(name)) {
        groups['File Operations'].push({ name, ...shortcut });
      } else if (['undo', 'redo', 'find', 'replace', 'format'].includes(name)) {
        groups['Editor Operations'].push({ name, ...shortcut });
      } else if (['toggleTerminal', 'toggleSidebar', 'toggleSettings', 'showShortcuts', 'runCode'].includes(name)) {
        groups['IDE Operations'].push({ name, ...shortcut });
      } else if (['generateCode', 'editCode', 'analyzeCode', 'toggleAI'].includes(name)) {
        groups['AI Operations'].push({ name, ...shortcut });
      }
    }

    return groups;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay shortcut-help-modal">
      <div className="modal-content shortcut-help-content">
        <div className="modal-header">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <button
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="shortcut-search">
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="shortcut-search-input"
            />
          </div>

          {Object.entries(groupedShortcuts()).map(([groupName, groupShortcuts]) => {
            if (groupShortcuts.length === 0) return null;

            return (
              <div key={groupName} className="shortcut-group">
                <h3 className="shortcut-group-title">{groupName}</h3>
                <table className="shortcuts-table">
                  <tbody>
                    {groupShortcuts.map(shortcut => (
                      <tr key={shortcut.name} className="shortcut-row">
                        <td className="shortcut-description">
                          {shortcut.description}
                        </td>
                        <td className="shortcut-key">
                          <kbd className="key-binding">{shortcut.binding}</kbd>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}

          {Object.values(groupedShortcuts()).every(group => group.length === 0) && (
            <div className="no-shortcuts-found">
              <p>No shortcuts found matching "{filter}"</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <p className="shortcut-hint">
            💡 Tip: You can customize keyboard shortcuts in Settings
          </p>
          <button
            className="modal-close-button button-primary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShortcutHelp;
