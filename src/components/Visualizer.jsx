import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ChevronRight, ChevronLeft, CheckCircle2, BarChart3, Search } from 'lucide-react';

export default function Visualizer({ type = "binary-search" }) {
  const [visualizerMode, setVisualizerMode] = useState("binary-search"); // "binary-search" | "sorting"

  // Binary Search State
  const [array] = useState([2, 5, 8, 12, 16, 23, 38, 56, 72, 91]);
  const [target, setTarget] = useState(23);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Sorting State
  const [sortArray, setSortArray] = useState([45, 12, 89, 34, 67, 23, 78, 10]);
  const [sortStepIndex, setSortStepIndex] = useState(0);
  const [isSortPlaying, setIsSortPlaying] = useState(false);

  // Precompute steps for Binary Search
  const computeBinarySearchSteps = (arr, t) => {
    const steps = [];
    let low = 0;
    let high = arr.length - 1;

    steps.push({
      low,
      high,
      mid: Math.floor((low + high) / 2),
      status: "Initial search space spanning full array.",
      found: false
    });

    while (low <= high) {
      const mid = Math.floor(low + (high - low) / 2);
      if (arr[mid] === t) {
        steps.push({
          low,
          high,
          mid,
          status: `arr[mid] (${arr[mid]}) === target (${t}). Target found at index ${mid}!`,
          found: true
        });
        break;
      } else if (arr[mid] < t) {
        steps.push({
          low,
          high,
          mid,
          status: `arr[mid] (${arr[mid]}) < target (${t}). Target is larger; discarding left half. New low = ${mid + 1}.`,
          found: false
        });
        low = mid + 1;
      } else {
        steps.push({
          low,
          high,
          mid,
          status: `arr[mid] (${arr[mid]}) > target (${t}). Target is smaller; discarding right half. New high = ${mid - 1}.`,
          found: false
        });
        high = mid - 1;
      }
    }

    if (low > high) {
      steps.push({
        low,
        high,
        mid: -1,
        status: `Search interval exhausted (low > high). Target ${t} is not in the array.`,
        found: false
      });
    }

    return steps;
  };

  // Precompute steps for Bubble Sort
  const computeBubbleSortSteps = (initialArr) => {
    const steps = [];
    let arr = [...initialArr];
    const n = arr.length;

    steps.push({
      arr: [...arr],
      comparing: [],
      swapped: false,
      status: "Starting Bubble Sort on unsorted array."
    });

    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        const needSwap = arr[j] > arr[j + 1];
        steps.push({
          arr: [...arr],
          comparing: [j, j + 1],
          swapped: false,
          status: `Comparing elements arr[${j}] (${arr[j]}) and arr[${j + 1}] (${arr[j + 1]}).`
        });

        if (needSwap) {
          const temp = arr[j];
          arr[j] = arr[j + 1];
          arr[j + 1] = temp;
          steps.push({
            arr: [...arr],
            comparing: [j, j + 1],
            swapped: true,
            status: `Swapped ${arr[j + 1]} with ${arr[j]} since arr[${j}] > arr[${j + 1}].`
          });
        }
      }
    }

    steps.push({
      arr: [...arr],
      comparing: [],
      swapped: false,
      status: "Array is completely sorted!"
    });

    return steps;
  };

  const bsSteps = computeBinarySearchSteps(array, target);
  const currentBsStep = bsSteps[stepIndex] || bsSteps[0];

  const sortSteps = computeBubbleSortSteps(sortArray);
  const currentSortStep = sortSteps[sortStepIndex] || sortSteps[0];

  // Playback timer for Binary Search
  useEffect(() => {
    let timer;
    if (isPlaying && visualizerMode === "binary-search") {
      timer = setInterval(() => {
        setStepIndex((prev) => {
          if (prev < bsSteps.length - 1) return prev + 1;
          setIsPlaying(false);
          return prev;
        });
      }, 1400);
    }
    return () => clearInterval(timer);
  }, [isPlaying, visualizerMode, bsSteps.length]);

  // Playback timer for Sorting
  useEffect(() => {
    let timer;
    if (isSortPlaying && visualizerMode === "sorting") {
      timer = setInterval(() => {
        setSortStepIndex((prev) => {
          if (prev < sortSteps.length - 1) return prev + 1;
          setIsSortPlaying(false);
          return prev;
        });
      }, 800);
    }
    return () => clearInterval(timer);
  }, [isSortPlaying, visualizerMode, sortSteps.length]);

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1.5px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      margin: '24px 0',
      boxShadow: 'var(--shadow-md)'
    }}>
      {/* Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { setVisualizerMode("binary-search"); setIsPlaying(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid',
              borderColor: visualizerMode === "binary-search" ? 'var(--primary-color)' : 'var(--border-color)',
              background: visualizerMode === "binary-search" ? 'var(--primary-light)' : 'transparent',
              color: visualizerMode === "binary-search" ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <Search size={14} /> Binary Search
          </button>
          <button
            onClick={() => { setVisualizerMode("sorting"); setIsSortPlaying(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid',
              borderColor: visualizerMode === "sorting" ? 'var(--primary-color)' : 'var(--border-color)',
              background: visualizerMode === "sorting" ? 'var(--primary-light)' : 'transparent',
              color: visualizerMode === "sorting" ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <BarChart3 size={14} /> Bubble Sort
          </button>
        </div>

        {visualizerMode === "binary-search" ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Target Value:</label>
            <select
              value={target}
              onChange={(e) => {
                setTarget(Number(e.target.value));
                setStepIndex(0);
                setIsPlaying(false);
              }}
              style={{
                padding: '5px 10px',
                borderRadius: 'var(--radius-sm)',
                borderColor: 'var(--border-color)',
                fontWeight: '600',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
            >
              {array.map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
              <option value={99}>99 (Not Present)</option>
            </select>
          </div>
        ) : (
          <button
            onClick={() => {
              setSortArray([38, 14, 92, 55, 71, 19, 44, 28]);
              setSortStepIndex(0);
              setIsSortPlaying(false);
            }}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Generate New Array
          </button>
        )}
      </div>

      {visualizerMode === "binary-search" ? (
        <>
          {/* BINARY SEARCH BARS */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            margin: '28px 0',
            overflowX: 'auto',
            padding: '10px 0'
          }}>
            {array.map((val, idx) => {
              const isMid = idx === currentBsStep.mid;
              const isLow = idx === currentBsStep.low;
              const isHigh = idx === currentBsStep.high;
              const inRange = idx >= currentBsStep.low && idx <= currentBsStep.high;

              let bg = 'var(--bg-secondary)';
              let border = '1px solid var(--border-color)';
              let textColor = inRange ? 'var(--text-primary)' : 'var(--text-muted)';

              if (currentBsStep.found && isMid) {
                bg = 'var(--brand-green)';
                textColor = '#ffffff';
                border = '2px solid var(--brand-green)';
              } else if (isMid) {
                bg = '#f59e0b';
                textColor = '#ffffff';
                border = '2px solid #d97706';
              } else if (inRange) {
                bg = 'var(--bg-card)';
                border = '1.5px solid var(--primary-color)';
              } else {
                bg = 'var(--bg-secondary)';
                textColor = 'var(--text-muted)';
                border = '1px dashed var(--border-color)';
              }

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: isLow ? 'var(--primary-color)' : 'transparent', height: '14px' }}>
                    {isLow && "LOW"}
                  </div>
                  <div
                    style={{
                      width: '46px',
                      height: '52px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: bg,
                      color: textColor,
                      border: border,
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: '800',
                      fontSize: '16px',
                      transition: 'all 0.3s ease',
                      boxShadow: isMid ? '0 4px 12px rgba(245, 158, 11, 0.4)' : 'none'
                    }}
                  >
                    {val}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: isHigh ? '#dc2626' : (isMid ? '#f59e0b' : 'transparent'), height: '14px' }}>
                    {isMid ? "MID" : (isHigh ? "HIGH" : "")}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>[{idx}]</span>
                </div>
              );
            })}
          </div>

          {/* Status Box */}
          <div style={{
            background: currentBsStep.found ? 'rgba(34, 197, 94, 0.12)' : 'var(--bg-secondary)',
            borderLeft: currentBsStep.found ? '4px solid var(--brand-green)' : '4px solid var(--primary-color)',
            padding: '14px 18px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            lineHeight: 1.5,
            marginBottom: '20px'
          }}>
            <strong>Step {stepIndex + 1}/{bsSteps.length}: </strong>
            {currentBsStep.status}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
              disabled={stepIndex === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 14px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                cursor: stepIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: stepIndex === 0 ? 0.5 : 1
              }}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
                background: 'var(--primary-color)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: '700'
              }}
            >
              {isPlaying ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Auto Play</>}
            </button>
            <button
              onClick={() => setStepIndex(Math.min(bsSteps.length - 1, stepIndex + 1))}
              disabled={stepIndex === bsSteps.length - 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 14px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                cursor: stepIndex === bsSteps.length - 1 ? 'not-allowed' : 'pointer',
                opacity: stepIndex === bsSteps.length - 1 ? 0.5 : 1
              }}
            >
              Next <ChevronRight size={16} />
            </button>
            <button
              onClick={() => { setStepIndex(0); setIsPlaying(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 14px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        </>
      ) : (
        <>
          {/* SORTING BARS */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            gap: '12px',
            height: '180px',
            margin: '24px 0',
            padding: '10px 0',
            borderBottom: '2px solid var(--border-color)'
          }}>
            {currentSortStep.arr.map((val, idx) => {
              const isComp = currentSortStep.comparing.includes(idx);
              const barHeight = Math.max(25, (val / 100) * 150);

              let barBg = 'var(--primary-color)';
              if (isComp) {
                barBg = currentSortStep.swapped ? '#ef4444' : '#f59e0b';
              }

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>{val}</span>
                  <div
                    style={{
                      width: '38px',
                      height: `${barHeight}px`,
                      background: barBg,
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.25s ease, background 0.25s ease'
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>[{idx}]</span>
                </div>
              );
            })}
          </div>

          {/* Status Box */}
          <div style={{
            background: 'var(--bg-secondary)',
            borderLeft: '4px solid var(--primary-color)',
            padding: '14px 18px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            lineHeight: 1.5,
            marginBottom: '20px'
          }}>
            <strong>Step {sortStepIndex + 1}/{sortSteps.length}: </strong>
            {currentSortStep.status}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => setSortStepIndex(Math.max(0, sortStepIndex - 1))}
              disabled={sortStepIndex === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 14px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                cursor: sortStepIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: sortStepIndex === 0 ? 0.5 : 1
              }}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <button
              onClick={() => setIsSortPlaying(!isSortPlaying)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
                background: 'var(--primary-color)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: '700'
              }}
            >
              {isSortPlaying ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Auto Sort</>}
            </button>
            <button
              onClick={() => setSortStepIndex(Math.min(sortSteps.length - 1, sortStepIndex + 1))}
              disabled={sortStepIndex === sortSteps.length - 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 14px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                cursor: sortStepIndex === sortSteps.length - 1 ? 'not-allowed' : 'pointer',
                opacity: sortStepIndex === sortSteps.length - 1 ? 0.5 : 1
              }}
            >
              Next <ChevronRight size={16} />
            </button>
            <button
              onClick={() => { setSortStepIndex(0); setIsSortPlaying(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 14px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}
