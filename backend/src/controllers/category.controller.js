const Category = require('../models/Category');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

/**
 * GET /api/categories
 */
const list = asyncHandler(async (_req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json({ success: true, data: categories });
});

/**
 * POST /api/categories
 */
const create = asyncHandler(async (req, res) => {
  const { name, description = '' } = req.body;
  if (!name?.trim()) throw httpError(400, 'Le nom de la catégorie est obligatoire.');

  const existing = await Category.findOne({ name: name.trim() });
  if (existing) throw httpError(409, 'Cette catégorie existe déjà.');

  const category = await Category.create({ name: name.trim(), description });
  res.status(201).json({ success: true, data: category });
});

/**
 * PUT /api/categories/:id
 */
const update = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (description !== undefined) updates.description = description;

  const category = await Category.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!category) throw httpError(404, 'Catégorie introuvable.');

  res.json({ success: true, data: category });
});

/**
 * DELETE /api/categories/:id
 */
const remove = asyncHandler(async (req, res) => {
  // On vérifie tous les produits, y compris ceux désactivés (suppression logique),
  // pour ne jamais laisser de référence orpheline dans MongoDB.
  const used = await Product.countDocuments({ category: req.params.id });
  if (used > 0) {
    throw httpError(409, 'Impossible de supprimer une catégorie utilisée par des produits.');
  }

  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw httpError(404, 'Catégorie introuvable.');

  res.json({ success: true, message: 'Catégorie supprimée.' });
});

module.exports = { list, create, update, remove };
