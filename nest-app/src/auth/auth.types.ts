import type { Request } from 'express';
import type { User } from '../database/users.schema';

export interface AuthIdentity {
  user: User;
  authType: 'session' | 'token';
  authSession?: {
    id: string;
    payload: SessionPayload;
  };
}

export interface SessionPayload {
  csrfToken: string;
  remember?: boolean;
}

export interface AuthenticatedRequest extends Request {
  authSession?: {
    id: string;
    payload: SessionPayload;
  };
  authType?: 'session' | 'token';
  user?: User;
}
