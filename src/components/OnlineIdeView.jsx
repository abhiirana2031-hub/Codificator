import React, { useState } from 'react';
import { Play, RotateCcw, Copy, Check, Download, Terminal, Trash2, Code2 } from 'lucide-react';
import { lmsApi } from '../api/lmsApi';

const defaultTemplates = {
  python: `# Online Python Compiler (Codificator IDE)
# Write your Python 3 code here

def solve():
    print("Welcome to Codificator Online IDE!")
    arr = [10, 20, 30, 40, 50]
    total = sum(arr)
    print(f"Array elements: {arr}")
    print(f"Calculated Sum: {total}")

solve()`,

  javascript: `// Online JavaScript Compiler (Codificator IDE)
// Write modern JavaScript ES6+ code here

function solve() {
  console.log("Welcome to Codificator Online IDE!");
  const languages = ["C++", "Java", "Python", "JavaScript", "Rust"];
  console.log("Supported Languages:", languages.join(" -> "));
  
  const square = (x) => x * x;
  console.log("Squares:", [1, 2, 3, 4, 5].map(square));
}

solve();`,

  cpp: `// Online C++ Compiler (Codificator IDE)
#include <iostream>
#include <vector>
#include <numeric>

using namespace std;

int main() {
    cout << "Welcome to Codificator Online IDE!" << endl;
    vector<int> nums = {12, 24, 36, 48, 60};
    int sum = 0;
    for (int n : nums) sum += n;
    cout << "Vector sum: " << sum << endl;
    return 0;
}`,

  java: `// Online Java Compiler (Codificator IDE)
import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("Welcome to Codificator Online IDE!");
        List<String> list = Arrays.asList("Data Structures", "Algorithms", "System Design");
        for (String item : list) {
            System.out.println("-> Learning: " + item);
        }
    }
}`
};

export default function OnlineIdeView({ initialCode = "", initialLang = "python" }) {
  const [lang, setLang] = useState(initialLang);
  const [code, setCode] = useState(initialCode || defaultTemplates[initialLang] || defaultTemplates.python);
  const [stdin, setStdin] = useState('');
  const [stdout, setStdout] = useState('// Click "Run Code" to compile and execute program.');
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [execStats, setExecStats] = useState(null);
  const [activeMobileTab, setActiveMobileTab] = useState('editor'); // 'editor' | 'terminal'

  const handleLangChange = (newLang) => {
    setLang(newLang);
    setCode(defaultTemplates[newLang]);
    setStdout('// Click "Run Code" to compile and execute program.');
    setExecStats(null);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setStdout('Compiling and executing code in isolated subprocess sandbox...');
    setExecStats(null);

    try {
      if (lang === 'cpp' || lang === 'java') {
        setStdout(`[Info] ${lang.toUpperCase()} compilation requires a containerized execution worker (e.g., Docker container sandbox).\nPython 3.12 and JavaScript (Node.js ES6+) are actively supported and executed live on the system.`);
        setExecStats({
          time: '0 ms',
          memory: 'N/A',
          status: 'Configuration Required'
        });
        return;
      }

      const res = await lmsApi.runRawCode(lang, code, stdin);
      const execution = res.result;

      if (execution.status === 'TIME_LIMIT_EXCEEDED') {
        setStdout(`Time Limit Exceeded (3000ms limit reached).\nCheck your code for infinite loops or deep recursion.\n\n${execution.stderr || ''}`);
        setExecStats({
          time: `${execution.runtimeMs} ms`,
          memory: 'Bounded',
          status: 'Time Limit Exceeded'
        });
      } else if (execution.status === 'RUNTIME_ERROR') {
        setStdout(`Runtime Error:\n${execution.stderr || execution.stdout || 'Process terminated with non-zero exit code'}`);
        setExecStats({
          time: `${execution.runtimeMs} ms`,
          memory: 'Bounded',
          status: 'Runtime Error'
        });
      } else {
        const output = execution.stdout || execution.stderr || '[Process completed with return code 0 (no output)]';
        setStdout(output);
        setExecStats({
          time: `${execution.runtimeMs} ms`,
          memory: 'Bounded',
          status: 'Success (Code 0)'
        });
      }
    } catch (err) {
      setStdout(`Execution Request Error:\n${err.message}`);
      setExecStats({
        time: '0 ms',
        memory: '0 MB',
        status: 'Error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = lang === 'python' ? 'py' : lang === 'javascript' ? 'js' : lang === 'cpp' ? 'cpp' : 'java';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solution.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 66px)', minHeight: '500px', overflow: 'hidden' }}>
      {/* Top IDE Toolbar */}
      <div style={{
        background: 'var(--code-header-bg)',
        borderBottom: '1px solid var(--code-border)',
        padding: '8px clamp(12px, 3vw, 24px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white', fontWeight: '800', fontSize: '14px' }}>
            <Terminal size={17} color="var(--brand-green)" /> IDE
          </div>

          <select
            value={lang}
            onChange={(e) => handleLangChange(e.target.value)}
            style={{
              background: 'var(--code-bg)',
              border: '1px solid var(--code-border)',
              color: 'white',
              padding: '5px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12.5px',
              fontWeight: '700'
            }}
          >
            <option value="python">Python 3</option>
            <option value="javascript">JavaScript</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>

          {/* Mobile view switchers */}
          <div className="mobile-only" style={{ display: 'flex', background: '#111827', borderRadius: '6px', padding: '2px', border: '1px solid var(--code-border)' }}>
            <button
              onClick={() => setActiveMobileTab('editor')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11.5px',
                fontWeight: 700,
                background: activeMobileTab === 'editor' ? 'var(--brand-green)' : 'transparent',
                color: activeMobileTab === 'editor' ? 'white' : '#9ca3af'
              }}
            >
              Code
            </button>
            <button
              onClick={() => setActiveMobileTab('terminal')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11.5px',
                fontWeight: 700,
                background: activeMobileTab === 'terminal' ? 'var(--brand-green)' : 'transparent',
                color: activeMobileTab === 'terminal' ? 'white' : '#9ca3af'
              }}
            >
              Output
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setCode(defaultTemplates[lang])}
            style={{ color: '#9ca3af', padding: '5px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Reset code template"
          >
            <RotateCcw size={13} /> Reset
          </button>

          <button
            onClick={handleCopy}
            style={{ color: copied ? '#10b981' : '#9ca3af', padding: '5px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="btn-primary"
            style={{ padding: '6px 16px', fontSize: '13px', fontWeight: '700' }}
          >
            <Play size={14} fill="white" /> {isRunning ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      {/* Editor & Output Pane */}
      <div className="ide-layout-container" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left: Code Editor Textarea */}
        <div 
          className={`ide-editor-panel ${activeMobileTab === 'editor' ? 'ide-panel-active' : 'ide-panel-hidden'}`}
          style={{ width: '60%', borderRight: '1px solid var(--code-border)', background: 'var(--code-bg)', display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ padding: '8px 16px', background: 'var(--code-header-bg)', borderBottom: '1px solid var(--code-border)', fontSize: '12px', color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
            <span>Source Code ({lang})</span>
            <span>UTF-8 • Tab: 2 spaces</span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const start = e.target.selectionStart;
                const end = e.target.selectionEnd;
                setCode(code.substring(0, start) + '  ' + code.substring(end));
                setTimeout(() => {
                  e.target.selectionStart = e.target.selectionEnd = start + 2;
                }, 0);
              }
            }}
            spellCheck={false}
            style={{
              width: '100%',
              flex: 1,
              background: 'var(--code-bg)',
              color: 'var(--code-text)',
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              lineHeight: '1.6',
              padding: '16px',
              border: 'none',
              resize: 'none',
              outline: 'none',
              whiteSpace: 'pre'
            }}
          />
        </div>

        {/* Right: Custom Input & Terminal Output */}
        <div 
          className={`ide-terminal-panel ${activeMobileTab === 'terminal' ? 'ide-panel-active' : 'ide-panel-hidden'}`}
          style={{ width: '40%', display: 'flex', flexDirection: 'column', background: '#18181b', color: 'white' }}
        >
          {/* Custom Stdin */}
          <div style={{ height: '35%', borderBottom: '1px solid var(--code-border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 16px', background: 'var(--code-header-bg)', borderBottom: '1px solid var(--code-border)', fontSize: '12px', color: '#9ca3af' }}>
              Standard Input (stdin)
            </div>
            <textarea
              placeholder="Enter custom input here..."
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                color: 'white',
                border: 'none',
                padding: '12px 16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                resize: 'none',
                outline: 'none'
              }}
            />
          </div>

          {/* Terminal Output */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{
              padding: '8px 16px',
              background: 'var(--code-header-bg)',
              borderBottom: '1px solid var(--code-border)',
              fontSize: '12px',
              color: '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>Terminal Output (stdout)</span>
              {execStats && (
                <div style={{ display: 'flex', gap: '12px', color: '#86efac', fontWeight: '700' }}>
                  <span>Time: {execStats.time}</span>
                  <span>Memory: {execStats.memory}</span>
                </div>
              )}
            </div>
            <pre style={{
              flex: 1,
              margin: 0,
              padding: '16px',
              fontFamily: 'var(--font-mono)',
              fontSize: '13.5px',
              color: '#d4d4d4',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.5'
            }}>
              {stdout}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
