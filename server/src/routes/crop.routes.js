/**
 * ============================================
 * Crop Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../middleware/auth');
const { Crop, SeedlingBatch } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// Get all crops
router.get('/', authenticate, hasPermission('crops', 'view'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, category, search, active } = req.query;
  
  const where = {};
  
  if (category) {
    where.category = category;
  }
  
  if (active !== undefined) {
    where.is_active = active === 'true';
  }
  
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { code: { [Op.iLike]: `%${search}%` } },
      { variety: { [Op.iLike]: `%${search}%` } }
    ];
  }
  
  const crops = await Crop.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['name', 'ASC']]
  });
  
  res.json({
    success: true,
    data: crops.rows,
    pagination: {
      total: crops.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(crops.count / parseInt(limit))
    }
  });
}));

// Get crop categories
router.get('/categories', authenticate, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: [
      { value: 'vegetables', label: 'Vegetables' },
      { value: 'fruits', label: 'Fruits' },
      { value: 'ornamentals', label: 'Ornamentals' },
      { value: 'forestry', label: 'Forestry' },
      { value: 'herbs', label: 'Herbs' },
      { value: 'other', label: 'Other' }
    ]
  });
}));

// Get single crop
router.get('/:id', authenticate, hasPermission('crops', 'view'), asyncHandler(async (req, res) => {
  const crop = await Crop.findByPk(req.params.id);
  
  if (!crop) {
    throw ApiError.notFound('Crop not found');
  }
  
  // Get batch statistics
  const batchStats = await SeedlingBatch.findAll({
    where: { crop_id: req.params.id },
    attributes: [
      'status',
      [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
      [require('sequelize').fn('SUM', require('sequelize').col('current_quantity')), 'total_quantity']
    ],
    group: ['status']
  });
  
  res.json({
    success: true,
    data: {
      ...crop.toJSON(),
      batchStats
    }
  });
}));

// Create crop
router.post('/', authenticate, hasPermission('crops', 'create'), asyncHandler(async (req, res) => {
  const {
    name, scientific_name, code, variety, category,
    germination_days, transplant_days, optimal_temp_min, optimal_temp_max,
    default_price, price_unit, seeds_per_tray, expected_germination_rate,
    growing_notes, image_url
  } = req.body;
  
  // Check code uniqueness
  const existing = await Crop.findOne({ where: { code } });
  if (existing) {
    throw ApiError.conflict('Crop code already exists');
  }
  
  const crop = await Crop.create({
    name,
    scientific_name,
    code,
    variety,
    category,
    germination_days,
    transplant_days,
    optimal_temp_min,
    optimal_temp_max,
    default_price,
    price_unit,
    seeds_per_tray,
    expected_germination_rate,
    growing_notes,
    image_url
  });
  
  res.status(201).json({
    success: true,
    message: 'Crop created successfully',
    data: crop
  });
}));

// Update crop
router.put('/:id', authenticate, hasPermission('crops', 'edit'), asyncHandler(async (req, res) => {
  const crop = await Crop.findByPk(req.params.id);
  
  if (!crop) {
    throw ApiError.notFound('Crop not found');
  }
  
  if (req.body.code && req.body.code !== crop.code) {
    const existing = await Crop.findOne({ where: { code: req.body.code } });
    if (existing) {
      throw ApiError.conflict('Crop code already exists');
    }
  }
  
  await crop.update(req.body);
  
  res.json({
    success: true,
    message: 'Crop updated successfully',
    data: crop
  });
}));

// Delete crop
router.delete('/:id', authenticate, hasPermission('crops', 'delete'), asyncHandler(async (req, res) => {
  const crop = await Crop.findByPk(req.params.id);
  
  if (!crop) {
    throw ApiError.notFound('Crop not found');
  }
  
  // Check for active batches
  const activeBatches = await SeedlingBatch.count({
    where: {
      crop_id: req.params.id,
      status: { [Op.notIn]: ['completed', 'failed'] }
    }
  });
  
  if (activeBatches > 0) {
    throw ApiError.badRequest('Cannot delete crop with active batches. Deactivate instead.');
  }
  
  await crop.destroy();
  
  res.json({
    success: true,
    message: 'Crop deleted successfully'
  });
}));

module.exports = router;
