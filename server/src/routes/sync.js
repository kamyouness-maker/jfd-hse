const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/schema');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/sync/timestamp
router.get('/timestamp', authenticate, (req, res) => {
  res.json({ success: true, data: { timestamp: new Date().toISOString() } });
});

// POST /api/sync — receives array of pending changes, applies with last-write-wins
router.post('/', authenticate, (req, res) => {
  const { tours = [], checklistItems = [], photos = [] } = req.body;
  const results = { tours: [], checklistItems: [], photos: [], errors: [] };

  // Process tours
  for (const tour of tours) {
    try {
      if (!tour.id || !tour.date) continue;
      const existing = db.prepare('SELECT * FROM tours WHERE id = ?').get(tour.id);
      if (!existing) {
        db.prepare(`
          INSERT INTO tours (id, user_id, title, location, date, status, notes, created_at, updated_at, deleted)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          tour.id,
          req.user.id,
          tour.title || null,
          tour.location || null,
          tour.date,
          tour.status || 'en_cours',
          tour.notes || null,
          tour.created_at || new Date().toISOString(),
          tour.updated_at || new Date().toISOString(),
          tour.deleted ? 1 : 0
        );
      } else {
        // Last-write-wins by updatedAt
        const existingDate = new Date(existing.updated_at || 0);
        const incomingDate = new Date(tour.updated_at || 0);
        if (incomingDate >= existingDate) {
          db.prepare(`
            UPDATE tours SET title=?, location=?, date=?, status=?, notes=?, updated_at=?, deleted=?
            WHERE id=?
          `).run(
            tour.title || null,
            tour.location || null,
            tour.date,
            tour.status || 'en_cours',
            tour.notes || null,
            tour.updated_at || new Date().toISOString(),
            tour.deleted ? 1 : 0,
            tour.id
          );
        }
      }
      const updated = db.prepare('SELECT * FROM tours WHERE id = ?').get(tour.id);
      if (updated) results.tours.push(updated);
    } catch (err) {
      results.errors.push({ type: 'tour', id: tour.id, error: err.message });
    }
  }

  // Process checklist items
  for (const item of checklistItems) {
    try {
      if (!item.id || !item.tour_id) continue;
      const existing = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(item.id);
      if (!existing) {
        // Verify tour exists
        const tour = db.prepare('SELECT id FROM tours WHERE id = ?').get(item.tour_id);
        if (!tour) continue;
        db.prepare(`
          INSERT INTO checklist_items (id, tour_id, checklist_type, section, item_key, item_label, statut, observation, action_plan, action_deadline, action_responsible, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          item.id,
          item.tour_id,
          item.checklist_type,
          item.section,
          item.item_key,
          item.item_label,
          item.statut || null,
          item.observation || null,
          item.action_plan || null,
          item.action_deadline || null,
          item.action_responsible || null,
          item.created_at || new Date().toISOString(),
          item.updated_at || new Date().toISOString()
        );
      } else {
        const existingDate = new Date(existing.updated_at || 0);
        const incomingDate = new Date(item.updated_at || 0);
        if (incomingDate >= existingDate) {
          db.prepare(`
            UPDATE checklist_items SET statut=?, observation=?, action_plan=?, action_deadline=?, action_responsible=?, updated_at=?
            WHERE id=?
          `).run(
            item.statut !== undefined ? item.statut : existing.statut,
            item.observation !== undefined ? item.observation : existing.observation,
            item.action_plan !== undefined ? item.action_plan : existing.action_plan,
            item.action_deadline !== undefined ? item.action_deadline : existing.action_deadline,
            item.action_responsible !== undefined ? item.action_responsible : existing.action_responsible,
            item.updated_at || new Date().toISOString(),
            item.id
          );
        }
      }
      const updated = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(item.id);
      if (updated) results.checklistItems.push(updated);
    } catch (err) {
      results.errors.push({ type: 'checklistItem', id: item.id, error: err.message });
    }
  }

  // Process photos (base64)
  for (const photo of photos) {
    try {
      if (!photo.id || !photo.checklist_item_id || !photo.data) continue;
      const existing = db.prepare('SELECT id FROM photos WHERE id = ?').get(photo.id);
      if (!existing) {
        const path = require('path');
        const fs = require('fs');
        const sharp = require('sharp');
        const uploadsDir = path.join(__dirname, '../../uploads');

        const base64Data = photo.data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${photo.id}.jpg`;
        const outputPath = path.join(uploadsDir, filename);

        sharp(buffer)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(outputPath)
          .then(() => {
            db.prepare('INSERT INTO photos (id, checklist_item_id, filename, mime_type) VALUES (?, ?, ?, ?)').run(photo.id, photo.checklist_item_id, filename, 'image/jpeg');
          })
          .catch(err => console.error('Sync photo error:', err));

        results.photos.push({ id: photo.id, checklist_item_id: photo.checklist_item_id, filename, mime_type: 'image/jpeg' });
      }
    } catch (err) {
      results.errors.push({ type: 'photo', id: photo.id, error: err.message });
    }
  }

  res.json({ success: true, data: results });
});

module.exports = router;
