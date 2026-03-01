/**
 * ============================================
 * Sync Routes
 * ============================================
 * Handles offline data synchronization
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { 
  SyncQueue, SeedlingBatch, ProductionLog, 
  Sale, SaleItem, Expense 
} = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// Get pending sync items for user
router.get('/pending', authenticate, asyncHandler(async (req, res) => {
  const items = await SyncQueue.findAll({
    where: {
      user_id: req.userId,
      status: { [Op.in]: ['pending', 'failed', 'conflict'] }
    },
    order: [['client_created_at', 'ASC']]
  });
  
  res.json({ success: true, data: items });
}));

// Submit sync batch
router.post('/batch', authenticate, asyncHandler(async (req, res) => {
  const { items } = req.body;
  
  if (!items || !Array.isArray(items)) {
    throw ApiError.badRequest('Items array required');
  }
  
  const results = [];
  
  for (const item of items) {
    try {
      // Check for duplicate client_id
      const existing = await SyncQueue.findOne({
        where: { client_id: item.client_id }
      });
      
      if (existing && existing.status === 'completed') {
        results.push({
          client_id: item.client_id,
          status: 'already_synced',
          server_id: existing.entity_id
        });
        continue;
      }
      
      // Process based on entity type and operation
      let result;
      
      switch (item.entity_type) {
        case 'seedling_batch':
          result = await syncSeedlingBatch(item, req.userId);
          break;
        case 'production_log':
          result = await syncProductionLog(item, req.userId);
          break;
        case 'sale':
          result = await syncSale(item, req.userId);
          break;
        case 'expense':
          result = await syncExpense(item, req.userId);
          break;
        default:
          throw new Error(`Unknown entity type: ${item.entity_type}`);
      }
      
      // Record in sync queue
      await SyncQueue.upsert({
        client_id: item.client_id,
        user_id: req.userId,
        entity_type: item.entity_type,
        entity_id: result.id,
        operation: item.operation,
        payload: item.payload,
        client_created_at: item.client_created_at,
        status: 'completed',
        synced_at: new Date()
      });
      
      results.push({
        client_id: item.client_id,
        status: 'success',
        server_id: result.id,
        data: result
      });
      
    } catch (error) {
      // Record failed sync
      await SyncQueue.upsert({
        client_id: item.client_id,
        user_id: req.userId,
        entity_type: item.entity_type,
        operation: item.operation,
        payload: item.payload,
        client_created_at: item.client_created_at,
        status: 'failed',
        error_message: error.message,
        attempts: sequelize.literal('COALESCE(attempts, 0) + 1'),
        last_attempt_at: new Date()
      });
      
      results.push({
        client_id: item.client_id,
        status: 'failed',
        error: error.message
      });
    }
  }
  
  res.json({
    success: true,
    data: {
      total: items.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      results
    }
  });
}));

// Get data updates since timestamp (for pull sync)
router.get('/updates', authenticate, asyncHandler(async (req, res) => {
  const { since, entities } = req.query;
  
  const sinceDate = since ? new Date(since) : new Date(0);
  const entityList = entities ? entities.split(',') : [
    'seedling_batch', 'production_log', 'greenhouse', 'crop', 'customer'
  ];
  
  const updates = {};
  
  if (entityList.includes('seedling_batch')) {
    updates.seedling_batches = await SeedlingBatch.findAll({
      where: { updated_at: { [Op.gt]: sinceDate } },
      limit: 100
    });
  }
  
  if (entityList.includes('production_log')) {
    updates.production_logs = await ProductionLog.findAll({
      where: { updated_at: { [Op.gt]: sinceDate } },
      limit: 200
    });
  }
  
  // Add more entities as needed...
  
  res.json({
    success: true,
    data: updates,
    sync_timestamp: new Date().toISOString()
  });
}));

// Resolve conflict
router.post('/resolve/:id', authenticate, asyncHandler(async (req, res) => {
  const { resolution, merged_data } = req.body;
  
  const syncItem = await SyncQueue.findByPk(req.params.id);
  
  if (!syncItem) {
    throw ApiError.notFound('Sync item not found');
  }
  
  if (syncItem.status !== 'conflict') {
    throw ApiError.badRequest('Item is not in conflict state');
  }
  
  let result;
  
  if (resolution === 'client_wins') {
    // Apply client data
    result = await applyClientData(syncItem);
  } else if (resolution === 'server_wins') {
    // Keep server data, mark as resolved
    result = { id: syncItem.entity_id };
  } else if (resolution === 'merged' && merged_data) {
    // Apply merged data
    result = await applyMergedData(syncItem, merged_data);
  }
  
  await syncItem.update({
    status: 'completed',
    resolution,
    resolved_at: new Date(),
    resolved_by: req.userId,
    synced_at: new Date()
  });
  
  res.json({
    success: true,
    message: 'Conflict resolved',
    data: result
  });
}));

// Helper functions for syncing different entities
async function syncSeedlingBatch(item, userId) {
  if (item.operation === 'create') {
    return SeedlingBatch.create({
      ...item.payload,
      created_by: userId,
      client_id: item.client_id,
      synced_at: new Date()
    });
  } else if (item.operation === 'update') {
    const batch = await SeedlingBatch.findOne({
      where: { client_id: item.payload.client_id }
    });
    if (batch) {
      await batch.update({ ...item.payload, synced_at: new Date() });
      return batch;
    }
    throw new Error('Batch not found for update');
  }
}

async function syncProductionLog(item, userId) {
  if (item.operation === 'create') {
    return ProductionLog.create({
      ...item.payload,
      logged_by: userId,
      client_id: item.client_id,
      synced_at: new Date()
    });
  }
}

async function syncSale(item, userId) {
  // Sales sync is more complex - implement full logic
  if (item.operation === 'create') {
    const transaction = await sequelize.transaction();
    try {
      const sale = await Sale.create({
        ...item.payload,
        created_by: userId,
        client_id: item.client_id,
        synced_at: new Date()
      }, { transaction });
      
      if (item.payload.items) {
        for (const saleItem of item.payload.items) {
          await SaleItem.create({
            ...saleItem,
            sale_id: sale.id
          }, { transaction });
        }
      }
      
      await transaction.commit();
      return sale;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

async function syncExpense(item, userId) {
  if (item.operation === 'create') {
    return Expense.create({
      ...item.payload,
      created_by: userId,
      client_id: item.client_id,
      synced_at: new Date()
    });
  }
}

async function applyClientData(syncItem) {
  // Apply the client's payload to the server
  // Implementation depends on entity type
  return { id: syncItem.entity_id };
}

async function applyMergedData(syncItem, mergedData) {
  // Apply merged data
  // Implementation depends on entity type
  return { id: syncItem.entity_id };
}

module.exports = router;
