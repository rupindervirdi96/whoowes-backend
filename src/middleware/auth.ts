import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { User } from '../models/User';

export interface AuthRequest extends Request {
  userId: string;
  userEmail: string;
}

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('No token provided'));
  }

  const token = header.slice(7);
  try {
    const payload = verifyToken(token);
    // Verify user still exists in DB
    const user = await User.findById(payload.userId).select('_id email');
    if (!user) return next(ApiError.unauthorized('User no longer exists'));

    (req as AuthRequest).userId = payload.userId;
    (req as AuthRequest).userEmail = payload.email;
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
};
