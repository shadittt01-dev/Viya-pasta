#!/bin/sh
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Download the LTS version from https://nodejs.org, install it, then double-click this file again."
  open https://nodejs.org
  read -r _
  exit 1
fi
echo "Starting the Via Pasta website... keep this window open while you use it."
(sleep 4; open http://localhost:3000) &
node --disable-warning=ExperimentalWarning server/main.js
