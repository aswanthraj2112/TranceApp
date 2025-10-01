const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const fetch = require('node-fetch');
const { loadConfig } = require('../services/config');

let jwksCache = null;
let lastFetchedAt = 0;
const JWKS_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getJwks() {
  const now = Date.now();
  if (jwksCache && now - lastFetchedAt < JWKS_TTL_MS) {
    return jwksCache;
  }

  const config = await loadConfig();
  if (!config.userPoolId) {
    throw new Error('Cognito User Pool ID is not configured.');
  }

  const jwksUrl = `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}/.well-known/jwks.json`;

  const response = await fetch(jwksUrl);
  if (!response.ok) {
    throw new Error(`Unable to fetch JWKS: ${response.statusText}`);
  }

  const data = await response.json();
  jwksCache = data.keys;
  lastFetchedAt = now;
  return jwksCache;
}

async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [, token] = authHeader.split(' ');

    if (!token) {
      return res.status(401).json({ message: 'Authorization token is required.' });
    }

    const jwks = await getJwks();
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    const { kid } = decodedHeader.header;
    const jwk = jwks.find((key) => key.kid === kid);
    if (!jwk) {
      return res.status(401).json({ message: 'Unable to find matching JWK.' });
    }

    const pem = jwkToPem(jwk);
    const verified = jwt.verify(token, pem, { algorithms: ['RS256'] });

    req.user = {
      username: verified['cognito:username'] || verified.username,
      groups: verified['cognito:groups'] || [],
      claims: verified,
    };

    return next();
  } catch (error) {
    console.error('[auth] Token verification failed', error);
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

module.exports = {
  verifyToken,
};
