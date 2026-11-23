/**
 * Crée une erreur HTTP avec un code de statut exploité par le middleware d'erreurs.
 */
const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

module.exports = httpError;
