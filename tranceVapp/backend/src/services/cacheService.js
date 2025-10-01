const Memcached = require('memcached');
const { loadConfig } = require('./config');

let memcachedClient = null;
const fallbackCache = new Map();

async function getClient() {
  if (memcachedClient) {
    return memcachedClient;
  }

  const config = await loadConfig();
  if (config.elasticacheEndpoint) {
    memcachedClient = new Memcached(config.elasticacheEndpoint, {
      retries: 1,
      timeout: 200,
    });
    memcachedClient.on('failure', (details) => {
      console.error('[cache] Memcached failure', details);
    });
    memcachedClient.on('issue', (details) => {
      console.warn('[cache] Memcached issue', details);
    });
    return memcachedClient;
  }

  return null;
}

async function get(key) {
  const client = await getClient();
  if (!client) {
    return fallbackCache.get(key) || null;
  }

  return new Promise((resolve) => {
    client.get(key, (err, data) => {
      if (err) {
        console.error('[cache] Error fetching key', key, err);
        resolve(fallbackCache.get(key) || null);
        return;
      }
      resolve(data ? JSON.parse(data) : null);
    });
  });
}

async function set(key, value, lifetimeSeconds) {
  const client = await getClient();
  if (!client) {
    fallbackCache.set(key, value);
    return;
  }

  return new Promise((resolve) => {
    client.set(key, JSON.stringify(value), lifetimeSeconds, (err) => {
      if (err) {
        console.error('[cache] Error setting key', key, err);
        fallbackCache.set(key, value);
      }
      resolve();
    });
  });
}

async function del(key) {
  const client = await getClient();
  if (!client) {
    fallbackCache.delete(key);
    return;
  }

  return new Promise((resolve) => {
    client.del(key, (err) => {
      if (err) {
        console.error('[cache] Error deleting key', key, err);
      }
      fallbackCache.delete(key);
      resolve();
    });
  });
}

module.exports = {
  get,
  set,
  del,
};
