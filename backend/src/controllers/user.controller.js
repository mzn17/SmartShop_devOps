const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

const publicUser = (user) => user.toJSON();

/**
 * GET /api/users
 */
const list = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, data: users.map(publicUser) });
});

/**
 * POST /api/users
 */
const create = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'caissier', active = true } = req.body;

  if (!name?.trim() || !email?.trim() || !password) {
    throw httpError(400, 'Nom, email et mot de passe obligatoires.');
  }

  if (String(password).length < 6) {
    throw httpError(400, 'Le mot de passe doit contenir au moins 6 caractères.');
  }

  const existing = await User.findOne({ email: String(email).trim().toLowerCase() });
  if (existing) throw httpError(409, 'Cet email est déjà associé à un compte.');

  const user = await User.create({
    name: name.trim(),
    email: String(email).trim().toLowerCase(),
    passwordHash: password,
    role,
    active: Boolean(active),
  });

  res.status(201).json({ success: true, data: publicUser(user) });
});

/**
 * PUT /api/users/:id
 */
const update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+passwordHash');
  if (!user) throw httpError(404, 'Compte utilisateur introuvable.');

  const { name, email, password, role, active } = req.body;

  if (name !== undefined) user.name = String(name).trim();
  if (email !== undefined) user.email = String(email).trim().toLowerCase();
  if (role !== undefined) user.role = role;
  if (active !== undefined) user.active = Boolean(active);
  if (password) {
    if (String(password).length < 6) {
      throw httpError(400, 'Le mot de passe doit contenir au moins 6 caractères.');
    }
    user.passwordHash = password;
  }

  await user.save();
  res.json({ success: true, data: publicUser(user) });
});

/**
 * DELETE /api/users/:id
 */
const remove = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    throw httpError(400, 'Vous ne pouvez pas supprimer votre propre compte.');
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw httpError(404, 'Compte utilisateur introuvable.');

  res.json({ success: true, message: 'Compte utilisateur supprimé.' });
});

module.exports = { list, create, update, remove };
