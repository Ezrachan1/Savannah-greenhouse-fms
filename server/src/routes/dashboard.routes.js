/**
 * ============================================
 * Dashboard Routes
 * ============================================
 * Real-time dashboard data
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { 
  Sale, Expense, SeedlingBatch, InventoryItem,
  Employee, Customer, Greenhouse
} = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// Main dashboard overview
router.get('/overview', authenticate, asyncHandler(async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10);
  
  // Sales stats
  const todaySales = await Sale.sum('total_amount', {
    where: { sale_date: today, status: { [Op.ne]: 'cancelled' } }
  }) || 0;
  
  const monthSales = await Sale.sum('total_amount', {
    where: { 
      sale_date: { [Op.gte]: startOfMonth },
      status: { [Op.ne]: 'cancelled' }
    }
  }) || 0;
  
  const unpaidInvoices = await Sale.sum('balance_due', {
    where: { 
      payment_status: { [Op.in]: ['pending', 'partial'] },
      status: { [Op.ne]: 'cancelled' }
    }
  }) || 0;
  
  // Expense stats
  const monthExpenses = await Expense.sum('total_amount', {
    where: {
      expense_date: { [Op.gte]: startOfMonth },
      status: { [Op.ne]: 'cancelled' }
    }
  }) || 0;
  
  // Production stats
  const activeBatches = await SeedlingBatch.count({
    where: { status: { [Op.in]: ['sown', 'germinating', 'growing', 'ready', 'selling'] } }
  });
  
  const readyForSale = await SeedlingBatch.sum('current_quantity', {
    where: { status: { [Op.in]: ['ready', 'selling'] } }
  }) || 0;
  
  // Inventory stats
  const lowStockItems = await InventoryItem.count({
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
  
  // Counts
  const activeGreenhouses = await Greenhouse.count({ where: { status: 'active' } });
  const activeEmployees = await Employee.count({ where: { status: 'active' } });
  const totalCustomers = await Customer.count({ where: { status: 'active' } });
  
  res.json({
    success: true,
    data: {
      sales: {
        today: todaySales,
        month: monthSales,
        unpaid: unpaidInvoices
      },
      expenses: {
        month: monthExpenses
      },
      production: {
        activeBatches,
        readyForSale
      },
      inventory: {
        lowStockItems
      },
      counts: {
        greenhouses: activeGreenhouses,
        employees: activeEmployees,
        customers: totalCustomers
      },
      profit: monthSales - monthExpenses
    }
  });
}));

// Sales chart data (last 30 days)
router.get('/sales-chart', authenticate, asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  
  const salesData = await Sale.findAll({
    where: {
      sale_date: { [Op.gte]: startDate.toISOString().slice(0, 10) },
      status: { [Op.ne]: 'cancelled' }
    },
    attributes: [
      'sale_date',
      [sequelize.fn('SUM', sequelize.col('total_amount')), 'total'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['sale_date'],
    order: [['sale_date', 'ASC']],
    raw: true
  });
  
  res.json({ success: true, data: salesData });
}));

// Production pipeline
router.get('/production-pipeline', authenticate, asyncHandler(async (req, res) => {
  const pipeline = await SeedlingBatch.findAll({
    where: { status: { [Op.notIn]: ['completed', 'failed'] } },
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'batch_count'],
      [sequelize.fn('SUM', sequelize.col('current_quantity')), 'total_seedlings']
    ],
    group: ['status'],
    raw: true
  });
  
  res.json({ success: true, data: pipeline });
}));

// Recent activities
router.get('/recent-activities', authenticate, asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  
  // Recent sales
  const recentSales = await Sale.findAll({
    attributes: ['id', 'sale_number', 'customer_name', 'total_amount', 'created_at'],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit)
  });
  
  // Recent batches
  const recentBatches = await SeedlingBatch.findAll({
    attributes: ['id', 'batch_number', 'status', 'created_at'],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit)
  });
  
  res.json({
    success: true,
    data: {
      sales: recentSales,
      batches: recentBatches
    }
  });
}));

// Low stock alerts
router.get('/alerts', authenticate, asyncHandler(async (req, res) => {
  const lowStockItems = await InventoryItem.findAll({
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
    attributes: ['id', 'name', 'code', 'current_quantity', 'minimum_quantity', 'unit'],
    limit: 10
  });
  
  // Overdue payments
  const overduePayments = await Sale.findAll({
    where: {
      payment_status: { [Op.in]: ['pending', 'partial'] },
      due_date: { [Op.lt]: new Date() },
      status: { [Op.ne]: 'cancelled' }
    },
    attributes: ['id', 'sale_number', 'customer_name', 'balance_due', 'due_date'],
    limit: 10
  });
  
  // Batches ready for sale
  const readyBatches = await SeedlingBatch.findAll({
    where: { status: 'ready' },
    attributes: ['id', 'batch_number', 'current_quantity', 'actual_ready_date'],
    limit: 10
  });
  
  res.json({
    success: true,
    data: {
      lowStock: lowStockItems,
      overduePayments,
      readyBatches
    }
  });
}));

module.exports = router;
