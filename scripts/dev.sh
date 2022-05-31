#!/bin/bash
set -e
gulp buildDev

TARGET="$1"

if [[ "$TARGET" == "all" ]]; then
    esno dist/cli.js \
        --chrome-zip extension/chrome.zip \
        --firefox-zip extension/firefox.zip \
        --firefox-sources-zip extension/firefox.zip
elif [[ "$TARGET" == "chrome" ]]; then
    esno dist/cli.js --chrome-zip extension/chrome.zip
elif [[ "$TARGET" == "firefox" ]]; then
    esno dist/cli.js --firefox-zip extension/firefox.zip --firefox-sources-zip extension/firefox.zip
elif [[ "$TARGET" == "help" ]]; then
    esno dist/cli.js --help
else
    echo
    echo "Run 'pnpm dev:chrome' or 'pnpm dev:firefox' or 'pnpm dev:all' to run against a specific store"
    esno dist/cli.js
fi 
