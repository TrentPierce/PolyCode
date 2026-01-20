import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import '../styles/terminal.css';

const TerminalPanel = ({ terminals, activeTerminalId, onTerminalSelect, onTerminalClose, onTerminalCreate, electronAPI }) => {
  const [terminalInstances, setTerminalInstances] = useState({});
  const [fitAddons, setFitAddons] = useState({});
  const terminalRefs = useRef({});
  const [activeTab, setActiveTab] = useState(activeTerminalId);

  useEffect(() => {
    setActiveTab(activeTerminalId);
  }, [activeTerminalId]);

  // Create terminal instance for each terminal
  useEffect(() => {
    const newTerminalInstances = {};
    const newFitAddons = {};

    terminals.forEach(terminal => {
      if (!terminalInstances[terminal.id]) {
        // Create xterm.js instance
        const xterm = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Consolas, "Courier New", monospace',
          theme: {
            background: '#1e1e1e',
            foreground: '#d4d4d4',
            cursor: '#ffffff',
            selection: 'rgba(255, 255, 255, 0.3)',
            black: '#000000',
            red: '#cd3131',
            green: '#0dbc79',
            yellow: '#e5e510',
            blue: '#2472c8',
            magenta: '#bc3fbc',
            cyan: '#11a8cd',
            white: '#e5e5e5',
            brightBlack: '#666666',
            brightRed: '#f14c4c',
            brightGreen: '#23d18b',
            brightYellow: '#f5f543',
            brightBlue: '#3b8eea',
            brightMagenta: '#d670d6',
            brightCyan: '#29b8db',
            brightWhite: '#ffffff'
          },
          allowProposedApi: true
        });

        // Create fit addon
        const fitAddon = new FitAddon();
        xterm.loadAddon(fitAddon);

        // Store references
        newTerminalInstances[terminal.id] = xterm;
        newFitAddons[terminal.id] = fitAddon;

        // Mount terminal to DOM
        const container = terminalRefs.current[terminal.id];
        if (container) {
          xterm.open(container);
          fitAddon.fit();
        }

        // Handle user input
        xterm.onData(data => {
          if (electronAPI && electronAPI.terminalInput) {
            electronAPI.terminalInput(terminal.id, data);
          }
        });

        // Listen for terminal output from main process
        const handleTerminalData = (event, { terminalId, data }) => {
          if (terminalId === terminal.id && xterm) {
            xterm.write(data);
          }
        };

        window.electronAPI?.onTerminalData?.(handleTerminalData);

        // Listen for terminal close
        const handleTerminalClose = (event, { terminalId }) => {
          if (terminalId === terminal.id) {
            xterm.dispose();
          }
        };

        window.electronAPI?.onTerminalClose?.(handleTerminalClose);
      }
    });

    // Update state with new instances
    setTerminalInstances(prev => ({ ...prev, ...newTerminalInstances }));
    setFitAddons(prev => ({ ...prev, ...newFitAddons }));

    // Cleanup
    return () => {
      Object.values(newTerminalInstances).forEach(xterm => {
        xterm.dispose();
      });
    };
  }, [terminals, electronAPI]);

  // Resize terminal when panel is resized
  useEffect(() => {
    const handleResize = () => {
      Object.values(fitAddons).forEach(fitAddon => {
        fitAddon.fit();
      });

      // Notify main process of resize
      const activeTerm = terminals.find(t => t.id === activeTab);
      if (activeTerm) {
        const container = terminalRefs.current[activeTab];
        if (container && terminalInstances[activeTab]) {
          const dims = terminalInstances[activeTab];
          if (electronAPI && electronAPI.terminalResize) {
            electronAPI.terminalResize(activeTab, dims.cols, dims.rows);
          }
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitAddons, activeTab, terminals, terminalInstances, electronAPI]);

  // Handle tab change
  const handleTabChange = (terminalId) => {
    setActiveTab(terminalId);
    onTerminalSelect(terminalId);

    // Fit terminal when tab becomes active
    if (fitAddons[terminalId]) {
      setTimeout(() => {
        fitAddons[terminalId].fit();
      }, 50);
    }
  };

  // Handle close terminal
  const handleCloseTerminal = async (e, terminalId) => {
    e.stopPropagation();

    if (electronAPI && electronAPI.terminalKill) {
      await electronAPI.terminalKill(terminalId);
    }

    // Cleanup xterm instance
    if (terminalInstances[terminalId]) {
      terminalInstances[terminalId].dispose();
      setTerminalInstances(prev => {
        const updated = { ...prev };
        delete updated[terminalId];
        return updated;
      });
    }

    onTerminalClose(terminalId);
  };

  // Handle clear terminal
  const handleClearTerminal = () => {
    const activeTerm = terminalInstances[activeTab];
    if (activeTerm) {
      activeTerm.clear();
    }
  };

  // Handle copy selection
  const handleCopy = async () => {
    const activeTerm = terminalInstances[activeTab];
    if (activeTerm) {
      const selection = activeTerm.getSelection();
      if (selection) {
        await navigator.clipboard.writeText(selection);
      }
    }
  };

  // Handle paste
  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    if (electronAPI && electronAPI.terminalInput) {
      electronAPI.terminalInput(activeTab, text);
    }
  };

  // Handle kill terminal
  const handleKillTerminal = async () => {
    if (electronAPI && electronAPI.terminalKill) {
      await electronAPI.terminalKill(activeTab);
    }

    // Cleanup xterm instance
    if (terminalInstances[activeTab]) {
      terminalInstances[activeTab].dispose();
      setTerminalInstances(prev => {
        const updated = { ...prev };
        delete updated[activeTab];
        return updated;
      });
    }

    onTerminalClose(activeTab);
  };

  return (
    <div className="terminal-panel">
      <div className="terminal-toolbar">
        <div className="terminal-tabs">
          {terminals.map(terminal => (
            <div
              key={terminal.id}
              className={`terminal-tab ${terminal.id === activeTab ? 'active' : ''}`}
              onClick={() => handleTabChange(terminal.id)}
            >
              <span className="terminal-tab-label">
                Terminal {terminal.id.split('-')[1]}
              </span>
              <button
                className="terminal-tab-close"
                onClick={(e) => handleCloseTerminal(e, terminal.id)}
                title="Close Terminal"
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="terminal-tab-add"
            onClick={onTerminalCreate}
            title="New Terminal"
          >
            +
          </button>
        </div>
        <div className="terminal-controls">
          <button onClick={handleClearTerminal} title="Clear Terminal">
            Clear
          </button>
          <button onClick={handleCopy} title="Copy Selection">
            Copy
          </button>
          <button onClick={handlePaste} title="Paste">
            Paste
          </button>
          <button onClick={handleKillTerminal} title="Kill Terminal">
            Kill
          </button>
        </div>
      </div>
      <div className="terminal-content">
        {terminals.map(terminal => (
          <div
            key={terminal.id}
            ref={el => terminalRefs.current[terminal.id] = el}
            className={`terminal-container ${terminal.id === activeTab ? 'active' : 'hidden'}`}
            id={`terminal-${terminal.id}`}
          />
        ))}
        {terminals.length === 0 && (
          <div className="terminal-empty">
            <p>No terminal open</p>
            <p>Click the + button to open a new terminal</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalPanel;
