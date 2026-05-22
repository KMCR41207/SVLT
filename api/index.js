require('dotenv').config();
process.removeAllListeners('warning'); // suppress deprecation warnings
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db/init');
const authRoutes = require('./routes/auth');
const trucksRoutes = require('./routes/trucks');
const loadsRoutes = require('./routes/loads');
const tripsRoutes = require('./routes/trips');
const paymentsRoutes = require('./routes/payments');
const messagesRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const disputesRoutes = require('./routes/disputes');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
initDB();

app.use(cors());
app.use(bodyParser.json());

// API routes (must come before static files)
app.use('/api/auth', authRoutes);
app.use('/api/trucks', trucksRoutes);
app.use('/api/loads', loadsRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/disputes', disputesRoutes);

// Serve static files from parent directory (frontend files)
app.use(express.static(path.join(__dirname, '..')));

// ── Redirects for old/deleted pages → new enterprise pages
const redirects = {
  '/driver.html':      '/driver-enterprise.html',
  '/fleet-owner.html': '/fleet-owner-enterprise.html',
  '/admin.html':       '/admin-enterprise.html',
  '/auth.html':        '/auth-enterprise.html',
  '/landing.html':     '/landing-enterprise.html',
  '/register.html':    '/register-enterprise.html',
};
Object.entries(redirects).forEach(([from, to]) => {
  app.get(from, (req, res) => res.redirect(301, to));
});

// Serve landing-enterprise.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'landing-enterprise.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 FleetFlow server running at http://localhost:${PORT}`);
  console.log(`📚 API endpoints available at http://localhost:${PORT}/api/`);
  console.log(`🌐 Frontend available at http://localhost:${PORT}/`);
});
