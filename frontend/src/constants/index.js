/**
 * Libellés et couleurs partagés par l'interface.
 * Les couleurs de catégorie sont déterministes : une même catégorie
 * garde toujours la même couleur, sans liste codée en dur.
 */
export const ROLE_LABELS = {
  admin: 'Administrateur',
  gestionnaire: 'Gestionnaire de stock',
  caissier: 'Caissier',
};

const CATEGORY_BADGES = ['primary', 'warning', 'info', 'danger', 'success'];

export const categoryColor = (name = '') => {
  if (!name) return 'neutral';
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(index);
    hash |= 0;
  }
  return CATEGORY_BADGES[Math.abs(hash) % CATEGORY_BADGES.length];
};

export const saleStatusMeta = {
  validee: { label: 'Validée', className: 'badge-soft-success' },
  partielle: { label: 'Retour partiel', className: 'badge-soft-warning' },
  retournee: { label: 'Retournée', className: 'badge-soft-danger' },
};
