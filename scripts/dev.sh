#!/bin/bash
set -e
gulp buildDev

TARGET="$1"

if [[ "$TARGET" == "all" ]]; then
    node dist/cli.js \
        --chrome-zip extension/chrome.zip \
        --firefox-zip extension/firefox.zip \
        --firefox-sources-zip extension/firefox.zip
elif [[ "$TARGET" == "chrome" ]]; then
    node dist/cli.js --chrome-zip extension/chrome.zip
elif [[ "$TARGET" == "firefox" ]]; then
    node dist/cli.js --firefox-zip extension/firefox.zip --firefox-sources-zip extension/firefox.zip
elif [[ "$TARGET" == "help" ]]; then
    node dist/cli.js --help
else
    echo
    echo "Run 'pnpm dev:chrome' or 'pnpm dev:firefox' or 'pnpm dev:all' to run against a specific store"
    node dist/cli.js
fi 
