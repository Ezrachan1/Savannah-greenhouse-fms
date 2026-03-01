/**
 * ============================================
 * Payroll Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../middleware/auth');
const { 
  PayrollPeriod, PayrollEntry, Employee, Setting 
} = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// ==================== PAYROLL CALCULATION SERVICE ====================

const calculatePayroll = async (employee, grossSalary) => {
  // Get settings
  const nssfTier1Limit = parseFloat(await Setting.getValue('payroll.nssf_tier1_limit', 7000));
  const nssfTier2Limit = parseFloat(await Setting.getValue('payroll.nssf_tier2_limit', 36000));
  const nssfRate = parseFloat(await Setting.getValue('payroll.nssf_rate', 6)) / 100;
  const personalRelief = parseFloat(await Setting.getValue('payroll.personal_relief', 2400));
  const housingLevyRate = parseFloat(await Setting.getValue('payroll.housing_levy_rate', 1.5)) / 100;
  
  const nhifBrackets = JSON.parse(await Setting.getValue('payroll.nhif_brackets', '[]'));
  const payeBrackets = JSON.parse(await Setting.getValue('payroll.paye_brackets', '[]'));
  
  // Calculate NSSF (Tier I and Tier II)
  let nssfEmployee = 0;
  let nssfEmployer = 0;
  
  if (grossSalary <= nssfTier1Limit) {
    nssfEmployee = grossSalary * nssfRate;
  } else if (grossSalary <= nssfTier2Limit) {
    nssfEmployee = nssfTier1Limit * nssfRate + (grossSalary - nssfTier1Limit) * nssfRate;
  } else {
    nssfEmployee = nssfTier1Limit * nssfRate + (nssfTier2Limit - nssfTier1Limit) * nssfRate;
  }
  nssfEmployer = nssfEmployee; // Employer matches employee contribution
  
  // Calculate NHIF
  let nhif = 0;
  for (const bracket of nhifBrackets) {
    if (grossSalary >= bracket.min && grossSalary <= (bracket.max || Infinity)) {
      nhif = bracket.amount;
      break;
    }
  }
  
  // Calculate Housing Levy
  const housingLevy = grossSalary * housingLevyRate;
  
  // Calculate Taxable Income
  const taxableIncome = grossSalary - nssfEmployee;
  
  // Calculate PAYE
  let paye = 0;
  let remainingIncome = taxableIncome;
  
  for (const bracket of payeBrackets) {
    if (remainingIncome <= 0) break;
    
    const bracketSize = (bracket.max || Infinity) - bracket.min + 1;
    const taxableInBracket = Math.min(remainingIncome, bracketSize);
    paye += taxableInBracket * (bracket.rate / 100);
    remainingIncome -= taxableInBracket;
  }
  
  // Apply personal relief
  paye = Math.max(0, paye - personalRelief);
  
  // Calculate totals
  const totalDeductions = paye + nssfEmployee + nhif + housingLevy;
  const netSalary = grossSalary - totalDeductions;
  
  return {
    gross_salary: grossSalary,
    taxable_income: taxableIncome,
    paye: Math.round(paye * 100) / 100,
    nssf_employee: Math.round(nssfEmployee * 100) / 100,
    nssf_employer: Math.round(nssfEmployer * 100) / 100,
    nhif: nhif,
    housing_levy: Math.round(housingLevy * 100) / 100,
    tax_relief: personalRelief,
    total_deductions: Math.round(totalDeductions * 100) / 100,
    net_salary: Math.round(netSalary * 100) / 100
  };
};

// ==================== PAYROLL PERIODS ====================

// Get all payroll periods
router.get('/periods', authenticate, hasPermission('payroll', 'view'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, status, year } = req.query;
  
  const where = {};
  if (status) where.status = status;
  if (year) {
    where.start_date = { [Op.gte]: `${year}-01-01`, [Op.lte]: `${year}-12-31` };
  }
  
  const periods = await PayrollPeriod.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['start_date', 'DESC']]
  });
  
  res.json({
    success: true,
    data: periods.rows,
    pagination: {
      total: periods.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(periods.count / parseInt(limit))
    }
  });
}));

// Create payroll period
router.post('/periods', authenticate, hasPermission('payroll', 'create'), asyncHandler(async (req, res) => {
  const { period_name, period_code, start_date, end_date, payment_date, period_type } = req.body;
  
  // Validate required fields
  if (!period_name) {
    throw ApiError.badRequest('Period name is required');
  }
  if (!start_date || !end_date) {
    throw ApiError.badRequest('Start date and end date are required');
  }
  
  // Auto-generate period_code if not provided - include timestamp for uniqueness
  const timestamp = Date.now().toString().slice(-4);
  const generatedCode = period_code || `PAY-${start_date.replace(/-/g, '').substring(0, 6)}-${timestamp}`;
  
  const period = await PayrollPeriod.create({
    period_name,
    period_code: generatedCode,
    start_date,
    end_date,
    payment_date,
    period_type: period_type || 'monthly',
    status: 'open'
  });
  
  res.status(201).json({
    success: true,
    message: 'Payroll period created',
    data: period
  });
}));

// Get single period with entries
router.get('/periods/:id', authenticate, hasPermission('payroll', 'view'), asyncHandler(async (req, res) => {
  const period = await PayrollPeriod.findByPk(req.params.id, {
    include: [{
      model: PayrollEntry,
      as: 'entries',
      include: [{ model: Employee, as: 'employee' }]
    }]
  });
  
  if (!period) {
    throw ApiError.notFound('Payroll period not found');
  }
  
  res.json({ success: true, data: period });
}));

// Get entries for a period
router.get('/periods/:id/entries', authenticate, hasPermission('payroll', 'view'), asyncHandler(async (req, res) => {
  const period = await PayrollPeriod.findByPk(req.params.id);
  
  if (!period) {
    throw ApiError.notFound('Payroll period not found');
  }
  
  const entries = await PayrollEntry.findAll({
    where: { period_id: req.params.id },
    include: [{ model: Employee, as: 'employee' }],
    order: [['created_at', 'ASC']]
  });
  
  res.json({ success: true, data: entries });
}));

// Generate payroll for period
router.post('/periods/:id/generate', authenticate, hasPermission('payroll', 'process'), asyncHandler(async (req, res) => {
  const period = await PayrollPeriod.findByPk(req.params.id);
  
  if (!period) {
    throw ApiError.notFound('Payroll period not found');
  }
  
  if (period.status !== 'open') {
    throw ApiError.badRequest('Payroll period is not open');
  }
  
  const transaction = await sequelize.transaction();
  
  try {
    // Get active employees
    const employees = await Employee.findAll({
      where: { status: 'active' }
    });
    
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalPaye = 0;
    let totalNssf = 0;
    let totalNhif = 0;
    
    for (const employee of employees) {
      // Check if entry already exists
      const existing = await PayrollEntry.findOne({
        where: { employee_id: employee.id, period_id: period.id }
      });
      
      if (existing) continue;
      
      // Calculate payroll
      const calculations = await calculatePayroll(employee, employee.basic_salary);
      
      // Create entry
      await PayrollEntry.create({
        employee_id: employee.id,
        period_id: period.id,
        employee_name: employee.getFullName(),
        employee_number: employee.employee_number,
        basic_salary: employee.basic_salary,
        ...calculations,
        status: 'calculated'
      }, { transaction });
      
      totalGross += calculations.gross_salary;
      totalDeductions += calculations.total_deductions;
      totalNet += calculations.net_salary;
      totalPaye += calculations.paye;
      totalNssf += calculations.nssf_employee;
      totalNhif += calculations.nhif;
    }
    
    // Update period totals
    await period.update({
      total_gross: totalGross,
      total_deductions: totalDeductions,
      total_net: totalNet,
      total_paye: totalPaye,
      total_nssf: totalNssf * 2, // Employee + Employer
      total_nhif: totalNhif,
      employee_count: employees.length,
      status: 'processing',
      processed_at: new Date(),
      processed_by: req.userId
    }, { transaction });
    
    await transaction.commit();
    
    await period.reload({
      include: [{ model: PayrollEntry, as: 'entries' }]
    });
    
    res.json({
      success: true,
      message: `Payroll generated for ${employees.length} employees`,
      data: period
    });
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}));

// Approve payroll period
router.post('/periods/:id/approve', authenticate, hasPermission('payroll', 'approve'), asyncHandler(async (req, res) => {
  const period = await PayrollPeriod.findByPk(req.params.id);
  
  if (!period) {
    throw ApiError.notFound('Payroll period not found');
  }
  
  if (period.status !== 'processing') {
    throw ApiError.badRequest('Payroll must be processed before approval');
  }
  
  await period.update({
    status: 'approved',
    approved_at: new Date(),
    approved_by: req.userId
  });
  
  // Update all entries
  await PayrollEntry.update(
    { status: 'approved' },
    { where: { period_id: period.id } }
  );
  
  res.json({
    success: true,
    message: 'Payroll approved',
    data: period
  });
}));

// Mark payroll as paid
router.post('/periods/:id/mark-paid', authenticate, hasPermission('payroll', 'approve'), asyncHandler(async (req, res) => {
  const period = await PayrollPeriod.findByPk(req.params.id);
  
  if (!period) {
    throw ApiError.notFound('Payroll period not found');
  }
  
  if (period.status !== 'approved') {
    throw ApiError.badRequest('Payroll must be approved before marking as paid');
  }
  
  await period.update({
    status: 'paid',
    paid_at: new Date()
  });
  
  await PayrollEntry.update(
    { status: 'paid', payment_status: 'paid', paid_at: new Date() },
    { where: { period_id: period.id } }
  );
  
  res.json({
    success: true,
    message: 'Payroll marked as paid',
    data: period
  });
}));

// Delete payroll period
router.delete('/periods/:id', authenticate, hasPermission('payroll', 'delete'), asyncHandler(async (req, res) => {
  const period = await PayrollPeriod.findByPk(req.params.id);
  
  if (!period) {
    throw ApiError.notFound('Payroll period not found');
  }
  
  // Only allow deleting open or processing periods
  if (period.status === 'approved' || period.status === 'paid') {
    throw ApiError.badRequest('Cannot delete approved or paid payroll periods');
  }
  
  // Delete associated entries first
  await PayrollEntry.destroy({ where: { period_id: period.id } });
  
  // Delete the period
  await period.destroy();
  
  res.json({
    success: true,
    message: 'Payroll period deleted successfully'
  });
}));

// ==================== PAYROLL ENTRIES ====================

// Get single entry
router.get('/entries/:id', authenticate, hasPermission('payroll', 'view'), asyncHandler(async (req, res) => {
  const entry = await PayrollEntry.findByPk(req.params.id, {
    include: [
      { model: Employee, as: 'employee' },
      { model: PayrollPeriod, as: 'period' }
    ]
  });
  
  if (!entry) {
    throw ApiError.notFound('Payroll entry not found');
  }
  
  res.json({ success: true, data: entry });
}));

// Update entry (add allowances/deductions)
router.put('/entries/:id', authenticate, hasPermission('payroll', 'edit'), asyncHandler(async (req, res) => {
  const entry = await PayrollEntry.findByPk(req.params.id);
  
  if (!entry) {
    throw ApiError.notFound('Payroll entry not found');
  }
  
  if (entry.status === 'paid') {
    throw ApiError.badRequest('Cannot edit paid payroll entry');
  }
  
  const {
    house_allowance, transport_allowance, other_allowances,
    allowances_detail, loan_deduction, advance_deduction,
    other_deductions, deductions_detail, notes
  } = req.body;
  
  // Recalculate with new allowances
  const grossSalary = 
    parseFloat(entry.basic_salary) +
    parseFloat(house_allowance || entry.house_allowance || 0) +
    parseFloat(transport_allowance || entry.transport_allowance || 0) +
    parseFloat(other_allowances || entry.other_allowances || 0);
  
  const calculations = await calculatePayroll({ basic_salary: entry.basic_salary }, grossSalary);
  
  // Add other deductions
  const additionalDeductions = 
    parseFloat(loan_deduction || entry.loan_deduction || 0) +
    parseFloat(advance_deduction || entry.advance_deduction || 0) +
    parseFloat(other_deductions || entry.other_deductions || 0);
  
  await entry.update({
    house_allowance: house_allowance || entry.house_allowance,
    transport_allowance: transport_allowance || entry.transport_allowance,
    other_allowances: other_allowances || entry.other_allowances,
    allowances_detail: allowances_detail || entry.allowances_detail,
    loan_deduction: loan_deduction || entry.loan_deduction,
    advance_deduction: advance_deduction || entry.advance_deduction,
    other_deductions: other_deductions || entry.other_deductions,
    deductions_detail: deductions_detail || entry.deductions_detail,
    ...calculations,
    total_deductions: calculations.total_deductions + additionalDeductions,
    net_salary: calculations.net_salary - additionalDeductions,
    notes
  });
  
  res.json({
    success: true,
    message: 'Payroll entry updated',
    data: entry
  });
}));

// Calculate payroll preview
router.post('/calculate', authenticate, hasPermission('payroll', 'view'), asyncHandler(async (req, res) => {
  const { gross_salary } = req.body;
  
  const calculations = await calculatePayroll({}, gross_salary);
  
  res.json({
    success: true,
    data: calculations
  });
}));

module.exports = router;
