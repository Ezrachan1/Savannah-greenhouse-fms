/**
 * ============================================
 * Sale Model
 * ============================================
 * Records sales transactions
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Sale identification
  sale_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Auto-generated: SL-YYYYMMDD-XXXX'
  },
  
  sale_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  sale_time: {
    type: DataTypes.TIME,
    allowNull: true
  },
  
  // Customer
  customer_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'customers',
      key: 'id'
    },
    comment: 'Null for walk-in/cash customers'
  },
  
  customer_name: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'For walk-in customers or denormalized'
  },
  
  customer_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  
  // Totals
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  
  discount_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  discount_percent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  
  tax_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'VAT amount'
  },
  
  total_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  
  // Payment
  payment_method: {
    type: DataTypes.ENUM('cash', 'mpesa', 'bank_transfer', 'cheque', 'credit', 'mixed'),
    defaultValue: 'cash'
  },
  
  payment_status: {
    type: DataTypes.ENUM('paid', 'partial', 'pending', 'overdue'),
    defaultValue: 'paid'
  },
  
  amount_paid: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  balance_due: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'For credit sales'
  },
  
  // Payment references
  mpesa_receipt: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  bank_reference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  cheque_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('draft', 'confirmed', 'completed', 'cancelled', 'voided'),
    defaultValue: 'confirmed'
  },
  
  void_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  voided_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  
  voided_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // eTIMS integration
  etims_submitted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  etims_invoice_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  etims_cu_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Control Unit Number'
  },
  
  etims_qr_code: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  etims_submitted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  etims_response: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  
  // Notes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Tracking
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Offline sync
  client_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  synced_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'sales',
  hooks: {
    beforeCreate: async (sale) => {
      // sale_number is now generated in the route to avoid transaction issues
      // This hook is kept for cases where sale is created without using the route
      if (!sale.sale_number) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        sale.sale_number = `SL-${dateStr}-${randomSuffix}`;
      }
    },
    beforeSave: (sale) => {
      // Calculate balance
      sale.balance_due = sale.total_amount - sale.amount_paid;
      
      // Update payment status
      if (sale.balance_due <= 0) {
        sale.payment_status = 'paid';
      } else if (sale.amount_paid > 0) {
        sale.payment_status = 'partial';
      } else {
        sale.payment_status = 'pending';
      }
    }
  },
  indexes: [
    { fields: ['sale_number'], unique: true },
    { fields: ['sale_date'] },
    { fields: ['customer_id'] },
    { fields: ['status'] },
    { fields: ['payment_status'] },
    { fields: ['etims_submitted'] },
    { fields: ['client_id'] }
  ]
});

module.exports = Sale;
