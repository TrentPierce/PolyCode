import React, { useState, useEffect } from 'react';

/**
 * QualityMetrics Component
 * Displays quality scores with visualization
 * Shows breakdown by criterion and trend over time
 */
function QualityMetrics({ evaluation, history, onExport }) {
  const [view, setView] = useState('breakdown'); // 'breakdown', 'trend', 'history'
  const [exportFormat, setExportFormat] = useState('json');

  // Default evaluation data structure
  const currentEvaluation = evaluation || {
    scores: {
      correctness: 0,
      quality: 0,
      bestPractices: 0,
      performance: 0,
      security: 0,
      maintainability: 0
    },
    weightedScore: 0,
    grade: { label: 'N/A', color: '#94a3b8' },
    criteria: {}
  };

  const currentHistory = history || [];

  // Get color for score
  const getScoreColor = (score) => {
    if (score >= 8.5) return '#10b981'; // green
    if (score >= 7.0) return '#34d399'; // light green
    if (score >= 5.5) return '#f59e0b'; // yellow
    if (score >= 4.0) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  // Get grade class
  const getGradeClass = (label) => {
    switch (label) {
      case 'Excellent': return 'grade-excellent';
      case 'Good': return 'grade-good';
      case 'Fair': return 'grade-fair';
      case 'Poor': return 'grade-poor';
      case 'Very Poor': return 'grade-very-poor';
      default: return 'grade-unknown';
    }
  };

  // Calculate bar width percentage
  const getBarWidth = (score) => `${(score / 10) * 100}%`;

  // Export data
  const handleExport = () => {
    const data = {
      evaluation: currentEvaluation,
      history: currentHistory,
      exportedAt: new Date().toISOString()
    };

    if (exportFormat === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quality-metrics-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (exportFormat === 'csv') {
      const headers = ['Timestamp', 'Correctness', 'Quality', 'Best Practices', 'Performance', 'Security', 'Maintainability', 'Weighted Score'];
      const rows = currentHistory.map(h => [
        h.timestamp,
        h.scores.correctness,
        h.scores.quality,
        h.scores.bestPractices,
        h.scores.performance,
        h.scores.security,
        h.scores.maintainability,
        h.weightedScore
      ]);

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quality-metrics-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Criterion display name
  const criterionLabels = {
    correctness: 'Correctness',
    quality: 'Code Quality',
    bestPractices: 'Best Practices',
    performance: 'Performance',
    security: 'Security',
    maintainability: 'Maintainability'
  };

  return (
    <div className="quality-metrics">
      <div className="metrics-header">
        <h2>Quality Metrics</h2>
        <div className="metrics-controls">
          <div className="view-toggles">
            <button
              className={`view-toggle ${view === 'breakdown' ? 'active' : ''}`}
              onClick={() => setView('breakdown')}
            >
              Breakdown
            </button>
            <button
              className={`view-toggle ${view === 'trend' ? 'active' : ''}`}
              onClick={() => setView('trend')}
            >
              Trend
            </button>
            <button
              className={`view-toggle ${view === 'history' ? 'active' : ''}`}
              onClick={() => setView('history')}
            >
              History
            </button>
          </div>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="export-format-select"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
          <button onClick={handleExport} className="export-button">
            Export
          </button>
        </div>
      </div>

      {view === 'breakdown' && (
        <div className="metrics-breakdown">
          <div className="overall-score">
            <div className={`score-badge ${getGradeClass(currentEvaluation.grade.label)}`}>
              <div className="score-value">{currentEvaluation.weightedScore.toFixed(1)}</div>
              <div className="score-label">{currentEvaluation.grade.label}</div>
            </div>
            <div className="score-color-indicator" style={{ backgroundColor: currentEvaluation.grade.color }}></div>
          </div>

          <div className="criteria-scores">
            {Object.entries(currentEvaluation.scores).map(([criterion, score]) => (
              <div key={criterion} className="criterion-row">
                <div className="criterion-info">
                  <span className="criterion-name">{criterionLabels[criterion] || criterion}</span>
                  <span className="criterion-score" style={{ color: getScoreColor(score) }}>
                    {score.toFixed(1)} / 10
                  </span>
                </div>
                <div className="criterion-bar-container">
                  <div
                    className="criterion-bar"
                    style={{
                      width: getBarWidth(score),
                      backgroundColor: getScoreColor(score)
                    }}
                  ></div>
                </div>
                {currentEvaluation.criteria[criterion] && (
                  <div className="criterion-weight">
                    Weight: {(currentEvaluation.criteria[criterion].weight * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'trend' && (
        <div className="metrics-trend">
          <h3>Score Trend (Last 10 Evaluations)</h3>
          {currentHistory.length > 1 ? (
            <div className="trend-chart">
              <svg className="trend-svg" viewBox="0 0 800 300" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 2.5, 5, 7.5, 10].map(y => (
                  <line
                    key={y}
                    x1="0"
                    y1={300 - (y / 10) * 300}
                    x2="800"
                    y2={300 - (y / 10) * 300}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                ))}

                {/* Trend line */}
                <polyline
                  points={currentHistory.slice(0, 10).reverse().map((h, i) => {
                    const x = (i / Math.min(currentHistory.slice(0, 10).length - 1, 9)) * 780 + 10;
                    const y = 300 - (h.weightedScore / 10) * 300;
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke={getScoreColor(currentEvaluation.weightedScore)}
                  strokeWidth="3"
                />

                {/* Data points */}
                {currentHistory.slice(0, 10).reverse().map((h, i) => {
                  const x = (i / Math.min(currentHistory.slice(0, 10).length - 1, 9)) * 780 + 10;
                  const y = 300 - (h.weightedScore / 10) * 300;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="6"
                      fill={getScoreColor(h.weightedScore)}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  );
                })}
              </svg>
              <div className="trend-legend">
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: '#10b981' }}></span>
                  <span>Excellent (8.5+)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span>
                  <span>Fair (5.5-7)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: '#ef4444' }}></span>
                  <span>Poor (&lt;5.5)</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="no-data">Not enough data to show trend</p>
          )}
        </div>
      )}

      {view === 'history' && (
        <div className="metrics-history">
          <h3>Evaluation History</h3>
          {currentHistory.length > 0 ? (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Correctness</th>
                  <th>Quality</th>
                  <th>Best Practices</th>
                  <th>Performance</th>
                  <th>Security</th>
                  <th>Maintainability</th>
                  <th>Weighted Score</th>
                </tr>
              </thead>
              <tbody>
                {currentHistory.map((h, index) => (
                  <tr key={index}>
                    <td>{new Date(h.timestamp).toLocaleString()}</td>
                    <td style={{ color: getScoreColor(h.scores.correctness) }}>{h.scores.correctness.toFixed(1)}</td>
                    <td style={{ color: getScoreColor(h.scores.quality) }}>{h.scores.quality.toFixed(1)}</td>
                    <td style={{ color: getScoreColor(h.scores.bestPractices) }}>{h.scores.bestPractices.toFixed(1)}</td>
                    <td style={{ color: getScoreColor(h.scores.performance) }}>{h.scores.performance.toFixed(1)}</td>
                    <td style={{ color: getScoreColor(h.scores.security) }}>{h.scores.security.toFixed(1)}</td>
                    <td style={{ color: getScoreColor(h.scores.maintainability) }}>{h.scores.maintainability.toFixed(1)}</td>
                    <td style={{ color: getScoreColor(h.weightedScore), fontWeight: 'bold' }}>{h.weightedScore.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="no-data">No evaluation history available</p>
          )}
        </div>
      )}
    </div>
  );
}

export default QualityMetrics;
