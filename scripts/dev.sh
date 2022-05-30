#!/bin/bash
esno src/cli.ts \
    --chrome extension/extension.zip \
    --chrome-extension-id test \
    --chrome-client-id test \
    --chrome-client-secret test \
    --chrome-refresh-token test \
    --firefox extension/extension.zip \
    --firefox-issuer test \
    --firefox-secret test \
    --firefox-sources extension/extension.zip
