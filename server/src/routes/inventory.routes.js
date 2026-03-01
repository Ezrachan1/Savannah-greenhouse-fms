/**
 * ============================================
 * Inventory Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../middleware/auth');
const { InventoryItem, InventoryCategory, StockMovement, User } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// ==================== CATEGORIES ====================

// Get all categories
router.get('/categories', authenticate, asyncHandler(async (req, res) => {
  const categories = await InventoryCategory.findAll({
    where: { is_active: true },
    include: [{ model: InventoryCategory, as: 'subcategories' }],
    order: [['display_order', 'ASC'], ['name', 'ASC']]
  });
  
  res.json({ success: true, data: categories });
}));

// Create category
router.post('/categories', authenticate, hasPermission('inventory', 'create'), asyncHandler(async (req, res) => {
  const { name, code, description, parent_id } = req.body;
  
  const existing = await InventoryCategory.findOne({ where: { code } });
  if (existing) {
    throw ApiError.conflict('Category code already exists');
  }
  
  const category = await InventoryCategory.create({
    name, code, description, parent_id
  });
  
  res.status(201).json({
    success: true,
    message: 'Category created',
    data: category
  });
}));

// ==================== ITEMS ====================

// Get all inventory items
router.get('/items', authenticate, hasPermission('inventory', 'view'), asyncHandler(async (req, res) => {
  const { 
    page = 1, limit = 50, category_id, search, 
    status, low_stock, is_sellable 
  } = req.query;
  
  const where = {};
  
  if (category_id) {
    where.category_id = category_id;
  }
  
  if (status) {
    where.status = status;
  }
  
  if (is_sellable !== undefined) {
    where.is_sellable = is_sellable === 'true';
  }
  
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { code: { [Op.iLike]: `%${search}%` } }
    ];
  }
  
  // Low stock filter
  if (low_stock === 'true') {
    where[Op.and] = [
      sequelize.where(
        sequelize.col('current_quantity'),
        Op.lte,
        sequelize.col('minimum_quantity')
      )
    ];
  }
  
  const items = await InventoryItem.findAndCountAll({
    where,
    include: [{ model: InventoryCategory, as: 'category', attributes: ['id', 'name', 'code'] }],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['name', 'ASC']]
  });
  
  res.json({
    success: true,
    data: items.rows,
    pagination: {
      total: items.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(items.count / parseInt(limit))
    }
  });
}));

// Get low stock items
router.get('/low-stock', authenticate, hasPermission('inventory', 'view'), asyncHandler(async (req, res) => {
  const items = await InventoryItem.findAll({
    where: {
      status: 'active',
      [Op.and]: [
        sequelize.where(
          sequelize.col('current_quantity'),
          Op.lte,
          sequelize.col('minimum_quantity')
        )
      ]
    },
    include: [{ model: InventoryCategory, as: 'category', attributes: ['id', 'name'] }],
    order: [
      [sequelize.literal('current_quantity - minimum_quantity'), 'ASC']
    ]
  });
  
  res.json({ success: true, data: items });
}));

// Get inventory summary
router.get('/summary', authenticate, asyncHandler(async (req, res) => {
  const totalItems = await InventoryItem.count({ where: { status: 'active' } });
  
  const totalValue = await InventoryItem.sum('total_value', { 
    where: { status: 'active' } 
  });
  
  const lowStockCount = await InventoryItem.count({
    where: {
      status: 'active',
      [Op.and]: [
        sequelize.where(
          sequelize.col('current_quantity'),
          Op.lte,
          sequelize.col('minimum_quantity')
        )
      ]
    }
  });
  
  // By category
  const byCategory = await InventoryItem.findAll({
    where: { status: 'active' },
    attributes: [
      'category_id',
      [sequelize.fn('COUNT', sequelize.col('InventoryItem.id')), 'item_count'],
      [sequelize.fn('SUM', sequelize.col('total_value')), 'total_value']
    ],
    include: [{ model: InventoryCategory, as: 'category', attributes: ['name'] }],
    group: ['category_id', 'category.id']
  });
  
  res.json({
    success: true,
    data: {
      totalItems,
      totalValue: totalValue || 0,
      lowStockCount,
      byCategory
    }
  });
}));

// Get single item
router.get('/items/:id', authenticate, hasPermission('inventory', 'view'), asyncHandler(async (req, res) => {
  const item = await InventoryItem.findByPk(req.params.id, {
    include: [{ model: InventoryCategory, as: 'category' }]
  });
  
  if (!item) {
    throw ApiError.notFound('Item not found');
  }
  
  res.json({ success: true, data: item });
}));

// Create item
router.post('/items', authenticate, hasPermission('inventory', 'create'), asyncHandler(async (req, res) => {
  const {
    name, code, category_id, description, unit,
    current_quantity, reorder_level, unit_cost,
    minimum_quantity, maximum_quantity, reorder_quantity,
    cost_price, selling_price, is_sellable, vat_rate, is_vat_exempt,
    batch_tracking, expiry_tracking, primary_supplier, storage_location,
    notes
  } = req.body;
  
  // Validate required fields
  if (!code) {
    throw ApiError.badRequest('Item code/SKU is required');
  }
  if (!name) {
    throw ApiError.badRequest('Item name is required');
  }
  if (!unit) {
    throw ApiError.badRequest('Unit is required');
  }
  
  // Check code uniqueness
  const existing = await InventoryItem.findOne({ where: { code } });
  if (existing) {
    throw ApiError.conflict('Item code already exists');
  }
  
  const item = await InventoryItem.create({
    name, 
    code, 
    category_id: category_id || null, 
    description, 
    unit,
    current_quantity: current_quantity || 0,
    minimum_quantity: reorder_level || minimum_quantity || 0,
    maximum_quantity, 
    reorder_quantity,
    cost_price: unit_cost || cost_price || 0,
    selling_price, 
    is_sellable,
    vat_rate: vat_rate || 16,
    is_vat_exempt,
    batch_tracking, 
    expiry_tracking, 
    primary_supplier, 
    storage_location,
    notes
  });
  
  await item.reload({ include: [{ model: InventoryCategory, as: 'category' }] });
  
  res.status(201).json({
    success: true,
    message: 'Item created successfully',
    data: item
  });
}));

// Update item
router.put('/items/:id', authenticate, hasPermission('inventory', 'edit'), asyncHandler(async (req, res) => {
  const item = await InventoryItem.findByPk(req.params.id);
  
  if (!item) {
    throw ApiError.notFound('Item not found');
  }
  
  // Check code uniqueness if changing
  if (req.body.code && req.body.code !== item.code) {
    const existing = await InventoryItem.findOne({ where: { code: req.body.code } });
    if (existing) {
      throw ApiError.conflict('Item code already exists');
    }
  }
  
  // Don't allow direct quantity updates - use stock movements
  delete req.body.current_quantity;
  
  await item.update(req.body);
  
  await item.reload({ include: [{ model: InventoryCategory, as: 'category' }] });
  
  res.json({
    success: true,
    message: 'Item updated successfully',
    data: item
  });
}));

// ==================== STOCK MOVEMENTS ====================

// Create stock movement (unified endpoint for add/remove)
router.post('/items/:id/movements', authenticate, hasPermission('inventory', 'create'), asyncHandler(async (req, res) => {
  const {
    type, movement_type, quantity, unit_cost, movement_date, reference_number,
    batch_number, expiry_date, supplier_name, reason, notes
  } = req.body;
  
  const item = await InventoryItem.findByPk(req.params.id);
  
  if (!item) {
    throw ApiError.notFound('Item not found');
  }
  
  const quantityBefore = parseFloat(item.current_quantity) || 0;
  const moveQuantity = parseFloat(quantity);
  
  // Accept both 'type' and 'movement_type' from frontend
  const inputType = type || movement_type;
  
  let quantityAfter;
  let movementType;
  
  // Determine movement type and calculate new quantity
  if (inputType === 'in' || inputType === 'add' || inputType === 'purchase' || inputType === 'stock_in') {
    quantityAfter = quantityBefore + moveQuantity;
    movementType = 'purchase';
  } else if (inputType === 'out' || inputType === 'remove' || inputType === 'usage' || inputType === 'stock_out') {
    if (moveQuantity > quantityBefore) {
      throw ApiError.badRequest('Insufficient stock. Available: ' + quantityBefore);
    }
    quantityAfter = quantityBefore - moveQuantity;
    movementType = 'usage';
  } else if (inputType === 'adjustment') {
    // For adjustment, quantity is the new absolute value
    quantityAfter = moveQuantity;
    movementType = moveQuantity >= quantityBefore ? 'adjustment_add' : 'adjustment_sub';
  } else {
    throw ApiError.badRequest('Invalid movement type. Use: stock_in, stock_out, in, out, add, remove, purchase, usage, or adjustment');
  }
  
  // Create movement record
  const movement = await StockMovement.create({
    item_id: req.params.id,
    movement_type: movementType,
    movement_date: movement_date || new Date(),
    quantity: inputType === 'adjustment' ? Math.abs(quantityAfter - quantityBefore) : moveQuantity,
    unit_cost: unit_cost || null,
    total_cost: unit_cost ? moveQuantity * unit_cost : null,
    quantity_before: quantityBefore,
    quantity_after: quantityAfter,
    reference_number,
    batch_number,
    expiry_date,
    supplier_name,
    reason,
    notes,
    created_by: req.userId
  });
  
  // Update item quantity
  const updateData = { current_quantity: quantityAfter };
  if (inputType === 'in' || inputType === 'add' || inputType === 'purchase' || inputType === 'stock_in') {
    updateData.last_purchase_date = movement_date || new Date();
    if (unit_cost) updateData.cost_price = unit_cost;
  } else {
    updateData.last_usage_date = new Date();
  }
  
  await item.update(updateData);
  
  res.status(201).json({
    success: true,
    message: 'Stock movement recorded successfully',
    data: {
      movement,
      previousQuantity: quantityBefore,
      newQuantity: quantityAfter
    }
  });
}));

// Get stock movements for item
router.get('/items/:id/movements', authenticate, hasPermission('inventory', 'view'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, type, from_date, to_date } = req.query;
  
  const where = { item_id: req.params.id };
  
  if (type) {
    where.movement_type = type;
  }
  
  if (from_date) {
    where.movement_date = { ...where.movement_date, [Op.gte]: from_date };
  }
  
  if (to_date) {
    where.movement_date = { ...where.movement_date, [Op.lte]: to_date };
  }
  
  const movements = await StockMovement.findAndCountAll({
    where,
    include: [{ model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['movement_date', 'DESC'], ['created_at', 'DESC']]
  });
  
  res.json({
    success: true,
    data: movements.rows,
    pagination: {
      total: movements.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(movements.count / parseInt(limit))
    }
  });
}));

// Add stock (purchase/receive)
router.post('/items/:id/stock-in', authenticate, hasPermission('inventory', 'create'), asyncHandler(async (req, res) => {
  const {
    quantity, unit_cost, movement_date, reference_number,
    batch_number, expiry_date, supplier_name, notes
  } = req.body;
  
  const item = await InventoryItem.findByPk(req.params.id);
  
  if (!item) {
    throw ApiError.notFound('Item not found');
  }
  
  const quantityBefore = parseFloat(item.current_quantity) || 0;
  const addQuantity = parseFloat(quantity);
  const quantityAfter = quantityBefore + addQuantity;
  
  // Create movement record
  const movement = await StockMovement.create({
    item_id: req.params.id,
    movement_type: 'purchase',
    movement_date: movement_date || new Date(),
    quantity: addQuantity,
    unit_cost,
    total_cost: unit_cost ? addQuantity * unit_cost : null,
    quantity_before: quantityBefore,
    quantity_after: quantityAfter,
    reference_number,
    batch_number,
    expiry_date,
    supplier_name,
    notes,
    created_by: req.userId
  });
  
  // Update item quantity and cost
  await item.update({
    current_quantity: quantityAfter,
    cost_price: unit_cost || item.cost_price,
    last_purchase_date: movement_date || new Date()
  });
  
  res.status(201).json({
    success: true,
    message: 'Stock added successfully',
    data: {
      movement,
      newQuantity: quantityAfter
    }
  });
}));

// Remove stock (usage/adjustment)
router.post('/items/:id/stock-out', authenticate, hasPermission('inventory', 'adjust'), asyncHandler(async (req, res) => {
  const {
    quantity, movement_type, movement_date, reference_number,
    reason, notes
  } = req.body;
  
  const validTypes = ['usage', 'adjustment_sub', 'waste', 'return_out'];
  if (!validTypes.includes(movement_type)) {
    throw ApiError.badRequest('Invalid movement type');
  }
  
  const item = await InventoryItem.findByPk(req.params.id);
  
  if (!item) {
    throw ApiError.notFound('Item not found');
  }
  
  const quantityBefore = parseFloat(item.current_quantity) || 0;
  const removeQuantity = parseFloat(quantity);
  
  if (removeQuantity > quantityBefore) {
    throw ApiError.badRequest('Insufficient stock');
  }
  
  const quantityAfter = quantityBefore - removeQuantity;
  
  const movement = await StockMovement.create({
    item_id: req.params.id,
    movement_type,
    movement_date: movement_date || new Date(),
    quantity: removeQuantity,
    quantity_before: quantityBefore,
    quantity_after: quantityAfter,
    reference_number,
    reason,
    notes,
    created_by: req.userId
  });
  
  await item.update({
    current_quantity: quantityAfter,
    last_usage_date: new Date()
  });
  
  res.status(201).json({
    success: true,
    message: 'Stock removed successfully',
    data: {
      movement,
      newQuantity: quantityAfter
    }
  });
}));

// Stock adjustment
router.post('/items/:id/adjust', authenticate, hasPermission('inventory', 'adjust'), asyncHandler(async (req, res) => {
  const { new_quantity, reason, notes } = req.body;
  
  const item = await InventoryItem.findByPk(req.params.id);
  
  if (!item) {
    throw ApiError.notFound('Item not found');
  }
  
  const quantityBefore = parseFloat(item.current_quantity) || 0;
  const quantityAfter = parseFloat(new_quantity);
  const difference = quantityAfter - quantityBefore;
  
  const movement = await StockMovement.create({
    item_id: req.params.id,
    movement_type: difference >= 0 ? 'adjustment_add' : 'adjustment_sub',
    movement_date: new Date(),
    quantity: Math.abs(difference),
    quantity_before: quantityBefore,
    quantity_after: quantityAfter,
    reason: reason || 'Stock adjustment',
    notes,
    created_by: req.userId
  });
  
  await item.update({ current_quantity: quantityAfter });
  
  res.json({
    success: true,
    message: 'Stock adjusted successfully',
    data: {
      movement,
      previousQuantity: quantityBefore,
      newQuantity: quantityAfter,
      adjustment: difference
    }
  });
}));

module.exports = router;
