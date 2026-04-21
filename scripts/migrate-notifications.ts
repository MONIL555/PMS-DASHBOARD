/**
 * scripts/migrate-notifications.ts
 * 
 * Migration script to update NotificationConfig recipients from string arrays
 * to object arrays containing { name, value }.
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

// Define the schema here to avoid importing the model which might have TS issues during migration
const NotificationConfigSchema = new mongoose.Schema({
  Internal_WA_Recipients: { type: mongoose.Schema.Types.Mixed, default: [] },
  Internal_Email_Recipients: { type: mongoose.Schema.Types.Mixed, default: [] }
}, { strict: false });

const NotificationConfig = mongoose.models.NotificationConfig || mongoose.model('NotificationConfig', NotificationConfigSchema);

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log('Connected to MongoDB');

    const configs = await NotificationConfig.find({});
    console.log(`Found ${configs.length} configurations to check.`);

    for (const config of configs) {
      let updated = false;

      // Migrate WA Recipients
      if (Array.isArray(config.Internal_WA_Recipients)) {
        const isOldFormat = config.Internal_WA_Recipients.some((r: any) => typeof r === 'string');
        if (isOldFormat) {
          console.log(`Migrating WA recipients for: ${config.Event_Name || config._id}`);
          config.Internal_WA_Recipients = config.Internal_WA_Recipients.map((r: any) => {
            if (typeof r === 'string') {
              return { name: 'System User', value: r };
            }
            return r;
          });
          updated = true;
        }
      }

      // Migrate Email Recipients
      if (Array.isArray(config.Internal_Email_Recipients)) {
        const isOldFormat = config.Internal_Email_Recipients.some((r: any) => typeof r === 'string');
        if (isOldFormat) {
          console.log(`Migrating Email recipients for: ${config.Event_Name || config._id}`);
          config.Internal_Email_Recipients = config.Internal_Email_Recipients.map((r: any) => {
            if (typeof r === 'string') {
              return { name: 'System User', value: r };
            }
            return r;
          });
          updated = true;
        }
      }

      if (updated) {
        // Use markModified because we are changing the structure of Mixed fields
        config.markModified('Internal_WA_Recipients');
        config.markModified('Internal_Email_Recipients');
        await config.save();
        console.log(`Updated config: ${config.Event_Name || config._id}`);
      }
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
