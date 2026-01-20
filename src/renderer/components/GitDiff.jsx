import React, { useState, useEffect } from 'react';
import './GitDiff.css';

const GitDiff = ({ filePath, isVisible, onClose }) => {
  const [diffData, setDiffData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isVisible && filePath) {
      loadDiff();
    }
  }, [isVisible, filePath]);

  const loadDiff = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.gitDiff(filePath);
      if (result.success) {
        setDiffData(result);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load diff');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderDiffHunks = () => {
    if (!diffData || !diffData.hunks) {
      return null;
    }

    return diffData.hunks.map((hunk, hunkIndex) => (
      <div key={hunkIndex} className="git-diff-hunk">
        <div className="git-diff-hunk-header">{hunk.header}</div>
        <div className="git-diff-lines">
          <div className="git-diff-column git-diff-original">
            {renderLines(hunk.originalLines, 'original')}
          </div>
          <div className="git-diff-column git-diff-modified">
            {renderLines(hunk.modifiedLines, 'modified')}
          </div>
        </div>
      </div>
    ));
  };

  const renderLines = (lines, type) => {
    return lines.map((line, lineIndex) => {
      const lineClass = `git-diff-line git-diff-line-${line.type}`;
      const lineNumClass = `git-diff-line-num ${line.type}`;
      
      return (
        <React.Fragment key={`${type}-${lineIndex}`}>
          <div className={lineNumClass}>{lineIndex + 1}</div>
          <div className={lineClass}>
            {line.type === 'unchanged' && <span className="git-diff-content">{line.content}</span>}
            {line.type === 'deletion' && (
              <span className="git-diff-deletion">
                {line.content}
              </span>
            )}
            {line.type === 'addition' && (
              <span className="git-diff-addition">
                {line.content}
              </span>
            )}
          </div>
        </React.Fragment>
      );
    });
  };

  const parseRawDiff = (rawDiff) => {
    const lines = rawDiff.split('\n');
    const originalLines = [];
    const modifiedLines = [];
    let originalLineNum = 0;
    let modifiedLineNum = 0;
    let inHunk = false;

    lines.forEach((line) => {
      if (line.startsWith('@@')) {
        inHunk = true;
        return;
      }

      if (!inHunk || line.startsWith('\\') || line.startsWith('#')) {
        return;
      }

      if (line.startsWith(' ')) {
        // Unchanged line
        originalLineNum++;
        modifiedLineNum++;
        originalLines.push({ num: originalLineNum, type: 'unchanged', content: line.substring(1) });
        modifiedLines.push({ num: modifiedLineNum, type: 'unchanged', content: line.substring(1) });
      } else if (line.startsWith('-')) {
        // Deletion
        originalLineNum++;
        originalLines.push({ num: originalLineNum, type: 'deletion', content: line.substring(1) });
        modifiedLines.push({ num: '', type: 'empty', content: '' });
      } else if (line.startsWith('+')) {
        // Addition
        modifiedLineNum++;
        originalLines.push({ num: '', type: 'empty', content: '' });
        modifiedLines.push({ num: modifiedLineNum, type: 'addition', content: line.substring(1) });
      }
    });

    return { originalLines, modifiedLines };
  };

  const renderRawDiff = () => {
    if (!diffData || !diffData.diff) {
      return null;
    }

    const { originalLines, modifiedLines } = parseRawDiff(diffData.diff);

    return (
      <div className="git-diff-raw">
        <div className="git-diff-column git-diff-original">
          <div className="git-diff-line-num-header">Original</div>
          {originalLines.map((line, index) => (
            <React.Fragment key={`orig-${index}`}>
              <div className={`git-diff-line-num ${line.type}`}>
                {line.num}
              </div>
              <div className={`git-diff-line git-diff-line-${line.type}`}>
                <span className="git-diff-content">
                  {line.content || '\u00A0'}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div className="git-diff-column git-diff-modified">
          <div className="git-diff-line-num-header">Modified</div>
          {modifiedLines.map((line, index) => (
            <React.Fragment key={`mod-${index}`}>
              <div className={`git-diff-line-num ${line.type}`}>
                {line.num}
              </div>
              <div className={`git-diff-line git-diff-line-${line.type}`}>
                <span className="git-diff-content">
                  {line.content || '\u00A0'}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <div className="git-diff-overlay">
      <div className="git-diff-modal">
        <div className="git-diff-header">
          <div className="git-diff-title">
            <h2>Git Diff</h2>
            <div className="git-diff-file-path">{filePath}</div>
          </div>
          <button onClick={onClose} className="git-diff-close-btn">&times;</button>
        </div>

        {isLoading && (
          <div className="git-diff-loading">Loading diff...</div>
        )}

        {error && (
          <div className="git-diff-error">{error}</div>
        )}

        {diffData && !isLoading && !error && (
          <>
            <div className="git-diff-stats">
              {diffData.summary && diffData.summary.files && (
                <div className="git-diff-summary">
                  {diffData.summary.files.length > 0 && (
                    <>
                      {diffData.summary.files.map((file, index) => (
                        <div key={index} className="git-diff-summary-item">
                          {file.file}: <span className="stat-insertions">+{file.insertions}</span> / <span className="stat-deletions">-{file.deletions}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {diffData.hunks && diffData.hunks.length > 0 ? (
              renderDiffHunks()
            ) : diffData.diff ? (
              renderRawDiff()
            ) : (
              <div className="git-diff-empty">No diff data available</div>
            )}
          </>
        )}

        {diffData && !isLoading && !error && (!diffData.diff || diffData.diff.trim() === '') && (
          <div className="git-diff-empty">No changes to display</div>
        )}
      </div>
    </div>
  );
};

export default GitDiff;
