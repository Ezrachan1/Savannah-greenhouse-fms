/**
 * ============================================
 * User Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../middleware/auth');
const { User, Role } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// Get all users
router.get('/', authenticate, hasPermission('users', 'view'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role, status } = req.query;
  
  const where = {};
  
  if (search) {
    where[Op.or] = [
      { first_name: { [Op.iLike]: `%${search}%` } },
      { last_name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } }
    ];
  }
  
  if (status !== undefined) {
    where.is_active = status === 'active';
  }
  
  const users = await User.findAndCountAll({
    where,
    include: [{ model: Role, as: 'role' }],
    attributes: { exclude: ['password', 'refresh_token'] },
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['created_at', 'DESC']]
  });
  
  res.json({
    success: true,
    data: users.rows,
    pagination: {
      total: users.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(users.count / parseInt(limit))
    }
  });
}));

// Get single user
router.get('/:id', authenticate, hasPermission('users', 'view'), asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    include: [{ model: Role, as: 'role' }],
    attributes: { exclude: ['password', 'refresh_token'] }
  });
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  res.json({ success: true, data: user });
}));

// Create user
router.post('/', authenticate, hasPermission('users', 'create'), asyncHandler(async (req, res) => {
  const { email, password, first_name, last_name, phone, role_id } = req.body;
  
  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw ApiError.conflict('Email already exists');
  }
  
  const user = await User.create({
    email: email.toLowerCase(),
    password,
    first_name,
    last_name,
    phone,
    role_id
  });
  
  await user.reload({ include: [{ model: Role, as: 'role' }] });
  
  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: user.toJSON()
  });
}));

// Update user
router.put('/:id', authenticate, hasPermission('users', 'edit'), asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  const { first_name, last_name, phone, role_id, is_active } = req.body;
  
  await user.update({
    first_name: first_name || user.first_name,
    last_name: last_name || user.last_name,
    phone: phone !== undefined ? phone : user.phone,
    role_id: role_id || user.role_id,
    is_active: is_active !== undefined ? is_active : user.is_active
  });
  
  await user.reload({ include: [{ model: Role, as: 'role' }] });
  
  res.json({
    success: true,
    message: 'User updated successfully',
    data: user.toJSON()
  });
}));

// Delete user
router.delete('/:id', authenticate, hasPermission('users', 'delete'), asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  // Soft delete
  await user.destroy();
  
  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

// Get all roles
router.get('/roles/list', authenticate, asyncHandler(async (req, res) => {
  const roles = await Role.findAll({
    where: { is_active: true },
    order: [['name', 'ASC']]
  });
  
  res.json({ success: true, data: roles });
}));

module.exports = router;
