import { AddonsApi } from '../src/apis/addons-api';

// This file is used to generate a token for Insomnia/Postman
// pnpm generate-firefox-token

const api = new AddonsApi({
  issuer: process.env.FIREFOX_ISSUER ?? '',
  secret: process.env.FIREFOX_SECRET ?? '',
});

console.log(api['createJwt'](5 * 60));
