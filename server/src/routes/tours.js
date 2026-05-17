const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/schema');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/tours
router.get('/', authenticate, (req, res) => {
  let tours;
  if (['admin', 'responsable_hse'].includes(req.user.role)) {
    tours = db.prepare(`
      SELECT t.*, u.full_name as user_full_name, u.username, u.role as user_role
      FROM tours t
      JOIN users u ON t.user_id = u.id
      WHERE t.deleted = 0
      ORDER BY t.date DESC, t.created_at DESC
    `).all();
  } else {
    tours = db.prepare(`
      SELECT t.*, u.full_name as user_full_name, u.username, u.role as user_role
      FROM tours t
      JOIN users u ON t.user_id = u.id
      WHERE t.user_id = ? AND t.deleted = 0
      ORDER BY t.date DESC, t.created_at DESC
    `).all(req.user.id);
  }
  res.json({ success: true, data: tours });
});

// POST /api/tours
router.post('/', authenticate, (req, res) => {
  const { title, location, date, status, notes, id } = req.body;
  if (!date) {
    return res.status(400).json({ success: false, error: 'Date requise' });
  }
  const tourId = id || uuidv4();
  db.prepare(`
    INSERT INTO tours (id, user_id, title, location, date, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(tourId, req.user.id, title || null, location || null, date, status || 'en_cours', notes || null);
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(tourId);
  res.status(201).json({ success: true, data: tour });
});

// GET /api/tours/:id
router.get('/:id', authenticate, (req, res) => {
  const tour = db.prepare(`
    SELECT t.*, u.full_name as user_full_name, u.username, u.role as user_role
    FROM tours t
    JOIN users u ON t.user_id = u.id
    WHERE t.id = ? AND t.deleted = 0
  `).get(req.params.id);
  if (!tour) {
    return res.status(404).json({ success: false, error: 'Tournée introuvable' });
  }
  if (req.user.role === 'animateur_hse' && tour.user_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Accès refusé' });
  }
  res.json({ success: true, data: tour });
});

// PUT /api/tours/:id
router.put('/:id', authenticate, (req, res) => {
  const tour = db.prepare('SELECT * FROM tours WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!tour) {
    return res.status(404).json({ success: false, error: 'Tournée introuvable' });
  }
  if (req.user.role === 'animateur_hse' && tour.user_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Accès refusé' });
  }
  const { title, location, date, status, notes } = req.body;
  db.prepare(`
    UPDATE tours SET title=?, location=?, date=?, status=?, notes=?, updated_at=?
    WHERE id=?
  `).run(
    title !== undefined ? title : tour.title,
    location !== undefined ? location : tour.location,
    date !== undefined ? date : tour.date,
    status !== undefined ? status : tour.status,
    notes !== undefined ? notes : tour.notes,
    new Date().toISOString(),
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

// DELETE /api/tours/:id
router.delete('/:id', authenticate, (req, res) => {
  const tour = db.prepare('SELECT * FROM tours WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!tour) {
    return res.status(404).json({ success: false, error: 'Tournée introuvable' });
  }
  // admin can delete all; responsable_hse can only delete own; animateur cannot delete
  if (req.user.role === 'animateur_hse') {
    return res.status(403).json({ success: false, error: 'Accès refusé' });
  }
  if (req.user.role === 'responsable_hse' && tour.user_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Vous ne pouvez supprimer que vos propres tournées' });
  }
  db.prepare('UPDATE tours SET deleted=1, updated_at=? WHERE id=?').run(new Date().toISOString(), req.params.id);
  res.json({ success: true, data: { deleted: true } });
});

module.exports = router;
