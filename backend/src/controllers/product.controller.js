const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const StockMovement = require('../models/StockMovement');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { resolveReference, findReferenceId } = require('../utils/refs');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Formate un produit pour le frontend :
 * - `category` et `supplier` restent des noms lisibles
 * - `categoryId` et `supplierId` sont fournis pour les formulaires
 */
const serializeProduct = (product) => {
  const data = product.toJSON();
  return {
    ...data,
    category: product.category?.name || null,
    categoryId: product.category?.id || null,
    supplier: product.supplier?.name || null,
    supplierId: product.supplier?.id || null,
  };
};

const populateProduct = (query) =>
  query.populate('category', 'name').populate('supplier', 'name');

/**
 * GET /api/products
 * Filtres : search, category, supplier, lowStock, includeInactive, limit
 */
const list = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.includeInactive !== 'true') {
    filter.active = true;
  }

  if (req.query.search?.trim()) {
    const regex = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    filter.$or = [{ name: regex }, { barcode: regex }];
  }

  if (req.query.category) {
    const categoryId = await findReferenceId(Category, req.query.category);
    filter.category = categoryId || new mongoose.Types.ObjectId();
  }

  if (req.query.supplier) {
    const supplierId = await findReferenceId(Supplier, req.query.supplier);
    filter.supplier = supplierId || new mongoose.Types.ObjectId();
  }

  if (req.query.lowStock === 'true') {
    const threshold = Number(req.query.threshold) || Number(process.env.STOCK_ALERT_THRESHOLD) || 8;
    filter.$expr = { $lt: ['$stock', { $ifNull: ['$lowStockThreshold', threshold] }] };
  }

  const limit = Math.min(Number(req.query.limit) || 500, 1000);
  const products = await populateProduct(Product.find(filter).sort({ createdAt: -1 }).limit(limit));

  res.json({ success: true, data: products.map(serializeProduct) });
});

/**
 * GET /api/products/low-stock
 */
const listLowStock = asyncHandler(async (req, res) => {
  const threshold = Number(req.query.threshold) || Number(process.env.STOCK_ALERT_THRESHOLD) || 8;

  const products = await populateProduct(
    Product.find({
      active: true,
      $expr: { $lt: ['$stock', { $ifNull: ['$lowStockThreshold', threshold] }] },
    }).sort({ stock: 1 })
  );

  res.json({ success: true, data: products.map(serializeProduct) });
});

/**
 * GET /api/products/:id
 */
const getById = asyncHandler(async (req, res) => {
  const product = await populateProduct(Product.findById(req.params.id));
  if (!product) throw httpError(404, 'Produit introuvable.');
  res.json({ success: true, data: serializeProduct(product) });
});

/**
 * GET /api/products/barcode/:code
 */
const getByBarcode = asyncHandler(async (req, res) => {
  const product = await populateProduct(
    Product.findOne({ barcode: req.params.code.trim(), active: true })
  );
  if (!product) throw httpError(404, 'Aucun produit ne correspond à ce code-barres.');
  res.json({ success: true, data: serializeProduct(product) });
});

/**
 * POST /api/products
 */
const create = asyncHandler(async (req, res) => {
  const {
    name,
    barcode,
    category,
    supplier,
    price,
    purchasePrice = 0,
    stock = 0,
    lowStockThreshold = 8,
  } = req.body;

  if (!name?.trim() || !barcode?.trim()) {
    throw httpError(400, 'Le nom et le code-barres sont obligatoires.');
  }

  if (price === undefined || Number(price) < 0) {
    throw httpError(400, 'Le prix de vente est obligatoire.');
  }

  const existing = await Product.findOne({ barcode: barcode.trim() });
  if (existing) throw httpError(409, 'Ce code-barres est déjà utilisé par un autre produit.');

  const product = await Product.create({
    name: name.trim(),
    barcode: barcode.trim(),
    category: await resolveReference(Category, category),
    supplier: await resolveReference(Supplier, supplier),
    price: Number(price),
    purchasePrice: Number(purchasePrice) || 0,
    stock: Number(stock) || 0,
    lowStockThreshold: Number(lowStockThreshold) || 8,
  });

  await product.populate('category', 'name');
  await product.populate('supplier', 'name');

  // Traçabilité : le stock initial apparaît dans l'historique des mouvements.
  if (product.stock > 0) {
    await StockMovement.create({
      product: product._id,
      type: 'entree',
      quantity: product.stock,
      reason: 'Stock initial à la création du produit',
      user: req.user?.id,
    }).catch((error) =>
      console.error('[stock] mouvement initial non enregistré :', error.message)
    );
  }

  res.status(201).json({ success: true, data: serializeProduct(product) });
});

/**
 * PUT /api/products/:id
 */
const update = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw httpError(404, 'Produit introuvable.');

  const previousStock = product.stock;

  const {
    name,
    barcode,
    category,
    supplier,
    price,
    purchasePrice,
    stock,
    lowStockThreshold,
    active,
  } = req.body;

  if (name !== undefined) product.name = String(name).trim();
  if (barcode !== undefined) product.barcode = String(barcode).trim();
  if (category !== undefined) product.category = await resolveReference(Category, category);
  if (supplier !== undefined) product.supplier = await resolveReference(Supplier, supplier);
  if (price !== undefined) product.price = Number(price);
  if (purchasePrice !== undefined) product.purchasePrice = Number(purchasePrice);
  if (stock !== undefined) product.stock = Number(stock);
  if (lowStockThreshold !== undefined) product.lowStockThreshold = Number(lowStockThreshold);
  if (active !== undefined) product.active = Boolean(active);

  await product.save();
  await product.populate('category', 'name');
  await product.populate('supplier', 'name');

  // Si le stock a été corrigé depuis la fiche produit, on trace l'ajustement.
  if (product.stock !== previousStock) {
    const difference = product.stock - previousStock;
    await StockMovement.create({
      product: product._id,
      type: difference > 0 ? 'entree' : 'sortie',
      quantity: Math.abs(difference),
      reason: 'Correction du stock depuis la fiche produit',
      user: req.user?.id,
    }).catch((error) =>
      console.error('[stock] ajustement non enregistré :', error.message)
    );
  }

  res.json({ success: true, data: serializeProduct(product) });
});

/**
 * DELETE /api/products/:id
 * Suppression logique pour conserver l'historique des ventes.
 */
const remove = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { active: false },
    { new: true }
  );
  if (!product) throw httpError(404, 'Produit introuvable.');

  res.json({ success: true, message: 'Produit retiré du catalogue.' });
});

module.exports = {
  list,
  getById,
  getByBarcode,
  listLowStock,
  create,
  update,
  remove,
};
