import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import { Pool } from "pg";

let prisma: PrismaClient;
let pool: Pool;

export const getPrismaTestClient = (): PrismaClient => {
    if (!prisma) {
        pool = new Pool({
          connectionString: process.env.DATABASE_URL,
        });
        const adapter = new PrismaPg(pool);
        prisma = new PrismaClient({ adapter });
    }
    return prisma;
};

export const setupTestDatabase = async (): Promise<void> => {
    execSync('npx prisma migrate deploy', {
        env: {
            ...process.env,
            DATABASE_URL: process.env.DATABASE_URL,
          },
    });
};

export const cleanDatabase = async (): Promise<void> => {
    const client = getPrismaTestClient();
    const tables: { tablename: string}[] = await client.$queryRaw`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE '_prisma%'
    `;
    await client.$executeRawUnsafe(`SET session_replication_role = 'replica';`);

    for (const { tablename } of tables) {
        await client.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`);
    }
    await client.$executeRawUnsafe(`SET session_replication_role = 'origin';`);

}

export const disconnectTestDatabase = async (): Promise<void> => {
    const client = getPrismaTestClient();
    await client.$disconnect();
    if(pool) {
        await pool.end();
    }
};