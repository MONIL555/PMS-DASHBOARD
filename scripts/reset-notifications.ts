import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import connectDB from '../lib/mongodb';
import Lead from '../models/Lead';
import Quotation from '../models/Quotation';

// Load env vars
dotenv.config({ path: '.env.local' });

async function reset() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    const now = new Date();

    console.log('--- Resetting Notification Timers (Backlog Protection) ---');

    // 1. LEADS
    const leadResult = await Lead.updateMany(
      { Lead_Status: { $nin: ['Converted', 'Cancelled'] } },
      { 
        $set: { 
          'Followup_Alert.Last_WA_Sent_Date': now,
          'Followup_Alert.Last_Email_Sent_Date': now 
        } 
      }
    );
    console.log(`✅ Leads updated: ${leadResult.modifiedCount}`);

    // 2. QUOTATIONS
    const qtnResult = await Quotation.updateMany(
      { Quotation_Status: { $nin: ['Approved', 'Rejected', 'Converted'] } },
      { 
        $set: { 
          'Followup_Alert.Last_WA_Sent_Date': now,
          'Followup_Alert.Last_Email_Sent_Date': now 
        } 
      }
    );
    console.log(`✅ Quotations updated: ${qtnResult.modifiedCount}`);

    console.log('--- All current items marked as "Notified Today" ---');
    console.log('The system will now ignore these existing overdue items for 24 hours.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

reset();
