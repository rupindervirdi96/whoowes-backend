import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  passwordHash: string;
  avatarUrl?: string;
  defaultCurrency: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(plain: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, sparse: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String },
    defaultCurrency: { type: String, default: 'USD' },
  },
  { timestamps: true },
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.passwordHash);
};

// Never return passwordHash in JSON responses
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
    delete (ret as any).passwordHash;
    return ret;
  },
});

export const User = mongoose.model<IUser>('User', userSchema);
