// Used to log a JWT for cURL, Postman, etc.
//
//   bun run --env=.env.submit scripts/firefox-token.ts
//
import { consola } from 'consola';
import { createFirefoxJwt } from '../src/utils/firefox-auth';

const token = createFirefoxJwt(
  process.env.FIREFOX_JWT_ISSUER ?? '',
  process.env.FIREFOX_JWT_SECRET ?? '',
  5 * 60e3, // 5 minutes
);

consola.info(token);
