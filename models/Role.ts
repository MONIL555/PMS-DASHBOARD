import mongoose, { Document, Model, Schema } from 'mongoose';
import Counter from './Counter';

export interface IRole extends Document {
  Role_ID: string;
  Role_Name: string;
  Description?: string;
  Permissions: string[];
  IsActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoleModel extends Model<IRole> {}

const RoleSchema = new Schema<IRole, IRoleModel>({
  Role_ID: {
    type: String,
    unique: true
  },
  Role_Name: {
    type: String,
    required: [true, "Role Name is required"],
    trim: true,
    unique: true
  },
  Description: {
    type: String,
    trim: true
  },
  Permissions: [{
    type: String
  }],
  IsActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Auto-Increment Role_ID (ROL-0001)
RoleSchema.pre('save', async function() {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { id: 'role_id' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.Role_ID = `ROL-${counter.seq.toString().padStart(4, '0')}`;
  }
});

export default mongoose.models.Role as IRoleModel || mongoose.model<IRole, IRoleModel>('Role', RoleSchema);
