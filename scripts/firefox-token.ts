// Used to log a JWT for cURL, Postman, etc.
//
//   bun run --env=.env.submit scripts/firefox-token.ts
//
import { createFirefoxJwt } from '../src/utils/firefox-auth';
import { logger } from '../src/utils/logger';

const token = createFirefoxJwt(
  process.env.FIREFOX_JWT_ISSUER ?? '',
  process.env.FIREFOX_JWT_SECRET ?? '',
  5 * 60e3, // 5 minutes
);

logger.info(token);
