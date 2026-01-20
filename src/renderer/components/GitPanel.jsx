import React, { useState, useEffect } from 'react';
import './GitPanel.css';

const GitPanel = ({ isVisible, onClose, onFileClick }) => {
  const [gitStatus, setGitStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [showCommitInput, setShowCommitInput] = useState(false);
  const [history, setHistory] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [isGitRepo, setIsGitRepo] = useState(false);

  useEffect(() => {
    if (isVisible) {
      loadGitStatus();
      loadHistory();
      loadBranches();
      checkGitRepo();
    }
  }, [isVisible]);

  const checkGitRepo = async () => {
    try {
      const result = await window.electronAPI.gitIsRepo();
      if (result.success) {
        setIsGitRepo(result.isRepo);
      }
    } catch (err) {
      console.error('Error checking git repo:', err);
    }
  };

  const loadGitStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.gitStatus();
      if (result.success) {
        setGitStatus(result);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load git status');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const result = await window.electronAPI.gitHistory(5);
      if (result.success) {
        setHistory(result.commits);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const loadBranches = async () => {
    try {
      const result = await window.electronAPI.gitBranchList();
      if (result.success) {
        setBranches(result.branches || []);
      }
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      setError('Commit message is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.gitCommit(commitMessage.trim());
      if (result.success) {
        setCommitMessage('');
        setShowCommitInput(false);
        await loadGitStatus();
        await loadHistory();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to commit');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePush = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.gitPush();
      if (result.success) {
        await loadGitStatus();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to push');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePull = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.gitPull();
      if (result.success) {
        await loadGitStatus();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to pull');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async (branchName) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.gitCheckout(branchName);
      if (result.success) {
        await loadGitStatus();
        await loadBranches();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to checkout branch');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      setError('Branch name is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.gitCreateBranch(newBranchName.trim());
      if (result.success) {
        setNewBranchName('');
        setShowCreateBranch(false);
        setShowBranchDialog(false);
        await loadGitStatus();
        await loadBranches();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to create branch');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitRepo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.gitInit();
      if (result.success) {
        setIsGitRepo(true);
        await loadGitStatus();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to initialize repository');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'M':
        return 'M';
      case 'A':
        return 'A';
      case 'D':
        return 'D';
      case 'R':
        return 'R';
      case '??':
        return '?';
      case 'C':
        return 'C';
      default:
        return '';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'M':
        return 'status-modified';
      case 'A':
        return 'status-added';
      case 'D':
        return 'status-deleted';
      case 'R':
        return 'status-renamed';
      case '??':
        return 'status-untracked';
      case 'C':
        return 'status-conflicted';
      default:
        return '';
    }
  };

  if (!isVisible) return null;

  if (isLoading && !gitStatus) {
    return (
      <div className="git-panel">
        <div className="git-panel-header">
          <h2>Git</h2>
          <button onClick={onClose} className="git-close-btn">&times;</button>
        </div>
        <div className="git-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="git-panel">
      <div className="git-panel-header">
        <h2>Git</h2>
        <button onClick={onClose} className="git-close-btn">&times;</button>
      </div>

      {error && (
        <div className="git-error">{error}</div>
      )}

      {!isGitRepo && (
        <div className="git-no-repo">
          <p>Not a Git repository</p>
          <button onClick={handleInitRepo} className="git-btn git-btn-primary">
            Initialize Git
          </button>
        </div>
      )}

      {isGitRepo && gitStatus && (
        <>
          {/* Branch and status info */}
          <div className="git-branch-info">
            <div className="git-branch">
              <span className="git-branch-label">Branch:</span>
              <button
                onClick={() => setShowBranchDialog(!showBranchDialog)}
                className="git-branch-btn"
              >
                {gitStatus.branch || 'No branch'}
                <span className="git-branch-arrow">▼</span>
              </button>
              {gitStatus.ahead > 0 && (
                <span className="git-badge git-badge-ahead">
                  ↑{gitStatus.ahead}
                </span>
              )}
              {gitStatus.behind > 0 && (
                <span className="git-badge git-badge-behind">
                  ↓{gitStatus.behind}
                </span>
              )}
            </div>
          </div>

          {/* Branch dropdown */}
          {showBranchDialog && (
            <div className="git-branch-dialog">
              <div className="git-branch-list">
                {branches.map((branch) => (
                  <button
                    key={branch.name}
                    onClick={() => handleCheckout(branch.name)}
                    className={`git-branch-item ${branch.isCurrent ? 'git-branch-item-current' : ''}`}
                  >
                    {branch.name}
                    {branch.isCurrent && ' ✓'}
                  </button>
                ))}
              </div>
              <div className="git-branch-actions">
                {showCreateBranch ? (
                  <>
                    <input
                      type="text"
                      placeholder="New branch name"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      className="git-branch-input"
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateBranch()}
                    />
                    <button onClick={handleCreateBranch} className="git-btn git-btn-small">
                      Create
                    </button>
                    <button onClick={() => setShowCreateBranch(false)} className="git-btn git-btn-small">
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowCreateBranch(true)}
                    className="git-btn git-btn-small"
                  >
                    + New Branch
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Git action buttons */}
          <div className="git-actions">
            <button
              onClick={() => setShowCommitInput(!showCommitInput)}
              className="git-btn git-btn-primary"
              disabled={isLoading || gitStatus.changedFiles.length === 0}
            >
              Commit
            </button>
            <button
              onClick={handlePush}
              className="git-btn"
              disabled={isLoading || !gitStatus.tracking || gitStatus.ahead === 0}
            >
              Push
            </button>
            <button
              onClick={handlePull}
              className="git-btn"
              disabled={isLoading || !gitStatus.tracking}
            >
              Pull
            </button>
            <button
              onClick={loadGitStatus}
              className="git-btn"
              disabled={isLoading}
            >
              Refresh
            </button>
          </div>

          {/* Commit input */}
          {showCommitInput && (
            <div className="git-commit-input">
              <input
                type="text"
                placeholder="Commit message"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="git-commit-message"
                onKeyPress={(e) => e.key === 'Enter' && handleCommit()}
                autoFocus
              />
              <button
                onClick={handleCommit}
                className="git-btn git-btn-small git-btn-primary"
                disabled={isLoading || !commitMessage.trim()}
              >
                Commit
              </button>
              <button
                onClick={() => {
                  setShowCommitInput(false);
                  setCommitMessage('');
                }}
                className="git-btn git-btn-small"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Changed files */}
          <div className="git-files">
            <h3>Changes ({gitStatus.changedFiles.length})</h3>
            {gitStatus.changedFiles.length === 0 ? (
              <div className="git-empty">No changes</div>
            ) : (
              <ul className="git-files-list">
                {gitStatus.changedFiles.map((file, index) => (
                  <li
                    key={index}
                    onClick={() => onFileClick && onFileClick(file.path)}
                    className="git-file-item"
                  >
                    <span className={`git-file-status ${getStatusClass(file.status)}`}>
                      {getStatusIcon(file.status)}
                    </span>
                    <span className="git-file-path">{file.path}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent commits */}
          {history.length > 0 && (
            <div className="git-history">
              <h3>Recent Commits</h3>
              <ul className="git-history-list">
                {history.map((commit) => (
                  <li key={commit.hash} className="git-history-item">
                    <div className="git-hash">{commit.shortHash}</div>
                    <div className="git-message">{commit.message}</div>
                    <div className="git-author">{commit.author}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GitPanel;
