require('dotenv').config();

const app = require('./src/app');
const { connectDB, disconnectDB } = require('./src/config/db');
const { startLowStockJob } = require('./src/jobs/lowStock.job');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Best practice : se connecter à MongoDB avant d'accepter du trafic.
    await connectDB();
  } catch (error) {
    console.error('   ❌ Connexion MongoDB impossible :', error.message);
    console.error('      → Vérifiez MONGODB_URI et que MongoDB est démarré.');
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`\n🚀 SmartStore API démarrée sur http://localhost:${PORT}`);
    console.log(`   Environnement : ${process.env.NODE_ENV || 'development'}`);
    startLowStockJob();
  });

  const shutdown = async (signal) => {
    console.log(`\n[server] Arrêt reçu (${signal})…`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
