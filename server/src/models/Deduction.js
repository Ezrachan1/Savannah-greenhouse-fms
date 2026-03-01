/**
 * ============================================
 * Deduction Model
 * ============================================
 * Detailed deduction records linked to payroll entries
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Deduction = sequelize.define('Deduction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  payroll_entry_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'payroll_entries',
      key: 'id'
    }
  },
  
  deduction_type: {
    type: DataTypes.ENUM(
      'paye',
      'nssf',
      'nhif',
      'housing_levy',
      'loan',
      'advance',
      'sacco',
      'insurance',
      'other'
    ),
    allowNull: false
  },
  
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  
  // For loans and advances
  reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Loan reference, etc.'
  },
  
  is_statutory: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'deductions',
  indexes: [
    { fields: ['payroll_entry_id'] },
    { fields: ['deduction_type'] }
  ]
});

module.exports = Deduction;
