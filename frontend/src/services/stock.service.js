import api, { apiData } from './api';

export const stockService = {
  listMovements: (params) => apiData(api.get('/stock/movements', { params })),
  createMovement: (payload) => apiData(api.post('/stock/movements', payload)),
};
