'use strict';
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  greenDark:  '#1a7a1a',
  greenMid:   '#2d9e2d',
  greenLight: '#e8f5e9',
  redDark:    '#c62828',
  redLight:   '#ffebee',
  orange:     '#e65100',
  yellow:     '#f57f17',
  gray:       '#555555',
  grayLight:  '#f5f5f5',
  border:     '#cccccc',
  black:      '#1a1a1a',
  white:      '#ffffff',
  blue:       '#1565c0',
};

// ─── Section labels ───────────────────────────────────────────────────────────
const SECTION_LABELS = {
  autorisation:   'Autorisation de travail',
  consignation:   'Consignation',
  hauteur:        'Travaux en hauteur',
  espace_confine: 'Espace confiné',
  circulation:    'Circulation',
  mode_operatoire:'Mode opératoire (ADRPT)',
  epi:            'EPI',
  acces:          "Moyens d'accès",
  soudage:        'Équipements de soudage et oxycoupage',
  extinction:     "Moyen d'extinction de feu",
  levage:         'Équipements de levage et manutention',
  pression:       'Équipements sous pression',
  engins:         'Engins de chantier',
  outillage:      'Outillage à main',
};

// ─── Scoring helpers ──────────────────────────────────────────────────────────

/**
 * Standards HSE: weighted conformity by poids.
 * Items with no poids (EPI) fall back to simple count.
 * Returns percentage or null if no evaluated items.
 */
function calcStandardsSection(items) {
  const evaluated = items.filter(i => i.statut === 'conforme' || i.statut === 'non_conforme');
  if (!evaluated.length) return null;

  const withPoids = evaluated.filter(i => i.poids != null);
  if (withPoids.length) {
    const sumTotal    = withPoids.reduce((s, i) => s + Number(i.poids), 0);
    const sumConforme = withPoids.filter(i => i.statut === 'conforme').reduce((s, i) => s + Number(i.poids), 0);
    return sumTotal > 0 ? (sumConforme / sumTotal) * 100 : null;
  }
  // EPI fallback
  const conforme = evaluated.filter(i => i.statut === 'conforme').length;
  return (conforme / evaluated.length) * 100;
}

/**
 * Équipements: simple conformity.
 * "conforme" = no defect found. Returns percentage or null.
 */
function calcEquipementsSection(items) {
  const evaluated = items.filter(i => i.statut === 'conforme' || i.statut === 'non_conforme');
  if (!evaluated.length) return null;
  const ecarts = evaluated.filter(i => i.statut === 'non_conforme').length;
  return ((evaluated.length - ecarts) / evaluated.length) * 100;
}

function calcSection(items, type) {
  return type === 'standards_hse' ? calcStandardsSection(items) : calcEquipementsSection(items);
}

function fmtTaux(val) {
  if (val === null || val === undefined) return '-';
  return `${Math.round(val)} %`;
}

function statusSymbol(statut) {
  if (statut === 'conforme')     return 'Oui';
  if (statut === 'non_conforme') return 'Non';
  if (statut === 'na')           return 'N/A';
  return '-';
}

function statusColor(statut) {
  if (statut === 'conforme')     return C.greenMid;
  if (statut === 'non_conforme') return C.redDark;
  return C.gray;
}

function criticiteColor(c) {
  if (c === 'Critique') return C.redDark;
  if (c === 'Elevée')   return C.orange;
  if (c === 'Moyenne')  return C.yellow;
  return C.gray;
}

function tauxtoBgColor(taux) {
  if (taux === null) return C.grayLight;
  if (taux >= 80) return '#e8f5e9';
  if (taux >= 60) return '#fff8e1';
  return '#ffebee';
}

function tauxToTextColor(taux) {
  if (taux === null) return C.gray;
  if (taux >= 80) return C.greenDark;
  if (taux >= 60) return C.yellow;
  return C.redDark;
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

const PAGE_W = 515; // A4 - margins (40 left + 40 right)
const LEFT   = 40;

function ensureSpace(doc, needed) {
  if (doc.y + needed > doc.page.height - 60) {
    doc.addPage();
    drawHeader(doc, doc._tourInfo);
  }
}

function hline(doc, y, color = C.border, width = 1) {
  doc.save().moveTo(LEFT, y).lineTo(LEFT + PAGE_W, y)
    .strokeColor(color).lineWidth(width).stroke().restore();
}

function drawHeader(doc, tour) {
  const y0 = 28;
  // Logo box
  doc.save().rect(LEFT, y0, 72, 36).fillAndStroke(C.greenDark, C.greenDark).restore();
  doc.fillColor(C.white).fontSize(11).font('Helvetica-Bold')
    .text('OCP', LEFT + 1, y0 + 4, { width: 70, align: 'center' });
  doc.fillColor(C.white).fontSize(8).font('Helvetica')
    .text('JFC 2', LEFT + 1, y0 + 17, { width: 70, align: 'center' });
  doc.fillColor(C.greenDark).fontSize(7).font('Helvetica-Bold')
    .text('SafeCheck', LEFT + 1, y0 + 27, { width: 70, align: 'center' });

  // Title
  doc.fillColor(C.greenDark).fontSize(13).font('Helvetica-Bold')
    .text("Rapport d'Inspection HSE", LEFT + 80, y0, { width: PAGE_W - 80 });

  // Tour info line
  const t = tour || {};
  const infoLine = [
    t.date ? `Date : ${t.date}` : '',
    t.location ? `Lieu : ${t.location}` : '',
    t.user_full_name ? `Responsable : ${t.user_full_name}` : '',
    t.status === 'termine' ? 'Terminée' : 'En cours',
  ].filter(Boolean).join('   |   ');
  doc.fillColor(C.gray).fontSize(8).font('Helvetica')
    .text(infoLine, LEFT + 80, y0 + 18, { width: PAGE_W - 80 });

  // Separator
  doc.moveTo(LEFT, y0 + 42).lineTo(LEFT + PAGE_W, y0 + 42)
    .strokeColor(C.greenDark).lineWidth(1.5).stroke();
  doc.y = y0 + 52;
}

function drawFooter(doc) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    hline(doc, doc.page.height - 36, C.border, 0.5);
    doc.fillColor(C.gray).fontSize(7.5).font('Helvetica')
      .text(`SafeCheck OCP JFC2 — Confidentiel`, LEFT, doc.page.height - 26, { width: PAGE_W / 2 })
      .text(`Page ${i + 1} / ${range.count}  —  Généré le ${new Date().toLocaleDateString('fr-FR')}`,
            LEFT + PAGE_W / 2, doc.page.height - 26, { width: PAGE_W / 2, align: 'right' });
  }
}

// ─── Info table (tour header) ─────────────────────────────────────────────────

function drawTourInfoTable(doc, tour, checklistType) {
  ensureSpace(doc, 60);
  const y0 = doc.y;
  const half = PAGE_W / 2 - 5;
  const rh = 16;

  const rows = [
    ['Entité', 'JFD', 'Type de check-list', checklistType === 'standards_hse' ? 'Standards HSE et LSR' : 'Équipements, engins et outillage'],
    ['Responsable', tour.user_full_name || '-', 'Date de la tournée', tour.date || '-'],
    ['Titre', tour.title || '-', 'Lieu', tour.location || '-'],
    ['Statut', tour.status === 'termine' ? 'Terminée ✓' : 'En cours', 'Notes', tour.notes || '-'],
  ];

  rows.forEach((row, ri) => {
    const yRow = y0 + ri * rh;
    const bg = ri % 2 === 0 ? C.grayLight : C.white;
    doc.save().rect(LEFT, yRow, PAGE_W, rh).fill(bg).restore();
    doc.rect(LEFT, yRow, PAGE_W, rh).strokeColor(C.border).lineWidth(0.5).stroke();

    doc.fillColor(C.greenDark).fontSize(7.5).font('Helvetica-Bold')
      .text(row[0], LEFT + 3, yRow + 4, { width: 70 });
    doc.fillColor(C.black).fontSize(7.5).font('Helvetica')
      .text(String(row[1]), LEFT + 75, yRow + 4, { width: half - 75 });
    doc.fillColor(C.greenDark).fontSize(7.5).font('Helvetica-Bold')
      .text(row[2], LEFT + half + 10, yRow + 4, { width: 90 });
    doc.fillColor(C.black).fontSize(7.5).font('Helvetica')
      .text(String(row[3]), LEFT + half + 102, yRow + 4, { width: PAGE_W - half - 102 });
  });

  doc.y = y0 + rows.length * rh + 8;
}

// ─── Summary box ──────────────────────────────────────────────────────────────

function drawGlobalSummary(doc, sections, type) {
  ensureSpace(doc, 70);
  const allItems = Object.values(sections).flat();
  const evaluated = allItems.filter(i => i.statut === 'conforme' || i.statut === 'non_conforme');
  const ecarts    = allItems.filter(i => i.statut === 'non_conforme');
  const leves     = allItems.filter(i => i.statut === 'non_conforme' && i.corrige_sur_place);

  // Weighted global taux
  let tauxGlobal = null;
  if (type === 'standards_hse') {
    const withPoids = evaluated.filter(i => i.poids != null);
    if (withPoids.length) {
      const s = withPoids.reduce((a, i) => a + Number(i.poids), 0);
      const c = withPoids.filter(i => i.statut === 'conforme').reduce((a, i) => a + Number(i.poids), 0);
      if (s) tauxGlobal = (c / s) * 100;
    } else if (evaluated.length) {
      tauxGlobal = (evaluated.filter(i => i.statut === 'conforme').length / evaluated.length) * 100;
    }
  } else {
    if (evaluated.length) tauxGlobal = ((evaluated.length - ecarts.length) / evaluated.length) * 100;
  }

  const boxH = 56;
  const y0   = doc.y;
  doc.save().rect(LEFT, y0, PAGE_W, boxH).fill(C.greenLight).restore();
  doc.rect(LEFT, y0, PAGE_W, boxH).strokeColor(C.greenDark).lineWidth(1.5).stroke();

  doc.fillColor(C.greenDark).fontSize(10).font('Helvetica-Bold')
    .text('RÉSUMÉ GLOBAL DE LA TOURNÉE', LEFT + 8, y0 + 6, { width: PAGE_W - 16 });

  // Metrics row
  const metrics = [
    { label: 'Taux de conformité', value: fmtTaux(tauxGlobal), color: tauxToTextColor(tauxGlobal) },
    { label: 'Items évalués',      value: `${evaluated.length}`,  color: C.black },
    { label: 'Écarts constatés',   value: `${ecarts.length}`,     color: ecarts.length > 0 ? C.redDark : C.greenMid },
    { label: 'Levés sur place',    value: `${leves.length}`,      color: C.blue },
    { label: 'Taux après levée',   value: fmtTaux(evaluated.length ? ((evaluated.length - ecarts.length + leves.length) / evaluated.length) * 100 : null), color: C.greenDark },
  ];

  const colW = PAGE_W / metrics.length;
  metrics.forEach((m, mi) => {
    const xm = LEFT + mi * colW;
    doc.fillColor(m.color).fontSize(14).font('Helvetica-Bold')
      .text(m.value, xm + 3, y0 + 26, { width: colW - 6, align: 'center' });
    doc.fillColor(C.gray).fontSize(6.5).font('Helvetica')
      .text(m.label, xm + 3, y0 + 44, { width: colW - 6, align: 'center' });
  });

  doc.y = y0 + boxH + 10;
}

// ─── Section header ───────────────────────────────────────────────────────────

function drawSectionHeader(doc, label, taux) {
  ensureSpace(doc, 28);
  const tauxtxt = fmtTaux(taux);
  const y0 = doc.y;
  doc.save().rect(LEFT, y0, PAGE_W, 20).fill(C.greenMid).restore();
  doc.fillColor(C.white).fontSize(9).font('Helvetica-Bold')
    .text(label.toUpperCase(), LEFT + 6, y0 + 5, { width: PAGE_W - 80 });
  const tauxBg = taux === null ? C.gray : taux >= 80 ? C.greenDark : taux >= 60 ? '#c77700' : C.redDark;
  doc.save().rect(LEFT + PAGE_W - 65, y0 + 2, 62, 16).fill(tauxBg).restore();
  doc.fillColor(C.white).fontSize(9).font('Helvetica-Bold')
    .text(tauxtxt, LEFT + PAGE_W - 65, y0 + 5, { width: 62, align: 'center' });
  doc.y = y0 + 24;
}

// ─── Sub-section separator ────────────────────────────────────────────────────

function drawSousSection(doc, label) {
  ensureSpace(doc, 18);
  const y0 = doc.y;
  doc.save().rect(LEFT, y0, PAGE_W, 14).fill('#eeeeee').restore();
  doc.fillColor(C.greenDark).fontSize(7.5).font('Helvetica-Bold')
    .text(`▶  ${label}`, LEFT + 6, y0 + 3, { width: PAGE_W - 12 });
  doc.y = y0 + 17;
}

// ─── Table header ─────────────────────────────────────────────────────────────

function drawTableHeader(doc, cols) {
  ensureSpace(doc, 16);
  const y0 = doc.y;
  doc.save().rect(LEFT, y0, PAGE_W, 14).fill('#e0e0e0').restore();
  doc.rect(LEFT, y0, PAGE_W, 14).strokeColor(C.border).lineWidth(0.5).stroke();
  let x = LEFT + 2;
  cols.forEach(col => {
    doc.fillColor(C.black).fontSize(7).font('Helvetica-Bold')
      .text(col.label, x, y0 + 3, { width: col.w - 4, align: col.align || 'left' });
    x += col.w;
  });
  doc.y = y0 + 14;
}

// ─── Item row (dynamic height) ────────────────────────────────────────────────

function drawItemRow(doc, cols, values, isEven, highlight) {
  // Calculate max text height
  let maxH = 16;
  cols.forEach((col, ci) => {
    const txt = String(values[ci] || '');
    if (txt && col.wrap) {
      const h = doc.heightOfString(txt, { width: col.w - 6, fontSize: 7.5 });
      maxH = Math.max(maxH, h + 6);
    }
  });
  maxH = Math.min(maxH, 48); // cap at 3 lines

  ensureSpace(doc, maxH);
  const y0 = doc.y;
  const bg = highlight || (isEven ? C.grayLight : C.white);
  doc.save().rect(LEFT, y0, PAGE_W, maxH).fill(bg).restore();
  doc.rect(LEFT, y0, PAGE_W, maxH).strokeColor(C.border).lineWidth(0.3).stroke();

  let x = LEFT + 2;
  cols.forEach((col, ci) => {
    const val = values[ci];
    const txt = String(val || '');
    doc.fillColor(col.color || C.black).fontSize(col.size || 7.5)
      .font(col.bold ? 'Helvetica-Bold' : 'Helvetica')
      .text(txt, x, y0 + 3, { width: col.w - 4, align: col.align || 'left', lineBreak: !!col.wrap, ellipsis: !col.wrap });
    x += col.w;
  });

  doc.y = y0 + maxH;
}

// ─── Photos ───────────────────────────────────────────────────────────────────

function drawPhotos(doc, sectionItems, uploadsDir) {
  const photos = [];
  for (const item of sectionItems) {
    if (!item.photos || !item.photos.length) continue;
    for (const p of item.photos) {
      const fp = path.join(uploadsDir, p.filename);
      if (fs.existsSync(fp)) photos.push({ filePath: fp, caption: item.item_label });
    }
  }
  if (!photos.length) return;

  ensureSpace(doc, 30);
  doc.fillColor(C.greenDark).fontSize(8).font('Helvetica-Bold').text('Photos', LEFT, doc.y);
  doc.y += 5;

  const photoW = (PAGE_W - 10) / 2;
  const photoH = 110;
  for (let i = 0; i < photos.length; i++) {
    const isLeft = i % 2 === 0;
    if (isLeft) ensureSpace(doc, photoH + 20);
    const xp = isLeft ? LEFT : LEFT + photoW + 10;
    const yp = doc.y;
    try {
      doc.image(photos[i].filePath, xp, yp, { width: photoW, height: photoH, fit: [photoW, photoH] });
      doc.fillColor(C.gray).fontSize(6).font('Helvetica')
        .text(photos[i].caption, xp, yp + photoH + 2, { width: photoW, ellipsis: true });
    } catch { /* skip */ }
    if (!isLeft || i === photos.length - 1) doc.y = yp + photoH + 14;
  }
  doc.y += 4;
}

// ─── STANDARDS HSE report ─────────────────────────────────────────────────────

function renderStandardsHSE(doc, sectionMap, uploadsDir) {
  // Ordered sections
  const ORDER = ['autorisation','consignation','hauteur','espace_confine','circulation','mode_operatoire','epi'];
  const sections = ORDER.filter(k => sectionMap[k]);

  const COLS = [
    { label: 'N°',        w:  24, align: 'center' },
    { label: 'Criticité', w:  52 },
    { label: 'Exigence',  w: 208, wrap: true },
    { label: 'Poids',     w:  28, align: 'center' },
    { label: 'Statut',    w:  48, align: 'center' },
    { label: 'Levé',      w:  32, align: 'center' },
    { label: 'Constat',   w: 123, wrap: true },
  ];
  // sum = 24+52+208+28+48+32+123 = 515 ✓

  for (const sKey of sections) {
    const items = sectionMap[sKey];
    const taux  = calcStandardsSection(items);

    drawSectionHeader(doc, SECTION_LABELS[sKey] || sKey, taux);

    // Group by sous_section (preserving order)
    const groups = [];
    let curSS = undefined, curGroup = null;
    for (const it of items) {
      const ss = it.sous_section || null;
      if (ss !== curSS) { curSS = ss; curGroup = { label: ss, items: [] }; groups.push(curGroup); }
      curGroup.items.push(it);
    }

    let tableStarted = false;
    for (const g of groups) {
      if (g.label) drawSousSection(doc, g.label);
      if (!tableStarted) { drawTableHeader(doc, COLS); tableStarted = false; }
      drawTableHeader(doc, COLS);
      tableStarted = true;

      g.items.forEach((item, idx) => {
        const criticiteCol = item.criticite
          ? { text: item.criticite, color: criticiteColor(item.criticite) }
          : { text: '-', color: C.gray };

        const highlight = item.statut === 'non_conforme'
          ? (item.corrige_sur_place ? '#e3f2fd' : '#fff3f3')
          : null;

        drawItemRow(doc, COLS, [
          item.numero || '-',
          criticiteCol.text,
          item.item_label,
          item.poids != null ? String(item.poids) : '-',
          statusSymbol(item.statut),
          item.corrige_sur_place ? '✓' : (item.statut === 'non_conforme' ? '✗' : ''),
          item.observation || '',
        ], idx % 2 === 0, null);

        // Highlight statut cell manually
        // (pdfkit doesn't support per-cell colors in the simple approach above)
      });

      // Non-conformity details block
      const ncItems = g.items.filter(i => i.statut === 'non_conforme' && (i.action_plan || i.action_deadline || i.action_responsible));
      for (const nc of ncItems) {
        ensureSpace(doc, 18);
        const y0 = doc.y;
        doc.save().rect(LEFT + 24, y0, PAGE_W - 24, 14).fill('#fff9c4').restore();
        doc.fillColor(C.orange).fontSize(7).font('Helvetica-Bold')
          .text(`  Plan d'action — ${nc.numero || nc.item_key} :`, LEFT + 26, y0 + 3, { width: 100 });
        doc.fillColor(C.black).fontSize(7).font('Helvetica')
          .text(nc.action_plan || '', LEFT + 128, y0 + 3, { width: 180, ellipsis: true });
        if (nc.action_deadline || nc.action_responsible) {
          doc.fillColor(C.gray).fontSize(7).font('Helvetica')
            .text(`Échéance: ${nc.action_deadline || '-'}   Resp.: ${nc.action_responsible || '-'}`,
                  LEFT + 310, y0 + 3, { width: PAGE_W - 310 - 24, ellipsis: true });
        }
        doc.y = y0 + 14;
      }
    }

    // Section conformity footer
    ensureSpace(doc, 14);
    const y0 = doc.y;
    const bg = tauxtoBgColor(taux);
    doc.save().rect(LEFT, y0, PAGE_W, 13).fill(bg).restore();
    doc.fillColor(tauxToTextColor(taux)).fontSize(7.5).font('Helvetica-Bold')
      .text(`Conformité en % — ${SECTION_LABELS[sKey] || sKey} : ${fmtTaux(taux)}`, LEFT + 6, y0 + 3, { width: PAGE_W - 80 });
    const ecartsSec  = items.filter(i => i.statut === 'non_conforme').length;
    const levesSec   = items.filter(i => i.statut === 'non_conforme' && i.corrige_sur_place).length;
    doc.fillColor(C.gray).fontSize(7.5).font('Helvetica')
      .text(`Écarts : ${ecartsSec}   Levés sur place : ${levesSec}`, LEFT + PAGE_W - 130, y0 + 3, { width: 125, align: 'right' });
    doc.y = y0 + 17;

    drawPhotos(doc, items, uploadsDir);
    doc.y += 6;
  }

  // ── Récapitulatif Standards ──
  ensureSpace(doc, 40 + sections.length * 14 + 20);
  doc.addPage();
  drawHeader(doc, doc._tourInfo);
  doc.fillColor(C.greenDark).fontSize(11).font('Helvetica-Bold')
    .text('ÉTAT RÉCAPITULATIF — CONFORMITÉ DES STANDARDS', LEFT, doc.y);
  doc.y += 8;

  // LSR recap
  const recapCols = [
    { label: 'Standard',                         w: 178, wrap: true },
    { label: 'Taux constaté',                    w:  68, align: 'center' },
    { label: 'Écarts\nconstatés',                w:  55, align: 'center' },
    { label: 'Levés sur\nplace',                 w:  55, align: 'center' },
    { label: 'Taux après\nlevée d\'écart',       w:  80, align: 'center' },
    { label: 'Règle LSR\n(poids ≥ 0.5)',         w:  79, align: 'center' },
  ]; // 178+68+55+55+80+79 = 515 ✓

  drawTableHeader(doc, recapCols);

  let totalEcarts = 0, totalLeves = 0;
  const sectionTaux = {};

  sections.forEach((sKey, si) => {
    const items   = sectionMap[sKey];
    const evaluated = items.filter(i => i.statut === 'conforme' || i.statut === 'non_conforme');
    const ecarts  = items.filter(i => i.statut === 'non_conforme').length;
    const leves   = items.filter(i => i.statut === 'non_conforme' && i.corrige_sur_place).length;
    totalEcarts  += ecarts;
    totalLeves   += leves;

    const taux    = calcStandardsSection(items);
    sectionTaux[sKey] = taux;

    // Taux après levée
    let tauxApres = null;
    if (evaluated.length) {
      const withPoids = evaluated.filter(i => i.poids != null);
      if (withPoids.length) {
        const lsrLeves  = items.filter(i => i.statut === 'non_conforme' && i.corrige_sur_place && i.poids != null);
        const sumTotal  = withPoids.reduce((a, i) => a + Number(i.poids), 0);
        const sumConf   = withPoids.filter(i => i.statut === 'conforme').reduce((a, i) => a + Number(i.poids), 0);
        const sumLeves  = lsrLeves.reduce((a, i) => a + Number(i.poids), 0);
        tauxApres = sumTotal > 0 ? ((sumConf + sumLeves) / sumTotal) * 100 : null;
      } else {
        tauxApres = evaluated.length > 0 ? ((evaluated.length - ecarts + leves) / evaluated.length) * 100 : null;
      }
    }

    // LSR critical items
    const critiques = items.filter(i => i.poids >= 0.5);
    const lsrConf   = critiques.filter(i => i.statut === 'conforme').length;
    const lsrTotal  = critiques.filter(i => i.statut === 'conforme' || i.statut === 'non_conforme').length;
    const lsrTaux   = lsrTotal > 0 ? (lsrConf / lsrTotal) * 100 : null;

    const rowBg = ecarts > 0 && leves < ecarts ? '#fff3f3' : null;
    drawItemRow(doc, recapCols, [
      SECTION_LABELS[sKey] || sKey,
      fmtTaux(taux),
      String(ecarts),
      String(leves),
      fmtTaux(tauxApres),
      lsrTotal > 0 ? `${fmtTaux(lsrTaux)} (${lsrConf}/${lsrTotal})` : '-',
    ], si % 2 === 0, rowBg);
  });

  // Total row
  ensureSpace(doc, 16);
  const y0 = doc.y;
  doc.save().rect(LEFT, y0, PAGE_W, 14).fill(C.greenLight).restore();
  doc.rect(LEFT, y0, PAGE_W, 14).strokeColor(C.greenDark).lineWidth(0.5).stroke();
  doc.fillColor(C.greenDark).fontSize(8).font('Helvetica-Bold')
    .text("Total d'écarts", LEFT + 4, y0 + 3, { width: 178 });
  doc.text(String(totalEcarts), LEFT + 178 + 68, y0 + 3, { width: 55, align: 'center' });
  doc.text(String(totalLeves),  LEFT + 178 + 68 + 55, y0 + 3, { width: 55, align: 'center' });
  doc.y = y0 + 18;
}

// ─── ÉQUIPEMENTS report ───────────────────────────────────────────────────────

function renderEquipements(doc, sectionMap, uploadsDir) {
  const ORDER = ['acces','soudage','extinction','levage','pression','engins','outillage'];
  const sections = ORDER.filter(k => sectionMap[k]);

  const COLS = [
    { label: 'N°',             w:  24, align: 'center' },
    { label: 'Défaut observé', w: 218, wrap: true },
    { label: 'Constaté',       w:  52, align: 'center' },
    { label: 'Levé sur place', w:  52, align: 'center' },
    { label: 'Observation',    w: 100, wrap: true },
    { label: "Plan d'action",  w:  69, wrap: true },
  ]; // 24+218+52+52+100+69 = 515 ✓

  for (const sKey of sections) {
    const items = sectionMap[sKey];
    const taux  = calcEquipementsSection(items);

    drawSectionHeader(doc, SECTION_LABELS[sKey] || sKey, taux);

    // Group by sous_section
    const groups = [];
    let curSS = undefined, curGroup = null;
    for (const it of items) {
      const ss = it.sous_section || null;
      if (ss !== curSS) { curSS = ss; curGroup = { label: ss, items: [] }; groups.push(curGroup); }
      curGroup.items.push(it);
    }

    for (const g of groups) {
      if (g.label) drawSousSection(doc, g.label);
      drawTableHeader(doc, COLS);

      g.items.forEach((item, idx) => {
        const isEC  = item.statut === 'non_conforme';
        const isLev = isEC && item.corrige_sur_place;
        const highlight = isLev ? '#e3f2fd' : isEC ? '#fff3f3' : null;
        drawItemRow(doc, COLS, [
          item.numero || '-',
          item.item_label,
          isEC ? '✗' : (item.statut === 'conforme' ? '✓' : '-'),
          isLev ? '✓' : '',
          item.observation || '',
          item.action_plan || '',
        ], idx % 2 === 0, highlight);
      });

      // Sub-section stats line
      const ssEcarts = g.items.filter(i => i.statut === 'non_conforme').length;
      const ssLeves  = g.items.filter(i => i.statut === 'non_conforme' && i.corrige_sur_place).length;
      const ssTaux   = calcEquipementsSection(g.items);
      if (g.label) {
        ensureSpace(doc, 12);
        const y0 = doc.y;
        doc.save().rect(LEFT, y0, PAGE_W, 11).fill('#f3f8f3').restore();
        doc.fillColor(C.greenDark).fontSize(7).font('Helvetica-Bold')
          .text(`Sous-total ${g.label} — Écarts : ${ssEcarts}  |  Levés sur place : ${ssLeves}  |  Conformité : ${fmtTaux(ssTaux)}`,
                LEFT + 4, y0 + 2, { width: PAGE_W - 8 });
        doc.y = y0 + 13;
      }
    }

    // Section footer
    ensureSpace(doc, 14);
    const y0 = doc.y;
    const bg = tauxtoBgColor(taux);
    const ecartsSec = items.filter(i => i.statut === 'non_conforme').length;
    const levesSec  = items.filter(i => i.statut === 'non_conforme' && i.corrige_sur_place).length;
    doc.save().rect(LEFT, y0, PAGE_W, 13).fill(bg).restore();
    doc.fillColor(tauxToTextColor(taux)).fontSize(7.5).font('Helvetica-Bold')
      .text(`Taux de conformité — ${SECTION_LABELS[sKey] || sKey} : ${fmtTaux(taux)}`, LEFT + 6, y0 + 3, { width: PAGE_W - 160 });
    doc.fillColor(C.gray).fontSize(7.5).font('Helvetica')
      .text(`Écarts : ${ecartsSec}   Levés : ${levesSec}`, LEFT + PAGE_W - 155, y0 + 3, { width: 150, align: 'right' });
    doc.y = y0 + 17;

    drawPhotos(doc, items, uploadsDir);
    doc.y += 6;
  }

  // ── Récapitulatif Équipements ──
  doc.addPage();
  drawHeader(doc, doc._tourInfo);
  doc.fillColor(C.greenDark).fontSize(11).font('Helvetica-Bold')
    .text('ÉTAT RÉCAPITULATIF — CONFORMITÉ DES ÉQUIPEMENTS ET ENGINS', LEFT, doc.y);
  doc.y += 8;

  const recapCols = [
    { label: 'Équipement / Engin',              w: 160, wrap: true },
    { label: 'Taux de conformité\nconstaté',    w:  75, align: 'center' },
    { label: "Nombre d'écarts\nconstatés",      w:  65, align: 'center' },
    { label: 'Levés\nsur place',                w:  55, align: 'center' },
    { label: "Conformité après\nlevée d'écart", w:  80, align: 'center' },
    { label: 'Taux global\naprès correction',   w:  80, align: 'center' },
  ]; // 160+75+65+55+80+80 = 515 ✓

  drawTableHeader(doc, recapCols);

  let totalEcarts = 0, totalLeves = 0;

  sections.forEach((sKey, si) => {
    const items    = sectionMap[sKey];
    const evaluated = items.filter(i => i.statut === 'conforme' || i.statut === 'non_conforme');
    const ecarts   = items.filter(i => i.statut === 'non_conforme').length;
    const leves    = items.filter(i => i.statut === 'non_conforme' && i.corrige_sur_place).length;
    totalEcarts   += ecarts;
    totalLeves    += leves;
    const taux     = calcEquipementsSection(items);
    const tauxApres = evaluated.length > 0 ? ((evaluated.length - ecarts + leves) / evaluated.length) * 100 : null;

    const rowBg = ecarts > 0 && leves < ecarts ? '#fff3f3' : null;
    drawItemRow(doc, recapCols, [
      SECTION_LABELS[sKey] || sKey,
      fmtTaux(taux),
      String(ecarts),
      String(leves),
      fmtTaux(tauxApres),
      fmtTaux(tauxApres),
    ], si % 2 === 0, rowBg);
  });

  // Total
  ensureSpace(doc, 16);
  const yTot = doc.y;
  doc.save().rect(LEFT, yTot, PAGE_W, 14).fill(C.greenLight).restore();
  doc.rect(LEFT, yTot, PAGE_W, 14).strokeColor(C.greenDark).lineWidth(0.5).stroke();
  doc.fillColor(C.greenDark).fontSize(8).font('Helvetica-Bold')
    .text("Nombre total d'écarts", LEFT + 4, yTot + 3, { width: 160 });
  doc.text(String(totalEcarts), LEFT + 160 + 75, yTot + 3, { width: 65, align: 'center' });
  doc.text(String(totalLeves),  LEFT + 160 + 75 + 65, yTot + 3, { width: 55, align: 'center' });
  doc.y = yTot + 18;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

async function generateTourReport(tour, items, uploadsDir) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, autoFirstPage: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Attach tour to doc for use in drawHeader inside page breaks
    doc._tourInfo = tour;

    // Separate items by type
    const standardsItems = items.filter(i => i.checklist_type === 'standards_hse');
    const equipItems      = items.filter(i => i.checklist_type === 'equipements');

    // Group by section, preserving DB insertion order
    function groupBySection(its) {
      const map = {};
      for (const it of its) {
        if (!map[it.section]) map[it.section] = [];
        map[it.section].push(it);
      }
      return map;
    }

    const sHSE  = groupBySection(standardsItems);
    const sEquip = groupBySection(equipItems);

    // ── Page 1: header + tour info + global summary ──
    drawHeader(doc, tour);

    if (standardsItems.length > 0 && equipItems.length > 0) {
      // Both checklists — show global summary across all items
      drawGlobalSummary(doc, { ...sHSE, ...sEquip }, 'mixed');
    } else if (standardsItems.length > 0) {
      drawGlobalSummary(doc, sHSE, 'standards_hse');
    } else {
      drawGlobalSummary(doc, sEquip, 'equipements');
    }

    // Tour info table
    const checklistType = standardsItems.length > 0 && equipItems.length > 0
      ? 'standards_hse' // will show both anyway
      : standardsItems.length > 0 ? 'standards_hse' : 'equipements';
    drawTourInfoTable(doc, tour, checklistType);

    // ── Standards HSE sections ──
    if (standardsItems.length > 0) {
      ensureSpace(doc, 30);
      doc.fillColor(C.greenDark).fontSize(10).font('Helvetica-Bold')
        .text('CHECK-LIST STANDARDS HSE ET LSR', LEFT, doc.y);
      doc.y += 8;
      renderStandardsHSE(doc, sHSE, uploadsDir);
    }

    // ── Équipements sections ──
    if (equipItems.length > 0) {
      if (standardsItems.length > 0) { doc.addPage(); drawHeader(doc, tour); }
      doc.fillColor(C.greenDark).fontSize(10).font('Helvetica-Bold')
        .text('CHECK-LIST ÉQUIPEMENTS, ENGINS ET OUTILLAGE', LEFT, doc.y);
      doc.y += 8;
      renderEquipements(doc, sEquip, uploadsDir);
    }

    doc.flushPages();
    drawFooter(doc);
    doc.end();
  });
}

module.exports = { generateTourReport };
