const express = require('express');
const { db } = require('../db/init');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all trips for user
router.get('/', authMiddleware, (req, res) => {
  const query = req.user.role === 'admin'
    ? 'SELECT * FROM trips ORDER BY created_at DESC'
    : 'SELECT * FROM trips WHERE driver_id = ? OR truck_id IN (SELECT id FROM trucks WHERE company_id = (SELECT id FROM companies WHERE owner_user_id = ?)) ORDER BY created_at DESC';
  
  const params = req.user.role === 'admin' ? [] : [req.user.id, req.user.id];
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Get trip by ID
router.get('/:id', authMiddleware, (req, res) => {
  db.get('SELECT * FROM trips WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Trip not found' });
    res.json(row);
  });
});

// Create trip (on load assignment)
router.post('/', authMiddleware, requireRole('shipper', 'admin'), (req, res) => {
  const { load_id, truck_id, driver_id } = req.body;
  if (!load_id || !truck_id || !driver_id) {
    return res.status(400).json({ error: 'load_id, truck_id, driver_id required' });
  }

  const id = uuidv4();
  db.run(
    'INSERT INTO trips (id, load_id, truck_id, driver_id, status) VALUES (?, ?, ?, ?, ?)',
    [id, load_id, truck_id, driver_id, 'assigned'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id, load_id, truck_id, driver_id, status: 'assigned' });
    }
  );
});

// Update trip status (driver)
router.patch('/:id/status', authMiddleware, requireRole('driver'), (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });

  const now = new Date().toISOString();
  let updateQuery = 'UPDATE trips SET status = ?';
  const params = [status];

  if (status === 'picked_up') {
    updateQuery += ', pickup_time = ?';
    params.push(now);
  } else if (status === 'delivered') {
    updateQuery += ', delivery_time = ?';
    params.push(now);
  }

  updateQuery += ' WHERE id = ? AND driver_id = ?';
  params.push(req.params.id);
  params.push(req.user.id);

  db.run(updateQuery, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Trip not found or unauthorized' });

    // Update load status when trip is delivered
    if (status === 'delivered') {
      db.run('UPDATE loads SET status = ? WHERE id = (SELECT load_id FROM trips WHERE id = ?)', ['delivered', req.params.id], (err) => {
        if (err) console.error(err);
      });
    }

    res.json({ ok: true });
  });
});

// Upload proof of delivery
router.post('/:id/pod', authMiddleware, requireRole('driver'), (req, res) => {
  const { file_ref, notes } = req.body;
  if (!file_ref) return res.status(400).json({ error: 'file_ref required' });

  db.run(
    'INSERT INTO documents (id, owner_type, owner_id, doc_type, file_ref) VALUES (?, ?, ?, ?, ?)',
    [uuidv4(), 'trip', req.params.id, 'proof_of_delivery', file_ref],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, message: 'Proof of delivery uploaded' });
    }
  );
});

// Get trip info with load details
router.get('/:id/details', authMiddleware, (req, res) => {
  db.get(`
    SELECT t.*, l.title, l.goods_type, l.weight_tons, l.pickup_location, l.delivery_location, tr.registration_number
    FROM trips t
    LEFT JOIN loads l ON t.load_id = l.id
    LEFT JOIN trucks tr ON t.truck_id = tr.id
    WHERE t.id = ?
  `, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Trip not found' });
    res.json(row);
  });
});

module.exports = router;
