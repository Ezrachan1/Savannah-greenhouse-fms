/**
 * ============================================
 * Expense Model
 * ============================================
 * Records farm expenses
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Expense identification
  expense_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Auto-generated: EXP-YYYYMMDD-XXXX'
  },
  
  category_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'expense_categories',
      key: 'id'
    }
  },
  
  // Details
  expense_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  
  // Amounts
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  
  vat_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  total_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  
  // Vendor/Payee
  vendor_name: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  
  vendor_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  
  // Payment details
  payment_method: {
    type: DataTypes.ENUM('cash', 'mpesa', 'bank_transfer', 'cheque', 'petty_cash'),
    defaultValue: 'cash'
  },
  
  payment_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'M-PESA code, cheque number, etc.'
  },
  
  is_paid: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  paid_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  
  // Supporting documents
  receipt_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  attachments: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of file URLs'
  },
  
  // Approval workflow
  requires_approval: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  approval_status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'approved'
  },
  
  approved_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Association (optional)
  greenhouse_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'If expense is for specific greenhouse'
  },
  
  batch_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'If expense is for specific batch'
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'approved', 'paid', 'cancelled'),
    defaultValue: 'approved'
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
  
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Offline sync
  client_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  tableName: 'expenses',
  hooks: {
    beforeCreate: async (expense) => {
      // Generate expense number
      if (!expense.expense_number) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await Expense.count({
          where: sequelize.where(
            sequelize.fn('DATE', sequelize.col('expense_date')),
            today.toISOString().slice(0, 10)
          )
        });
        expense.expense_number = `EXP-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
      }
    },
    beforeSave: (expense) => {
      // Calculate total
      expense.total_amount = parseFloat(expense.amount || 0) + parseFloat(expense.vat_amount || 0);
    }
  },
  indexes: [
    { fields: ['expense_number'], unique: true },
    { fields: ['category_id'] },
    { fields: ['expense_date'] },
    { fields: ['status'] },
    { fields: ['approval_status'] },
    { fields: ['created_by'] },
    { fields: ['client_id'] }
  ]
});

module.exports = Expense;
