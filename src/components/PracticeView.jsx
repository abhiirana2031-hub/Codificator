import React, { useState, useEffect } from 'react';
import { Play, Send, RotateCcw, CheckCircle2, XCircle, Search, Filter, Building2, Tag, Terminal, Award, ChevronLeft, Sparkles, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import { problemsList } from '../data/problemsData';
import { lmsApi } from '../api/lmsApi';

export default function PracticeView({
  selectedProblemId,
  onSelectProblem,
  onBackToList,
  onNavigateToTutorial,
  solvedProblems = [],
  onProblemSolved
}) {
  const [currentProblem, setCurrentProblem] = useState(
    problemsList.find(p => p.id === selectedProblemId) || null
  );

  const [activeTab, setActiveTab] = useState('problem'); // 'problem' | 'submissions' | 'hints'
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('description'); // 'description' | 'editor' | 'console'
  const [selectedLang, setSelectedLang] = useState('python');
  const [code, setCode] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [customInputEnabled, setCustomInputEnabled] = useState(false);
  const [customInput, setCustomInput] = useState('');
  
  // Filters for problem list
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Update current problem when prop changes
  useEffect(() => {
    if (selectedProblemId) {
      const prob = problemsList.find(p => p.id === selectedProblemId);
      if (prob) {
        setCurrentProblem(prob);
        setCode(prob.starterCode[selectedLang] || prob.starterCode.python);
        setTestResult(null);
      }
    } else {
      setCurrentProblem(null);
    }
  }, [selectedProblemId, selectedLang]);

  // When problem or language changes, set starter code
  const handleLanguageChange = (lang) => {
    setSelectedLang(lang);
    if (currentProblem) {
      setCode(currentProblem.starterCode[lang] || currentProblem.starterCode.python);
    }
  };

  // Real isolated execution for JavaScript and Python via backend runner
  const handleRunTest = async (isSubmission = false) => {
    setIsCompiling(true);
    setTestResult(null);

    if (!currentProblem) {
      setIsCompiling(false);
      return;
    }

    if (selectedLang === 'cpp' || selectedLang === 'java') {
      setIsCompiling(false);
      setTestResult({
        success: false,
        isSubmission,
        error: `[Notice] ${selectedLang.toUpperCase()} compilation requires a containerized execution worker (e.g., Docker container sandbox). Python 3.12 and JavaScript (Node.js ES6+) are actively supported and executed live.`,
        runtime: '0 ms',
        memory: 'N/A'
      });
      return;
    }

    const testCases = isSubmission ? currentProblem.testCases : [currentProblem.testCases[0]];
    const fnName = selectedLang === 'python'
      ? (currentProblem.id === 'binary-search' ? 'binary_search' :
         currentProblem.id === 'two-sum-sorted' ? 'has_pair' :
         currentProblem.id === 'reverse-linked-list' ? 'reverse_list' :
         currentProblem.id === 'merge-intervals' ? 'merge' : 'solve')
      : (currentProblem.id === 'binary-search' ? 'binarySearch' :
         currentProblem.id === 'two-sum-sorted' ? 'hasPair' :
         currentProblem.id === 'reverse-linked-list' ? 'reverseList' :
         currentProblem.id === 'merge-intervals' ? 'merge' : 'solve');

    try {
      let harnessCode = '';
      if (selectedLang === 'python') {
        harnessCode = `
import json, sys
${code}

def __run():
    test_cases = json.loads('''${JSON.stringify(testCases).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}''')
    fn = globals().get('${fnName}')
    if not fn:
        print(f"Error: Function '${fnName}' is not defined.", file=sys.stderr)
        sys.exit(1)
    results = []
    for i, tc in enumerate(test_cases):
        try:
            inp = tc['input']
            if isinstance(inp, dict):
                act = fn(**inp)
            elif isinstance(inp, list):
                act = fn(*inp)
            else:
                act = fn(inp)
            passed = (act == tc['expected'])
            results.append({'testCaseIndex': i + 1, 'input': json.dumps(inp), 'expected': json.dumps(tc['expected']), 'actual': json.dumps(act), 'passed': passed})
        except Exception as e:
            results.append({'testCaseIndex': i + 1, 'input': json.dumps(tc['input']), 'expected': json.dumps(tc['expected']), 'actual': None, 'passed': False, 'error': str(e)})
    print('__RESULTS__' + json.dumps(results))
__run()
`;
      } else {
        harnessCode = `
${code}

(function() {
  const testCases = ${JSON.stringify(testCases)};
  const fn = (typeof ${fnName} === 'function') ? ${fnName} : null;
  if (!fn) {
    console.error("Error: Function '${fnName}' is not defined.");
    process.exit(1);
  }
  const results = [];
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    try {
      const inp = tc.input;
      let act;
      if (Array.isArray(inp)) act = fn(...inp);
      else if (typeof inp === 'object' && inp !== null) act = fn(...Object.values(inp));
      else act = fn(inp);
      const passed = JSON.stringify(act) === JSON.stringify(tc.expected);
      results.push({ testCaseIndex: i + 1, input: JSON.stringify(inp), expected: JSON.stringify(tc.expected), actual: JSON.stringify(act), passed });
    } catch (err) {
      results.push({ testCaseIndex: i + 1, input: JSON.stringify(tc.input), expected: JSON.stringify(tc.expected), actual: null, passed: false, error: err.message });
    }
  }
  console.log('__RESULTS__' + JSON.stringify(results));
})();
`;
      }

      const res = await lmsApi.runRawCode(selectedLang, harnessCode);
      const execution = res.result;

      if (execution.status === 'TIME_LIMIT_EXCEEDED') {
        setTestResult({
          success: false,
          isSubmission,
          error: 'Time Limit Exceeded (3000ms limit reached). Ensure your code does not contain infinite loops or infinite recursion.',
          runtime: `${execution.runtimeMs} ms`,
          memory: 'Bounded'
        });
        return;
      }

      if (execution.status === 'RUNTIME_ERROR') {
        setTestResult({
          success: false,
          isSubmission,
          error: execution.stderr || 'Runtime or Syntax Error during execution',
          runtime: `${execution.runtimeMs} ms`,
          memory: 'Bounded'
        });
        return;
      }

      const match = (execution.stdout || '').split('\n').find(l => l.startsWith('__RESULTS__'));
      if (!match) {
        setTestResult({
          success: false,
          isSubmission,
          error: execution.stderr || 'No results generated. Ensure function signature matches instructions.',
          runtime: `${execution.runtimeMs} ms`,
          memory: 'Bounded'
        });
        return;
      }

      const details = JSON.parse(match.replace('__RESULTS__', ''));
      const allPassed = details.length > 0 && details.every(d => d.passed);
      const firstFailed = details.find(d => !d.passed);

      setTestResult({
        success: allPassed,
        isSubmission,
        runtime: `${execution.runtimeMs} ms`,
        memory: 'Bounded',
        details,
        failureReason: firstFailed ? `Failed on test case ${firstFailed.testCaseIndex}` : null
      });

      if (isSubmission && allPassed) {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        });
        if (onProblemSolved) {
          onProblemSolved(currentProblem.id, currentProblem.points);
        }
      }
    } catch (err) {
      setTestResult({
        success: false,
        isSubmission,
        error: err.message,
        runtime: '0 ms',
        memory: '0 MB'
      });
    } finally {
      setIsCompiling(false);
    }
  };

  // If viewing the problem catalog list
  if (!currentProblem) {
    const filteredProblems = problemsList.filter(p => {
      const matchDiff = filterDifficulty === 'All' || p.difficulty.toLowerCase() === filterDifficulty.toLowerCase();
      const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.companies.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchDiff && matchSearch;
    });

    return (
      <div className="max-width-wrapper animate-fade-in" style={{ padding: '36px 0', minHeight: '80vh' }}>
        {/* Arena Header */}
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Codificator Practice Arena</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
            Curated repository of algorithmic and data structure problems with instant automated evaluation.
          </p>
        </div>

        {/* Filter Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'var(--bg-card)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          marginBottom: '24px'
        }}>
          {/* Difficulty Chips */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {['All', 'Easy', 'Medium', 'Hard'].map(diff => (
              <button
                key={diff}
                onClick={() => setFilterDifficulty(diff)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '13px',
                  fontWeight: '700',
                  background: filterDifficulty === diff ? 'var(--brand-green)' : 'var(--bg-secondary)',
                  color: filterDifficulty === diff ? 'white' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                {diff}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            width: '300px'
          }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search problems, tags, companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '13.5px', padding: 0 }}
            />
          </div>
        </div>

        {/* Problem List Table */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden'
        }}>
          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 20px', width: '60px' }}>Status</th>
                  <th style={{ padding: '14px 20px' }}>Problem Title</th>
                  <th style={{ padding: '14px 20px', width: '120px' }}>Difficulty</th>
                  <th style={{ padding: '14px 20px', width: '120px' }}>Accuracy</th>
                  <th style={{ padding: '14px 20px', width: '100px' }}>Points</th>
                  <th style={{ padding: '14px 20px', width: '120px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
            <tbody>
              {filteredProblems.map(prob => {
                const isSolved = solvedProblems.includes(prob.id);
                return (
                  <tr
                    key={prob.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'var(--transition)'
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '14px 20px' }}>
                      {isSolved ? (
                        <CheckCircle2 size={18} color="#10b981" />
                      ) : (
                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1.5px solid var(--text-light)' }} />
                      )}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div
                        onClick={() => onSelectProblem(prob.id)}
                        style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-green)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                      >
                        {prob.title}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {prob.companies.slice(0, 3).map(comp => (
                          <span key={comp} style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: '4px' }}>
                            {comp}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span className={`badge badge-${prob.difficulty.toLowerCase()}`}>
                        {prob.difficulty}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                      {prob.accuracy}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '700', color: 'var(--brand-green)' }}>
                      +{prob.points} XP
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => onSelectProblem(prob.id)}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '13px' }}
                      >
                        {isSolved ? 'Review' : 'Solve'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    );
  }

  // Split-Screen Interactive Coding Workspace
  const isSolved = solvedProblems.includes(currentProblem.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 66px)', overflow: 'hidden' }}>
      {/* Top Problem Sub-bar */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        padding: '8px clamp(12px, 3vw, 20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={onBackToList}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12.5px',
              fontWeight: '700',
              color: 'var(--text-secondary)',
              background: 'var(--bg-secondary)',
              padding: '5px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)'
            }}
          >
            <ChevronLeft size={15} /> All
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '15.5px', margin: 0 }}>{currentProblem.title}</h3>
            <span className={`badge badge-${currentProblem.difficulty.toLowerCase()}`}>
              {currentProblem.difficulty}
            </span>
            {isSolved && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#10b981', fontSize: '11px', fontWeight: '700' }}>
                <CheckCircle2 size={13} /> Solved
              </span>
            )}
          </div>

          {/* Mobile Workspace Tabs Toggle */}
          <div className="mobile-only" style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setActiveWorkspaceTab('description')}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                background: activeWorkspaceTab === 'description' ? 'var(--brand-green)' : 'transparent',
                color: activeWorkspaceTab === 'description' ? 'white' : 'var(--text-secondary)'
              }}
            >
              Problem
            </button>
            <button
              onClick={() => setActiveWorkspaceTab('editor')}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                background: activeWorkspaceTab === 'editor' ? 'var(--brand-green)' : 'transparent',
                color: activeWorkspaceTab === 'editor' ? 'white' : 'var(--text-secondary)'
              }}
            >
              Code
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onNavigateToTutorial(currentProblem.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--brand-green)',
              background: 'var(--brand-green-light)',
              padding: '5px 10px',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <BookOpen size={13} /> Notes
          </button>
        </div>
      </div>

      {/* Split-Screen Workspace (Left = Problem Spec, Right = Editor & Terminal) */}
      <div className="practice-layout-container" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        
        {/* LEFT PANE: Problem Description & Constraints */}
        <div 
          className={`practice-desc-panel ${activeWorkspaceTab === 'description' ? 'practice-panel-active' : 'practice-panel-hidden'}`}
          style={{
            width: '45%',
            borderRight: '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}
        >
          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            padding: '0 16px'
          }}>
            {['problem', 'hints'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 16px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  color: activeTab === tab ? 'var(--brand-green)' : 'var(--text-muted)',
                  borderBottom: activeTab === tab ? '2px solid var(--brand-green)' : '2px solid transparent',
                  textTransform: 'capitalize'
                }}
              >
                {tab === 'problem' ? 'Description' : 'Hints & Complexity'}
              </button>
            ))}
          </div>

          <div style={{ padding: '24px 28px', flex: 1 }}>
            {activeTab === 'problem' ? (
              <>
                <p style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>
                  {currentProblem.description}
                </p>

                {/* Examples */}
                <h4 style={{ fontSize: '15px', marginBottom: '12px' }}>Examples:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  {currentProblem.examples.map((ex, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 16px',
                        fontSize: '13.5px'
                      }}
                    >
                      <div style={{ fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Example {idx + 1}:
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                        <strong>Input:</strong> {ex.input}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                        <strong>Output:</strong> {ex.output}
                      </div>
                      {ex.explanation && (
                        <div style={{ color: 'var(--text-secondary)' }}>
                          <strong>Explanation:</strong> {ex.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Constraints */}
                <h4 style={{ fontSize: '15px', marginBottom: '8px' }}>Constraints:</h4>
                <pre style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  marginBottom: '24px',
                  whiteSpace: 'pre-line'
                }}>
                  {currentProblem.constraints}
                </pre>

                {/* Company & Topic Tags */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '18px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={13} /> COMPANY TAGS
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                    {currentProblem.companies.map(c => (
                      <span key={c} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {c}
                      </span>
                    ))}
                  </div>

                  <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag size={13} /> TOPIC TAGS
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {currentProblem.tags.map(t => (
                      <span key={t} style={{ background: 'var(--brand-green-light)', color: 'var(--brand-green)', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <h4 style={{ fontSize: '16px', marginBottom: '12px' }}>Hint 1:</h4>
                <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
                  Consider eliminating candidate solutions monotonically rather than checking element by element.
                </p>
                <h4 style={{ fontSize: '16px', marginBottom: '12px' }}>Expected Complexity:</h4>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
                  <div><strong>Time Complexity:</strong> O(log N) or O(N)</div>
                  <div><strong>Auxiliary Space:</strong> O(1)</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Code Editor & Execution Console */}
        <div 
          className={`practice-editor-panel ${activeWorkspaceTab === 'editor' ? 'practice-panel-active' : 'practice-panel-hidden'}`}
          style={{ width: '55%', display: 'flex', flexDirection: 'column', background: 'var(--code-bg)' }}
        >
          {/* Editor Header Bar */}
          <div style={{
            background: 'var(--code-header-bg)',
            borderBottom: '1px solid var(--code-border)',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                value={selectedLang}
                onChange={(e) => handleLanguageChange(e.target.value)}
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--code-border)',
                  color: 'white',
                  padding: '5px 12px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '700'
                }}
              >
                <option value="python">Python 3</option>
                <option value="javascript">JavaScript (ES6)</option>
                <option value="cpp">C++ (g++ 14)</option>
                <option value="java">Java (OpenJDK 17)</option>
              </select>
            </div>

            <button
              onClick={() => setCode(currentProblem.starterCode[selectedLang])}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: '#9ca3af',
                fontSize: '12px',
                padding: '4px 8px',
                borderRadius: '4px'
              }}
              title="Reset starter template"
            >
              <RotateCcw size={13} /> Reset Template
            </button>
          </div>

          {/* Editor Textarea with Line Numbers */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' }}>
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
                height: '100%',
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

          {/* Bottom Test & Console Panel */}
          {testResult && (
            <div style={{
              background: '#18181b',
              borderTop: '1px solid var(--code-border)',
              padding: '16px',
              maxHeight: '180px',
              overflowY: 'auto',
              color: 'white',
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {testResult.success ? (
                    <span style={{ color: '#10b981', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} /> {testResult.isSubmission ? "Accepted / Correct Answer!" : "Compilation & Sample Tests Passed!"}
                    </span>
                  ) : (
                    <span style={{ color: '#ef4444', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <XCircle size={16} /> {testResult.failureReason || "Wrong Answer"}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  Runtime: <strong>{testResult.runtime}</strong> • Memory: <strong>{testResult.memory}</strong>
                </div>
              </div>

              {testResult.details && testResult.details.map(d => (
                <div key={d.testCaseIndex} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: d.passed ? '#86efac' : '#fca5a5', marginTop: '4px' }}>
                  Test Case #{d.testCaseIndex}: Expected {d.expected}, Got {d.actual} ({d.passed ? 'PASSED' : 'FAILED'})
                </div>
              ))}
            </div>
          )}

          {/* Bottom Execution Action Bar */}
          <div style={{
            background: 'var(--code-header-bg)',
            borderTop: '1px solid var(--code-border)',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={15} color="#9ca3af" />
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Ready to evaluate</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => handleRunTest(false)}
                disabled={isCompiling}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Play size={14} /> {isCompiling ? 'Running...' : 'Compile & Test'}
              </button>

              <button
                onClick={() => handleRunTest(true)}
                disabled={isCompiling}
                className="btn-primary"
                style={{ padding: '7px 20px', fontSize: '13.5px' }}
              >
                <Send size={14} /> Submit
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
