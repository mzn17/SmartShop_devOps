const mongoose = require('mongoose');
const { toJSON } = require('./options');

const counterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

counterSchema.set('toJSON', toJSON);

module.exports = mongoose.model('Counter', counterSchema);
