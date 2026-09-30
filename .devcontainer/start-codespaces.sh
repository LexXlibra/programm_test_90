#!/usr/bin/env bash
set -euo pipefail

if [[ -n "${CODESPACE_NAME:-}" ]]; then
  export APP_URL="https://${CODESPACE_NAME}-3000.app.github.dev"
  export BETTER_AUTH_URL="$APP_URL"
else
  export APP_URL="http://localhost:3000"
  export BETTER_AUTH_URL="$APP_URL"
fi

secret_file="$HOME/.nynety-codespaces-auth-secret"
if [[ ! -s "$secret_file" ]]; then
  node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))" > "$secret_file"
  chmod 600 "$secret_file"
fi
export BETTER_AUTH_SECRET="$(cat "$secret_file")"

npx prisma migrate deploy
npm run db:seed

if ! pgrep -af '[n]ext dev' >/dev/null; then
  nohup npm run dev -- --hostname 0.0.0.0 >/tmp/nynety-codespaces.log 2>&1 </dev/null &
fi
