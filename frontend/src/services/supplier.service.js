import api, { apiData } from './api';

export const supplierService = {
  list: () => apiData(api.get('/suppliers')),
  create: (payload) => apiData(api.post('/suppliers', payload)),
  update: (id, payload) => apiData(api.put(`/suppliers/${id}`, payload)),
  remove: (id) => api.delete(`/suppliers/${id}`).then((response) => response.data),
};
