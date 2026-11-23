import axios from 'axios';

/**
 * Instance Axios commune à toute l'application.
 * Le proxy Vite redirige /api vers http://localhost:5000 en développement.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartstore_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('smartstore_token');
      localStorage.removeItem('smartstore_user');
    }
    return Promise.reject(error);
  }
);

/** Récupère le tableau/objet `data` renvoyé par l'API. */
export const apiData = (request) => request.then((response) => response.data.data);

/** Message d'erreur lisible pour l'utilisateur. */
export const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || 'Une erreur est survenue.';

export default api;
