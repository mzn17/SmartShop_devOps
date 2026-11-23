// backend/src/seed/initialData.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');

async function run() {
  const { MONGODB_URI } = process.env;
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  // -----------------------------------------------------------------
  // 1. ADMIN USER
  // -----------------------------------------------------------------
  const adminExists = await User.findOne({ email: 'mzn17@gmail.com' });
  if (!adminExists) {
    const passwordHash = await bcrypt.hash('123456', 10);
    await User.create({
      name: 'mezen',
      email: 'mzn17@gmail.com',
      passwordHash,
      role: 'admin',
      active: true,
    });
    console.log('✅ Admin user created');
  }

  // -----------------------------------------------------------------
  // 2. CATEGORIES
  // -----------------------------------------------------------------
  const categories = await Category.insertMany([
    { name: 'Électronique', active: true },
    { name: 'Maison',       active: true },
    { name: 'Vêtements',    active: true },
  ]);
  console.log('✅ Categories inserted');

  // -----------------------------------------------------------------
  // 3. SUPPLIERS
  // -----------------------------------------------------------------
  const suppliers = await Supplier.insertMany([
    { name: 'Fournisseur A', email: 'a@supplier.tn', phone: '12345678', active: true },
    { name: 'Fournisseur B', email: 'b@supplier.tn', phone: '87654321', active: true },
  ]);
  console.log('✅ Suppliers inserted');

  // -----------------------------------------------------------------
  // 4. PRODUCTS (one low‑stock, one normal)
  // -----------------------------------------------------------------
  const catElec = categories.find(c => c.name === 'Électronique')._id;
  const suppA   = suppliers.find(s => s.name === 'Fournisseur A')._id;

  await Product.insertMany([
    {
      name: 'Smartphone X',
      barcode: 'SMX-001',
      category: catElec,
      supplier: suppA,
      price: 350,
      purchasePrice: 250,
      stock: 3,
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
  ]);
  console.log('✅ Products inserted');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});