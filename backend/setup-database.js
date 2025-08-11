const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Create connection without specifying database first
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306
});

async function setupDatabase() {
  try {
    console.log('Connecting to MySQL server...');
    
    // Connect to MySQL server
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) {
          console.error('Error connecting to MySQL server:', err.message);
          reject(err);
          return;
        }
        console.log('Connected to MySQL server successfully');
        resolve();
      });
    });

    // Create database if it doesn't exist
    console.log('Creating database if it doesn\'t exist...');
    await new Promise((resolve, reject) => {
      connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'apartment_booking'}`, (err) => {
        if (err) {
          console.error('Error creating database:', err.message);
          reject(err);
          return;
        }
        console.log('Database created/verified successfully');
        resolve();
      });
    });

    // Use the database
    await new Promise((resolve, reject) => {
      connection.query(`USE ${process.env.DB_NAME || 'apartment_booking'}`, (err) => {
        if (err) {
          console.error('Error using database:', err.message);
          reject(err);
          return;
        }
        console.log('Using database:', process.env.DB_NAME || 'apartment_booking');
        resolve();
      });
    });

    // Drop existing indexes to avoid conflicts
    console.log('Cleaning up existing indexes...');
    const dropIndexes = [
      'DROP INDEX IF EXISTS idx_bookings_guest_id ON bookings',
      'DROP INDEX IF EXISTS idx_bookings_apartment_id ON bookings',
      'DROP INDEX IF EXISTS idx_bookings_dates ON bookings',
      'DROP INDEX IF EXISTS idx_bookings_status ON bookings',
      'DROP INDEX IF EXISTS idx_bookings_payment_status ON bookings',
      'DROP INDEX IF EXISTS idx_guests_phone ON guests',
      'DROP INDEX IF EXISTS idx_guests_email ON guests',
      'DROP INDEX IF EXISTS idx_audit_logs_entity ON audit_logs',
      'DROP INDEX IF EXISTS idx_audit_logs_user ON audit_logs',
      'DROP INDEX IF EXISTS idx_audit_logs_created ON audit_logs'
    ];

    for (const dropIndex of dropIndexes) {
      try {
        await new Promise((resolve) => {
          connection.query(dropIndex, (err) => {
            if (err) {
              console.log(`Note: ${err.message}`);
            }
            resolve();
          });
        });
      } catch (error) {
        // Ignore errors for dropping indexes
      }
    }

    // Read and execute schema file
    console.log('Reading schema file...');
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements and filter out problematic parts
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      .filter(stmt => !stmt.toLowerCase().includes('create index')); // Skip index creation for now

    console.log('Executing schema statements...');
    for (const statement of statements) {
      if (statement.trim()) {
        await new Promise((resolve, reject) => {
          connection.query(statement, (err) => {
            if (err) {
              console.error('Error executing statement:', err.message);
              console.error('Statement:', statement.substring(0, 100) + '...');
              // Don't reject for duplicate key errors, just log them
              if (err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_DUP_ENTRY') {
                console.log('Note: Skipping duplicate entry/index');
                resolve();
              } else {
                reject(err);
              }
              return;
            }
            resolve();
          });
        });
      }
    }

    // Create indexes separately
    console.log('Creating indexes...');
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings(guest_id)',
      'CREATE INDEX IF NOT EXISTS idx_bookings_apartment_id ON bookings(apartment_id)',
      'CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(from_datetime, to_datetime)',
      'CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(booking_status)',
      'CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status)',
      'CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone)',
      'CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)'
    ];

    for (const createIndex of createIndexes) {
      try {
        await new Promise((resolve) => {
          connection.query(createIndex, (err) => {
            if (err) {
              console.log(`Note: Index creation skipped - ${err.message}`);
            }
            resolve();
          });
        });
      } catch (error) {
        // Ignore index creation errors
      }
    }

    // Check if default user exists, if not create it
    console.log('Checking for default user...');
    const checkUser = await new Promise((resolve, reject) => {
      connection.query('SELECT COUNT(*) as count FROM users WHERE email = ?', ['admin@example.com'], (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(results[0].count);
      });
    });

    if (checkUser === 0) {
      console.log('Creating default admin user...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync('password123', 12);
      
      await new Promise((resolve, reject) => {
        connection.query(
          'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
          ['Super Admin', 'admin@example.com', hashedPassword, 'super_admin'],
          (err) => {
            if (err) {
              console.error('Error creating default user:', err.message);
              reject(err);
              return;
            }
            console.log('Default admin user created successfully');
            resolve();
          }
        );
      });
    } else {
      console.log('Default admin user already exists');
    }

    console.log('Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Copy env.example to .env and update your database credentials');
    console.log('2. Run: npm run dev');
    console.log('\nDefault login credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: password123');

  } catch (error) {
    console.error('Database setup failed:', error.message);
    process.exit(1);
  } finally {
    connection.end();
  }
}

setupDatabase();
