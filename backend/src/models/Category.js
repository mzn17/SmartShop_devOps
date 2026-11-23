const mongoose = require('mongoose');
const { toJSON } = require('./options');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

categorySchema.set('toJSON', toJSON);

module.exports = mongoose.model('Category', categorySchema);
