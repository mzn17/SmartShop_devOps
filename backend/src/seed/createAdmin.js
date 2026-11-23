// Seed script to create an admin user
// Run with: node src/seed/createAdmin.js (ensure MongoDB connection string is set in .env)

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function createAdmin() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not defined in .env');
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ email: 'mzn17@gmail.com' });
    if (existing) {
      console.log('Admin user already exists');
      return;
    }

    const password = '123456';
    const passwordHash = password; // store plain password, will be hashed by pre-save hook

    const admin = new User({
      name: 'mezen',
      email: 'mzn17@gmail.com',
      passwordHash,
      role: 'admin',
      active: true,
    });
    await admin.save();
    console.log('Admin user created successfully');
  } catch (err) {
    console.error('Error creating admin user:', err);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();

