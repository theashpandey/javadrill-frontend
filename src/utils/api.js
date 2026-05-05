import { getIdToken } from './firebase';

export const API = process.env.REACT_APP_API_URL || 'https://javadrill.onrender.com';

function sanitizeErrorMessage(message) {
  if (!message) return message;
  return String(message)
    .replace(/([?&]key=)[^\s&]+/gi, '$1[REDACTED]')
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]');
}

export async function apiCall(path, opts = {}) {
  const token = await getIdToken();
  const isFormData = opts.body instanceof FormData;
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  if (!res.ok) {
    throw new Error(sanitizeErrorMessage(data?.message || `Request failed (${res.status})`));
  }
  return data;
}
