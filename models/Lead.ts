import mongoose, { Document, Model, Schema } from 'mongoose';
import Counter from './Counter';

export interface ILead extends Document {
  Lead_ID: string;
  Source_Reference: mongoose.Types.ObjectId;
  Product_Reference: mongoose.Types.ObjectId;
  Client_Reference: mongoose.Types.ObjectId;
  Inquiry_Date: Date;
  Notes: string;
  Lead_Status: 'New' | 'In Progress' | 'Converted' | 'Cancelled';
  Lead_Status_Date_Time: Date;
  Cancel_Reason: string;
  Assigned_User?: mongoose.Types.ObjectId;
  Followup_Notification: boolean;
  Sent_Via: 'WhatsApp' | 'Email';
  Followup_Alert: {
    Last_WA_Sent_Date?: Date;
    Last_Email_Sent_Date?: Date;
  };
  Follow_Ups: Array<{
    Followup_Date: Date;
    Next_Followup_Date?: Date;
    Remarks: string;
    Outcome: 'Converted' | 'Cancelled' | 'Pending';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILeadModel extends Model<ILead> {
  getLeadStatuses(): string[];
}

const LeadSchema = new Schema<ILead, ILeadModel>({
  Lead_ID: {
    type: String,
    unique: true
  },
  Source_Reference: {
    type: Schema.Types.ObjectId,
    ref: 'LeadSource',
    required: true
  },
  Product_Reference: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  Client_Reference: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  Inquiry_Date: {
    type: Date,
    default: Date.now
  },
  Notes: {
    type: String
  },
  Lead_Status: {
    type: String,
    enum: ['New', 'In Progress', 'Converted', 'Cancelled'],
    default: 'New'
  },
  Lead_Status_Date_Time: {
    type: Date,
    default: Date.now
  },
  Cancel_Reason: {
    type: String
  },
  Assigned_User: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  Follow_Ups: [{
    Followup_Date: { type: Date, default: Date.now },
    Next_Followup_Date: { type: Date },
    Remarks: { type: String, trim: true },
    Outcome: {
      type: String,
      enum: ['Converted', 'Cancelled', 'Pending'],
      default: 'Pending'
    }
  }],
  Followup_Notification: {
    type: Boolean,
    default: true
  },
  Sent_Via: {
    type: String,
    enum: ['WhatsApp', 'Email'],
    default: 'Email'
  },
  Followup_Alert: {
    Last_WA_Sent_Date: { type: Date },
    Last_Email_Sent_Date: { type: Date }
  }
}, {
  timestamps: true // Automatically creates createdAt and updatedAt
});

// --- LOGIC: Auto-Increment Lead_ID (LEA-0001) ---
LeadSchema.pre('save', async function (this: ILead) {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { id: 'lead_id' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.Lead_ID = `LEA-${counter.seq.toString().padStart(4, '0')}`;
  }
});

// --- LOGIC: Static Method for Frontend Dropdowns ---
LeadSchema.statics.getLeadStatuses = function () {
  return (this.schema.path('Lead_Status') as any).enumValues;
};

export default mongoose.models.Lead as ILeadModel || mongoose.model<ILead, ILeadModel>('Lead', LeadSchema);
