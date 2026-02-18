const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/init');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Create a new dispute (any authenticated business user)
router.post('/', authMiddleware, (req, res) => {
  const { trip_id, load_id, against_user_id, reason } = req.body || {};

  if (!reason) {
    return res.status(400).json({ error: 'reason is required' });
  }

  const id = uuidv4();

  db.run(
    `INSERT INTO disputes (id, trip_id, load_id, raised_by_id, against_user_id, reason, status)
     VALUES (?, ?, ?, ?, ?, ?, 'open')`,
    [id, trip_id || null, load_id || null, req.user.id, against_user_id || null, reason],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id, trip_id, load_id, raised_by_id: req.user.id, against_user_id, reason, status: 'open' });
    }
  );
});

// List disputes (current user sees own; admin sees all, with optional status filter)
router.get('/', authMiddleware, (req, res) => {
  const { status } = req.query;

  if (req.user.role === 'admin') {
    const params = [];
    let where = '';
    if (status) {
      where = 'WHERE status = ?';
      params.push(status);
    }
    db.all(
      `SELECT * FROM disputes ${where} ORDER BY created_at DESC`,
      params,
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
      }
    );
  } else {
    db.all(
      `SELECT * FROM disputes WHERE raised_by_id = ? ORDER BY created_at DESC`,
      [req.user.id],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
      }
    );
  }
});

// Get single dispute
router.get('/:id', authMiddleware, (req, res) => {
  db.get(
    'SELECT * FROM disputes WHERE id = ?',
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Dispute not found' });

      // Non-admins can only see their own disputes
      if (req.user.role !== 'admin' && row.raised_by_id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      res.json(row);
    }
  );
});

// Admin resolves / updates dispute
router.post('/:id/resolve', authMiddleware, requireRole('admin'), (req, res) => {
  const { status, resolution } = req.body || {};
  if (!status || !['open', 'in_review', 'resolved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'valid status is required' });
  }

  db.run(
    `UPDATE disputes
     SET status = ?, resolution = COALESCE(?, resolution), updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [status, resolution || null, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Dispute not found' });
      res.json({ ok: true });
    }
  );
});

module.exports = router;

