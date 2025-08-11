const express = require('express');
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const { logAudit } = require('../services/auditService');
const router = express.Router();

// Get all guests with search and pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('guestType').optional().isIn(['local', 'foreign']),
  query('sort').optional().isIn(['name', 'created_at', 'phone']),
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
      guestType,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    let whereConditions = [];
    let params = [];

    // Search functionality
    if (search) {
      whereConditions.push(`(name LIKE ? OR phone LIKE ? OR email LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Guest type filter
    if (guestType) {
      whereConditions.push('guest_type = ?');
      params.push(guestType);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count total records
    const [countResult] = await db.promise().query(
      `SELECT COUNT(*) as total FROM guests ${whereClause}`,
      params
    );
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit);
    const offset = (page - 1) * limit;

    // Get guests with pagination
    const [guests] = await db.promise().query(
      `SELECT * FROM guests 
       ${whereClause}
       ORDER BY ${sort} ${order.toUpperCase()}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      guests,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get guests error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single guest
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [guests] = await db.promise().query(
      'SELECT * FROM guests WHERE id = ?',
      [id]
    );

    if (guests.length === 0) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    res.json(guests[0]);

  } catch (error) {
    console.error('Get guest error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new guest
router.post('/', [
  body('name').notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('phone').notEmpty().trim().isLength({ min: 10, max: 20 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('guest_type').isIn(['local', 'foreign']),
  body('place_or_country').optional().trim().isLength({ max: 100 }),
  body('introduced').optional().isIn(['yes', 'no']),
  body('introduced_by').optional().trim().isLength({ max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const guestData = req.body;
    const userId = req.user.id;

    // Check if phone number already exists
    const [existingGuests] = await db.promise().query(
      'SELECT id FROM guests WHERE phone = ?',
      [guestData.phone]
    );

    if (existingGuests.length > 0) {
      return res.status(400).json({ message: 'Phone number already exists' });
    }

    // Create guest
    const [guestResult] = await db.promise().query(
      `INSERT INTO guests (name, address, phone, email, guest_type, place_or_country, introduced, introduced_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guestData.name,
        guestData.address || null,
        guestData.phone,
        guestData.email || null,
        guestData.guest_type,
        guestData.place_or_country || null,
        guestData.introduced || 'no',
        guestData.introduced_by || null
      ]
    );

    const guestId = guestResult.insertId;

    // Log audit
    await logAudit('guest', guestId, 'create', null, guestData, userId);

    res.status(201).json({
      message: 'Guest created successfully',
      guestId
    });

  } catch (error) {
    console.error('Create guest error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update guest
router.put('/:id', [
  body('name').notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('phone').notEmpty().trim().isLength({ min: 10, max: 20 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('guest_type').isIn(['local', 'foreign']),
  body('place_or_country').optional().trim().isLength({ max: 100 }),
  body('introduced').optional().isIn(['yes', 'no']),
  body('introduced_by').optional().trim().isLength({ max: 100 })
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
    const guestData = req.body;
    const userId = req.user.id;

    // Get existing guest
    const [existingGuests] = await db.promise().query(
      'SELECT * FROM guests WHERE id = ?',
      [id]
    );

    if (existingGuests.length === 0) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    const existingGuest = existingGuests[0];

    // Check if phone number already exists (excluding current guest)
    const [phoneCheck] = await db.promise().query(
      'SELECT id FROM guests WHERE phone = ? AND id != ?',
      [guestData.phone, id]
    );

    if (phoneCheck.length > 0) {
      return res.status(400).json({ message: 'Phone number already exists' });
    }

    // Update guest
    await db.promise().query(
      `UPDATE guests SET 
       name = ?, address = ?, phone = ?, email = ?, guest_type = ?, 
       place_or_country = ?, introduced = ?, introduced_by = ?
       WHERE id = ?`,
      [
        guestData.name,
        guestData.address || null,
        guestData.phone,
        guestData.email || null,
        guestData.guest_type,
        guestData.place_or_country || null,
        guestData.introduced || 'no',
        guestData.introduced_by || null,
        id
      ]
    );

    // Log audit
    await logAudit('guest', id, 'update', existingGuest, guestData, userId);

    res.json({ message: 'Guest updated successfully' });

  } catch (error) {
    console.error('Update guest error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete guest
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if guest has any bookings
    const [bookings] = await db.promise().query(
      'SELECT COUNT(*) as count FROM bookings WHERE guest_id = ?',
      [id]
    );

    if (bookings[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete guest with existing bookings. Delete bookings first.' 
      });
    }

    // Get existing guest for audit
    const [existingGuests] = await db.promise().query(
      'SELECT * FROM guests WHERE id = ?',
      [id]
    );

    if (existingGuests.length === 0) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    // Log audit before deletion
    await logAudit('guest', id, 'delete', existingGuests[0], null, userId);

    // Delete guest
    await db.promise().query('DELETE FROM guests WHERE id = ?', [id]);

    res.json({ message: 'Guest deleted successfully' });

  } catch (error) {
    console.error('Delete guest error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get guest bookings
router.get('/:id/bookings', async (req, res) => {
  try {
    const { id } = req.params;

    const [bookings] = await db.promise().query(
      `SELECT b.*, a.name as apartment_name, a.floor as apartment_floor
       FROM bookings b
       LEFT JOIN apartments a ON b.apartment_id = a.id
       WHERE b.guest_id = ?
       ORDER BY b.created_at DESC`,
      [id]
    );

    res.json({ bookings });

  } catch (error) {
    console.error('Get guest bookings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

