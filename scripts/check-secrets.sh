#!/usr/bin/env bash
# MarketGym secret scanner.
# Greps the working tree (excluding node_modules, build output, local data) for
# strings that look like real credentials and exits non-zero on any hit.
# Also verifies that .env* files are git-ignored (except .env.example).
#
# Usage:  scripts/check-secrets.sh [root]
set -u

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT" || exit 2

STATUS=0

# Directories we never scan.
PRUNE=(-path ./node_modules -o -path './.next*' -o -path ./.data -o -path ./.git -o -path ./playwright-report -o -path ./test-results -o -path ./coverage -o -path ./out)

# Files allowed to contain placeholder-ish values (documentation of the *shape*).
ALLOW_FILES_RE='^\./(scripts/check-secrets\.sh|docs/SECURITY\.md|\.env\.example)$'

# Each pattern: a name and an extended regex.
# sk-... : OpenAI style keys (sk-proj-..., sk-...). Require >= 20 chars after prefix.
# eyJ... : JWT (Supabase anon/service-role keys are JWTs). Require three dot-separated base64url parts, and a reasonably long header.
# service_role: literal role claim inside a decoded JWT, or an assignment with a non-empty value.
# x-soso-api-key: header assignment with a literal (non-variable) value.
# Generic: KEY=... assignments for the env names we use, with a real-looking value on the right.
declare -a NAMES=(
  "openai-style key (sk-...)"
  "JWT (eyJ...) — Supabase anon/service-role keys are JWTs"
  "supabase service-role literal"
  "x-soso-api-key literal value"
  "env assignment with a literal secret"
  "private key block"
)
declare -a PATTERNS=(
  'sk-(proj-|ant-|live-|test-)?[A-Za-z0-9_-]{20,}'
  'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'
  '"role"[[:space:]]*:[[:space:]]*"service_role"|SUPABASE_SERVICE_ROLE_KEY[[:space:]]*[=:][[:space:]]*["'"'"']?[A-Za-z0-9._-]{20,}'
  'x-soso-api-key["'"'"']?[[:space:]]*[:=][[:space:]]*["'"'"'][A-Za-z0-9._-]{8,}["'"'"']'
  '(OPENAI_API_KEY|SOSOVALUE_API_KEY|SODEX_MARKET_DATA_API_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY)[[:space:]]*[=:][[:space:]]*["'"'"']?[A-Za-z0-9._-]{16,}'
  '-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'
)

echo "check-secrets: scanning $ROOT"

FILES=$(find . \( "${PRUNE[@]}" \) -prune -o -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.json' -o -name '*.md' -o -name '*.sql' -o -name '*.sh' -o -name '*.yaml' -o -name '*.yml' -o -name '*.toml' -o -name '*.env*' -o -name '.env*' -o -name '*.txt' -o -name '*.html' -o -name '*.css' \) -print 2>/dev/null)

for i in "${!PATTERNS[@]}"; do
  pat="${PATTERNS[$i]}"
  name="${NAMES[$i]}"
  hits=$(printf '%s\n' "$FILES" | grep -v -E "$ALLOW_FILES_RE" | xargs grep -n -E -I "$pat" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    # pnpm-lock.yaml integrity hashes are sha512-..., not matched; but filter obvious false positives:
    # - fixture files recorded from public endpoints should never contain keys, so no allowance there.
    echo "FAIL [$name]:"
    printf '%s\n' "$hits" | sed 's/^/  /' | cut -c1-200
    STATUS=1
  fi
done

# .env files present in the tree that are NOT ignored by git.
if [ -d .git ] && command -v git >/dev/null 2>&1; then
  for f in .env .env.local .env.development .env.production .env.test .env.development.local .env.production.local .env.test.local; do
    if [ -f "$f" ]; then
      if ! git check-ignore -q "$f"; then
        echo "FAIL [.env not ignored]: $f is not git-ignored"
        STATUS=1
      fi
    fi
  done
  # Any .env* tracked by git (other than .env.example) is a failure regardless of content.
  tracked=$(git ls-files | grep -E '(^|/)\.env' | grep -v -E '(^|/)\.env\.example$' || true)
  if [ -n "$tracked" ]; then
    echo "FAIL [.env tracked]: $tracked"
    STATUS=1
  fi
else
  # No git: fall back to checking the .gitignore text.
  if ! grep -q -E '^\.env\*' .gitignore 2>/dev/null; then
    echo "FAIL [.gitignore]: .gitignore does not ignore .env*"
    STATUS=1
  fi
fi

# .env.example must not contain filled-in secrets.
if [ -f .env.example ]; then
  bad=$(grep -n -E '^(OPENAI_API_KEY|SOSOVALUE_API_KEY|SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY|SODEX_MARKET_DATA_API_KEY)=.{8,}' .env.example || true)
  if [ -n "$bad" ]; then
    echo "FAIL [.env.example has values]:"
    printf '%s\n' "$bad" | sed 's/^/  /'
    STATUS=1
  fi
fi

if [ "$STATUS" -eq 0 ]; then
  echo "check-secrets: OK (no key-looking strings; .env* ignored)"
fi
exit "$STATUS"
