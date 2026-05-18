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

// Register — public endpoint (no auth required for self-registration)
// Admin/Fleet Owner can also call this with a token to create users with specific roles
router.post('/register', async (req, res) => {
  const { email, password, name, role, company_name, license_number, phone } = req.body;
  if (!email || !password || !role) return res.status(400).json({ error: 'email, password and role required' });

  // Determine caller's role (if authenticated)
  let callerRole = null;
  const auth = req.headers.authorization;
  if (auth) {
    const parts = auth.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(parts[1], process.env.JWT_SECRET || 'dev_secret');
        callerRole = decoded.role;
      } catch (e) { /* ignore invalid token */ }
    }
  }

  // Restrict role creation: unauthenticated users can only create shipper accounts
  const allowedRoles = ['driver', 'fleet_owner', 'shipper', 'admin'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (!callerRole && role !== 'shipper') {
    return res.status(403).json({ error: 'Only administrators can create non-shipper accounts' });
  }
  if (callerRole && callerRole !== 'admin' && callerRole !== 'fleet_owner') {
    return res.status(403).json({ error: `Insufficient permissions. Your role: ${callerRole}. Required: admin or fleet_owner` });
  }
  if (callerRole === 'fleet_owner' && role !== 'driver') {
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
            [company_id, user_id, company_name],
            function(compErr) { if (compErr) console.error('Company insert error:', compErr.message); }
          );
        } else if (role === 'driver' && license_number) {
          const profile_id = uuidv4();
          db.run(
            'INSERT INTO driver_profiles (id, user_id, license_number, license_expiry, experience_years) VALUES (?, ?, ?, ?, ?)',
            [profile_id, user_id, license_number, null, 0],
            function(profErr) { if (profErr) console.error('Driver profile insert error:', profErr.message); }
          );
        }

        // Generate token so caller can log in immediately
        const newUser = { id: user_id, email, role, name: name || '' };
        const token = generateToken(newUser);

        res.status(201).json({ 
          message: 'User created successfully',
          token,
          user: newUser
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
    'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name || null, phone || null, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true });
    }
  );
});

module.exports = router;
