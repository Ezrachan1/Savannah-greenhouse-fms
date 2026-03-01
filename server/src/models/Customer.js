/**
 * ============================================
 * Customer Model
 * ============================================
 * Manages customer information for sales
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Customer identification
  customer_code: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    comment: 'Auto-generated: CUST-XXXX'
  },
  
  // Type of customer
  customer_type: {
    type: DataTypes.ENUM('individual', 'business', 'farm', 'dealer', 'other'),
    defaultValue: 'individual'
  },
  
  // Personal/Business info
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  
  contact_person: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'For business customers'
  },
  
  // Contact details
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
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  
  // Address
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
  
  country: {
    type: DataTypes.STRING(100),
    defaultValue: 'Kenya'
  },
  
  // Tax/KRA info (required for eTIMS)
  kra_pin: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Customer KRA PIN for B2B invoices'
  },
  
  is_vat_registered: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Commercial terms
  credit_limit: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Maximum credit allowed'
  },
  
  payment_terms: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Payment days (0 = cash)'
  },
  
  price_category: {
    type: DataTypes.ENUM('standard', 'wholesale', 'retail', 'dealer', 'custom'),
    defaultValue: 'standard'
  },
  
  discount_percent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  
  // Balance tracking
  current_balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Outstanding balance (positive = owes us)'
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'blocked', 'prospect'),
    defaultValue: 'active'
  },
  
  // Additional
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Statistics (updated by triggers)
  total_purchases: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  purchase_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  last_purchase_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'customers',
  hooks: {
    beforeCreate: async (customer) => {
      // Generate customer code if not provided
      if (!customer.customer_code) {
        const count = await Customer.count();
        customer.customer_code = `CUST-${(count + 1).toString().padStart(4, '0')}`;
      }
    }
  },
  indexes: [
    { fields: ['customer_code'], unique: true },
    { fields: ['name'] },
    { fields: ['phone'] },
    { fields: ['email'] },
    { fields: ['kra_pin'] },
    { fields: ['status'] },
    { fields: ['customer_type'] }
  ]
});

module.exports = Customer;
