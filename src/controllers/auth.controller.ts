import { z } from 'zod';
import { Request, Response } from 'express';
import { User } from '../models/User';
import { signToken } from '../utils/jwt';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

export const registerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number'),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Phone or email is required')
    .refine(
      (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^\+?[1-9]\d{7,14}$/.test(v),
      { message: 'Enter a valid phone number or email address' },
    ),
  password: z.string().min(1),
});

const userResponse = (user: InstanceType<typeof User>) => ({
  id: user._id.toString(),
  name: user.name,
  phone: user.phone,
  email: user.email,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, phone, email, password } = req.body as z.infer<typeof registerSchema>;

  const phoneExists = await User.findOne({ phone });
  if (phoneExists) throw ApiError.conflict('Phone number already registered');

  if (email) {
    const emailExists = await User.findOne({ email });
    if (emailExists) throw ApiError.conflict('Email already registered');
  }

  const user = await User.create({ name, phone, email: email || undefined, passwordHash: password });
  const token = signToken({ userId: user._id.toString(), email: user.email as string });

  res.status(201).json({
    success: true,
    data: { user: userResponse(user), token },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { identifier, password } = req.body as z.infer<typeof loginSchema>;

  const isPhone = /^\+?[1-9]\d{7,14}$/.test(identifier);
  const user = await User.findOne(isPhone ? { phone: identifier } : { email: identifier });
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  const token = signToken({ userId: user._id.toString(), email: user.email as string });

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
