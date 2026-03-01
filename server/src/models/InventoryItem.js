/**
 * ============================================
 * Inventory Item Model
 * ============================================
 * Tracks farm inputs: seeds, fertilizers, pesticides, tools, etc.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InventoryItem = sequelize.define('InventoryItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Basic info
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'SKU or internal code'
  },
  
  category_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'inventory_categories',
      key: 'id'
    }
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Stock management
  unit: {
    type: DataTypes.STRING(30),
    allowNull: false,
    comment: 'e.g., kg, liters, packets, pieces'
  },
  
  current_quantity: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false,
    defaultValue: 0
  },
  
  minimum_quantity: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: true,
    defaultValue: 0,
    comment: 'Reorder point - trigger stock alert'
  },
  
  maximum_quantity: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: true,
    comment: 'Maximum stock level'
  },
  
  reorder_quantity: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: true,
    comment: 'Standard quantity to reorder'
  },
  
  // Pricing
  cost_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'Purchase cost per unit'
  },
  
  selling_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'If item is also sold'
  },
  
  is_sellable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Can this item be sold to customers?'
  },
  
  // VAT configuration for sales
  vat_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 16.00,
    comment: 'VAT rate percentage (Kenya standard 16%)'
  },
  
  is_vat_exempt: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Tracking
  batch_tracking: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Track by batch/lot number'
  },
  
  expiry_tracking: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Track expiry dates'
  },
  
  // Supplier info
  primary_supplier: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  
  supplier_code: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Supplier\'s product code'
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'discontinued'),
    defaultValue: 'active'
  },
  
  // Location
  storage_location: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Where item is stored'
  },
  
  // Additional
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Calculated fields (updated by triggers/hooks)
  total_value: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'current_quantity * cost_price'
  },
  
  last_purchase_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  
  last_usage_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'inventory_items',
  hooks: {
    beforeSave: (item) => {
      // Calculate total value
      if (item.current_quantity && item.cost_price) {
        item.total_value = item.current_quantity * item.cost_price;
      }
    }
  },
  indexes: [
    { fields: ['name'] },
    { fields: ['code'], unique: true },
    { fields: ['category_id'] },
    { fields: ['status'] },
    { fields: ['is_sellable'] },
    // Composite index for stock alerts
    {
      name: 'idx_low_stock',
      fields: ['current_quantity', 'minimum_quantity', 'status']
    }
  ]
});

// Instance method to check if stock is low
InventoryItem.prototype.isLowStock = function() {
  return this.current_quantity <= this.minimum_quantity;
};

module.exports = InventoryItem;
