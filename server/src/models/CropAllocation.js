/**
 * ============================================
 * Crop Allocation Model
 * ============================================
 * Tracks which crops are allocated to which greenhouses
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CropAllocation = sequelize.define('CropAllocation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  greenhouse_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'greenhouses',
      key: 'id'
    }
  },
  
  crop_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'crops',
      key: 'id'
    }
  },
  
  // Allocation details
  allocation_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Expected or actual end date of allocation'
  },
  
  allocated_area_sqm: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Portion of greenhouse allocated'
  },
  
  allocated_trays: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Status tracking
  status: {
    type: DataTypes.ENUM('planned', 'active', 'completed', 'cancelled'),
    defaultValue: 'active'
  },
  
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'crop_allocations',
  indexes: [
    { fields: ['greenhouse_id'] },
    { fields: ['crop_id'] },
    { fields: ['status'] },
    { fields: ['allocation_date'] }
  ]
});

module.exports = CropAllocation;
