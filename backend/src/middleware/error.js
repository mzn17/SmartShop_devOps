const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route introuvable : ${req.method} ${req.originalUrl}`,
  });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (error, req, res, next) => {
  let status = error.status || 500;
  let message = error.message || 'Erreur interne du serveur.';

  if (error.name === 'ValidationError') {
    status = 400;
    message = Object.values(error.errors)
      .map((item) => item.message)
      .join(' ');
  }

  if (error.name === 'CastError') {
    status = 400;
    message = `Identifiant invalide : ${error.value}`;
  }

  if (error.code === 11000) {
    status = 409;
    const field = Object.keys(error.keyValue || {})[0] || 'valeur';
    message = `Cette ${field} est déjà utilisée.`;
  }

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({ success: false, message });
};

module.exports = { notFound, errorHandler };
