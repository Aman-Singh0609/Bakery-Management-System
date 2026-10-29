import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise = null;

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
const isAuthPath = (url = '') => AUTH_PATHS.some((path) => url.includes(path));

/** Exchanges the refresh cookie for a new session. Concurrent callers share one request. */
function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .catch((error) => {
        // Another tab rotated the session a moment ago; the browser already has the new cookie.
        if (error?.response?.data?.error?.code === 'REFRESH_RACE') return null;
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response?.status === 401 && config && !config._retried && !isAuthPath(config.url)) {
      config._retried = true;
      await refreshSession();
      return api(config);
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error?.response) {
    return error?.code === 'ECONNABORTED'
      ? 'The server took too long to respond. Please try again.'
      : error?.message && !error.isAxiosError
        ? error.message
        : 'Could not reach the bakery. Check your connection and try again.';
  }
  const data = error.response.data?.error;
  if (error.response.status === 429) return 'Too many attempts. Please wait a few minutes and try again.';
  return data?.message || fallback;
}

/** Field-level messages from a 422 response, keyed by the last path segment. */
export function apiFieldErrors(error) {
  const details = error?.response?.data?.error?.details;
  if (!Array.isArray(details)) return {};
  return details.reduce((acc, detail) => {
    const key = String(detail.path || '').split('.').pop();
    if (key && !acc[key]) acc[key] = detail.message;
    return acc;
  }, {});
}
