import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import { categoryColor } from '../../constants';
import { getErrorMessage } from '../../services/api';
import { categoryService } from '../../services/category.service';
import { productService } from '../../services/product.service';
import { formatMoney, stockStatus } from '../../utils/format';

export default function CashierProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([productService.list(), categoryService.list()])
      .then(([productList, categoryList]) => {
        if (!active) return;
        setProducts(productList);
        setCategories(categoryList);
      })
      .catch((loadError) => {
        if (active) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !term || product.name.toLowerCase().includes(term) || product.barcode.includes(term);
      const matchesCategory = category === 'all' || product.categoryId === category;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  const available = products.filter(
    (product) => product.stock >= (product.lowStockThreshold ?? 8)
  ).length;
  const lowStock = products.filter(
    (product) => product.stock > 0 && product.stock < (product.lowStockThreshold ?? 8)
  ).length;
  const outOfStock = products.filter((product) => product.stock <= 0).length;

  return (
    <>
      <PageHeader
        title="Catalogue produits"
        subtitle="Consultez les produits et leur disponibilité avant de renseigner un client."
      />

      {error ? <div className="alert alert-danger py-2 fs-13">{error}</div> : null}

      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="stat-card">
            <div className="stat-label">Références</div>
            <div className="stat-value">{products.length}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="stat-card">
            <div className="stat-label">Disponibles</div>
            <div className="stat-value text-success">{available}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="stat-card">
            <div className="stat-label">Stock faible</div>
            <div className="stat-value text-warning">{lowStock}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="stat-card">
            <div className="stat-label">En rupture</div>
            <div className="stat-value text-danger">{outOfStock}</div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-12 col-lg-7">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0" style={{ borderRadius: '10px 0 0 10px' }}>
                  <i className="bi bi-search text-muted" />
                </span>
                <input
                  type="search"
                  className="form-control border-start-0"
                  placeholder="Rechercher un produit par nom ou code-barres…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  style={{ borderRadius: '0 10px 10px 0' }}
                />
              </div>
            </div>
            <div className="col-12 col-lg-4">
              <select className="form-select" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">Toutes les catégories</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-lg-1 text-lg-end align-self-center">
              <span className="text-muted fs-12">{filtered.length}</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <span className="spinner-border text-brand me-2" />
          Chargement du catalogue…
        </div>
      ) : (
        <div className="row g-3">
          {filtered.map((product) => {
            const status = stockStatus(product.stock, product.lowStockThreshold ?? 8);
            return (
              <div className="col-md-6 col-xl-4" key={product.id}>
                <div className="card h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="product-avatar">{product.name.slice(0, 2).toUpperCase()}</div>
                      <span className={`badge-soft-${categoryColor(product.category)}`}>
                        {product.category || '—'}
                      </span>
                    </div>
                    <div className="fw-bold mb-1">{product.name}</div>
                    <div className="text-muted fs-12 font-monospace mb-3">{product.barcode}</div>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="text-muted fs-12">Prix de vente</div>
                        <div className="fw-800 text-brand fs-5">{formatMoney(product.price)}</div>
                      </div>
                      <div className="text-end">
                        <div className="text-muted fs-12">Disponibilité</div>
                        <span className={status.className}>{product.stock} pièces</span>
                      </div>
                    </div>
                    <div className="border-top mt-3 pt-3 d-flex justify-content-between text-muted fs-12">
                      <span><i className="bi bi-truck me-1" />{product.supplier || '—'}</span>
                      <span>{status.label}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !filtered.length ? (
        <div className="card">
          <EmptyState icon="bi-box-seam" title="Aucun produit trouvé" text="Essayez un autre nom, code-barres ou catégorie." />
        </div>
      ) : null}
    </>
  );
}
