# Apartment Booking Backend

This is the backend API for the apartment booking admin system built with Node.js, Express, and MySQL.

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Configuration

1. **Copy the environment file:**
   ```bash
   copy env.example .env
   ```

2. **Update the `.env` file with your MySQL credentials:**
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=apartment_booking
   DB_PORT=3306
   ```

   **Note:** If you're using XAMPP, WAMP, or similar, the password might be empty. If you're using a local MySQL installation, you'll need to set the password you created during installation.

### 3. Setup Database

Run the database setup script to create the database and tables:

```bash
npm run setup-db
```

This script will:
- Connect to your MySQL server
- Create the `apartment_booking` database if it doesn't exist
- Create all necessary tables
- Insert sample data

### 4. Start the Development Server

```bash
npm run dev
```

The server will start on port 3001 (http://localhost:3001)

## Default Login Credentials

After running the setup script, you can log in with:

- **Email:** admin@example.com
- **Password:** password123

## API Endpoints

The API includes endpoints for:
- Authentication (login, logout)
- User management
- Apartment management
- Guest management
- Booking management
- Pricing rules
- Reports
- Audit logs

## Troubleshooting

### Database Connection Issues

1. **"Access denied for user 'root'@'localhost'"**
   - Check your MySQL password in the `.env` file
   - Make sure MySQL is running
   - Try connecting to MySQL manually to verify credentials

2. **"ECONNREFUSED"**
   - Make sure MySQL server is running
   - Check if the port (3306) is correct
   - Verify the host address

3. **"Unknown database"**
   - Run the setup script: `npm run setup-db`

### Common MySQL Setup Issues

**For XAMPP users:**
- MySQL password is usually empty
- Set `DB_PASSWORD=` in your `.env` file

**For standalone MySQL:**
- Use the password you set during MySQL installation
- Make sure the MySQL service is running

**For Windows users:**
- Open Services (services.msc)
- Find "MySQL" service and make sure it's running
- Or use XAMPP Control Panel to start MySQL

## Development

- The server uses nodemon for automatic restarting during development
- API routes are organized in the `routes/` directory
- Database queries are handled in the `services/` directory
- Middleware for authentication and validation is in the `middleware/` directory
