import mongoose, { Document, Model, Schema } from 'mongoose';
import Counter from './Counter';

export interface IProjectType extends Document {
  Type_ID: string;
  Type_Name: string;
  Description?: string;
  IsActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectTypeModel extends Model<IProjectType> {}

const ProjectTypeSchema = new Schema<IProjectType, IProjectTypeModel>({
  Type_ID: {
    type: String,
    unique: true
  },
  Type_Name: {
    type: String,
    required: [true, "Project Type Name is required"],
    trim: true,
    unique: true
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

// Auto-Increment Type_ID (PTY-0001)
ProjectTypeSchema.pre('save', async function() {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { id: 'project_type_id' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.Type_ID = `PTY-${counter.seq.toString().padStart(4, '0')}`;
  }
});

export default mongoose.models.ProjectType as IProjectTypeModel || mongoose.model<IProjectType, IProjectTypeModel>('ProjectType', ProjectTypeSchema);
