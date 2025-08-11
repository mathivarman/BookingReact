const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './.env' });

// Set environment variables if not loaded from .env
if (!process.env.DB_HOST) {
  process.env.DB_HOST = 'localhost';
  process.env.DB_USER = 'root';
  process.env.DB_PASSWORD = 'root';
  process.env.DB_NAME = 'apartment_booking';
  process.env.PORT = '3001';
  process.env.JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';
}

// Debug environment variables
console.log('Environment variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('PORT:', process.env.PORT);

const app = express();
const PORT = process.env.PORT || 3001;

// Import routes
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const guestRoutes = require('./routes/guests');
const apartmentRoutes = require('./routes/apartments');
const pricingRoutes = require('./routes/pricing');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');
const auditRoutes = require('./routes/audit');

// Import middleware
const { authenticateToken } = require('./middleware/auth');

// Security middleware
app.use(helmet());

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Rate limiting - temporarily disabled for testing
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 1000, // increased limit for development
//   standardHeaders: true,
//   legacyHeaders: false,
//   skipSuccessfulRequests: true,
//   skipFailedRequests: false
// });
// app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
const db = require('./config/database');

// Test database connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('Database connected successfully');
  connection.release();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', authenticateToken, bookingRoutes);
app.use('/api/guests', authenticateToken, guestRoutes);
app.use('/api/apartments', authenticateToken, apartmentRoutes);
app.use('/api/pricing-rules', authenticateToken, pricingRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/audit-logs', authenticateToken, auditRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
