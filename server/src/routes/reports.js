const express = require('express');
const path = require('path');
const db = require('../db/schema');
const { authenticate } = require('../middleware/auth');
const { generateTourReport } = require('../utils/pdf');

const router = express.Router();

const uploadsDir = path.join(__dirname, '../../uploads');

// GET /api/reports/tour/:tourId
router.get('/tour/:tourId', authenticate, async (req, res) => {
  try {
    const tour = db.prepare(`
      SELECT t.*, u.full_name as user_full_name, u.username
      FROM tours t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ? AND t.deleted = 0
    `).get(req.params.tourId);

    if (!tour) {
      return res.status(404).json({ success: false, error: 'Tournée introuvable' });
    }

    if (req.user.role === 'animateur_hse' && tour.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    const items = db.prepare('SELECT * FROM checklist_items WHERE tour_id = ? ORDER BY checklist_type, section, item_key').all(req.params.tourId);
    const itemsWithPhotos = items.map(item => {
      const photos = db.prepare('SELECT * FROM photos WHERE checklist_item_id = ?').all(item.id);
      return { ...item, photos };
    });

    const pdfBuffer = await generateTourReport(tour, itemsWithPhotos, uploadsDir);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=rapport-tournee-${req.params.tourId}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ success: false, error: 'Erreur lors de la génération du PDF' });
  }
});

module.exports = router;
