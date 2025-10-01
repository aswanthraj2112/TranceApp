import Memcached from 'memcached';
import { getConfig } from './configService.js';

let client = null;

export function getCacheClient() {
  if (client) {
    return client;
  }

  const { elasticacheEndpoint } = getConfig();

  if (!elasticacheEndpoint) {
    console.warn('ElastiCache endpoint is not configured. Cache will be disabled.');
    return null;
  }

  client = new Memcached(elasticacheEndpoint, {
    retries: 1,
    retry: 1000,
    timeout: 1500
  });

  client.on('issue', (details) => {
    console.warn('Memcached issue', details);
  });

  client.on('failure', (details) => {
    console.warn('Memcached failure', details);
  });

  return client;
}

export function setCacheValue(key, value, lifetimeSeconds = 60) {
  const cache = getCacheClient();
  if (!cache) return;
  cache.set(key, JSON.stringify(value), lifetimeSeconds, (error) => {
    if (error) {
      console.warn('Failed to write to cache', error.message);
    }
  });
}

export function getCacheValue(key) {
  const cache = getCacheClient();
  if (!cache) return null;
  return new Promise((resolve) => {
    cache.get(key, (error, data) => {
      if (error || !data) {
        return resolve(null);
      }
      try {
        resolve(JSON.parse(data));
      } catch (parseError) {
        console.warn('Failed to parse cached value', parseError.message);
        resolve(null);
      }
    });
  });
}

export function shutdownCache() {
  if (client) {
    client.end();
    client = null;
  }
}
