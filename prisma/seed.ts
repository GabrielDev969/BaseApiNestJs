import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

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

async function main() {
  console.log('🌱 Seeding permissions...');
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description, category: perm.category },
      create: perm,
    });
  }
  console.log(`✅ ${PERMISSIONS.length} permissions seeded`);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Erro ao executar o seed: ', e);
    process.exit(1);
  })
  .finally(async () => {
    prisma.$disconnect();
    await pool.end();
  });
