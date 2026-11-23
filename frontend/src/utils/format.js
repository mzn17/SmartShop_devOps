export const formatMoney = (value) =>
  `${Number(value || 0)
    .toFixed(3)
    .replace('.', ',')} DT`;

/** Montant net d'une vente après déduction des retours. */
export const netTotalOf = (sale) =>
  Number((Number(sale?.netTotal ?? (sale?.total || 0) - (sale?.refundedTotal || 0)) || 0).toFixed(3));

export const formatDate = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

export const todayLong = () =>
  new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export const stockStatus = (stock, threshold = 8) => {
  if (stock <= 0) return { label: 'Rupture', className: 'badge-soft-danger' };
  if (stock < threshold) return { label: 'Stock faible', className: 'badge-soft-warning' };
  return { label: 'Disponible', className: 'badge-soft-success' };
};

export const orderStatus = {
  en_attente: { label: 'En attente', className: 'badge-soft-warning' },
  validee: { label: 'Validée', className: 'badge-soft-info' },
  refusee: { label: 'Refusée', className: 'badge-soft-danger' },
  recue: { label: 'Reçue', className: 'badge-soft-success' },
};

export const paymentLabels = {
  especes: 'Espèces',
  carte: 'Carte bancaire',
};
