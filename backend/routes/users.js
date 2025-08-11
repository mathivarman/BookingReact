const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { logAudit, hashPassword } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/auth');
const router = express.Router();

// Get all users (Super Admin only)
router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const [users] = await db.promise().query(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );

    res.json(users);

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single user (Super Admin only)
router.get('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await db.promise().query(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(users[0]);

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new user (Super Admin only)
router.post('/', requireSuperAdmin, [
  body('name').notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['admin', 'super_admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const userData = req.body;
    const userId = req.user.id;

    // Check if email already exists
    const [existingUsers] = await db.promise().query(
      'SELECT id FROM users WHERE email = ?',
      [userData.email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hash password
    const passwordHash = await hashPassword(userData.password);

    // Create user
    const [userResult] = await db.promise().query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [
        userData.name,
        userData.email,
        passwordHash,
        userData.role
      ]
    );

    const newUserId = userResult.insertId;

    // Log audit
    await logAudit('user', newUserId, 'create', null, { ...userData, password: '[HIDDEN]' }, userId);

    res.status(201).json({
      message: 'User created successfully',
      userId: newUserId
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user (Super Admin only)
router.put('/:id', requireSuperAdmin, [
  body('name').notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('role').isIn(['admin', 'super_admin']),
  body('is_active').isBoolean()
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
    const userData = req.body;
    const userId = req.user.id;

    // Prevent self-deactivation
    if (id == userId && userData.is_active === false) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    // Get existing user
    const [existingUsers] = await db.promise().query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingUser = existingUsers[0];

    // Check if email already exists (excluding current user)
    const [emailCheck] = await db.promise().query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [userData.email, id]
    );

    if (emailCheck.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Update user
    await db.promise().query(
      'UPDATE users SET name = ?, email = ?, role = ?, is_active = ? WHERE id = ?',
      [
        userData.name,
        userData.email,
        userData.role,
        userData.is_active,
        id
      ]
    );

    // Log audit
    await logAudit('user', id, 'update', existingUser, userData, userId);

    res.json({ message: 'User updated successfully' });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete user (Super Admin only)
router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Prevent self-deletion
    if (id == userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Get existing user
    const [existingUsers] = await db.promise().query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log audit before deletion
    await logAudit('user', id, 'delete', existingUsers[0], null, userId);

    // Delete user
    await db.promise().query('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reset user password (Super Admin only)
router.post('/:id/reset-password', requireSuperAdmin, [
  body('newPassword').isLength({ min: 6 })
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
    const { newPassword } = req.body;
    const userId = req.user.id;

    // Get existing user
    const [existingUsers] = await db.promise().query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await db.promise().query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, id]
    );

    // Log audit
    await logAudit('user', id, 'reset_password', null, { password: '[HIDDEN]' }, userId);

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user activity (Super Admin only)
router.get('/:id/activity', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20 } = req.query;

    // Get user's audit logs
    const [auditLogs] = await db.promise().query(
      `SELECT al.*, u.name as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.user_id = ?
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [id, parseInt(limit)]
    );

    // Get user's bookings
    const [bookings] = await db.promise().query(
      `SELECT b.*, g.name as guest_name, a.name as apartment_name
       FROM bookings b
       LEFT JOIN guests g ON b.guest_id = g.id
       LEFT JOIN apartments a ON b.apartment_id = a.id
       WHERE b.booking_by_user = ?
       ORDER BY b.created_at DESC
       LIMIT ?`,
      [id, parseInt(limit)]
    );

    res.json({
      auditLogs,
      bookings
    });

  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

