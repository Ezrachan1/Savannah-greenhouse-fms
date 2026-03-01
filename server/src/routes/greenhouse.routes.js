/**
 * ============================================
 * Greenhouse Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../middleware/auth');
const { Greenhouse, CropAllocation, Crop, SeedlingBatch } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// Get all greenhouses
router.get('/', authenticate, hasPermission('greenhouses', 'view'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  
  const where = {};
  
  if (status) {
    where.status = status;
  }
  
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { code: { [Op.iLike]: `%${search}%` } }
    ];
  }
  
  const greenhouses = await Greenhouse.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['name', 'ASC']]
  });
  
  res.json({
    success: true,
    data: greenhouses.rows,
    pagination: {
      total: greenhouses.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(greenhouses.count / parseInt(limit))
    }
  });
}));

// Get greenhouse summary (for dashboard)
router.get('/summary', authenticate, asyncHandler(async (req, res) => {
  const total = await Greenhouse.count();
  const active = await Greenhouse.count({ where: { status: 'active' } });
  const maintenance = await Greenhouse.count({ where: { status: 'maintenance' } });
  
  // Get greenhouse with batch counts
  const greenhouses = await Greenhouse.findAll({
    where: { status: 'active' },
    include: [{
      model: SeedlingBatch,
      as: 'batches',
      where: { status: { [Op.in]: ['growing', 'ready', 'selling'] } },
      required: false
    }]
  });
  
  res.json({
    success: true,
    data: {
      total,
      active,
      maintenance,
      inactive: total - active - maintenance,
      greenhouses: greenhouses.map(gh => ({
        id: gh.id,
        name: gh.name,
        code: gh.code,
        activeBatches: gh.batches?.length || 0
      }))
    }
  });
}));

// Get single greenhouse
router.get('/:id', authenticate, hasPermission('greenhouses', 'view'), asyncHandler(async (req, res) => {
  const greenhouse = await Greenhouse.findByPk(req.params.id, {
    include: [
      {
        model: CropAllocation,
        as: 'allocations',
        include: [{ model: Crop, as: 'crop' }],
        where: { status: 'active' },
        required: false
      },
      {
        model: SeedlingBatch,
        as: 'batches',
        where: { status: { [Op.notIn]: ['completed', 'failed'] } },
        required: false,
        include: [{ model: Crop, as: 'crop' }]
      }
    ]
  });
  
  if (!greenhouse) {
    throw ApiError.notFound('Greenhouse not found');
  }
  
  res.json({ success: true, data: greenhouse });
}));

// Create greenhouse
router.post('/', authenticate, hasPermission('greenhouses', 'create'), asyncHandler(async (req, res) => {
  const {
    name, code, description, length_meters, width_meters,
    capacity_trays, capacity_seedlings, type, covering_material,
    has_irrigation, irrigation_type, has_climate_control,
    status, location_notes, construction_date, notes
  } = req.body;
  
  // Check code uniqueness
  const existing = await Greenhouse.findOne({ where: { code } });
  if (existing) {
    throw ApiError.conflict('Greenhouse code already exists');
  }
  
  const greenhouse = await Greenhouse.create({
    name,
    code,
    description,
    length_meters,
    width_meters,
    capacity_trays,
    capacity_seedlings,
    type,
    covering_material,
    has_irrigation,
    irrigation_type,
    has_climate_control,
    status: status || 'active',
    location_notes,
    construction_date,
    notes
  });
  
  res.status(201).json({
    success: true,
    message: 'Greenhouse created successfully',
    data: greenhouse
  });
}));

// Update greenhouse
router.put('/:id', authenticate, hasPermission('greenhouses', 'edit'), asyncHandler(async (req, res) => {
  const greenhouse = await Greenhouse.findByPk(req.params.id);
  
  if (!greenhouse) {
    throw ApiError.notFound('Greenhouse not found');
  }
  
  // Check code uniqueness if changing
  if (req.body.code && req.body.code !== greenhouse.code) {
    const existing = await Greenhouse.findOne({ where: { code: req.body.code } });
    if (existing) {
      throw ApiError.conflict('Greenhouse code already exists');
    }
  }
  
  await greenhouse.update(req.body);
  
  res.json({
    success: true,
    message: 'Greenhouse updated successfully',
    data: greenhouse
  });
}));

// Delete greenhouse
router.delete('/:id', authenticate, hasPermission('greenhouses', 'delete'), asyncHandler(async (req, res) => {
  const greenhouse = await Greenhouse.findByPk(req.params.id);
  
  if (!greenhouse) {
    throw ApiError.notFound('Greenhouse not found');
  }
  
  // Check for active batches
  const activeBatches = await SeedlingBatch.count({
    where: {
      greenhouse_id: req.params.id,
      status: { [Op.notIn]: ['completed', 'failed'] }
    }
  });
  
  if (activeBatches > 0) {
    throw ApiError.badRequest('Cannot delete greenhouse with active batches');
  }
  
  await greenhouse.destroy();
  
  res.json({
    success: true,
    message: 'Greenhouse deleted successfully'
  });
}));

module.exports = router;
