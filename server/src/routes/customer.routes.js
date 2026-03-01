/**
 * ============================================
 * Customer Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../middleware/auth');
const { Customer, Sale } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// Get all customers
router.get('/', authenticate, hasPermission('customers', 'view'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, status, type } = req.query;
  
  const where = {};
  
  if (status) where.status = status;
  if (type) where.customer_type = type;
  
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { customer_code: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } }
    ];
  }
  
  const customers = await Customer.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['name', 'ASC']]
  });
  
  res.json({
    success: true,
    data: customers.rows,
    pagination: {
      total: customers.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(customers.count / parseInt(limit))
    }
  });
}));

// Get single customer
router.get('/:id', authenticate, hasPermission('customers', 'view'), asyncHandler(async (req, res) => {
  const customer = await Customer.findByPk(req.params.id);
  
  if (!customer) {
    throw ApiError.notFound('Customer not found');
  }
  
  res.json({ success: true, data: customer });
}));

// Create customer
router.post('/', authenticate, hasPermission('customers', 'create'), asyncHandler(async (req, res) => {
  const { name, phone, email, customer_type, address, kra_pin, credit_limit } = req.body;
  
  // Validate required fields
  if (!name) {
    throw ApiError.badRequest('Customer name is required');
  }
  
  // Generate customer code
  const count = await Customer.count();
  const customer_code = `CUST-${(count + 1).toString().padStart(4, '0')}`;
  
  const customer = await Customer.create({
    customer_code,
    name,
    phone: phone || null,
    email: email || null,
    customer_type: customer_type || 'individual',
    address: address || null,
    kra_pin: kra_pin || null,
    credit_limit: credit_limit || 0
  });
  
  res.status(201).json({
    success: true,
    message: 'Customer created successfully',
    data: customer
  });
}));

// Update customer
router.put('/:id', authenticate, hasPermission('customers', 'edit'), asyncHandler(async (req, res) => {
  const customer = await Customer.findByPk(req.params.id);
  
  if (!customer) {
    throw ApiError.notFound('Customer not found');
  }
  
  await customer.update(req.body);
  
  res.json({
    success: true,
    message: 'Customer updated successfully',
    data: customer
  });
}));

// Delete customer
router.delete('/:id', authenticate, hasPermission('customers', 'delete'), asyncHandler(async (req, res) => {
  const customer = await Customer.findByPk(req.params.id);
  
  if (!customer) {
    throw ApiError.notFound('Customer not found');
  }
  
  // Check for sales
  const salesCount = await Sale.count({ where: { customer_id: req.params.id } });
  if (salesCount > 0) {
    throw ApiError.badRequest('Cannot delete customer with sales history');
  }
  
  await customer.destroy();
  
  res.json({
    success: true,
    message: 'Customer deleted successfully'
  });
}));

// Get customer sales history
router.get('/:id/sales', authenticate, hasPermission('customers', 'view'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  
  const sales = await Sale.findAndCountAll({
    where: { customer_id: req.params.id },
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['sale_date', 'DESC']]
  });
  
  res.json({
    success: true,
    data: sales.rows,
    pagination: {
      total: sales.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(sales.count / parseInt(limit))
    }
  });
}));

module.exports = router;
