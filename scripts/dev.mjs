import { spawnSync } from 'node:child_process';

function run(cmd, args = []) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

try {
  run('bun', ['build:lib']);
  run('bun', ['build:test-extension']);

  const TARGET = process.argv[2];
  const ARGS = process.argv.slice(2); // allow flags override
  const publish = (args = []) =>
    run('bun', ['bin/publish-extension.mjs', ...args, ...ARGS]);

  switch (TARGET) {
    case 'all':
      publish([
        '--chrome-zip',
        'extension/chrome.zip',
        '--firefox-zip',
        'extension/firefox.zip',
        '--firefox-sources-zip',
        'extension/firefox.zip',
        '--edge-zip',
        'extension/chrome.zip',
      ]);
      break;

    case 'chrome':
      publish(['--chrome-zip', 'extension/chrome.zip']);
      break;

    case 'firefox':
      publish([
        '--firefox-zip',
        'extension/firefox.zip',
        '--firefox-sources-zip',
        'extension/firefox.zip',
      ]);
      break;

    case 'edge':
      publish(['--edge-zip', 'extension/chrome.zip']);
      break;

    default:
      console.log();
      console.log(
        "Run 'bun dev:chrome' or 'bun dev:firefox' or 'bun dev:edge' or 'bun dev:all'",
      );
      publish();
      break;
  }
} catch {
  process.exit(1);
}
