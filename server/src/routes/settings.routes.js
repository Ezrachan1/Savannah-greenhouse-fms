/**
 * ============================================
 * Settings Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../middleware/auth');
const { Setting, Role } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// Get all settings (grouped by category)
router.get('/', authenticate, hasPermission('settings', 'view'), asyncHandler(async (req, res) => {
  const settings = await Setting.findAll({
    order: [['category', 'ASC'], ['key', 'ASC']]
  });
  
  // Group by category
  const grouped = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {});
  
  // Also return flat key-value for easy access
  const flat = {};
  settings.forEach(s => {
    flat[s.key] = s.data_type === 'json' ? s.json_value : s.value;
  });
  
  res.json({ success: true, data: flat, grouped });
}));

// Update multiple settings (PUT /settings)
router.put('/', authenticate, hasPermission('settings', 'edit'), asyncHandler(async (req, res) => {
  const settingsData = req.body;
  
  for (const [key, value] of Object.entries(settingsData)) {
    // Find or create setting
    let setting = await Setting.findOne({ where: { key } });
    
    if (setting) {
      // Update existing
      if (setting.is_editable !== false) {
        await setting.update({
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          updated_by: req.userId
        });
      }
    } else {
      // Create new setting
      const category = key.split('_')[0] || 'general';
      await Setting.create({
        key,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
        category,
        data_type: typeof value === 'object' ? 'json' : 'string',
        is_editable: true,
        updated_by: req.userId
      });
    }
  }
  
  res.json({
    success: true,
    message: 'Settings updated successfully'
  });
}));

// Get setting by key
router.get('/:key', authenticate, asyncHandler(async (req, res) => {
  const setting = await Setting.findOne({ where: { key: req.params.key } });
  
  if (!setting) {
    throw ApiError.notFound('Setting not found');
  }
  
  res.json({ success: true, data: setting });
}));

// Update setting
router.put('/:key', authenticate, hasPermission('settings', 'edit'), asyncHandler(async (req, res) => {
  const { value, json_value } = req.body;
  
  const setting = await Setting.findOne({ where: { key: req.params.key } });
  
  if (!setting) {
    throw ApiError.notFound('Setting not found');
  }
  
  if (!setting.is_editable) {
    throw ApiError.badRequest('This setting cannot be modified');
  }
  
  await setting.update({
    value: setting.data_type === 'json' ? null : value,
    json_value: setting.data_type === 'json' ? json_value : null,
    updated_by: req.userId
  });
  
  res.json({
    success: true,
    message: 'Setting updated',
    data: setting
  });
}));

// Bulk update settings
router.post('/bulk', authenticate, hasPermission('settings', 'edit'), asyncHandler(async (req, res) => {
  const { settings } = req.body;
  
  for (const { key, value, json_value } of settings) {
    await Setting.update(
      { 
        value: value || null,
        json_value: json_value || null,
        updated_by: req.userId
      },
      { where: { key, is_editable: true } }
    );
  }
  
  res.json({
    success: true,
    message: 'Settings updated'
  });
}));

// Initialize default settings
router.post('/initialize', authenticate, hasPermission('settings', 'edit'), asyncHandler(async (req, res) => {
  const defaults = Setting.defaults;
  
  for (const [key, value] of Object.entries(defaults)) {
    const existing = await Setting.findOne({ where: { key } });
    if (!existing) {
      const category = key.split('.')[0];
      await Setting.create({
        key,
        value: typeof value === 'object' ? null : value,
        json_value: typeof value === 'object' ? value : null,
        category,
        data_type: typeof value === 'object' ? 'json' : 'string',
        is_editable: true
      });
    }
  }
  
  res.json({
    success: true,
    message: 'Default settings initialized'
  });
}));

// Get roles
router.get('/system/roles', authenticate, asyncHandler(async (req, res) => {
  const roles = await Role.findAll({
    where: { is_active: true },
    order: [['name', 'ASC']]
  });
  
  res.json({ success: true, data: roles });
}));

// Create role
router.post('/system/roles', authenticate, hasPermission('settings', 'edit'), asyncHandler(async (req, res) => {
  const { name, display_name, description, permissions } = req.body;
  
  const role = await Role.create({
    name,
    display_name,
    description,
    permissions
  });
  
  res.status(201).json({
    success: true,
    message: 'Role created',
    data: role
  });
}));

// Update role
router.put('/system/roles/:id', authenticate, hasPermission('settings', 'edit'), asyncHandler(async (req, res) => {
  const role = await Role.findByPk(req.params.id);
  
  if (!role) {
    throw ApiError.notFound('Role not found');
  }
  
  if (role.is_system) {
    throw ApiError.badRequest('System roles cannot be modified');
  }
  
  await role.update(req.body);
  
  res.json({
    success: true,
    message: 'Role updated',
    data: role
  });
}));

module.exports = router;
