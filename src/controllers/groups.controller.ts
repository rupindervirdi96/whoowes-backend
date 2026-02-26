import { z } from 'zod';
import { Request, Response } from 'express';
import { Group } from '../models/Group';
import { User } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

export const createGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  memberIds: z.array(z.string()).default([]),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

const populateGroup = (q: any) =>
  q?.populate('members.userId', 'id name email avatarUrl');

export const getGroups = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const groups = await Group.find({ 'members.userId': userId }).populate(
    'members.userId',
    'id name email avatarUrl',
  );
  res.json({ success: true, data: groups });
});

export const getGroup = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const group = await populateGroup(Group.findById(req.params.id));
  if (!group) throw ApiError.notFound('Group not found');

  const isMember = group.members.some((m: any) => m.userId.toString() === userId);
  if (!isMember) throw ApiError.forbidden();

  res.json({ success: true, data: group });
});

export const createGroup = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { name, description, memberIds } = req.body as z.infer<typeof createGroupSchema>;

  const allMemberIds = [...new Set([userId, ...memberIds])];
  const members = allMemberIds.map((mid) => ({
    userId: mid,
    role: mid === userId ? 'admin' : 'member',
    joinedAt: new Date(),
  })) as any[];

  const group = await Group.create({ name, description, members, createdBy: userId });
  await group.populate('members.userId', 'id name email avatarUrl');

  res.status(201).json({ success: true, data: group });
});

export const updateGroup = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { name, description } = req.body as z.infer<typeof updateGroupSchema>;

  const group = await Group.findById(req.params.id);
  if (!group) throw ApiError.notFound('Group not found');

  const member = group.members.find((m) => m.userId.toString() === userId);
  if (!member || member.role !== 'admin') throw ApiError.forbidden('Only admins can edit the group');

  if (name) group.name = name;
  if (description !== undefined) group.description = description;
  await group.save();
  await group.populate('members.userId', 'id name email avatarUrl');

  res.json({ success: true, data: group });
});

export const addMember = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { userId: newMemberId } = req.body as { userId: string };

  const group = await Group.findById(req.params.id);
  if (!group) throw ApiError.notFound('Group not found');

  const requester = group.members.find((m) => m.userId.toString() === userId);
  if (!requester || requester.role !== 'admin') throw ApiError.forbidden();

  const alreadyMember = group.members.some((m) => m.userId.toString() === newMemberId);
  if (alreadyMember) throw ApiError.conflict('User is already a member');

  const newUser = await User.findById(newMemberId);
  if (!newUser) throw ApiError.notFound('User not found');

  group.members.push({ userId: newUser._id, role: 'member', joinedAt: new Date() });
  await group.save();
  await group.populate('members.userId', 'id name email avatarUrl');

  res.json({ success: true, data: group });
});

export const leaveGroup = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const group = await Group.findById(req.params.id);
  if (!group) throw ApiError.notFound('Group not found');

  group.members = group.members.filter((m) => m.userId.toString() !== userId) as any;
  await group.save();

  res.json({ success: true, data: null });
});
