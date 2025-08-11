const express = require('express');
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const { sendBookingEmail } = require('../services/emailService');
const { logAudit } = require('../services/auditService');
const router = express.Router();

// Get all bookings with search and filters
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('apartment').optional().isInt(),
  query('guestType').optional().isIn(['local', 'foreign']),
  query('paymentStatus').optional().isIn(['pending', 'partially_paid', 'paid']),
  query('bookingStatus').optional().isIn(['draft', 'tentative', 'confirmed', 'checked-in', 'checked-out', 'cancelled']),
  query('sort').optional().isIn(['created_at', 'from_datetime', 'guest_name']),
  query('order').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const {
      page = 1,
      limit = 20,
      search,
      dateFrom,
      dateTo,
      apartment,
      guestType,
      paymentStatus,
      bookingStatus,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    let whereConditions = [];
    let params = [];

    // Search functionality
    if (search) {
      whereConditions.push(`(g.name LIKE ? OR g.phone LIKE ? OR b.id LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Date range filter
    if (dateFrom) {
      whereConditions.push('b.from_datetime >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      whereConditions.push('b.to_datetime <= ?');
      params.push(dateTo);
    }

    // Other filters
    if (apartment) {
      whereConditions.push('b.apartment_id = ?');
      params.push(apartment);
    }
    if (guestType) {
      whereConditions.push('g.guest_type = ?');
      params.push(guestType);
    }
    if (paymentStatus) {
      whereConditions.push('b.payment_status = ?');
      params.push(paymentStatus);
    }
    if (bookingStatus) {
      whereConditions.push('b.booking_status = ?');
      params.push(bookingStatus);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count total records
    const [countResult] = await db.promise().query(
      `SELECT COUNT(*) as total FROM bookings b 
       LEFT JOIN guests g ON b.guest_id = g.id 
       ${whereClause}`,
      params
    );
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit);
    const offset = (page - 1) * limit;

    // Get bookings with pagination
    const [bookings] = await db.promise().query(
      `SELECT b.*, 
              g.name as guest_name, g.phone as guest_phone, g.email as guest_email, 
              g.guest_type, g.place_or_country, g.introduced, g.introduced_by,
              a.name as apartment_name, a.floor as apartment_floor
       FROM bookings b 
       LEFT JOIN guests g ON b.guest_id = g.id 
       LEFT JOIN apartments a ON b.apartment_id = a.id 
       ${whereClause}
       ORDER BY b.${sort} ${order.toUpperCase()}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      bookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single booking
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [bookings] = await db.promise().query(
      `SELECT b.*, 
              g.name as guest_name, g.phone as guest_phone, g.email as guest_email, 
              g.address as guest_address, g.guest_type, g.place_or_country, 
              g.introduced, g.introduced_by,
              a.name as apartment_name, a.floor as apartment_floor
       FROM bookings b 
       LEFT JOIN guests g ON b.guest_id = g.id 
       LEFT JOIN apartments a ON b.apartment_id = a.id 
       WHERE b.id = ?`,
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json(bookings[0]);

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new booking
router.post('/', [
  body('guest_name').notEmpty().trim(),
  body('guest_phone').notEmpty().trim(),
  body('guest_type').isIn(['local', 'foreign']),
  body('apartment_id').isInt({ min: 1 }),
  body('from_datetime').isISO8601(),
  body('to_datetime').isISO8601(),
  body('payment_type').isIn(['full', 'advance', 'other']),
  body('booking_status').isIn(['draft', 'tentative', 'confirmed', 'checked-in', 'checked-out', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const bookingData = req.body;
    const userId = req.user.id;

    // Check for booking conflicts
    const [conflicts] = await db.promise().query(
      `SELECT id FROM bookings 
       WHERE apartment_id = ? 
       AND booking_status NOT IN ('cancelled')
       AND (
         (from_datetime <= ? AND to_datetime >= ?) OR
         (from_datetime <= ? AND to_datetime >= ?) OR
         (from_datetime >= ? AND to_datetime <= ?)
       )`,
      [
        bookingData.apartment_id,
        bookingData.from_datetime, bookingData.from_datetime,
        bookingData.to_datetime, bookingData.to_datetime,
        bookingData.from_datetime, bookingData.to_datetime
      ]
    );

    if (conflicts.length > 0) {
      return res.status(400).json({ message: 'Apartment is already booked for this time period' });
    }

    // Create or get guest
    let guestId = bookingData.guest_id;
    if (!guestId) {
      const [guestResult] = await db.promise().query(
        `INSERT INTO guests (name, phone, email, address, guest_type, place_or_country, introduced, introduced_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bookingData.guest_name,
          bookingData.guest_phone,
          bookingData.guest_email || null,
          bookingData.guest_address || null,
          bookingData.guest_type,
          bookingData.place_or_country || null,
          bookingData.introduced || 'no',
          bookingData.introduced_by || null
        ]
      );
      guestId = guestResult.insertId;
    }

    // Calculate days
    const fromDate = new Date(bookingData.from_datetime);
    const toDate = new Date(bookingData.to_datetime);
    const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));

    // Get pricing rules
    const [pricingRules] = await db.promise().query(
      'SELECT * FROM pricing_rules WHERE effective_date <= NOW() ORDER BY effective_date DESC LIMIT 1'
    );

    let baseRate = 0;
    if (pricingRules.length > 0) {
      const rules = pricingRules[0];
      if (days <= 3) {
        baseRate = rules.rate_1_3;
      } else if (days <= 6) {
        baseRate = rules.rate_4_6;
      } else {
        baseRate = rules.rate_7_plus;
      }
    }

    const multiplier = pricingRules.length > 0 ? pricingRules[0][`season_${bookingData.season}`] : 1;
    const subtotal = (baseRate * days * multiplier) - (bookingData.discount || 0);
    const tax = (subtotal * (pricingRules.length > 0 ? pricingRules[0].tax_percent : 0)) / 100;
    const grandTotal = subtotal + tax;

    // Create booking
    const [bookingResult] = await db.promise().query(
      `INSERT INTO bookings (
        guest_id, apartment_id, floor, unit_no, from_datetime, to_datetime, days,
        season, base_rate, multiplier, subtotal, discount, tax, grand_total,
        payment_type, amount_paid, payment_status, payment_method, booking_status,
        booking_by_user
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guestId,
        bookingData.apartment_id,
        bookingData.floor || null,
        bookingData.unit_no || null,
        bookingData.from_datetime,
        bookingData.to_datetime,
        days,
        bookingData.season || 'regular',
        baseRate,
        multiplier,
        subtotal,
        bookingData.discount || 0,
        tax,
        grandTotal,
        bookingData.payment_type,
        bookingData.amount_paid || 0,
        bookingData.payment_status || 'pending',
        bookingData.payment_method || 'cash',
        bookingData.booking_status || 'draft',
        userId
      ]
    );

    const bookingId = bookingResult.insertId;

    // Log audit
    await logAudit('booking', bookingId, 'create', null, bookingData, userId);

    // Send confirmation email if status is confirmed
    if (bookingData.booking_status === 'confirmed' && bookingData.guest_email) {
      try {
        await sendBookingEmail(bookingId);
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }
    }

    res.status(201).json({
      message: 'Booking created successfully',
      bookingId
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update booking
router.put('/:id', [
  body('guest_name').notEmpty().trim(),
  body('guest_phone').notEmpty().trim(),
  body('guest_type').isIn(['local', 'foreign']),
  body('apartment_id').isInt({ min: 1 }),
  body('from_datetime').isISO8601(),
  body('to_datetime').isISO8601(),
  body('payment_type').isIn(['full', 'advance', 'other']),
  body('booking_status').isIn(['draft', 'tentative', 'confirmed', 'checked-in', 'checked-out', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const bookingData = req.body;
    const userId = req.user.id;

    // Get existing booking
    const [existingBookings] = await db.promise().query(
      'SELECT * FROM bookings WHERE id = ?',
      [id]
    );

    if (existingBookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const existingBooking = existingBookings[0];

    // Check for booking conflicts (excluding current booking)
    const [conflicts] = await db.promise().query(
      `SELECT id FROM bookings 
       WHERE apartment_id = ? 
       AND id != ?
       AND booking_status NOT IN ('cancelled')
       AND (
         (from_datetime <= ? AND to_datetime >= ?) OR
         (from_datetime <= ? AND to_datetime >= ?) OR
         (from_datetime >= ? AND to_datetime <= ?)
       )`,
      [
        bookingData.apartment_id,
        id,
        bookingData.from_datetime, bookingData.from_datetime,
        bookingData.to_datetime, bookingData.to_datetime,
        bookingData.from_datetime, bookingData.to_datetime
      ]
    );

    if (conflicts.length > 0) {
      return res.status(400).json({ message: 'Apartment is already booked for this time period' });
    }

    // Update guest information
    if (existingBooking.guest_id) {
      await db.promise().query(
        `UPDATE guests SET 
         name = ?, phone = ?, email = ?, address = ?, guest_type = ?, 
         place_or_country = ?, introduced = ?, introduced_by = ?
         WHERE id = ?`,
        [
          bookingData.guest_name,
          bookingData.guest_phone,
          bookingData.guest_email || null,
          bookingData.guest_address || null,
          bookingData.guest_type,
          bookingData.place_or_country || null,
          bookingData.introduced || 'no',
          bookingData.introduced_by || null,
          existingBooking.guest_id
        ]
      );
    }

    // Calculate days
    const fromDate = new Date(bookingData.from_datetime);
    const toDate = new Date(bookingData.to_datetime);
    const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));

    // Get pricing rules
    const [pricingRules] = await db.promise().query(
      'SELECT * FROM pricing_rules WHERE effective_date <= NOW() ORDER BY effective_date DESC LIMIT 1'
    );

    let baseRate = 0;
    if (pricingRules.length > 0) {
      const rules = pricingRules[0];
      if (days <= 3) {
        baseRate = rules.rate_1_3;
      } else if (days <= 6) {
        baseRate = rules.rate_4_6;
      } else {
        baseRate = rules.rate_7_plus;
      }
    }

    const multiplier = pricingRules.length > 0 ? pricingRules[0][`season_${bookingData.season}`] : 1;
    const subtotal = (baseRate * days * multiplier) - (bookingData.discount || 0);
    const tax = (subtotal * (pricingRules.length > 0 ? pricingRules[0].tax_percent : 0)) / 100;
    const grandTotal = subtotal + tax;

    // Update booking
    await db.promise().query(
      `UPDATE bookings SET 
       apartment_id = ?, floor = ?, unit_no = ?, from_datetime = ?, to_datetime = ?, days = ?,
       season = ?, base_rate = ?, multiplier = ?, subtotal = ?, discount = ?, tax = ?, grand_total = ?,
       payment_type = ?, amount_paid = ?, payment_status = ?, payment_method = ?, booking_status = ?
       WHERE id = ?`,
      [
        bookingData.apartment_id,
        bookingData.floor || null,
        bookingData.unit_no || null,
        bookingData.from_datetime,
        bookingData.to_datetime,
        days,
        bookingData.season || 'regular',
        baseRate,
        multiplier,
        subtotal,
        bookingData.discount || 0,
        tax,
        grandTotal,
        bookingData.payment_type,
        bookingData.amount_paid || 0,
        bookingData.payment_status || 'pending',
        bookingData.payment_method || 'cash',
        bookingData.booking_status || 'draft',
        id
      ]
    );

    // Log audit
    await logAudit('booking', id, 'update', existingBooking, bookingData, userId);

    // Send confirmation email if status changed to confirmed
    if (bookingData.booking_status === 'confirmed' && 
        existingBooking.booking_status !== 'confirmed' && 
        bookingData.guest_email) {
      try {
        await sendBookingEmail(id);
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }
    }

    res.json({ message: 'Booking updated successfully' });

  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete booking
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get existing booking
    const [existingBookings] = await db.promise().query(
      'SELECT * FROM bookings WHERE id = ?',
      [id]
    );

    if (existingBookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Log audit before deletion
    await logAudit('booking', id, 'delete', existingBookings[0], null, userId);

    // Delete booking
    await db.promise().query('DELETE FROM bookings WHERE id = ?', [id]);

    res.json({ message: 'Booking deleted successfully' });

  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Send confirmation email
router.post('/:id/send-email', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if booking exists and is confirmed
    const [bookings] = await db.promise().query(
      `SELECT b.*, g.email, g.name as guest_name 
       FROM bookings b 
       LEFT JOIN guests g ON b.guest_id = g.id 
       WHERE b.id = ? AND b.booking_status = 'confirmed'`,
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Confirmed booking not found' });
    }

    const booking = bookings[0];

    if (!booking.email) {
      return res.status(400).json({ message: 'Guest email not available' });
    }

    // Send email
    await sendBookingEmail(id);

    res.json({ message: 'Confirmation email sent successfully' });

  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ message: 'Failed to send confirmation email' });
  }
});

module.exports = router;

