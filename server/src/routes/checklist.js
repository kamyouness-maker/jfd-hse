const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/schema');
const { authenticate } = require('../middleware/auth');
const checklistDefinitions = require('../db/checklistDefinitions.cjs');

const router = express.Router();

// GET /api/tours/:tourId/checklist
router.get('/tours/:tourId/checklist', authenticate, (req, res) => {
  const tour = db.prepare('SELECT * FROM tours WHERE id = ? AND deleted = 0').get(req.params.tourId);
  if (!tour) {
    return res.status(404).json({ success: false, error: 'Tournée introuvable' });
  }
  if (req.user.role === 'animateur_hse' && tour.user_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Accès refusé' });
  }
  const items = db.prepare('SELECT * FROM checklist_items WHERE tour_id = ? ORDER BY checklist_type, section, item_key').all(req.params.tourId);
  // Attach photos
  const itemsWithPhotos = items.map(item => {
    const photos = db.prepare('SELECT * FROM photos WHERE checklist_item_id = ?').all(item.id);
    return { ...item, photos };
  });
  res.json({ success: true, data: itemsWithPhotos });
});

// POST /api/tours/:tourId/checklist/init
router.post('/tours/:tourId/checklist/init', authenticate, (req, res) => {
  const { checklist_type } = req.body;
  if (!checklist_type || !['standards_hse', 'equipements'].includes(checklist_type)) {
    return res.status(400).json({ success: false, error: 'Type de checklist invalide' });
  }
  const tour = db.prepare('SELECT * FROM tours WHERE id = ? AND deleted = 0').get(req.params.tourId);
  if (!tour) {
    return res.status(404).json({ success: false, error: 'Tournée introuvable' });
  }
  const definition = checklistDefinitions[checklist_type];
  if (!definition) {
    return res.status(400).json({ success: false, error: 'Définition introuvable' });
  }

  // Check if already initialized for this type
  const existing = db.prepare('SELECT id FROM checklist_items WHERE tour_id = ? AND checklist_type = ?').get(req.params.tourId, checklist_type);
  if (existing) {
    const items = db.prepare('SELECT * FROM checklist_items WHERE tour_id = ? AND checklist_type = ?').all(req.params.tourId, checklist_type);
    return res.json({ success: true, data: items, message: 'Déjà initialisé' });
  }

  const insertStmt = db.prepare(`
    INSERT INTO checklist_items
      (id, tour_id, checklist_type, section, item_key, item_label, criticite, poids, sous_section, numero)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction(() => {
    const created = [];
    for (const [sectionKey, section] of Object.entries(definition.sections)) {
      for (const itemDef of section.items) {
        const id = uuidv4();
        insertStmt.run(
          id, req.params.tourId, checklist_type, sectionKey,
          itemDef.key, itemDef.label,
          itemDef.criticite || null, itemDef.poids || null,
          itemDef.sous_section || null, itemDef.numero || null
        );
        created.push({
          id, tour_id: req.params.tourId, checklist_type, section: sectionKey,
          item_key: itemDef.key, item_label: itemDef.label,
          criticite: itemDef.criticite || null, poids: itemDef.poids || null,
          sous_section: itemDef.sous_section || null, numero: itemDef.numero || null,
        });
      }
    }
    return created;
  });

  const created = insertMany();
  res.status(201).json({ success: true, data: created });
});

// PUT /api/checklist/:id
router.put('/checklist/:id', authenticate, (req, res) => {
  const item = db.prepare('SELECT ci.*, t.user_id FROM checklist_items ci JOIN tours t ON ci.tour_id = t.id WHERE ci.id = ?').get(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, error: 'Élément introuvable' });
  }
  // animateur_hse can only update own items
  if (req.user.role === 'animateur_hse' && item.user_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Accès refusé' });
  }
  const { statut, observation, action_plan, action_deadline, action_responsible, corrige_sur_place } = req.body;
  db.prepare(`
    UPDATE checklist_items
    SET statut=?, observation=?, action_plan=?, action_deadline=?, action_responsible=?, corrige_sur_place=?, updated_at=?
    WHERE id=?
  `).run(
    statut !== undefined ? statut : item.statut,
    observation !== undefined ? observation : item.observation,
    action_plan !== undefined ? action_plan : item.action_plan,
    action_deadline !== undefined ? action_deadline : item.action_deadline,
    action_responsible !== undefined ? action_responsible : item.action_responsible,
    corrige_sur_place !== undefined ? (corrige_sur_place ? 1 : 0) : item.corrige_sur_place,
    new Date().toISOString(),
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

// DELETE /api/checklist/:id — admin or responsable_hse only
router.delete('/checklist/:id', authenticate, (req, res) => {
  if (!['admin', 'responsable_hse'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Accès refusé' });
  }
  const item = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, error: 'Élément introuvable' });
  }
  // Delete associated photos
  const photos = db.prepare('SELECT * FROM photos WHERE checklist_item_id = ?').all(req.params.id);
  const fs = require('fs');
  const path = require('path');
  for (const photo of photos) {
    const filePath = path.join(__dirname, '../../uploads', photo.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.prepare('DELETE FROM photos WHERE checklist_item_id = ?').run(req.params.id);
  db.prepare('DELETE FROM checklist_items WHERE id = ?').run(req.params.id);
  res.json({ success: true, data: { deleted: true } });
});

module.exports = router;
