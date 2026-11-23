const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Vérifie le token JWT envoyé dans l'en-tête Authorization: Bearer <token>.
 *
 * Le rôle et l'état du compte sont relus en base à chaque requête :
 * - un compte supprimé ou désactivé perd immédiatement l'accès ;
 * - un changement de rôle est pris en compte sans attendre l'expiration du token.
 *
 * Ajoute l'utilisateur courant dans req.user = { id, role, name, email }.
 */
// Vérifie le token JWT envoyé dans l'en-tête Authorization ou d'autres sources.
// Le middleware n'exige plus le préfixe "Bearer" – il accepte aussi un token brut dans l'en-tête,
// le paramètre de requête "token" ou le header "x-access-token".
const protect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  let token = null;
  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (header) {
    token = header; // token without Bearer
  } else if (req.headers['x-access-token']) {
    token = req.headers['x-access-token'];
  } else if (req.query.token) {
    token = req.query.token;
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Accès refusé : token manquant.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('name email role active');
    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        message: 'Session invalide : compte introuvable ou désactivé.',
      });
    }
    req.user = { id: user.id, role: user.role, name: user.name, email: user.email };
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Session expirée ou token invalide.' });
  }
};

module.exports = { protect };
