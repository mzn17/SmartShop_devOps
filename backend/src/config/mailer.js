const nodemailer = require('nodemailer');

/**
 * Transporteur SMTP Nodemailer.
 * Il n'est créé que si les identifiants SMTP sont renseignés dans .env.
 * Utilisation : sendMail({ to, subject, text, html, attachments })
 */
const transporter =
  process.env.SMTP_USER && process.env.SMTP_PASSWORD
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      })
    : null;

async function sendMail({ to, subject, text, html, attachments }) {
  if (!transporter) {
    console.warn('[mail] SMTP non configuré : e-mail ignoré.');
    return { skipped: true };
  }
  return transporter.sendMail({
    from: process.env.MAIL_FROM || 'SmartStore <no-reply@smartstore.tn>',
    to,
    subject,
    text,
    html,
    attachments,
  });
}

module.exports = { transporter, sendMail };
