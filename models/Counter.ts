import mongoose, { Document, Schema } from 'mongoose';

export interface ICounter extends Document {
  id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

export default mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);
