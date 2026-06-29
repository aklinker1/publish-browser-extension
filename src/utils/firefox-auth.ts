import jwt from 'jsonwebtoken';

/**
 * See https://addons-server.readthedocs.io/en/latest/topics/api/auth.html
 */
export function createFirefoxJwt(
  issuer: string,
  secret: string,
  timeout = 30e3,
): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuer,
    jti: Math.random().toString(),
    iat: issuedAt,
    exp: issuedAt + Math.floor(timeout / 1000),
  };
  return jwt.sign(payload, secret ?? '', { algorithm: 'HS256' });
}
