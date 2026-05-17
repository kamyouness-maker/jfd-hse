const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const GREEN_DARK = '#1a7a1a';
const GREEN_MID = '#2d9e2d';
const GREEN_LIGHT = '#f0f9f0';
const TEXT_DARK = '#1a1a1a';
const GRAY = '#666666';
const BORDER = '#dddddd';

const SECTION_LABELS = {
  autorisation: 'Autorisation de travail',
  consignation: 'Consignation',
  hauteur: 'Travail en hauteur',
  espace_confine: 'Espace confiné',
  circulation: 'Circulation',
  mode_operatoire: 'Mode opératoire',
  epi: 'EPI',
  acces: "Moyens d'accès",
  soudage: 'Soudage',
  extinction: 'Extinction',
  levage: 'Levage',
  pression: 'Pression',
  engins: 'Engins',
  outillage: 'Outillage'
};

function statusSymbol(statut) {
  if (statut === 'conforme') return '✓';
  if (statut === 'non_conforme') return '✗';
  if (statut === 'na') return 'N/A';
  return '-';
}

function statusColor(statut) {
  if (statut === 'conforme') return GREEN_MID;
  if (statut === 'non_conforme') return '#cc0000';
  if (statut === 'na') return GRAY;
  return GRAY;
}

async function generateTourReport(tour, items, uploadsDir) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 80; // minus margins
    let pageNum = 1;

    function drawHeader() {
      // OCP Logo placeholder
      doc.save();
      doc.rect(40, 30, 80, 40).fillAndStroke(GREEN_DARK, GREEN_DARK);
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
        .text('OCP JFC2', 42, 42, { width: 76, align: 'center' });
      doc.restore();

      // Title
      doc.fillColor(GREEN_DARK).fontSize(16).font('Helvetica-Bold')
        .text("Rapport d'Inspection HSE - SafeCheck OCP", 135, 30, { width: pageWidth - 95 });

      // Tour info
      doc.fillColor(GRAY).fontSize(9).font('Helvetica')
        .text(`Date: ${tour.date}   |   Lieu: ${tour.location || 'Non spécifié'}   |   Responsable: ${tour.user_full_name || ''}   |   Statut: ${tour.status === 'termine' ? 'Terminé' : 'En cours'}`, 135, 50, { width: pageWidth - 95 });

      // Separator line
      doc.moveTo(40, 80).lineTo(40 + pageWidth, 80).strokeColor(GREEN_DARK).lineWidth(2).stroke();
      doc.y = 90;
    }

    function drawFooter() {
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(pages.start + i);
        doc.moveTo(40, doc.page.height - 40).lineTo(40 + pageWidth, doc.page.height - 40)
          .strokeColor(BORDER).lineWidth(1).stroke();
        doc.fillColor(GRAY).fontSize(8).font('Helvetica')
          .text(`Page ${i + 1} / ${pages.count}`, 40, doc.page.height - 30, { width: pageWidth / 2 })
          .text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 40 + pageWidth / 2, doc.page.height - 30, { width: pageWidth / 2, align: 'right' });
      }
    }

    // Group items by section
    const sections = {};
    for (const item of items) {
      if (!sections[item.section]) sections[item.section] = [];
      sections[item.section].push(item);
    }

    drawHeader();

    // Summary box
    const evaluated = items.filter(i => i.statut && i.statut !== 'na');
    const conformeCount = evaluated.filter(i => i.statut === 'conforme').length;
    const ncCount = evaluated.filter(i => i.statut === 'non_conforme').length;
    const taux = evaluated.length > 0 ? Math.round((conformeCount / evaluated.length) * 100) : 0;

    doc.rect(40, doc.y, pageWidth, 50).fillAndStroke(GREEN_LIGHT, GREEN_DARK);
    doc.fillColor(GREEN_DARK).fontSize(11).font('Helvetica-Bold')
      .text('RÉSUMÉ DE LA TOURNÉE', 50, doc.y + 8, { width: pageWidth - 20 });
    doc.fillColor(TEXT_DARK).fontSize(9).font('Helvetica')
      .text(`Taux de conformité: ${taux}%   |   Conformes: ${conformeCount}   |   Non conformes: ${ncCount}   |   Total évalués: ${evaluated.length}`, 50, doc.y + 5, { width: pageWidth - 20 });
    doc.y += 60;

    // Each section
    for (const [sectionKey, sectionItems] of Object.entries(sections)) {
      // Check page space
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
        drawHeader();
      }

      // Section header
      doc.rect(40, doc.y, pageWidth, 22).fillAndStroke(GREEN_MID, GREEN_MID);
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold')
        .text((SECTION_LABELS[sectionKey] || sectionKey).toUpperCase(), 50, doc.y + 5, { width: pageWidth - 20 });
      doc.y += 28;

      // Table header
      const col1 = 200, col2 = 60, col3 = 130, col4 = pageWidth - col1 - col2 - col3;
      doc.rect(40, doc.y, pageWidth, 18).fillAndStroke('#e8e8e8', BORDER);
      doc.fillColor(TEXT_DARK).fontSize(8).font('Helvetica-Bold')
        .text('Élément', 45, doc.y + 4, { width: col1 - 5 })
        .text('Statut', 45 + col1, doc.y + 4, { width: col2 - 5 })
        .text('Observation', 45 + col1 + col2, doc.y + 4, { width: col3 - 5 })
        .text("Plan d'action", 45 + col1 + col2 + col3, doc.y + 4, { width: col4 - 5 });
      doc.y += 22;

      // Items
      for (const item of sectionItems) {
        const rowHeight = 20;
        if (doc.y + rowHeight > doc.page.height - 60) {
          doc.addPage();
          drawHeader();
        }

        // Alternating background
        const idx = sectionItems.indexOf(item);
        if (idx % 2 === 0) {
          doc.rect(40, doc.y, pageWidth, rowHeight).fillAndStroke('#fafafa', BORDER);
        } else {
          doc.rect(40, doc.y, pageWidth, rowHeight).stroke();
        }

        doc.fillColor(TEXT_DARK).fontSize(7.5).font('Helvetica')
          .text(item.item_label, 45, doc.y + 4, { width: col1 - 5, ellipsis: true });

        doc.fillColor(statusColor(item.statut)).fontSize(9).font('Helvetica-Bold')
          .text(statusSymbol(item.statut), 45 + col1, doc.y + 4, { width: col2 - 5, align: 'center' });

        doc.fillColor(GRAY).fontSize(7.5).font('Helvetica')
          .text(item.observation || '', 45 + col1 + col2, doc.y + 4, { width: col3 - 5, ellipsis: true });

        doc.fillColor(GRAY).fontSize(7.5).font('Helvetica')
          .text(item.action_plan || '', 45 + col1 + col2 + col3, doc.y + 4, { width: col4 - 5, ellipsis: true });

        doc.y += rowHeight;
      }

      // Photos for this section
      const sectionPhotos = [];
      for (const item of sectionItems) {
        if (item.photos && item.photos.length > 0) {
          for (const photo of item.photos) {
            const filePath = path.join(uploadsDir, photo.filename);
            if (fs.existsSync(filePath)) {
              sectionPhotos.push({ item, photo, filePath });
            }
          }
        }
      }

      if (sectionPhotos.length > 0) {
        doc.y += 5;
        const photoWidth = (pageWidth - 20) / 2;
        const photoHeight = 120;
        let photoX = 40;

        for (let pi = 0; pi < sectionPhotos.length; pi++) {
          if (pi % 2 === 0) {
            if (doc.y + photoHeight + 30 > doc.page.height - 60) {
              doc.addPage();
              drawHeader();
            }
            if (pi > 0) doc.y += 10;
            photoX = 40;
          } else {
            photoX = 40 + photoWidth + 10;
          }

          try {
            doc.image(sectionPhotos[pi].filePath, photoX, doc.y, {
              width: photoWidth,
              height: photoHeight,
              fit: [photoWidth, photoHeight]
            });
          } catch (e) {
            // skip broken image
          }

          if (pi % 2 === 1 || pi === sectionPhotos.length - 1) {
            doc.y += photoHeight + 5;
          }
        }
      }

      doc.y += 10;
    }

    doc.flushPages();
    drawFooter();
    doc.end();
  });
}

module.exports = { generateTourReport };
