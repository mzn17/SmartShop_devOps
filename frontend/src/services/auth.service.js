import api from './api';

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials).then((response) => response.data),
  me: () => api.get('/auth/me').then((response) => response.data.user),
  logout: () => api.post('/auth/logout').then((response) => response.data),
};
