export class Invitation {
  id: string;
  email: string;
  workspaceId: string;
  roleId: string;
  invitedById: string;
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}
