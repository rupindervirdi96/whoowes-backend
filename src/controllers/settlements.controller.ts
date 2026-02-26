import { z } from 'zod';
import { Request, Response } from 'express';
import { Settlement } from '../models/Settlement';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

export const createSettlementSchema = z.object({
  toUserId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  note: z.string().optional(),
  groupId: z.string().optional(),
  expenseIds: z.array(z.string()).optional(),
});

export const respondSettlementSchema = z.object({
  action: z.enum(['confirm', 'reject']),
});

const populateSettlement = (q: any) =>
  q
    .populate('fromUserId', 'id name email avatarUrl')
    .populate('toUserId', 'id name email avatarUrl');

export const getSettlements = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const settlements = await populateSettlement(
    Settlement.find({ $or: [{ fromUserId: userId }, { toUserId: userId }] }).sort({ createdAt: -1 }),
  );
  res.json({ success: true, data: settlements });
});

export const getPendingSettlements = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const settlements = await populateSettlement(
    Settlement.find({
      $or: [{ fromUserId: userId }, { toUserId: userId }],
      status: 'pending',
    }).sort({ createdAt: -1 }),
  );
  res.json({ success: true, data: settlements });
});

export const getSettlement = asyncHandler(async (req: Request, res: Response) => {
  const settlement = await populateSettlement(Settlement.findById(req.params.id));
  if (!settlement) throw ApiError.notFound('Settlement not found');
  res.json({ success: true, data: settlement });
});

export const createSettlement = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const body = req.body as z.infer<typeof createSettlementSchema>;

  if (body.toUserId === userId) throw ApiError.badRequest('Cannot create settlement with yourself');

  const settlement = await Settlement.create({
    fromUserId: userId,
    toUserId: body.toUserId,
    amount: body.amount,
    currency: body.currency,
    note: body.note,
    groupId: body.groupId,
    expenseIds: body.expenseIds,
    initiatedAt: new Date(),
  });

  const populated = await populateSettlement(Settlement.findById(settlement._id));
  res.status(201).json({ success: true, data: populated });
});

export const respondToSettlement = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { action } = req.body as z.infer<typeof respondSettlementSchema>;

  const settlement = await Settlement.findById(req.params.id);
  if (!settlement) throw ApiError.notFound('Settlement not found');
  if (settlement.toUserId.toString() !== userId) throw ApiError.forbidden('Only the recipient can respond');
  if (settlement.status !== 'pending') throw ApiError.badRequest('Settlement is no longer pending');

  settlement.status = action === 'confirm' ? 'confirmed' : 'rejected';
  if (action === 'confirm') settlement.confirmedAt = new Date();
  else settlement.rejectedAt = new Date();
  await settlement.save();

  const populated = await populateSettlement(Settlement.findById(settlement._id));
  res.json({ success: true, data: populated });
});
