# Codificators Isolated Execution Worker

This directory contains the production isolation architecture for untrusted student code execution.

## Security Boundary Architecture

Untrusted Python 3 and JavaScript code submissions are executed under strict containment:

1. **Non-Root Execution**: Runs under unprivileged user `sandboxuser` (`UID 10001:GID 10001`).
2. **Network Isolation**: Operating-system network namespace is completely detached (`--network none`). Untrusted code cannot initiate outbound connections, download payloads, or scan internal services.
3. **Resource Bounds**:
   - CPU Quota: `--cpus 0.5`
   - Memory Limit: `--memory 128m` (strict OOM termination; swap bounded to 128m)
   - Process Limit: `--pids-limit 64` (prevents fork-bombs and thread exhaustion)
   - Wall-Clock Deadline: 3,000ms enforced with `SIGKILL`
   - Output Limit: 64 KB max stdout/stderr buffer
4. **Filesystem Security**:
   - Root filesystem is mounted read-only (`--read-only`).
   - Ephemeral working files are mounted into a restricted `tmpfs` with `noexec,nosuid,nodev` flags and a strict 16MB cap.
   - Application database, secrets, and source code are never mounted into the container.
5. **Privilege Dropping**:
   - All Linux kernel capabilities dropped (`--cap-drop ALL`).
   - Privilege escalation blocked (`--security-opt no-new-privileges:true`).

## Local Development vs Production

- **Production Mode**: Build the sandbox image via `docker build -t codificators-sandbox:latest -f Dockerfile.worker .` and configure `EXECUTION_BACKEND=docker` in the LMS environment.
- **Local Development Fallback**: On Windows/macOS development environments where Docker is not running or cgroup namespaces are unavailable, the platform runs `LocalSubprocessWorker`. This fallback runs `python -I -S -u` and `node --disallow-code-generation-from-strings` with stripped environments, static AST inspection, wall-clock timeouts, and bounded execution queues.
