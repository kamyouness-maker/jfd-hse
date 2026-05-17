const jwt = require('jsonwebtoken');
const db = require('../db/schema');

const JWT_SECRET = process.env.JWT_SECRET || 'safecheck-ocp-secret-2024';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token manquant' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(payload.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Utilisateur introuvable ou inactif' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token invalide' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Accès refusé - Admin requis' });
  }
  next();
}

function requireResponsableOrAdmin(req, res, next) {
  if (!['admin', 'responsable_hse'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Accès refusé' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, requireResponsableOrAdmin, JWT_SECRET };
