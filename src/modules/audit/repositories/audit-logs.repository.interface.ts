import { AuditLog } from '../entities/audit-log.entity';

export interface CreateAuditLogData {
  userId?: string | null;
  workspaceId?: string | null;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface FindAuditLogsParams {
  workspaceId: string;
  userId?: string;
  action?: string; // supports prefix match: 'user.*'
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

export interface FindAuditLogsResult {
  items: AuditLog[];
  total: number;
}

export interface IAuditLogsRepository {
  create(data: CreateAuditLogData): Promise<AuditLog>;
  findMany(params: FindAuditLogsParams): Promise<FindAuditLogsResult>;
}

export const AUDIT_LOGS_REPOSITORY = Symbol('IAuditLogsRepository');
