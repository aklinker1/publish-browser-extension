#!/bin/bash
set -e
pnpm build

TARGET="$1"

if [[ "$TARGET" == "all" ]]; then
    pnpm env-cmd -f .env.submit node bin/publish-extension.cjs \
        --chrome-zip extension/chrome.zip \
        --firefox-zip extension/firefox.zip \
        --firefox-sources-zip extension/firefox.zip \
        --edge-zip extension/chrome.zip
elif [[ "$TARGET" == "chrome" ]]; then
    pnpm env-cmd -f .env.submit node bin/publish-extension.cjs --chrome-zip extension/chrome.zip
elif [[ "$TARGET" == "firefox" ]]; then
    pnpm env-cmd -f .env.submit node bin/publish-extension.cjs --firefox-zip extension/firefox.zip --firefox-sources-zip extension/firefox.zip
elif [[ "$TARGET" == "edge" ]]; then
    pnpm env-cmd -f .env.submit node bin/publish-extension.cjs --edge-zip extension/chrome.zip
elif [[ "$TARGET" == "help" ]]; then
    pnpm env-cmd -f .env.submit node bin/publish-extension.cjs --help
else
    echo
    echo "Run 'pnpm dev:chrome' or 'pnpm dev:firefox' or 'pnpm dev:edge' or 'pnpm dev:all'"
    pnpm env-cmd -f .env.submit node bin/publish-extension.cjs
fi 
