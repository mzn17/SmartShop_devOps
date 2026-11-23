const cron = require('node-cron');
const Product = require('../models/Product');
const { sendMail } = require('../config/mailer');
const {
  createLowStockOrders,
  buildOrderPdfBuffer,
} = require('../controllers/order.controller');

/**
 * US008 – Réapprovisionnement automatique.
 *
 * Chaque jour à 16h00 (Africa/Tunis) :
 *  1. détecte les produits actifs dont le stock est inférieur au seuil ;
 *  2. génère un bon de commande par fournisseur (statut « en_attente ») ;
 *  3. produit un PDF pour chaque bon ;
 *  4. envoie les PDF à l'administrateur par e-mail ;
 *  5. l'administrateur valide / refuse la commande dans l'application,
 *     puis le stock est incrémenté à la réception (US009).
 */
function startLowStockJob() {
  const schedule = process.env.CRON_SCHEDULE || '0 16 * * *';

  if (!cron.validate(schedule)) {
    console.error(`[cron] Expression invalide : ${schedule}`);
    return;
  }

  cron.schedule(
    schedule,
    async () => {
      console.log('[cron] Analyse des produits en stock faible…');
      try {
        const threshold = Number(process.env.STOCK_ALERT_THRESHOLD) || 8;
        const orders = await createLowStockOrders({ threshold });

        if (!orders.length) {
          console.log('[cron] Aucun produit sous le seuil (ou commande déjà générée aujourd’hui).');
          return;
        }

        const products = await Product.find({
          active: true,
          $expr: { $lt: ['$stock', { $ifNull: ['$lowStockThreshold', threshold] }] },
        })
          .populate('supplier', 'name')
          .sort({ stock: 1 });

        const attachments = [];
        for (const order of orders) {
          const pdf = await buildOrderPdfBuffer(order);
          attachments.push({
            filename: `${order.number}.pdf`,
            content: pdf,
            contentType: 'application/pdf',
          });
        }

        console.log(
          `[cron] ${orders.length} bon(s) de commande généré(s) pour ${products.length} produit(s).`
        );

        await sendMail({
          to: process.env.ADMIN_EMAIL,
          subject: `[SmartStore] ${orders.length} bon(s) de commande à valider`,
          text: [
            `${orders.length} bon(s) de commande ont été générés automatiquement.`,
            '',
            ...orders.map((order) => `- ${order.number} · ${order.supplier?.name || 'Sans fournisseur'} · ${Number(order.total).toFixed(3)} DT`),
            '',
            'Connectez-vous à SmartStore pour valider ou refuser ces commandes.',
          ].join('\n'),
          attachments,
        });
      } catch (error) {
        console.error('[cron] Erreur :', error.message);
      }
    },
    { timezone: 'Africa/Tunis' }
  );

  console.log(`   ⏰ Réapprovisionnement automatique planifié (${schedule})`);
}

module.exports = { startLowStockJob };
