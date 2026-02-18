const express = require('express');
const { db } = require('../db/init');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/users', authMiddleware, requireRole('admin'), (req, res) => {
  db.all('SELECT id, email, name, role, is_verified, created_at FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Get system reports (high level metrics)
router.get('/reports', authMiddleware, requireRole('admin'), (req, res) => {
  const reports = {};

  db.get('SELECT COUNT(*) as count FROM users', [], (err, users) => {
    reports.total_users = err ? 0 : users.count;

    db.get('SELECT COUNT(*) as count FROM trucks', [], (err, trucks) => {
      reports.total_trucks = err ? 0 : trucks.count;

      db.get('SELECT COUNT(*) as count FROM loads WHERE status = "open"', [], (err, open_loads) => {
        reports.open_loads = err ? 0 : open_loads.count;

        db.get('SELECT COUNT(*) as count FROM loads WHERE status = "delivered"', [], (err, completed) => {
          reports.completed_loads = err ? 0 : completed.count;

          // Count open disputes
          db.get('SELECT COUNT(*) as count FROM disputes WHERE status = "open"', [], (err, openDisputes) => {
            reports.open_disputes = err ? 0 : openDisputes.count;

            db.get('SELECT SUM(amount) as total FROM payments WHERE status = "paid"', [], (err, revenue) => {
              reports.total_revenue = err ? 0 : (revenue.total || 0);

              res.json(reports);
            });
          });
        });
      });
    });
  });
});

// List disputes for admin
router.get('/disputes', authMiddleware, requireRole('admin'), (req, res) => {
  const { status } = req.query;
  const params = [];
  let where = '';

  if (status) {
    where = 'WHERE d.status = ?';
    params.push(status);
  }

  db.all(
    `SELECT d.*, u.email as raised_by_email, a.email as against_email
     FROM disputes d
     LEFT JOIN users u ON d.raised_by_id = u.id
     LEFT JOIN users a ON d.against_user_id = a.id
     ${where}
     ORDER BY d.created_at DESC`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// Simple commission configuration (single active rule)
router.get('/commission', authMiddleware, requireRole('admin'), (req, res) => {
  db.get(
    'SELECT id, name, percentage, active, created_at FROM commission_rules WHERE active = 1 ORDER BY created_at DESC LIMIT 1',
    [],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.json({ percentage: 0, name: 'Default', active: 0 });
      res.json(row);
    }
  );
});

router.post('/commission', authMiddleware, requireRole('admin'), (req, res) => {
  const { name, percentage } = req.body || {};
  if (percentage == null || isNaN(percentage)) {
    return res.status(400).json({ error: 'percentage is required and must be a number' });
  }

  const id = require('uuid').v4();

  db.serialize(() => {
    db.run('UPDATE commission_rules SET active = 0', [], () => {
      db.run(
        'INSERT INTO commission_rules (id, name, percentage, active) VALUES (?, ?, ?, 1)',
        [id, name || 'Platform Commission', percentage],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.status(201).json({ id, name: name || 'Platform Commission', percentage, active: 1 });
        }
      );
    });
  });
});

// Verify user document (admin)
router.post('/users/:id/verify-document', authMiddleware, requireRole('admin'), (req, res) => {
  const { doc_id } = req.body;
  if (!doc_id) return res.status(400).json({ error: 'doc_id required' });

  db.run(
    'UPDATE documents SET verified = 1 WHERE id = ?',
    [doc_id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Document not found' });
      res.json({ ok: true });
    }
  );
});

// Suspend/activate user (admin)
router.post('/users/:id/suspend', authMiddleware, requireRole('admin'), (req, res) => {
  const { suspended } = req.body;
  
  db.run(
    'UPDATE users SET is_verified = ? WHERE id = ?',
    [suspended ? 0 : 1, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
      res.json({ ok: true, message: suspended ? 'User suspended' : 'User activated' });
    }
  );
});

// Get dashboard stats
router.get('/dashboard/stats', authMiddleware, (req, res) => {
  const stats = {};

  if (req.user.role === 'driver') {
    db.get('SELECT COUNT(*) as count FROM trips WHERE driver_id = ? AND status NOT IN ("delivered")', [req.user.id], (err, active) => {
      stats.active_trips = err ? 0 : active.count;

      db.get('SELECT COUNT(*) as count FROM trips WHERE driver_id = ? AND status = "delivered"', [req.user.id], (err, completed) => {
        stats.completed_trips = err ? 0 : completed.count;

        db.get('SELECT SUM(amount) as total FROM payments WHERE payee_id = ? AND status = "paid"', [req.user.id], (err, earnings) => {
          stats.total_earnings = err ? 0 : (earnings.total || 0);
          res.json(stats);
        });
      });
    });
  } else if (req.user.role === 'fleet_owner') {
    db.get('SELECT COUNT(*) as count FROM trucks WHERE company_id = (SELECT id FROM companies WHERE owner_user_id = ?)', [req.user.id], (err, trucks) => {
      stats.total_trucks = err ? 0 : trucks.count;

      db.get('SELECT COUNT(*) as count FROM trucks WHERE company_id = (SELECT id FROM companies WHERE owner_user_id = ?) AND status = "available"', [req.user.id], (err, available) => {
        stats.available_trucks = err ? 0 : available.count;

        db.get('SELECT COUNT(*) as count FROM loads WHERE assigned_driver_id IN (SELECT id FROM users WHERE id IN (SELECT assigned_driver_id FROM trucks WHERE company_id = (SELECT id FROM companies WHERE owner_user_id = ?))) AND status = "in_progress"', [req.user.id], (err, active_jobs) => {
          stats.active_jobs = err ? 0 : active_jobs.count;
          res.json(stats);
        });
      });
    });
  } else if (req.user.role === 'shipper') {
    db.get('SELECT COUNT(*) as count FROM loads WHERE shipper_id = ?', [req.user.id], (err, total) => {
      stats.total_loads = err ? 0 : total.count;

      db.get('SELECT COUNT(*) as count FROM loads WHERE shipper_id = ? AND status = "open"', [req.user.id], (err, open) => {
        stats.open_loads = err ? 0 : open.count;

        db.get('SELECT SUM(p.amount) as total FROM payments p JOIN loads l ON p.load_id = l.id WHERE l.shipper_id = ? AND p.status = "pending"', [req.user.id], (err, pending) => {
          stats.pending_payments = err ? 0 : (pending.total || 0);
          res.json(stats);
        });
      });
    });
  } else {
    res.json({});
  }
});

module.exports = router;
