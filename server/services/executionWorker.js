/**
 * Codificators Isolated Execution Worker (Phase 7.2 Production Gate)
 * Provides pluggable execution worker runtimes:
 * 1. ContainerWorker (for hardened Linux production container execution with cgroups & network isolation)
 * 2. LocalSubprocessWorker (for local development with isolated process parameters and AST inspection)
 * 3. DisabledExecutionWorker (production gate enforcement when required container backend is unavailable)
 */

import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const MAX_CODE_BYTES = 64 * 1024; // 64 KB max source code
export const MAX_OUTPUT_BYTES = 64 * 1024; // 64 KB max output buffer
export const DEFAULT_EXECUTION_TIMEOUT_MS = 3000;

// State flags for one-time warning logs
let hasWarnedDevSubprocess = false;
let hasWarnedProductionGate = false;

// Docker availability cache (5-second TTL to avoid frequent shell-outs)
let dockerAvailabilityCache = {
  checkedAt: 0,
  available: false,
  version: null
};

export function checkDockerAvailability() {
  const now = Date.now();
  if (now - dockerAvailabilityCache.checkedAt < 5000) {
    return dockerAvailabilityCache.available;
  }

  try {
    const versionOut = execSync('docker --version', {
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 1500,
      encoding: 'utf8'
    });
    dockerAvailabilityCache = {
      checkedAt: now,
      available: true,
      version: versionOut.trim()
    };
    return true;
  } catch {
    dockerAvailabilityCache = {
      checkedAt: now,
      available: false,
      version: null
    };
    return false;
  }
}

// Security pre-check: inspect for hostile primitives in local development fallback
export function checkCodeSecurity(language, code, isHarness = false) {
  const lang = (language || '').toLowerCase().trim();
  if (lang === 'python') {
    // Detect system compromise primitives
    const dangerousPatterns = [
      /\bimport\s+subprocess\b/,
      /\bfrom\s+subprocess\b/,
      /\bimport\s+ctypes\b/,
      /\bfrom\s+ctypes\b/,
      /\b__import__\s*\(\s*['"]subprocess['"]\s*\)/,
      /\b__import__\s*\(\s*['"]ctypes['"]\s*\)/
    ];
    if (!isHarness) {
      dangerousPatterns.push(/\b__run_codificator_tests\b/);
    }
    for (const pat of dangerousPatterns) {
      if (pat.test(code)) {
        return {
          safe: false,
          reason: 'Security violation: Restricted system module or internal symbol detected.'
        };
      }
    }
  } else if (lang === 'javascript') {
    const dangerousPatterns = [
      /\brequire\s*\(\s*['"]child_process['"]\s*\)/,
      /\brequire\s*\(\s*['"]cluster['"]\s*\)/
    ];
    if (!isHarness) {
      dangerousPatterns.push(/\b__run_codificator_tests\b/);
    }
    for (const pat of dangerousPatterns) {
      if (pat.test(code)) {
        return {
          safe: false,
          reason: 'Security violation: Restricted system package or internal symbol detected.'
        };
      }
    }
  }
  return { safe: true };
}

/**
 * Disabled Execution Worker (Production Gate Sentinel)
 * Activated when required container isolation is missing in production.
 */
export class DisabledExecutionWorker {
  constructor(reason = 'Docker container sandbox backend is required in production.') {
    this.name = 'DisabledExecutionWorker';
    this.reason = reason;
  }

  async executeRaw(language, code, stdin = '', timeoutMs = DEFAULT_EXECUTION_TIMEOUT_MS, metadata = {}) {
    return {
      status: 'EXECUTION_DISABLED',
      stdout: '',
      stderr: `Code execution disabled: ${this.reason}`,
      runtimeMs: 0
    };
  }

  async gradeFunction(language, code, functionName, testCases = [], timeoutMs = DEFAULT_EXECUTION_TIMEOUT_MS, metadata = {}) {
    return {
      status: 'EXECUTION_DISABLED',
      passedTests: 0,
      totalTests: testCases ? testCases.length : 0,
      runtimeMs: 0,
      errorMessage: `Code execution disabled: ${this.reason}`,
      testResults: []
    };
  }
}

/**
 * Hardened Container Execution Worker (Production Sandbox Backend)
 */
export class ContainerWorker {
  constructor(options = {}) {
    this.name = 'ContainerWorker';
    this.imageName = options.imageName || process.env.SANDBOX_IMAGE || 'codificators-sandbox:latest';
    this.memoryLimit = options.memoryLimit || '128m';
    this.cpuQuota = options.cpuQuota || '0.5';
    this.pidsLimit = options.pidsLimit || 64;
  }

  async executeRaw(language, code, stdin = '', timeoutMs = DEFAULT_EXECUTION_TIMEOUT_MS, metadata = {}) {
    const lang = (language || '').toLowerCase().trim();

    if (lang !== 'python' && lang !== 'javascript') {
      return {
        status: 'UNSUPPORTED_LANGUAGE',
        stdout: '',
        stderr: `Language "${language}" is not currently supported for execution. Supported runtimes: Python 3, JavaScript (ES6+).`,
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

    const runId = `codificator-container-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const tempDir = path.join(os.tmpdir(), runId);
    fs.mkdirSync(tempDir, { recursive: true });

    const filename = lang === 'python' ? 'script.py' : 'script.js';
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, code, 'utf8');

    // Docker run arguments enforcing Linux kernel isolation:
    // - Network detached (--network none)
    // - Cgroup CPU & memory caps
    // - Process count cap (--pids-limit)
    // - Read-only root filesystem
    // - Ephemeral 16MB noexec tmpfs mount
    // - Capability dropping (--cap-drop ALL)
    // - Non-root user (UID 10001)
    const dockerArgs = [
      'run', '--rm',
      '--name', runId,
      '--network', 'none',
      '--cpus', String(this.cpuQuota),
      '--memory', this.memoryLimit,
      '--memory-swap', this.memoryLimit,
      '--pids-limit', String(this.pidsLimit),
      '--read-only',
      '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges:true',
      '--user', '10001:10001',
      '--tmpfs', '/tmp:rw,size=16m,noexec,nodev,nosuid',
      '-v', `${filePath}:/sandbox/${filename}:ro`,
      this.imageName
    ];

    if (lang === 'python') {
      dockerArgs.push('python3', '-I', '-S', '-u', `/sandbox/${filename}`);
    } else {
      dockerArgs.push('node', '--disallow-code-generation-from-strings', `/sandbox/${filename}`);
    }

    const startTime = Date.now();

    return new Promise((resolve) => {
      let stdoutBuffer = '';
      let stderrBuffer = '';
      let timedOut = false;
      let bufferExceeded = false;
      let child;

      try {
        child = spawn('docker', dockerArgs, {
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch (spawnErr) {
        cleanupDir(tempDir);
        return resolve({
          status: 'INFRASTRUCTURE_ERROR',
          stdout: '',
          stderr: `Failed to spawn container sandbox: ${spawnErr.message}`,
          runtimeMs: 0
        });
      }

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          execSync(`docker kill ${runId}`, { stdio: 'ignore' });
        } catch {}
        try { child.kill('SIGKILL'); } catch {}
      }, timeoutMs);

      if (stdin && child.stdin) {
        try {
          child.stdin.write(stdin);
          child.stdin.end();
        } catch {}
      } else if (child.stdin) {
        child.stdin.end();
      }

      child.stdout.on('data', (chunk) => {
        if (stdoutBuffer.length + chunk.length > MAX_OUTPUT_BYTES) {
          bufferExceeded = true;
          stdoutBuffer += chunk.toString('utf8').slice(0, MAX_OUTPUT_BYTES - stdoutBuffer.length);
          try { child.kill('SIGKILL'); } catch {}
        } else {
          stdoutBuffer += chunk.toString('utf8');
        }
      });

      child.stderr.on('data', (chunk) => {
        if (stderrBuffer.length + chunk.length > MAX_OUTPUT_BYTES) {
          stderrBuffer += chunk.toString('utf8').slice(0, MAX_OUTPUT_BYTES - stderrBuffer.length);
        } else {
          stderrBuffer += chunk.toString('utf8');
        }
      });

      child.on('close', (exitCode) => {
        clearTimeout(timer);
        const runtimeMs = Date.now() - startTime;
        cleanupDir(tempDir);

        if (timedOut) {
          return resolve({
            status: 'TIME_LIMIT_EXCEEDED',
            stdout: stdoutBuffer,
            stderr: `Time Limit Exceeded: Execution terminated after exceeding ${timeoutMs}ms limit inside container sandbox.`,
            runtimeMs
          });
        }

        if (bufferExceeded) {
          return resolve({
            status: 'OUTPUT_LIMIT_EXCEEDED',
            stdout: stdoutBuffer,
            stderr: `Output Limit Exceeded: Execution produced more than ${MAX_OUTPUT_BYTES / 1024} KB of output.`,
            runtimeMs
          });
        }

        if (exitCode !== 0) {
          return resolve({
            status: 'RUNTIME_ERROR',
            stdout: stdoutBuffer,
            stderr: stderrBuffer.trim() || `Container process exited with error code ${exitCode}`,
            runtimeMs
          });
        }

        return resolve({
          status: 'SUCCESS',
          stdout: stdoutBuffer,
          stderr: stderrBuffer,
          runtimeMs
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        cleanupDir(tempDir);
        return resolve({
          status: 'INFRASTRUCTURE_ERROR',
          stdout: stdoutBuffer,
          stderr: `Container execution error: ${err.message}`,
          runtimeMs: Date.now() - startTime
        });
      });
    });
  }

  async gradeFunction(language, code, functionName, testCases = [], timeoutMs = DEFAULT_EXECUTION_TIMEOUT_MS, metadata = {}) {
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

    const harnessCode = lang === 'python'
      ? buildHardenedPythonHarness(code, functionName, testCases)
      : buildHardenedJavaScriptHarness(code, functionName, testCases);

    const rawResult = await this.executeRaw(lang, harnessCode, '', timeoutMs, { ...metadata, isHarness: true });
    return parseHarnessResult(rawResult, functionName, testCases, timeoutMs);
  }
}

/**
 * Local Subprocess Execution Worker (Development Fallback Backend)
 */
export class LocalSubprocessWorker {
  constructor() {
    this.name = 'LocalSubprocessWorker';
  }

  async executeRaw(language, code, stdin = '', timeoutMs = DEFAULT_EXECUTION_TIMEOUT_MS, metadata = {}) {
    const lang = (language || '').toLowerCase().trim();

    if (lang !== 'python' && lang !== 'javascript') {
      return {
        status: 'UNSUPPORTED_LANGUAGE',
        stdout: '',
        stderr: `Language "${language}" is not currently supported for execution. Supported runtimes: Python 3, JavaScript (ES6+).`,
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

    const secCheck = checkCodeSecurity(lang, code, Boolean(metadata.isHarness));
    if (!secCheck.safe) {
      return {
        status: 'SECURITY_VIOLATION',
        stdout: '',
        stderr: secCheck.reason,
        runtimeMs: 0
      };
    }

    const runId = `codificator-exec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const tempDir = path.join(os.tmpdir(), runId);
    fs.mkdirSync(tempDir, { recursive: true });

    const filename = lang === 'python' ? 'script.py' : 'script.js';
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, code, 'utf8');

    // Scrubbed environment - zero application secrets
    const safeEnv = {
      PATH: process.env.PATH || '',
      SYSTEMROOT: process.env.SYSTEMROOT || '',
      TEMP: tempDir,
      TMP: tempDir
    };

    const command = lang === 'python' ? 'python' : 'node';
    const args = lang === 'python'
      ? ['-I', '-S', '-u', filePath]
      : ['--disallow-code-generation-from-strings', '--no-warnings', filePath];

    const startTime = Date.now();

    return new Promise((resolve) => {
      let stdoutBuffer = '';
      let stderrBuffer = '';
      let timedOut = false;
      let bufferExceeded = false;
      let child;

      try {
        child = spawn(command, args, {
          cwd: tempDir,
          env: safeEnv,
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch (spawnErr) {
        cleanupDir(tempDir);
        return resolve({
          status: 'INFRASTRUCTURE_ERROR',
          stdout: '',
          stderr: `Failed to spawn runtime worker: ${spawnErr.message}`,
          runtimeMs: 0
        });
      }

      const timer = setTimeout(() => {
        timedOut = true;
        try { child.kill('SIGKILL'); } catch {}
      }, timeoutMs);

      if (stdin && child.stdin) {
        try {
          child.stdin.write(stdin);
          child.stdin.end();
        } catch {}
      } else if (child.stdin) {
        child.stdin.end();
      }

      child.stdout.on('data', (chunk) => {
        if (stdoutBuffer.length + chunk.length > MAX_OUTPUT_BYTES) {
          bufferExceeded = true;
          stdoutBuffer += chunk.toString('utf8').slice(0, MAX_OUTPUT_BYTES - stdoutBuffer.length);
          try { child.kill('SIGKILL'); } catch {}
        } else {
          stdoutBuffer += chunk.toString('utf8');
        }
      });

      child.stderr.on('data', (chunk) => {
        if (stderrBuffer.length + chunk.length > MAX_OUTPUT_BYTES) {
          stderrBuffer += chunk.toString('utf8').slice(0, MAX_OUTPUT_BYTES - stderrBuffer.length);
        } else {
          stderrBuffer += chunk.toString('utf8');
        }
      });

      child.on('close', (exitCode) => {
        clearTimeout(timer);
        const runtimeMs = Date.now() - startTime;
        cleanupDir(tempDir);

        if (timedOut) {
          return resolve({
            status: 'TIME_LIMIT_EXCEEDED',
            stdout: stdoutBuffer,
            stderr: `Time Limit Exceeded: Execution terminated after exceeding ${timeoutMs}ms limit. Check for infinite loops or deep recursion.`,
            runtimeMs
          });
        }

        if (bufferExceeded) {
          return resolve({
            status: 'OUTPUT_LIMIT_EXCEEDED',
            stdout: stdoutBuffer,
            stderr: `Output Limit Exceeded: Execution produced more than ${MAX_OUTPUT_BYTES / 1024} KB of output.`,
            runtimeMs
          });
        }

        if (exitCode !== 0) {
          return resolve({
            status: 'RUNTIME_ERROR',
            stdout: stdoutBuffer,
            stderr: stderrBuffer.trim() || `Process exited with error code ${exitCode}`,
            runtimeMs
          });
        }

        return resolve({
          status: 'SUCCESS',
          stdout: stdoutBuffer,
          stderr: stderrBuffer,
          runtimeMs
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        cleanupDir(tempDir);
        return resolve({
          status: 'INFRASTRUCTURE_ERROR',
          stdout: stdoutBuffer,
          stderr: `Process execution error: ${err.message}`,
          runtimeMs: Date.now() - startTime
        });
      });
    });
  }

  async gradeFunction(language, code, functionName, testCases = [], timeoutMs = DEFAULT_EXECUTION_TIMEOUT_MS, metadata = {}) {
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

    const secCheck = checkCodeSecurity(lang, code);
    if (!secCheck.safe) {
      return {
        status: 'SECURITY_VIOLATION',
        passedTests: 0,
        totalTests: testCases.length,
        runtimeMs: 0,
        errorMessage: secCheck.reason,
        testResults: []
      };
    }

    // Build test harness with strict secret scrubbing
    const harnessCode = lang === 'python'
      ? buildHardenedPythonHarness(code, functionName, testCases)
      : buildHardenedJavaScriptHarness(code, functionName, testCases);

    const rawResult = await this.executeRaw(lang, harnessCode, '', timeoutMs, { ...metadata, isHarness: true });
    return parseHarnessResult(rawResult, functionName, testCases, timeoutMs);
  }
}

function parseHarnessResult(rawResult, functionName, testCases, timeoutMs) {
  if (rawResult.status === 'TIME_LIMIT_EXCEEDED') {
    return {
      status: 'TIME_LIMIT_EXCEEDED',
      passedTests: 0,
      totalTests: testCases.length,
      runtimeMs: rawResult.runtimeMs,
      errorMessage: `Execution timed out (${timeoutMs}ms limit exceeded). Ensure your code does not contain infinite loops.`,
      testResults: testCases.map((tc, idx) => ({
        index: idx + 1,
        isPrivate: Boolean(tc.is_private),
        passed: false,
        error: 'Execution timed out'
      }))
    };
  }

  if (rawResult.status === 'OUTPUT_LIMIT_EXCEEDED') {
    return {
      status: 'OUTPUT_LIMIT_EXCEEDED',
      passedTests: 0,
      totalTests: testCases.length,
      runtimeMs: rawResult.runtimeMs,
      errorMessage: `Output limit exceeded (max ${MAX_OUTPUT_BYTES / 1024} KB). Avoid printing inside large loops.`,
      testResults: []
    };
  }

  if (rawResult.status === 'SECURITY_VIOLATION') {
    return {
      status: 'SECURITY_VIOLATION',
      passedTests: 0,
      totalTests: testCases.length,
      runtimeMs: 0,
      errorMessage: rawResult.stderr,
      testResults: []
    };
  }

  if (rawResult.status === 'INFRASTRUCTURE_ERROR') {
    return {
      status: 'INFRASTRUCTURE_ERROR',
      passedTests: 0,
      totalTests: testCases.length,
      runtimeMs: rawResult.runtimeMs,
      errorMessage: 'Execution worker infrastructure error. Please contact course administrator.',
      testResults: []
    };
  }

  if (rawResult.status === 'RUNTIME_ERROR') {
    return {
      status: 'RUNTIME_ERROR',
      passedTests: 0,
      totalTests: testCases.length,
      runtimeMs: rawResult.runtimeMs,
      errorMessage: rawResult.stderr || 'Runtime or Syntax Error during execution',
      testResults: []
    };
  }

  // Parse structured harness output
  const lines = rawResult.stdout.split('\n');
  const resultLine = lines.find(l => l.startsWith('__CODIFICATOR_TEST_RESULT__'));

  if (!resultLine) {
    return {
      status: 'RUNTIME_ERROR',
      passedTests: 0,
      totalTests: testCases.length,
      runtimeMs: rawResult.runtimeMs,
      errorMessage: rawResult.stderr || `Function '${functionName}' did not execute correctly or was not defined.`,
      testResults: []
    };
  }

  try {
    const parsedData = JSON.parse(resultLine.replace('__CODIFICATOR_TEST_RESULT__', '').trim());
    const allPassed = parsedData.passedTests === testCases.length;

    return {
      status: allPassed ? 'ACCEPTED' : 'WRONG_ANSWER',
      passedTests: parsedData.passedTests,
      totalTests: testCases.length,
      runtimeMs: rawResult.runtimeMs,
      errorMessage: allPassed ? null : `Failed on test case ${parsedData.firstFailedIndex || 1}`,
      testResults: parsedData.results
    };
  } catch (err) {
    return {
      status: 'INFRASTRUCTURE_ERROR',
      passedTests: 0,
      totalTests: testCases.length,
      runtimeMs: rawResult.runtimeMs,
      errorMessage: `Failed to parse worker execution results: ${err.message}`,
      testResults: []
    };
  }
}

/**
 * Hardened Python Test Harness
 * Guarantees that exceptions or errors on hidden test cases never expose hidden input/output values.
 */
function buildHardenedPythonHarness(userCode, functionName, testCases) {
  const jsonTestCases = JSON.stringify(testCases.map((tc, idx) => ({
    index: idx + 1,
    input: typeof tc.input_json === 'string' ? JSON.parse(tc.input_json) : (tc.input_json || tc.input),
    expected: typeof tc.expected_output_json === 'string' ? JSON.parse(tc.expected_output_json) : (tc.expected_output_json ?? tc.expected),
    is_private: Boolean(tc.is_private)
  })));

  return `
import sys
import json

# --- STUDENT IMPLEMENTATION BEGIN ---
${userCode}
# --- STUDENT IMPLEMENTATION END ---

def __run_codificator_tests():
    test_cases = json.loads('''${jsonTestCases.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}''')
    target_fn = globals().get('${functionName}')
    if not target_fn or not callable(target_fn):
        print(f"Error: Function '${functionName}' is not defined.", file=sys.stderr)
        sys.exit(1)

    passed_count = 0
    results = []
    first_failed_idx = None

    for tc in test_cases:
        inp = tc['input']
        expected = tc['expected']
        is_private = tc['is_private']
        idx = tc['index']

        try:
            if isinstance(inp, dict):
                actual = target_fn(**inp)
            elif isinstance(inp, list):
                actual = target_fn(*inp)
            else:
                actual = target_fn(inp)

            passed = (actual == expected)
            if passed:
                passed_count += 1
            elif first_failed_idx is None:
                first_failed_idx = idx

            res_entry = {
                'index': idx,
                'isPrivate': is_private,
                'passed': passed
            }
            if not is_private:
                res_entry['input'] = inp
                res_entry['expected'] = expected
                res_entry['actual'] = actual

            results.append(res_entry)
        except Exception as e:
            if first_failed_idx is None:
                first_failed_idx = idx
            res_entry = {
                'index': idx,
                'isPrivate': is_private,
                'passed': False,
                'error': 'Execution error on hidden test case' if is_private else str(e)
            }
            if not is_private:
                res_entry['input'] = inp
                res_entry['expected'] = expected
            results.append(res_entry)

    summary = {
        'passedTests': passed_count,
        'totalTests': len(test_cases),
        'firstFailedIndex': first_failed_idx,
        'results': results
    }
    print('__CODIFICATOR_TEST_RESULT__ ' + json.dumps(summary))

if __name__ == '__main__':
    __run_codificator_tests()
`;
}

/**
 * Hardened JavaScript Test Harness
 * Strict isolation and concealment of hidden test case data.
 */
function buildHardenedJavaScriptHarness(userCode, functionName, testCases) {
  const jsonTestCases = JSON.stringify(testCases.map((tc, idx) => ({
    index: idx + 1,
    input: typeof tc.input_json === 'string' ? JSON.parse(tc.input_json) : (tc.input_json || tc.input),
    expected: typeof tc.expected_output_json === 'string' ? JSON.parse(tc.expected_output_json) : (tc.expected_output_json ?? tc.expected),
    is_private: Boolean(tc.is_private)
  })));

  return `
// --- STUDENT IMPLEMENTATION BEGIN ---
${userCode}
// --- STUDENT IMPLEMENTATION END ---

(function __run_codificator_tests() {
  const testCases = ${jsonTestCases};
  const targetFn = (typeof ${functionName} === 'function') ? ${functionName} : null;

  if (!targetFn) {
    console.error("Error: Function '${functionName}' is not defined.");
    process.exit(1);
  }

  let passedCount = 0;
  const results = [];
  let firstFailedIdx = null;

  for (const tc of testCases) {
    const inp = tc.input;
    const expected = tc.expected;
    const isPrivate = tc.is_private;
    const idx = tc.index;

    try {
      let actual;
      if (Array.isArray(inp)) {
        actual = targetFn(...inp);
      } else if (typeof inp === 'object' && inp !== null) {
        actual = targetFn(...Object.values(inp));
      } else {
        actual = targetFn(inp);
      }

      const passed = JSON.stringify(actual) === JSON.stringify(expected);
      if (passed) {
        passedCount++;
      } else if (firstFailedIdx === null) {
        firstFailedIdx = idx;
      }

      const resEntry = {
        index: idx,
        isPrivate: isPrivate,
        passed: passed
      };

      if (!isPrivate) {
        resEntry.input = inp;
        resEntry.expected = expected;
        resEntry.actual = actual;
      }

      results.push(resEntry);
    } catch (err) {
      if (firstFailedIdx === null) firstFailedIdx = idx;
      const resEntry = {
        index: idx,
        isPrivate: isPrivate,
        passed: false,
        error: isPrivate ? 'Execution error on hidden test case' : err.message
      };
      if (!isPrivate) {
        resEntry.input = inp;
        resEntry.expected = expected;
      }
      results.push(resEntry);
    }
  }

  const summary = {
    passedTests: passedCount,
    totalTests: testCases.length,
    firstFailedIndex: firstFailedIdx,
    results: results
  };

  console.log('__CODIFICATOR_TEST_RESULT__ ' + JSON.stringify(summary));
})();
`;
}

function cleanupDir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch {}
}

/**
 * Production Security Gate & Worker Factory
 * Returns active execution worker according to environment configuration.
 * In production mode (NODE_ENV=production):
 * - Strictly requires EXECUTION_BACKEND=docker with verified Docker Engine.
 * - Refuses silent fallback to host subprocesses.
 * - If Docker is missing, returns DisabledExecutionWorker to protect the host.
 */
export function getActiveExecutionWorker() {
  const backend = (process.env.EXECUTION_BACKEND || '').toLowerCase().trim();
  const isProd = process.env.NODE_ENV === 'production';

  // Explicit disable check
  if (backend === 'disabled' || process.env.DISABLE_CODE_EXECUTION === 'true') {
    return new DisabledExecutionWorker('Code execution is explicitly disabled via configuration.');
  }

  // Production Gate Enforcement
  if (isProd) {
    if (backend !== 'docker') {
      if (!hasWarnedProductionGate) {
        console.error(
          '❌ [PRODUCTION SECURITY GATE ACTIVATED] Code execution disabled: EXECUTION_BACKEND must be set to "docker" in production. ' +
          'Direct host subprocess execution is strictly forbidden in production mode to protect host secrets and system integrity.'
        );
        hasWarnedProductionGate = true;
      }
      return new DisabledExecutionWorker(
        'Production mode requires an active container sandbox backend (EXECUTION_BACKEND=docker). Silent fallback to host execution is strictly forbidden.'
      );
    }

    const dockerOk = checkDockerAvailability();
    if (!dockerOk) {
      if (!hasWarnedProductionGate) {
        console.error(
          '❌ [PRODUCTION SECURITY GATE ACTIVATED] Code execution disabled: Docker container backend is configured, but Docker daemon is unreachable. ' +
          'Refusing insecure fallback to host subprocess execution in production mode.'
        );
        hasWarnedProductionGate = true;
      }
      return new DisabledExecutionWorker(
        'Docker container sandbox is configured but Docker Engine is unavailable. Interactive coding execution is disabled to protect the production host.'
      );
    }

    return new ContainerWorker();
  }

  // Development Mode (NODE_ENV !== 'production')
  if (backend === 'docker') {
    if (checkDockerAvailability()) {
      return new ContainerWorker();
    }
    console.warn(
      '⚠️  [SECURITY WARNING] EXECUTION_BACKEND=docker configured in development mode, but Docker Engine is unreachable. ' +
      'Falling back to LocalSubprocessWorker for development.'
    );
  }

  // Local development fallback with security notice
  if (!hasWarnedDevSubprocess && process.env.NODE_ENV !== 'test') {
    console.warn(
      '⚠️  [SECURITY WARNING] Running LocalSubprocessWorker in development mode. ' +
      'Host subprocess execution is NOT an OS-level sandbox. Production deployments MUST configure EXECUTION_BACKEND=docker with verified container isolation.'
    );
    hasWarnedDevSubprocess = true;
  }

  return new LocalSubprocessWorker();
}

// Default export compatibility
export const defaultExecutionWorker = getActiveExecutionWorker();
