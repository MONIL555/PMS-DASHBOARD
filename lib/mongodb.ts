import mongoose from "mongoose";
import "@/models/Client";
import "@/models/Lead";
import "@/models/Quotation";
import "@/models/Project";
import "@/models/Ticket";
import "@/models/Product";
import "@/models/LeadSource";
import "@/models/Counter";
import "@/models/Role";
import "@/models/User";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pms";

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
