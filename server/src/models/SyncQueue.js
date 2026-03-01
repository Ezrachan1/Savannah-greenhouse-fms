/**
 * ============================================
 * Sync Queue Model
 * ============================================
 * Manages offline data synchronization queue
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SyncQueue = sequelize.define('SyncQueue', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Client-generated ID for deduplication
  client_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  
  // User who created the record offline
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // What's being synced
  entity_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'e.g., seedling_batch, production_log, sale'
  },
  
  entity_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Server-assigned ID after sync'
  },
  
  // Operation type
  operation: {
    type: DataTypes.ENUM('create', 'update', 'delete'),
    allowNull: false
  },
  
  // The actual data
  payload: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  
  // Timestamps from client
  client_created_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  
  client_updated_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Sync status
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'conflict'),
    defaultValue: 'pending'
  },
  
  // For conflict resolution
  conflict_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'e.g., version_mismatch, deleted_on_server'
  },
  
  server_version: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Server data at time of conflict'
  },
  
  resolution: {
    type: DataTypes.ENUM('client_wins', 'server_wins', 'merged', 'manual'),
    allowNull: true
  },
  
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  resolved_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  
  // Processing info
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  last_attempt_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Completion
  synced_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Device info
  device_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  device_info: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'sync_queue',
  indexes: [
    { fields: ['client_id'], unique: true },
    { fields: ['user_id'] },
    { fields: ['entity_type'] },
    { fields: ['status'] },
    { fields: ['created_at'] },
    { fields: ['client_created_at'] }
  ]
});

module.exports = SyncQueue;
