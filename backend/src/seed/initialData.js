// backend/src/seed/initialData.js
// Simple seed script to bootstrap the SmartShop database (MongoDB).
// Run with:   cd <project-root> && node backend/src/seed/initialData.js
// Make sure a .env file exists with MONGODB_URI pointing to your MongoDB instance.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const User = require('../models/User');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');

async function run() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not defined in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('✅ Connected to MongoDB');

  // -----------------------------------------------------------------
  // 1️⃣ Admin user (if not exists)
  // -----------------------------------------------------------------
  const adminEmail = 'mzn17@gmail.com';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    const passwordHash = await bcrypt.hash('123456', 10);
    admin = await User.create({
      name: 'mezen',
      email: adminEmail,
      passwordHash,
      role: 'admin',
      active: true,
    });
    console.log('✅ Admin user created');
  } else {
    console.log('ℹ️ Admin user already exists');
  }

  // -----------------------------------------------------------------
  // 2️⃣ Categories
  // -----------------------------------------------------------------
  const categoriesData = [
    { name: 'Électronique', active: true },
    { name: 'Maison',       active: true },
    { name: 'Vêtements',    active: true },
  ];
  const categories = await Category.insertMany(categoriesData);
  console.log('✅ Categories inserted');

  // -----------------------------------------------------------------
  // 3️⃣ Suppliers
  // -----------------------------------------------------------------
  const suppliersData = [
    { name: 'Fournisseur A', email: 'a@supplier.tn', phone: '12345678', active: true },
    { name: 'Fournisseur B', email: 'b@supplier.tn', phone: '87654321', active: true },
  ];
  const suppliers = await Supplier.insertMany(suppliersData);
  console.log('✅ Suppliers inserted');

  // -----------------------------------------------------------------
  // 4️⃣ Products – one low‑stock, one normal
  // -----------------------------------------------------------------
  const catElec = categories.find(c => c.name === 'Électronique')._id;
  const suppA   = suppliers.find(s => s.name === 'Fournisseur A')._id;

  const productsData = [
    {
      name: 'Smartphone X',
      barcode: 'SMX-001',
      category: catElec,
      supplier: suppA,
      price: 350,
      purchasePrice: 250,
      stock: 3,               // low stock → will trigger an alert
      lowStockThreshold: 8,
      active: true,
    },
    {
      name: 'Tablette Y',
      barcode: 'TAB-002',
      category: catElec,
      supplier: suppA,
      price: 200,
      purchasePrice: 150,
      stock: 20,
      lowStockThreshold: 8,
      active: true,
    },
  ];

  await Product.insertMany(productsData);
  console.log('✅ Products inserted');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

run().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
