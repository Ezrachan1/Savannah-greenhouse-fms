/**
 * ============================================
 * Employee Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../middleware/auth');
const { Employee, User, Role } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// Get all employees
router.get('/', authenticate, hasPermission('employees', 'view'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, department, search } = req.query;
  
  const where = {};
  
  if (status) where.status = status;
  if (department) where.department = department;
  
  if (search) {
    where[Op.or] = [
      { first_name: { [Op.iLike]: `%${search}%` } },
      { last_name: { [Op.iLike]: `%${search}%` } },
      { employee_number: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } }
    ];
  }
  
  const employees = await Employee.findAndCountAll({
    where,
    include: [{ model: User, as: 'user', attributes: ['id', 'email', 'is_active'], required: false }],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['first_name', 'ASC'], ['last_name', 'ASC']]
  });
  
  res.json({
    success: true,
    data: employees.rows,
    pagination: {
      total: employees.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(employees.count / parseInt(limit))
    }
  });
}));

// Get departments list
router.get('/departments', authenticate, asyncHandler(async (req, res) => {
  const departments = await Employee.findAll({
    attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('department')), 'department']],
    where: { department: { [Op.ne]: null } },
    raw: true
  });
  
  res.json({
    success: true,
    data: departments.map(d => d.department).filter(Boolean)
  });
}));

// Get single employee
router.get('/:id', authenticate, hasPermission('employees', 'view'), asyncHandler(async (req, res) => {
  const employee = await Employee.findByPk(req.params.id, {
    include: [{ model: User, as: 'user', attributes: ['id', 'email', 'is_active'], required: false }]
  });
  
  if (!employee) {
    throw ApiError.notFound('Employee not found');
  }
  
  res.json({ success: true, data: employee });
}));

// Create employee
router.post('/', authenticate, hasPermission('employees', 'create'), asyncHandler(async (req, res) => {
  const { 
    first_name, last_name, email, phone, national_id,
    employment_type, department, job_title, basic_salary, hire_date,
    bank_name, bank_account, kra_pin, nhif_number, nssf_number
  } = req.body;
  
  // Validate required fields
  if (!first_name) {
    throw ApiError.badRequest('First name is required');
  }
  if (!last_name) {
    throw ApiError.badRequest('Last name is required');
  }
  if (!hire_date) {
    throw ApiError.badRequest('Hire date is required');
  }
  
  // Generate employee number
  const count = await Employee.count();
  const employee_number = `EMP-${(count + 1).toString().padStart(4, '0')}`;
  
  const employee = await Employee.create({
    employee_number,
    first_name,
    last_name,
    email: email || null,
    phone: phone || null,
    national_id: national_id || null,
    employment_type: employment_type || 'permanent',
    department: department || null,
    job_title: job_title || null,
    basic_salary: basic_salary || 0,
    hire_date,
    bank_name: bank_name || null,
    bank_account_number: bank_account || null,
    kra_pin: kra_pin || null,
    nhif_number: nhif_number || null,
    nssf_number: nssf_number || null,
    status: 'active'
  });
  
  res.status(201).json({
    success: true,
    message: 'Employee created successfully',
    data: employee
  });
}));

// Update employee
router.put('/:id', authenticate, hasPermission('employees', 'edit'), asyncHandler(async (req, res) => {
  const employee = await Employee.findByPk(req.params.id);
  
  if (!employee) {
    throw ApiError.notFound('Employee not found');
  }
  
  // Map frontend field names to model field names
  const updateData = { ...req.body };
  if (updateData.bank_account !== undefined) {
    updateData.bank_account_number = updateData.bank_account;
    delete updateData.bank_account;
  }
  
  await employee.update(updateData);
  
  res.json({
    success: true,
    message: 'Employee updated successfully',
    data: employee
  });
}));

// Terminate employee
router.post('/:id/terminate', authenticate, hasPermission('employees', 'edit'), asyncHandler(async (req, res) => {
  const { termination_date, termination_reason } = req.body;
  
  const employee = await Employee.findByPk(req.params.id);
  
  if (!employee) {
    throw ApiError.notFound('Employee not found');
  }
  
  await employee.update({
    status: 'terminated',
    termination_date: termination_date || new Date(),
    termination_reason
  });
  
  res.json({
    success: true,
    message: 'Employee terminated',
    data: employee
  });
}));

// Delete employee
router.delete('/:id', authenticate, hasPermission('employees', 'delete'), asyncHandler(async (req, res) => {
  const employee = await Employee.findByPk(req.params.id);
  
  if (!employee) {
    throw ApiError.notFound('Employee not found');
  }
  
  await employee.destroy();
  
  res.json({
    success: true,
    message: 'Employee deleted successfully'
  });
}));

// Create user account for employee
router.post('/:id/create-account', authenticate, hasPermission('users', 'create'), asyncHandler(async (req, res) => {
  const { password, role_id } = req.body;
  
  const employee = await Employee.findByPk(req.params.id);
  
  if (!employee) {
    throw ApiError.notFound('Employee not found');
  }
  
  if (employee.user_id) {
    throw ApiError.badRequest('Employee already has a user account');
  }
  
  if (!employee.email) {
    throw ApiError.badRequest('Employee must have an email address to create a user account');
  }
  
  // Check if email already exists
  const existingUser = await User.findOne({ where: { email: employee.email } });
  if (existingUser) {
    throw ApiError.badRequest('A user with this email already exists');
  }
  
  // Get role (default to a basic staff role if not provided)
  let roleId = role_id;
  if (!roleId) {
    const staffRole = await Role.findOne({ where: { name: 'staff' } });
    if (staffRole) {
      roleId = staffRole.id;
    } else {
      // Fallback to admin role if no staff role exists
      const adminRole = await Role.findOne({ where: { name: 'admin' } });
      roleId = adminRole?.id;
    }
  }
  
  if (!roleId) {
    throw ApiError.badRequest('No role available. Please create a role first.');
  }
  
  // Create user account
  const user = await User.create({
    email: employee.email,
    password: password || 'Password@123',
    first_name: employee.first_name,
    last_name: employee.last_name,
    role_id: roleId,
    is_active: true
  });
  
  // Link user to employee
  await employee.update({ user_id: user.id });
  
  res.status(201).json({
    success: true,
    message: 'User account created successfully',
    data: {
      employee,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      },
      defaultPassword: password ? undefined : 'Password@123'
    }
  });
}));

module.exports = router;
