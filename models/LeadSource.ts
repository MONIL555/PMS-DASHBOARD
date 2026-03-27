import mongoose, { Document, Model, Schema } from 'mongoose';
import Counter from './Counter';

export interface ILeadSource extends Document {
  Source_ID: string;
  Source_Name: string;
  Description?: string;
  IsActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILeadSourceModel extends Model<ILeadSource> {}

const LeadSourceSchema = new Schema<ILeadSource, ILeadSourceModel>({
  Source_ID: {
    type: String,
    unique: true
  },
  Source_Name: {
    type: String,
    required: [true, "Source Name is required"],
    trim: true,
    unique: true // Source names should be unique
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

// Auto-Increment Source_ID (SRC-0001)
LeadSourceSchema.pre('save', async function() {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { id: 'source_id' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.Source_ID = `SRC-${counter.seq.toString().padStart(4, '0')}`;
  }
});

export default mongoose.models.LeadSource as ILeadSourceModel || mongoose.model<ILeadSource, ILeadSourceModel>('LeadSource', LeadSourceSchema);
