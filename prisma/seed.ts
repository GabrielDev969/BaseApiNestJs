import 'dotenv/config';
import { env } from 'prisma/config';
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: env('DATABASE_URL'),
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
    console.log('🌱 Starting seed...');

    console.log('🔒 Checking if admin user exists...');
    const user = await prisma.user.findUnique({
        where: {
            email: 'admin@example.com',
        },
    });

    
    if (!user) {
        console.log('🔒 Creating admin user...');
        const hashedPassword = await hash('admin', 10);
        await prisma.user.create({
            data: {
                email: 'admin@example.com',
                password: hashedPassword,
                name: 'Admin',
                role: 'ADMIN',
            },
        });
    }
    console.log('✅ Admin user created');
    console.log('🌱 Seed completed');

}

main().catch((error) => {
    console.error(error);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
    await pool.end();
});