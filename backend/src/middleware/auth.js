import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import fetch from 'node-fetch';
import { getConfig } from '../services/configService.js';

const jwkCache = new Map();

async function getJwks(issuer) {
  if (jwkCache.has(issuer)) {
    return jwkCache.get(issuer);
  }

  const response = await fetch(`${issuer}/.well-known/jwks.json`);
  if (!response.ok) {
    throw new Error(`Unable to download JWKS: ${response.status}`);
  }

  const body = await response.json();
  jwkCache.set(issuer, body.keys || []);
  return body.keys || [];
}

async function getPemForKid(issuer, kid) {
  const keys = await getJwks(issuer);
  const jwk = keys.find((key) => key.kid === kid);
  if (!jwk) {
    throw new Error('Unable to find matching JWK');
  }
  return jwkToPem(jwk);
}

export function verifyToken() {
  return async (req, res, next) => {
    try {
      const authorization = req.headers.authorization || '';
      const [, token] = authorization.split(' ');
      if (!token) {
        return res.status(401).json({ error: { message: 'Authorization token missing' } });
      }

      const { cognitoUserPoolId, region } = getConfig();
      const issuer = `https://cognito-idp.${region}.amazonaws.com/${cognitoUserPoolId}`;

      const decoded = jwt.decode(token, { complete: true });
      if (!decoded?.header?.kid) {
        return res.status(401).json({ error: { message: 'Invalid token' } });
      }

      const pem = await getPemForKid(issuer, decoded.header.kid);
      const verified = jwt.verify(token, pem, {
        issuer,
        algorithms: ['RS256']
      });

      req.user = verified;
      req.token = token;
      return next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return res.status(401).json({ error: { message: 'Invalid or expired token' } });
    }
  };
}

export function isAdmin() {
  return (req, res, next) => {
    const groups = req.user?.['cognito:groups'] || [];
    if (Array.isArray(groups) && groups.includes('admin-users')) {
      return next();
    }
    return res.status(403).json({ error: { message: 'Admin privileges required' } });
  };
}
