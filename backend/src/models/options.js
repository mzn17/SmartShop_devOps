/**
 * Options communes de sérialisation Mongoose.
 * - `id` (string) est exposé à la place de `_id`
 * - `__v` et les champs sensibles ne sortent jamais de l'API
 */
const toJSON = {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.passwordHash;
    return ret;
  },
};

module.exports = { toJSON };
