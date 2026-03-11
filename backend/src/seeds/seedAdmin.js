const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const User = require('../models/User');
const Setting = require('../models/Setting');

const seedAdmin = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('MONGODB_URI is not defined. Please set it in your .env file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const existingAdmin = await User.findOne({ email: 'admin@comedkofficial.in' });

    if (existingAdmin) {
      console.log('Admin user already exists:');
      console.log(`  Name: ${existingAdmin.name}`);
      console.log(`  Email: ${existingAdmin.email}`);
      console.log(`  Role: ${existingAdmin.role}`);
    } else {
      const admin = new User({
        name: 'Admin',
        email: 'admin@comedkofficial.in',
        password: 'admin123',
        role: 'admin',
      });

      await admin.save();

      console.log('Admin user created successfully:');
      console.log(`  Name: ${admin.name}`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Role: ${admin.role}`);
      console.log('  Password: admin123');
    }
    // Seed default settings
    const existing = await Setting.findOne({ key: 'predictor_lead_gate' });
    if (!existing) {
      await Setting.set('predictor_lead_gate', true);
      console.log('Setting "predictor_lead_gate" set to true');
    } else {
      console.log(`Setting "predictor_lead_gate" already exists: ${existing.value}`);
    }

  } catch (err) {
    console.error('Seeding failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

seedAdmin();
