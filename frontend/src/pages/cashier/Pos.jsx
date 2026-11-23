import { useEffect, useMemo, useRef, useState } from 'react';
import EmptyState from '../../components/EmptyState';
import InvoiceView from '../../components/InvoiceView';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import { categoryColor } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import { categoryService } from '../../services/category.service';
import { invoiceService } from '../../services/invoice.service';
import { productService } from '../../services/product.service';
import { saleService } from '../../services/sale.service';
import { filenameFromHeaders, saveBlob } from '../../utils/download';
import { formatMoney } from '../../utils/format';

export default function Pos() {
  const { user } = useAuth();
  const inputRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [payment, setPayment] = useState('especes');
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [scanHelp, setScanHelp] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanError, setScanError] = useState('');
  const scannerRef = useRef(null);
  const scanLockedRef = useRef(false);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2800);
  };

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      // Le scanner est déjà arrêté.
    }
    try {
      await scanner.clear();
    } catch {
      // La zone vidéo a déjà été retirée du DOM.
    }
  };

  const closeScanner = async () => {
    await stopScanner();
    setScannerOpen(false);
    setScanError('');
    inputRef.current?.focus();
  };

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const [productList, categoryList] = await Promise.all([
        productService.list(),
        categoryService.list(),
      ]);
      setProducts(productList);
      setCategories(categoryList);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
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

  const itemCount = cart.reduce((total, line) => total + line.quantity, 0);
  const total = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);

  const addToCart = (product) => {
    const existing = cart.find((line) => line.id === product.id);
    const currentQuantity = existing?.quantity || 0;
    if (currentQuantity >= product.stock) {
      flash(`Stock insuffisant pour « ${product.name} » (${product.stock} disponible(s)).`);
      return;
    }
    setCart((previous) =>
      existing
        ? previous.map((line) =>
            line.id === product.id ? { ...line, quantity: line.quantity + 1 } : line
          )
        : [...previous, { ...product, quantity: 1 }]
    );
  };

  /**
   * US018 – lecture par caméra.
   * `html5-qrcode` est chargé à la demande pour ne pas alourdir l'écran caisse.
   */
  useEffect(() => {
    if (!scannerOpen) return undefined;

    let cancelled = false;
    scanLockedRef.current = false;
    setScanError('');

    const start = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

        const scanner = new Html5Qrcode('barcode-camera');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 170 } },
          (decodedText) => {
            if (scanLockedRef.current) return;
            const code = decodedText.trim();
            const product = products.find((item) => item.barcode === code);

            if (!product) {
              setScanError(`Code ${code} inconnu. Vérifiez le produit ou saisissez le code manuellement.`);
              return;
            }

            scanLockedRef.current = true;
            addToCart(product);
            flash(`« ${product.name} » ajouté au panier.`);
            closeScanner();
          },
          () => {
            // Les erreurs de décodage image par image sont ignorées.
          }
        );
      } catch (cameraError) {
        if (!cancelled) {
          setScanError(
            cameraError?.message ||
              "Impossible d'accéder à la caméra. Autorisez la caméra ou utilisez le lecteur USB."
          );
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen]);

  const changeQuantity = (id, delta) => {
    const line = cart.find((item) => item.id === id);
    const product = products.find((item) => item.id === id);
    if (!line || !product) return;
    if (delta > 0 && line.quantity >= product.stock) {
      flash(`Stock maximum atteint pour « ${product.name} ».`);
      return;
    }
    setCart((previous) =>
      previous.flatMap((item) => {
        if (item.id !== id) return [item];
        const nextQuantity = item.quantity + delta;
        return nextQuantity <= 0 ? [] : [{ ...item, quantity: nextQuantity }];
      })
    );
  };

  const removeLine = (id) => {
    setCart((previous) => previous.filter((line) => line.id !== id));
  };

  const clearCart = () => {
    if (cart.length && !window.confirm('Vider le panier en cours ?')) return;
    setCart([]);
    inputRef.current?.focus();
  };

  const handleScan = (event) => {
    event.preventDefault();
    const term = search.trim();
    if (!term) return;
    const exact = products.find((product) => product.barcode === term);
    const target = exact || (filtered.length === 1 ? filtered[0] : null);
    if (!target) {
      flash('Aucun produit ne correspond à cette recherche.');
      return;
    }
    addToCart(target);
    setSearch('');
    inputRef.current?.focus();
  };

  const confirmSale = async () => {
    if (!cart.length || saving) return;

    setSaving(true);
    try {
      const sale = await saleService.create({
        payment,
        lines: cart.map((line) => ({ productId: line.id, quantity: line.quantity })),
      });

      setLastSale(sale);
      setShowInvoice(true);
      setCart([]);
      setSearch('');
      flash('Vente enregistrée : stock mis à jour et facture archivée.');
      await loadProducts();
    } catch (saleError) {
      flash(getErrorMessage(saleError));
    } finally {
      setSaving(false);
    }
  };

  const downloadInvoice = async () => {
    if (!lastSale) return;
    try {
      const response = await invoiceService.downloadPdf(lastSale.id);
      saveBlob(
        response.data,
        filenameFromHeaders(response.headers, `${lastSale.invoice}.pdf`)
      );
    } catch (downloadError) {
      flash(getErrorMessage(downloadError));
    }
  };

  return (
    <>
      <PageHeader
        title="Encaissement"
        subtitle="Scannez ou saisissez le code-barres, puis validez le paiement du client."
        actions={
          <>
            <button type="button" className="btn btn-soft" onClick={() => setScanHelp(true)}>
              <i className="bi bi-question-circle me-1" /> Aide au scan
            </button>
            <button type="button" className="btn btn-brand" onClick={() => setScannerOpen(true)}>
              <i className="bi bi-camera me-1" /> Scanner avec la caméra
            </button>
          </>
        }
      />

      {error ? <div className="alert alert-danger py-2 fs-13">{error}</div> : null}

      {notice ? (
        <div
          className="alert alert-warning shadow-sm position-fixed bottom-0 end-0 m-3 fs-13"
          style={{ zIndex: 1090, maxWidth: 380 }}
        >
          <i className="bi bi-exclamation-triangle me-2" />
          {notice}
        </div>
      ) : null}

      <div className="pos-shell">
        <div className="card">
          <div className="card-header">
            <form onSubmit={handleScan}>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0" style={{ borderRadius: '10px 0 0 10px' }}>
                  <i className="bi bi-upc-scan text-brand fs-5" />
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  className="form-control border-start-0 border-end-0"
                  placeholder="Scanner ou saisir le code-barres, puis Entrée…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn btn-brand" style={{ borderRadius: '0 10px 10px 0' }}>
                  <i className="bi bi-plus-lg me-1" /> Ajouter
                </button>
              </div>
            </form>
            <div className="d-flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                className={`btn btn-sm ${category === 'all' ? 'btn-brand' : 'btn-soft'}`}
                onClick={() => setCategory('all')}
              >
                Tous
              </button>
              {categories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`btn btn-sm ${category === item.id ? 'btn-brand' : 'btn-soft'}`}
                  onClick={() => setCategory(item.id)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div className="card-body">
            {loading ? (
              <div className="text-center py-5">
                <span className="spinner-border spinner-border-sm text-brand me-2" />
                Chargement des produits…
              </div>
            ) : (
              <div className="row g-2">
                {filtered.map((product) => {
                  const disabled = product.stock <= 0;
                  return (
                    <div className="col-6 col-md-4 col-xxl-3" key={product.id}>
                      <button
                        type="button"
                        className={`pos-product-card text-start w-100 ${disabled ? 'disabled' : ''}`}
                        onClick={() => addToCart(product)}
                        title={disabled ? 'Produit en rupture de stock' : `Ajouter ${product.name}`}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1 gap-1">
                          <span className={`badge-soft-${categoryColor(product.category)}`}>
                            {product.category || '—'}
                          </span>
                          <span className="pos-product-price">{formatMoney(product.price)}</span>
                        </div>
                        <div className="pos-product-name">{product.name}</div>
                        <div className="d-flex justify-content-between mt-2 pos-product-meta">
                          <span className="font-monospace">{product.barcode.slice(-6)}</span>
                          <span
                            className={
                              product.stock < (product.lowStockThreshold ?? 8)
                                ? 'text-warning fw-semibold'
                                : ''
                            }
                          >
                            {product.stock} en stock
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {!loading && !filtered.length ? (
              <EmptyState icon="bi-search" title="Aucun produit trouvé" text="Vérifiez le code-barres ou changez de catégorie." />
            ) : null}
          </div>
        </div>

        <div className="card cart-box">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div>
              <i className="bi bi-cart3 me-2 text-brand" />
              Panier
              <span className="badge bg-brand ms-2">{itemCount}</span>
            </div>
            <button
              type="button"
              className="btn btn-soft btn-sm"
              onClick={clearCart}
              disabled={!cart.length}
            >
              <i className="bi bi-trash3 me-1" /> Vider
            </button>
          </div>

          <div className="card-body">
            {cart.length ? (
              <div className="cart-items mb-2">
                {cart.map((line) => (
                  <div className="cart-item" key={line.id}>
                    <div className="product-avatar" style={{ width: 34, height: 34, fontSize: '0.65rem' }}>
                      {line.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-semibold fs-13 text-truncate">{line.name}</div>
                      <div className="text-muted fs-12">{formatMoney(line.price)} / unité</div>
                    </div>
                    <div className="qty-control">
                      <button type="button" className="qty-btn" onClick={() => changeQuantity(line.id, -1)}>
                        <i className="bi bi-dash" />
                      </button>
                      <span className="qty-value">{line.quantity}</span>
                      <button type="button" className="qty-btn" onClick={() => changeQuantity(line.id, 1)}>
                        <i className="bi bi-plus" />
                      </button>
                    </div>
                    <div className="text-end" style={{ minWidth: 66 }}>
                      <div className="fw-bold fs-13">{formatMoney(line.price * line.quantity)}</div>
                      <button
                        type="button"
                        className="btn btn-link text-danger p-0 fs-12"
                        onClick={() => removeLine(line.id)}
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="bi-cart"
                title="Panier vide"
                text="Scannez un produit ou cliquez sur une carte pour l'ajouter."
              />
            )}

            <div className="border-top pt-3 mt-2">
              <div className="total-row">
                <span className="text-muted">Articles</span>
                <span>{itemCount}</span>
              </div>
              <div className="total-row">
                <span className="text-muted">Sous-total</span>
                <span className="fw-semibold">{formatMoney(total)}</span>
              </div>
              <div className="total-row">
                <span className="text-muted">TVA</span>
                <span className="fw-semibold">{formatMoney(0)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                <span className="fw-semibold">Total à payer</span>
                <span className="total-final">{formatMoney(total)}</span>
              </div>
            </div>

            <div className="mt-3">
              <div className="form-label">Mode de paiement *</div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className={`payment-option ${payment === 'especes' ? 'active' : ''}`}
                  onClick={() => setPayment('especes')}
                >
                  <i className="bi bi-cash-coin" />
                  <span className="fs-13 fw-semibold">Espèces</span>
                </button>
                <button
                  type="button"
                  className={`payment-option ${payment === 'carte' ? 'active' : ''}`}
                  onClick={() => setPayment('carte')}
                >
                  <i className="bi bi-credit-card" />
                  <span className="fs-13 fw-semibold">Carte</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-brand w-100 py-2 mt-3"
              disabled={!cart.length || saving}
              onClick={confirmSale}
            >
              <i className="bi bi-check2-circle me-1" /> {saving ? 'Enregistrement…' : 'Confirmer la vente'}
            </button>
            <div className="text-center text-muted fs-12 mt-2">
              Le stock et la facture sont mis à jour automatiquement.
            </div>
          </div>
        </div>
      </div>

      {showInvoice && lastSale ? (
        <Modal
          title="Vente enregistrée ✅"
          subtitle={`Facture ${lastSale.invoice} · ${lastSale.items} article(s)`}
          size="modal-lg"
          onClose={() => setShowInvoice(false)}
          footer={
            <>
              <button
                type="button"
                className="btn btn-soft"
                onClick={() => {
                  setShowInvoice(false);
                  inputRef.current?.focus();
                }}
              >
                Nouvelle vente
              </button>
              <button type="button" className="btn btn-soft" onClick={downloadInvoice}>
                <i className="bi bi-file-earmark-pdf me-1" /> PDF
              </button>
              <button type="button" className="btn btn-brand" onClick={() => window.print()}>
                <i className="bi bi-printer me-1" /> Imprimer la facture
              </button>
            </>
          }
        >
          <div className="alert alert-success fs-13 py-2">
            <i className="bi bi-check-circle me-2" />
            Paiement en {payment === 'especes' ? 'espèces' : 'carte bancaire'} enregistré. Le stock a été
            décrémenté et la facture archivée.
          </div>
          <InvoiceView sale={lastSale} lines={lastSale.lines || []} />
        </Modal>
      ) : null}

      {scannerOpen ? (
        <Modal
          title="Scanner avec la caméra"
          subtitle="Placez le code-barres dans le cadre. Le produit est ajouté automatiquement."
          onClose={closeScanner}
          footer={
            <button type="button" className="btn btn-soft" onClick={closeScanner}>
              Fermer la caméra
            </button>
          }
        >
          {scanError ? <div className="alert alert-warning fs-13 py-2">{scanError}</div> : null}
          <div
            id="barcode-camera"
            className="rounded-3 overflow-hidden bg-dark"
            style={{ minHeight: 260 }}
          />
          <div className="text-muted fs-12 mt-2">
            <i className="bi bi-info-circle me-1" />
            La caméra nécessite HTTPS ou <b>localhost</b>. Vous pouvez aussi utiliser le lecteur USB
            ou saisir le code manuellement.
          </div>
        </Modal>
      ) : null}

      {scanHelp ? (
        <Modal
          title="Scanner un produit"
          subtitle="Deux méthodes sont prévues par le cahier des charges."
          onClose={() => setScanHelp(false)}
          footer={
            <button type="button" className="btn btn-brand" onClick={() => setScanHelp(false)}>
              Compris
            </button>
          }
        >
          <div className="d-flex gap-3 mb-3">
            <div className="stat-icon" style={{ background: '#ccfbf1', color: '#0f766e' }}>
              <i className="bi bi-usb-plug" />
            </div>
            <div>
              <div className="fw-semibold">Lecteur USB (recommandé)</div>
              <div className="text-muted fs-13">
                Le lecteur fonctionne comme un clavier : cliquez dans le champ de recherche, scannez
                le produit, le code s'ajoute automatiquement puis validez avec Entrée.
              </div>
            </div>
          </div>
          <div className="d-flex gap-3">
            <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>
              <i className="bi bi-camera" />
            </div>
            <div>
              <div className="fw-semibold">Caméra de l'appareil</div>
              <div className="text-muted fs-13">
                Cliquez sur <b>Scanner avec la caméra</b>, puis présentez le code-barres devant
                l'objectif. La lecture utilise la bibliothèque <b>html5-qrcode</b>.
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
