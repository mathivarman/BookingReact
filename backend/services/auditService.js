const db = require('../config/database');

const logAudit = async (entity, entityId, action, oldValue, newValue, userId) => {
  try {
    await db.promise().query(
      'INSERT INTO audit_logs (entity, entity_id, action, old_value, new_value, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [
        entity,
        entityId,
        action,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        userId
      ]
    );
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw error to avoid breaking main operations
  }
};

const getAuditLogs = async (filters = {}) => {
  try {
    const {
      entity,
      entityId,
      action,
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = filters;

    let whereConditions = [];
    let params = [];

    if (entity) {
      whereConditions.push('al.entity = ?');
      params.push(entity);
    }

    if (entityId) {
      whereConditions.push('al.entity_id = ?');
      params.push(entityId);
    }

    if (action) {
      whereConditions.push('al.action = ?');
      params.push(action);
    }

    if (userId) {
      whereConditions.push('al.user_id = ?');
      params.push(userId);
    }

    if (startDate) {
      whereConditions.push('DATE(al.created_at) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('DATE(al.created_at) <= ?');
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count total records
    const [countResult] = await db.promise().query(
      `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`,
      params
    );
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit);
    const offset = (page - 1) * limit;

    // Get audit logs with pagination
    const [auditLogs] = await db.promise().query(
      `SELECT al.*, u.name as user_name, u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    return {
      auditLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords,
        limit: parseInt(limit)
      }
    };

  } catch (error) {
    console.error('Get audit logs error:', error);
    throw error;
  }
};

const getAuditSummary = async (entity, entityId) => {
  try {
    const [summary] = await db.promise().query(
      `SELECT 
        action,
        COUNT(*) as count,
        MIN(created_at) as first_action,
        MAX(created_at) as last_action
       FROM audit_logs
       WHERE entity = ? AND entity_id = ?
       GROUP BY action
       ORDER BY last_action DESC`,
      [entity, entityId]
    );

    return summary;

  } catch (error) {
    console.error('Get audit summary error:', error);
    throw error;
  }
};

module.exports = {
  logAudit,
  getAuditLogs,
  getAuditSummary
};

