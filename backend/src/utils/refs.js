const mongoose = require('mongoose');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Retourne l'_id d'un document référencé à partir d'un id ou d'un nom.
 * Si un nom est fourni et qu'il n'existe pas encore, il est créé.
 *
 * Utilisé pour les catégories et les fournisseurs afin de garder des
 * références cohérentes dans MongoDB.
 */
async function resolveReference(Model, value) {
  if (!value) return null;

  if (mongoose.isValidObjectId(value)) {
    const byId = await Model.findById(value);
    if (byId) return byId._id;
  }

  const name = String(value).trim();
  if (!name) return null;

  const doc = await Model.findOneAndUpdate(
    { name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } },
    { $setOnInsert: { name } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return doc._id;
}

/**
 * Retourne l'_id d'un document existant sans jamais en créer un nouveau.
 * Retourne null si la valeur est absente ou introuvable.
 */
async function findReferenceId(Model, value) {
  if (!value) return null;

  if (mongoose.isValidObjectId(value)) {
    const byId = await Model.findById(value);
    return byId ? byId._id : null;
  }

  const name = String(value).trim();
  if (!name) return null;

  const doc = await Model.findOne({
    name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
  });

  return doc ? doc._id : null;
}

module.exports = { resolveReference, findReferenceId };
