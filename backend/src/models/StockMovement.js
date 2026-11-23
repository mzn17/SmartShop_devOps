const mongoose = require('mongoose');
const { toJSON } = require('./options');

const stockMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    type: { type: String, enum: ['entree', 'sortie', 'ajustement'], required: true },
    quantity: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true, default: '' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

stockMovementSchema.set('toJSON', toJSON);

stockMovementSchema.index({ date: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
