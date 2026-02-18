const express = require('express');
const { db } = require('../db/init');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all payments for user
router.get('/', authMiddleware, (req, res) => {
  const query = req.user.role === 'admin'
    ? 'SELECT * FROM payments ORDER BY created_at DESC'
    : 'SELECT * FROM payments WHERE payer_id = ? OR payee_id = ? ORDER BY created_at DESC';
  
  const params = req.user.role === 'admin' ? [] : [req.user.id, req.user.id];
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Get payment by ID
router.get('/:id', authMiddleware, (req, res) => {
  db.get('SELECT * FROM payments WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Payment not found' });
    res.json(row);
  });
});

// Initiate payment (shipper to driver/company)
router.post('/charge', authMiddleware, requireRole('shipper'), (req, res) => {
  const { load_id, payee_id, amount, method } = req.body;
  
  if (!load_id || !payee_id || !amount) {
    return res.status(400).json({ error: 'load_id, payee_id, amount required' });
  }

  const id = uuidv4();
  db.run(
    'INSERT INTO payments (id, load_id, payer_id, payee_id, amount, method, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, load_id, req.user.id, payee_id, amount, method || 'pending', 'pending'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ 
        id, 
        load_id, 
        payer_id: req.user.id, 
        payee_id, 
        amount, 
        status: 'pending',
        invoice: `INV-${id.substring(0, 8).toUpperCase()}`
      });
    }
  );
});

// Confirm payment
router.post('/:id/confirm', authMiddleware, (req, res) => {
  db.run(
    'UPDATE payments SET status = ? WHERE id = ?',
    ['paid', req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Payment not found' });
      res.json({ ok: true, message: 'Payment confirmed' });
    }
  );
});

// Get invoice for payment
router.get('/:id/invoice', authMiddleware, (req, res) => {
  db.get(`
    SELECT p.*, l.title as load_title, l.weight_tons,
           pu.name as payer_name, pe.name as payee_name
    FROM payments p
    LEFT JOIN loads l ON p.load_id = l.id
    LEFT JOIN users pu ON p.payer_id = pu.id
    LEFT JOIN users pe ON p.payee_id = pe.id
    WHERE p.id = ?
  `, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Invoice not found' });

    // Return invoice data formatted
    res.json({
      invoice_number: `INV-${row.id.substring(0, 8).toUpperCase()}`,
      date: row.created_at,
      payer: row.payer_name,
      payee: row.payee_name,
      load: row.load_title,
      weight: row.weight_tons,
      amount: row.amount,
      status: row.status,
      method: row.method
    });
  });
});

module.exports = router;
