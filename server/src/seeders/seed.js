/**
 * ============================================
 * Database Seeder
 * ============================================
 * Run with: node src/seeders/seed.js
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const { 
  Role, User, Setting, InventoryCategory, 
  ExpenseCategory, Greenhouse, Crop 
} = require('../models');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');
    
    // Sync database (use force: true only for fresh setup)
    await sequelize.sync();
    console.log('✅ Database synced\n');
    
    // ==================== ROLES ====================
    console.log('📋 Creating roles...');
    
    const roles = [
      {
        name: 'admin',
        display_name: 'Administrator',
        description: 'Full system access',
        is_system: true,
        permissions: {
          dashboard: ['view'],
          greenhouses: ['view', 'create', 'edit', 'delete'],
          crops: ['view', 'create', 'edit', 'delete'],
          production: ['view', 'create', 'edit', 'delete'],
          inventory: ['view', 'create', 'edit', 'delete', 'adjust'],
          sales: ['view', 'create', 'edit', 'delete', 'void'],
          customers: ['view', 'create', 'edit', 'delete'],
          employees: ['view', 'create', 'edit', 'delete'],
          payroll: ['view', 'create', 'edit', 'process', 'approve'],
          expenses: ['view', 'create', 'edit', 'delete', 'approve'],
          reports: ['view', 'export'],
          settings: ['view', 'edit'],
          users: ['view', 'create', 'edit', 'delete']
        }
      },
      {
        name: 'manager',
        display_name: 'Manager',
        description: 'Management access',
        is_system: true,
        permissions: {
          dashboard: ['view'],
          greenhouses: ['view', 'create', 'edit'],
          crops: ['view', 'create', 'edit'],
          production: ['view', 'create', 'edit'],
          inventory: ['view', 'create', 'edit', 'adjust'],
          sales: ['view', 'create', 'edit', 'void'],
          customers: ['view', 'create', 'edit'],
          employees: ['view', 'create', 'edit'],
          payroll: ['view', 'create', 'edit', 'process'],
          expenses: ['view', 'create', 'edit', 'approve'],
          reports: ['view', 'export'],
          settings: ['view'],
          users: ['view']
        }
      },
      {
        name: 'staff',
        display_name: 'Staff',
        description: 'Regular staff access',
        is_system: true,
        permissions: {
          dashboard: ['view'],
          greenhouses: ['view'],
          crops: ['view'],
          production: ['view', 'create', 'edit'],
          inventory: ['view', 'create'],
          sales: ['view', 'create'],
          customers: ['view', 'create'],
          employees: ['view'],
          payroll: ['view'],
          expenses: ['view', 'create'],
          reports: ['view'],
          settings: [],
          users: []
        }
      },
      {
        name: 'accountant',
        display_name: 'Accountant',
        description: 'Financial access',
        is_system: false,
        permissions: {
          dashboard: ['view'],
          greenhouses: ['view'],
          crops: ['view'],
          production: ['view'],
          inventory: ['view'],
          sales: ['view', 'create', 'edit'],
          customers: ['view', 'create', 'edit'],
          employees: ['view'],
          payroll: ['view', 'create', 'edit', 'process', 'approve'],
          expenses: ['view', 'create', 'edit', 'approve'],
          reports: ['view', 'export'],
          settings: ['view'],
          users: []
        }
      }
    ];
    
    for (const roleData of roles) {
      await Role.findOrCreate({
        where: { name: roleData.name },
        defaults: roleData
      });
    }
    console.log('   ✓ Roles created\n');
    
    // ==================== ADMIN USER ====================
    console.log('👤 Creating admin user...');
    
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    
    await User.findOrCreate({
      where: { email: 'admin@savannahpropagation.co.ke' },
      defaults: {
        email: 'admin@savannahpropagation.co.ke',
        password: 'Admin@123456', // Change this!
        first_name: 'System',
        last_name: 'Administrator',
        role_id: adminRole.id,
        is_active: true
      }
    });
    console.log('   ✓ Admin user created (admin@savannahpropagation.co.ke / Admin@123456)\n');
    
    // ==================== SETTINGS ====================
    console.log('⚙️  Initializing settings...');
    
    const settingsData = [
      // Company
      { key: 'company.name', value: 'Savannah Propagation Nursery', category: 'company', data_type: 'string' },
      { key: 'company.address', value: 'Mogotio Town, Nakuru County', category: 'company', data_type: 'string' },
      { key: 'company.phone', value: '+254700000000', category: 'company', data_type: 'string' },
      { key: 'company.email', value: 'info@savannahpropagation.co.ke', category: 'company', data_type: 'string' },
      { key: 'company.kra_pin', value: 'P000000000X', category: 'company', data_type: 'string' },
      
      // Tax
      { key: 'tax.vat_rate', value: '16', category: 'tax', data_type: 'number' },
      
      // Payroll
      { key: 'payroll.nssf_tier1_limit', value: '7000', category: 'payroll', data_type: 'number' },
      { key: 'payroll.nssf_tier2_limit', value: '36000', category: 'payroll', data_type: 'number' },
      { key: 'payroll.nssf_rate', value: '6', category: 'payroll', data_type: 'number' },
      { key: 'payroll.personal_relief', value: '2400', category: 'payroll', data_type: 'number' },
      { key: 'payroll.housing_levy_rate', value: '1.5', category: 'payroll', data_type: 'number' },
      {
        key: 'payroll.nhif_brackets',
        category: 'payroll',
        data_type: 'json',
        json_value: [
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
          { min: 100000, max: null, amount: 1700 }
        ]
      },
      {
        key: 'payroll.paye_brackets',
        category: 'payroll',
        data_type: 'json',
        json_value: [
          { min: 0, max: 24000, rate: 10 },
          { min: 24001, max: 32333, rate: 25 },
          { min: 32334, max: 500000, rate: 30 },
          { min: 500001, max: 800000, rate: 32.5 },
          { min: 800001, max: null, rate: 35 }
        ]
      },
      
      // System
      { key: 'system.currency', value: 'KES', category: 'system', data_type: 'string' },
      { key: 'system.date_format', value: 'DD/MM/YYYY', category: 'system', data_type: 'string' },
      { key: 'system.timezone', value: 'Africa/Nairobi', category: 'system', data_type: 'string' }
    ];
    
    for (const setting of settingsData) {
      await Setting.findOrCreate({
        where: { key: setting.key },
        defaults: setting
      });
    }
    console.log('   ✓ Settings initialized\n');
    
    // ==================== INVENTORY CATEGORIES ====================
    console.log('📦 Creating inventory categories...');
    
    const inventoryCategories = [
      { name: 'Seeds', code: 'SEEDS', description: 'Crop seeds and planting material' },
      { name: 'Fertilizers', code: 'FERT', description: 'Fertilizers and nutrients' },
      { name: 'Pesticides', code: 'PEST', description: 'Pesticides and herbicides' },
      { name: 'Growth Media', code: 'MEDIA', description: 'Potting mix, cocopeat, etc.' },
      { name: 'Packaging', code: 'PACK', description: 'Trays, pots, bags, labels' },
      { name: 'Tools & Equipment', code: 'TOOLS', description: 'Hand tools and equipment' },
      { name: 'Irrigation', code: 'IRRIG', description: 'Irrigation supplies' },
      { name: 'Office Supplies', code: 'OFFICE', description: 'Stationery and office items' }
    ];
    
    for (const cat of inventoryCategories) {
      await InventoryCategory.findOrCreate({
        where: { code: cat.code },
        defaults: cat
      });
    }
    console.log('   ✓ Inventory categories created\n');
    
    // ==================== EXPENSE CATEGORIES ====================
    console.log('💰 Creating expense categories...');
    
    const expenseCategories = [
      { name: 'Seeds & Planting Material', code: 'EXP-SEEDS' },
      { name: 'Fertilizers & Chemicals', code: 'EXP-FERT' },
      { name: 'Labor & Wages', code: 'EXP-LABOR' },
      { name: 'Utilities', code: 'EXP-UTIL', description: 'Electricity, water, etc.' },
      { name: 'Transport', code: 'EXP-TRANS' },
      { name: 'Repairs & Maintenance', code: 'EXP-REPAIR' },
      { name: 'Equipment', code: 'EXP-EQUIP' },
      { name: 'Office & Admin', code: 'EXP-OFFICE' },
      { name: 'Marketing', code: 'EXP-MKTG' },
      { name: 'Professional Services', code: 'EXP-PROF', description: 'Legal, accounting, consulting' },
      { name: 'Insurance', code: 'EXP-INS' },
      { name: 'Licenses & Permits', code: 'EXP-LIC' },
      { name: 'Miscellaneous', code: 'EXP-MISC' }
    ];
    
    for (const cat of expenseCategories) {
      await ExpenseCategory.findOrCreate({
        where: { code: cat.code },
        defaults: cat
      });
    }
    console.log('   ✓ Expense categories created\n');
    
    // ==================== SAMPLE GREENHOUSES ====================
    console.log('🏠 Creating sample greenhouses...');
    
    const greenhouses = [
      { name: 'Greenhouse 1', code: 'GH-01', type: 'tunnel', capacity_trays: 500, status: 'active' },
      { name: 'Greenhouse 2', code: 'GH-02', type: 'tunnel', capacity_trays: 500, status: 'active' },
      { name: 'Greenhouse 3', code: 'GH-03', type: 'shade-net', capacity_trays: 300, status: 'active' },
      { name: 'Hardening Area', code: 'HA-01', type: 'shade-net', capacity_trays: 200, status: 'active' }
    ];
    
    for (const gh of greenhouses) {
      await Greenhouse.findOrCreate({
        where: { code: gh.code },
        defaults: gh
      });
    }
    console.log('   ✓ Sample greenhouses created\n');
    
    // ==================== SAMPLE CROPS ====================
    console.log('🌿 Creating sample crops...');
    
    const crops = [
      { name: 'Tomato', code: 'TOM', category: 'vegetables', variety: 'Safari', germination_days: 7, transplant_days: 28, default_price: 3, seeds_per_tray: 200 },
      { name: 'Capsicum', code: 'CAP', category: 'vegetables', variety: 'California Wonder', germination_days: 10, transplant_days: 35, default_price: 5, seeds_per_tray: 200 },
      { name: 'Cabbage', code: 'CAB', category: 'vegetables', variety: 'Gloria F1', germination_days: 5, transplant_days: 25, default_price: 2.5, seeds_per_tray: 200 },
      { name: 'Onion', code: 'ONI', category: 'vegetables', variety: 'Red Creole', germination_days: 10, transplant_days: 45, default_price: 2, seeds_per_tray: 300 },
      { name: 'Kale (Sukuma Wiki)', code: 'KAL', category: 'vegetables', variety: 'Thousand Headed', germination_days: 5, transplant_days: 21, default_price: 1.5, seeds_per_tray: 200 },
      { name: 'Watermelon', code: 'WTM', category: 'fruits', variety: 'Sugar Baby', germination_days: 7, transplant_days: 21, default_price: 10, seeds_per_tray: 100 },
      { name: 'Grevillea', code: 'GRV', category: 'forestry', germination_days: 21, transplant_days: 90, default_price: 15, seeds_per_tray: 100 },
      { name: 'Eucalyptus', code: 'EUC', category: 'forestry', germination_days: 14, transplant_days: 60, default_price: 10, seeds_per_tray: 150 }
    ];
    
    for (const crop of crops) {
      await Crop.findOrCreate({
        where: { code: crop.code },
        defaults: crop
      });
    }
    console.log('   ✓ Sample crops created\n');
    
    console.log('═══════════════════════════════════════════════');
    console.log('✅ Database seeding completed successfully!');
    console.log('═══════════════════════════════════════════════\n');
    console.log('Default admin credentials:');
    console.log('   Email: admin@savannahpropagation.co.ke');
    console.log('   Password: Admin@123456');
    console.log('\n⚠️  Please change the admin password after first login!\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
