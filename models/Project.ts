import mongoose, { Document, Model, Schema } from 'mongoose';
import Counter from './Counter';

export interface IProject extends Document {
  Project_ID: string;
  Project_Name: string;
  Lead_Reference: mongoose.Types.ObjectId;
  Quotation_Reference: mongoose.Types.ObjectId;
  Client_Reference: mongoose.Types.ObjectId;
  Product_Reference: mongoose.Types.ObjectId;
  Priority: 'Normal' | 'High';
  Pipeline_Status: 'Active' | 'On Hold' | 'Closed';
  Start_Details: {
    Phase: string;
    Requirement: string;
    Project_Scope_Description: string;
    Report_Type: 'Overview' | 'Detailed';
    Costing: number;
    Assigned_Person: string;
    Start_Date: Date;
    End_Date: Date;
  };
  Hold_History: Array<{
    Hold_Reason: string;
    Hold_Start_Date: Date;
    Hold_End_Date: Date;
  }>;
  UAT: {
    UAT_Status: 'Pending' | 'Approved' | 'Rejected';
    Feedback: string;
    UAT_Date: Date;
  };
  Deployment: {
    Deployment_Date: Date;
    Deployment_Status: 'Pending' | 'Success' | 'Failed';
    Remarks: string;
  };
  Delivery: {
    Delivery_Date: Date;
    Delivery_Status: 'Pending' | 'Delivered' | 'Partial';
  };
  Go_Live: {
    GoLive_Date: Date;
    Renewal_Rate: number;
    User_Wise_Rate: number;
    Payment_Schedule: 'Monthly' | 'Quarterly' | 'Yearly';
  };
  Termination: {
    Exit_Type: 'Terminate' | 'Discontinue' | 'Cancelled';
    Stage: string;
    Date_Time: Date;
    Reason: string;
  };
  External_Services: Array<{
    Service_Name: string;
    Inquiry_Date: Date;
    Delivery_Date: Date;
    Amount: number;
    Billing_Status: 'Working' | 'Generated' | 'Given to Client' | 'Receiving' | 'Under Process' | 'Received';
    Status_Date: Date;
    Cycle_Anchor_Date: Date;
    Payment_Timeline: string;
    Payment_Terms: 'Monthly' | 'Quarterly' | 'Annually';
    Reminder: {
      Enabled: boolean;
      Notify_Before: string;
    };
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectModel extends Model<IProject> {
  getProjectOptions(): any;
}

const ProjectSchema = new Schema<IProject, IProjectModel>({
  Project_ID: { type: String, unique: true },
  Project_Name: { type: String, required: true, trim: true },
  Lead_Reference: { type: Schema.Types.ObjectId, ref: 'Lead' },
  Quotation_Reference: { type: Schema.Types.ObjectId, ref: 'Quotation' },
  Client_Reference: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  Product_Reference: { type: Schema.Types.ObjectId, ref: 'Product', required: true },

  Priority: { type: String, enum: ['Normal', 'High'], default: 'Normal' },
  Pipeline_Status: { type: String, enum: ['Active', 'On Hold', 'Closed'], default: 'Active' },

  // Project Start Details
  Start_Details: {
    Phase: String,
    Requirement: String,
    Project_Scope_Description: String,
    Report_Type: { type: String, enum: ['Overview', 'Detailed'], default: 'Overview' },
    Costing: Number,
    Assigned_Person: String,
    Start_Date: Date,
    End_Date: Date
  },

  // Hold Section
  Hold_History: [{
    Hold_Reason: String,
    Hold_Start_Date: Date,
    Hold_End_Date: Date
  }],

  // UAT Section
  UAT: {
    UAT_Status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    Feedback: String,
    UAT_Date: Date
  },

  // Deployment & Delivery
  Deployment: {
    Deployment_Date: Date,
    Deployment_Status: { type: String, enum: ['Pending', 'Success', 'Failed'], default: 'Pending' },
    Remarks: String
  },
  Delivery: {
    Delivery_Date: Date,
    Delivery_Status: { type: String, enum: ['Pending', 'Delivered', 'Partial'], default: 'Pending' }
  },

  // Go-Live & Renewal
  Go_Live: {
    GoLive_Date: Date,
    Renewal_Rate: Number,
    User_Wise_Rate: Number,
    Payment_Schedule: { type: String, enum: ['Monthly', 'Quarterly', 'Yearly'] }
  },

  // Termination Section
  Termination: {
    Exit_Type: { type: String, enum: ['Terminate', 'Discontinue', 'Cancelled'] },
    Stage: String,
    Date_Time: Date,
    Reason: String
  },

  // External Services
  External_Services: [{
    Service_Name: { type: String, required: true },
    Inquiry_Date: Date,
    Delivery_Date: Date,
    Amount: { type: Number, default: 0 },
    Billing_Status: {
      type: String,
      enum: ['Working', 'Generated', 'Given to Client', 'Receiving', 'Under Process', 'Received'],
      default: 'Working'
    },
    Status_Date: Date,
    Cycle_Anchor_Date: Date,
    Payment_Timeline: String,
    Payment_Terms: {
      type: String,
      enum: ['Monthly', 'Quarterly', 'Annually'],
      default: 'Monthly'
    },
    Reminder: {
      Enabled: { type: Boolean, default: true },
      Notify_Before: { type: String, default: '3 days before' }
    }
  }]
}, { timestamps: true });

// Auto-ID Logic
ProjectSchema.pre('save', async function () {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate({ id: 'project_id' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    this.Project_ID = `PRJ-${counter.seq.toString().padStart(4, '0')}`;
  }
});

// Static method for Dropdowns
ProjectSchema.statics.getProjectOptions = function () {
  return {
    priority: (this.schema.path('Priority') as any).enumValues,
    pipelineStatus: (this.schema.path('Pipeline_Status') as any).enumValues,
    reportType: (this.schema.path('Start_Details.Report_Type') as any).enumValues,
    uatStatus: (this.schema.path('UAT.UAT_Status') as any).enumValues,
    deploymentStatus: (this.schema.path('Deployment.Deployment_Status') as any).enumValues,
    deliveryStatus: (this.schema.path('Delivery.Delivery_Status') as any).enumValues,
    paymentSchedule: (this.schema.path('Go_Live.Payment_Schedule') as any).enumValues,
    exitType: (this.schema.path('Termination.Exit_Type') as any).enumValues,
    billingStatus: (this.schema.path('External_Services.Billing_Status') as any).enumValues,
    paymentTerms: (this.schema.path('External_Services.Payment_Terms') as any).enumValues
  };
};

export default mongoose.models.Project as IProjectModel || mongoose.model<IProject, IProjectModel>('Project', ProjectSchema);
