import React from 'react';

function SaveDialog({
  isOpen,
  fileName,
  onSave,
  onDontSave,
  onCancel,
  multipleFiles = false,
  unsavedFiles = []
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal save-dialog">
        <div className="modal-header">
          <h2>Unsaved Changes</h2>
        </div>
        <div className="modal-body">
          {multipleFiles ? (
            <>
              <p>You have unsaved changes in the following files:</p>
              <ul className="unsaved-files-list">
                {unsavedFiles.map(file => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
              <p>Do you want to save these changes before closing?</p>
            </>
          ) : (
            <p>Do you want to save changes to <strong>{fileName}</strong>?</p>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            autoFocus
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={onDontSave}
          >
            Don't Save
          </button>
          <button
            className="btn btn-primary"
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default SaveDialog;
