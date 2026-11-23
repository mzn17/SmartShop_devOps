import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import { getErrorMessage } from '../../services/api';
import { categoryService } from '../../services/category.service';
import { productService } from '../../services/product.service';
import { supplierService } from '../../services/supplier.service';

const emptyCategory = { name: '', description: '' };
const emptySupplier = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
};

export default function References() {
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [categoryModal, setCategoryModal] = useState(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [supplierModal, setSupplierModal] = useState(null);
  const [supplierForm, setSupplierForm] = useState(emptySupplier);

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [categoryList, supplierList, productList] = await Promise.all([
        categoryService.list(),
        supplierService.list(),
        productService.list(),
      ]);
      setCategories(categoryList);
      setSuppliers(supplierList);
      setProducts(productList);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const productCounts = useMemo(() => {
    const counts = { category: {}, supplier: {} };
    products.forEach((product) => {
      if (product.categoryId) {
        counts.category[product.categoryId] = (counts.category[product.categoryId] || 0) + 1;
      }
      if (product.supplierId) {
        counts.supplier[product.supplierId] = (counts.supplier[product.supplierId] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  const openCategory = (category = null) => {
    setCategoryModal(category || { isNew: true });
    setCategoryForm(
      category
        ? { name: category.name, description: category.description || '' }
        : emptyCategory
    );
  };

  const openSupplier = (supplier = null) => {
    setSupplierModal(supplier || { isNew: true });
    setSupplierForm(
      supplier
        ? {
            name: supplier.name || '',
            contactName: supplier.contactName || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
          }
        : emptySupplier
    );
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    if (!categoryForm.name.trim()) {
      flash('Le nom de la catégorie est obligatoire.');
      return;
    }
    setSaving(true);
    try {
      if (categoryModal?.isNew) {
        await categoryService.create(categoryForm);
        flash('Catégorie ajoutée.');
      } else {
        await categoryService.update(categoryModal.id, categoryForm);
        flash('Catégorie mise à jour.');
      }
      setCategoryModal(null);
      await loadData();
    } catch (saveError) {
      flash(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (category) => {
    if (!window.confirm(`Supprimer la catégorie « ${category.name} » ?`)) return;
    try {
      await categoryService.remove(category.id);
      flash('Catégorie supprimée.');
      await loadData();
    } catch (deleteError) {
      flash(getErrorMessage(deleteError));
    }
  };

  const saveSupplier = async (event) => {
    event.preventDefault();
    if (!supplierForm.name.trim()) {
      flash('Le nom du fournisseur est obligatoire.');
      return;
    }
    setSaving(true);
    try {
      if (supplierModal?.isNew) {
        await supplierService.create(supplierForm);
        flash('Fournisseur ajouté.');
      } else {
        await supplierService.update(supplierModal.id, supplierForm);
        flash('Fournisseur mis à jour.');
      }
      setSupplierModal(null);
      await loadData();
    } catch (saveError) {
      flash(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const removeSupplier = async (supplier) => {
    if (!window.confirm(`Supprimer le fournisseur « ${supplier.name} » ?`)) return;
    try {
      await supplierService.remove(supplier.id);
      flash('Fournisseur supprimé.');
      await loadData();
    } catch (deleteError) {
      flash(getErrorMessage(deleteError));
    }
  };

  return (
    <>
      <PageHeader
        title="Catégories & fournisseurs"
        subtitle="Gérez les référentiels utilisés par le catalogue et les commandes de réapprovisionnement."
        actions={
          <>
            <button type="button" className="btn btn-soft" onClick={() => openSupplier()}>
              <i className="bi bi-truck me-1" /> Nouveau fournisseur
            </button>
            <button type="button" className="btn btn-brand" onClick={() => openCategory()}>
              <i className="bi bi-tags me-1" /> Nouvelle catégorie
            </button>
          </>
        }
      />

      {error ? <div className="alert alert-danger py-2 fs-13">{error}</div> : null}
      {notice ? (
        <div className="alert alert-success py-2 fs-13 d-flex justify-content-between align-items-center">
          <span><i className="bi bi-check-circle me-2" />{notice}</span>
          <button type="button" className="btn btn-sm btn-link text-success p-0" onClick={() => setNotice('')}>
            <i className="bi bi-x-lg" />
          </button>
        </div>
      ) : null}

      <div className="row g-3">
        <div className="col-xl-5">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <div>Catégories</div>
                <div className="text-muted fs-12 fw-normal mt-1">{categories.length} catégorie(s)</div>
              </div>
              <span className="badge-soft-info">{products.length} produit(s)</span>
            </div>
            <div className="table-responsive">
              <table className="table table-modern align-middle">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Description</th>
                    <th className="text-center">Produits</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="text-center py-5">
                        <span className="spinner-border spinner-border-sm text-brand me-2" />
                        Chargement…
                      </td>
                    </tr>
                  ) : null}
                  {!loading && categories.map((category) => (
                    <tr key={category.id}>
                      <td className="fw-semibold">{category.name}</td>
                      <td className="text-muted fs-13">{category.description || '—'}</td>
                      <td className="text-center">{productCounts.category[category.id] || 0}</td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-1">
                          <button type="button" className="btn btn-soft btn-icon" title="Modifier" onClick={() => openCategory(category)}>
                            <i className="bi bi-pencil" />
                          </button>
                          <button type="button" className="btn btn-soft btn-icon text-danger" title="Supprimer" onClick={() => removeCategory(category)}>
                            <i className="bi bi-trash3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && !categories.length ? (
                <EmptyState icon="bi-tags" title="Aucune catégorie" text="Créez une catégorie pour classer vos produits." />
              ) : null}
            </div>
          </div>
        </div>

        <div className="col-xl-7">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <div>Fournisseurs</div>
                <div className="text-muted fs-12 fw-normal mt-1">{suppliers.length} fournisseur(s)</div>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-modern align-middle">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Contact</th>
                    <th>Email / Téléphone</th>
                    <th className="text-center">Produits</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-5">
                        <span className="spinner-border spinner-border-sm text-brand me-2" />
                        Chargement…
                      </td>
                    </tr>
                  ) : null}
                  {!loading && suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td>
                        <div className="fw-semibold">{supplier.name}</div>
                        <div className="text-muted fs-12">{supplier.address || '—'}</div>
                      </td>
                      <td className="text-muted fs-13">{supplier.contactName || '—'}</td>
                      <td>
                        <div className="fs-13">{supplier.email || '—'}</div>
                        <div className="text-muted fs-12">{supplier.phone || '—'}</div>
                      </td>
                      <td className="text-center">{productCounts.supplier[supplier.id] || 0}</td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-1">
                          <button type="button" className="btn btn-soft btn-icon" title="Modifier" onClick={() => openSupplier(supplier)}>
                            <i className="bi bi-pencil" />
                          </button>
                          <button type="button" className="btn btn-soft btn-icon text-danger" title="Supprimer" onClick={() => removeSupplier(supplier)}>
                            <i className="bi bi-trash3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && !suppliers.length ? (
                <EmptyState icon="bi-truck" title="Aucun fournisseur" text="Ajoutez un fournisseur pour générer les bons de commande." />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {categoryModal ? (
        <Modal
          title={categoryModal.isNew ? 'Nouvelle catégorie' : 'Modifier la catégorie'}
          subtitle="Les catégories classent les produits du catalogue."
          onClose={() => setCategoryModal(null)}
          footer={
            <>
              <button type="button" className="btn btn-soft" onClick={() => setCategoryModal(null)}>Annuler</button>
              <button type="submit" form="category-form" className="btn btn-brand" disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </>
          }
        >
          <form id="category-form" onSubmit={saveCategory}>
            <div className="mb-3">
              <label className="form-label" htmlFor="category-name">Nom *</label>
              <input
                id="category-name"
                className="form-control"
                value={categoryForm.name}
                onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })}
                placeholder="Ex. Boissons"
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="category-description">Description</label>
              <textarea
                id="category-description"
                className="form-control"
                rows="3"
                value={categoryForm.description}
                onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })}
                placeholder="Description facultative"
              />
            </div>
          </form>
        </Modal>
      ) : null}

      {supplierModal ? (
        <Modal
          title={supplierModal.isNew ? 'Nouveau fournisseur' : 'Modifier le fournisseur'}
          subtitle="Le fournisseur est utilisé par les produits et les commandes."
          onClose={() => setSupplierModal(null)}
          footer={
            <>
              <button type="button" className="btn btn-soft" onClick={() => setSupplierModal(null)}>Annuler</button>
              <button type="submit" form="supplier-form" className="btn btn-brand" disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </>
          }
        >
          <form id="supplier-form" onSubmit={saveSupplier}>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label" htmlFor="supplier-name">Nom *</label>
                <input
                  id="supplier-name"
                  className="form-control"
                  value={supplierForm.name}
                  onChange={(event) => setSupplierForm({ ...supplierForm, name: event.target.value })}
                  placeholder="Ex. SOTUBI"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="supplier-contact">Contact</label>
                <input
                  id="supplier-contact"
                  className="form-control"
                  value={supplierForm.contactName}
                  onChange={(event) => setSupplierForm({ ...supplierForm, contactName: event.target.value })}
                  placeholder="Nom du contact"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="supplier-phone">Téléphone</label>
                <input
                  id="supplier-phone"
                  className="form-control"
                  value={supplierForm.phone}
                  onChange={(event) => setSupplierForm({ ...supplierForm, phone: event.target.value })}
                  placeholder="+216 ..."
                />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="supplier-email">Email</label>
                <input
                  id="supplier-email"
                  type="email"
                  className="form-control"
                  value={supplierForm.email}
                  onChange={(event) => setSupplierForm({ ...supplierForm, email: event.target.value })}
                  placeholder="contact@fournisseur.tn"
                />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="supplier-address">Adresse</label>
                <input
                  id="supplier-address"
                  className="form-control"
                  value={supplierForm.address}
                  onChange={(event) => setSupplierForm({ ...supplierForm, address: event.target.value })}
                  placeholder="Ville, adresse"
                />
              </div>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
