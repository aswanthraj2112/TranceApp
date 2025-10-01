const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

function trimTrailingSlashes(value) {
  if (!value) return '';

  let result = `${value}`.trim();
  while (result.endsWith('/')) {
    result = result.slice(0, -1);
  }
  return result;
}

function normalizeBaseUrl(url) {
  if (!url) return '';

  const trimmed = trimTrailingSlashes(url);

  try {
    const parsed = new URL(trimmed);
    let pathname = trimTrailingSlashes(parsed.pathname);

    if (pathname === '/api' || pathname === 'api') {
      pathname = '';
    }

    return `${parsed.origin}${pathname}`;
  } catch {
    return trimmed;
  }
}

const API_BASE_URL = normalizeBaseUrl(RAW_API_URL);

function buildRequestUrl(path = '') {
  const sanitizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(sanitizedPath, `${API_BASE_URL}/`).toString();
}

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(buildRequestUrl(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

export const adminAPI = {
  listUsers: (token) => request('/api/admin/users', { token }),
  deleteUser: (token, username) =>
    request(`/api/admin/users/${encodeURIComponent(username)}`, {
      method: 'DELETE',
      token
    })
};

export default adminAPI;
