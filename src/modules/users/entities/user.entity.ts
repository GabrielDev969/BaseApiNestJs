export class User {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
