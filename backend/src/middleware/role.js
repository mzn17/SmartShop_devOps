/**
 * Restreint une route à certains rôles.
 * Exemple : router.post('/', protect, authorize('admin'), controller.create)
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Vous n'avez pas les droits nécessaires pour effectuer cette action.",
    });
  }
  return next();
};

module.exports = { authorize };
