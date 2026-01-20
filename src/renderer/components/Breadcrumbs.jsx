import React from 'react';

function Breadcrumbs({ projectPath, activeFile, onNavigate }) {
  if (!activeFile) return null;

  const parts = activeFile.split('/').filter(part => part);

  const breadcrumbStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.5rem 0.75rem',
    fontSize: '0.8rem',
    color: '#cccccc',
    borderBottom: '1px solid #3e3e42',
    background: '#1e1e1e'
  };

  const itemStyle = {
    cursor: 'pointer',
    color: '#3794ff',
    transition: 'color 0.1s',
    whiteSpace: 'nowrap'
  };

  const itemHoverStyle = {
    ...itemStyle,
    textDecoration: 'underline'
  };

  const separatorStyle = {
    color: '#858585',
    margin: '0 0.25rem'
  };

  const lastItemStyle = {
    color: '#cccccc',
    cursor: 'default',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '200px'
  };

  const maxVisibleParts = 4;

  const handleBreadcrumbClick = (index, event) => {
    event.stopPropagation();
    if (index === parts.length - 1) return;

    const newPath = parts.slice(0, index + 1).join('/');
    if (onNavigate) {
      onNavigate(newPath);
    }
  };

  return (
    <div style={breadcrumbStyle}>
      {projectPath && (
        <>
          <span
            style={itemStyle}
            onMouseEnter={(e) => Object.assign(e.target.style, itemHoverStyle)}
            onMouseLeave={(e) => Object.assign(e.target.style, itemStyle)}
            onClick={(e) => handleBreadcrumbClick(-1, e)}
          >
            📁 {projectPath.split(/[/\\]/).pop()}
          </span>
          <span style={separatorStyle}>›</span>
        </>
      )}

      {parts.length > maxVisibleParts ? (
        <>
          <span style={{ color: '#858585' }}>...</span>
          <span style={separatorStyle}>›</span>
          {parts.slice(-maxVisibleParts + 1).map((part, index) => {
            const isLast = index === parts.length - maxVisibleParts + 1;
            const actualIndex = parts.length - maxVisibleParts + 1 + index;

            return (
              <React.Fragment key={part}>
                <span
                  style={isLast ? lastItemStyle : itemStyle}
                  onMouseEnter={(e) => !isLast && Object.assign(e.target.style, itemHoverStyle)}
                  onMouseLeave={(e) => !isLast && Object.assign(e.target.style, itemStyle)}
                  onClick={(e) => !isLast && handleBreadcrumbClick(actualIndex, e)}
                  title={part}
                >
                  {part}
                </span>
                {!isLast && <span style={separatorStyle}>›</span>}
              </React.Fragment>
            );
          })}
        </>
      ) : (
        parts.map((part, index) => {
          const isLast = index === parts.length - 1;

          return (
            <React.Fragment key={part}>
              <span
                style={isLast ? lastItemStyle : itemStyle}
                onMouseEnter={(e) => !isLast && Object.assign(e.target.style, itemHoverStyle)}
                onMouseLeave={(e) => !isLast && Object.assign(e.target.style, itemStyle)}
                onClick={(e) => !isLast && handleBreadcrumbClick(index, e)}
                title={part}
              >
                {part}
              </span>
              {!isLast && <span style={separatorStyle}>›</span>}
            </React.Fragment>
          );
        })
      )}
    </div>
  );
}

export default Breadcrumbs;
