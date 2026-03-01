/**
 * Database Setup & Admin Permissions Fix
 * Run: node fix-permissions.js
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { User, Role, InventoryCategory, ExpenseCategory, Setting } = require('./src/models');

// Complete permissions for admin role
const ADMIN_PERMISSIONS = {
  dashboard: ['view'],
  greenhouses: ['view', 'create', 'edit', 'delete'],
  crops: ['view', 'create', 'edit', 'delete'],
  production: ['view', 'create', 'edit', 'delete', 'approve'],
  inventory: ['view', 'create', 'edit', 'delete', 'adjust'],
  customers: ['view', 'create', 'edit', 'delete'],
  sales: ['view', 'create', 'edit', 'delete', 'approve', 'void'],
  employees: ['view', 'create', 'edit', 'delete'],
  payroll: ['view', 'create', 'edit', 'delete', 'process', 'approve'],
  expenses: ['view', 'create', 'edit', 'delete', 'approve'],
  reports: ['view', 'export'],
  settings: ['view', 'edit'],
  users: ['view', 'create', 'edit', 'delete'],
  roles: ['view', 'create', 'edit', 'delete'],
  sync: ['view', 'manage'],
};

// Manager permissions - most access except user/role management
const MANAGER_PERMISSIONS = {
  dashboard: ['view'],
  greenhouses: ['view', 'create', 'edit', 'delete'],
  crops: ['view', 'create', 'edit', 'delete'],
  production: ['view', 'create', 'edit', 'delete', 'approve'],
  inventory: ['view', 'create', 'edit', 'delete', 'adjust'],
  customers: ['view', 'create', 'edit', 'delete'],
  sales: ['view', 'create', 'edit', 'delete', 'approve', 'void'],
  employees: ['view', 'create', 'edit'],
  payroll: ['view', 'create', 'edit', 'process'],
  expenses: ['view', 'create', 'edit', 'delete', 'approve'],
  reports: ['view', 'export'],
  settings: ['view'],
  users: ['view'],
  roles: ['view'],
  sync: ['view'],
};

// Supervisor permissions - operational access
const SUPERVISOR_PERMISSIONS = {
  dashboard: ['view'],
  greenhouses: ['view', 'create', 'edit'],
  crops: ['view', 'create', 'edit'],
  production: ['view', 'create', 'edit'],
  inventory: ['view', 'create', 'edit', 'adjust'],
  customers: ['view', 'create', 'edit'],
  sales: ['view', 'create', 'edit'],
  employees: ['view'],
  payroll: ['view'],
  expenses: ['view', 'create', 'edit'],
  reports: ['view'],
  settings: ['view'],
  users: [],
  roles: [],
  sync: ['view'],
};

// Staff permissions - basic operational access
const STAFF_PERMISSIONS = {
  dashboard: ['view'],
  greenhouses: ['view'],
  crops: ['view'],
  production: ['view', 'create', 'edit'],
  inventory: ['view', 'create'],
  customers: ['view', 'create'],
  sales: ['view', 'create'],
  employees: [],
  payroll: [],
  expenses: ['view', 'create'],
  reports: ['view'],
  settings: [],
  users: [],
  roles: [],
  sync: [],
};

// Sales permissions - customer and sales focused
const SALES_PERMISSIONS = {
  dashboard: ['view'],
  greenhouses: ['view'],
  crops: ['view'],
  production: ['view'],
  inventory: ['view'],
  customers: ['view', 'create', 'edit'],
  sales: ['view', 'create', 'edit'],
  employees: [],
  payroll: [],
  expenses: ['view'],
  reports: ['view'],
  settings: [],
  users: [],
  roles: [],
  sync: [],
};

// Viewer permissions - read-only access
const VIEWER_PERMISSIONS = {
  dashboard: ['view'],
  greenhouses: ['view'],
  crops: ['view'],
  production: ['view'],
  inventory: ['view'],
  customers: ['view'],
  sales: ['view'],
  employees: ['view'],
  payroll: ['view'],
  expenses: ['view'],
  reports: ['view'],
  settings: [],
  users: [],
  roles: [],
  sync: [],
};

// Inventory Categories
const INVENTORY_CATEGORIES = [
  { name: 'Seeds', code: 'SEEDS', description: 'Crop seeds and planting material' },
  { name: 'Fertilizers', code: 'FERT', description: 'Fertilizers and nutrients' },
  { name: 'Pesticides', code: 'PEST', description: 'Pesticides and herbicides' },
  { name: 'Growth Media', code: 'MEDIA', description: 'Potting mix, cocopeat, etc.' },
  { name: 'Packaging', code: 'PACK', description: 'Trays, pots, bags, labels' },
  { name: 'Tools & Equipment', code: 'TOOLS', description: 'Hand tools and equipment' },
  { name: 'Irrigation', code: 'IRRIG', description: 'Irrigation supplies' },
  { name: 'Office Supplies', code: 'OFFICE', description: 'Stationery and office items' },
];

// Expense Categories
const EXPENSE_CATEGORIES = [
  { name: 'Seeds & Planting Material', code: 'EXP-SEEDS' },
  { name: 'Fertilizers & Chemicals', code: 'EXP-FERT' },
  { name: 'Labor & Wages', code: 'EXP-LABOR' },
  { name: 'Utilities', code: 'EXP-UTIL', description: 'Electricity, water, etc.' },
  { name: 'Transport', code: 'EXP-TRANS' },
  { name: 'Maintenance & Repairs', code: 'EXP-MAINT' },
  { name: 'Office & Admin', code: 'EXP-ADMIN' },
  { name: 'Marketing', code: 'EXP-MKTG' },
  { name: 'Rent & Lease', code: 'EXP-RENT' },
  { name: 'Insurance', code: 'EXP-INS' },
  { name: 'Miscellaneous', code: 'EXP-MISC' },
];

async function fixPermissions() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Create all tables first
    console.log('📊 Creating database tables...');
    await sequelize.sync({ force: true });
    console.log('✅ Tables created\n');

    // Create admin role
    console.log('👤 Creating admin role...');
    const adminRole = await Role.create({
      name: 'admin',
      display_name: 'Administrator',
      description: 'Full system access',
      is_system: true,
      permissions: ADMIN_PERMISSIONS
    });
    console.log('✅ Admin role created\n');

    // Create manager role
    console.log('👤 Creating manager role...');
    await Role.create({
      name: 'manager',
      display_name: 'Manager',
      description: 'Management access - most permissions except user management',
      is_system: false,
      permissions: MANAGER_PERMISSIONS
    });
    console.log('✅ Manager role created\n');

    // Create supervisor role
    console.log('👤 Creating supervisor role...');
    await Role.create({
      name: 'supervisor',
      display_name: 'Supervisor',
      description: 'Supervisory access - operational permissions',
      is_system: false,
      permissions: SUPERVISOR_PERMISSIONS
    });
    console.log('✅ Supervisor role created\n');

    // Create staff role
    console.log('👤 Creating staff role...');
    await Role.create({
      name: 'staff',
      display_name: 'Staff',
      description: 'Basic staff access - day-to-day operations',
      is_system: false,
      permissions: STAFF_PERMISSIONS
    });
    console.log('✅ Staff role created\n');

    // Create sales role
    console.log('👤 Creating sales role...');
    await Role.create({
      name: 'sales',
      display_name: 'Sales',
      description: 'Sales-focused access - customers and sales',
      is_system: false,
      permissions: SALES_PERMISSIONS
    });
    console.log('✅ Sales role created\n');

    // Create viewer role
    console.log('👤 Creating viewer role...');
    await Role.create({
      name: 'viewer',
      display_name: 'Viewer',
      description: 'Read-only access - view only',
      is_system: false,
      permissions: VIEWER_PERMISSIONS
    });
    console.log('✅ Viewer role created\n');

    // Create admin user
    console.log('👤 Creating admin user...');
    await User.create({
      email: 'admin@savannahpropagation.co.ke',
      password: 'Admin@123456',
      first_name: 'System',
      last_name: 'Administrator',
      role_id: adminRole.id,
      is_active: true
    });
    console.log('✅ Admin user created\n');

    // Seed inventory categories
    console.log('📦 Creating inventory categories...');
    for (const cat of INVENTORY_CATEGORIES) {
      await InventoryCategory.create(cat);
    }
    console.log(`✅ ${INVENTORY_CATEGORIES.length} inventory categories created\n`);

    // Seed expense categories
    console.log('💰 Creating expense categories...');
    for (const cat of EXPENSE_CATEGORIES) {
      await ExpenseCategory.create(cat);
    }
    console.log(`✅ ${EXPENSE_CATEGORIES.length} expense categories created\n`);

    // Seed payroll settings (Kenya 2024 rates)
    console.log('💼 Creating payroll settings...');
    const payrollSettings = [
      { key: 'payroll.nssf_tier1_limit', value: '7000', category: 'payroll', data_type: 'number', description: 'NSSF Tier I upper limit' },
      { key: 'payroll.nssf_tier2_limit', value: '36000', category: 'payroll', data_type: 'number', description: 'NSSF Tier II upper limit' },
      { key: 'payroll.nssf_rate', value: '6', category: 'payroll', data_type: 'number', description: 'NSSF rate (%)' },
      { key: 'payroll.personal_relief', value: '2400', category: 'payroll', data_type: 'number', description: 'Monthly personal relief' },
      { key: 'payroll.housing_levy_rate', value: '1.5', category: 'payroll', data_type: 'number', description: 'Housing levy rate (%)' },
      { 
        key: 'payroll.nhif_brackets', 
        value: JSON.stringify([
          { min: 0, max: 5999, amount: 150 },
          { min: 6000, max: 7999, amount: 300 },
          { min: 8000, max: 11999, amount: 400 },
          { min: 12000, max: 14999, amount: 500 },
          { min: 15000, max: 19999, amount: 600 },
          { min: 20000, max: 24999, amount: 750 },
          { min: 25000, max: 29999, amount: 850 },
          { min: 30000, max: 34999, amount: 900 },
          { min: 35000, max: 39999, amount: 950 },
          { min: 40000, max: 44999, amount: 1000 },
          { min: 45000, max: 49999, amount: 1100 },
          { min: 50000, max: 59999, amount: 1200 },
          { min: 60000, max: 69999, amount: 1300 },
          { min: 70000, max: 79999, amount: 1400 },
          { min: 80000, max: 89999, amount: 1500 },
          { min: 90000, max: 99999, amount: 1600 },
          { min: 100000, max: 999999999, amount: 1700 }
        ]),
        category: 'payroll', 
        data_type: 'string', 
        description: 'NHIF brackets' 
      },
      { 
        key: 'payroll.paye_brackets', 
        value: JSON.stringify([
          { min: 0, max: 24000, rate: 10 },
          { min: 24001, max: 32333, rate: 25 },
          { min: 32334, max: 500000, rate: 30 },
          { min: 500001, max: 800000, rate: 32.5 },
          { min: 800001, max: 999999999, rate: 35 }
        ]),
        category: 'payroll', 
        data_type: 'string', 
        description: 'PAYE tax brackets' 
      }
    ];
    for (const setting of payrollSettings) {
      await Setting.create(setting);
    }
    console.log(`✅ Payroll settings created (NHIF, PAYE, NSSF)\n`);

    // Seed company and system settings
    console.log('🏢 Creating company settings...');
    const companySettings = [
      { key: 'company.name', value: 'Savannah Propagation Nursery', category: 'company', data_type: 'string', description: 'Company name' },
      { key: 'company.address', value: 'Mogotio Town, Nakuru County', category: 'company', data_type: 'string', description: 'Company address' },
      { key: 'company.phone', value: '+254700000000', category: 'company', data_type: 'string', description: 'Company phone' },
      { key: 'company.email', value: 'info@savannahpropagation.co.ke', category: 'company', data_type: 'string', description: 'Company email' },
      { key: 'company.website', value: '', category: 'company', data_type: 'string', description: 'Company website' },
      { key: 'company.kra_pin', value: 'P000000000X', category: 'company', data_type: 'string', description: 'KRA PIN' },
      { key: 'company.registration_number', value: '', category: 'company', data_type: 'string', description: 'Registration number' },
      { key: 'company.logo_url', value: '', category: 'company', data_type: 'string', description: 'Logo URL' },
      { key: 'system.currency', value: 'KES', category: 'system', data_type: 'string', description: 'System currency' },
      { key: 'system.currency_symbol', value: 'KES', category: 'system', data_type: 'string', description: 'Currency symbol' },
      { key: 'system.date_format', value: 'DD/MM/YYYY', category: 'system', data_type: 'string', description: 'Date format' },
      { key: 'system.fiscal_year_start', value: '01', category: 'system', data_type: 'string', description: 'Fiscal year start month' },
      { key: 'system.low_stock_threshold', value: '10', category: 'system', data_type: 'number', description: 'Low stock threshold' },
      { key: 'tax.vat_rate', value: '16', category: 'tax', data_type: 'number', description: 'Default VAT rate' },
    ];
    for (const setting of companySettings) {
      await Setting.create(setting);
    }
    console.log(`✅ Company and system settings created\n`);

    console.log('========================================');
    console.log('✅ Setup completed successfully!');
    console.log('========================================');
    console.log('\n⚠️  NOTE: This script drops all existing data.');
    console.log('   Only run on fresh database setup.\n');
    console.log('Login credentials:');
    console.log('  Email: admin@savannahpropagation.co.ke');
    console.log('  Password: Admin@123456');
    console.log('\n👉 Now start the server: npm run dev\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixPermissions();
