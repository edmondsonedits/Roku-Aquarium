#!/bin/sh
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Install Node.js 24 LTS from https://nodejs.org, then run this file again."
  read -r answer
  exit 1
fi
node -e "if(Number(process.versions.node.split('.')[0])<24)process.exit(1)" || { echo 'Node.js 24 or newer is required.'; exit 1; }
echo 'Keep this window open while the aquarium is running.'
echo 'Open http://localhost:4317 on this computer.'
node runtime/server.mjs
