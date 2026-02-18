const express = require('express');
const { db } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get messages for user
router.get('/', authMiddleware, (req, res) => {
  db.all(
    'SELECT * FROM messages WHERE sender_id = ? OR receiver_id = ? ORDER BY created_at DESC',
    [req.user.id, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// Get conversation with specific user
router.get('/conversation/:user_id', authMiddleware, (req, res) => {
  db.all(
    `SELECT * FROM messages 
     WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
     ORDER BY created_at DESC LIMIT 50`,
    [req.user.id, req.params.user_id, req.params.user_id, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// Send message
router.post('/', authMiddleware, (req, res) => {
  const { receiver_id, content, load_id } = req.body;
  
  if (!receiver_id || !content) {
    return res.status(400).json({ error: 'receiver_id and content required' });
  }

  const id = uuidv4();
  db.run(
    'INSERT INTO messages (id, sender_id, receiver_id, load_id, content, is_read) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.user.id, receiver_id, load_id || null, content, 0],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id, sender_id: req.user.id, receiver_id, content, is_read: 0 });
    }
  );
});

// Mark message as read
router.patch('/:id/read', authMiddleware, (req, res) => {
  db.run(
    'UPDATE messages SET is_read = 1 WHERE id = ? AND receiver_id = ?',
    [req.params.id, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true });
    }
  );
});

// Get unread count
router.get('/unread/count', authMiddleware, (req, res) => {
  db.get(
    'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0',
    [req.user.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ unread_count: row.count || 0 });
    }
  );
});

module.exports = router;
