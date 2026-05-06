export class User {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  recoveryCodes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
