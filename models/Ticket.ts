import mongoose, { Document, Model, Schema } from 'mongoose';
import Counter from './Counter';

export interface ITicket extends Document {
  Ticket_Number: string;
  Project_ID: mongoose.Types.ObjectId;
  Title: string;
  Description: string;
  Raised_By: string;
  Assigned_To: string;
  Client_Reference: mongoose.Types.ObjectId;
  Priority: 'Low' | 'Medium' | 'High';
  Raised_Date_Time: Date;
  Status: 'Open' | 'In_Progress' | 'Closed';
  Action_Taken_DT: Date;
  Cancel_Reason: string;
  _originalStatus?: string; // Virtual/custom property for status tracking
  createdAt: Date;
  updatedAt: Date;
}

export interface ITicketModel extends Model<ITicket> {
  getTicketOptions(): any;
}

const TicketSchema = new Schema<ITicket, ITicketModel>({
  Ticket_Number: { type: String, unique: true },
  Project_ID: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  Title: { type: String, required: true, trim: true },
  Description: { type: String },
  Raised_By: String,
  Assigned_To: String,
  Client_Reference: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  Priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  Raised_Date_Time: { type: Date, default: Date.now },
  Status: { type: String, enum: ['Open', 'In_Progress', 'Closed'], default: 'Open' },
  Action_Taken_DT: Date,
  Cancel_Reason: { type: String }
}, { timestamps: true });

// Auto-ID Logic & Status Tracking
TicketSchema.pre('save', async function () {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate({ id: 'ticket_id' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    this.Ticket_Number = `TKT-${counter.seq.toString().padStart(4, '0')}`;
  }

  // Auto-update Action_Taken_DT when status changes from 'Open' to 'In_Progress' or 'Closed'
  if (this.isModified('Status')) {
    const oldStatus = this._originalStatus || 'Open'; // fallback if not available
    if (oldStatus === 'Open' && (this.Status === 'In_Progress' || this.Status === 'Closed')) {
      if (!this.Action_Taken_DT) {
        this.Action_Taken_DT = new Date();
      }
    }
  }
  // same for in progress to closed
  if (this.isModified('Status')) {
    const oldStatus = this._originalStatus || 'Open'; // fallback if not available
    if (oldStatus === 'In_Progress' && (this.Status === 'Closed')) {
      this.Action_Taken_DT = new Date();
    }
  }
});

// Middleware to capture original status
TicketSchema.post('init', function (doc) {
  doc._originalStatus = doc.Status;
});

// Static method for Dropdowns
TicketSchema.statics.getTicketOptions = function () {
  return {
    priority: (this.schema.path('Priority') as any).enumValues,
    status: (this.schema.path('Status') as any).enumValues
  };
};

export default mongoose.models.Ticket as ITicketModel || mongoose.model<ITicket, ITicketModel>('Ticket', TicketSchema);
