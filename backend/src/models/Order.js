const mongoose = require('mongoose');
const { toJSON } = require('./options');

const orderLineSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    date: { type: Date, default: Date.now },
    items: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['en_attente', 'validee', 'refusee', 'recue'],
      default: 'en_attente',
    },
    source: { type: String, enum: ['manuelle', 'automatique'], default: 'manuelle' },
    stockApplied: { type: Boolean, default: false },
    lines: { type: [orderLineSchema], default: [] },
  },
  { timestamps: true }
);

orderSchema.set('toJSON', toJSON);

orderSchema.index({ date: -1 });

module.exports = mongoose.model('Order', orderSchema);
