/**
 * ============================================
 * Audit Log Model
 * ============================================
 * Records all system activities for auditing
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Who
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  user_email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  user_name: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  
  // What
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'create, read, update, delete, login, logout, export, etc.'
  },
  
  module: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'e.g., users, sales, inventory, payroll'
  },
  
  // Entity affected
  entity_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  entity_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  
  entity_name: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Human-readable identifier'
  },
  
  // Details
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Changes (for updates)
  old_values: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  
  new_values: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  
  // Request info
  ip_address: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  request_method: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  
  request_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('success', 'failure', 'error'),
    defaultValue: 'success'
  },
  
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Additional metadata
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false, // Audit logs shouldn't be updated
  indexes: [
    { fields: ['user_id'] },
    { fields: ['action'] },
    { fields: ['module'] },
    { fields: ['entity_type', 'entity_id'] },
    { fields: ['created_at'] },
    { fields: ['status'] }
  ]
});

// Helper to create audit log entry
AuditLog.log = async function(data) {
  return this.create({
    user_id: data.userId,
    user_email: data.userEmail,
    user_name: data.userName,
    action: data.action,
    module: data.module,
    entity_type: data.entityType,
    entity_id: data.entityId,
    entity_name: data.entityName,
    description: data.description,
    old_values: data.oldValues,
    new_values: data.newValues,
    ip_address: data.ipAddress,
    user_agent: data.userAgent,
    request_method: data.requestMethod,
    request_url: data.requestUrl,
    status: data.status || 'success',
    error_message: data.errorMessage,
    metadata: data.metadata
  });
};

module.exports = AuditLog;
