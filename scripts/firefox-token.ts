import { consola } from 'consola';
import { AddonsApi } from '../src/apis/firefox-api';
import { config } from 'dotenv';

config({ path: '.env.submit', quiet: true });

// This file is used to generate a token for Insomnia/Postman
// bun generate-firefox-token

const api = new AddonsApi({
  jwtIssuer: process.env.FIREFOX_JWT_ISSUER ?? '',
  jwtSecret: process.env.FIREFOX_JWT_SECRET ?? '',
});

consola.info(api['createJwt'](5 * 60));
