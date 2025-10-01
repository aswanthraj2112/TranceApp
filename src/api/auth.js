const RAW_API_URL = import.meta.env.VITE_API_URL || 'https://n11817143-videoapp.cab432.com';

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

async function request(path, { method = 'GET', token, body, headers = {} } = {}) {
  const options = { method, headers: { ...headers } };

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  if (body instanceof FormData) {
    options.body = body;
  } else if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(buildRequestUrl(path), options);
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.error?.message || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

// Authentication API functions
export const authAPI = {
  // Configuration
  getConfig: () => request('/api/config'),

  // Authentication (using Cognito)
  register: (username, password, email) =>
    request('/api/auth/register', { method: 'POST', body: { username, password, email } }),
  
  login: (username, password) =>
    request('/api/auth/login', { method: 'POST', body: { username, password } }),
  
  confirmSignUp: (username, confirmationCode) =>
    request('/api/auth/confirm', { method: 'POST', body: { username, confirmationCode } }),
  
  resendConfirmationCode: (username) =>
    request('/api/auth/resend', { method: 'POST', body: { username } }),
  
  getMe: (token) => request('/api/auth/me', { token })
};

export default authAPI;