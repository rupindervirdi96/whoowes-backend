import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Expense } from '../models/Expense';
import { Settlement } from '../models/Settlement';
import { asyncHandler } from '../utils/asyncHandler';

export const getBalances = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { groupId } = req.query as { groupId?: string };

  // Build match filter
  const expenseMatch: Record<string, any> = {
    $or: [{ paidBy: new mongoose.Types.ObjectId(userId) }, { 'splits.userId': new mongoose.Types.ObjectId(userId) }],
  };
  if (groupId) expenseMatch.groupId = new mongoose.Types.ObjectId(groupId);

  const expenses = await Expense.find(expenseMatch).select('paidBy splits amount');

  // Map: otherUserId → net (positive = they owe me, negative = I owe them)
  const netMap = new Map<string, number>();

  for (const exp of expenses) {
    const paidBy = exp.paidBy.toString();
    for (const split of exp.splits) {
      const splitUser = split.userId.toString();
      if (splitUser === paidBy) continue; // payer's own share

      if (paidBy === userId) {
        // I paid — splitUser owes me
        netMap.set(splitUser, (netMap.get(splitUser) ?? 0) + split.amount);
      } else if (splitUser === userId) {
        // Someone else paid — I owe them
        netMap.set(paidBy, (netMap.get(paidBy) ?? 0) - split.amount);
      }
    }
  }

  // Subtract confirmed settlements
  const settlements = await Settlement.find({
    $or: [{ fromUserId: userId }, { toUserId: userId }],
    status: 'confirmed',
    ...(groupId ? { groupId } : {}),
  });

  for (const s of settlements) {
    const from = s.fromUserId.toString();
    const to = s.toUserId.toString();
    if (from === userId) {
      // I paid them — reduces my debt to them
      netMap.set(to, (netMap.get(to) ?? 0) + s.amount);
    } else {
      // They paid me — reduces their debt
      netMap.set(from, (netMap.get(from) ?? 0) - s.amount);
    }
  }

  // Populate user details
  const userIds = [...netMap.keys()];
  const { User } = await import('../models/User');
  const users = await User.find({ _id: { $in: userIds } }).select('id name email avatarUrl');
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const balances = userIds
    .filter((uid) => Math.abs(netMap.get(uid) ?? 0) > 0.005)
    .map((uid) => {
      const net = netMap.get(uid) ?? 0;
      const user = userMap.get(uid);
      return {
        userId: uid,
        user,
        owes: net < 0 ? Math.abs(net) : 0,
        owed: net > 0 ? net : 0,
        netBalance: net,
      };
    });

  // Dashboard summary
  const totalOwed = balances.reduce((s, b) => s + b.owed, 0);
  const totalOwes = balances.reduce((s, b) => s + b.owes, 0);
  const netBalance = totalOwed - totalOwes;

  res.json({
    success: true,
    data: {
      balances,
      totalOwed,
      totalOwes,
      netBalance,
    },
  });
});

export const getDashboardSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const [expenseCount, recentExpenses] = await Promise.all([
    Expense.countDocuments({ $or: [{ paidBy: userId }, { 'splits.userId': userId }] }),
    Expense.find({ $or: [{ paidBy: userId }, { 'splits.userId': userId }] })
      .sort({ date: -1 })
      .limit(5)
      .populate('paidBy', 'id name email avatarUrl')
      .populate('splits.userId', 'id name email avatarUrl'),
  ]);

  // Reuse balance logic inline
  const expenses = await Expense.find({
    $or: [{ paidBy: new mongoose.Types.ObjectId(userId) }, { 'splits.userId': new mongoose.Types.ObjectId(userId) }],
  }).select('paidBy splits amount');

  let totalOwed = 0;
  let totalOwes = 0;

  for (const exp of expenses) {
    const paidBy = exp.paidBy.toString();
    for (const split of exp.splits) {
      const splitUser = split.userId.toString();
      if (splitUser === paidBy) continue;
      if (paidBy === userId) totalOwed += split.amount;
      else if (splitUser === userId) totalOwes += split.amount;
    }
  }

  // Apply confirmed settlements
  const settlements = await Settlement.find({
    $or: [{ fromUserId: userId }, { toUserId: userId }],
    status: 'confirmed',
  });
  for (const s of settlements) {
    if (s.fromUserId.toString() === userId) totalOwed -= s.amount;
    else totalOwes -= s.amount;
  }

  totalOwed = Math.max(0, totalOwed);
  totalOwes = Math.max(0, totalOwes);

  res.json({
    success: true,
    data: {
      totalOwed,
      totalOwes,
      netBalance: totalOwed - totalOwes,
      recentExpenses,
      expenseCount,
    },
  });
});
