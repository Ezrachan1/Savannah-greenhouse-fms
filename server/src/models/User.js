/**
 * ============================================
 * User Model
 * ============================================
 * Represents system users with authentication
 */

const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [8, 255]
    }
  },
  
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  
  role_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'roles',
      key: 'id'
    }
  },
  
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  password_changed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  refresh_token: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  avatar_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  tableName: 'users',
  
  // Hooks for password hashing
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
        user.password_changed_at = new Date();
      }
    }
  },
  
  // Indexes for performance
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['role_id'] },
    { fields: ['is_active'] }
  ]
});

// Instance method to check password
User.prototype.validatePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get full name
User.prototype.getFullName = function() {
  return `${this.first_name} ${this.last_name}`;
};

// Convert to JSON without sensitive data
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  delete values.refresh_token;
  return values;
};

module.exports = User;
