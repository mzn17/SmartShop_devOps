const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const alertRoutes = require('./routes/alert.routes');
const categoryRoutes = require('./routes/category.routes');
const supplierRoutes = require('./routes/supplier.routes');
const userRoutes = require('./routes/user.routes');
const saleRoutes = require('./routes/sale.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const orderRoutes = require('./routes/order.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const stockRoutes = require('./routes/stock.routes');
const reportRoutes = require('./routes/report.routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

// ── Middlewares globaux ────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Routes API ─────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SmartStore API opérationnelle',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);

// ── Gestion des erreurs ────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
