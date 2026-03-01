/**
 * ============================================
 * Payroll Period Model
 * ============================================
 * Defines payroll periods (monthly, weekly, etc.)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PayrollPeriod = sequelize.define('PayrollPeriod', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Period identification
  period_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'e.g., January 2026, Week 1 2026'
  },
  
  period_code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'e.g., 2026-01, 2026-W01'
  },
  
  // Period dates
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  
  payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Scheduled or actual payment date'
  },
  
  // Period type
  period_type: {
    type: DataTypes.ENUM('monthly', 'weekly', 'bi-weekly', 'semi-monthly'),
    defaultValue: 'monthly'
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('open', 'processing', 'approved', 'paid', 'closed'),
    defaultValue: 'open'
  },
  
  // Totals (calculated)
  total_gross: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  total_deductions: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  total_net: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  employee_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // Statutory totals
  total_paye: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  total_nssf: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  total_nhif: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  // Processing timestamps
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  processed_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  approved_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Notes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'payroll_periods',
  indexes: [
    { fields: ['period_code'], unique: true },
    { fields: ['status'] },
    { fields: ['start_date', 'end_date'] },
    { fields: ['period_type'] }
  ]
});

module.exports = PayrollPeriod;
