import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables before other imports
dotenv.config({ path: path.join(__dirname, '../.env.local') });

import connectDB from '../lib/mongodb';
import NotificationConfig from '../models/NotificationConfig';

const seedNotifications = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB for seeding notifications...');

        const standardTriggers = [
            {
                Event_Name: 'Quotation Follow-up',
                IsEnabled: true,
                Channels: ['Email', 'WhatsApp'],
            },
            {
                Event_Name: 'Billing Reminder',
                IsEnabled: true,
                Channels: ['Email'],
            },
            {
                Event_Name: 'Project Deadline Alert',
                IsEnabled: true,
                Channels: ['Email', 'WhatsApp'],
            }
        ];

        for (const trigger of standardTriggers) {
            const existing = await NotificationConfig.findOne({ Event_Name: trigger.Event_Name });
            if (!existing) {
                await NotificationConfig.create(trigger);
                console.log(`Created trigger: ${trigger.Event_Name}`);
            } else {
                console.log(`Trigger already exists: ${trigger.Event_Name}`);
            }
        }

        console.log('Notification seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedNotifications();
