const express = require('express');
const { query } = require('express-validator');
const { requireSuperAdmin } = require('../middleware/auth');
const { getAuditLogs, getAuditSummary } = require('../services/auditService');
const router = express.Router();

// Get audit logs (Super Admin only)
router.get('/', requireSuperAdmin, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('entity').optional().isString(),
  query('entityId').optional().isInt(),
  query('action').optional().isIn(['create', 'update', 'delete']),
  query('userId').optional().isInt(),
  query('startDate').optional().isDate(),
  query('endDate').optional().isDate()
], async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      entity: req.query.entity,
      entityId: req.query.entityId ? parseInt(req.query.entityId) : null,
      action: req.query.action,
      userId: req.query.userId ? parseInt(req.query.userId) : null,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const result = await getAuditLogs(filters);

    res.json(result);

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get audit summary for an entity (Super Admin only)
router.get('/summary/:entity/:entityId', requireSuperAdmin, async (req, res) => {
  try {
    const { entity, entityId } = req.params;

    const summary = await getAuditSummary(entity, parseInt(entityId));

    res.json(summary);

  } catch (error) {
    console.error('Get audit summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get audit statistics (Super Admin only)
router.get('/statistics', requireSuperAdmin, [
  query('startDate').optional().isDate(),
  query('endDate').optional().isDate()
], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let whereConditions = [];
    let params = [];

    if (startDate) {
      whereConditions.push('DATE(created_at) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('DATE(created_at) <= ?');
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get action distribution
    const [actionStats] = await db.promise().query(
      `SELECT 
        action,
        COUNT(*) as count,
        ROUND((COUNT(*) / (SELECT COUNT(*) FROM audit_logs ${whereClause})) * 100, 2) as percentage
       FROM audit_logs 
       ${whereClause}
       GROUP BY action
       ORDER BY count DESC`,
      params
    );

    // Get entity distribution
    const [entityStats] = await db.promise().query(
      `SELECT 
        entity,
        COUNT(*) as count,
        ROUND((COUNT(*) / (SELECT COUNT(*) FROM audit_logs ${whereClause})) * 100, 2) as percentage
       FROM audit_logs 
       ${whereClause}
       GROUP BY entity
       ORDER BY count DESC`,
      params
    );

    // Get user activity
    const [userActivity] = await db.promise().query(
      `SELECT 
        u.name as user_name,
        u.email as user_email,
        COUNT(al.id) as total_actions,
        COUNT(DISTINCT al.entity) as entities_modified
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       GROUP BY al.user_id
       ORDER BY total_actions DESC
       LIMIT 10`,
      params
    );

    // Get daily activity
    const [dailyActivity] = await db.promise().query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_actions,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(DISTINCT entity) as entities_modified
       FROM audit_logs 
       ${whereClause}
       GROUP BY DATE(created_at)
       ORDER BY date DESC
       LIMIT 30`,
      params
    );

    res.json({
      actionStats,
      entityStats,
      userActivity,
      dailyActivity,
      filters: { startDate, endDate }
    });

  } catch (error) {
    console.error('Get audit statistics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get recent activity (Super Admin only)
router.get('/recent', requireSuperAdmin, [
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const [recentActivity] = await db.promise().query(
      `SELECT 
        al.*,
        u.name as user_name,
        u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [parseInt(limit)]
    );

    res.json(recentActivity);

  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user activity (Super Admin only)
router.get('/user/:userId', requireSuperAdmin, [
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const [userActivity] = await db.promise().query(
      `SELECT 
        al.*,
        u.name as user_name,
        u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.user_id = ?
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [parseInt(userId), parseInt(limit)]
    );

    // Get user summary
    const [userSummary] = await db.promise().query(
      `SELECT 
        COUNT(*) as total_actions,
        COUNT(DISTINCT entity) as entities_modified,
        COUNT(DISTINCT DATE(created_at)) as active_days,
        MIN(created_at) as first_action,
        MAX(created_at) as last_action
       FROM audit_logs 
       WHERE user_id = ?`,
      [parseInt(userId)]
    );

    res.json({
      activity: userActivity,
      summary: userSummary[0]
    });

  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Export audit logs (Super Admin only)
router.get('/export', requireSuperAdmin, [
  query('startDate').optional().isDate(),
  query('endDate').optional().isDate(),
  query('format').optional().isIn(['json', 'csv'])
], async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    let whereConditions = [];
    let params = [];

    if (startDate) {
      whereConditions.push('DATE(al.created_at) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('DATE(al.created_at) <= ?');
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [auditLogs] = await db.promise().query(
      `SELECT 
        al.*,
        u.name as user_name,
        u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC`,
      params
    );

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = ['ID', 'Entity', 'Entity ID', 'Action', 'User', 'Email', 'Date', 'Old Value', 'New Value'];
      const csvRows = auditLogs.map(log => [
        log.id,
        log.entity,
        log.entity_id,
        log.action,
        log.user_name || 'Unknown',
        log.user_email || 'Unknown',
        log.created_at,
        log.old_value || '',
        log.new_value || ''
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${startDate || 'all'}_${endDate || 'all'}.csv"`);
      res.send(csvContent);
    } else {
      res.json({
        auditLogs,
        exportInfo: {
          format,
          startDate,
          endDate,
          totalRecords: auditLogs.length,
          exportedAt: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

