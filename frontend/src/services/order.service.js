import api, { apiData } from './api';

export const orderService = {
  list: (params) => apiData(api.get('/orders', { params })),
  getById: (id) => apiData(api.get(`/orders/${id}`)),
  create: (payload) => apiData(api.post('/orders', payload)),
  updateStatus: (id, status) => apiData(api.patch(`/orders/${id}/status`, { status })),
  generateLowStock: (params) => apiData(api.post('/orders/generate-low-stock', null, { params })),
  downloadPdf: (id) =>
    api.get(`/orders/${id}/pdf`, { responseType: 'blob' }).then((response) => response),
  pdfUrl: (id) => `/api/orders/${id}/pdf`,
};
