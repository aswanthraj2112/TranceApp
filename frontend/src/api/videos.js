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

async function request(path, { method = 'GET', body, headers = {}, token } = {}) {
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
    const message = payload?.error?.message || payload?.message || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

async function uploadFileToUrl(uploadUrl, file) {
  const headers = {
    'Content-Type': file.type || 'application/octet-stream'
  };

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers,
    body: file
  });

  if (!response.ok) {
    throw new Error('Upload to storage failed');
  }
}

export const videosAPI = {
  initiateUpload: (token, { filename, contentType }) =>
    request('/api/videos/initiate-upload', {
      method: 'POST',
      token,
      body: { filename, contentType }
    }),

  finalizeUpload: (token, { videoId, sizeBytes, durationSec }) =>
    request('/api/videos/finalize-upload', {
      method: 'POST',
      token,
      body: { videoId, sizeBytes, durationSec }
    }),

  uploadVideo: async (token, file) => {
    if (!file) {
      throw new Error('No file selected');
    }

    const { videoId, uploadUrl } = await videosAPI.initiateUpload(token, {
      filename: file.name,
      contentType: file.type
    });

    await uploadFileToUrl(uploadUrl, file);

    await videosAPI.finalizeUpload(token, {
      videoId,
      sizeBytes: file.size,
      durationSec: null
    });

    return videoId;
  },

  listVideos: async (token) => {
    const response = await request('/api/videos', { token });
    return response.items || [];
  },

  requestTranscode: (token, videoId, preset) =>
    request(`/api/videos/${videoId}/transcode`, {
      method: 'POST',
      token,
      body: { preset }
    }),

  getDownloadUrl: (token, videoId) =>
    request(`/api/videos/${videoId}/download-url`, { token }),

  getStatus: (token, videoId) =>
    request(`/api/videos/${videoId}/status`, { token }),

  resolveThumbnailUrl: (video) => video?.thumbnailUrl || null
};

export default videosAPI;
