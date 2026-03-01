/**
 * ============================================
 * Stock Movement Model
 * ============================================
 * Records all inventory transactions (in/out/adjustments)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockMovement = sequelize.define('StockMovement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  item_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'inventory_items',
      key: 'id'
    }
  },
  
  // Movement details
  movement_type: {
    type: DataTypes.ENUM(
      'purchase',       // Stock in from purchase
      'sale',           // Stock out from sale
      'usage',          // Used in production
      'transfer_in',    // Transfer from another location
      'transfer_out',   // Transfer to another location
      'adjustment_add', // Stock adjustment (add)
      'adjustment_sub', // Stock adjustment (subtract)
      'return_in',      // Customer return
      'return_out',     // Return to supplier
      'waste',          // Damaged/expired
      'initial'         // Initial stock entry
    ),
    allowNull: false
  },
  
  movement_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  // Quantities
  quantity: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false,
    comment: 'Always positive; direction determined by movement_type'
  },
  
  unit_cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  
  total_cost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  
  // Stock levels
  quantity_before: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: true,
    comment: 'Stock level before this movement'
  },
  
  quantity_after: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: true,
    comment: 'Stock level after this movement'
  },
  
  // References
  reference_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'e.g., purchase_order, sale, production_log'
  },
  
  reference_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID of related document'
  },
  
  reference_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Document number (e.g., PO-001, INV-001)'
  },
  
  // Batch tracking
  batch_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  
  // Additional info
  supplier_name: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for adjustment/waste'
  },
  
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
  tableName: 'stock_movements',
  indexes: [
    { fields: ['item_id'] },
    { fields: ['movement_type'] },
    { fields: ['movement_date'] },
    { fields: ['reference_type', 'reference_id'] },
    { fields: ['batch_number'] },
    { fields: ['client_id'] }
  ]
});

module.exports = StockMovement;
