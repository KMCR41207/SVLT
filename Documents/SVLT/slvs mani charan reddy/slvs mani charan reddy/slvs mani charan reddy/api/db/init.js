const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../fleetflow.db');
const db = new sqlite3.Database(dbPath);

function initDB() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      phone TEXT,
      role TEXT CHECK(role IN ('driver', 'fleet_owner', 'shipper', 'admin')),
      is_verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Companies table
    db.run(`CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      gst_vat_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(owner_user_id) REFERENCES users(id)
    )`);

    // Trucks table
    db.run(`CREATE TABLE IF NOT EXISTS trucks (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      registration_number TEXT UNIQUE NOT NULL,
      type TEXT,
      capacity_tons REAL,
      status TEXT CHECK(status IN ('available', 'on_trip', 'maintenance')),
      assigned_driver_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id),
      FOREIGN KEY(assigned_driver_id) REFERENCES users(id)
    )`);

    // Driver profiles
    db.run(`CREATE TABLE IF NOT EXISTS driver_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      license_number TEXT NOT NULL,
      license_expiry DATE,
      experience_years INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Loads (jobs)
    db.run(`CREATE TABLE IF NOT EXISTS loads (
      id TEXT PRIMARY KEY,
      shipper_id TEXT NOT NULL,
      title TEXT NOT NULL,
      goods_type TEXT,
      weight_tons REAL,
      pickup_location TEXT,
      delivery_location TEXT,
      pickup_window_start DATETIME,
      pickup_window_end DATETIME,
      status TEXT CHECK(status IN ('open', 'assigned', 'in_progress', 'delivered', 'cancelled')),
      assigned_truck_id TEXT,
      assigned_driver_id TEXT,
      price_fixed REAL,
      bidding_enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(shipper_id) REFERENCES users(id),
      FOREIGN KEY(assigned_truck_id) REFERENCES trucks(id),
      FOREIGN KEY(assigned_driver_id) REFERENCES users(id)
    )`);

    // Bids/Applications
    db.run(`CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      load_id TEXT NOT NULL,
      bidder_id TEXT NOT NULL,
      proposed_price REAL,
      message TEXT,
      status TEXT CHECK(status IN ('pending', 'accepted', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(load_id) REFERENCES loads(id),
      FOREIGN KEY(bidder_id) REFERENCES users(id)
    )`);

    // Trips
    db.run(`CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      load_id TEXT UNIQUE NOT NULL,
      truck_id TEXT NOT NULL,
      driver_id TEXT NOT NULL,
      start_time DATETIME,
      pickup_time DATETIME,
      delivery_time DATETIME,
      status TEXT CHECK(status IN ('assigned', 'picked_up', 'in_transit', 'delivered')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(load_id) REFERENCES loads(id),
      FOREIGN KEY(truck_id) REFERENCES trucks(id),
      FOREIGN KEY(driver_id) REFERENCES users(id)
    )`);

    // Payments
    db.run(`CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      load_id TEXT NOT NULL,
      payer_id TEXT NOT NULL,
      payee_id TEXT NOT NULL,
      amount REAL,
      status TEXT CHECK(status IN ('pending', 'paid', 'failed')),
      method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(load_id) REFERENCES loads(id),
      FOREIGN KEY(payer_id) REFERENCES users(id),
      FOREIGN KEY(payee_id) REFERENCES users(id)
    )`);

    // Documents
    db.run(`CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      owner_type TEXT,
      owner_id TEXT,
      doc_type TEXT,
      file_ref TEXT,
      verified INTEGER DEFAULT 0,
      expiry_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Messages
   db.run(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      load_id TEXT,
      content TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(sender_id) REFERENCES users(id),
      FOREIGN KEY(receiver_id) REFERENCES users(id),
      FOREIGN KEY(load_id) REFERENCES loads(id)
    )`);

    // Maintenance records
    db.run(`CREATE TABLE IF NOT EXISTS maintenance (
      id TEXT PRIMARY KEY,
      truck_id TEXT NOT NULL,
      description TEXT,
      scheduled_date DATE,
      completed_date DATE,
      cost REAL,
      status TEXT CHECK(status IN ('scheduled', 'completed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(truck_id) REFERENCES trucks(id)
    )`);

    // Disputes (for loads/trips/payments)
    db.run(`CREATE TABLE IF NOT EXISTS disputes (
      id TEXT PRIMARY KEY,
      trip_id TEXT,
      load_id TEXT,
      raised_by_id TEXT NOT NULL,
      against_user_id TEXT,
      reason TEXT NOT NULL,
      status TEXT CHECK(status IN ('open', 'in_review', 'resolved', 'rejected')) DEFAULT 'open',
      resolution TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(trip_id) REFERENCES trips(id),
      FOREIGN KEY(load_id) REFERENCES loads(id),
      FOREIGN KEY(raised_by_id) REFERENCES users(id),
      FOREIGN KEY(against_user_id) REFERENCES users(id)
    )`);

    // Dispute attachments (e.g. POD images, documents)
    db.run(`CREATE TABLE IF NOT EXISTS dispute_attachments (
      id TEXT PRIMARY KEY,
      dispute_id TEXT NOT NULL,
      file_ref TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(dispute_id) REFERENCES disputes(id)
    )`);

    // Commission configuration (simple percentage-based)
    db.run(`CREATE TABLE IF NOT EXISTS commission_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      percentage REAL NOT NULL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('✓ Database initialized successfully');
  });
}

module.exports = { db, initDB };
