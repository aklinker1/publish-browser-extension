import { consola } from 'consola';
import { AddonsApi } from '../src/firefox/firefox-api';

// This file is used to generate a token for Insomnia/Postman
// pnpm generate-firefox-token

const api = new AddonsApi({
  jwtIssuer: process.env.FIREFOX_JWT_ISSUER ?? '',
  jwtSecret: process.env.FIREFOX_JWT_SECRET ?? '',
});

consola.info(api['createJwt'](5 * 60));
