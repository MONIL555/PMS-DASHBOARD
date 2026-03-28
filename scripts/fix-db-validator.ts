import mongoose from 'mongoose';
import connectDB from '../lib/mongodb';

async function cleanup() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    
    // Drop the validator on the products collection
    const db = mongoose.connection.db;
    if (!db) {
      console.error('Database connection not established.');
      return;
    }
    
    const collections = await db.listCollections({ name: 'products' }).toArray();
    
    if (collections.length > 0) {
      console.log('Removing validator from "products" collection...');
      await db.command({
        collMod: 'products',
        validator: {},
        validationLevel: 'off'
      });
      console.log('Validator removed successfully.');
    } else {
      console.log('Collection "products" not found.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanup();
