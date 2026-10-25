/**
 * Codificators Secure Code Execution Service (Phase 7 Production Hardened)
 * Coordinates rate limiting, execution queuing, bounded worker concurrency,
 * and test case grading with strict data protection.
 */

import { globalExecutionQueue, QueueCapacityExceededError, QueueTimeoutError } from './executionQueue.js';
import { getActiveExecutionWorker, defaultExecutionWorker, MAX_CODE_BYTES, DEFAULT_EXECUTION_TIMEOUT_MS } from './executionWorker.js';

// Per-user rate limiting (token bucket with sliding window)
const rateLimitMap = new Map();

export function checkRateLimit(userId, limitPerMinute = 15) {
  const now = Date.now();
  const windowMs = 60 * 1000;

  if (!rateLimitMap.has(userId)) {
    rateLimitMap.set(userId, [now]);
    return { allowed: true, remaining: limitPerMinute - 1 };
  }

  const timestamps = rateLimitMap.get(userId).filter(t => now - t < windowMs);
  if (timestamps.length >= limitPerMinute) {
    const oldest = timestamps[0];
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return { allowed: true, remaining: limitPerMinute - timestamps.length };
}

// Periodic cleanup of stale rate-limit entries
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter(t => now - t < 60000);
    if (valid.length === 0) {
      rateLimitMap.delete(userId);
    } else {
      rateLimitMap.set(userId, valid);
    }
  }
}, 120000).unref();

/**
 * Executes a standalone script in an isolated execution worker through the bounded queue.
 */
export async function executeRawScript(language, code, stdin = '', timeoutMs = DEFAULT_EXECUTION_TIMEOUT_MS, metadata = {}) {
  const lang = (language || '').toLowerCase().trim();
  if (lang !== 'python' && lang !== 'javascript') {
    return {
      status: 'UNSUPPORTED_LANGUAGE',
      stdout: '',
      stderr: `Language "${language}" is not currently supported for execution. Supported runtimes: Python 3, JavaScript (ES6+).`,
      runtimeMs: 0
    };
  }

  if (typeof code !== 'string') {
    return {
      status: 'RUNTIME_ERROR',
      stdout: '',
      stderr: 'Invalid source code: payload must be a string.',
      runtimeMs: 0
    };
  }

  if (code.length > MAX_CODE_BYTES) {
    return {
      status: 'PAYLOAD_TOO_LARGE',
      stdout: '',
      stderr: `Code payload exceeds maximum allowed size of ${MAX_CODE_BYTES / 1024} KB.`,
      runtimeMs: 0
    };
  }

  const worker = getActiveExecutionWorker();
  if (worker.name === 'DisabledExecutionWorker') {
    return await worker.executeRaw(lang, code, stdin, timeoutMs, metadata);
  }

  try {
    return await globalExecutionQueue.enqueue(
      () => worker.executeRaw(lang, code, stdin, timeoutMs, metadata),
      { ...metadata, language: lang }
    );
  } catch (err) {
    if (err instanceof QueueCapacityExceededError) {
      return {
        status: 'CAPACITY_EXCEEDED',
        stdout: '',
        stderr: err.message,
        runtimeMs: 0
      };
    }
    if (err instanceof QueueTimeoutError) {
      return {
        status: 'QUEUE_TIMEOUT',
        stdout: '',
        stderr: err.message,
        runtimeMs: 0
      };
    }
    return {
      status: 'INFRASTRUCTURE_ERROR',
      stdout: '',
      stderr: `Worker error: ${err.message}`,
      runtimeMs: 0
    };
  }
}

/**
 * Builds an automated test harness around student code and grades against test cases
 * via the bounded execution queue and isolated execution worker.
 */
export async function gradeFunctionSubmission(language, code, functionName, testCases = [], timeoutMs = DEFAULT_EXECUTION_TIMEOUT_MS, metadata = {}) {
  const lang = (language || '').toLowerCase().trim();
  if (lang !== 'python' && lang !== 'javascript') {
    return {
      status: 'UNSUPPORTED_LANGUAGE',
      passedTests: 0,
      totalTests: testCases.length,
      runtimeMs: 0,
      errorMessage: `Language "${language}" is not supported. Supported: python, javascript`,
      testResults: []
    };
  }

  if (typeof code !== 'string') {
    return {
      status: 'RUNTIME_ERROR',
      passedTests: 0,
      totalTests: testCases.length,
      runtimeMs: 0,
      errorMessage: 'Invalid source code payload: string expected.',
      testResults: []
    };
  }

  if (code.length > MAX_CODE_BYTES) {
    return {
      status: 'PAYLOAD_TOO_LARGE',
      passedTests: 0,
      totalTests: testCases.length,
      runtimeMs: 0,
      errorMessage: `Source code exceeds ${MAX_CODE_BYTES / 1024} KB limit`,
      testResults: []
    };
  }

  const worker = getActiveExecutionWorker();
  if (worker.name === 'DisabledExecutionWorker') {
    return await worker.gradeFunction(lang, code, functionName, testCases, timeoutMs, metadata);
  }

  try {
    return await globalExecutionQueue.enqueue(
      () => worker.gradeFunction(lang, code, functionName, testCases, timeoutMs, metadata),
      { ...metadata, language: lang }
    );
  } catch (err) {
    if (err instanceof QueueCapacityExceededError) {
      return {
        status: 'CAPACITY_EXCEEDED',
        passedTests: 0,
        totalTests: testCases.length,
        runtimeMs: 0,
        errorMessage: err.message,
        testResults: []
      };
    }
    if (err instanceof QueueTimeoutError) {
      return {
        status: 'QUEUE_TIMEOUT',
        passedTests: 0,
        totalTests: testCases.length,
        runtimeMs: 0,
        errorMessage: err.message,
        testResults: []
      };
    }
    return {
      status: 'INFRASTRUCTURE_ERROR',
      passedTests: 0,
      totalTests: testCases.length,
      runtimeMs: 0,
      errorMessage: `Worker queue failure: ${err.message}`,
      testResults: []
    };
  }
}

/**
 * Exposes current queue and worker metrics for monitoring.
 */
export function getExecutionOperationalMetrics() {
  const worker = getActiveExecutionWorker();
  return {
    ...globalExecutionQueue.getMetrics(),
    activeWorkerBackend: worker.name,
    isExecutionAvailable: worker.name !== 'DisabledExecutionWorker',
    backendConfigured: process.env.EXECUTION_BACKEND || 'subprocess'
  };
}
