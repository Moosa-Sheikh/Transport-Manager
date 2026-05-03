#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  trap - EXIT INT TERM
  if [[ -n "${API_PID:-}" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "[dev-tms] Building api-server..."
( cd "$ROOT/artifacts/api-server" && node ./build.mjs )

echo "[dev-tms] Starting api-server on :8080 ..."
( cd "$ROOT/artifacts/api-server" \
  && PORT=8080 NODE_ENV=development \
     node --enable-source-maps ./dist/main.mjs ) &
API_PID=$!

echo "[dev-tms] Starting vite dev on :$PORT ..."
cd "$ROOT/artifacts/tms-web"
exec npx vite dev
