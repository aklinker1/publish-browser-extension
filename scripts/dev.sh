#!/bin/bash
set -e
bun run build

TARGET="$1"

if [[ "$TARGET" == "all" ]]; then
    bun bin/publish-extension.cjs \
        --chrome-zip extension/chrome.zip \
        --firefox-zip extension/firefox.zip \
        --firefox-sources-zip extension/firefox.zip \
        --edge-zip extension/chrome.zip
elif [[ "$TARGET" == "chrome" ]]; then
    bun bin/publish-extension.cjs --chrome-zip extension/chrome.zip
elif [[ "$TARGET" == "firefox" ]]; then
    bun bin/publish-extension.cjs --firefox-zip extension/firefox.zip --firefox-sources-zip extension/firefox.zip
elif [[ "$TARGET" == "edge" ]]; then
    bun bin/publish-extension.cjs --edge-zip extension/chrome.zip
elif [[ "$TARGET" == "help" ]]; then
    bun bin/publish-extension.cjs --help
else
    echo
    echo "Run 'bun dev:chrome' or 'bun dev:firefox' or 'bun dev:edge' or 'bun dev:all'"
    bun bin/publish-extension.cjs
fi
