const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

/**
 * GET /api/suppliers
 */
const list = asyncHandler(async (_req, res) => {
  const suppliers = await Supplier.find().sort({ name: 1 });
  res.json({ success: true, data: suppliers });
});

/**
 * POST /api/suppliers
 */
const create = asyncHandler(async (req, res) => {
  const { name, contactName = '', email = '', phone = '', address = '' } = req.body;
  if (!name?.trim()) throw httpError(400, 'Le nom du fournisseur est obligatoire.');

  const existing = await Supplier.findOne({ name: name.trim() });
  if (existing) throw httpError(409, 'Ce fournisseur existe déjà.');

  const supplier = await Supplier.create({
    name: name.trim(),
    contactName,
    email,
    phone,
    address,
  });

  res.status(201).json({ success: true, data: supplier });
});

/**
 * PUT /api/suppliers/:id
 */
const update = asyncHandler(async (req, res) => {
  const { name, contactName, email, phone, address, active } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (contactName !== undefined) updates.contactName = contactName;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (address !== undefined) updates.address = address;
  if (active !== undefined) updates.active = Boolean(active);

  const supplier = await Supplier.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!supplier) throw httpError(404, 'Fournisseur introuvable.');

  res.json({ success: true, data: supplier });
});

/**
 * DELETE /api/suppliers/:id
 */
const remove = asyncHandler(async (req, res) => {
  // On vérifie tous les produits, y compris ceux désactivés (suppression logique),
  // pour ne jamais laisser de référence orpheline dans MongoDB.
  const used = await Product.countDocuments({ supplier: req.params.id });
  if (used > 0) {
    throw httpError(409, 'Impossible de supprimer un fournisseur utilisé par des produits.');
  }

  const supplier = await Supplier.findByIdAndDelete(req.params.id);
  if (!supplier) throw httpError(404, 'Fournisseur introuvable.');

  res.json({ success: true, message: 'Fournisseur supprimé.' });
});

module.exports = { list, create, update, remove };
