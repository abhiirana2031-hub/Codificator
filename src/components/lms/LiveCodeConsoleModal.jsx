import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  X,
  Terminal,
  Eye,
  Sliders,
  Trash2,
  Code2,
  Layers,
  Sparkles
} from 'lucide-react';
import { lmsApi } from '../../api/lmsApi';
import './liveCodeConsoleModal.css';

/**
 * Parses CSS text into structured rules: [{ selector, properties: [{ name, value }] }]
 */
function parseCssRules(cssText) {
  if (!cssText || typeof cssText !== 'string') return [];
  const rules = [];
  // Match selector { declarations }
  const regex = /([^{]+)\{([^}]+)\}/g;
  let match;
  while ((match = regex.exec(cssText)) !== null) {
    const selector = match[1].trim();
    const declsRaw = match[2].trim();
    if (!selector || selector.startsWith('@')) continue;

    const properties = [];
    declsRaw.split(';').forEach(decl => {
      const parts = decl.split(':');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        if (name && value) {
          properties.push({ name, value });
        }
      }
    });

    if (properties.length > 0) {
      rules.push({ selector, properties });
    }
  }
  return rules;
}

/**
 * Checks if a string looks like a CSS color
 */
function isColorValue(val) {
  if (!val) return false;
  return (
    /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val) ||
    /^(rgb|rgba|hsl|hsla)\(/i.test(val) ||
    ['red', 'green', 'blue', 'black', 'white', 'orange', 'purple', 'yellow', 'gray', 'transparent', 'teal', 'emerald', 'cyan'].includes(val.toLowerCase())
  );
}

export default function LiveCodeConsoleModal({
  isOpen,
  onClose,
  initialCode = '',
  initialLanguage = 'javascript',
  snippetTitle = 'Code Sandbox'
}) {
  const [code, setCode] = useState(initialCode);
  const [lang, setLang] = useState(initialLanguage.toLowerCase());
  const [activeTab, setActiveTab] = useState(
    ['html', 'css'].includes(initialLanguage.toLowerCase()) ? 'preview' : 'console'
  );
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [execTime, setExecTime] = useState(null);
  const [copied, setCopied] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  // Sync state when modal opens with new code/language
  useEffect(() => {
    if (isOpen) {
      setCode(initialCode || '');
      const detected = initialLanguage ? initialLanguage.toLowerCase() : 'javascript';
      setLang(detected);
      setActiveTab(['html', 'css'].includes(detected) ? 'preview' : 'console');
      setLogs([
        {
          type: 'system',
          text: `Initialized ${detected.toUpperCase()} execution sandbox. Click "Run Code" or press Ctrl+Enter to execute.`
        }
      ]);
      setExecTime(null);
    }
  }, [isOpen, initialCode, initialLanguage]);

  // Update line counts on code change
  useEffect(() => {
    const lines = (code || '').split('\n').length;
    setLineCount(Math.max(1, lines));
  }, [code]);

  // Sync scrolling between textarea and line numbers
  const handleScroll = (e) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
  };

  if (!isOpen) return null;

  // Execute Code in Sandbox
  const handleRunCode = async () => {
    setIsRunning(true);
    const startTime = performance.now();

    if (lang === 'python') {
      try {
        setLogs(prev => [
          ...prev,
          { type: 'system', text: 'Executing Python code in sandboxed runtime...' }
        ]);
        const res = await lmsApi.runRawCode('python', code);
        const result = res.result;
        const duration = Math.round(performance.now() - startTime);
        setExecTime(`${duration}ms`);

        if (result.stdout) {
          setLogs(prev => [...prev, { type: 'log', text: result.stdout.trim() }]);
        }
        if (result.stderr) {
          setLogs(prev => [...prev, { type: 'error', text: result.stderr.trim() }]);
        }
        if (!result.stdout && !result.stderr) {
          setLogs(prev => [...prev, { type: 'info', text: 'Program finished with no output (exit code 0).' }]);
        }
      } catch (err) {
        setLogs(prev => [
          ...prev,
          { type: 'error', text: `Execution Error: ${err.message}` }
        ]);
      } finally {
        setIsRunning(false);
      }
      return;
    }

    // JavaScript Live Browser Sandbox execution
    if (lang === 'javascript' || lang === 'js' || lang === 'jsx' || lang === 'typescript' || lang === 'ts') {
      const capturedLogs = [];
      const customConsole = {
        log: (...args) => {
          capturedLogs.push({
            type: 'log',
            text: args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ')
          });
        },
        info: (...args) => {
          capturedLogs.push({
            type: 'info',
            text: args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ')
          });
        },
        warn: (...args) => {
          capturedLogs.push({
            type: 'warn',
            text: args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ')
          });
        },
        error: (...args) => {
          capturedLogs.push({
            type: 'error',
            text: args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ')
          });
        }
      };

      try {
        // Safe evaluation wrapping code inside a dedicated Function scope
        const runner = new Function('console', code);
        runner(customConsole);

        const duration = Math.round(performance.now() - startTime);
        setExecTime(`${duration}ms`);

        if (capturedLogs.length === 0) {
          capturedLogs.push({
            type: 'info',
            text: 'Code executed successfully (no console output produced).'
          });
        }
        setLogs(prev => [...prev, ...capturedLogs]);
      } catch (err) {
        const duration = Math.round(performance.now() - startTime);
        setExecTime(`${duration}ms`);
        setLogs(prev => [
          ...prev,
          ...capturedLogs,
          { type: 'error', text: `${err.name}: ${err.message}` }
        ]);
      } finally {
        setIsRunning(false);
      }
      return;
    }

    // HTML / CSS Web execution
    const duration = Math.round(performance.now() - startTime);
    setExecTime(`${duration}ms`);
    setLogs(prev => [
      ...prev,
      { type: 'info', text: 'Live Web preview and CSS Inspector updated in real time.' }
    ]);
    setActiveTab('preview');
    setIsRunning(false);
  };

  // Keyboard shortcut Ctrl+Enter to run
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunCode();
    }
    // Allow Tab key indentation in textarea
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Construct iframe source for Web Preview
  const getPreviewHtml = () => {
    if (lang === 'css') {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b; }
              ${code}
            </style>
          </head>
          <body>
            <div class="card preview-box">
              <h2>CSS Live Styling Preview</h2>
              <p>This sandbox displays rendered HTML styled with your active CSS rules.</p>
              <button class="btn btn-primary">Interactive Button</button>
            </div>
          </body>
        </html>
      `;
    }

    if (lang === 'html') {
      return code.includes('<html') ? code : `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #1e293b; }
            </style>
          </head>
          <body>
            ${code}
          </body>
        </html>
      `;
    }

    // Default JS / Web
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #1e293b; }
          </style>
        </head>
        <body>
          <div id="app"></div>
          <script>
            try {
              ${code}
            } catch (err) {
              document.body.innerHTML += '<div style="color:red;font-weight:bold;padding:12px;">' + err.message + '</div>';
            }
          </script>
        </body>
      </html>
    `;
  };

  // Parse CSS declarations for the CSS Inspector
  const parsedCssRules = parseCssRules(lang === 'css' ? code : (code.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1] || code));

  return (
    <div className="code-console-backdrop" onClick={onClose}>
      <div className="code-console-window" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="code-console-header">
          <div className="code-console-title-group">
            <div className="code-console-title">
              <Terminal size={17} color="#10b981" />
              <span>{snippetTitle || 'Live Code Console & CSS Viewer'}</span>
            </div>
            <span className="code-console-badge">{lang.toUpperCase()}</span>
          </div>

          <div className="code-console-actions">
            <button
              className="code-console-btn code-console-btn-primary"
              onClick={handleRunCode}
              disabled={isRunning}
              title="Execute code (Ctrl+Enter)"
            >
              <Play size={13} fill="currentColor" />
              <span>{isRunning ? 'Running...' : 'Run Code'}</span>
            </button>

            <button
              className="code-console-btn code-console-btn-secondary"
              onClick={() => setCode(initialCode)}
              title="Reset code to original snippet"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>

            <button
              className="code-console-btn code-console-btn-secondary"
              onClick={handleCopyCode}
            >
              {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              className="code-console-btn-close"
              onClick={onClose}
              title="Close Sandbox (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="code-console-body">
          {/* Left: Code Editor */}
          <div className="code-editor-panel">
            <div className="code-panel-bar">
              <span>Source Editor</span>
              <span>{lineCount} lines</span>
            </div>

            <div className="code-editor-wrapper">
              <div className="code-line-numbers" ref={lineNumbersRef}>
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                className="code-textarea"
                value={code}
                onChange={e => setCode(e.target.value)}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                placeholder="Write or edit code here..."
              />
            </div>
          </div>

          {/* Right: Console Output & CSS Inspector */}
          <div className="code-output-panel">
            <div className="code-output-tabs">
              <button
                className={`code-tab-btn ${activeTab === 'console' ? 'active' : ''}`}
                onClick={() => setActiveTab('console')}
              >
                <Terminal size={14} />
                <span>Console Output</span>
              </button>

              <button
                className={`code-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                onClick={() => setActiveTab('preview')}
              >
                <Eye size={14} />
                <span>Live Web & CSS Viewer</span>
              </button>

              <button
                className={`code-tab-btn ${activeTab === 'css-inspector' ? 'active' : ''}`}
                onClick={() => setActiveTab('css-inspector')}
              >
                <Sliders size={14} />
                <span>CSS Style Inspector</span>
              </button>

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                {activeTab === 'console' && (
                  <button
                    className="code-tab-btn"
                    onClick={() => setLogs([])}
                    title="Clear console output"
                    style={{ padding: '6px 10px', fontSize: '11px' }}
                  >
                    <Trash2 size={13} />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            <div className="code-output-content">
              {/* Tab 1: Console Output */}
              {activeTab === 'console' && (
                <div className="console-log-list">
                  {logs.map((item, idx) => (
                    <div key={idx} className={`console-entry ${item.type}`}>
                      {item.type === 'error' && <span style={{ color: '#ff7b72', fontWeight: 700 }}>[Error]</span>}
                      {item.type === 'warn' && <span style={{ color: '#d29922', fontWeight: 700 }}>[Warn]</span>}
                      {item.type === 'info' && <span style={{ color: '#7ee787', fontWeight: 700 }}>[Info]</span>}
                      <span>{item.text}</span>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div style={{ color: '#8b949e', fontStyle: 'italic', padding: '12px 0' }}>
                      Console is empty. Click "Run Code" to inspect output.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Live HTML / CSS Preview */}
              {activeTab === 'preview' && (
                <div className="live-preview-container">
                  <iframe
                    title="Live Web Sandbox Preview"
                    className="live-preview-iframe"
                    srcDoc={getPreviewHtml()}
                    sandbox="allow-scripts"
                  />
                </div>
              )}

              {/* Tab 3: CSS Style Inspector */}
              {activeTab === 'css-inspector' && (
                <div className="css-inspector-container">
                  <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '8px' }}>
                    Declared CSS Selectors & Style Properties ({parsedCssRules.length} rules detected):
                  </div>

                  {parsedCssRules.length > 0 ? (
                    parsedCssRules.map((rule, rIdx) => (
                      <div key={rIdx} className="css-rule-card">
                        <div className="css-rule-selector">{rule.selector} {'{'}</div>
                        <div className="css-rule-properties">
                          {rule.properties.map((prop, pIdx) => (
                            <div key={pIdx} className="css-prop-row">
                              <span className="css-prop-name">{prop.name}</span>
                              <span className="css-prop-colon">:</span>
                              <span className="css-prop-value">
                                {isColorValue(prop.value) && (
                                  <span
                                    className="css-color-chip"
                                    style={{ backgroundColor: prop.value }}
                                  />
                                )}
                                {prop.value};
                              </span>
                            </div>
                          ))}
                        </div>
                        <div style={{ color: '#58a6ff', marginTop: '6px', fontSize: '13px' }}>{'}'}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: '#8b949e', fontStyle: 'italic', padding: '20px 0' }}>
                      No CSS rules detected in this snippet. Add CSS styles (e.g. <code>.selector {'{ property: value; }'}</code>) in the source editor to inspect style properties live.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="code-console-footer">
          <div>
            Press <kbd style={{ background: '#21262d', padding: '2px 6px', borderRadius: '4px', border: '1px solid #30363d' }}>Ctrl</kbd> + <kbd style={{ background: '#21262d', padding: '2px 6px', borderRadius: '4px', border: '1px solid #30363d' }}>Enter</kbd> to run
          </div>
          <div>
            {execTime && <span>Execution Time: {execTime}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
