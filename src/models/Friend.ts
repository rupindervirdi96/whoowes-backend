import mongoose, { Document, Schema } from 'mongoose';

export type FriendStatus = 'pending' | 'accepted' | 'blocked';

export interface IFriend extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  friendId: mongoose.Types.ObjectId;
  status: FriendStatus;
  createdAt: Date;
}

const friendSchema = new Schema<IFriend>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    friendId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'blocked'], default: 'pending' },
  },
  { timestamps: true },
);

// Compound index to prevent duplicate friend entries
friendSchema.index({ userId: 1, friendId: 1 }, { unique: true });

friendSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

export const Friend = mongoose.model<IFriend>('Friend', friendSchema);
