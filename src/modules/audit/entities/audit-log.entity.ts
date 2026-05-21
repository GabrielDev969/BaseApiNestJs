export class AuditLog {
  id: string;
  userId: string | null;
  workspaceId: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  prevHash: string | null;
  hash: string;
  createdAt: Date;
}
