const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

const serializeMovement = (movement) => {
  const data = movement.toJSON();
  return {
    ...data,
    product: movement.product?.name || null,
    productId: movement.product?.id || null,
    user: movement.user?.name || null,
    userId: movement.user?.id || null,
  };
};

/**
 * GET /api/stock/movements
 */
const listMovements = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.product) filter.product = req.query.product;
  if (req.query.type) filter.type = req.query.type;

  const movements = await StockMovement.find(filter)
    .populate('product', 'name barcode')
    .populate('user', 'name')
    .sort({ date: -1 })
    .limit(Math.min(Number(req.query.limit) || 500, 1000));

  res.json({ success: true, data: movements.map(serializeMovement) });
});

/**
 * POST /api/stock/movements
 * Body : { productId, type: 'entree'|'sortie'|'ajustement', quantity, reason }
 */
const createMovement = asyncHandler(async (req, res) => {
  const { productId, type, quantity, reason = '' } = req.body;
  const amount = Number(quantity);

  if (!productId || !['entree', 'sortie', 'ajustement'].includes(type)) {
    throw httpError(400, 'Produit et type de mouvement obligatoires.');
  }

  if (!Number.isInteger(amount) || amount < 0) {
    throw httpError(400, 'La quantité doit être un entier positif.');
  }

  const product = await Product.findById(productId);
  if (!product) throw httpError(404, 'Produit introuvable.');

  if (type === 'entree') {
    product.stock += amount;
  } else if (type === 'sortie') {
    if (product.stock < amount) {
      throw httpError(409, `Stock insuffisant (${product.stock} disponible(s)).`);
    }
    product.stock -= amount;
  } else {
    product.stock = amount;
  }

  await product.save();

  const movement = await StockMovement.create({
    product: product._id,
    type,
    quantity: amount,
    reason,
    user: req.user.id,
  });

  await movement.populate('product', 'name barcode');
  await movement.populate('user', 'name');

  res.status(201).json({ success: true, data: serializeMovement(movement) });
});

module.exports = { listMovements, createMovement };
