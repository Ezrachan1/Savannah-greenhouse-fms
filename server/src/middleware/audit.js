/**
 * ============================================
 * Audit Middleware
 * ============================================
 * Logs user activities for audit trail
 */

const { AuditLog } = require('../models');

/**
 * Create audit log middleware for specific actions
 * @param {string} module - Module being accessed
 * @param {string} action - Action being performed
 */
const auditLog = (module, action) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method to capture response
    res.json = function(data) {
      // Log after response is prepared
      setImmediate(async () => {
        try {
          await AuditLog.log({
            userId: req.userId,
            userEmail: req.user?.email,
            userName: req.user?.getFullName?.(),
            action,
            module,
            entityType: req.params.entity || module,
            entityId: req.params.id || data?.data?.id,
            entityName: data?.data?.name || data?.data?.title,
            description: `${action} ${module}`,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            requestMethod: req.method,
            requestUrl: req.originalUrl,
            status: res.statusCode < 400 ? 'success' : 'failure',
            metadata: {
              query: req.query,
              statusCode: res.statusCode
            }
          });
        } catch (error) {
          console.error('Audit log error:', error);
        }
      });
      
      return originalJson(data);
    };
    
    next();
  };
};

/**
 * Log data changes (for update operations)
 * @param {string} module - Module name
 * @param {Object} oldData - Previous data state
 * @param {Object} newData - New data state
 * @param {Object} req - Express request object
 */
const logDataChange = async (module, oldData, newData, req) => {
  try {
    // Find changed fields
    const changes = {};
    const oldValues = {};
    const newValues = {};
    
    for (const key of Object.keys(newData)) {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        oldValues[key] = oldData[key];
        newValues[key] = newData[key];
      }
    }
    
    if (Object.keys(oldValues).length > 0) {
      await AuditLog.log({
        userId: req.userId,
        userEmail: req.user?.email,
        userName: req.user?.getFullName?.(),
        action: 'update',
        module,
        entityType: module,
        entityId: oldData.id,
        entityName: oldData.name || oldData.title,
        description: `Updated ${module}`,
        oldValues,
        newValues,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestMethod: req.method,
        requestUrl: req.originalUrl,
        status: 'success'
      });
    }
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

module.exports = {
  auditLog,
  logDataChange
};
