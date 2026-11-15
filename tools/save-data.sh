#!/usr/bin/env bash
# Saves data/imported/*.json to the `data` branch as one overwritten commit (no history growth).
# Uses the credentials actions/checkout already set up, so the token never appears in a URL or an error message.
# Usage (in the workflow): bash tools/save-data.sh "<commit message>"
set -euo pipefail
ls data/imported/*.json >/dev/null 2>&1 || { echo "No imports to save."; exit 0; }
header="$(git config --get http.https://github.com/.extraheader || true)"
rm -rf /tmp/data && mkdir -p /tmp/data/imported && cp data/imported/*.json /tmp/data/imported/
cd /tmp/data && git init -q -b data && git add -A
git -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" commit -q -m "${1:-Imported data} ($(date -u +%F))"
git -c http.https://github.com/.extraheader="$header" push -q -f "https://github.com/${GITHUB_REPOSITORY}.git" data
echo "Saved $(ls imported | wc -l) files to the data branch."
