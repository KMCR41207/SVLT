const express = require('express');
const { db } = require('../db/init');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all trucks (with filters)
router.get('/', authMiddleware, (req, res) => {
  const { company_id, status, capacity } = req.query;
  let query = 'SELECT * FROM trucks WHERE 1=1';
  const params = [];

  if (company_id) {
    query += ' AND company_id = ?';
    params.push(company_id);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (capacity) {
    query += ' AND capacity_tons >= ?';
    params.push(parseFloat(capacity));
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Get truck by ID
router.get('/:id', authMiddleware, (req, res) => {
  db.get('SELECT * FROM trucks WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Truck not found' });
    res.json(row);
  });
});

// Create truck (fleet owner only)
router.post('/', authMiddleware, requireRole('fleet_owner'), (req, res) => {
  const { registration_number, type, capacity_tons } = req.body;
  if (!registration_number || !type || !capacity_tons) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Find company owned by user
  db.get('SELECT id FROM companies WHERE owner_user_id = ?', [req.user.id], (err, company) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (!company) {
      // Auto-create company if it doesn't exist
      const companyId = uuidv4();
      db.run(
        'INSERT INTO companies (id, owner_user_id, name) VALUES (?, ?, ?)',
        [companyId, req.user.id, 'My Fleet Company'],
        function(companyErr) {
          if (companyErr) return res.status(500).json({ error: 'Failed to create company: ' + companyErr.message });
          
          // Now create the truck
          createTruck(companyId);
        }
      );
    } else {
      createTruck(company.id);
    }

    function createTruck(companyId) {
      const id = uuidv4();
      db.run(
        'INSERT INTO trucks (id, company_id, registration_number, type, capacity_tons, status) VALUES (?, ?, ?, ?, ?, ?)',
        [id, companyId, registration_number, type, capacity_tons, 'available'],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(409).json({ error: 'Registration number already exists' });
            }
            return res.status(500).json({ error: err.message });
          }
          res.status(201).json({ id, company_id: companyId, registration_number, type, capacity_tons, status: 'available' });
        }
      );
    }
  });
});

// Update truck (fleet owner only)
router.put('/:id', authMiddleware, requireRole('fleet_owner'), (req, res) => {
  const { status, assigned_driver_id } = req.body;
  
  db.run(
    'UPDATE trucks SET status = ?, assigned_driver_id = ? WHERE id = ?',
    [status || null, assigned_driver_id || null, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Truck not found' });
      res.json({ ok: true });
    }
  );
});

// Assign driver to truck
router.post('/:id/assign-driver', authMiddleware, requireRole('fleet_owner'), (req, res) => {
  const { driver_id } = req.body;
  if (!driver_id) return res.status(400).json({ error: 'driver_id required' });

  db.run(
    'UPDATE trucks SET assigned_driver_id = ? WHERE id = ?',
    [driver_id, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Truck not found' });
      res.json({ ok: true });
    }
  );
});

module.exports = router;
