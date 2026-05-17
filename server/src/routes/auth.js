const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/schema');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Identifiants requis' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Identifiants incorrects' });
  }
  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ success: false, error: 'Identifiants incorrects' });
  }
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        company: user.company
      }
    }
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const { password_hash, ...user } = req.user;
  res.json({ success: true, data: user });
});

module.exports = router;
