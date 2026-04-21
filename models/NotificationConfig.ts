import mongoose, { Document, Model, Schema } from 'mongoose';
import Counter from './Counter';

export interface INotificationConfig extends Document {
  Trigger_ID: string;
  Event_Name: string;
  IsEnabled: boolean;
  Channels: ('Email' | 'WhatsApp')[];
  // New per‑event internal recipient lists
  Internal_Recipients: { name: string; whatsapp?: string; email?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationConfigModel extends Model<INotificationConfig> {}

const NotificationConfigSchema = new Schema<INotificationConfig, INotificationConfigModel>({
  Trigger_ID: {
    type: String,
    unique: true
  },
  Event_Name: {
    type: String,
    required: [true, "Event Name is required"],
    trim: true,
    unique: true
  },
  IsEnabled: {
    type: Boolean,
    default: true
  },
  Internal_Recipients: {
    type: [{
      name: { type: String, required: true },
      whatsapp: { type: String },
      email: { type: String }
    }],
    default: []
  },
  Channels: {
    type: [String],
    enum: ['Email', 'WhatsApp'],
    default: ['Email']
  }
}, {
  timestamps: true
});

// Auto-Increment Trigger_ID (NOT-0001)
NotificationConfigSchema.pre('save', async function() {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { id: 'trigger_id' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.Trigger_ID = `NOT-${counter.seq.toString().padStart(4, '0')}`;
  }
});

// Force schema refresh in development to avoid CastError after structure change
if (process.env.NODE_ENV === 'development' && mongoose.models.NotificationConfig) {
  delete mongoose.models.NotificationConfig;
}

export default mongoose.models.NotificationConfig as INotificationConfigModel || mongoose.model<INotificationConfig, INotificationConfigModel>('NotificationConfig', NotificationConfigSchema);
