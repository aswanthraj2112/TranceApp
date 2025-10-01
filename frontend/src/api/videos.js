const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

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

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const options = { method, headers: { ...headers } };

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
    const message = payload?.error?.message || payload?.message || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

function resolveMediaUrl(relativePath) {
  if (!relativePath) return '';
  try {
    const maybeUrl = new URL(relativePath);
    return maybeUrl.toString();
  } catch {
    return new URL(relativePath.startsWith('/') ? relativePath : `/${relativePath}`, `${API_BASE_URL}/`).toString();
  }
}

export const videosAPI = {
  uploadVideo: async (file, ownerId) => {
    const formData = new FormData();
    formData.append('file', file);
    if (ownerId) {
      formData.append('ownerId', ownerId);
    }

    return request('/api/videos/upload', { method: 'POST', body: formData });
  },

  listVideos: (page = 1, limit = 10, ownerId) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });
    if (ownerId) {
      params.set('ownerId', ownerId);
    }
    return request(`/api/videos?${params.toString()}`);
  },

  resolveStreamUrl: (video) => resolveMediaUrl(video?.streamPath),
  resolveThumbnailUrl: (video) => resolveMediaUrl(video?.thumbPath)
};

export default videosAPI;
