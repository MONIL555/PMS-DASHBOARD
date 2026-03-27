import mongoose, { Document, Model, Schema } from 'mongoose';
import Counter from './Counter';

export interface IClient extends Document {
  Client_ID: string;
  Company_Name: string;
  Company_No?: string;
  Client_Name?: string;
  Contact_Number?: string;
  Email?: string;
  Location?: string;
  Description?: string;
  IsActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClientModel extends Model<IClient> {}

const ClientSchema = new Schema<IClient, IClientModel>({
  Client_ID: {
    type: String,
    unique: true
  },
  Company_Name: {
    type: String,
    required: [true, "Company Name is required"],
    trim: true,
    unique: true // Assuming company names should be unique for masters
  },
  Company_No: {
    type: String, // GST / PAN Number
    trim: true
  },
  Client_Name: {
    type: String,
    trim: true
  },
  Contact_Number: {
    type: String,
    trim: true
  },
  Email: {
    type: String,
    trim: true,
    lowercase: true
  },
  Location: {
    type: String,
    trim: true
  },
  Description: {
    type: String,
    trim: true
  },
  IsActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Auto-Increment Client_ID (CLI-0001)
ClientSchema.pre('save', async function() {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { id: 'client_id' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.Client_ID = `CLI-${counter.seq.toString().padStart(4, '0')}`;
  }
});

export default mongoose.models.Client as IClientModel || mongoose.model<IClient, IClientModel>('Client', ClientSchema);
