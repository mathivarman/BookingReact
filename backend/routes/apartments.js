const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { logAudit } = require('../services/auditService');
const router = express.Router();

// Get all apartments
router.get('/', async (req, res) => {
  try {
    const [apartments] = await db.promise().query(
      'SELECT * FROM apartments WHERE is_active = 1 ORDER BY name'
    );

    res.json(apartments);

  } catch (error) {
    console.error('Get apartments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single apartment
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [apartments] = await db.promise().query(
      'SELECT * FROM apartments WHERE id = ? AND is_active = 1',
      [id]
    );

    if (apartments.length === 0) {
      return res.status(404).json({ message: 'Apartment not found' });
    }

    res.json(apartments[0]);

  } catch (error) {
    console.error('Get apartment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new apartment
router.post('/', [
  body('name').notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('floor').optional().isIn(['ground', 'first', 'second']),
  body('unit').optional().trim().isLength({ max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const apartmentData = req.body;
    const userId = req.user.id;

    // Check if apartment name already exists
    const [existingApartments] = await db.promise().query(
      'SELECT id FROM apartments WHERE name = ? AND is_active = 1',
      [apartmentData.name]
    );

    if (existingApartments.length > 0) {
      return res.status(400).json({ message: 'Apartment name already exists' });
    }

    // Create apartment
    const [apartmentResult] = await db.promise().query(
      'INSERT INTO apartments (name, floor, unit) VALUES (?, ?, ?)',
      [
        apartmentData.name,
        apartmentData.floor || null,
        apartmentData.unit || null
      ]
    );

    const apartmentId = apartmentResult.insertId;

    // Log audit
    await logAudit('apartment', apartmentId, 'create', null, apartmentData, userId);

    res.status(201).json({
      message: 'Apartment created successfully',
      apartmentId
    });

  } catch (error) {
    console.error('Create apartment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update apartment
router.put('/:id', [
  body('name').notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('floor').optional().isIn(['ground', 'first', 'second']),
  body('unit').optional().trim().isLength({ max: 50 })
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
    const apartmentData = req.body;
    const userId = req.user.id;

    // Get existing apartment
    const [existingApartments] = await db.promise().query(
      'SELECT * FROM apartments WHERE id = ? AND is_active = 1',
      [id]
    );

    if (existingApartments.length === 0) {
      return res.status(404).json({ message: 'Apartment not found' });
    }

    const existingApartment = existingApartments[0];

    // Check if apartment name already exists (excluding current apartment)
    const [nameCheck] = await db.promise().query(
      'SELECT id FROM apartments WHERE name = ? AND id != ? AND is_active = 1',
      [apartmentData.name, id]
    );

    if (nameCheck.length > 0) {
      return res.status(400).json({ message: 'Apartment name already exists' });
    }

    // Update apartment
    await db.promise().query(
      'UPDATE apartments SET name = ?, floor = ?, unit = ? WHERE id = ?',
      [
        apartmentData.name,
        apartmentData.floor || null,
        apartmentData.unit || null,
        id
      ]
    );

    // Log audit
    await logAudit('apartment', id, 'update', existingApartment, apartmentData, userId);

    res.json({ message: 'Apartment updated successfully' });

  } catch (error) {
    console.error('Update apartment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete apartment (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if apartment has any bookings
    const [bookings] = await db.promise().query(
      'SELECT COUNT(*) as count FROM bookings WHERE apartment_id = ?',
      [id]
    );

    if (bookings[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete apartment with existing bookings. Delete bookings first.' 
      });
    }

    // Get existing apartment for audit
    const [existingApartments] = await db.promise().query(
      'SELECT * FROM apartments WHERE id = ? AND is_active = 1',
      [id]
    );

    if (existingApartments.length === 0) {
      return res.status(404).json({ message: 'Apartment not found' });
    }

    // Log audit before deletion
    await logAudit('apartment', id, 'delete', existingApartments[0], null, userId);

    // Soft delete apartment
    await db.promise().query(
      'UPDATE apartments SET is_active = 0 WHERE id = ?',
      [id]
    );

    res.json({ message: 'Apartment deleted successfully' });

  } catch (error) {
    console.error('Delete apartment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get apartment availability
router.get('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Check for conflicting bookings
    const [conflicts] = await db.promise().query(
      `SELECT b.*, g.name as guest_name
       FROM bookings b
       LEFT JOIN guests g ON b.guest_id = g.id
       WHERE b.apartment_id = ?
       AND b.booking_status NOT IN ('cancelled')
       AND (
         (b.from_datetime <= ? AND b.to_datetime >= ?) OR
         (b.from_datetime <= ? AND b.to_datetime >= ?) OR
         (b.from_datetime >= ? AND b.to_datetime <= ?)
       )
       ORDER BY b.from_datetime`,
      [
        id,
        startDate, startDate,
        endDate, endDate,
        startDate, endDate
      ]
    );

    const isAvailable = conflicts.length === 0;

    res.json({
      apartmentId: id,
      startDate,
      endDate,
      isAvailable,
      conflicts
    });

  } catch (error) {
    console.error('Get apartment availability error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get apartment bookings
router.get('/:id/bookings', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, limit = 20 } = req.query;

    let whereConditions = ['b.apartment_id = ?'];
    let params = [id];

    if (status) {
      whereConditions.push('b.booking_status = ?');
      params.push(status);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const [bookings] = await db.promise().query(
      `SELECT b.*, g.name as guest_name, g.phone as guest_phone
       FROM bookings b
       LEFT JOIN guests g ON b.guest_id = g.id
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT ?`,
      [...params, parseInt(limit)]
    );

    res.json({ bookings });

  } catch (error) {
    console.error('Get apartment bookings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

