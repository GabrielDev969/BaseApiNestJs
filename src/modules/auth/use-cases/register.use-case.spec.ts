import { ConflictException } from '@nestjs/common';
import { RegisterUseCase } from './register.use-case';
import { UsersRepository } from '@modules/users/repositories/users.repository.interface';
import { CreateWorkspaceUseCase } from '@modules/workspaces/use-cases/create-workspace.use-case';
import { CryptoUtil } from '@shared/utils/crypto.util';
import { User } from '@modules/users/entities/user.entity';
import { MetricsService } from '@shared/metrics/metrics.service';

describe('RegisterUseCase', () => {
  let users: jest.Mocked<UsersRepository>;
  let createWorkspace: jest.Mocked<CreateWorkspaceUseCase>;
  let metrics: jest.Mocked<MetricsService>;
  let useCase: RegisterUseCase;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findByIdInWorkspace: jest.fn(),
      findManyByWorkspace: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    createWorkspace = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateWorkspaceUseCase>;
    metrics = {
      incRegister: jest.fn(),
    } as unknown as jest.Mocked<MetricsService>;
    useCase = new RegisterUseCase(users, createWorkspace, metrics);
  });

  it('creates a user, hashes the password and provisions a personal workspace', async () => {
    users.findByEmail.mockResolvedValue(null);
    users.create.mockResolvedValue({
      id: 'u1',
      email: 'jane@example.com',
      name: 'Jane',
    } as User);

    const result = await useCase.execute({
      email: 'jane@example.com',
      name: 'Jane',
      password: 'StrongPass@123',
    });

    expect(result).toEqual({
      id: 'u1',
      email: 'jane@example.com',
      name: 'Jane',
    });

    const createArg = users.create.mock.calls[0][0];
    expect(createArg.email).toBe('jane@example.com');
    expect(createArg.name).toBe('Jane');
    expect(createArg.passwordHash).toBeDefined();
    expect(createArg.passwordHash).not.toBe('StrongPass@123');
    await expect(
      CryptoUtil.verifyPassword(createArg.passwordHash!, 'StrongPass@123'),
    ).resolves.toBe(true);

    expect(createWorkspace.execute).toHaveBeenCalledWith({
      userId: 'u1',
      name: "Jane's Workspace",
      isPersonal: true,
    });
  });

  it('throws ConflictException if the email already exists', async () => {
    users.findByEmail.mockResolvedValue({ id: 'u1' } as User);

    await expect(
      useCase.execute({
        email: 'taken@example.com',
        name: 'X',
        password: 'StrongPass@123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(users.create).not.toHaveBeenCalled();
    expect(createWorkspace.execute).not.toHaveBeenCalled();
  });
});
