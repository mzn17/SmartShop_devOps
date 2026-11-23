import api, { apiData } from './api';

export const saleService = {
  list: (params) => apiData(api.get('/sales', { params })),
  my: () => apiData(api.get('/sales/my')),
  getById: (id) => apiData(api.get(`/sales/${id}`)),
  create: (payload) => apiData(api.post('/sales', payload)),
  createReturn: (saleId, payload) => apiData(api.post(`/sales/${saleId}/returns`, payload)),
  myReturns: () => apiData(api.get('/sales/returns/my')),
  listReturns: () => apiData(api.get('/sales/returns')),
};
