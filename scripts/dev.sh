#!/bin/bash
set -e
pnpm build

TARGET="$1"

if [[ "$TARGET" == "all" ]]; then
    node dist/cli.cjs \
        --chrome-zip extension/chrome.zip \
        --firefox-zip extension/firefox.zip \
        --firefox-sources-zip extension/firefox.zip
elif [[ "$TARGET" == "chrome" ]]; then
    node dist/cli.cjs --chrome-zip extension/chrome.zip
elif [[ "$TARGET" == "firefox" ]]; then
    node dist/cli.cjs --firefox-zip extension/firefox.zip --firefox-sources-zip extension/firefox.zip
elif [[ "$TARGET" == "edge" ]]; then
    node dist/cli.cjs --edge-zip extension/chrome.zip
elif [[ "$TARGET" == "help" ]]; then
    node dist/cli.cjs --help
else
    echo
    echo "Run 'pnpm dev:chrome' or 'pnpm dev:firefox' or 'pnpm dev:edge' or 'pnpm dev:all'"
    node dist/cli.cjs
fi 
