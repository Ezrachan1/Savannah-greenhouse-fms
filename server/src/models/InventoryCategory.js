/**
 * ============================================
 * Inventory Category Model
 * ============================================
 * Categories for organizing inventory items
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InventoryCategory = sequelize.define('InventoryCategory', {
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
    unique: true
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  parent_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'inventory_categories',
      key: 'id'
    },
    comment: 'For nested categories'
  },
  
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  display_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'inventory_categories',
  indexes: [
    { fields: ['name'], unique: true },
    { fields: ['code'], unique: true },
    { fields: ['parent_id'] },
    { fields: ['is_active'] }
  ]
});

// Self-referencing relationship for subcategories
InventoryCategory.hasMany(InventoryCategory, { 
  foreignKey: 'parent_id', 
  as: 'subcategories' 
});
InventoryCategory.belongsTo(InventoryCategory, { 
  foreignKey: 'parent_id', 
  as: 'parent' 
});

module.exports = InventoryCategory;
