const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'apartment_booking',
  port: process.env.DB_PORT || 3306
});

async function createAuditTable() {
  try {
    console.log('Connecting to database...');
    
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) {
          console.error('Error connecting to database:', err.message);
          reject(err);
          return;
        }
        console.log('Connected to database successfully');
        resolve();
      });
    });

    console.log('Creating audit_logs table...');
    
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
        console.log('Audit logs table created successfully!');
        resolve();
      });
    });

  } catch (error) {
    console.error('Failed to create audit table:', error.message);
  } finally {
    connection.end();
  }
}

createAuditTable();
