import mongoose, { Document, Schema } from 'mongoose';

export type SettlementStatus = 'pending' | 'confirmed' | 'rejected';

export interface ISettlement extends Document {
  _id: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  note?: string;
  status: SettlementStatus;
  groupId?: mongoose.Types.ObjectId;
  expenseIds?: mongoose.Types.ObjectId[];
  initiatedAt: Date;
  confirmedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const settlementSchema = new Schema<ISettlement>(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    note: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'confirmed', 'rejected'], default: 'pending' },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group' },
    expenseIds: [{ type: Schema.Types.ObjectId, ref: 'Expense' }],
    initiatedAt: { type: Date, default: Date.now },
    confirmedAt: { type: Date },
    rejectedAt: { type: Date },
  },
  { timestamps: true },
);

settlementSchema.index({ fromUserId: 1, status: 1 });
settlementSchema.index({ toUserId: 1, status: 1 });

settlementSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

export const Settlement = mongoose.model<ISettlement>('Settlement', settlementSchema);
