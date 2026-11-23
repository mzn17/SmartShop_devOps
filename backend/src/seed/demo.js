/**
 * Jeu de données de démonstration SmartStore.
 *
 * Utilisation :
 *   cd backend
 *   npm run seed
 *
 * Le script est idempotent : il met à jour les comptes de démonstration,
 * crée les catégories / fournisseurs / produits manquants, puis ajoute
 * quelques ventes uniquement si la collection `sales` est vide.
 */
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const StockMovement = require('../models/StockMovement');
const { nextInvoiceNumber } = require('../utils/sequence');

const USERS = [
  { name: 'Administrateur SmartStore', email: 'admin@smartstore.tn', password: 'admin123', role: 'admin' },
  { name: 'Gestionnaire de stock', email: 'gestion@smartstore.tn', password: 'gestion123', role: 'gestionnaire' },
  { name: 'Caissier SmartStore', email: 'caisse@smartstore.tn', password: 'caisse123', role: 'caissier' },
];

const CATEGORIES = [
  { name: 'Alimentation', description: 'Produits alimentaires du quotidien' },
  { name: 'Boissons', description: 'Eaux, jus et boissons fraîches' },
  { name: 'Hygiène', description: 'Produits d’hygiène et de soin' },
  { name: 'Entretien', description: 'Produits ménagers' },
];

const SUPPLIERS = [
  { name: 'Poulina Distribution', contactName: 'Karim Ben Salah', email: 'contact@poulina.tn', phone: '+216 71 000 101', address: 'Tunis' },
  { name: 'Société Délice', contactName: 'Sonia Trabelsi', email: 'contact@delice.tn', phone: '+216 71 000 202', address: 'Sfax' },
  { name: 'SOTUBI', contactName: 'Mohamed Ali', email: 'contact@sotubi.tn', phone: '+216 72 000 303', address: 'Nabeul' },
];

const PRODUCTS = [
  { name: 'Eau minérale 1.5L', barcode: '6191234500011', category: 'Boissons', supplier: 'SOTUBI', price: 0.7, purchasePrice: 0.45, stock: 42, lowStockThreshold: 8 },
  { name: 'Jus d’orange 1L', barcode: '6191234500028', category: 'Boissons', supplier: 'Société Délice', price: 2.4, purchasePrice: 1.65, stock: 18, lowStockThreshold: 8 },
  { name: 'Lait demi-écrémé 1L', barcode: '6191234500035', category: 'Alimentation', supplier: 'Société Délice', price: 1.6, purchasePrice: 1.1, stock: 6, lowStockThreshold: 8 },
  { name: 'Pain de mie complet', barcode: '6191234500042', category: 'Alimentation', supplier: 'Poulina Distribution', price: 2.1, purchasePrice: 1.35, stock: 12, lowStockThreshold: 8 },
  { name: 'Huile d’olive 1L', barcode: '6191234500059', category: 'Alimentation', supplier: 'Poulina Distribution', price: 14.5, purchasePrice: 11.2, stock: 9, lowStockThreshold: 6 },
  { name: 'Savon de Marseille', barcode: '6191234500066', category: 'Hygiène', supplier: 'SOTUBI', price: 3.2, purchasePrice: 2.1, stock: 25, lowStockThreshold: 8 },
  { name: 'Dentifrice menthe', barcode: '6191234500073', category: 'Hygiène', supplier: 'SOTUBI', price: 4.8, purchasePrice: 3.2, stock: 4, lowStockThreshold: 8 },
  { name: 'Détergent lessive 2L', barcode: '6191234500080', category: 'Entretien', supplier: 'Poulina Distribution', price: 8.9, purchasePrice: 6.4, stock: 15, lowStockThreshold: 8 },
  { name: 'Éponge vaisselle', barcode: '6191234500097', category: 'Entretien', supplier: 'SOTUBI', price: 1.2, purchasePrice: 0.6, stock: 0, lowStockThreshold: 8 },
  { name: 'Café moulu 250g', barcode: '6191234500103', category: 'Alimentation', supplier: 'Poulina Distribution', price: 7.4, purchasePrice: 5.1, stock: 7, lowStockThreshold: 8 },
];

async function upsertUser({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return User.findOneAndUpdate(
    { email },
    { $set: { name, passwordHash, role, active: true } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartstore';
  await mongoose.connect(uri);
  console.log(`Connecté à MongoDB (${mongoose.connection.name})`);

  const users = {};
  for (const item of USERS) {
    users[item.role] = await upsertUser(item);
    console.log(`Compte ${item.role.padEnd(12)} : ${item.email} / ${item.password}`);
  }

  for (const item of CATEGORIES) {
    await Category.findOneAndUpdate(
      { name: item.name },
      { $setOnInsert: item },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  for (const item of SUPPLIERS) {
    await Supplier.findOneAndUpdate(
      { name: item.name },
      { $setOnInsert: { ...item, active: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const categories = await Category.find();
  const suppliers = await Supplier.find();
  const categoryByName = new Map(categories.map((item) => [item.name, item._id]));
  const supplierByName = new Map(suppliers.map((item) => [item.name, item._id]));

  for (const item of PRODUCTS) {
    const existing = await Product.findOne({ barcode: item.barcode });
    const payload = {
      name: item.name,
      barcode: item.barcode,
      category: categoryByName.get(item.category) || null,
      supplier: supplierByName.get(item.supplier) || null,
      price: item.price,
      purchasePrice: item.purchasePrice,
      lowStockThreshold: item.lowStockThreshold,
      active: true,
    };

    const product = await Product.findOneAndUpdate(
      { barcode: item.barcode },
      existing
        ? { $set: payload }
        : { $set: payload, $setOnInsert: { stock: item.stock } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (!existing && item.stock > 0) {
      await StockMovement.create({
        product: product._id,
        type: 'entree',
        quantity: item.stock,
        reason: 'Stock initial (jeu de démonstration)',
        user: users.gestionnaire?._id,
      });
    }
  }

  const productCount = await Product.countDocuments();
  const saleCount = await Sale.countDocuments();

  if (saleCount === 0) {
    const cashier = users.caissier;
    const catalogue = await Product.find({ active: true, stock: { $gt: 0 } }).limit(6);
    const baskets = [
      { payment: 'especes', lines: [0, 2] },
      { payment: 'carte', lines: [1, 3, 5] },
      { payment: 'especes', lines: [4] },
    ];

    for (const basket of baskets) {
      const lines = basket.lines
        .map((index) => catalogue[index])
        .filter(Boolean)
        .map((product) => ({
          product,
          quantity: 1 + (product.stock > 10 ? 1 : 0),
        }))
        .filter((line) => line.product.stock >= line.quantity);

      if (!lines.length) continue;

      const saleLines = lines.map(({ product, quantity }) => ({
        product: product._id,
        name: product.name,
        quantity,
        price: product.price,
      }));

      const items = saleLines.reduce((total, line) => total + line.quantity, 0);
      const total = Number(
        saleLines.reduce((sum, line) => sum + line.price * line.quantity, 0).toFixed(3)
      );

      await Sale.create({
        invoice: await nextInvoiceNumber(),
        cashier: cashier._id,
        date: new Date(Date.now() - Math.floor(Math.random() * 5) * 86400000),
        items,
        total,
        payment: basket.payment,
        status: 'validee',
        lines: saleLines,
      });

      for (const line of lines) {
        await Product.updateOne(
          { _id: line.product._id },
          { $inc: { stock: -line.quantity } }
        );
        await StockMovement.create({
          product: line.product._id,
          type: 'sortie',
          quantity: line.quantity,
          reason: 'Vente de démonstration',
          user: cashier._id,
        });
      }
    }

    console.log('Ventes de démonstration créées.');
  }

  console.log(`\nTerminé : ${productCount} produit(s), ${await Sale.countDocuments()} vente(s).`);
  console.log('Comptes de démonstration prêts (voir README).');
}

seed()
  .catch((error) => {
    console.error('Erreur pendant le seed :', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
