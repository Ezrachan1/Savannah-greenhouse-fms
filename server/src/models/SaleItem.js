/**
 * ============================================
 * Sale Item Model
 * ============================================
 * Line items for each sale transaction
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SaleItem = sequelize.define('SaleItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  sale_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'sales',
      key: 'id'
    }
  },
  
  // Item type - can be seedlings or inventory products
  item_type: {
    type: DataTypes.ENUM('seedling', 'product'),
    allowNull: false,
    defaultValue: 'seedling'
  },
  
  // Reference to product (if product sale)
  product_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'inventory_items',
      key: 'id'
    }
  },
  
  // Reference to batch (if seedling sale)
  batch_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'seedling_batches',
      key: 'id'
    }
  },
  
  // Item details (denormalized for historical record)
  item_code: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  item_name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Quantities
  quantity: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false
  },
  
  unit: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'pcs'
  },
  
  // Pricing
  unit_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  
  discount_percent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  
  discount_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  
  // Tax
  vat_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 16.00
  },
  
  is_vat_exempt: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  vat_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  
  // Totals
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'quantity * unit_price - discount'
  },
  
  total: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'subtotal + vat_amount'
  },
  
  // For cost tracking
  unit_cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  
  // Line number for ordering
  line_number: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  }
}, {
  tableName: 'sale_items',
  hooks: {
    beforeSave: (item) => {
      // Calculate subtotal
      const grossAmount = item.quantity * item.unit_price;
      item.discount_amount = item.discount_percent 
        ? (grossAmount * item.discount_percent / 100) 
        : item.discount_amount;
      item.subtotal = grossAmount - item.discount_amount;
      
      // Calculate VAT
      if (!item.is_vat_exempt && item.vat_rate > 0) {
        item.vat_amount = item.subtotal * item.vat_rate / 100;
      } else {
        item.vat_amount = 0;
      }
      
      // Calculate total
      item.total = item.subtotal + item.vat_amount;
    }
  },
  indexes: [
    { fields: ['sale_id'] },
    { fields: ['product_id'] },
    { fields: ['batch_id'] },
    { fields: ['item_type'] }
  ]
});

module.exports = SaleItem;
