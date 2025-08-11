const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { logAudit } = require('../services/auditService');
const { requireSuperAdmin } = require('../middleware/auth');
const router = express.Router();

// Get all pricing rules
router.get('/', async (req, res) => {
  try {
    const [pricingRules] = await db.promise().query(
      `SELECT pr.*, u.name as updated_by_name
       FROM pricing_rules pr
       LEFT JOIN users u ON pr.updated_by = u.id
       ORDER BY pr.effective_date DESC`
    );

    res.json(pricingRules);

  } catch (error) {
    console.error('Get pricing rules error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current pricing rules
router.get('/current', async (req, res) => {
  try {
    const [pricingRules] = await db.promise().query(
      'SELECT * FROM pricing_rules WHERE effective_date <= NOW() ORDER BY effective_date DESC LIMIT 1'
    );

    if (pricingRules.length === 0) {
      return res.status(404).json({ message: 'No pricing rules found' });
    }

    res.json(pricingRules[0]);

  } catch (error) {
    console.error('Get current pricing rules error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single pricing rule
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [pricingRules] = await db.promise().query(
      `SELECT pr.*, u.name as updated_by_name
       FROM pricing_rules pr
       LEFT JOIN users u ON pr.updated_by = u.id
       WHERE pr.id = ?`,
      [id]
    );

    if (pricingRules.length === 0) {
      return res.status(404).json({ message: 'Pricing rule not found' });
    }

    res.json(pricingRules[0]);

  } catch (error) {
    console.error('Get pricing rule error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new pricing rule (Super Admin only)
router.post('/', requireSuperAdmin, [
  body('rate_1_3').isFloat({ min: 0 }),
  body('rate_4_6').isFloat({ min: 0 }),
  body('rate_7_plus').isFloat({ min: 0 }),
  body('season_regular').isFloat({ min: 0.1, max: 10 }),
  body('season_peak').isFloat({ min: 0.1, max: 10 }),
  body('season_offpeak').isFloat({ min: 0.1, max: 10 }),
  body('tax_percent').isFloat({ min: 0, max: 100 }),
  body('effective_date').isDate(),
  body('currency').optional().isLength({ min: 3, max: 3 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const pricingData = req.body;
    const userId = req.user.id;

    // Check if effective date is in the future
    const effectiveDate = new Date(pricingData.effective_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (effectiveDate < today) {
      return res.status(400).json({ message: 'Effective date must be today or in the future' });
    }

    // Create pricing rule
    const [pricingResult] = await db.promise().query(
      `INSERT INTO pricing_rules (
        rate_1_3, rate_4_6, rate_7_plus, season_regular, season_peak, season_offpeak,
        tax_percent, currency, effective_date, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pricingData.rate_1_3,
        pricingData.rate_4_6,
        pricingData.rate_7_plus,
        pricingData.season_regular,
        pricingData.season_peak,
        pricingData.season_offpeak,
        pricingData.tax_percent,
        pricingData.currency || 'USD',
        pricingData.effective_date,
        userId
      ]
    );

    const pricingId = pricingResult.insertId;

    // Log audit
    await logAudit('pricing_rules', pricingId, 'create', null, pricingData, userId);

    res.status(201).json({
      message: 'Pricing rule created successfully',
      pricingId
    });

  } catch (error) {
    console.error('Create pricing rule error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update pricing rule (Super Admin only)
router.put('/:id', requireSuperAdmin, [
  body('rate_1_3').isFloat({ min: 0 }),
  body('rate_4_6').isFloat({ min: 0 }),
  body('rate_7_plus').isFloat({ min: 0 }),
  body('season_regular').isFloat({ min: 0.1, max: 10 }),
  body('season_peak').isFloat({ min: 0.1, max: 10 }),
  body('season_offpeak').isFloat({ min: 0.1, max: 10 }),
  body('tax_percent').isFloat({ min: 0, max: 100 }),
  body('effective_date').isDate(),
  body('currency').optional().isLength({ min: 3, max: 3 })
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
    const pricingData = req.body;
    const userId = req.user.id;

    // Get existing pricing rule
    const [existingPricing] = await db.promise().query(
      'SELECT * FROM pricing_rules WHERE id = ?',
      [id]
    );

    if (existingPricing.length === 0) {
      return res.status(404).json({ message: 'Pricing rule not found' });
    }

    const existingRule = existingPricing[0];

    // Check if effective date is in the future
    const effectiveDate = new Date(pricingData.effective_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (effectiveDate < today) {
      return res.status(400).json({ message: 'Effective date must be today or in the future' });
    }

    // Update pricing rule
    await db.promise().query(
      `UPDATE pricing_rules SET 
       rate_1_3 = ?, rate_4_6 = ?, rate_7_plus = ?, 
       season_regular = ?, season_peak = ?, season_offpeak = ?,
       tax_percent = ?, currency = ?, effective_date = ?, updated_by = ?
       WHERE id = ?`,
      [
        pricingData.rate_1_3,
        pricingData.rate_4_6,
        pricingData.rate_7_plus,
        pricingData.season_regular,
        pricingData.season_peak,
        pricingData.season_offpeak,
        pricingData.tax_percent,
        pricingData.currency || 'USD',
        pricingData.effective_date,
        userId,
        id
      ]
    );

    // Log audit
    await logAudit('pricing_rules', id, 'update', existingRule, pricingData, userId);

    res.json({ message: 'Pricing rule updated successfully' });

  } catch (error) {
    console.error('Update pricing rule error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete pricing rule (Super Admin only)
router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get existing pricing rule
    const [existingPricing] = await db.promise().query(
      'SELECT * FROM pricing_rules WHERE id = ?',
      [id]
    );

    if (existingPricing.length === 0) {
      return res.status(404).json({ message: 'Pricing rule not found' });
    }

    // Check if this is the current active pricing rule
    const [currentPricing] = await db.promise().query(
      'SELECT id FROM pricing_rules WHERE effective_date <= NOW() ORDER BY effective_date DESC LIMIT 1'
    );

    if (currentPricing.length > 0 && currentPricing[0].id == id) {
      return res.status(400).json({ 
        message: 'Cannot delete the currently active pricing rule. Create a new one first.' 
      });
    }

    // Log audit before deletion
    await logAudit('pricing_rules', id, 'delete', existingPricing[0], null, userId);

    // Delete pricing rule
    await db.promise().query('DELETE FROM pricing_rules WHERE id = ?', [id]);

    res.json({ message: 'Pricing rule deleted successfully' });

  } catch (error) {
    console.error('Delete pricing rule error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Calculate pricing for a booking
router.post('/calculate', [
  body('days').isInt({ min: 1 }),
  body('season').isIn(['regular', 'peak', 'offpeak']),
  body('discount').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { days, season, discount = 0 } = req.body;

    // Get current pricing rules
    const [pricingRules] = await db.promise().query(
      'SELECT * FROM pricing_rules WHERE effective_date <= NOW() ORDER BY effective_date DESC LIMIT 1'
    );

    if (pricingRules.length === 0) {
      return res.status(404).json({ message: 'No pricing rules found' });
    }

    const rules = pricingRules[0];

    // Calculate base rate
    let baseRate = 0;
    if (days <= 3) {
      baseRate = rules.rate_1_3;
    } else if (days <= 6) {
      baseRate = rules.rate_4_6;
    } else {
      baseRate = rules.rate_7_plus;
    }

    // Get season multiplier
    const multiplier = rules[`season_${season}`];

    // Calculate totals
    const subtotal = (baseRate * days * multiplier) - discount;
    const tax = (subtotal * rules.tax_percent) / 100;
    const grandTotal = subtotal + tax;

    res.json({
      baseRate,
      multiplier,
      subtotal,
      discount,
      tax,
      grandTotal,
      currency: rules.currency
    });

  } catch (error) {
    console.error('Calculate pricing error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get pricing history
router.get('/history', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const [pricingHistory] = await db.promise().query(
      `SELECT pr.*, u.name as updated_by_name
       FROM pricing_rules pr
       LEFT JOIN users u ON pr.updated_by = u.id
       ORDER BY pr.effective_date DESC
       LIMIT ?`,
      [parseInt(limit)]
    );

    res.json(pricingHistory);

  } catch (error) {
    console.error('Get pricing history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

