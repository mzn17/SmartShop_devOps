const mongoose = require('mongoose');
const { toJSON } = require('./options');

const saleLineSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const saleReturnSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    reason: { type: String, trim: true, default: '' },
    date: { type: Date, default: Date.now },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    invoice: { type: String, required: true, unique: true },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    items: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    // Montant cumulé des retours (le total d'origine reste archivé).
    refundedTotal: { type: Number, default: 0, min: 0 },
    payment: { type: String, enum: ['especes', 'carte'], required: true },
    status: {
      type: String,
      enum: ['validee', 'partielle', 'retournee'],
      default: 'validee',
    },
    lines: { type: [saleLineSchema], default: [] },
    returns: { type: [saleReturnSchema], default: [] },
  },
  { timestamps: true }
);

saleSchema.set('toJSON', toJSON);

saleSchema.index({ date: -1 });
saleSchema.index({ cashier: 1, date: -1 });

module.exports = mongoose.model('Sale', saleSchema);
