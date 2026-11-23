const commonNavigation = [
  {
    section: "Vue d'ensemble",
    items: [
      { to: '/admin/dashboard', label: 'Tableau de bord', icon: 'bi-grid-1x2' },
    ],
  },
  {
    section: 'Gestion du magasin',
    items: [
      { to: '/admin/products', label: 'Produits', icon: 'bi-box-seam' },
      { to: '/admin/references', label: 'Catégories & fournisseurs', icon: 'bi-tags' },
      { to: '/admin/stock', label: 'Stock & mouvements', icon: 'bi-arrow-left-right' },
      { to: '/admin/orders', label: 'Commandes', icon: 'bi-truck' },
    ],
  },
];

export const adminNavigation = [
  ...commonNavigation,
  {
    section: 'Reporting & finances',
    items: [
      { to: '/admin/reports', label: 'Rapports BI', icon: 'bi-bar-chart-line' },
      { to: '/admin/sales', label: 'Historique des ventes', icon: 'bi-receipt-cutoff' },
      { to: '/admin/cash-register', label: 'Caisse & recettes', icon: 'bi-cash-stack' },
    ],
  },
  {
    section: 'Administration',
    items: [
      { to: '/admin/users', label: 'Utilisateurs', icon: 'bi-people' },
    ],
  },
];

/**
 * Le gestionnaire de stock gère le stock, les commandes et le tableau de bord,
 * sans accès aux recettes ni à l'historique des ventes (réservés à l'admin).
 */
export const managerNavigation = commonNavigation;

export const cashierNavigation = [
  {
    section: 'Caisse',
    items: [
      { to: '/cashier/pos', label: 'Encaissement', icon: 'bi-upc-scan' },
      { to: '/cashier/returns', label: 'Retours produits', icon: 'bi-arrow-return-left' },
    ],
  },
  {
    section: 'Activité',
    items: [
      { to: '/cashier/sales', label: 'Mes ventes', icon: 'bi-receipt-cutoff' },
      { to: '/cashier/products', label: 'Catalogue produits', icon: 'bi-box-seam' },
    ],
  },
];

export const getNavigation = (role) => {
  if (role === 'caissier') return cashierNavigation;
  if (role === 'gestionnaire') return managerNavigation;
  return adminNavigation;
};
