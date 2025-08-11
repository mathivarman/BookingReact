const mysql = require('mysql2');
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

    // Create tables
    console.log('Creating tables...');
    
    // Users table
    await new Promise((resolve, reject) => {
      connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role ENUM('admin', 'super_admin') NOT NULL DEFAULT 'admin',
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table:', err.message);
          reject(err);
          return;
        }
        console.log('Users table created/verified');
        resolve();
      });
    });

    // Apartments table
    await new Promise((resolve, reject) => {
      connection.query(`
        CREATE TABLE IF NOT EXISTS apartments (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL,
          floor ENUM('ground', 'first', 'second') NULL,
          unit VARCHAR(50) NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating apartments table:', err.message);
          reject(err);
          return;
        }
        console.log('Apartments table created/verified');
        resolve();
      });
    });

    // Guests table
    await new Promise((resolve, reject) => {
      connection.query(`
        CREATE TABLE IF NOT EXISTS guests (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL,
          address TEXT NULL,
          phone VARCHAR(20) NOT NULL,
          email VARCHAR(100) NULL,
          guest_type ENUM('local', 'foreign') NOT NULL DEFAULT 'local',
          place_or_country VARCHAR(100) NULL,
          introduced ENUM('yes', 'no') NOT NULL DEFAULT 'no',
          introduced_by VARCHAR(100) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating guests table:', err.message);
          reject(err);
          return;
        }
        console.log('Guests table created/verified');
        resolve();
      });
    });

    // Pricing rules table
    await new Promise((resolve, reject) => {
      connection.query(`
        CREATE TABLE IF NOT EXISTS pricing_rules (
          id INT PRIMARY KEY AUTO_INCREMENT,
          rate_1_3 DECIMAL(10,2) NOT NULL COMMENT 'Rate for 1-3 days',
          rate_4_6 DECIMAL(10,2) NOT NULL COMMENT 'Rate for 4-6 days',
          rate_7_plus DECIMAL(10,2) NOT NULL COMMENT 'Rate for 7+ days',
          season_regular DECIMAL(3,2) NOT NULL DEFAULT 1.00 COMMENT 'Regular season multiplier',
          season_peak DECIMAL(3,2) NOT NULL DEFAULT 1.20 COMMENT 'Peak season multiplier',
          season_offpeak DECIMAL(3,2) NOT NULL DEFAULT 0.80 COMMENT 'Off-peak season multiplier',
          tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Tax percentage',
          currency VARCHAR(3) NOT NULL DEFAULT 'USD',
          effective_date DATE NOT NULL,
          updated_by INT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (updated_by) REFERENCES users(id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating pricing_rules table:', err.message);
          reject(err);
          return;
        }
        console.log('Pricing rules table created/verified');
        resolve();
      });
    });

    // Bookings table
    await new Promise((resolve, reject) => {
      connection.query(`
        CREATE TABLE IF NOT EXISTS bookings (
          id INT PRIMARY KEY AUTO_INCREMENT,
          guest_id INT NOT NULL,
          apartment_id INT NOT NULL,
          floor ENUM('ground', 'first', 'second') NULL,
          unit_no VARCHAR(50) NULL,
          from_datetime DATETIME NOT NULL,
          to_datetime DATETIME NOT NULL,
          days INT NOT NULL,
          season ENUM('regular', 'peak', 'offpeak') NOT NULL DEFAULT 'regular',
          base_rate DECIMAL(10,2) NOT NULL,
          multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
          subtotal DECIMAL(10,2) NOT NULL,
          discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          tax DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          grand_total DECIMAL(10,2) NOT NULL,
          payment_type ENUM('full', 'advance', 'other') NOT NULL,
          amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          payment_status ENUM('pending', 'partially_paid', 'paid') NOT NULL DEFAULT 'pending',
          payment_method ENUM('cash', 'card', 'bank', 'online') NOT NULL DEFAULT 'cash',
          booking_status ENUM('draft', 'tentative', 'confirmed', 'checked-in', 'checked-out', 'cancelled') NOT NULL DEFAULT 'draft',
          booking_by_user INT NOT NULL,
          email_sent BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE,
          FOREIGN KEY (apartment_id) REFERENCES apartments(id),
          FOREIGN KEY (booking_by_user) REFERENCES users(id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating bookings table:', err.message);
          reject(err);
          return;
        }
        console.log('Bookings table created/verified');
        resolve();
      });
    });

    // Audit logs table
    await new Promise((resolve, reject) => {
      connection.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          entity VARCHAR(50) NOT NULL COMMENT 'Table name or entity type',
          entity_id INT NOT NULL COMMENT 'ID of the affected record',
          action VARCHAR(50) NOT NULL COMMENT 'CREATE, UPDATE, DELETE, etc.',
          old_value JSON NULL COMMENT 'Previous values before change',
          new_value JSON NULL COMMENT 'New values after change',
          user_id INT NOT NULL COMMENT 'User who performed the action',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating audit_logs table:', err.message);
          reject(err);
          return;
        }
        console.log('Audit logs table created/verified');
        resolve();
      });
    });

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

    // Check if reception user exists, if not create it
    console.log('Checking for reception user...');
    const checkReceptionUser = await new Promise((resolve, reject) => {
      connection.query('SELECT COUNT(*) as count FROM users WHERE email = ?', ['reception@example.com'], (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(results[0].count);
      });
    });

    if (checkReceptionUser === 0) {
      console.log('Creating reception user...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync('password123', 12);
      
      await new Promise((resolve, reject) => {
        connection.query(
          'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
          ['Reception Staff', 'reception@example.com', hashedPassword, 'admin'],
          (err) => {
            if (err) {
              console.error('Error creating reception user:', err.message);
              reject(err);
              return;
            }
            console.log('Reception user created successfully');
            resolve();
          }
        );
      });
    } else {
      console.log('Reception user already exists');
    }

    // Insert sample data if tables are empty
    console.log('Inserting sample data...');
    
    // Sample apartments
    const apartmentCount = await new Promise((resolve, reject) => {
      connection.query('SELECT COUNT(*) as count FROM apartments', (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(results[0].count);
      });
    });

    if (apartmentCount === 0) {
      await new Promise((resolve, reject) => {
        connection.query(`
          INSERT INTO apartments (name, floor, unit) VALUES 
          ('Apartment 1', 'ground', 'G01'),
          ('Apartment 2', 'ground', 'G02'),
          ('Apartment 3', 'first', 'F01'),
          ('Apartment 4', 'first', 'F02'),
          ('Apartment 5', 'second', 'S01'),
          ('Apartment 6', 'second', 'S02')
        `, (err) => {
          if (err) {
            console.error('Error inserting sample apartments:', err.message);
          } else {
            console.log('Sample apartments inserted');
          }
          resolve();
        });
      });
    }

    // Sample pricing rules
    const pricingCount = await new Promise((resolve, reject) => {
      connection.query('SELECT COUNT(*) as count FROM pricing_rules', (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(results[0].count);
      });
    });

    if (pricingCount === 0) {
      await new Promise((resolve, reject) => {
        connection.query(`
          INSERT INTO pricing_rules (rate_1_3, rate_4_6, rate_7_plus, season_regular, season_peak, season_offpeak, tax_percent, effective_date, updated_by) VALUES 
          (100.00, 90.00, 80.00, 1.00, 1.20, 0.80, 10.00, CURDATE(), 1)
        `, (err) => {
          if (err) {
            console.error('Error inserting sample pricing rules:', err.message);
          } else {
            console.log('Sample pricing rules inserted');
          }
          resolve();
        });
      });
    }

    console.log('Database setup completed successfully!');
    console.log('\nDefault login credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: password123');
    console.log('\nReception login credentials:');
    console.log('Email: reception@example.com');
    console.log('Password: password123');

  } catch (error) {
    console.error('Database setup failed:', error.message);
    process.exit(1);
  } finally {
    connection.end();
  }
}

setupDatabase();
