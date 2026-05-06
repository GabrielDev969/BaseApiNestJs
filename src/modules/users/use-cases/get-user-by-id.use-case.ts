import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { USERS_REPOSITORY } from '../repositories/users.repository.interface';
import type { IUsersRepository } from '../repositories/users.repository.interface';
import { UserResponseDto } from '../http/dto/user-response.dto';

interface GetUserByIdInput {
  id: string;
  workspaceId: string;
}

@Injectable()
export class GetUserByIdUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly users: IUsersRepository,
  ) {}

  async execute(input: GetUserByIdInput): Promise<UserResponseDto> {
    const user = await this.users.findByIdInWorkspace(
      input.id,
      input.workspaceId,
    );
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
