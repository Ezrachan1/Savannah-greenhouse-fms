/**
 * ============================================
 * Production Routes (Seedling Batches)
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../middleware/auth');
const { SeedlingBatch, Crop, Greenhouse, ProductionLog, User } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// Get all batches
router.get('/batches', authenticate, hasPermission('production', 'view'), asyncHandler(async (req, res) => {
  const { 
    page = 1, limit = 20, status, greenhouse_id, crop_id, 
    search, from_date, to_date 
  } = req.query;
  
  const where = {};
  
  if (status) {
    // Handle comma-separated status values
    const statusList = status.split(',').map(s => s.trim());
    if (statusList.length > 1) {
      where.status = { [Op.in]: statusList };
    } else {
      where.status = status;
    }
  }
  
  if (greenhouse_id) {
    where.greenhouse_id = greenhouse_id;
  }
  
  if (crop_id) {
    where.crop_id = crop_id;
  }
  
  if (search) {
    where.batch_number = { [Op.iLike]: `%${search}%` };
  }
  
  if (from_date) {
    where.sowing_date = { ...where.sowing_date, [Op.gte]: from_date };
  }
  
  if (to_date) {
    where.sowing_date = { ...where.sowing_date, [Op.lte]: to_date };
  }
  
  const batches = await SeedlingBatch.findAndCountAll({
    where,
    include: [
      { model: Crop, as: 'crop', attributes: ['id', 'name', 'code', 'variety', 'default_price'] },
      { model: Greenhouse, as: 'greenhouse', attributes: ['id', 'name', 'code'] },
      { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }
    ],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['sowing_date', 'DESC']]
  });
  
  res.json({
    success: true,
    data: batches.rows,
    pagination: {
      total: batches.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(batches.count / parseInt(limit))
    }
  });
}));

// Get production summary
router.get('/summary', authenticate, asyncHandler(async (req, res) => {
  const statuses = ['sown', 'germinating', 'growing', 'ready', 'selling'];
  
  const summary = await SeedlingBatch.findAll({
    where: { status: { [Op.in]: statuses } },
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'batch_count'],
      [sequelize.fn('SUM', sequelize.col('current_quantity')), 'total_seedlings']
    ],
    group: ['status']
  });
  
  // Total ready for sale
  const readyForSale = await SeedlingBatch.sum('current_quantity', {
    where: { status: { [Op.in]: ['ready', 'selling'] } }
  });
  
  res.json({
    success: true,
    data: {
      byStatus: summary,
      readyForSale: readyForSale || 0
    }
  });
}));

// Get single batch
router.get('/batches/:id', authenticate, hasPermission('production', 'view'), asyncHandler(async (req, res) => {
  const batch = await SeedlingBatch.findByPk(req.params.id, {
    include: [
      { model: Crop, as: 'crop' },
      { model: Greenhouse, as: 'greenhouse' },
      { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] },
      {
        model: ProductionLog,
        as: 'logs',
        include: [{ model: User, as: 'logger', attributes: ['id', 'first_name', 'last_name'] }],
        order: [['log_date', 'DESC'], ['created_at', 'DESC']],
        limit: 20
      }
    ]
  });
  
  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }
  
  res.json({ success: true, data: batch });
}));

// Create new batch
router.post('/batches', authenticate, hasPermission('production', 'create'), asyncHandler(async (req, res) => {
  const {
    crop_id, greenhouse_id, seeds_sown, trays_used,
    sowing_date, expected_germination_date, expected_ready_date,
    seed_cost, other_costs, notes, client_id
  } = req.body;
  
  // Verify crop and greenhouse exist
  const crop = await Crop.findByPk(crop_id);
  if (!crop) {
    throw ApiError.notFound('Crop not found');
  }
  
  const greenhouse = await Greenhouse.findByPk(greenhouse_id);
  if (!greenhouse) {
    throw ApiError.notFound('Greenhouse not found');
  }
  
  // Generate batch number
  const today = new Date(sowing_date || new Date());
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await SeedlingBatch.count({
    where: sequelize.where(
      sequelize.fn('DATE', sequelize.col('sowing_date')),
      today.toISOString().slice(0, 10)
    )
  });
  const batchNumber = `${crop.code}-${greenhouse.code}-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;
  
  const batch = await SeedlingBatch.create({
    batch_number: batchNumber,
    crop_id,
    greenhouse_id,
    seeds_sown,
    current_quantity: seeds_sown, // Initialize with seeds sown
    trays_used,
    sowing_date: sowing_date || new Date(),
    expected_germination_date,
    expected_ready_date,
    seed_cost,
    other_costs,
    total_cost: (parseFloat(seed_cost) || 0) + (parseFloat(other_costs) || 0),
    notes,
    created_by: req.userId,
    client_id,
    status: 'sown'
  });
  
  // Create initial production log
  await ProductionLog.create({
    batch_id: batch.id,
    log_date: sowing_date || new Date(),
    activity_type: 'sowing',
    description: `Sowed ${seeds_sown} seeds in ${trays_used || 'N/A'} trays`,
    logged_by: req.userId
  });
  
  await batch.reload({
    include: [
      { model: Crop, as: 'crop' },
      { model: Greenhouse, as: 'greenhouse' }
    ]
  });
  
  res.status(201).json({
    success: true,
    message: 'Batch created successfully',
    data: batch
  });
}));

// Update batch
router.put('/batches/:id', authenticate, hasPermission('production', 'edit'), asyncHandler(async (req, res) => {
  const batch = await SeedlingBatch.findByPk(req.params.id);
  
  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }
  
  await batch.update(req.body);
  
  await batch.reload({
    include: [
      { model: Crop, as: 'crop' },
      { model: Greenhouse, as: 'greenhouse' }
    ]
  });
  
  res.json({
    success: true,
    message: 'Batch updated successfully',
    data: batch
  });
}));

// Record germination
router.post('/batches/:id/germination', authenticate, hasPermission('production', 'edit'), asyncHandler(async (req, res) => {
  const { germinated_count, actual_germination_date, notes } = req.body;
  
  const batch = await SeedlingBatch.findByPk(req.params.id);
  
  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }
  
  const germination_rate = batch.seeds_sown > 0 
    ? ((germinated_count / batch.seeds_sown) * 100).toFixed(2) 
    : 0;
  
  await batch.update({
    germinated_count,
    current_quantity: germinated_count,
    actual_germination_date: actual_germination_date || new Date(),
    germination_rate,
    status: 'germinating'
  });
  
  // Log the germination
  await ProductionLog.create({
    batch_id: batch.id,
    log_date: actual_germination_date || new Date(),
    activity_type: 'germination_check',
    description: `Germination recorded: ${germinated_count} seedlings (${germination_rate}% rate)`,
    quantity_affected: germinated_count,
    logged_by: req.userId
  });
  
  res.json({
    success: true,
    message: 'Germination recorded',
    data: batch
  });
}));

// Record loss
router.post('/batches/:id/loss', authenticate, hasPermission('production', 'edit'), asyncHandler(async (req, res) => {
  const { quantity, reason, notes } = req.body;
  
  const batch = await SeedlingBatch.findByPk(req.params.id);
  
  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }
  
  if (quantity > batch.current_quantity) {
    throw ApiError.badRequest('Loss quantity exceeds current quantity');
  }
  
  await batch.update({
    lost_quantity: (batch.lost_quantity || 0) + quantity,
    current_quantity: batch.current_quantity - quantity
  });
  
  await ProductionLog.create({
    batch_id: batch.id,
    log_date: new Date(),
    activity_type: 'loss_recorded',
    description: `Loss recorded: ${quantity} seedlings - ${reason}`,
    quantity_lost: quantity,
    loss_reason: reason,
    logged_by: req.userId
  });
  
  res.json({
    success: true,
    message: 'Loss recorded',
    data: batch
  });
}));

// Update batch status
router.patch('/batches/:id/status', authenticate, hasPermission('production', 'edit'), asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  
  const validStatuses = ['sown', 'germinating', 'growing', 'ready', 'selling', 'completed', 'failed'];
  
  if (!validStatuses.includes(status)) {
    throw ApiError.badRequest('Invalid status');
  }
  
  const batch = await SeedlingBatch.findByPk(req.params.id);
  
  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }
  
  const oldStatus = batch.status;
  
  await batch.update({
    status,
    ...(status === 'ready' && { actual_ready_date: new Date() })
  });
  
  await ProductionLog.create({
    batch_id: batch.id,
    log_date: new Date(),
    activity_type: 'status_update',
    description: `Status changed from ${oldStatus} to ${status}. ${notes || ''}`,
    logged_by: req.userId
  });
  
  res.json({
    success: true,
    message: 'Status updated',
    data: batch
  });
}));

// Update batch quantity
router.patch('/batches/:id/quantity', authenticate, hasPermission('production', 'edit'), asyncHandler(async (req, res) => {
  const { quantity, reason } = req.body;
  
  if (quantity === undefined || quantity < 0) {
    throw ApiError.badRequest('Valid quantity is required');
  }
  
  const batch = await SeedlingBatch.findByPk(req.params.id);
  
  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }
  
  const oldQuantity = batch.current_quantity;
  
  await batch.update({ current_quantity: quantity });
  
  // Log the adjustment
  await ProductionLog.create({
    batch_id: batch.id,
    log_date: new Date(),
    activity_type: 'quality_check',
    description: `Quantity adjusted from ${oldQuantity} to ${quantity}. ${reason || 'Manual adjustment'}`,
    quantity_affected: quantity - oldQuantity,
    logged_by: req.userId
  });
  
  res.json({
    success: true,
    message: 'Quantity updated',
    data: batch
  });
}));

// Get production logs for a batch
router.get('/batches/:id/logs', authenticate, hasPermission('production', 'view'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  
  const logs = await ProductionLog.findAndCountAll({
    where: { batch_id: req.params.id },
    include: [{ model: User, as: 'logger', attributes: ['id', 'first_name', 'last_name'] }],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['log_date', 'DESC'], ['created_at', 'DESC']]
  });
  
  res.json({
    success: true,
    data: logs.rows,
    pagination: {
      total: logs.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(logs.count / parseInt(limit))
    }
  });
}));

// Add production log
router.post('/batches/:id/logs', authenticate, hasPermission('production', 'create'), asyncHandler(async (req, res) => {
  const {
    log_date, activity_type, description, quantity_affected,
    quantity_lost, loss_reason, temperature, humidity,
    growth_stage, health_status, inputs_used, notes, client_id
  } = req.body;
  
  const batch = await SeedlingBatch.findByPk(req.params.id);
  
  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }
  
  const log = await ProductionLog.create({
    batch_id: req.params.id,
    log_date: log_date || new Date(),
    activity_type,
    description,
    quantity_affected,
    quantity_lost,
    loss_reason,
    temperature,
    humidity,
    growth_stage,
    health_status,
    inputs_used,
    logged_by: req.userId,
    client_id
  });
  
  // Update batch if loss recorded
  if (quantity_lost && quantity_lost > 0) {
    await batch.update({
      lost_quantity: (batch.lost_quantity || 0) + quantity_lost,
      current_quantity: Math.max(0, batch.current_quantity - quantity_lost)
    });
  }
  
  res.status(201).json({
    success: true,
    message: 'Log added successfully',
    data: log
  });
}));

module.exports = router;
