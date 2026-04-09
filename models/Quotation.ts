import mongoose, { Document, Model, Schema } from 'mongoose';
import Counter from './Counter';

export interface IQuotation extends Document {
  Quotation_ID: string;
  Lead_ID: mongoose.Types.ObjectId;
  Client_Reference: mongoose.Types.ObjectId;
  Product_Reference: mongoose.Types.ObjectId;
  Quotation_Date: Date;
  Client_Info: string;
  Requirement: string;
  Project_Scope_Description: string;
  Commercial: number;
  Timeline: string;
  Payment_Terms: string;
  Other_Terms: string;
  Letterhead: 'Yes' | 'No';
  Sent_Via: 'WhatsApp' | 'Email';
  Quotation_Status: 'Sent' | 'Follow-up' | 'Approved' | 'Rejected' | 'Converted';
  Followup_Notification: boolean;
  Follow_Ups: Array<{
    Followup_Date: Date;
    Remarks: string;
    Outcome: 'Converted' | 'Cancelled' | 'Pending';
  }>;
  Cancel_Reason: string;
  Followup_Alert: {
    Last_WA_Sent_Date?: Date;
    Last_Email_Sent_Date?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuotationModel extends Model<IQuotation> {
  getDropdownOptions(): any;
}

const QuotationSchema = new Schema<IQuotation, IQuotationModel>({
  Quotation_ID: {
    type: String,
    unique: true
  },
  Lead_ID: {
    type: Schema.Types.ObjectId,
    ref: 'Lead'
  },
  Client_Reference: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  Product_Reference: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  Quotation_Date: { type: Date, default: Date.now },
  Client_Info: {
    type: String,
    trim: true
  },
  Requirement: {
    type: String
  },
  Project_Scope_Description: {
    type: String
  },
  Commercial: {
    type: Number,
    required: true
  },
  Timeline: {
    type: String
  },
  Payment_Terms: {
    type: String
  },
  Other_Terms: {
    type: String
  },
  Letterhead: {
    type: String,
    enum: ['Yes', 'No'],
    default: 'No'
  },
  Sent_Via: {
    type: String,
    enum: ['WhatsApp', 'Email'],
    default: 'Email'
  },
  Quotation_Status: {
    type: String,
    enum: ['Sent', 'Follow-up', 'Approved', 'Rejected', 'Converted'],
    default: 'Sent'
  },
  Followup_Notification: {
    type: Boolean,
    default: true
  },

  // PAIRED FOLLOW-UPS: Every quotation tracks its own negotiation history
  Follow_Ups: [{
    Followup_Date: { type: Date, default: Date.now },
    Remarks: { type: String, trim: true },
    Outcome: {
      type: String,
      enum: ['Converted', 'Cancelled', 'Pending'],
      default: 'Pending'
    }
  }],
  Cancel_Reason: {
    type: String
  },

  // Follow-up Alert Tracking
  Followup_Alert: {
    Last_WA_Sent_Date: { type: Date },
    Last_Email_Sent_Date: { type: Date }
  }
}, {
  timestamps: true
});

// --- LOGIC: Auto-Increment Quotation_ID (QTN-0001) ---
QuotationSchema.pre('save', async function () {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { id: 'quotation_id' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.Quotation_ID = `QTN-${counter.seq.toString().padStart(4, '0')}`;
  }
});

// --- LOGIC: Static Method for Frontend Dropdowns ---
QuotationSchema.statics.getDropdownOptions = function () {
  return {
    status: (this.schema.path('Quotation_Status') as any).enumValues,
    letterhead: (this.schema.path('Letterhead') as any).enumValues,
    sentVia: (this.schema.path('Sent_Via') as any).enumValues,
    followupOutcome: (this.schema.path('Follow_Ups.Outcome') as any).enumValues
  };
};

export default mongoose.models.Quotation as IQuotationModel || mongoose.model<IQuotation, IQuotationModel>('Quotation', QuotationSchema);
