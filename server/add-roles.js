/**
 * Add Missing Roles Script
 * Run: node add-roles.js
 * 
 * This script adds missing roles WITHOUT resetting the database.
 * Safe to run on existing data.
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { Role } = require('./src/models');

// Role definitions
const ROLES = [
  {
    name: 'manager',
    display_name: 'Manager',
    description: 'Management access - most permissions except user management',
    permissions: {
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
    }
  },
  {
    name: 'supervisor',
    display_name: 'Supervisor',
    description: 'Supervisory access - operational permissions',
    permissions: {
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
    }
  },
  {
    name: 'staff',
    display_name: 'Staff',
    description: 'Basic staff access - day-to-day operations',
    permissions: {
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
    }
  },
  {
    name: 'sales',
    display_name: 'Sales',
    description: 'Sales-focused access - customers and sales',
    permissions: {
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
    }
  },
  {
    name: 'viewer',
    display_name: 'Viewer',
    description: 'Read-only access - view only',
    permissions: {
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
    }
  }
];

async function addRoles() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    let added = 0;
    let skipped = 0;

    for (const roleData of ROLES) {
      // Check if role already exists
      const existing = await Role.findOne({ where: { name: roleData.name } });
      
      if (existing) {
        console.log(`⏭️  Role "${roleData.display_name}" already exists - skipping`);
        skipped++;
      } else {
        await Role.create({
          ...roleData,
          is_system: false,
          is_active: true
        });
        console.log(`✅ Role "${roleData.display_name}" created`);
        added++;
      }
    }

    console.log('\n========================================');
    console.log(`✅ Complete! Added: ${added}, Skipped: ${skipped}`);
    console.log('========================================\n');

    console.log('Available roles:');
    const allRoles = await Role.findAll({ order: [['name', 'ASC']] });
    allRoles.forEach(r => {
      console.log(`  - ${r.display_name} (${r.name}): ${r.description}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

addRoles();
