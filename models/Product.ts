import mongoose, { Document, Model, Schema } from 'mongoose';
import Counter from './Counter';

export interface IProduct extends Document {
  Product_ID: string;
  Product_Name: string;
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
  Product_Name: {
    type: String,
    required: [true, "Product Name is required"],
    trim: true,
    unique: true // Product names should be unique in the master list
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

export default mongoose.models.Product as IProductModel || mongoose.model<IProduct, IProductModel>('Product', ProductSchema);
