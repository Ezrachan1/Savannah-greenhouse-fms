/**
 * ============================================
 * Expense Category Model
 * ============================================
 * Categories for expense classification
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ExpenseCategory = sequelize.define('ExpenseCategory', {
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
  
  // For accounting integration
  gl_account: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'General ledger account code'
  },
  
  parent_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'expense_categories',
      key: 'id'
    }
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
  tableName: 'expense_categories',
  indexes: [
    { fields: ['name'], unique: true },
    { fields: ['code'], unique: true },
    { fields: ['parent_id'] },
    { fields: ['is_active'] }
  ]
});

// Self-referencing for subcategories
ExpenseCategory.hasMany(ExpenseCategory, { foreignKey: 'parent_id', as: 'subcategories' });
ExpenseCategory.belongsTo(ExpenseCategory, { foreignKey: 'parent_id', as: 'parent' });

module.exports = ExpenseCategory;
