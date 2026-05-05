import { Session } from '../entities/session.entity';

export interface CreateSessionData {
  userId: string;
  refreshTokenHash: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: Date;
}

export interface ISessionsRepository {
  create(data: CreateSessionData): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  findActiveByUser(userId: string): Promise<Session[]>;
  updateLastUsed(id: string): Promise<void>;
  revoke(id: string): Promise<void>;
  revokeAllForUser(userId: string, exceptSessionId?: string): Promise<void>;
  deleteExpired(): Promise<number>;
}

export const SESSIONS_REPOSITORY = Symbol('ISessionsRepository');
