import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISystemConfig extends Document {
  Config_Key: string;
  Admin_Email: string;
  Admin_WhatsApp: string;
  Last_Cron_Run: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SystemConfigSchema = new Schema<ISystemConfig>({
  Config_Key: {
    type: String,
    unique: true,
    default: 'global_notification_settings'
  },
  Admin_Email: {
    type: String,
    trim: true,
    default: ''
  },
  Admin_WhatsApp: {
    type: String,
    trim: true,
    default: ''
  },
  Last_Cron_Run: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

export default mongoose.models.SystemConfig || mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema);
