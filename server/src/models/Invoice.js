/**
 * ============================================
 * Invoice Model
 * ============================================
 * Official invoices linked to sales (KRA eTIMS)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  sale_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'sales',
      key: 'id'
    }
  },
  
  // Invoice identification
  invoice_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Internal invoice number: INV-YYYYMMDD-XXXX'
  },
  
  invoice_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  
  // Invoice type for eTIMS
  invoice_type: {
    type: DataTypes.ENUM('tax_invoice', 'credit_note', 'debit_note'),
    defaultValue: 'tax_invoice'
  },
  
  // Customer info (denormalized)
  customer_name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  
  customer_pin: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  
  customer_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  customer_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  
  // Amounts
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  
  vat_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  discount_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  total_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  
  // KRA eTIMS fields
  etims_invoice_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'eTIMS assigned invoice number'
  },
  
  etims_cu_invoice_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Control Unit invoice number'
  },
  
  etims_receipt_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  etims_verification_code: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  etims_qr_code: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'QR code data for printing'
  },
  
  etims_qr_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL for QR code verification'
  },
  
  etims_signature: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Digital signature'
  },
  
  etims_status: {
    type: DataTypes.ENUM('pending', 'submitted', 'accepted', 'rejected', 'error'),
    defaultValue: 'pending'
  },
  
  etims_submitted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  etims_response: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Full response from KRA'
  },
  
  etims_error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('draft', 'issued', 'sent', 'paid', 'cancelled'),
    defaultValue: 'issued'
  },
  
  // Reference for credit/debit notes
  original_invoice_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Reference to original invoice for credit/debit notes'
  },
  
  // Notes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Tracking
  created_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  
  printed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  emailed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'invoices',
  hooks: {
    beforeCreate: async (invoice) => {
      // Generate invoice number
      if (!invoice.invoice_number) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await Invoice.count({
          where: sequelize.where(
            sequelize.fn('DATE', sequelize.col('invoice_date')),
            today.toISOString().slice(0, 10)
          )
        });
        invoice.invoice_number = `INV-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
      }
    }
  },
  indexes: [
    { fields: ['invoice_number'], unique: true },
    { fields: ['sale_id'], unique: true },
    { fields: ['invoice_date'] },
    { fields: ['etims_status'] },
    { fields: ['status'] },
    { fields: ['etims_invoice_number'] }
  ]
});

module.exports = Invoice;
