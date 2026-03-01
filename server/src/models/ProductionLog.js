/**
 * ============================================
 * Production Log Model
 * ============================================
 * Records activities and events for seedling batches
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductionLog = sequelize.define('ProductionLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  batch_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'seedling_batches',
      key: 'id'
    }
  },
  
  // Log details
  log_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  log_time: {
    type: DataTypes.TIME,
    allowNull: true
  },
  
  activity_type: {
    type: DataTypes.ENUM(
      'sowing',
      'germination_check',
      'watering',
      'fertilizing',
      'pest_control',
      'disease_treatment',
      'thinning',
      'transplanting',
      'hardening',
      'quality_check',
      'loss_recorded',
      'status_update',
      'harvest_ready',
      'other'
    ),
    allowNull: false
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Quantity changes
  quantity_affected: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Number of seedlings affected'
  },
  
  quantity_lost: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  
  loss_reason: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  
  // Inputs used (reference to inventory)
  inputs_used: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Array of {item_id, quantity, unit}'
  },
  
  // Observations
  temperature: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Recorded temperature in °C'
  },
  
  humidity: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Recorded humidity percentage'
  },
  
  growth_stage: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  health_status: {
    type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor', 'critical'),
    allowNull: true
  },
  
  // Images (stored as array of URLs)
  images: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  // Tracking
  logged_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Offline sync
  client_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  synced_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'production_logs',
  indexes: [
    { fields: ['batch_id'] },
    { fields: ['log_date'] },
    { fields: ['activity_type'] },
    { fields: ['logged_by'] },
    { fields: ['client_id'] }
  ]
});

module.exports = ProductionLog;
