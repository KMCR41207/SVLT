const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '../../fleetflow.db');
const db = new sqlite3.Database(dbPath);

async function ensureUser(email, name, password, role) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) return reject(err);
      if (row) return resolve({ existed: true, id: row.id });

      const id = uuidv4();
      const password_hash = await bcrypt.hash(password, 10);
      db.run(
        `INSERT INTO users (id, email, password_hash, name, role, is_verified) VALUES (?, ?, ?, ?, ?, 1)`,
        [id, email, password_hash, name, role],
        function (insErr) {
          if (insErr) return reject(insErr);
          resolve({ existed: false, id });
        }
      );
    });
  });
}

async function seed() {
  try {
    const demo = [
      { email: 'driver@test.com', name: 'Demo Driver', password: 'pass123', role: 'driver' },
      { email: 'shipper@test.com', name: 'Demo Shipper', password: 'pass123', role: 'shipper' },
      { email: 'owner@test.com', name: 'Demo Fleet Owner', password: 'pass123', role: 'fleet_owner' },
      { email: 'admin@test.com', name: 'Demo Admin', password: 'pass123', role: 'admin' }
    ];

    for (const u of demo) {
      const res = await ensureUser(u.email, u.name, u.password, u.role);
      if (res.existed) console.log(`- ${u.email} already exists (id=${res.id})`);
      else console.log(`+ Inserted ${u.email} (id=${res.id})`);
    }

    console.log('\nSeeding complete.');
    db.close();
  } catch (err) {
    console.error('Seeding error:', err);
    db.close();
    process.exit(1);
  }
}

seed();
