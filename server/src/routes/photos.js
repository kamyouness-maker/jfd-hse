const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/schema');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const uploadsDir = path.join(__dirname, '../../uploads');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont autorisées'));
  }
});

// POST /api/photos/:checklistItemId
router.post('/:checklistItemId', authenticate, upload.single('photo'), async (req, res) => {
  try {
    const item = db.prepare('SELECT ci.*, t.user_id FROM checklist_items ci JOIN tours t ON ci.tour_id = t.id WHERE ci.id = ?').get(req.params.checklistItemId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Élément de checklist introuvable' });
    }
    if (req.user.role === 'animateur_hse' && item.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Fichier image requis' });
    }

    const photoId = uuidv4();
    const filename = `${photoId}.jpg`;
    const outputPath = path.join(uploadsDir, filename);

    await sharp(req.file.buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    db.prepare('INSERT INTO photos (id, checklist_item_id, filename, mime_type) VALUES (?, ?, ?, ?)').run(photoId, req.params.checklistItemId, filename, 'image/jpeg');

    const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(photoId);
    res.status(201).json({ success: true, data: photo });
  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ success: false, error: 'Erreur lors de l\'upload' });
  }
});

// DELETE /api/photos/:id
router.delete('/:id', authenticate, (req, res) => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
  if (!photo) {
    return res.status(404).json({ success: false, error: 'Photo introuvable' });
  }
  const filePath = path.join(uploadsDir, photo.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
  res.json({ success: true, data: { deleted: true } });
});

// GET /api/photos/:id
router.get('/:id', authenticate, (req, res) => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
  if (!photo) {
    return res.status(404).json({ success: false, error: 'Photo introuvable' });
  }
  const filePath = path.join(uploadsDir, photo.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Fichier introuvable' });
  }
  res.setHeader('Content-Type', photo.mime_type || 'image/jpeg');
  res.sendFile(filePath);
});

module.exports = router;
