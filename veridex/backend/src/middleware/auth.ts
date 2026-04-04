import { Request, Response, NextFunction } from 'express';
import supabase from '../lib/supabase';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);

    // TODO: Verify JWT token from Supabase
    // For now, we'll use a simple approach of checking if the user exists
    // In production, you would verify the JWT signature and expiration

    // Placeholder: extract user ID from token
    // const { data: { user }, error } = await supabase.auth.getUser(token);
    // if (error || !user) {
    //   return res.status(401).json({ error: 'Invalid token' });
    // }
    // req.userId = user.id;
    // req.user = user;

    // For development, accept any token and extract a mock user ID
    // TODO: Replace with actual JWT verification
    req.userId = 'mock-user-id';
    req.user = { id: 'mock-user-id' };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // TODO: Verify token and set user
      req.userId = 'mock-user-id';
      req.user = { id: 'mock-user-id' };
    }

    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};
