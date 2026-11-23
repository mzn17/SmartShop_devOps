// src/controllers/alert.controller.js
// Génère les commandes de réapprovisionnement à partir des alertes de stock.

const asyncHandler = require('../utils/asyncHandler');
const { createLowStockOrders } = require('./order.controller');

/**
 * @desc    Crée les bons de commande correspondant aux produits sous le seuil
 * @route   POST /api/alerts/generate
 * @access  Admin
 */
const generateFromAlerts = asyncHandler(async (req, res) => {
  const created = await createLowStockOrders({ threshold: req.query.threshold });

  if (!created.length) {
    return res.json({
      success: true,
      message: 'Aucun produit sous le seuil ou commande déjà générée aujourd’hui.',
      data: [],
    });
  }

  return res.status(201).json({
    success: true,
    message: `${created.length} commande(s) générée(s) depuis les alertes de stock.`,
    data: created,
  });
});

module.exports = { generateFromAlerts };
