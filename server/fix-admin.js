require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { User, Role } = require('./src/models');

async function fixAdmin() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Find admin role
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    
    if (!adminRole) {
      console.log('❌ Admin role not found. Creating it...');
      const newRole = await Role.create({
        name: 'admin',
        display_name: 'Administrator',
        description: 'Full system access',
        is_system: true,
        permissions: {
          dashboard: ['view'],
          users: ['view', 'create', 'edit', 'delete']
        }
      });
      console.log('✅ Admin role created');
    }

    const role = adminRole || await Role.findOne({ where: { name: 'admin' } });

    // Delete existing admin user if exists
    await User.destroy({ 
      where: { email: 'admin@savannahpropagation.co.ke' },
      force: true 
    });
    console.log('🗑️  Cleared existing admin user');

    // Create admin user with PLAIN password (model will hash it)
    await User.create({
      email: 'admin@savannahpropagation.co.ke',
      password: 'Admin@123456',  // Plain password - model will hash it
      first_name: 'System',
      last_name: 'Administrator',
      role_id: role.id,
      is_active: true
    });
    
    console.log('✅ Admin user created!');
    console.log('\n========================================');
    console.log('Login with:');
    console.log('  Email: admin@savannahpropagation.co.ke');
    console.log('  Password: Admin@123456');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAdmin();