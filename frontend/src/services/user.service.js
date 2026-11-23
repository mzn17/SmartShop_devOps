import api, { apiData } from './api';

export const userService = {
  list: () => apiData(api.get('/users')),
  create: (payload) => apiData(api.post('/users', payload)),
  update: (id, payload) => apiData(api.put(`/users/${id}`, payload)),
  remove: (id) => api.delete(`/users/${id}`).then((response) => response.data),
};
