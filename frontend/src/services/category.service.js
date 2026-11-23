import api, { apiData } from './api';

export const categoryService = {
  list: () => apiData(api.get('/categories')),
  create: (payload) => apiData(api.post('/categories', payload)),
  update: (id, payload) => apiData(api.put(`/categories/${id}`, payload)),
  remove: (id) => api.delete(`/categories/${id}`).then((response) => response.data),
};
