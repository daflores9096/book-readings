const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  clearSession();
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function buildUrl(path, params) {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  let url = path.startsWith('http') ? path : `${base}${path}`;
  if (params && Object.keys(params).length) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    }
    const qs = q.toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }
  return url;
}

export async function api(path, options = {}) {
  const { body, headers, params, isFormData, ...rest } = options;
  const token = getToken();
  let res;
  try {
    res = await fetch(buildUrl(path, params), {
      ...rest,
      headers: {
        ...(body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
      body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    const hint = import.meta.env.DEV
      ? ' Comprueba Docker (docker compose up -d) y VITE_DEV_API_PROXY.'
      : '';
    throw new Error(`No se pudo conectar con la API.${hint}`);
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    if (res.status === 401 && path !== '/api/auth/login') {
      redirectToLogin();
    }
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function login(username, password) {
  return api('/api/auth/login', { method: 'POST', body: { username, password } });
}

export function getUsers() {
  return api('/api/users');
}

export function createUser(payload) {
  return api('/api/users', { method: 'POST', body: payload });
}

export function updateUser(id, payload) {
  return api(`/api/users/${id}`, { method: 'PUT', body: payload });
}

export function deleteUser(id) {
  return api(`/api/users/${id}`, { method: 'DELETE' });
}

export function resetUserPassword(id, password) {
  return api(`/api/users/${id}/password`, { method: 'POST', body: { password } });
}

export function lookupBook(isbn) {
  return api(`/api/books/lookup/${encodeURIComponent(isbn)}`);
}

export function createBook(payload) {
  return api('/api/books', { method: 'POST', body: payload });
}

export function getBook(id) {
  return api(`/api/books/${id}`);
}

export function uploadBookCover(id, file) {
  const formData = new FormData();
  formData.append('cover', file);
  return api(`/api/books/${id}/cover`, { method: 'POST', body: formData, isFormData: true });
}

export function getMyBooks(status) {
  return api('/api/my-books', { params: status ? { status } : undefined });
}

export function addMyBook(payload) {
  return api('/api/my-books', { method: 'POST', body: payload });
}

export function updateMyBook(id, payload) {
  return api(`/api/my-books/${id}`, { method: 'PUT', body: payload });
}

export function deleteMyBook(id) {
  return api(`/api/my-books/${id}`, { method: 'DELETE' });
}
