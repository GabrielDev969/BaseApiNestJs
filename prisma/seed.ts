import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import {
  ADMIN_WORKSPACE_SLUG,
  ADMIN_WORKSPACE_NAME,
  SUPER_ADMIN_ROLE,
} from '../src/modules/rbac/constants/system';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const PERMISSIONS = [
  // User
  { key: 'user:read', category: 'user', description: 'Visualizar usuários' },
  { key: 'user:create', category: 'user', description: 'Criar usuários' },
  { key: 'user:update', category: 'user', description: 'Atualizar usuários' },
  { key: 'user:delete', category: 'user', description: 'Deletar usuários' },

  // Workspace
  {
    key: 'workspace:read',
    category: 'workspace',
    description: 'Ver workspace',
  },
  {
    key: 'workspace:update',
    category: 'workspace',
    description: 'Editar workspace',
  },
  {
    key: 'workspace:delete',
    category: 'workspace',
    description: 'Deletar workspace',
  },
  {
    key: 'workspace:invite',
    category: 'workspace',
    description: 'Convidar membros',
  },
  {
    key: 'workspace:remove_member',
    category: 'workspace',
    description: 'Remover membros',
  },

  // RBAC
  { key: 'role:read', category: 'rbac', description: 'Ver roles' },
  { key: 'role:create', category: 'rbac', description: 'Criar roles' },
  { key: 'role:update', category: 'rbac', description: 'Editar roles' },
  { key: 'role:delete', category: 'rbac', description: 'Deletar roles' },
  {
    key: 'role:assign',
    category: 'rbac',
    description: 'Atribuir roles a membros',
  },

  // Audit
  {
    key: 'audit:read',
    category: 'audit',
    description: 'Ver logs de auditoria',
  },
];

interface SuperAdminEnv {
  email: string;
  password: string;
  name: string;
}

function readSuperAdminEnv(): SuperAdminEnv {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME;

  if (!email || !password || !name) {
    throw new Error(
      'SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD e SUPER_ADMIN_NAME devem ser definidos no .env',
    );
  }

  return { email, password, name };
}

async function seedPermissions(): Promise<string[]> {
  console.log('🌱 Seeding permissions...');
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description, category: perm.category },
      create: perm,
    });
  }
  console.log(`✅ ${PERMISSIONS.length} permissions seeded`);
  return PERMISSIONS.map((p) => p.key);
}

async function seedSuperAdmin(allPermissionKeys: string[]): Promise<void> {
  const env = readSuperAdminEnv();
  console.log('🌱 Seeding super admin...');

  const passwordHash = await argon2.hash(env.password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const user = await prisma.user.upsert({
    where: { email: env.email },
    update: { name: env.name },
    create: { email: env.email, name: env.name, passwordHash },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: ADMIN_WORKSPACE_SLUG },
    update: {},
    create: {
      name: ADMIN_WORKSPACE_NAME,
      slug: ADMIN_WORKSPACE_SLUG,
      isPersonal: false,
      ownerId: user.id,
    },
  });

  const permissions = await prisma.permission.findMany({
    where: { key: { in: allPermissionKeys } },
  });

  const role = await prisma.role.upsert({
    where: {
      workspaceId_name: { workspaceId: workspace.id, name: SUPER_ADMIN_ROLE },
    },
    update: { description: 'Acesso global a todos os workspaces' },
    create: {
      name: SUPER_ADMIN_ROLE,
      description: 'Acesso global a todos os workspaces',
      workspaceId: workspace.id,
      isSystem: true,
    },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  await prisma.rolePermission.createMany({
    data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
  });

  await prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: { userId: user.id, workspaceId: workspace.id },
    },
    update: { roleId: role.id },
    create: { userId: user.id, workspaceId: workspace.id, roleId: role.id },
  });

  console.log(`✅ Super admin "${env.email}" provisionado`);
}

async function main() {
  const permissionKeys = await seedPermissions();
  await seedSuperAdmin(permissionKeys);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Erro ao executar o seed: ', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
