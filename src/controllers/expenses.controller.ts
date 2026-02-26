import { z } from 'zod';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Expense } from '../models/Expense';
import { Group } from '../models/Group';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

const splitSchema = z.object({
  userId: z.string(),
  amount: z.number().min(0),
  percentage: z.number().optional(),
});

export const createExpenseSchema = z.object({
  groupId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  category: z.enum(['food', 'transport', 'accommodation', 'entertainment', 'utilities', 'shopping', 'health', 'other']).default('other'),
  paidBy: z.string(),
  splitType: z.enum(['equal', 'custom', 'percentage', 'item_based']).default('equal'),
  splits: z.array(splitSchema).min(1),
  date: z.string().optional(),
});

const populateExpense = (q: any) =>
  q
    .populate('paidBy', 'id name email avatarUrl')
    .populate('splits.userId', 'id name email avatarUrl')
    .populate('createdBy', 'id name email avatarUrl');

export const getExpenses = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { groupId, page = '1', limit = '20' } = req.query as Record<string, string>;

  const filter: Record<string, any> = {
    $or: [{ paidBy: userId }, { 'splits.userId': userId }],
  };
  if (groupId) filter.groupId = groupId;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [expenses, total] = await Promise.all([
    populateExpense(Expense.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit))),
    Expense.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: expenses,
    total,
    page: parseInt(page),
    perPage: parseInt(limit),
    hasMore: skip + expenses.length < total,
  });
});

export const getExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await populateExpense(Expense.findById(req.params.id));
  if (!expense) throw ApiError.notFound('Expense not found');
  res.json({ success: true, data: expense });
});

export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const body = req.body as z.infer<typeof createExpenseSchema>;

  // If groupId, verify user is a member
  if (body.groupId) {
    const group = await Group.findById(body.groupId);
    if (!group) throw ApiError.notFound('Group not found');
    const isMember = group.members.some((m) => m.userId.toString() === userId);
    if (!isMember) throw ApiError.forbidden('You are not a member of this group');
  }

  const expense = await Expense.create({
    ...body,
    date: body.date ? new Date(body.date) : new Date(),
    createdBy: userId,
  });

  await populateExpense(expense.populate.bind(expense));
  const populated = await populateExpense(Expense.findById(expense._id));

  res.status(201).json({ success: true, data: populated });
});

export const updateExpense = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw ApiError.notFound('Expense not found');
  if (expense.createdBy.toString() !== userId) throw ApiError.forbidden('Only the creator can edit this expense');

  Object.assign(expense, req.body);
  await expense.save();

  const populated = await populateExpense(Expense.findById(expense._id));
  res.json({ success: true, data: populated });
});

export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw ApiError.notFound('Expense not found');
  if (expense.createdBy.toString() !== userId) throw ApiError.forbidden('Only the creator can delete this expense');

  await expense.deleteOne();
  res.json({ success: true, data: null });
});
