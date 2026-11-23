const PDFDocument = require('pdfkit');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const StockMovement = require('../models/StockMovement');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { nextOrderNumber } = require('../utils/sequence');
const { resolveReference } = require('../utils/refs');

const serializeOrder = (order) => {
  const data = order.toJSON();

  return {
    ...data,
    supplier: order.supplier?.name || null,
    supplierId: order.supplier?.id || null,
    lines: (order.lines || []).map((line) => ({
      productId: line.product?.id || line.product?.toString?.() || null,
      product: line.productName,
      quantity: line.quantity,
      price: line.price,
    })),
  };
};

const populateOrder = (query) => query.populate('supplier', 'name').populate('lines.product', 'name');

const round3 = (value) => Number(Number(value || 0).toFixed(3));

const startOfDay = (value = new Date()) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

/** Écrit le bon de commande dans un document PDFKit déjà créé. */
const writeOrderPdf = (doc, order) => {
  doc.fontSize(20).text('SmartStore');
  doc.fontSize(10).fillColor('#555').text('Bon de commande fournisseur');
  doc.moveDown();
  doc.fillColor('#000').fontSize(14).text(`Commande ${order.number}`);
  doc.fontSize(10).text(`Fournisseur : ${order.supplier?.name || '—'}`);
  doc.text(`Date : ${new Date(order.date).toLocaleString('fr-FR')}`);
  doc.text(`Statut : ${order.status}`);
  doc.text(`Origine : ${order.source === 'automatique' ? 'Automatique' : 'Manuelle'}`);
  doc.moveDown();

  order.lines.forEach((line, index) => {
    doc.text(
      `${index + 1}. ${line.productName} — ${line.quantity} × ${Number(line.price).toFixed(3)} DT`
    );
  });

  doc.moveDown();
  doc.fontSize(12).text(`Total : ${Number(order.total).toFixed(3)} DT`, { align: 'right' });
};

/** Construit le PDF en mémoire (utilisé pour les pièces jointes e-mail). */
const buildOrderPdfBuffer = (order) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    writeOrderPdf(doc, order);
    doc.end();
  });

/**
 * GET /api/orders
 */
const list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.supplier) filter.supplier = req.query.supplier;

  const orders = await populateOrder(Order.find(filter).sort({ date: -1 }).limit(500));
  res.json({ success: true, data: orders.map(serializeOrder) });
});

/**
 * GET /api/orders/:id
 */
const getById = asyncHandler(async (req, res) => {
  const order = await populateOrder(Order.findById(req.params.id));
  if (!order) throw httpError(404, 'Commande introuvable.');
  res.json({ success: true, data: serializeOrder(order) });
});

/**
 * POST /api/orders
 * Body : { supplier, source, lines: [{ productId, quantity, price }] }
 */
const create = asyncHandler(async (req, res) => {
  const { supplier, source = 'manuelle', lines } = req.body;

  if (!Array.isArray(lines) || !lines.length) {
    throw httpError(400, 'Ajoutez au moins un produit à la commande.');
  }

  const supplierId = await resolveReference(Supplier, supplier);

  const productIds = lines.map((line) => line.productId || line.product).filter(Boolean);
  const products = await Product.find({ _id: { $in: productIds } });
  const productsById = new Map(products.map((product) => [product.id, product]));

  const orderLines = lines.map((line) => {
    const productId = line.productId || line.product;
    const product = productsById.get(String(productId));
    const quantity = Number(line.quantity);

    if (!product) throw httpError(404, 'Un produit de la commande est introuvable.');
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw httpError(400, 'Les quantités doivent être des entiers positifs.');
    }

    const price =
      line.price !== undefined
        ? Number(line.price)
        : product.purchasePrice || Number((product.price * 0.7).toFixed(3));

    return {
      product: product._id,
      productName: product.name,
      quantity,
      price,
    };
  });

  const items = orderLines.reduce((total, line) => total + line.quantity, 0);
  const total = round3(orderLines.reduce((sum, line) => sum + line.price * line.quantity, 0));

  const order = await Order.create({
    number: await nextOrderNumber(),
    supplier: supplierId,
    date: new Date(),
    items,
    total,
    status: 'en_attente',
    source,
    lines: orderLines,
  });

  await order.populate('supplier', 'name');
  await order.populate('lines.product', 'name');

  res.status(201).json({ success: true, data: serializeOrder(order) });
});

/**
 * PATCH /api/orders/:id/status
 */
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ['en_attente', 'validee', 'refusee', 'recue'];

  if (!allowed.includes(status)) {
    throw httpError(400, 'Statut de commande invalide.');
  }

  // US009 : seul l'administrateur valide ou refuse une commande.
  // US031 : le gestionnaire de stock peut réceptionner une commande validée.
  if (['validee', 'refusee'].includes(status) && req.user.role !== 'admin') {
    throw httpError(403, 'Seul un administrateur peut valider ou refuser une commande.');
  }

  const order = await Order.findById(req.params.id);
  if (!order) throw httpError(404, 'Commande introuvable.');

  if (order.status === status) {
    return res.json({ success: true, data: serializeOrder(order) });
  }

  const transitions = {
    en_attente: ['validee', 'refusee'],
    validee: ['recue', 'refusee'],
    refusee: ['en_attente'],
    recue: [],
  };

  if (!(transitions[order.status] || []).includes(status)) {
    throw httpError(
      409,
      `Transition impossible : une commande « ${order.status} » ne peut pas devenir « ${status} ».`
    );
  }

  const shouldApplyStock = status === 'recue' && !order.stockApplied;

  order.status = status;

  if (shouldApplyStock) {
    const lines = order.lines.filter((line) => line.product);
    if (lines.length) {
      await Product.bulkWrite(
        lines.map((line) => ({
          updateOne: {
            filter: { _id: line.product },
            update: { $inc: { stock: line.quantity } },
          },
        }))
      );

      await StockMovement.insertMany(
        lines.map((line) => ({
          product: line.product,
          type: 'entree',
          quantity: line.quantity,
          reason: `Réception commande ${order.number}`,
          user: req.user.id,
        }))
      ).catch((error) =>
        console.error('[stock] réception de commande non enregistrée :', error.message)
      );
    }
    order.stockApplied = true;
  }

  await order.save();
  await order.populate('supplier', 'name');
  await order.populate('lines.product', 'name');

  res.json({ success: true, data: serializeOrder(order) });
});

/**
 * Crée une commande par fournisseur pour tous les produits sous le seuil.
 * Fonction partagée par l'endpoint HTTP et la tâche cron de 16h00.
 *
 * - une seule commande automatique en attente par fournisseur et par jour ;
 * - quantité proposée = de quoi dépasser le seuil (minimum 10 pièces) ;
 * - retourne les documents Mongoose (avec fournisseur et produits peuplés).
 */
async function createLowStockOrders({ threshold } = {}) {
  const limit = Number(threshold) || Number(process.env.STOCK_ALERT_THRESHOLD) || 8;

  const products = await Product.find({
    active: true,
    $expr: { $lt: ['$stock', { $ifNull: ['$lowStockThreshold', limit] }] },
  }).populate('supplier', 'name');

  if (!products.length) return [];

  const groups = new Map();
  products.forEach((product) => {
    const key = product.supplier?.id || 'sans-fournisseur';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(product);
  });

  const created = [];
  const dayStart = startOfDay();

  for (const [supplierKey, supplierProducts] of groups) {
    // Évite d'envoyer chaque jour une nouvelle commande identique au même fournisseur.
    if (supplierKey !== 'sans-fournisseur') {
      const pending = await Order.exists({
        supplier: supplierKey,
        status: 'en_attente',
        source: 'automatique',
        date: { $gte: dayStart },
      });
      if (pending) continue;
    }

    const orderLines = supplierProducts.map((product) => {
      const productThreshold = product.lowStockThreshold || limit;
      const quantity = Math.max(10, productThreshold * 2 - product.stock);
      const price = round3(
        product.purchasePrice || Number((product.price * 0.7).toFixed(3))
      );
      return {
        product: product._id,
        productName: product.name,
        quantity,
        price,
      };
    });

    const items = orderLines.reduce((total, line) => total + line.quantity, 0);
    const total = round3(orderLines.reduce((sum, line) => sum + line.price * line.quantity, 0));

    const order = await Order.create({
      number: await nextOrderNumber(),
      supplier: supplierKey === 'sans-fournisseur' ? null : supplierKey,
      date: new Date(),
      items,
      total,
      status: 'en_attente',
      source: 'automatique',
      lines: orderLines,
    });

    await order.populate('supplier', 'name');
    await order.populate('lines.product', 'name');
    created.push(order);
  }

  return created;
}

/**
 * GET /api/orders/generate-low-stock
 * Generates low‑stock orders. No request body is required.
 * Returns a 200 with an empty array when nothing is generated,
 * otherwise a 201 with the created orders.
 */
const generateLowStockOrder = asyncHandler(async (req, res) => {
  // Use the optional threshold query param, fall back to env/default.
  const threshold = Number(req.query.threshold) || Number(process.env.STOCK_ALERT_THRESHOLD) || 8;
  const created = await createLowStockOrders({ threshold });

  if (!created.length) {
    // No new orders – not an error, just inform the client.
    return res.status(200).json({
      success: true,
      message: 'Aucun produit sous le seuil (ou commande déjà générée aujourd\'hui).',
      data: [],
    });
  }

  res.status(201).json({
    success: true,
    message: `${created.length} commande(s) générée(s) depuis les alertes de stock.`,
    data: created.map(serializeOrder),
  });
});

/**
 * GET /api/orders/:id/pdf
 */
const downloadPdf = asyncHandler(async (req, res) => {
  const order = await populateOrder(Order.findById(req.params.id));
  if (!order) throw httpError(404, 'Commande introuvable.');

  const buffer = await buildOrderPdfBuffer(order);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${order.number}.pdf"`);
  res.send(buffer);
});

module.exports = {
  list,
  getById,
  create,
  updateStatus,
  generateLowStockOrder,
  createLowStockOrders,
  buildOrderPdfBuffer,
  downloadPdf,
};
