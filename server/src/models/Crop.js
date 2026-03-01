/**
 * ============================================
 * Crop Model
 * ============================================
 * Represents crop/plant types grown in the nursery
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Crop = sequelize.define('Crop', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  
  scientific_name: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Short code for batch identification'
  },
  
  variety: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  category: {
    type: DataTypes.ENUM(
      'vegetables',
      'fruits',
      'ornamentals',
      'forestry',
      'herbs',
      'other'
    ),
    defaultValue: 'vegetables'
  },
  
  // Growing information
  germination_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Days from sowing to germination'
  },
  
  transplant_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Days from sowing to transplant-ready'
  },
  
  optimal_temp_min: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Minimum optimal temperature (°C)'
  },
  
  optimal_temp_max: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Maximum optimal temperature (°C)'
  },
  
  // Commercial info
  default_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Default selling price per seedling'
  },
  
  price_unit: {
    type: DataTypes.ENUM('per_seedling', 'per_tray', 'per_hundred', 'per_thousand'),
    defaultValue: 'per_seedling'
  },
  
  // Stock management
  seeds_per_tray: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 200
  },
  
  expected_germination_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 85.00,
    comment: 'Expected germination rate percentage'
  },
  
  // Status
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // Additional info
  growing_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  tableName: 'crops',
  indexes: [
    { fields: ['name'] },
    { fields: ['code'], unique: true },
    { fields: ['category'] },
    { fields: ['is_active'] }
  ]
});

module.exports = Crop;
