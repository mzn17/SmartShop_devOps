import api, { apiData } from './api';

export const invoiceService = {
  list: (params) => apiData(api.get('/invoices', { params })),
  getById: (id) => apiData(api.get(`/invoices/${id}`)),
  downloadPdf: (id) =>
    api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }).then((response) => response),
  pdfUrl: (id) => `/api/invoices/${id}/pdf`,
};
