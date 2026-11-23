const mongoose = require('mongoose');
const { toJSON } = require('./options');

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    contactName: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

supplierSchema.set('toJSON', toJSON);

module.exports = mongoose.model('Supplier', supplierSchema);
