import React, { useState, useEffect } from 'react';
import { Play, Send, RotateCcw, CheckCircle2, XCircle, Clock, AlertTriangle, Lightbulb, ChevronDown, ChevronUp, History, Terminal, Code2 } from 'lucide-react';
import { lmsApi } from '../api/lmsApi';

export default function CodingExerciseWidget({
  exercise,
  onSolved,
  compact = false
}) {
  const [code, setCode] = useState(exercise?.starter_code || '');
  const [selectedLang, setSelectedLang] = useState(exercise?.language || 'python');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('testcases'); // 'testcases' | 'submissions'
  const [showHints, setShowHints] = useState(false);
  const [activeHintIndex, setActiveHintIndex] = useState(0);

  // Results state
  const [runResult, setRunResult] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState(null);

  // Sync state if exercise prop changes
  useEffect(() => {
    if (exercise) {
      setCode(exercise.starter_code || '');
      setSelectedLang(exercise.language || 'python');
      setRunResult(null);
      setRateLimitMessage(null);
      loadSubmissions(exercise.id);
    }
  }, [exercise?.id]);

  const loadSubmissions = async (exId) => {
    if (!exId) return;
    setLoadingSubmissions(true);
    try {
      const res = await lmsApi.getExerciseSubmissions(exId);
      setSubmissions(res.submissions || []);
    } catch {
      // Unauthenticated or not yet enrolled
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset code to the original starter template? Any unsaved edits will be discarded.')) {
      setCode(exercise?.starter_code || '');
      setRunResult(null);
      setRateLimitMessage(null);
    }
  };

  // Run code against public test cases
  const handleRun = async () => {
    if (!exercise || isRunning || isSubmitting) return;
    setIsRunning(true);
    setRateLimitMessage(null);

    try {
      const data = await lmsApi.runExerciseCode(exercise.id, code, selectedLang);
      setRunResult({
        type: 'RUN',
        ...data.result
      });
      setActiveTab('testcases');
    } catch (err) {
      const displayMsg = err.data?.message || err.message;
      if (err.status === 429 || err.status === 503 || err.status === 504 || err.status === 403 || err.status === 413) {
        setRateLimitMessage(displayMsg);
      } else {
        setRunResult({
          type: 'RUN',
          status: 'RUNTIME_ERROR',
          errorMessage: displayMsg,
          passedTests: 0,
          totalTests: exercise.publicTestCases?.length || 1,
          runtimeMs: 0,
          testResults: []
        });
      }
    } finally {
      setIsRunning(false);
    }
  };

  // Submit solution for official grading against ALL test cases
  const handleSubmit = async () => {
    if (!exercise || isRunning || isSubmitting) return;
    setIsSubmitting(true);
    setRateLimitMessage(null);

    try {
      const data = await lmsApi.submitExerciseSolution(exercise.id, code, selectedLang);
      setRunResult({
        type: 'SUBMISSION',
        ...data.submission
      });
      setActiveTab('testcases');
      loadSubmissions(exercise.id);

      if (data.submission.status === 'ACCEPTED' && onSolved) {
        onSolved(exercise.id);
      }
    } catch (err) {
      const displayMsg = err.data?.message || err.message;
      if (err.status === 429 || err.status === 503 || err.status === 504 || err.status === 403 || err.status === 413) {
        setRateLimitMessage(displayMsg);
      } else {
        setRunResult({
          type: 'SUBMISSION',
          status: 'RUNTIME_ERROR',
          errorMessage: displayMsg,
          passedTests: 0,
          totalTests: exercise.totalTestCasesCount || 1,
          runtimeMs: 0,
          testResults: []
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!exercise) return null;

  const hintsList = Array.isArray(exercise.hints)
    ? exercise.hints
    : typeof exercise.hints === 'string'
      ? JSON.parse(exercise.hints || '[]')
      : [];

  const publicTestCases = exercise.publicTestCases || [];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      overflow: 'hidden',
      marginTop: '20px',
      marginBottom: '20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
    }}>
      {/* Exercise Header */}
      <div style={{
        padding: '14px 18px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'var(--brand-primary)',
            color: '#fff',
            padding: '5px 8px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Code2 size={16} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {exercise.title}
            </h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '12px',
                background: exercise.difficulty === 'Easy' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: exercise.difficulty === 'Easy' ? '#10b981' : '#f59e0b'
              }}>
                {exercise.difficulty}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {exercise.points} Points
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                • Function: <code>{exercise.function_name}()</code>
              </span>
            </div>
          </div>
        </div>

        {/* Language selector & reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <option value="python">Python 3.12</option>
            <option value="javascript">JavaScript (Node ES6+)</option>
          </select>

          <button
            onClick={handleReset}
            title="Reset code to starter template"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>
      </div>

      {/* Problem Statement & Sample I/O */}
      <div style={{
        padding: '16px 18px',
        borderBottom: '1px solid var(--border-color)',
        fontSize: '0.9rem',
        lineHeight: '1.5',
        color: 'var(--text-primary)',
        background: 'var(--bg-primary)'
      }}>
        <div style={{ whiteSpace: 'pre-line' }}>{exercise.description}</div>

        {(exercise.sample_input || exercise.sample_output) && (
          <div style={{
            marginTop: '12px',
            padding: '10px 14px',
            background: 'var(--bg-secondary)',
            borderRadius: '6px',
            fontSize: '0.82rem',
            fontFamily: 'monospace'
          }}>
            {exercise.sample_input && <div><strong>Sample Input:</strong> {exercise.sample_input}</div>}
            {exercise.sample_output && <div style={{ marginTop: '4px' }}><strong>Sample Output:</strong> {exercise.sample_output}</div>}
          </div>
        )}

        {/* Hints Drawer */}
        {hintsList.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <button
              onClick={() => setShowHints(!showHints)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                color: 'var(--brand-primary)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 0'
              }}
            >
              <Lightbulb size={14} />
              {showHints ? 'Hide Hints' : `Need a hint? (${hintsList.length} available)`}
              {showHints ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showHints && (
              <div style={{
                marginTop: '8px',
                padding: '12px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '6px',
                fontSize: '0.84rem'
              }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  {hintsList.map((_, hIdx) => (
                    <button
                      key={hIdx}
                      onClick={() => setActiveHintIndex(hIdx)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        borderRadius: '4px',
                        border: 'none',
                        background: activeHintIndex === hIdx ? 'var(--brand-primary)' : 'var(--bg-primary)',
                        color: activeHintIndex === hIdx ? '#fff' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      Hint {hIdx + 1}
                    </button>
                  ))}
                </div>
                <p style={{ margin: 0, color: 'var(--text-primary)' }}>
                  {hintsList[activeHintIndex]}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Code Editor Area */}
      <div style={{ position: 'relative', background: '#1e1e1e' }}>
        <div style={{
          padding: '8px 14px',
          background: '#252526',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.78rem',
          color: '#858585'
        }}>
          <span>Solution Editor ({selectedLang})</span>
          <span>Tab: 4 spaces • UTF-8</span>
        </div>

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck="false"
          rows={compact ? 10 : 13}
          style={{
            width: '100%',
            background: '#1e1e1e',
            color: '#d4d4d4',
            fontFamily: 'Consolas, "Fira Code", Monaco, "Courier New", monospace',
            fontSize: '0.88rem',
            lineHeight: '1.5',
            padding: '14px',
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            tabSize: 4
          }}
          onKeyDown={(e) => {
            // Support tab indentation in editor
            if (e.key === 'Tab') {
              e.preventDefault();
              const start = e.target.selectionStart;
              const end = e.target.selectionEnd;
              const val = e.target.value;
              const indent = '    ';
              setCode(val.substring(0, start) + indent + val.substring(end));
              setTimeout(() => {
                e.target.selectionStart = e.target.selectionEnd = start + indent.length;
              }, 0);
            }
          }}
        />
      </div>

      {/* Editor Controls Toolbar */}
      <div style={{
        padding: '10px 18px',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {rateLimitMessage && (
          <div style={{
            color: '#ef4444',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <AlertTriangle size={14} />
            {rateLimitMessage}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button
            onClick={handleRun}
            disabled={isRunning || isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: isRunning ? 'wait' : 'pointer',
              opacity: isRunning || isSubmitting ? 0.6 : 1
            }}
          >
            <Play size={14} />
            {isRunning ? 'Running...' : 'Run Code'}
          </button>

          <button
            onClick={handleSubmit}
            disabled={isRunning || isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '6px',
              border: 'none',
              background: '#10b981',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: isSubmitting ? 'wait' : 'pointer',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              opacity: isRunning || isSubmitting ? 0.6 : 1
            }}
          >
            <Send size={14} />
            {isSubmitting ? 'Grading...' : 'Submit Solution'}
          </button>
        </div>
      </div>

      {/* Results & Submissions Panel */}
      <div style={{
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-color)'
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          padding: '0 12px'
        }}>
          <button
            onClick={() => setActiveTab('testcases')}
            style={{
              padding: '10px 16px',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'testcases' ? '2px solid var(--brand-primary)' : '2px solid transparent',
              color: activeTab === 'testcases' ? 'var(--brand-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Terminal size={14} />
            Execution & Test Cases
          </button>

          <button
            onClick={() => {
              setActiveTab('submissions');
              loadSubmissions(exercise.id);
            }}
            style={{
              padding: '10px 16px',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'submissions' ? '2px solid var(--brand-primary)' : '2px solid transparent',
              color: activeTab === 'submissions' ? 'var(--brand-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <History size={14} />
            My Submissions ({submissions.length})
          </button>
        </div>

        {/* Tab 1: Execution & Test Cases */}
        {activeTab === 'testcases' && (
          <div style={{ padding: '16px 18px' }}>
            {runResult ? (
              <div>
                {/* Result Status Banner */}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '14px',
                  background: runResult.status === 'ACCEPTED'
                    ? 'rgba(16, 185, 129, 0.12)'
                    : runResult.status === 'TIME_LIMIT_EXCEEDED'
                      ? 'rgba(239, 68, 68, 0.12)'
                      : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${
                    runResult.status === 'ACCEPTED'
                      ? '#10b981'
                      : runResult.status === 'TIME_LIMIT_EXCEEDED'
                        ? '#ef4444'
                        : '#ef4444'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {runResult.status === 'ACCEPTED' ? (
                      <CheckCircle2 color="#10b981" size={20} />
                    ) : (
                      <XCircle color="#ef4444" size={20} />
                    )}
                    <div>
                      <span style={{
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        color: runResult.status === 'ACCEPTED' ? '#10b981' : '#ef4444'
                      }}>
                        {runResult.status === 'ACCEPTED' ? 'All Test Cases Passed!' : runResult.status}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '10px' }}>
                        {runResult.passedTests} / {runResult.totalTests} Passed
                      </span>
                    </div>
                  </div>

                  {runResult.runtimeMs > 0 && (
                    <div style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Clock size={12} />
                      Runtime: {runResult.runtimeMs} ms
                    </div>
                  )}
                </div>

                {runResult.errorMessage && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: '#2d1b1b',
                    color: '#fca5a5',
                    fontSize: '0.82rem',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    marginBottom: '12px'
                  }}>
                    {runResult.errorMessage}
                  </div>
                )}

                {/* Test Cases Results List */}
                {runResult.testResults && runResult.testResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {runResult.testResults.map((tc, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '6px',
                          border: `1px solid ${tc.passed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          background: tc.passed ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.04)',
                          fontSize: '0.82rem'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: tc.isPrivate ? '0' : '6px'
                        }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {tc.isPrivate ? `Hidden Test Case ${tc.index}` : `Test Case ${tc.index}`}
                          </span>
                          <span style={{
                            fontWeight: 600,
                            color: tc.passed ? '#10b981' : '#ef4444'
                          }}>
                            {tc.passed ? 'Passed' : 'Failed'}
                          </span>
                        </div>

                        {!tc.isPrivate && (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '8px',
                            fontFamily: 'monospace',
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)'
                          }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Input: </span>
                              <code>{JSON.stringify(tc.input)}</code>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Expected: </span>
                              <code>{JSON.stringify(tc.expected)}</code>
                            </div>
                            {tc.actual !== undefined && (
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>Actual: </span>
                                <code style={{ color: tc.passed ? '#10b981' : '#ef4444' }}>
                                  {JSON.stringify(tc.actual)}
                                </code>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                <p style={{ margin: '0 0 10px 0' }}>
                  Click <strong>Run Code</strong> to test against sample test cases, or <strong>Submit Solution</strong> to grade against all test cases.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {publicTestCases.map((tc, idx) => (
                    <div
                      key={tc.id || idx}
                      style={{
                        padding: '8px 12px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontSize: '0.78rem'
                      }}
                    >
                      <strong>Case {idx + 1}:</strong> Input: <code>{JSON.stringify(tc.input)}</code> → Expected: <code>{JSON.stringify(tc.expected)}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: My Submissions */}
        {activeTab === 'submissions' && (
          <div style={{ padding: '16px 18px' }}>
            {loadingSubmissions ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)' }}>
                Loading submission history...
              </div>
            ) : submissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                No submissions recorded yet. Submit your code to track your progress!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {submissions.map((sub) => (
                  <div
                    key={sub.id}
                    style={{
                      padding: '10px 14px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.82rem',
                      flexWrap: 'wrap',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        background: sub.status === 'ACCEPTED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: sub.status === 'ACCEPTED' ? '#10b981' : '#ef4444'
                      }}>
                        {sub.status}
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {sub.passed_tests} / {sub.total_tests} Tests Passed
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        ({sub.language})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      {sub.runtime_ms > 0 && <span>{sub.runtime_ms} ms</span>}
                      <span>{new Date(sub.submitted_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
