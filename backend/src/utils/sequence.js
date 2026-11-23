const Counter = require('../models/Counter');

/**
 * Génère un numéro séquentiel atomique (factures, commandes).
 * Exemple de clé : "invoice-2026", "order-2026".
 */
async function nextSequence(key) {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return counter.seq;
}

async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const seq = await nextSequence(`invoice-${year}`);
  return `FAC-${year}-${String(seq).padStart(4, '0')}`;
}

async function nextOrderNumber() {
  const year = new Date().getFullYear();
  const seq = await nextSequence(`order-${year}`);
  return `CMD-${year}-${String(seq).padStart(4, '0')}`;
}

module.exports = { nextSequence, nextInvoiceNumber, nextOrderNumber };
