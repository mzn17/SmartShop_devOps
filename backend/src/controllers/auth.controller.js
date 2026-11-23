// src/controllers/auth.controller.js
// Handles login, profile (me) and logout for the API.

const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

/**
 * @desc    Login user & return JWT
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw httpError(400, 'Email et mot de passe requis.');
  }

  // Need passwordHash (select: false in schema)
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
  if (!user) {
    throw httpError(401, 'Identifiants invalides.');
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw httpError(401, 'Identifiants invalides.');
  }

  if (!user.active) {
    throw httpError(403, 'Ce compte est désactivé. Contactez un administrateur.');
  }

  const token = generateToken(user);
  const publicUser = user.toJSON();
  res.json({ success: true, token, user: publicUser });
});

/**
 * @desc    Return current logged‑in user info
 * @route   GET /api/auth/me
 * @access  Private
 */
const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw httpError(404, 'Utilisateur non trouvé.');
  }
  res.json({ success: true, user: user.toJSON() });
});

/**
 * @desc    Logout (client just discards token)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (_req, res) => {
  res.json({ success: true, message: 'Déconnexion réussie.' });
});

module.exports = { login, me, logout };
