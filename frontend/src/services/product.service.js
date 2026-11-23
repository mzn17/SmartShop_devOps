import api, { apiData } from './api';

export const productService = {
  list: (params) => apiData(api.get('/products', { params })),
  lowStock: (params) => apiData(api.get('/products/low-stock', { params })),
  getById: (id) => apiData(api.get(`/products/${id}`)),
  getByBarcode: (code) => apiData(api.get(`/products/barcode/${encodeURIComponent(code)}`)),
  create: (payload) => apiData(api.post('/products', payload)),
  update: (id, payload) => apiData(api.put(`/products/${id}`, payload)),
  remove: (id) => api.delete(`/products/${id}`).then((response) => response.data),
};
