const mongoose = require('mongoose');
const { toJSON } = require('./options');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    barcode: { type: String, required: true, unique: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
    price: { type: Number, required: true, min: 0, default: 0 },
    purchasePrice: { type: Number, min: 0, default: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, min: 0, default: 8 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.set('toJSON', toJSON);

productSchema.index({ name: 'text', barcode: 'text' });

module.exports = mongoose.model('Product', productSchema);
