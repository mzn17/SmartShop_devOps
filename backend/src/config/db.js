const mongoose = require('mongoose');

/**
 * Connexion MongoDB via Mongoose.
 *
 * La base est créée manuellement dans MongoDB Compass.
 * Le backend ne crée pas la base : il se connecte simplement à l'URI fournie.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartstore_test';

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log(`   ✅ MongoDB connecté (base : ${mongoose.connection.name})`);
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
