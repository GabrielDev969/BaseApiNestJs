import { BadRequestException } from '@nestjs/common';
import {
  startTestDatabase,
  stopTestDatabase,
  resetDatabase,
  getPrisma,
} from './helpers/test-database';
import { seedPermissions } from './helpers/seed-permissions';
import { PrismaRolesRepository } from '../src/modules/rbac/repositories/prisma-roles.repository';
import { PrismaWorkspacesRepository } from '../src/modules/workspaces/repositories/prisma-workspaces.repository';
import { PrismaUsersRepository } from '../src/modules/users/repositories/prisma-users.repository';
import { PrismaService } from '../src/shared/database/prisma.service';
import { PERMISSIONS } from '../src/modules/rbac/constants/permissions';

describe('PrismaRolesRepository (integration)', () => {
  let roles: PrismaRolesRepository;
  let workspaces: PrismaWorkspacesRepository;
  let users: PrismaUsersRepository;
  let workspaceId: string;

  beforeAll(async () => {
    await startTestDatabase();
    const prisma = getPrisma() as unknown as PrismaService;
    roles = new PrismaRolesRepository(prisma);
    workspaces = new PrismaWorkspacesRepository(prisma);
    users = new PrismaUsersRepository(prisma);
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    await seedPermissions();

    const owner = await users.create({
      email: 'owner@example.com',
      name: 'Owner',
      passwordHash: 'hash',
    });
    const result = await workspaces.createWithDefaults({
      name: 'Acme',
      slug: 'acme',
      isPersonal: false,
      ownerId: owner.id,
      ownerRoleName: 'Owner',
      defaultRoles: [
        {
          name: 'Owner',
          isSystem: true,
          permissionKeys: [PERMISSIONS.USER.READ],
        },
      ],
    });
    workspaceId = result.workspace.id;
  });

  it('creates a role with the given permissions and rejects unknown keys', async () => {
    const role = await roles.create({
      name: 'Reviewer',
      description: 'Read-only auditor',
      workspaceId,
      permissionKeys: [PERMISSIONS.USER.READ, PERMISSIONS.AUDIT.READ],
    });

    expect(role).toMatchObject({
      name: 'Reviewer',
      description: 'Read-only auditor',
      workspaceId,
      isSystem: false,
    });
    expect(role.permissions.map((p) => p.key).sort()).toEqual(
      [PERMISSIONS.USER.READ, PERMISSIONS.AUDIT.READ].sort(),
    );

    await expect(
      roles.create({
        name: 'Bad',
        workspaceId,
        permissionKeys: ['nonexistent:permission'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('replaces a role permission set atomically on update', async () => {
    const role = await roles.create({
      name: 'Editor',
      workspaceId,
      permissionKeys: [PERMISSIONS.USER.READ],
    });

    const updated = await roles.update(role.id, {
      permissionKeys: [PERMISSIONS.USER.UPDATE, PERMISSIONS.WORKSPACE.READ],
    });

    expect(updated.permissions.map((p) => p.key).sort()).toEqual(
      [PERMISSIONS.USER.UPDATE, PERMISSIONS.WORKSPACE.READ].sort(),
    );

    const links = await getPrisma().rolePermission.findMany({
      where: { roleId: role.id },
    });
    expect(links).toHaveLength(2);
  });
});
