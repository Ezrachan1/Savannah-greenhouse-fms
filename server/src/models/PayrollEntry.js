/**
 * ============================================
 * Payroll Entry Model
 * ============================================
 * Individual payroll records per employee per period
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PayrollEntry = sequelize.define('PayrollEntry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  employee_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  
  period_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'payroll_periods',
      key: 'id'
    }
  },
  
  // Employee details (denormalized)
  employee_name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  
  employee_number: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  
  // Earnings
  basic_salary: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  
  // Work details
  days_worked: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'For casual/daily workers'
  },
  
  hours_worked: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  
  overtime_hours: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 0
  },
  
  overtime_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 1.5,
    comment: '1.5x or 2x multiplier'
  },
  
  overtime_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  // Allowances
  house_allowance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  transport_allowance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  other_allowances: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  // Allowances breakdown (JSON for flexibility)
  allowances_detail: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of {name, amount}'
  },
  
  // Gross earnings
  gross_salary: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  
  // Statutory deductions
  paye: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Pay As You Earn tax'
  },
  
  nssf_employee: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Employee NSSF contribution'
  },
  
  nssf_employer: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Employer NSSF contribution'
  },
  
  nhif: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'NHIF/SHIF contribution'
  },
  
  housing_levy: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Affordable Housing Levy'
  },
  
  // Other deductions
  loan_deduction: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  advance_deduction: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  other_deductions: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  // Deductions breakdown (JSON for flexibility)
  deductions_detail: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of {name, amount, type}'
  },
  
  // Totals
  total_deductions: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  
  net_salary: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  
  // Tax calculation details
  taxable_income: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  tax_relief: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Personal relief amount'
  },
  
  // Payment details
  payment_status: {
    type: DataTypes.ENUM('pending', 'processed', 'paid', 'failed'),
    defaultValue: 'pending'
  },
  
  payment_method: {
    type: DataTypes.ENUM('bank_transfer', 'cash', 'mpesa', 'cheque'),
    defaultValue: 'bank_transfer'
  },
  
  payment_reference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('draft', 'calculated', 'approved', 'paid', 'cancelled'),
    defaultValue: 'draft'
  },
  
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'payroll_entries',
  hooks: {
    beforeSave: (entry) => {
      // Calculate gross salary
      entry.gross_salary = 
        parseFloat(entry.basic_salary || 0) +
        parseFloat(entry.overtime_amount || 0) +
        parseFloat(entry.house_allowance || 0) +
        parseFloat(entry.transport_allowance || 0) +
        parseFloat(entry.other_allowances || 0);
      
      // Calculate total deductions
      entry.total_deductions = 
        parseFloat(entry.paye || 0) +
        parseFloat(entry.nssf_employee || 0) +
        parseFloat(entry.nhif || 0) +
        parseFloat(entry.housing_levy || 0) +
        parseFloat(entry.loan_deduction || 0) +
        parseFloat(entry.advance_deduction || 0) +
        parseFloat(entry.other_deductions || 0);
      
      // Calculate net salary
      entry.net_salary = entry.gross_salary - entry.total_deductions;
    }
  },
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['period_id'] },
    { fields: ['status'] },
    { fields: ['payment_status'] },
    { 
      fields: ['employee_id', 'period_id'], 
      unique: true,
      name: 'unique_employee_period'
    }
  ]
});

module.exports = PayrollEntry;
