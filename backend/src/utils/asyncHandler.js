/**
 * Enveloppe un controller async pour transmettre les erreurs à Express.
 * Évite les blocs try/catch répétés dans chaque controller.
 */
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

module.exports = asyncHandler;
