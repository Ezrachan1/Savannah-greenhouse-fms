/**
 * ============================================
 * Seedling Batch Model
 * ============================================
 * Tracks individual batches of seedling production
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SeedlingBatch = sequelize.define('SeedlingBatch', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Batch identification
  batch_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Auto-generated batch number: CROP-GH-YYYYMMDD-SEQ'
  },
  
  crop_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'crops',
      key: 'id'
    }
  },
  
  greenhouse_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'greenhouses',
      key: 'id'
    }
  },
  
  // Production quantities
  seeds_sown: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Number of seeds sown'
  },
  
  trays_used: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  germinated_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: 'Number of seeds that germinated'
  },
  
  current_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Current available seedlings (updated as sold/lost)'
  },
  
  sold_quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  lost_quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Lost to disease, pests, or other factors'
  },
  
  // Dates
  sowing_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  
  expected_germination_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  
  actual_germination_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  
  expected_ready_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Expected date seedlings will be transplant-ready'
  },
  
  actual_ready_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  
  // Status tracking
  status: {
    type: DataTypes.ENUM(
      'sown',
      'germinating',
      'growing',
      'ready',
      'selling',
      'completed',
      'failed'
    ),
    defaultValue: 'sown'
  },
  
  // Quality metrics
  germination_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Actual germination rate percentage'
  },
  
  quality_grade: {
    type: DataTypes.ENUM('A', 'B', 'C', 'reject'),
    allowNull: true
  },
  
  // Costing
  seed_cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  
  other_costs: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'Media, labor, etc.'
  },
  
  total_cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  
  cost_per_seedling: {
    type: DataTypes.DECIMAL(10, 4),
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
  },
  
  // For offline sync
  client_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Unique ID from client for offline sync'
  },
  
  synced_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'seedling_batches',
  hooks: {
    beforeCreate: async (batch) => {
      // Generate batch number if not provided
      if (!batch.batch_number) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        
        // Get crop code (would need to be fetched in real scenario)
        const seq = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        batch.batch_number = `BATCH-${dateStr}-${seq}`;
      }
    },
    afterUpdate: (batch) => {
      // Recalculate current quantity
      if (batch.changed('germinated_count') || 
          batch.changed('sold_quantity') || 
          batch.changed('lost_quantity')) {
        batch.current_quantity = 
          (batch.germinated_count || 0) - 
          (batch.sold_quantity || 0) - 
          (batch.lost_quantity || 0);
      }
      
      // Calculate germination rate
      if (batch.changed('germinated_count') && batch.seeds_sown > 0) {
        batch.germination_rate = 
          ((batch.germinated_count / batch.seeds_sown) * 100).toFixed(2);
      }
    }
  },
  indexes: [
    { fields: ['batch_number'], unique: true },
    { fields: ['crop_id'] },
    { fields: ['greenhouse_id'] },
    { fields: ['status'] },
    { fields: ['sowing_date'] },
    { fields: ['client_id'] }
  ]
});

module.exports = SeedlingBatch;
