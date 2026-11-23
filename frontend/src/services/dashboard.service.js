import api, { apiData } from './api';

export const dashboardService = {
  stats: (params) => apiData(api.get('/dashboard/stats', { params })),
  salesChart: (params) => apiData(api.get('/dashboard/sales-chart', { params })),
  topProducts: (params) => apiData(api.get('/dashboard/top-products', { params })),
  cashRegister: (params) => apiData(api.get('/dashboard/cash-register', { params })),
  exportReport: (params) =>
    api.get('/dashboard/export', { params, responseType: 'blob' }).then((response) => response),
};
