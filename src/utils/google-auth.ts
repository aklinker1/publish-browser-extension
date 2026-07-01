import { signJwt } from './jwt-utils';

/**
 * Used to request an access token.
 */
export function createGcpServiceAccountJwt(
  clientEmail: string,
  privateKey: string,
  scopes: string[],
  expiresInS = 30,
): string {
  return signJwt('RS256', privateKey, {
    expiresInS,
    issuer: clientEmail,
    audience: 'https://oauth2.googleapis.com/token',
    scope: scopes.join(' '),
  });
}
