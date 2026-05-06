import { UsersRepository } from '@modules/users/repositories/users.repository.interface';
import { CreateWorkspaceUseCase } from '@modules/workspaces/use-cases/create-workspace.use-case';
import { ConflictException, Injectable } from '@nestjs/common';
import { CryptoUtil } from '@shared/utils/crypto.util';

interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

@Injectable()
export class RegisterUseCase {
  constructor(
    private users: UsersRepository,
    private createWorkspace: CreateWorkspaceUseCase,
  ) {}

  async execute(input: RegisterInput) {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await CryptoUtil.hashPassword(input.password);
    const user = await this.users.create({
      email: input.email,
      name: input.name,
      passwordHash,
    });

    await this.createWorkspace.execute({
      userId: user.id,
      name: `${input.name}'s Workspace`,
      isPersonal: true,
    });

    return { id: user.id, email: user.email, name: user.name };
  }
}
