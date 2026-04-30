import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Token is injected by the auth store — we read from a module-level ref
let _getToken = () => null;

export function setTokenGetter(fn) {
  _getToken = fn;
}

apiClient.interceptors.request.use((config) => {
  const token = _getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
