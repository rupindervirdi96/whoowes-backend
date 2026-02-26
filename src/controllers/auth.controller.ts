import { z } from 'zod';
import { Request, Response } from 'express';
import { User } from '../models/User';
import { signToken } from '../utils/jwt';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const userResponse = (user: InstanceType<typeof User>) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, phone, password } = req.body as z.infer<typeof registerSchema>;

  const exists = await User.findOne({ email });
  if (exists) throw ApiError.conflict('Email already registered');

  const user = await User.create({ name, email, phone, passwordHash: password });
  const token = signToken({ userId: user._id.toString(), email: user.email });

  res.status(201).json({
    success: true,
    data: { user: userResponse(user), token },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const token = signToken({ userId: user._id.toString(), email: user.email });

  res.json({
    success: true,
    data: { user: userResponse(user), token },
  });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById((req as any).userId);
  if (!user) throw ApiError.notFound('User not found');
  res.json({ success: true, data: userResponse(user) });
});
