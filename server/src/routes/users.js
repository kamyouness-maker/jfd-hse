const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/schema');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/users — admin only
router.get('/', authenticate, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, full_name, role, company, is_active, created_at FROM users ORDER BY id').all();
  res.json({ success: true, data: users });
});

// POST /api/users — admin only
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { username, password, full_name, role, company } = req.body;
  if (!username || !password || !full_name || !role) {
    return res.status(400).json({ success: false, error: 'Champs requis manquants' });
  }
  const validRoles = ['admin', 'responsable_hse', 'animateur_hse'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, error: 'Rôle invalide' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ success: false, error: 'Nom d\'utilisateur déjà utilisé' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, role, company)
    VALUES (?, ?, ?, ?, ?)
  `).run(username, hash, full_name, role, company || null);
  const user = db.prepare('SELECT id, username, full_name, role, company, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: user });
});

// PUT /api/users/:id — admin only
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { full_name, role, company, is_active, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
  }
  const updates = [];
  const values = [];
  if (full_name !== undefined) { updates.push('full_name = ?'); values.push(full_name); }
  if (role !== undefined) { updates.push('role = ?'); values.push(role); }
  if (company !== undefined) { updates.push('company = ?'); values.push(company); }
  if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
  if (password) { updates.push('password_hash = ?'); values.push(bcrypt.hashSync(password, 10)); }
  if (updates.length === 0) {
    return res.status(400).json({ success: false, error: 'Aucune modification' });
  }
  updates.push('updated_at = ?'); values.push(new Date().toISOString());
  values.push(id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const updated = db.prepare('SELECT id, username, full_name, role, company, is_active, created_at FROM users WHERE id = ?').get(id);
  res.json({ success: true, data: updated });
});

// DELETE /api/users/:id — admin only
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ success: false, error: 'Impossible de supprimer son propre compte' });
  }
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
  }
  res.json({ success: true, data: { deleted: true } });
});

module.exports = router;
