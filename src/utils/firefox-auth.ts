import { signJwt } from './jwt-utils';

/**
 * See https://addons-server.readthedocs.io/en/latest/topics/api/auth.html
 */
export function createFirefoxJwt(
  issuer: string,
  secret: string,
  expiresInS = 30,
): string {
  return signJwt('HS256', secret, {
    expiresInS,
    issuer,
    jti: Math.random().toString(),
  });
}
