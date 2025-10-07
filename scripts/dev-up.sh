#!/usr/bin/env bash
# Lightweight dev bootstrap script to sanity-check tooling before starting the Vite server.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Basic log helpers for consistent output.
info() { printf '\033[1;34m[info]\033[0m %s\n' "$*"; }
success() { printf '\033[1;32m[ ok ]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
error() { printf '\033[1;31m[fail]\033[0m %s\n' "$*"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    error "Missing required command: $1"
    exit 1
  fi
}

confirm() {
  local prompt="$1"
  local default="${2:-y}"
  local reply

  if [[ "$default" == "y" ]]; then
    read -r -p "$prompt [Y/n] " reply
    reply=${reply:-y}
  else
    read -r -p "$prompt [y/N] " reply
    reply=${reply:-n}
  fi

  case "${reply,,}" in
    y|yes) return 0 ;;
    *) return 1 ;;
  esac
}

info "Repo root: $REPO_ROOT"

info "Checking required tooling"
require_cmd npm
success "npm is available ($(npm --version))"

if command -v supabase >/dev/null 2>&1; then
  success "Supabase CLI found ($(supabase --version | head -n 1))"
else
  warn "Supabase CLI not found. Install from https://supabase.com/docs/guides/cli"
fi

if command -v docker >/dev/null 2>&1; then
  success "Docker CLI available"
else
  warn "Docker CLI not found. Supabase local services require Docker."
fi

info "Validating environment files"
if [[ -f .env.local ]]; then
  success "Environment file present (.env.local)"
elif [[ -f .env ]]; then
  success "Environment file present (.env)"
else
  warn "No .env or .env.local found. Vite may fall back to defaults."
fi

info "Checking npm dependencies"
if [[ ! -d node_modules ]]; then
  warn "node_modules missing. Installing dependencies..."
  npm install
  success "Dependencies installed"
elif [[ package-lock.json -nt node_modules ]]; then
  warn "package-lock.json newer than node_modules. Running npm install to sync..."
  npm install
  success "Dependencies updated"
else
  success "node_modules looks up to date"
fi

if command -v supabase >/dev/null 2>&1; then
  info "Checking Supabase services"
  if supabase status >/dev/null 2>&1; then
    success "Supabase local stack is running"
  else
    warn "Supabase local stack not running. Start it with 'supabase start' if you need local services."
  fi

  if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    if confirm "Run 'supabase db push --dry-run' to check pending remote migrations?" n; then
      info "Checking pending remote migrations (dry run)"
      if supabase db push --dry-run; then
        success "Remote Supabase migrations are up to date"
      else
        warn "Dry-run migration check failed. Ensure you have network access and the correct database password."
      fi
    else
      warn "Skipped Supabase migration check"
    fi
  else
    warn "SUPABASE_ACCESS_TOKEN not set. Skipping remote migration check."
  fi
else
  warn "Skipping Supabase checks because CLI is missing"
fi

if command -v lsof >/dev/null 2>&1; then
  if lsof -ti :5173 >/dev/null 2>&1; then
    if ! confirm "Port 5173 is in use. Continue anyway?" n; then
      error "Aborting because dev server port is busy"
      exit 1
    fi
  fi
fi

info "Starting Vite dev server"
trap 'warn "Dev server interrupted"' INT TERM
exec npm run dev
