const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/init');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

function generateToken(user) {
  const payload = { id: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '24h' });
}

// Register (Admin or Fleet Owner can create drivers)
router.post('/register', authMiddleware, async (req, res) => {
  const { email, password, name, role, company_name, license_number } = req.body;
  if (!email || !password || !role) return res.status(400).json({ error: 'email, password and role required' });

  // Check permissions: admin can create anyone, fleet_owner can only create drivers
  if (req.user.role !== 'admin' && req.user.role !== 'fleet_owner') {
    return res.status(403).json({ error: `Insufficient permissions. Your role: ${req.user.role}. Required: admin or fleet_owner` });
  }
  
  if (req.user.role === 'fleet_owner' && role !== 'driver') {
    return res.status(403).json({ error: 'Fleet owners can only create driver accounts' });
  }

  // Check if user exists
  db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(409).json({ error: 'User already exists' });

    const hash = await bcrypt.hash(password, 10);
    const user_id = uuidv4();
    
    db.run(
      'INSERT INTO users (id, email, password_hash, name, role, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, email, hash, name || '', role, 1],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });

        // Role-specific setup
        if (role === 'fleet_owner' && company_name) {
          const company_id = uuidv4();
          db.run(
            'INSERT INTO companies (id, owner_user_id, name) VALUES (?, ?, ?)',
            [company_id, user_id, company_name]
          );
        } else if (role === 'driver' && license_number) {
          const profile_id = uuidv4();
          db.run(
            'INSERT INTO driver_profiles (id, user_id, license_number, license_expiry, experience_years) VALUES (?, ?, ?, ?, ?)',
            [profile_id, user_id, license_number, null, 0]
          );
        }

        res.status(201).json({ 
          message: 'User created successfully',
          user: { id: user_id, email, role, name: name || '' } 
        });
      }
    );
  });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  });
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  db.get('SELECT id, email, name, role, is_verified, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });
});

// Update profile
router.put('/me', authMiddleware, (req, res) => {
  const { name, phone } = req.body;
  
  db.run(
    'UPDATE users SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name || null, phone || null, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true });
    }
  );
});

module.exports = router;
