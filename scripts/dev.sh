#!/bin/bash
set -e
gulp buildDev

TARGET="$1"

if [[ "$TARGET" == "all" ]]; then
    esno dist/cli.js \
        --chrome extension/chrome.zip \
        --firefox extension/firefox.zip \
        --firefox-sources extension/firefox.zip
elif [[ "$TARGET" == "chrome" ]]; then
    esno dist/cli.js --chrome extension/chrome.zip
elif [[ "$TARGET" == "firefox" ]]; then
    esno dist/cli.js --firefox extension/firefox.zip --firefox-sources extension/firefox.zip
else
    echo
    echo "Run 'pnpm dev:chrome' or 'pnpm dev:firefox' or 'pnpm dev:all' to run against a specific store"
    esno dist/cli.js
fi 
