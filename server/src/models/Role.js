/**
 * ============================================
 * Role Model
 * ============================================
 * Defines user roles and permissions
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  
  display_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // JSON object storing granular permissions
  permissions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    comment: 'JSON object with module-level permissions'
  },
  
  is_system: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'System roles cannot be deleted'
  },
  
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'roles',
  indexes: [
    { fields: ['name'], unique: true },
    { fields: ['is_active'] }
  ]
});

// Check if role has specific permission
Role.prototype.hasPermission = function(module, action) {
  if (!this.permissions || !this.permissions[module]) {
    return false;
  }
  return this.permissions[module].includes(action);
};

// Default role permissions structure
Role.defaultPermissions = {
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
};

module.exports = Role;
