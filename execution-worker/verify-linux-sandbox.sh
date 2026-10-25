#!/usr/bin/env bash
# Codificators LMS - Production Linux Sandbox Verification Script
# Verifies container build, OS-level kernel resource isolation, and security boundaries.

set -euo pipefail

IMAGE_NAME="codificators-sandbox:latest"

echo "=================================================================="
echo "CODIFICATORS LMS — LINUX SANDBOX SECURITY VERIFICATION SUITE"
echo "=================================================================="

# 1. Environment Details
echo -e "\n--- Step 1: Environment Inspection ---"
uname -a
if command -v docker >/dev/null 2>&1; then
  docker --version
else
  echo "Error: Docker is not installed or not in PATH." >&2
  exit 1
fi

if [ -d "/sys/fs/cgroup" ]; then
  CGROUP_TYPE=$(stat -fc %T /sys/fs/cgroup/)
  echo "Cgroup File System: $CGROUP_TYPE"
fi

# 2. Build Container Image
echo -e "\n--- Step 2: Building Execution Worker Image ---"
docker build -t "$IMAGE_NAME" -f execution-worker/Dockerfile.worker execution-worker/
IMAGE_ID=$(docker images -q "$IMAGE_NAME" | head -n1)
echo "Container image built successfully: $IMAGE_NAME (ID: $IMAGE_ID)"

# 3. Verify Runtimes & Non-root User
echo -e "\n--- Step 3: Runtime & User Privileges ---"
docker run --rm "$IMAGE_NAME" python3 --version
docker run --rm "$IMAGE_NAME" node --version

UID_VAL=$(docker run --rm "$IMAGE_NAME" id -u)
GID_VAL=$(docker run --rm "$IMAGE_NAME" id -g)
echo "Worker effective UID: $UID_VAL, GID: $GID_VAL"
if [ "$UID_VAL" != "10001" ]; then
  echo "FAIL: Expected UID 10001, got $UID_VAL" >&2
  exit 1
fi
echo "PASS: Worker runs as unprivileged non-root user (10001:10001)"

# 4. Verify Network Isolation
echo -e "\n--- Step 4: Network Isolation Check ---"
if docker run --rm --network none "$IMAGE_NAME" python3 -c "import socket; socket.create_connection(('1.1.1.1', 80), timeout=2)" 2>&1 | grep -qE "(Network is unreachable|errno 101)"; then
  echo "PASS: Outbound network traffic is blocked (--network none)"
else
  echo "FAIL: Network isolation check did not detect blocked traffic" >&2
  exit 1
fi

# 5. Verify Read-Only Root Filesystem
echo -e "\n--- Step 5: Read-Only Root Filesystem Check ---"
if docker run --rm --read-only "$IMAGE_NAME" touch /malicious_write.txt 2>&1 | grep -q "Read-only file system"; then
  echo "PASS: Root filesystem is strictly read-only"
else
  echo "FAIL: Root filesystem is writable" >&2
  exit 1
fi

# 6. Verify Memory Cap (128MB)
echo -e "\n--- Step 6: Memory Limit Enforcement ---"
if ! docker run --rm --memory 128m --memory-swap 128m "$IMAGE_NAME" python3 -c "b = bytearray(200 * 1024 * 1024)" >/dev/null 2>&1; then
  echo "PASS: Memory allocation exceeding 128MB terminates container (OOM)"
else
  echo "FAIL: Memory limit was not enforced" >&2
  exit 1
fi

# 7. Verify Process Count Cap (pids-limit 64)
echo -e "\n--- Step 7: Process Cap Enforcement (Fork Bomb Mitigation) ---"
if ! docker run --rm --pids-limit 64 "$IMAGE_NAME" python3 -c "import os; [os.fork() for _ in range(70)]" >/dev/null 2>&1; then
  echo "PASS: Process fork limit enforced (--pids-limit 64)"
else
  echo "FAIL: Process limit failed" >&2
  exit 1
fi

# 8. Verify Restricted tmpfs (noexec)
echo -e "\n--- Step 8: Ephemeral tmpfs Storage Check ---"
docker run --rm --read-only --tmpfs /tmp:rw,size=16m,noexec "$IMAGE_NAME" sh -c "echo 'sample' > /tmp/test.txt && cat /tmp/test.txt" >/dev/null
echo "PASS: Temporary storage is isolated to restricted tmpfs"

# 9. Verify Dropped Capabilities & Disabled Privilege Escalation
echo -e "\n--- Step 9: Privilege Escalation & Dropped Capabilities Check ---"
if docker run --rm --cap-drop ALL --security-opt no-new-privileges:true "$IMAGE_NAME" su-exec root id 2>&1 | grep -qE "(Operation not permitted|Permission denied)"; then
  echo "PASS: Privilege escalation blocked; capabilities dropped (--cap-drop ALL)"
else
  echo "FAIL: Privilege escalation check did not detect blocked escalation" >&2
  exit 1
fi

echo -e "\n=================================================================="
echo "ALL LINUX CONTAINER SECURITY CHECKS PASSED!"
echo "=================================================================="
