/**
 * ============================================
 * Greenhouse Model
 * ============================================
 * Represents physical greenhouses on the farm
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Greenhouse = sequelize.define('Greenhouse', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Short code for quick reference (e.g., GH-01)'
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Physical dimensions
  length_meters: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  
  width_meters: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  
  // Calculated or entered
  area_sqm: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Area in square meters'
  },
  
  // Capacity
  capacity_trays: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Maximum number of trays'
  },
  
  capacity_seedlings: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Maximum seedling capacity'
  },
  
  // Infrastructure
  type: {
    type: DataTypes.ENUM('tunnel', 'gothic', 'multi-span', 'shade-net', 'other'),
    defaultValue: 'tunnel'
  },
  
  covering_material: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'e.g., Polythene, Shade net, Glass'
  },
  
  has_irrigation: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  irrigation_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'e.g., Drip, Sprinkler, Mist'
  },
  
  has_climate_control: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'decommissioned'),
    defaultValue: 'active'
  },
  
  // Location on farm
  location_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Date tracking
  construction_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  
  last_maintenance_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  
  // Additional metadata
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'greenhouses',
  hooks: {
    beforeCreate: (greenhouse) => {
      // Auto-calculate area if dimensions provided
      if (greenhouse.length_meters && greenhouse.width_meters) {
        greenhouse.area_sqm = greenhouse.length_meters * greenhouse.width_meters;
      }
    },
    beforeUpdate: (greenhouse) => {
      if (greenhouse.changed('length_meters') || greenhouse.changed('width_meters')) {
        if (greenhouse.length_meters && greenhouse.width_meters) {
          greenhouse.area_sqm = greenhouse.length_meters * greenhouse.width_meters;
        }
      }
    }
  },
  indexes: [
    { fields: ['name'], unique: true },
    { fields: ['code'], unique: true },
    { fields: ['status'] },
    { fields: ['type'] }
  ]
});

module.exports = Greenhouse;
