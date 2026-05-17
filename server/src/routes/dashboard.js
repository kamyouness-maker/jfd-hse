const express = require('express');
const db = require('../db/schema');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard
router.get('/', authenticate, (req, res) => {
  const { role, id: userId } = req.user;

  // Base filter for user scope
  let tourFilter = '';
  let tourParams = [];
  if (role === 'animateur_hse') {
    tourFilter = 'AND t.user_id = ?';
    tourParams = [userId];
  }

  // All checklist items in scope
  const allItems = db.prepare(`
    SELECT ci.*, t.user_id, t.date, u.role as author_role
    FROM checklist_items ci
    JOIN tours t ON ci.tour_id = t.id
    JOIN users u ON t.user_id = u.id
    WHERE t.deleted = 0 ${tourFilter}
  `).all(...tourParams);

  // Global conformity rate
  const evaluated = allItems.filter(i => i.statut && i.statut !== 'na');
  const conforme = evaluated.filter(i => i.statut === 'conforme');
  const taux_conformite_global = evaluated.length > 0
    ? Math.round((conforme.length / evaluated.length) * 100)
    : 0;

  // Open non-conformities
  const today = new Date().toISOString().split('T')[0];
  const nonConformes = allItems.filter(i => i.statut === 'non_conforme');
  const ecarts_ouverts = nonConformes.filter(i => !i.action_deadline || i.action_deadline >= today).length;

  // Overdue action plans
  const plans_action_retard = nonConformes.filter(i => i.action_deadline && i.action_deadline < today).length;

  // Conformity per section
  const sectionMap = {};
  for (const item of allItems) {
    if (!item.statut || item.statut === 'na') continue;
    if (!sectionMap[item.section]) {
      sectionMap[item.section] = { conforme: 0, total: 0 };
    }
    sectionMap[item.section].total++;
    if (item.statut === 'conforme') sectionMap[item.section].conforme++;
  }
  const conformite_par_section = Object.entries(sectionMap).map(([section, data]) => ({
    section,
    taux: Math.round((data.conforme / data.total) * 100)
  }));

  // Evolution over last 30 days
  const evolution = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const dayItems = allItems.filter(item => item.date && item.date.startsWith(dateStr));
    const dayEvaluated = dayItems.filter(i => i.statut && i.statut !== 'na');
    const dayConforme = dayEvaluated.filter(i => i.statut === 'conforme');
    evolution.push({
      date: dateStr,
      taux: dayEvaluated.length > 0 ? Math.round((dayConforme.length / dayEvaluated.length) * 100) : null
    });
  }

  let passeport_hse = null;
  if (['admin', 'responsable_hse'].includes(role)) {
    // Find companies/users with recurring non-conformities (3+ non_conforme items)
    const recurring = db.prepare(`
      SELECT u.company, u.full_name, u.username, COUNT(ci.id) as nc_count
      FROM checklist_items ci
      JOIN tours t ON ci.tour_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE ci.statut = 'non_conforme' AND t.deleted = 0
      GROUP BY t.user_id
      HAVING nc_count >= 3
      ORDER BY nc_count DESC
    `).all();
    passeport_hse = recurring;
  }

  res.json({
    success: true,
    data: {
      taux_conformite_global,
      ecarts_ouverts,
      plans_action_retard,
      conformite_par_section,
      evolution,
      passeport_hse
    }
  });
});

module.exports = router;
