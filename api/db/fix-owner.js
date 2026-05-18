const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '../../fleetflow.db');
const db = new sqlite3.Database(dbPath);

async function fixOwner() {
  try {
    // Get the owner user
    db.get('SELECT id, email FROM users WHERE email = ?', ['owner@test.com'], (err, user) => {
      if (err) {
        console.error('Error finding user:', err);
        db.close();
        return;
      }
      
      if (!user) {
        console.log('Owner user not found');
        db.close();
        return;
      }

      console.log('Found owner user:', user.email);

      // Check if company already exists
      db.get('SELECT id FROM companies WHERE owner_user_id = ?', [user.id], (err, company) => {
        if (err) {
          console.error('Error checking company:', err);
          db.close();
          return;
        }

        if (company) {
          console.log('Company already exists for owner');
          db.close();
          return;
        }

        // Create company for owner
        const companyId = uuidv4();
        db.run(
          'INSERT INTO companies (id, owner_user_id, name, address) VALUES (?, ?, ?, ?)',
          [companyId, user.id, 'Demo Fleet Company', '123 Fleet Street, Transport City'],
          function(err) {
            if (err) {
              console.error('Error creating company:', err);
            } else {
              console.log('✓ Created company for owner:', companyId);
            }
            db.close();
          }
        );
      });
    });
  } catch (err) {
    console.error('Error:', err);
    db.close();
  }
}

fixOwner();
