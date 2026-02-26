import { z } from 'zod';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Friend } from '../models/Friend';
import { User } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

export const addFriendSchema = z.object({
  emailOrPhone: z.string().min(1),
});

export const respondFriendSchema = z.object({
  action: z.enum(['accept', 'reject', 'block']),
});

export const getFriends = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const friends = await Friend.find({
    $or: [{ userId }, { friendId: userId }],
    status: 'accepted',
  }).populate('userId friendId', 'id name email avatarUrl');

  const result = friends.map((f) => {
    const isRequester = f.userId.toString() === userId;
    const friendUser = isRequester ? f.friendId : f.userId;
    return {
      id: f._id.toString(),
      userId,
      friendId: (friendUser as any)._id?.toString() ?? friendUser.toString(),
      friendUser,
      status: f.status,
      createdAt: f.createdAt,
    };
  });

  res.json({ success: true, data: result });
});

export const getPendingRequests = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const requests = await Friend.find({ friendId: userId, status: 'pending' }).populate(
    'userId',
    'id name email avatarUrl',
  );
  res.json({ success: true, data: requests });
});

export const addFriend = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { emailOrPhone } = req.body as z.infer<typeof addFriendSchema>;

  const target = await User.findOne({
    $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
  });
  if (!target) throw ApiError.notFound('No user found with that email/phone');
  if (target._id.toString() === userId) throw ApiError.badRequest('Cannot add yourself');

  const existing = await Friend.findOne({
    $or: [
      { userId, friendId: target._id },
      { userId: target._id, friendId: userId },
    ],
  });
  if (existing) throw ApiError.conflict('Friend request already exists');

  const friend = await Friend.create({ userId, friendId: target._id });
  await friend.populate('friendId', 'id name email avatarUrl');

  res.status(201).json({ success: true, data: friend });
});

export const respondToRequest = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const { action } = req.body as z.infer<typeof respondFriendSchema>;

  const request = await Friend.findOne({ _id: id, friendId: userId, status: 'pending' });
  if (!request) throw ApiError.notFound('Friend request not found');

  if (action === 'accept') {
    request.status = 'accepted';
    await request.save();
  } else if (action === 'reject') {
    await request.deleteOne();
    return res.json({ success: true, data: null });
  } else {
    request.status = 'blocked';
    await request.save();
  }

  res.json({ success: true, data: request });
});

export const removeFriend = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  const deleted = await Friend.findOneAndDelete({
    _id: id,
    $or: [{ userId }, { friendId: userId }],
  });
  if (!deleted) throw ApiError.notFound('Friend relationship not found');

  res.json({ success: true, data: null });
});
