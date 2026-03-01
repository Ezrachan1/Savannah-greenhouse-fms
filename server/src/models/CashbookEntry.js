/**
 * ============================================
 * Cashbook Entry Model
 * ============================================
 * Records all cash transactions
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CashbookEntry = sequelize.define('CashbookEntry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Entry identification
  entry_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  
  entry_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  // Transaction type
  entry_type: {
    type: DataTypes.ENUM('receipt', 'payment'),
    allowNull: false
  },
  
  // Account/Cash type
  account_type: {
    type: DataTypes.ENUM('cash', 'bank', 'mpesa', 'petty_cash'),
    defaultValue: 'cash'
  },
  
  // Details
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  
  // Amounts
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  
  // Balance tracking
  running_balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Balance after this transaction'
  },
  
  // Source/Reference
  reference_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'e.g., sale, expense, payroll, transfer'
  },
  
  reference_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  
  reference_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // For linking
  sale_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'sales',
      key: 'id'
    }
  },
  
  expense_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'expenses',
      key: 'id'
    }
  },
  
  // Party
  party_name: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Customer/Vendor name'
  },
  
  // Payment details
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  payment_reference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Status
  is_reconciled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  reconciled_at: {
    type: DataTypes.DATE,
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
  
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'cashbook_entries',
  hooks: {
    beforeCreate: async (entry) => {
      // Generate entry number
      if (!entry.entry_number) {
        const prefix = entry.entry_type === 'receipt' ? 'RCP' : 'PMT';
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await CashbookEntry.count({
          where: {
            entry_type: entry.entry_type
          }
        });
        entry.entry_number = `${prefix}-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
      }
    }
  },
  indexes: [
    { fields: ['entry_number'], unique: true },
    { fields: ['entry_date'] },
    { fields: ['entry_type'] },
    { fields: ['account_type'] },
    { fields: ['sale_id'] },
    { fields: ['expense_id'] },
    { fields: ['is_reconciled'] }
  ]
});

module.exports = CashbookEntry;
