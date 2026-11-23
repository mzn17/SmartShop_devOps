const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { nextInvoiceNumber } = require('../utils/sequence');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const serializeSale = (sale) => {
  const data = sale.toJSON();

  return {
    ...data,
    cashier: sale.cashier?.name || null,
    cashierId: sale.cashier?.id || null,
    netTotal: Number(((sale.total || 0) - (sale.refundedTotal || 0)).toFixed(3)),
    lines: (sale.lines || []).map((line) => ({
      productId: line.product?.id || line.product?.toString?.() || null,
      name: line.name,
      quantity: line.quantity,
      price: line.price,
    })),
    returns: (sale.returns || []).map((item) => ({
      productId: item.product?.id || item.product?.toString?.() || null,
      name: item.name,
      quantity: item.quantity,
      reason: item.reason,
      date: item.date,
      cashier: item.cashier?.name || null,
      cashierId: item.cashier?.id || null,
    })),
  };
};

const populateSale = (query) =>
  query.populate('cashier', 'name').populate('lines.product', 'name barcode');

/**
 * GET /api/sales
 */
const list = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.search?.trim()) {
    filter.invoice = new RegExp(escapeRegex(req.query.search.trim()), 'i');
  }
  if (req.query.payment) filter.payment = req.query.payment;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.cashier) filter.cashier = req.query.cashier;

  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }

  const limit = Math.min(Number(req.query.limit) || 500, 1000);
  const sales = await populateSale(Sale.find(filter).sort({ date: -1 }).limit(limit));

  res.json({ success: true, data: sales.map(serializeSale) });
});

/**
 * GET /api/sales/my
 */
const mySales = asyncHandler(async (req, res) => {
  const sales = await populateSale(
    Sale.find({ cashier: req.user.id }).sort({ date: -1 }).limit(500)
  );
  res.json({ success: true, data: sales.map(serializeSale) });
});

/**
 * GET /api/sales/:id
 */
const getById = asyncHandler(async (req, res) => {
  const sale = await populateSale(Sale.findById(req.params.id));
  if (!sale) throw httpError(404, 'Vente introuvable.');

  // Un caissier ne consulte que ses propres ventes.
  if (req.user.role === 'caissier' && String(sale.cashier?._id || sale.cashier) !== String(req.user.id)) {
    throw httpError(403, 'Vous ne pouvez consulter que vos propres ventes.');
  }

  res.json({ success: true, data: serializeSale(sale) });
});

/**
 * POST /api/sales
 * Body : { payment: 'especes'|'carte', lines: [{ productId, quantity }] }
 */
const create = asyncHandler(async (req, res) => {
  const { payment, lines } = req.body;

  if (!['especes', 'carte'].includes(payment)) {
    throw httpError(400, 'Mode de paiement invalide.');
  }

  if (!Array.isArray(lines) || !lines.length) {
    throw httpError(400, 'Le panier est vide.');
  }

  const normalized = new Map();

  for (const item of lines) {
    const productId = item.productId || item.id;
    const quantity = Number(item.quantity);

    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      throw httpError(400, 'Chaque ligne doit contenir un produit et une quantité valide.');
    }

    normalized.set(String(productId), (normalized.get(String(productId)) || 0) + quantity);
  }

  const products = await Product.find({
    _id: { $in: [...normalized.keys()] },
    active: true,
  });

  if (products.length !== normalized.size) {
    throw httpError(404, 'Un ou plusieurs produits sont introuvables ou inactifs.');
  }

  const saleLines = products.map((product) => {
    const quantity = normalized.get(product.id);
    if (product.stock < quantity) {
      throw httpError(409, `Stock insuffisant pour « ${product.name} » (${product.stock} disponible(s)).`);
    }
    return {
      product: product._id,
      name: product.name,
      quantity,
      price: product.price,
    };
  });

  const items = saleLines.reduce((total, line) => total + line.quantity, 0);
  const total = Number(
    saleLines.reduce((sum, line) => sum + line.price * line.quantity, 0).toFixed(3)
  );

  const applied = [];
  let sale;

  try {
    // Décrémentation atomique : impossible de vendre plus que le stock disponible.
    for (const line of saleLines) {
      const result = await Product.updateOne(
        { _id: line.product, stock: { $gte: line.quantity } },
        { $inc: { stock: -line.quantity } }
      );

      if (result.modifiedCount !== 1) {
        throw httpError(409, `Stock insuffisant pour « ${line.name} ».`);
      }

      applied.push(line);
    }

    sale = await Sale.create({
      invoice: await nextInvoiceNumber(),
      cashier: req.user.id,
      date: new Date(),
      items,
      total,
      payment,
      status: 'validee',
      lines: saleLines,
    });
  } catch (error) {
    // Rollback manuel (compatible avec une instance MongoDB locale sans replica set).
    if (applied.length) {
      await Product.bulkWrite(
        applied.map((line) => ({
          updateOne: {
            filter: { _id: line.product },
            update: { $inc: { stock: line.quantity } },
          },
        }))
      );
    }
    throw error;
  }

  await StockMovement.insertMany(
    saleLines.map((line) => ({
      product: line.product,
      type: 'sortie',
      quantity: line.quantity,
      reason: `Vente ${sale.invoice}`,
      user: req.user.id,
    }))
  ).catch((error) => console.error('[stock] mouvement de vente non enregistré :', error.message));

  await sale.populate('cashier', 'name');
  await sale.populate('lines.product', 'name barcode');

  res.status(201).json({ success: true, data: serializeSale(sale) });
});

/**
 * POST /api/sales/:id/returns
 * Body : { productId, quantity, reason }
 */
const createReturn = asyncHandler(async (req, res) => {
  const { productId, quantity, reason = '' } = req.body;
  const returnQuantity = Number(quantity);

  if (!productId || !Number.isInteger(returnQuantity) || returnQuantity <= 0) {
    throw httpError(400, 'Produit et quantité retournée obligatoires.');
  }

  const sale = await Sale.findById(req.params.id);
  if (!sale) throw httpError(404, 'Vente introuvable.');

  if (req.user.role === 'caissier' && sale.cashier.toString() !== req.user.id) {
    throw httpError(403, 'Vous ne pouvez retourner que vos propres ventes.');
  }

  const line = sale.lines.find((item) => item.product.toString() === String(productId));
  if (!line) throw httpError(404, 'Ce produit ne fait pas partie de la vente.');

  const alreadyReturned = sale.returns
    .filter((item) => item.product.toString() === String(productId))
    .reduce((total, item) => total + item.quantity, 0);

  const remaining = line.quantity - alreadyReturned;
  if (returnQuantity > remaining) {
    throw httpError(400, `Quantité retournable maximale : ${remaining}.`);
  }

  await Product.updateOne({ _id: productId }, { $inc: { stock: returnQuantity } });

  sale.returns.push({
    product: productId,
    name: line.name,
    quantity: returnQuantity,
    reason,
    date: new Date(),
    cashier: req.user.id,
  });

  // Le total d'origine reste archivé ; refundedTotal permet de calculer
  // la recette nette (caisse, dashboard, rapports, export).
  sale.refundedTotal = Number(
    ((sale.refundedTotal || 0) + line.price * returnQuantity).toFixed(3)
  );

  const totalReturned = sale.returns.reduce((total, item) => total + item.quantity, 0);
  sale.status = totalReturned >= sale.items ? 'retournee' : 'partielle';

  await sale.save();

  await StockMovement.create({
    product: productId,
    type: 'entree',
    quantity: returnQuantity,
    reason: `Retour ${sale.invoice}`,
    user: req.user.id,
  }).catch((error) => console.error('[stock] retour non enregistré :', error.message));

  await sale.populate('cashier', 'name');
  await sale.populate('lines.product', 'name barcode');

  res.status(201).json({ success: true, data: serializeSale(sale) });
});

const flattenReturns = (sales, cashierId = null) => {
  const rows = [];

  sales.forEach((sale) => {
    sale.returns.forEach((item, index) => {
      const itemCashierId = item.cashier?.id || item.cashier?.toString?.() || null;
      if (cashierId && itemCashierId !== cashierId) return;

      rows.push({
        id: `${sale.id}-${index}`,
        saleId: sale.id,
        invoice: sale.invoice,
        product: item.name,
        quantity: item.quantity,
        reason: item.reason,
        date: item.date,
        cashier: item.cashier?.name || sale.cashier?.name || null,
      });
    });
  });

  return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
};

/**
 * GET /api/sales/returns/my
 */
const myReturns = asyncHandler(async (req, res) => {
  const sales = await Sale.find({ 'returns.0': { $exists: true } })
    .populate('cashier', 'name')
    .populate('returns.cashier', 'name')
    .sort({ 'returns.date': -1 });

  res.json({ success: true, data: flattenReturns(sales, req.user.id) });
});

/**
 * GET /api/sales/returns
 */
const listReturns = asyncHandler(async (_req, res) => {
  const sales = await Sale.find({ 'returns.0': { $exists: true } })
    .populate('cashier', 'name')
    .populate('returns.cashier', 'name')
    .sort({ 'returns.date': -1 });

  res.json({ success: true, data: flattenReturns(sales) });
});

module.exports = {
  list,
  mySales,
  getById,
  create,
  createReturn,
  myReturns,
  listReturns,
};
