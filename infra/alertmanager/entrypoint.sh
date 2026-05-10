#!/bin/sh
set -eu

if [ -z "${ALERT_DISCORD_WEBHOOK_URL:-}" ]; then
  echo "ERROR: ALERT_DISCORD_WEBHOOK_URL is required" >&2
  exit 1
fi

printf '%s' "$ALERT_DISCORD_WEBHOOK_URL" > /etc/alertmanager/discord-webhook.url

exec /bin/alertmanager \
  --config.file=/etc/alertmanager/alertmanager.yml \
  --storage.path=/alertmanager \
  "$@"
