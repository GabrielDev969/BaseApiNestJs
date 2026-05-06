import { Injectable, Inject } from '@nestjs/common';
import { USERS_REPOSITORY } from '../repositories/users.repository.interface';
import type { IUsersRepository } from '../repositories/users.repository.interface';
import { UserResponseDto } from '../http/dto/user-response.dto';
import { PaginatedResponseDto } from '@shared/dto/paginated-response.dto';

interface ListUsersInput {
  workspaceId: string;
  page: number;
  limit: number;
  search?: string;
}

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly users: IUsersRepository,
  ) {}

  async execute(
    input: ListUsersInput,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    const { items, total } = await this.users.findManyByWorkspace({
      workspaceId: input.workspaceId,
      page: input.page,
      limit: input.limit,
      search: input.search,
    });

    return {
      data: items.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      meta: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.ceil(total / input.limit),
      },
    };
  }
}
