/**
 * ============================================
 * Setting Model
 * ============================================
 * System configuration and settings storage
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Setting identification
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  
  value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // For complex values
  json_value: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  
  // Setting metadata
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'general'
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  data_type: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'json', 'date'),
    defaultValue: 'string'
  },
  
  // Access control
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Can be accessed without auth'
  },
  
  is_editable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // Audit
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'settings',
  indexes: [
    { fields: ['key'], unique: true },
    { fields: ['category'] }
  ]
});

// Class method to get setting value
Setting.getValue = async function(key, defaultValue = null) {
  const setting = await this.findOne({ where: { key } });
  if (!setting) return defaultValue;
  
  switch (setting.data_type) {
    case 'json':
      return setting.json_value || defaultValue;
    case 'number':
      return parseFloat(setting.value) || defaultValue;
    case 'boolean':
      return setting.value === 'true';
    case 'date':
      return setting.value ? new Date(setting.value) : defaultValue;
    default:
      return setting.value || defaultValue;
  }
};

// Class method to set value
Setting.setValue = async function(key, value, options = {}) {
  const { category = 'general', description, data_type = 'string', updated_by } = options;
  
  let processedValue = value;
  let jsonValue = null;
  
  if (data_type === 'json') {
    jsonValue = value;
    processedValue = null;
  } else if (typeof value !== 'string') {
    processedValue = String(value);
  }
  
  const [setting] = await this.upsert({
    key,
    value: processedValue,
    json_value: jsonValue,
    category,
    description,
    data_type,
    updated_by
  });
  
  return setting;
};

// Default system settings
Setting.defaults = {
  // Company settings
  'company.name': 'Savannah Propagation Nursery',
  'company.address': 'Mogotio Town, Nakuru County',
  'company.phone': '+254700000000',
  'company.email': 'info@savannahpropagation.co.ke',
  'company.kra_pin': 'P000000000X',
  
  // Tax rates (store as JSON for easy updates)
  'tax.vat_rate': '16',
  'tax.vat_effective_date': '2024-01-01',
  
  // NSSF rates (Tier I & II)
  'payroll.nssf_tier1_limit': '7000',
  'payroll.nssf_tier2_limit': '36000',
  'payroll.nssf_rate': '6',
  
  // NHIF/SHIF rates (stored as JSON brackets)
  'payroll.nhif_brackets': JSON.stringify([
    { min: 0, max: 5999, amount: 150 },
    { min: 6000, max: 7999, amount: 300 },
    { min: 8000, max: 11999, amount: 400 },
    { min: 12000, max: 14999, amount: 500 },
    { min: 15000, max: 19999, amount: 600 },
    { min: 20000, max: 24999, amount: 750 },
    { min: 25000, max: 29999, amount: 850 },
    { min: 30000, max: 34999, amount: 900 },
    { min: 35000, max: 39999, amount: 950 },
    { min: 40000, max: 44999, amount: 1000 },
    { min: 45000, max: 49999, amount: 1100 },
    { min: 50000, max: 59999, amount: 1200 },
    { min: 60000, max: 69999, amount: 1300 },
    { min: 70000, max: 79999, amount: 1400 },
    { min: 80000, max: 89999, amount: 1500 },
    { min: 90000, max: 99999, amount: 1600 },
    { min: 100000, max: Infinity, amount: 1700 }
  ]),
  
  // PAYE brackets (Kenya 2024)
  'payroll.paye_brackets': JSON.stringify([
    { min: 0, max: 24000, rate: 10 },
    { min: 24001, max: 32333, rate: 25 },
    { min: 32334, max: 500000, rate: 30 },
    { min: 500001, max: 800000, rate: 32.5 },
    { min: 800001, max: Infinity, rate: 35 }
  ]),
  
  'payroll.personal_relief': '2400',
  'payroll.insurance_relief_limit': '5000',
  'payroll.housing_levy_rate': '1.5',
  
  // Invoice settings
  'invoice.prefix': 'INV',
  'invoice.terms': 'Payment due within 30 days',
  'invoice.footer': 'Thank you for your business!',
  
  // System settings
  'system.currency': 'KES',
  'system.date_format': 'DD/MM/YYYY',
  'system.timezone': 'Africa/Nairobi'
};

module.exports = Setting;
