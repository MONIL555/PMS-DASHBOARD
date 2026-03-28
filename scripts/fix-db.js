const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const uri = process.env.MONGODB_URI;

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db(); // Uses DB from URI
    
    console.log("Removing all indexes from 'products' collection...");
    try {
      await db.collection('products').dropIndexes();
      console.log("SUCCESS: All indexes dropped.");
    } catch (e) {
      console.log("INFO: No indexes to drop or collection empty.");
    }
    
    console.log("Removing JSON Schema validator if possible...");
    try {
      await db.command({
        collMod: 'products',
        validator: {},
        validationLevel: 'off'
      });
      console.log("SUCCESS: Validator removed.");
    } catch (e) {
      console.log("INFO: Validator modification failed or not supported.");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

run();
