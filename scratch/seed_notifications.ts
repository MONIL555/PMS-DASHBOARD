import mongoose from 'mongoose';
import connectDB from '../lib/mongodb';
import NotificationConfig from '../models/NotificationConfig';

async function seed() {
  try {
    await connectDB();
    console.log('Connected to DB');

    const leadFollowup = await NotificationConfig.findOne({ Event_Name: 'Lead Follow-up' });
    if (!leadFollowup) {
      const newConfig = new NotificationConfig({
        Event_Name: 'Lead Follow-up',
        IsEnabled: true,
        Channels: ['Email', 'WhatsApp']
      });
      await newConfig.save();
      console.log('Seeded Lead Follow-up trigger');
    } else {
      console.log('Lead Follow-up trigger already exists');
    }

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
