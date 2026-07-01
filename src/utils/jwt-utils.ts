import { createSign } from 'node:crypto';

const ALG_MAP = {
  RS256: 'RSA-SHA256',
  HS256: 'HMAC-SHA256',
};

export type JwtPayloadBuilderOptions = {
  issuer?: string;
  subject?: string;
  expiresInS?: number;
  audience?: string;
  [extras: string]: unknown;
};

export type JwtPayload = {
  iss?: string;
  sub?: string;
  aud?: string;
  exp?: number;
  nbf?: number;
  iat?: number;
  [extras: string]: unknown;
};

export function buildJwtPayload(opts: JwtPayloadBuilderOptions): JwtPayload {
  const {
    issuer: iss,
    subject: sub,
    expiresInS,
    audience: aud,
    ...extras
  } = opts;
  const iat = extras.iat ? Number(extras.iat) : Math.floor(Date.now() / 1000);
  return {
    iat,
    ...(iss && { iss }),
    ...(sub && { sub }),
    ...(aud && { aud }),
    ...(expiresInS && { exp: iat + expiresInS }),
    ...extras,
  };
}

export function signJwt(
  alg: keyof typeof ALG_MAP,
  privateKey: string,
  payload: JwtPayloadBuilderOptions,
): string {
  const claims = buildJwtPayload(payload);
  const header = { alg, typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    'base64url',
  );
  const encodedPayload = Buffer.from(JSON.stringify(claims)).toString(
    'base64url',
  );
  const signature = createSign(ALG_MAP[alg])
    .update(`${encodedHeader}.${encodedPayload}`)
    .sign(privateKey, 'base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
