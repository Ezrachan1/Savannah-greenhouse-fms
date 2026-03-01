/**
 * ============================================
 * Models Index - Database Model Associations
 * ============================================
 * Central file for importing all models and defining relationships
 */

const { sequelize, Sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Role = require('./Role');
const Greenhouse = require('./Greenhouse');
const Crop = require('./Crop');
const CropAllocation = require('./CropAllocation');
const SeedlingBatch = require('./SeedlingBatch');
const ProductionLog = require('./ProductionLog');
const InventoryCategory = require('./InventoryCategory');
const InventoryItem = require('./InventoryItem');
const StockMovement = require('./StockMovement');
const InputUsage = require('./InputUsage');
const Customer = require('./Customer');
const Sale = require('./Sale');
const SaleItem = require('./SaleItem');
const Invoice = require('./Invoice');
const Employee = require('./Employee');
const PayrollPeriod = require('./PayrollPeriod');
const PayrollEntry = require('./PayrollEntry');
const Deduction = require('./Deduction');
const ExpenseCategory = require('./ExpenseCategory');
const Expense = require('./Expense');
const CashbookEntry = require('./CashbookEntry');
const Setting = require('./Setting');
const AuditLog = require('./AuditLog');
const SyncQueue = require('./SyncQueue');

// ============================================
// DEFINE MODEL ASSOCIATIONS
// ============================================

// ----- User & Role Associations -----
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

// ----- Greenhouse Associations -----
Greenhouse.hasMany(CropAllocation, { foreignKey: 'greenhouse_id', as: 'allocations' });
CropAllocation.belongsTo(Greenhouse, { foreignKey: 'greenhouse_id', as: 'greenhouse' });

// ----- Crop Associations -----
Crop.hasMany(CropAllocation, { foreignKey: 'crop_id', as: 'allocations' });
CropAllocation.belongsTo(Crop, { foreignKey: 'crop_id', as: 'crop' });

Crop.hasMany(SeedlingBatch, { foreignKey: 'crop_id', as: 'batches' });
SeedlingBatch.belongsTo(Crop, { foreignKey: 'crop_id', as: 'crop' });

// ----- Seedling Batch Associations -----
SeedlingBatch.belongsTo(Greenhouse, { foreignKey: 'greenhouse_id', as: 'greenhouse' });
Greenhouse.hasMany(SeedlingBatch, { foreignKey: 'greenhouse_id', as: 'batches' });

SeedlingBatch.hasMany(ProductionLog, { foreignKey: 'batch_id', as: 'logs' });
ProductionLog.belongsTo(SeedlingBatch, { foreignKey: 'batch_id', as: 'batch' });

SeedlingBatch.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// ----- Production Log Associations -----
ProductionLog.belongsTo(User, { foreignKey: 'logged_by', as: 'logger' });

// ----- Inventory Associations -----
InventoryCategory.hasMany(InventoryItem, { foreignKey: 'category_id', as: 'items' });
InventoryItem.belongsTo(InventoryCategory, { foreignKey: 'category_id', as: 'category' });

InventoryItem.hasMany(StockMovement, { foreignKey: 'item_id', as: 'movements' });
StockMovement.belongsTo(InventoryItem, { foreignKey: 'item_id', as: 'item' });

StockMovement.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// ----- Input Usage Associations -----
InputUsage.belongsTo(InventoryItem, { foreignKey: 'item_id', as: 'item' });
InputUsage.belongsTo(Greenhouse, { foreignKey: 'greenhouse_id', as: 'greenhouse' });
InputUsage.belongsTo(SeedlingBatch, { foreignKey: 'batch_id', as: 'batch' });
InputUsage.belongsTo(User, { foreignKey: 'recorded_by', as: 'recorder' });

InventoryItem.hasMany(InputUsage, { foreignKey: 'item_id', as: 'usages' });

// ----- Sales Associations -----
Customer.hasMany(Sale, { foreignKey: 'customer_id', as: 'sales' });
Sale.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

Sale.hasMany(SaleItem, { foreignKey: 'sale_id', as: 'items' });
SaleItem.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

Sale.hasOne(Invoice, { foreignKey: 'sale_id', as: 'invoice' });
Invoice.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

Sale.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Sale Items link to inventory for product sales
SaleItem.belongsTo(InventoryItem, { foreignKey: 'product_id', as: 'product' });

// Sale Items link to seedling batches for seedling sales
SaleItem.belongsTo(SeedlingBatch, { foreignKey: 'batch_id', as: 'batch' });
SeedlingBatch.hasMany(SaleItem, { foreignKey: 'batch_id', as: 'saleItems' });

// ----- Employee & Payroll Associations -----
Employee.hasMany(PayrollEntry, { foreignKey: 'employee_id', as: 'payrollEntries' });
PayrollEntry.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

PayrollPeriod.hasMany(PayrollEntry, { foreignKey: 'period_id', as: 'entries' });
PayrollEntry.belongsTo(PayrollPeriod, { foreignKey: 'period_id', as: 'period' });

PayrollEntry.hasMany(Deduction, { foreignKey: 'payroll_entry_id', as: 'deductions' });
Deduction.belongsTo(PayrollEntry, { foreignKey: 'payroll_entry_id', as: 'payrollEntry' });

// Link Employee to User (optional - for employees who are also system users)
Employee.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasOne(Employee, { foreignKey: 'user_id', as: 'employeeProfile' });

// ----- Expense Associations -----
ExpenseCategory.hasMany(Expense, { foreignKey: 'category_id', as: 'expenses' });
Expense.belongsTo(ExpenseCategory, { foreignKey: 'category_id', as: 'category' });

Expense.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Expense.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

// ----- Cashbook Associations -----
CashbookEntry.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
CashbookEntry.belongsTo(Expense, { foreignKey: 'expense_id', as: 'expense' });
CashbookEntry.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

// ----- Audit Log Associations -----
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ----- Sync Queue Associations -----
SyncQueue.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ============================================
// EXPORT ALL MODELS
// ============================================

module.exports = {
  sequelize,
  Sequelize,
  
  // User management
  User,
  Role,
  
  // Greenhouse & Production
  Greenhouse,
  Crop,
  CropAllocation,
  SeedlingBatch,
  ProductionLog,
  
  // Inventory
  InventoryCategory,
  InventoryItem,
  StockMovement,
  InputUsage,
  
  // Sales
  Customer,
  Sale,
  SaleItem,
  Invoice,
  
  // HR & Payroll
  Employee,
  PayrollPeriod,
  PayrollEntry,
  Deduction,
  
  // Expenses
  ExpenseCategory,
  Expense,
  CashbookEntry,
  
  // System
  Setting,
  AuditLog,
  SyncQueue
};
