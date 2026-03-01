/**
 * ============================================
 * Expense Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../middleware/auth');
const { Expense, ExpenseCategory, User } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// ==================== CATEGORIES ====================

// Get expense categories
router.get('/categories', authenticate, asyncHandler(async (req, res) => {
  const categories = await ExpenseCategory.findAll({
    where: { is_active: true },
    include: [{ model: ExpenseCategory, as: 'subcategories' }],
    order: [['display_order', 'ASC'], ['name', 'ASC']]
  });
  
  res.json({ success: true, data: categories });
}));

// Create category
router.post('/categories', authenticate, hasPermission('expenses', 'create'), asyncHandler(async (req, res) => {
  const category = await ExpenseCategory.create(req.body);
  res.status(201).json({ success: true, data: category });
}));

// ==================== EXPENSES ====================

// Get all expenses
router.get('/', authenticate, hasPermission('expenses', 'view'), asyncHandler(async (req, res) => {
  const { 
    page = 1, limit = 50, category_id, status, 
    from_date, to_date, search, approval_status 
  } = req.query;
  
  const where = {};
  
  if (category_id) where.category_id = category_id;
  if (status) where.status = status;
  if (approval_status) where.approval_status = approval_status;
  
  if (from_date) where.expense_date = { ...where.expense_date, [Op.gte]: from_date };
  if (to_date) where.expense_date = { ...where.expense_date, [Op.lte]: to_date };
  
  if (search) {
    where[Op.or] = [
      { expense_number: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
      { vendor_name: { [Op.iLike]: `%${search}%` } }
    ];
  }
  
  const expenses = await Expense.findAndCountAll({
    where,
    include: [
      { model: ExpenseCategory, as: 'category', attributes: ['id', 'name', 'code'] },
      { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }
    ],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['expense_date', 'DESC'], ['created_at', 'DESC']]
  });
  
  res.json({
    success: true,
    data: expenses.rows,
    pagination: {
      total: expenses.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(expenses.count / parseInt(limit))
    }
  });
}));

// Get expense summary
router.get('/summary', authenticate, asyncHandler(async (req, res) => {
  const { from_date, to_date } = req.query;
  
  const where = { status: { [Op.ne]: 'cancelled' } };
  
  if (from_date) where.expense_date = { ...where.expense_date, [Op.gte]: from_date };
  if (to_date) where.expense_date = { ...where.expense_date, [Op.lte]: to_date };
  
  const total = await Expense.sum('total_amount', { where });
  const count = await Expense.count({ where });
  
  // By category
  const byCategory = await Expense.findAll({
    where,
    attributes: [
      'category_id',
      [sequelize.fn('SUM', sequelize.col('total_amount')), 'total'],
      [sequelize.fn('COUNT', sequelize.col('Expense.id')), 'count']
    ],
    include: [{ model: ExpenseCategory, as: 'category', attributes: ['name'] }],
    group: ['category_id', 'category.id']
  });
  
  // Today's expenses
  const today = new Date().toISOString().slice(0, 10);
  const todayTotal = await Expense.sum('total_amount', {
    where: { ...where, expense_date: today }
  });
  
  res.json({
    success: true,
    data: {
      total: total || 0,
      count,
      todayTotal: todayTotal || 0,
      byCategory
    }
  });
}));

// Get single expense
router.get('/:id', authenticate, hasPermission('expenses', 'view'), asyncHandler(async (req, res) => {
  const expense = await Expense.findByPk(req.params.id, {
    include: [
      { model: ExpenseCategory, as: 'category' },
      { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] },
      { model: User, as: 'approver', attributes: ['id', 'first_name', 'last_name'] }
    ]
  });
  
  if (!expense) {
    throw ApiError.notFound('Expense not found');
  }
  
  res.json({ success: true, data: expense });
}));

// Create expense
router.post('/', authenticate, hasPermission('expenses', 'create'), asyncHandler(async (req, res) => {
  const {
    category_id, expense_date, description, amount, vat_amount,
    vendor_name, vendor_phone, payment_method, payment_reference, reference_number,
    receipt_number, requires_approval, greenhouse_id, batch_id,
    notes, client_id
  } = req.body;
  
  // Validate required fields
  if (!category_id) {
    throw ApiError.badRequest('Category is required');
  }
  if (!description) {
    throw ApiError.badRequest('Description is required');
  }
  if (!amount || parseFloat(amount) <= 0) {
    throw ApiError.badRequest('Amount must be greater than 0');
  }
  
  // Generate expense number explicitly
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Expense.count();
  const expense_number = `EXP-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
  
  const expense = await Expense.create({
    expense_number,
    category_id,
    expense_date: expense_date || new Date(),
    description,
    amount,
    vat_amount: vat_amount || 0,
    total_amount: parseFloat(amount) + parseFloat(vat_amount || 0),
    vendor_name,
    vendor_phone,
    payment_method: payment_method || 'cash',
    payment_reference: payment_reference || reference_number,
    receipt_number,
    is_paid: true,
    paid_date: expense_date || new Date(),
    requires_approval: requires_approval || false,
    approval_status: requires_approval ? 'pending' : 'approved',
    greenhouse_id,
    batch_id,
    notes,
    created_by: req.userId,
    client_id,
    status: requires_approval ? 'submitted' : 'approved'
  });
  
  await expense.reload({
    include: [{ model: ExpenseCategory, as: 'category' }]
  });
  
  res.status(201).json({
    success: true,
    message: 'Expense recorded successfully',
    data: expense
  });
}));

// Update expense
router.put('/:id', authenticate, hasPermission('expenses', 'edit'), asyncHandler(async (req, res) => {
  const expense = await Expense.findByPk(req.params.id);
  
  if (!expense) {
    throw ApiError.notFound('Expense not found');
  }
  
  if (expense.approval_status === 'approved' && expense.status !== 'draft') {
    throw ApiError.badRequest('Cannot edit approved expense');
  }
  
  await expense.update(req.body);
  
  // Recalculate total if amounts changed
  if (req.body.amount || req.body.vat_amount) {
    await expense.update({
      total_amount: parseFloat(expense.amount) + parseFloat(expense.vat_amount || 0)
    });
  }
  
  res.json({
    success: true,
    message: 'Expense updated successfully',
    data: expense
  });
}));

// Approve expense
router.post('/:id/approve', authenticate, hasPermission('expenses', 'approve'), asyncHandler(async (req, res) => {
  const expense = await Expense.findByPk(req.params.id);
  
  if (!expense) {
    throw ApiError.notFound('Expense not found');
  }
  
  if (expense.approval_status !== 'pending') {
    throw ApiError.badRequest('Expense is not pending approval');
  }
  
  await expense.update({
    approval_status: 'approved',
    approved_by: req.userId,
    approved_at: new Date(),
    status: 'approved'
  });
  
  res.json({
    success: true,
    message: 'Expense approved',
    data: expense
  });
}));

// Reject expense
router.post('/:id/reject', authenticate, hasPermission('expenses', 'approve'), asyncHandler(async (req, res) => {
  const { reason } = req.body;
  
  const expense = await Expense.findByPk(req.params.id);
  
  if (!expense) {
    throw ApiError.notFound('Expense not found');
  }
  
  await expense.update({
    approval_status: 'rejected',
    rejection_reason: reason,
    approved_by: req.userId,
    approved_at: new Date()
  });
  
  res.json({
    success: true,
    message: 'Expense rejected',
    data: expense
  });
}));

// Delete expense
router.delete('/:id', authenticate, hasPermission('expenses', 'delete'), asyncHandler(async (req, res) => {
  const expense = await Expense.findByPk(req.params.id);
  
  if (!expense) {
    throw ApiError.notFound('Expense not found');
  }
  
  await expense.destroy();
  
  res.json({
    success: true,
    message: 'Expense deleted successfully'
  });
}));

module.exports = router;
