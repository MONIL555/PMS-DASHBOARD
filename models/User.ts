import mongoose, { Document, Model, Schema } from 'mongoose';
import Counter from './Counter';

export interface IUser extends Document {
  User_ID: string;
  Name: string;
  Email: string;
  Password?: string;
  Phone?: string;
  Role_ID: mongoose.Types.ObjectId;
  IsActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserModel extends Model<IUser> {}

const UserSchema = new Schema<IUser, IUserModel>({
  User_ID: {
    type: String,
    unique: true
  },
  Name: {
    type: String,
    required: [true, "Name is required"],
    trim: true
  },
  Email: {
    type: String,
    required: [true, "Email is required"],
    trim: true,
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  Password: {
    type: String,
    select: false // Avoid returning passwords automatically on Model.find()
  },
  Phone: {
    type: String,
    trim: true
  },
  Role_ID: {
    type: Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, "Role assignment is required"]
  },
  IsActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Auto-Increment User_ID (USR-0001)
UserSchema.pre('save', async function() {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { id: 'user_id' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.User_ID = `USR-${counter.seq.toString().padStart(4, '0')}`;
  }
});

export default mongoose.models.User as IUserModel || mongoose.model<IUser, IUserModel>('User', UserSchema);
