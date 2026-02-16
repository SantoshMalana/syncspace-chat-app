const mongoose = require('mongoose');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import Channel model
const Channel = require('./models/Channel');

async function migrateChannels() {
  try {
    // Check if MONGODB_URI or MONGO_URI exists
    if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
      console.error('❌ Error: MONGODB_URI or MONGO_URI not found in .env file');
      console.log('📝 Please check your .env file contains one of these variables');
      process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    console.log('🔗 Connecting to database...');
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database successfully!');

    const channels = await Channel.find({});
    console.log(`\n📦 Found ${channels.length} channels\n`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const channel of channels) {
      if (!channel.admins || channel.admins.length === 0) {
        channel.admins = [channel.createdBy];
        await channel.save();
        console.log(`✅ Migrated: ${channel.name} - Added creator as admin`);
        migratedCount++;
      } else {
        console.log(`⏭️  Skipped: ${channel.name} - Already has admins`);
        skippedCount++;
      }
    }

    console.log(`\n🎉 Migration complete!`);
    console.log(`   Migrated: ${migratedCount} channels`);
    console.log(`   Skipped: ${skippedCount} channels`);
    
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('1. Check your .env file exists in backend folder');
    console.log('2. Verify MONGODB_URI or MONGO_URI is set correctly');
    console.log('3. Make sure MongoDB is running');
    process.exit(1);
  }
}

migrateChannels();