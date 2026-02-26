import mongoose, { Document, Schema } from 'mongoose';

export type SplitType = 'equal' | 'custom' | 'percentage' | 'item_based';
export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'accommodation'
  | 'entertainment'
  | 'utilities'
  | 'shopping'
  | 'health'
  | 'other';

export interface IExpenseSplit {
  userId: mongoose.Types.ObjectId;
  amount: number;
  percentage?: number;
  paid: boolean;
}

export interface IExpenseItem {
  name: string;
  price: number;
  quantity: number;
  assignedTo: mongoose.Types.ObjectId[];
}

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId;
  groupId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  paidBy: mongoose.Types.ObjectId;
  splitType: SplitType;
  splits: IExpenseSplit[];
  items?: IExpenseItem[];
  receiptId?: string;
  date: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const splitSchema = new Schema<IExpenseSplit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    percentage: { type: Number },
    paid: { type: Boolean, default: false },
  },
  { _id: false },
);

const itemSchema = new Schema<IExpenseItem>(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
    assignedTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: true },
);

const expenseSchema = new Schema<IExpense>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    category: {
      type: String,
      enum: ['food', 'transport', 'accommodation', 'entertainment', 'utilities', 'shopping', 'health', 'other'],
      default: 'other',
    },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    splitType: { type: String, enum: ['equal', 'custom', 'percentage', 'item_based'], default: 'equal' },
    splits: [splitSchema],
    items: [itemSchema],
    receiptId: { type: String },
    date: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

expenseSchema.index({ groupId: 1, date: -1 });
expenseSchema.index({ 'splits.userId': 1 });
expenseSchema.index({ paidBy: 1 });

expenseSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);
