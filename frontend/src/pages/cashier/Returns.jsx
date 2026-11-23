import { useEffect, useState } from 'react';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import { getErrorMessage } from '../../services/api';
import { productService } from '../../services/product.service';
import { saleService } from '../../services/sale.service';
import { formatDateTime, formatMoney } from '../../utils/format';

export default function Returns() {
  const [mySales, setMySales] = useState([]);
  const [products, setProducts] = useState([]);
  const [returnsList, setReturnsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    saleId: '',
    productId: '',
    quantity: 1,
    reason: 'Produit endommagé',
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [sales, productList, returns] = await Promise.all([
        saleService.my(),
        productService.list(),
        saleService.myReturns(),
      ]);

      setMySales(sales);
      setProducts(productList);
      setReturnsList(returns);

      setForm((previous) => {
        const sale = sales.find((item) => item.id === previous.saleId) || sales[0];
        return {
          ...previous,
          saleId: sale?.id || '',
          productId: sale?.lines?.[0]?.productId || productList[0]?.id || '',
        };
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedSale = mySales.find((sale) => sale.id === form.saleId);

  const productOptions = selectedSale?.lines?.length
    ? selectedSale.lines
    : products.map((product) => ({ productId: product.id, name: product.name, price: product.price }));

  const handleSaleChange = (saleId) => {
    const sale = mySales.find((item) => item.id === saleId);
    setForm({
      ...form,
      saleId,
      productId: sale?.lines?.[0]?.productId || '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedSale || !form.productId) {
      setNotice('Veuillez sélectionner une vente et un produit.');
      return;
    }

    setSaving(true);
    try {
      const line = selectedSale.lines.find((item) => item.productId === form.productId);
      await saleService.createReturn(selectedSale.id, {
        productId: form.productId,
        quantity: Number(form.quantity),
        reason: form.reason,
      });
      setNotice(
        `Retour enregistré : ${line?.name || 'produit'} × ${Number(form.quantity)}. Stock et facture mis à jour.`
      );
      setForm((previous) => ({ ...previous, quantity: 1 }));
      await loadData();
      window.setTimeout(() => setNotice(''), 4000);
    } catch (submitError) {
      setNotice(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Retours produits"
        subtitle="Enregistrez les produits retournés par un client pour corriger la vente et le stock."
      />

      {error ? <div className="alert alert-danger py-2 fs-13">{error}</div> : null}
      {notice ? <div className="alert alert-success py-2 fs-13"><i className="bi bi-check-circle me-2" />{notice}</div> : null}

      <div className="row g-3">
        <div className="col-xl-5">
          <div className="card">
            <div className="card-header">
              <div>Nouveau retour</div>
              <div className="text-muted fs-12 fw-normal mt-1">Uniquement sur vos propres ventes</div>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <span className="spinner-border spinner-border-sm text-brand me-2" />
                  Chargement…
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="return-invoice">Facture d'origine</label>
                    <select
                      id="return-invoice"
                      className="form-select"
                      value={form.saleId}
                      onChange={(event) => handleSaleChange(event.target.value)}
                      required
                    >
                      {mySales.map((sale) => (
                        <option key={sale.id} value={sale.id}>
                          {sale.invoice} — {formatDateTime(sale.date)} — {formatMoney(sale.total)}
                        </option>
                      ))}
                    </select>
                    {selectedSale ? (
                      <div className="text-muted fs-12 mt-1">
                        Vente de {selectedSale.items} article(s), payée en {selectedSale.payment === 'especes' ? 'espèces' : 'carte'}.
                      </div>
                    ) : null}
                  </div>

                  <div className="mb-3">
                    <label className="form-label" htmlFor="return-product">Produit retourné</label>
                    <select
                      id="return-product"
                      className="form-select"
                      value={form.productId}
                      onChange={(event) => setForm({ ...form, productId: event.target.value })}
                    >
                      {productOptions.map((line) => (
                        <option key={line.productId} value={line.productId}>
                          {line.name} — {formatMoney(line.price)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-5">
                      <label className="form-label" htmlFor="return-quantity">Quantité</label>
                      <input
                        id="return-quantity"
                        type="number"
                        min="1"
                        className="form-control"
                        value={form.quantity}
                        onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                      />
                    </div>
                    <div className="col-7">
                      <label className="form-label" htmlFor="return-reason">Motif</label>
                      <select
                        id="return-reason"
                        className="form-select"
                        value={form.reason}
                        onChange={(event) => setForm({ ...form, reason: event.target.value })}
                      >
                        <option>Produit endommagé</option>
                        <option>Erreur de saisie</option>
                        <option>Produit non conforme</option>
                        <option>Changement d'avis</option>
                      </select>
                    </div>
                  </div>

                  <div className="alert alert-light border fs-12 py-2">
                    <i className="bi bi-info-circle me-1 text-brand" />
                    Le retour sera enregistré, le stock réincrémenté et la facture marquée comme
                    retour partiel.
                  </div>

                  <button type="submit" className="btn btn-brand w-100" disabled={!mySales.length || saving}>
                    <i className="bi bi-arrow-return-left me-1" /> {saving ? 'Enregistrement…' : 'Enregistrer le retour'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-7">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>Mes retours enregistrés</div>
              <span className="badge-soft-neutral">{returnsList.length}</span>
            </div>
            <div className="table-responsive">
              <table className="table table-modern align-middle">
                <thead>
                  <tr>
                    <th>Facture</th>
                    <th>Produit</th>
                    <th className="text-center">Qté</th>
                    <th>Motif</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {returnsList.map((item) => (
                    <tr key={item.id}>
                      <td className="fw-semibold">{item.invoice}</td>
                      <td>{item.product}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-muted">{item.reason}</td>
                      <td className="text-muted fs-13">{formatDateTime(item.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && !returnsList.length ? (
                <EmptyState icon="bi-arrow-return-left" title="Aucun retour" text="Les retours que vous enregistrez apparaîtront ici." />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
