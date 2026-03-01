/**
 * Seed Payroll Settings
 * Run: node seed-payroll-settings.js
 * 
 * Adds Kenyan NHIF, PAYE, and NSSF rates to the database
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { Setting } = require('./src/models');

const PAYROLL_SETTINGS = [
  // NSSF Settings
  {
    key: 'payroll.nssf_tier1_limit',
    value: '7000',
    category: 'payroll',
    description: 'NSSF Tier I upper limit (KES)',
    data_type: 'number'
  },
  {
    key: 'payroll.nssf_tier2_limit',
    value: '36000',
    category: 'payroll',
    description: 'NSSF Tier II upper limit (KES)',
    data_type: 'number'
  },
  {
    key: 'payroll.nssf_rate',
    value: '6',
    category: 'payroll',
    description: 'NSSF contribution rate (%)',
    data_type: 'number'
  },
  
  // NHIF Brackets (Kenya 2024)
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
    description: 'NHIF contribution brackets by gross salary',
    data_type: 'string'
  },
  
  // PAYE Brackets (Kenya 2024)
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
    description: 'PAYE tax brackets (monthly)',
    data_type: 'string'
  },
  
  // Personal Relief
  {
    key: 'payroll.personal_relief',
    value: '2400',
    category: 'payroll',
    description: 'Monthly personal tax relief (KES)',
    data_type: 'number'
  },
  
  // Housing Levy
  {
    key: 'payroll.housing_levy_rate',
    value: '1.5',
    category: 'payroll',
    description: 'Affordable Housing Levy rate (%)',
    data_type: 'number'
  },
  
  // Insurance Relief
  {
    key: 'payroll.insurance_relief_limit',
    value: '5000',
    category: 'payroll',
    description: 'Maximum monthly insurance relief (KES)',
    data_type: 'number'
  }
];

async function seedPayrollSettings() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');
    
    console.log('📊 Seeding payroll settings...\n');
    
    let created = 0;
    let updated = 0;
    
    for (const setting of PAYROLL_SETTINGS) {
      const [record, wasCreated] = await Setting.findOrCreate({
        where: { key: setting.key },
        defaults: setting
      });
      
      if (wasCreated) {
        console.log(`  ✅ Created: ${setting.key}`);
        created++;
      } else {
        // Update existing
        await record.update(setting);
        console.log(`  🔄 Updated: ${setting.key}`);
        updated++;
      }
    }
    
    console.log('\n========================================');
    console.log(`✅ Payroll settings seeded!`);
    console.log(`   Created: ${created}, Updated: ${updated}`);
    console.log('========================================\n');
    
    // Display current rates
    console.log('📋 Current Payroll Rates:\n');
    
    const nhifBrackets = JSON.parse(
      await Setting.getValue('payroll.nhif_brackets', '[]')
    );
    console.log('NHIF Brackets:');
    nhifBrackets.forEach(b => {
      console.log(`  KES ${b.min.toLocaleString()} - ${b.max.toLocaleString()}: KES ${b.amount}`);
    });
    
    const payeBrackets = JSON.parse(
      await Setting.getValue('payroll.paye_brackets', '[]')
    );
    console.log('\nPAYE Brackets:');
    payeBrackets.forEach(b => {
      console.log(`  KES ${b.min.toLocaleString()} - ${b.max.toLocaleString()}: ${b.rate}%`);
    });
    
    const nssfRate = await Setting.getValue('payroll.nssf_rate', '6');
    const personalRelief = await Setting.getValue('payroll.personal_relief', '2400');
    const housingLevy = await Setting.getValue('payroll.housing_levy_rate', '1.5');
    
    console.log(`\nNSSF Rate: ${nssfRate}%`);
    console.log(`Personal Relief: KES ${personalRelief}/month`);
    console.log(`Housing Levy: ${housingLevy}%`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

seedPayrollSettings();
