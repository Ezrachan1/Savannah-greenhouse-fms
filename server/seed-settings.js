/**
 * Seed Company & System Settings
 * Run: node seed-settings.js
 * 
 * Adds company and system settings to the database without resetting
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { Setting } = require('./src/models');

const SETTINGS = [
  // Company settings
  { key: 'company.name', value: 'Savannah Propagation Nursery', category: 'company', data_type: 'string', description: 'Company name' },
  { key: 'company.address', value: 'Mogotio Town, Nakuru County', category: 'company', data_type: 'string', description: 'Company address' },
  { key: 'company.phone', value: '+254700000000', category: 'company', data_type: 'string', description: 'Company phone' },
  { key: 'company.email', value: 'info@savannahpropagation.co.ke', category: 'company', data_type: 'string', description: 'Company email' },
  { key: 'company.website', value: '', category: 'company', data_type: 'string', description: 'Company website' },
  { key: 'company.kra_pin', value: 'P000000000X', category: 'company', data_type: 'string', description: 'KRA PIN' },
  { key: 'company.registration_number', value: '', category: 'company', data_type: 'string', description: 'Registration number' },
  { key: 'company.logo_url', value: '', category: 'company', data_type: 'string', description: 'Logo URL' },
  
  // System settings
  { key: 'system.currency', value: 'KES', category: 'system', data_type: 'string', description: 'System currency' },
  { key: 'system.currency_symbol', value: 'KES', category: 'system', data_type: 'string', description: 'Currency symbol' },
  { key: 'system.date_format', value: 'DD/MM/YYYY', category: 'system', data_type: 'string', description: 'Date format' },
  { key: 'system.fiscal_year_start', value: '01', category: 'system', data_type: 'string', description: 'Fiscal year start month' },
  { key: 'system.low_stock_threshold', value: '10', category: 'system', data_type: 'number', description: 'Low stock threshold' },
  
  // Tax settings
  { key: 'tax.vat_rate', value: '16', category: 'tax', data_type: 'number', description: 'Default VAT rate' },
  
  // Payroll settings
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

async function seedSettings() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');
    
    console.log('🔧 Seeding settings...\n');
    
    let created = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const setting of SETTINGS) {
      const [record, wasCreated] = await Setting.findOrCreate({
        where: { key: setting.key },
        defaults: setting
      });
      
      if (wasCreated) {
        console.log(`  ✅ Created: ${setting.key}`);
        created++;
      } else {
        // Skip updating if already exists (preserve user changes)
        console.log(`  ⏭️  Exists: ${setting.key}`);
        skipped++;
      }
    }
    
    console.log('\n========================================');
    console.log(`✅ Settings seeded!`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped (already exist): ${skipped}`);
    console.log('========================================\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

seedSettings();
