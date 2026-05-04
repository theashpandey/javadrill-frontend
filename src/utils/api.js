import { getIdToken } from './firebase';

export const API = process.env.REACT_APP_API_URL || 'https://javadrill.onrender.com';

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
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}
