import mongoose, { Document, Model, Schema } from 'mongoose';
import Counter from './Counter';

export interface IProduct extends Document {
  Product_ID: string;
  Type: string;
  SubType: string;
  SubSubType: string;
  Description?: string;
  IsActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductModel extends Model<IProduct> {}

const ProductSchema = new Schema<IProduct, IProductModel>({
  Product_ID: {
    type: String,
    unique: true
  },
  Type: {
    type: String,
    required: [true, "Product Type is required"]
  },
  SubType: {
    type: String,
    default: ""
  },
  SubSubType: {
    type: String,
    default: ""
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

// Compound Unique Index: Ensure each hierarchical path only exists once
ProductSchema.index({ Type: 1, SubType: 1, SubSubType: 1 }, { unique: true });

// Auto-Increment Product_ID (PRD-0001)
ProductSchema.pre('save', async function() {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { id: 'product_id' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.Product_ID = `PRD-${counter.seq.toString().padStart(4, '0')}`;
  }
});

// Force model re-initialization if needed in development
if (mongoose.models.Product) {
  // delete mongoose.models.Product; // Only if you suspect serious ghosting
}

export default mongoose.models.Product as IProductModel || mongoose.model<IProduct, IProductModel>('Product', ProductSchema);
