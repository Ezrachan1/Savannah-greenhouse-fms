/**
 * ============================================
 * Employee Model
 * ============================================
 * Employee records for HR and payroll
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Employee identification
  employee_number: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    comment: 'Auto-generated: EMP-XXXX'
  },
  
  // Link to user account (optional)
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Personal information
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  
  middle_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true
  },
  
  national_id: {
    type: DataTypes.STRING(30),
    allowNull: true,
    unique: true
  },
  
  // Contact information
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  
  phone_alt: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  
  email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  town: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  county: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Emergency contact
  emergency_contact_name: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  
  emergency_contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  
  emergency_contact_relationship: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  // Employment details
  department: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  job_title: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  employment_type: {
    type: DataTypes.ENUM('permanent', 'contract', 'casual', 'intern'),
    defaultValue: 'permanent'
  },
  
  hire_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  
  contract_end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'For contract employees'
  },
  
  termination_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  
  termination_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Compensation
  basic_salary: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  
  salary_frequency: {
    type: DataTypes.ENUM('monthly', 'weekly', 'daily'),
    defaultValue: 'monthly'
  },
  
  // Statutory numbers
  kra_pin: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'KRA PIN for tax purposes'
  },
  
  nssf_number: {
    type: DataTypes.STRING(30),
    allowNull: true,
    comment: 'NSSF membership number'
  },
  
  nhif_number: {
    type: DataTypes.STRING(30),
    allowNull: true,
    comment: 'NHIF/SHIF membership number'
  },
  
  // Bank details
  bank_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  bank_branch: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  bank_account_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  bank_account_name: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended', 'terminated'),
    defaultValue: 'active'
  },
  
  // Additional info
  photo_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'employees',
  hooks: {
    beforeCreate: async (employee) => {
      // Generate employee number
      if (!employee.employee_number) {
        const count = await Employee.count();
        employee.employee_number = `EMP-${(count + 1).toString().padStart(4, '0')}`;
      }
    }
  },
  indexes: [
    { fields: ['employee_number'], unique: true },
    { fields: ['national_id'], unique: true },
    { fields: ['user_id'], unique: true },
    { fields: ['status'] },
    { fields: ['department'] },
    { fields: ['hire_date'] }
  ]
});

// Instance method to get full name
Employee.prototype.getFullName = function() {
  return [this.first_name, this.middle_name, this.last_name]
    .filter(Boolean)
    .join(' ');
};

module.exports = Employee;
