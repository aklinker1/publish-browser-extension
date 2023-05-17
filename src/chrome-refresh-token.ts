#!/usr/bin/env node
import { cliFlags } from './cli-flags';
import open from 'open';
import readline from 'node:readline/promises';
import fetch from 'node-fetch';

const flags = {
  chromeClientId: cliFlags.chromeClientId,
  chromeClientSecret: cliFlags.chromeClientSecret,
};

(async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let clientId: string;
  let clientSecret: string;

  try {
    clientId = flags.chromeClientId().value;
  } catch {
    clientId = await rl.question('Enter your GCP client id:');
  }
  try {
    clientSecret = flags.chromeClientSecret().value;
  } catch {
    clientSecret = await rl.question('Enter your GCP client secret:');
  }

  const authCodeUrl = `https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=${clientId}&redirect_uri=urn:ietf:wg:oauth:2.0:oob`;
  const browser = await open(authCodeUrl);
  try {
    const authCode = await rl.question(
      '\nOpening browser...\nLogin and enter the authorization code: ',
    );
    browser.kill();

    console.log('Getting refresh token...');
    const tokenUrl = `https://accounts.google.com/o/oauth2/token`;
    const body = new URLSearchParams();
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
    body.set('code', authCode);
    body.set('grant_type', 'authorization_code');
    body.set('redirect_uri', 'urn:ietf:wg:oauth:2.0:oob');
    const res = await fetch(tokenUrl, { method: 'POST', body });
    const { refresh_token: refreshToken } = await res.json();

    console.log(`\n  Refresh token: ${refreshToken}\n`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
