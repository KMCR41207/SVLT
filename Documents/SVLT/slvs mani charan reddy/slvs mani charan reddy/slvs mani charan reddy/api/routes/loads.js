const express = require('express');
const { db } = require('../db/init');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all loads with filters & search
router.get('/', authMiddleware, (req, res) => {
  const { pickup, delivery, weight_min, weight_max, price_min, price_max, status } = req.query;
  let query = 'SELECT * FROM loads WHERE 1=1';
  const params = [];

  if (pickup) {
    query += ' AND pickup_location LIKE ?';
    params.push(`%${pickup}%`);
  }
  if (delivery) {
    query += ' AND delivery_location LIKE ?';
    params.push(`%${delivery}%`);
  }
  if (weight_min) {
    query += ' AND weight_tons >= ?';
    params.push(parseFloat(weight_min));
  }
  if (weight_max) {
    query += ' AND weight_tons <= ?';
    params.push(parseFloat(weight_max));
  }
  if (price_min) {
    query += ' AND price_fixed >= ?';
    params.push(parseFloat(price_min));
  }
  if (price_max) {
    query += ' AND price_fixed <= ?';
    params.push(parseFloat(price_max));
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Get load by ID
router.get('/:id', authMiddleware, (req, res) => {
  db.get('SELECT * FROM loads WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Load not found' });
    res.json(row);
  });
});

// Create load (shipper only)
router.post('/', authMiddleware, requireRole('shipper'), (req, res) => {
  const { title, goods_type, weight_tons, pickup_location, delivery_location, pickup_window_start, price_fixed, bidding_enabled } = req.body;
  
  if (!title || !weight_tons || !pickup_location || !delivery_location) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const id = uuidv4();
  db.run(
    `INSERT INTO loads (id, shipper_id, title, goods_type, weight_tons, pickup_location, delivery_location, pickup_window_start, price_fixed, bidding_enabled, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.user.id, title, goods_type, weight_tons, pickup_location, delivery_location, pickup_window_start || new Date(), price_fixed || null, bidding_enabled !== false ? 1 : 0, 'open'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id, shipper_id: req.user.id, title, goods_type, weight_tons, pickup_location, delivery_location, status: 'open' });
    }
  );
});

// Update load (shipper only)
router.put('/:id', authMiddleware, requireRole('shipper'), (req, res) => {
  const { status, price_fixed } = req.body;
  
  db.run(
    'UPDATE loads SET status = ?, price_fixed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND shipper_id = ?',
    [status || null, price_fixed || null, req.params.id, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Load not found or unauthorized' });
      res.json({ ok: true });
    }
  );
});

// Place bid on load
router.post('/:id/bids', authMiddleware, requireRole('driver', 'fleet_owner'), (req, res) => {
  const { proposed_price, message } = req.body;
  if (!proposed_price) return res.status(400).json({ error: 'proposed_price required' });

  const bid_id = uuidv4();
  db.run(
    'INSERT INTO bids (id, load_id, bidder_id, proposed_price, message, status) VALUES (?, ?, ?, ?, ?, ?)',
    [bid_id, req.params.id, req.user.id, proposed_price, message || '', 'pending'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: bid_id, load_id: req.params.id, bidder_id: req.user.id, proposed_price, status: 'pending' });
    }
  );
});

// Get bids for load
router.get('/:id/bids', authMiddleware, (req, res) => {
  db.all('SELECT * FROM bids WHERE load_id = ? ORDER BY created_at DESC', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Accept bid / Assign load
router.post('/:id/assign', authMiddleware, requireRole('shipper', 'admin'), (req, res) => {
  const { truck_id, driver_id, bid_id } = req.body;
  if (!truck_id || !driver_id) return res.status(400).json({ error: 'truck_id and driver_id required' });

  db.run(
    'UPDATE loads SET status = ?, assigned_truck_id = ?, assigned_driver_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ['assigned', truck_id, driver_id, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Load not found' });

      // If bid_id provided, mark it accepted
      if (bid_id) {
        db.run('UPDATE bids SET status = ? WHERE id = ?', ['accepted', bid_id], (err) => {
          if (err) console.error(err);
        });
      }

      res.json({ ok: true });
    }
  );
});

module.exports = router;
