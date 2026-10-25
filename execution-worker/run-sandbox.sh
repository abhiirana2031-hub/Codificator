#!/usr/bin/env bash
# Codificators Production Hardened Container Runner
# Enforces OS-level container isolation:
# - No network access (--network none)
# - CPU quota (0.5 CPU)
# - Memory limit (128 MB)
# - Process limit (64 pids)
# - Read-only root filesystem (--read-only)
# - Dedicated ephemeral tmpfs mount (--tmpfs /tmp:rw,size=16m,noexec)
# - Capability dropping (--cap-drop ALL)
# - Non-root user (UID 10001)

set -euo pipefail

IMAGE_NAME="codificators-sandbox:latest"
RUN_DIR="$(mktemp -d /tmp/codificator-run-XXXXXX)"

cleanup() {
  rm -rf "$RUN_DIR"
}
trap cleanup EXIT

# Copy payload into ephemeral run directory
cp "$1" "$RUN_DIR/payload"
LANGUAGE="${2:-python}"

if [ "$LANGUAGE" = "python" ]; then
  COMMAND="python3 -I -S -u /sandbox/payload"
elif [ "$LANGUAGE" = "javascript" ]; then
  COMMAND="node --disallow-code-generation-from-strings /sandbox/payload"
else
  echo "Unsupported runtime" >&2
  exit 1
fi

docker run --rm \
  --name "sandbox-run-$(date +%s%N)" \
  --network none \
  --cpus 0.5 \
  --memory 128m \
  --memory-swap 128m \
  --pids-limit 64 \
  --read-only \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --user 10001:10001 \
  --tmpfs /tmp:rw,size=16m,noexec,nodev,nosuid \
  -v "$RUN_DIR/payload:/sandbox/payload:ro" \
  "$IMAGE_NAME" \
  sh -c "$COMMAND"
