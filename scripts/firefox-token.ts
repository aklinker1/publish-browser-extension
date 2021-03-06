import { AddonsApi } from '../src/apis/addons-api';

// This file is used to generate a token for Insomnia/Postman
// pnpm generate-firefox-token

const api = new AddonsApi({
  jwtIssuer: process.env.FIREFOX_JWT_ISSUER ?? '',
  jwtSecret: process.env.FIREFOX_JWT_SECRET ?? '',
});

console.log(api['createJwt'](5 * 60));
