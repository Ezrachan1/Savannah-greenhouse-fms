/**
 * ============================================
 * Input Usage Model
 * ============================================
 * Tracks usage of inventory items per greenhouse/batch
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InputUsage = sequelize.define('InputUsage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  item_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'inventory_items',
      key: 'id'
    }
  },
  
  // Where it was used
  greenhouse_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'greenhouses',
      key: 'id'
    }
  },
  
  batch_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'seedling_batches',
      key: 'id'
    }
  },
  
  // Usage details
  usage_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  quantity_used: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false
  },
  
  unit: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  
  unit_cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  
  total_cost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  
  // Purpose
  purpose: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'e.g., Pest control, Fertilization, Planting'
  },
  
  application_method: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'e.g., Foliar spray, Soil drench'
  },
  
  // Tracking
  recorded_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Offline sync
  client_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  tableName: 'input_usages',
  hooks: {
    beforeSave: (usage) => {
      if (usage.quantity_used && usage.unit_cost) {
        usage.total_cost = usage.quantity_used * usage.unit_cost;
      }
    }
  },
  indexes: [
    { fields: ['item_id'] },
    { fields: ['greenhouse_id'] },
    { fields: ['batch_id'] },
    { fields: ['usage_date'] },
    { fields: ['client_id'] }
  ]
});

module.exports = InputUsage;
