#!/bin/sh
# Railway Cron (UTC 17,47 minutes): authenticated, completed-sync verification.
# Never print or persist CRON_SECRET; this runner is an alternative to GitHub,
# not an additional simultaneous scheduler.
set -eu

if [ -z "${CRON_SECRET:-}" ]; then
  echo "ERROR: CRON_SECRET is not configured; skipping sync."
  exit 1
fi

response_file="$(mktemp)"
trap 'rm -f "$response_file"' EXIT
status="$(curl --silent --show-error --request POST \
  "https://property-site-frontend-kappa.vercel.app/api/internal/property-sync-and-wait" \
  --header "Authorization: Bearer $CRON_SECRET" \
  --header "Content-Type: application/json" \
  --data '{}' --connect-timeout 15 --max-time 330 --retry 0 \
  --output "$response_file" --write-out '%{http_code}')"

if [ "$status" != "200" ]; then
  echo "ERROR: completed-sync API returned HTTP $status; no completion confirmed."
  exit 1
fi

if ! jq -e '.success == true and .complete == true and .failed == 0 and (.successfullyUpdated | type == "number" and . > 0)' "$response_file" >/dev/null; then
  echo "ERROR: completed-sync API returned an invalid/incomplete result."
  exit 1
fi

updated="$(jq -r '.successfullyUpdated' "$response_file")"
echo "Completed sync verified: $updated rows updated; zero failures."
