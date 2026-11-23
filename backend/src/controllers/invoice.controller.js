const PDFDocument = require('pdfkit');
const Sale = require('../models/Sale');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

const populateSale = (query) =>
  query.populate('cashier', 'name').populate('lines.product', 'name barcode');

const serializeInvoice = (sale) => {
  const data = sale.toJSON();
  return {
    ...data,
    cashier: sale.cashier?.name || null,
    netTotal: Number(((sale.total || 0) - (sale.refundedTotal || 0)).toFixed(3)),
    lines: (sale.lines || []).map((line) => ({
      productId: line.product?.id || line.product?.toString?.() || null,
      name: line.name,
      quantity: line.quantity,
      price: line.price,
    })),
  };
};

/**
 * GET /api/invoices
 */
const list = asyncHandler(async (req, res) => {
  // Un caissier ne voit que les factures qu'il a lui-même encaissées.
  const filter = req.user.role === 'caissier' ? { cashier: req.user.id } : {};
  const sales = await populateSale(Sale.find(filter).sort({ date: -1 }).limit(500));
  res.json({ success: true, data: sales.map(serializeInvoice) });
});

/** Vérifie qu'un caissier accède uniquement à ses propres factures. */
const assertCanRead = (sale, user) => {
  if (
    user.role === 'caissier' &&
    String(sale.cashier?._id || sale.cashier) !== String(user.id)
  ) {
    throw httpError(403, 'Vous ne pouvez consulter que vos propres factures.');
  }
};

/**
 * GET /api/invoices/:id
 */
const getById = asyncHandler(async (req, res) => {
  const sale = await populateSale(Sale.findById(req.params.id));
  if (!sale) throw httpError(404, 'Facture introuvable.');
  assertCanRead(sale, req.user);
  res.json({ success: true, data: serializeInvoice(sale) });
});

/**
 * GET /api/invoices/:id/pdf
 */
const downloadPdf = asyncHandler(async (req, res) => {
  const sale = await populateSale(Sale.findById(req.params.id));
  if (!sale) throw httpError(404, 'Facture introuvable.');
  assertCanRead(sale, req.user);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${sale.invoice}.pdf"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).text('SmartStore');
  doc.fontSize(10).fillColor('#555').text('Gestion de magasin');
  doc.moveDown();
  doc.fillColor('#000').fontSize(14).text(`Facture ${sale.invoice}`);
  doc.fontSize(10).text(`Date : ${new Date(sale.date).toLocaleString('fr-FR')}`);
  doc.text(`Caissier : ${sale.cashier?.name || '—'}`);
  doc.text(`Paiement : ${sale.payment === 'especes' ? 'Espèces' : 'Carte bancaire'}`);
  doc.moveDown();

  sale.lines.forEach((line, index) => {
    doc.text(
      `${index + 1}. ${line.name} — ${line.quantity} × ${line.price.toFixed(3)} DT`
    );
  });

  doc.moveDown();

  if (sale.refundedTotal > 0) {
    doc.fontSize(10).text(`Retours : -${sale.refundedTotal.toFixed(3)} DT`, { align: 'right' });
    doc.fontSize(12).text(
      `Net à payer : ${(sale.total - sale.refundedTotal).toFixed(3)} DT`,
      { align: 'right' }
    );
  } else {
    doc.fontSize(12).text(`Total : ${sale.total.toFixed(3)} DT`, { align: 'right' });
  }

  doc.end();
});

module.exports = { list, getById, downloadPdf };
