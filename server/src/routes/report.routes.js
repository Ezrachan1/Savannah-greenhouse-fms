/**
 * ============================================
 * Report Routes
 * ============================================
 * Financial and management reports
 */

const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../middleware/auth');
const { 
  Sale, SaleItem, Expense, ExpenseCategory,
  PayrollPeriod, PayrollEntry, SeedlingBatch,
  InventoryItem, CashbookEntry, Customer
} = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// ==================== SALES REPORTS ====================

// Sales summary report
router.get('/sales', authenticate, hasPermission('reports', 'view'), asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  
  const where = { status: { [Op.ne]: 'cancelled' } };
  
  if (start_date) where.sale_date = { ...where.sale_date, [Op.gte]: start_date };
  if (end_date) where.sale_date = { ...where.sale_date, [Op.lte]: end_date };
  
  // Summary totals
  const summaryData = await Sale.findOne({
    where,
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'transaction_count'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_amount')), 0), 'total_sales'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount_paid')), 0), 'total_collected'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('balance_due')), 0), 'total_outstanding'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('tax_amount')), 0), 'total_vat'],
    ],
    raw: true
  });
  
  // By payment method
  const byPaymentMethod = await Sale.findAll({
    where,
    attributes: [
      'payment_method',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_amount')), 0), 'total']
    ],
    group: ['payment_method'],
    raw: true
  });
  
  // Recent transactions
  const transactions = await Sale.findAll({
    where,
    attributes: ['id', 'sale_number', 'sale_date', 'customer_name', 'total_amount', 'amount_paid', 'balance_due', 'payment_status', 'status'],
    order: [['sale_date', 'DESC'], ['created_at', 'DESC']],
    limit: 100,
    raw: true
  });
  
  res.json({
    success: true,
    data: {
      summary: {
        total_sales: parseFloat(summaryData?.total_sales) || 0,
        total_collected: parseFloat(summaryData?.total_collected) || 0,
        total_outstanding: parseFloat(summaryData?.total_outstanding) || 0,
        total_vat: parseFloat(summaryData?.total_vat) || 0,
        transaction_count: parseInt(summaryData?.transaction_count) || 0
      },
      by_payment_method: byPaymentMethod,
      transactions
    }
  });
}));

// ==================== EXPENSE REPORTS ====================

// Expense summary report
router.get('/expenses', authenticate, hasPermission('reports', 'view'), asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  
  const where = { status: { [Op.ne]: 'cancelled' } };
  
  if (start_date) where.expense_date = { ...where.expense_date, [Op.gte]: start_date };
  if (end_date) where.expense_date = { ...where.expense_date, [Op.lte]: end_date };
  
  // Summary totals
  const totalExpenses = await Expense.sum('total_amount', { where }) || 0;
  const approvedExpenses = await Expense.sum('total_amount', { 
    where: { ...where, approval_status: 'approved' } 
  }) || 0;
  const pendingExpenses = await Expense.sum('total_amount', { 
    where: { ...where, approval_status: 'pending' } 
  }) || 0;
  
  // By category
  const byCategory = await Expense.findAll({
    where,
    attributes: [
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('Expense.total_amount')), 0), 'total'],
      [sequelize.fn('COUNT', sequelize.col('Expense.id')), 'count']
    ],
    include: [{ model: ExpenseCategory, as: 'category', attributes: ['name'] }],
    group: ['category.id', 'category.name'],
    order: [[sequelize.fn('SUM', sequelize.col('Expense.total_amount')), 'DESC']],
  });
  
  // Recent expenses
  const expenses = await Expense.findAll({
    where,
    include: [{ model: ExpenseCategory, as: 'category', attributes: ['name'] }],
    order: [['expense_date', 'DESC'], ['created_at', 'DESC']],
    limit: 50
  });
  
  res.json({
    success: true,
    data: {
      summary: {
        total_expenses: totalExpenses,
        approved_expenses: approvedExpenses,
        pending_expenses: pendingExpenses
      },
      by_category: byCategory.map(item => ({
        category: item.category?.name || 'Uncategorized',
        total: parseFloat(item.dataValues.total) || 0,
        count: parseInt(item.dataValues.count) || 0
      })),
      expenses
    }
  });
}));

// ==================== PROFIT & LOSS ====================

router.get('/profit-loss', authenticate, hasPermission('reports', 'view'), asyncHandler(async (req, res) => {
  const { from_date, to_date } = req.query;
  
  // Revenue (Sales)
  const salesWhere = { status: { [Op.ne]: 'cancelled' } };
  if (from_date) salesWhere.sale_date = { ...salesWhere.sale_date, [Op.gte]: from_date };
  if (to_date) salesWhere.sale_date = { ...salesWhere.sale_date, [Op.lte]: to_date };
  
  const revenue = await Sale.sum('total_amount', { where: salesWhere }) || 0;
  const salesVat = await Sale.sum('tax_amount', { where: salesWhere }) || 0;
  
  // Expenses
  const expenseWhere = { status: { [Op.ne]: 'cancelled' } };
  if (from_date) expenseWhere.expense_date = { ...expenseWhere.expense_date, [Op.gte]: from_date };
  if (to_date) expenseWhere.expense_date = { ...expenseWhere.expense_date, [Op.lte]: to_date };
  
  const expenses = await Expense.sum('total_amount', { where: expenseWhere }) || 0;
  const expenseVat = await Expense.sum('vat_amount', { where: expenseWhere }) || 0;
  
  // Expense breakdown by category
  const expenseBreakdown = await Expense.findAll({
    where: expenseWhere,
    attributes: [
      'category_id',
      [sequelize.fn('SUM', sequelize.col('total_amount')), 'amount']
    ],
    include: [{ model: ExpenseCategory, as: 'category', attributes: ['name'] }],
    group: ['category_id', 'category.id'],
    raw: true
  });
  
  // Payroll (if within date range)
  const payrollWhere = {};
  if (from_date) payrollWhere.start_date = { [Op.gte]: from_date };
  if (to_date) payrollWhere.end_date = { [Op.lte]: to_date };
  
  const payrollCosts = await PayrollPeriod.sum('total_gross', { 
    where: { ...payrollWhere, status: { [Op.in]: ['approved', 'paid'] } }
  }) || 0;
  
  // Calculate profit
  const totalExpenses = expenses + payrollCosts;
  const grossProfit = revenue - totalExpenses;
  const vatPayable = salesVat - expenseVat;
  const netProfit = grossProfit;
  
  res.json({
    success: true,
    data: {
      revenue,
      salesVat,
      expenses,
      expenseVat,
      payrollCosts,
      totalExpenses,
      grossProfit,
      vatPayable,
      netProfit,
      expenseBreakdown,
      profitMargin: revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0
    }
  });
}));

// ==================== PAYROLL REPORTS ====================

router.get('/payroll', authenticate, hasPermission('reports', 'view'), asyncHandler(async (req, res) => {
  const { period_id, start_date, end_date } = req.query;
  const { Employee } = require('../models');
  
  let where = {};
  let periodWhere = {};
  
  if (period_id) {
    where.period_id = period_id;
  }
  
  // Filter by date range using period dates
  if (start_date) {
    periodWhere.start_date = { [Op.gte]: start_date };
  }
  if (end_date) {
    periodWhere.end_date = { [Op.lte]: end_date };
  }
  
  const entries = await PayrollEntry.findAll({
    where,
    include: [
      { 
        model: PayrollPeriod, 
        as: 'period',
        where: Object.keys(periodWhere).length > 0 ? periodWhere : undefined
      },
      {
        model: Employee,
        as: 'employee',
        attributes: ['id', 'first_name', 'last_name', 'employee_id']
      }
    ],
    order: [['created_at', 'DESC']]
  });
  
  // Summary
  const summary = {
    total_gross: entries.reduce((sum, e) => sum + parseFloat(e.gross_salary || 0), 0),
    total_deductions: entries.reduce((sum, e) => sum + parseFloat(e.total_deductions || 0), 0),
    total_net: entries.reduce((sum, e) => sum + parseFloat(e.net_salary || 0), 0),
    employee_count: entries.length
  };
  
  // Statutory breakdown
  const statutory = {
    paye: entries.reduce((sum, e) => sum + parseFloat(e.paye || 0), 0),
    nhif: entries.reduce((sum, e) => sum + parseFloat(e.nhif || 0), 0),
    nssf: entries.reduce((sum, e) => sum + parseFloat(e.nssf_employee || 0) + parseFloat(e.nssf_employer || 0), 0),
    housing_levy: entries.reduce((sum, e) => sum + parseFloat(e.housing_levy || 0), 0)
  };
  
  res.json({
    success: true,
    data: { entries, summary, statutory }
  });
}));

// ==================== VAT REPORT ====================

router.get('/vat', authenticate, hasPermission('reports', 'view'), asyncHandler(async (req, res) => {
  const { from_date, to_date } = req.query;
  
  // Output VAT (from sales)
  const salesWhere = { status: { [Op.ne]: 'cancelled' } };
  if (from_date) salesWhere.sale_date = { ...salesWhere.sale_date, [Op.gte]: from_date };
  if (to_date) salesWhere.sale_date = { ...salesWhere.sale_date, [Op.lte]: to_date };
  
  const outputVat = await Sale.sum('tax_amount', { where: salesWhere }) || 0;
  const totalSales = await Sale.sum('subtotal', { where: salesWhere }) || 0;
  
  // Input VAT (from expenses)
  const expenseWhere = { status: { [Op.ne]: 'cancelled' } };
  if (from_date) expenseWhere.expense_date = { ...expenseWhere.expense_date, [Op.gte]: from_date };
  if (to_date) expenseWhere.expense_date = { ...expenseWhere.expense_date, [Op.lte]: to_date };
  
  const inputVat = await Expense.sum('vat_amount', { where: expenseWhere }) || 0;
  const totalPurchases = await Expense.sum('amount', { where: expenseWhere }) || 0;
  
  // VAT Payable
  const vatPayable = outputVat - inputVat;
  
  res.json({
    success: true,
    data: {
      outputVat,
      inputVat,
      vatPayable,
      totalSales,
      totalPurchases,
      effectiveRate: totalSales > 0 ? ((outputVat / totalSales) * 100).toFixed(2) : 0
    }
  });
}));

// ==================== PRODUCTION REPORT ====================

router.get('/production', authenticate, hasPermission('reports', 'view'), asyncHandler(async (req, res) => {
  const { from_date, to_date } = req.query;
  
  const where = {};
  if (from_date) where.sowing_date = { ...where.sowing_date, [Op.gte]: from_date };
  if (to_date) where.sowing_date = { ...where.sowing_date, [Op.lte]: to_date };
  
  // Summary
  const summary = await SeedlingBatch.findOne({
    where,
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_batches'],
      [sequelize.fn('SUM', sequelize.col('seeds_sown')), 'total_seeds'],
      [sequelize.fn('SUM', sequelize.col('germinated_count')), 'total_germinated'],
      [sequelize.fn('SUM', sequelize.col('current_quantity')), 'current_stock'],
      [sequelize.fn('SUM', sequelize.col('sold_quantity')), 'total_sold'],
      [sequelize.fn('SUM', sequelize.col('lost_quantity')), 'total_lost'],
      [sequelize.fn('AVG', sequelize.col('germination_rate')), 'avg_germination_rate']
    ],
    raw: true
  });
  
  // By status
  const byStatus = await SeedlingBatch.findAll({
    where,
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('current_quantity')), 'quantity']
    ],
    group: ['status'],
    raw: true
  });
  
  res.json({
    success: true,
    data: { summary, byStatus }
  });
}));

// ==================== INVENTORY REPORT ====================

router.get('/inventory', authenticate, hasPermission('reports', 'view'), asyncHandler(async (req, res) => {
  const items = await InventoryItem.findAll({
    where: { status: 'active' },
    attributes: [
      'id', 'name', 'code', 'unit', 'current_quantity',
      'minimum_quantity', 'cost_price', 'total_value'
    ],
    order: [['name', 'ASC']]
  });
  
  const totalValue = items.reduce((sum, item) => sum + parseFloat(item.total_value || 0), 0);
  const lowStockCount = items.filter(item => 
    parseFloat(item.current_quantity) <= parseFloat(item.minimum_quantity)
  ).length;
  
  res.json({
    success: true,
    data: {
      items,
      summary: {
        totalItems: items.length,
        totalValue,
        lowStockCount
      }
    }
  });
}));

// ==================== EXPORT ROUTES ====================

// Helper function to generate CSV
const generateCSV = (data, columns) => {
  const header = columns.map(c => c.label).join(',');
  const rows = data.map(row => 
    columns.map(c => {
      let value = c.getter ? c.getter(row) : row[c.key];
      if (value === null || value === undefined) value = '';
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  return [header, ...rows].join('\n');
};

// Sales Export
router.get('/sales/export', authenticate, hasPermission('reports', 'view'), asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  
  const where = { status: { [Op.ne]: 'cancelled' } };
  if (start_date) where.sale_date = { ...where.sale_date, [Op.gte]: start_date };
  if (end_date) where.sale_date = { ...where.sale_date, [Op.lte]: end_date };
  
  const sales = await Sale.findAll({
    where,
    order: [['sale_date', 'DESC']],
    raw: true
  });
  
  const columns = [
    { label: 'Sale Number', key: 'sale_number' },
    { label: 'Date', getter: (r) => r.sale_date ? new Date(r.sale_date).toLocaleDateString() : '' },
    { label: 'Customer', key: 'customer_name' },
    { label: 'Subtotal', key: 'subtotal' },
    { label: 'VAT', key: 'tax_amount' },
    { label: 'Total', key: 'total_amount' },
    { label: 'Paid', key: 'amount_paid' },
    { label: 'Balance', key: 'balance_due' },
    { label: 'Payment Status', key: 'payment_status' },
    { label: 'Payment Method', key: 'payment_method' }
  ];
  
  const csv = generateCSV(sales, columns);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=sales-report-${start_date || 'all'}-to-${end_date || 'all'}.csv`);
  res.send(csv);
}));

// Expenses Export
router.get('/expenses/export', authenticate, hasPermission('reports', 'view'), asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  
  const where = { status: { [Op.ne]: 'cancelled' } };
  if (start_date) where.expense_date = { ...where.expense_date, [Op.gte]: start_date };
  if (end_date) where.expense_date = { ...where.expense_date, [Op.lte]: end_date };
  
  const expenses = await Expense.findAll({
    where,
    include: [{ model: ExpenseCategory, as: 'category', attributes: ['name'] }],
    order: [['expense_date', 'DESC']]
  });
  
  const columns = [
    { label: 'Reference', key: 'reference_number' },
    { label: 'Date', getter: (r) => r.expense_date ? new Date(r.expense_date).toLocaleDateString() : '' },
    { label: 'Category', getter: (r) => r.category?.name || '' },
    { label: 'Description', key: 'description' },
    { label: 'Amount', key: 'amount' },
    { label: 'VAT', key: 'vat_amount' },
    { label: 'Total', key: 'total_amount' },
    { label: 'Paid To', key: 'paid_to' },
    { label: 'Payment Method', key: 'payment_method' },
    { label: 'Status', key: 'approval_status' }
  ];
  
  const csv = generateCSV(expenses, columns);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=expenses-report-${start_date || 'all'}-to-${end_date || 'all'}.csv`);
  res.send(csv);
}));

// Profit & Loss Export
router.get('/profit-loss/export', authenticate, hasPermission('reports', 'view'), asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  
  // Get same data as the regular P&L endpoint
  const salesWhere = { status: { [Op.ne]: 'cancelled' } };
  if (start_date) salesWhere.sale_date = { ...salesWhere.sale_date, [Op.gte]: start_date };
  if (end_date) salesWhere.sale_date = { ...salesWhere.sale_date, [Op.lte]: end_date };
  
  const revenue = await Sale.sum('total_amount', { where: salesWhere }) || 0;
  
  const expenseWhere = { status: { [Op.ne]: 'cancelled' } };
  if (start_date) expenseWhere.expense_date = { ...expenseWhere.expense_date, [Op.gte]: start_date };
  if (end_date) expenseWhere.expense_date = { ...expenseWhere.expense_date, [Op.lte]: end_date };
  
  const expenses = await Expense.sum('total_amount', { where: expenseWhere }) || 0;
  
  const payrollWhere = {};
  if (start_date) payrollWhere.start_date = { [Op.gte]: start_date };
  if (end_date) payrollWhere.end_date = { [Op.lte]: end_date };
  
  const payrollCosts = await PayrollPeriod.sum('total_gross', { 
    where: { ...payrollWhere, status: { [Op.in]: ['approved', 'paid'] } }
  }) || 0;
  
  const data = [
    { item: 'Revenue (Sales)', amount: revenue },
    { item: 'Less: Operating Expenses', amount: expenses },
    { item: 'Less: Payroll Expenses', amount: payrollCosts },
    { item: 'Net Profit', amount: revenue - expenses - payrollCosts }
  ];
  
  const columns = [
    { label: 'Item', key: 'item' },
    { label: 'Amount (KES)', key: 'amount' }
  ];
  
  const csv = generateCSV(data, columns);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=profit-loss-${start_date || 'all'}-to-${end_date || 'all'}.csv`);
  res.send(csv);
}));

// Production Export
router.get('/production/export', authenticate, hasPermission('reports', 'view'), asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  const { Crop, Greenhouse } = require('../models');
  
  const where = {};
  if (start_date) where.sowing_date = { ...where.sowing_date, [Op.gte]: start_date };
  if (end_date) where.sowing_date = { ...where.sowing_date, [Op.lte]: end_date };
  
  const batches = await SeedlingBatch.findAll({
    where,
    include: [
      { model: Crop, as: 'crop', attributes: ['name'] },
      { model: Greenhouse, as: 'greenhouse', attributes: ['name'] }
    ],
    order: [['sowing_date', 'DESC']]
  });
  
  const columns = [
    { label: 'Batch Number', key: 'batch_number' },
    { label: 'Crop', getter: (r) => r.crop?.name || '' },
    { label: 'Greenhouse', getter: (r) => r.greenhouse?.name || '' },
    { label: 'Sowing Date', getter: (r) => r.sowing_date ? new Date(r.sowing_date).toLocaleDateString() : '' },
    { label: 'Seeds Sown', key: 'seeds_sown' },
    { label: 'Germinated', key: 'germinated_count' },
    { label: 'Germination Rate %', key: 'germination_rate' },
    { label: 'Current Qty', key: 'current_quantity' },
    { label: 'Sold', key: 'sold_quantity' },
    { label: 'Lost', key: 'lost_quantity' },
    { label: 'Status', key: 'status' }
  ];
  
  const csv = generateCSV(batches, columns);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=production-report-${start_date || 'all'}-to-${end_date || 'all'}.csv`);
  res.send(csv);
}));

// Payroll Export
router.get('/payroll/export', authenticate, hasPermission('reports', 'view'), asyncHandler(async (req, res) => {
  const { start_date, end_date, period_id } = req.query;
  const { Employee } = require('../models');
  
  let where = {};
  let periodWhere = {};
  
  if (period_id) {
    where.period_id = period_id;
  }
  
  if (start_date) {
    periodWhere.start_date = { [Op.gte]: start_date };
  }
  if (end_date) {
    periodWhere.end_date = { [Op.lte]: end_date };
  }
  
  const entries = await PayrollEntry.findAll({
    where,
    include: [
      { 
        model: PayrollPeriod, 
        as: 'period',
        where: Object.keys(periodWhere).length > 0 ? periodWhere : undefined
      },
      {
        model: Employee,
        as: 'employee',
        attributes: ['id', 'first_name', 'last_name', 'employee_id']
      }
    ],
    order: [['created_at', 'DESC']]
  });
  
  const columns = [
    { label: 'Employee Name', getter: (r) => r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : r.employee_name || '' },
    { label: 'Employee ID', getter: (r) => r.employee?.employee_id || '' },
    { label: 'Period', getter: (r) => r.period?.period_name || '' },
    { label: 'Basic Salary', key: 'basic_salary' },
    { label: 'Allowances', key: 'total_allowances' },
    { label: 'Gross Salary', key: 'gross_salary' },
    { label: 'PAYE', key: 'paye' },
    { label: 'NHIF', key: 'nhif' },
    { label: 'NSSF Employee', key: 'nssf_employee' },
    { label: 'NSSF Employer', key: 'nssf_employer' },
    { label: 'Housing Levy', key: 'housing_levy' },
    { label: 'Total Deductions', key: 'total_deductions' },
    { label: 'Net Salary', key: 'net_salary' }
  ];
  
  const csv = generateCSV(entries, columns);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=payroll-report-${start_date || 'all'}-to-${end_date || 'all'}.csv`);
  res.send(csv);
}));

module.exports = router;
