/**
 * ============================================
 * Database Configuration - PostgreSQL/Sequelize
 * ============================================
 * Handles database connection and configuration
 */

const { Sequelize } = require('sequelize');

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'farm_management_system',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  dialect: 'postgres',
  
  // Connection pool configuration
  pool: {
    max: 10,           // Maximum connections in pool
    min: 0,            // Minimum connections in pool
    acquire: 30000,    // Max time (ms) to acquire connection
    idle: 10000        // Max time (ms) connection can be idle
  },
  
  // Logging configuration
  logging: process.env.NODE_ENV === 'development' 
    ? (msg) => console.log(`📝 SQL: ${msg}`)
    : false,
  
  // Timezone configuration
  timezone: '+03:00', // East Africa Time (Kenya)
  
  // Define options for all models
  define: {
    timestamps: true,      // Add createdAt and updatedAt
    underscored: true,     // Use snake_case for fields
    freezeTableName: true, // Don't pluralize table names
    paranoid: true         // Soft deletes (adds deletedAt)
  },
  
  // Dialect-specific options
  dialectOptions: {
    // SSL configuration for production
    ...(process.env.NODE_ENV === 'production' && {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }),
    // Timezone for PostgreSQL
    timezone: 'Africa/Nairobi'
  }
};

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    console.log(`   📍 Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   📦 Database: ${dbConfig.database}`);
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to database:', error.message);
    throw error;
  }
};

/**
 * Close database connection
 * @returns {Promise<void>}
 */
const closeConnection = async () => {
  try {
    await sequelize.close();
    console.log('📤 Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  closeConnection,
  Sequelize
};
