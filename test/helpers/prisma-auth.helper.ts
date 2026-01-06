import { getPrismaTestClient } from "./prisma-test.helper";
import { SignupDto } from "src/modules/auth/dtos/signup.dto";
import { User } from "src/modules/user/domain/entities/user.entity";
import { Role } from "src/modules/user/domain/enums/role.enum";
import { hash } from "bcryptjs";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

export const createUser = async (dto: SignupDto): Promise<User> => {
    const prisma = getPrismaTestClient();
    const passwordHash = await hash(dto.password, 10);
    const user = await prisma.user.create({
        data: {
            email: dto.email,
            password: passwordHash,
            name: dto.name,
        },
    });
    return new User(user.id, user.email, user.password, user.name, user.role as Role, user.createdAt, user.updatedAt);
};

export const createAdminUser = async (): Promise<User> => {
    const prisma = getPrismaTestClient();
    const passwordHash = await hash('admin', 10);
    const user = await prisma.user.create({
        data: {
            email: 'admin@example.com',
            password: passwordHash,
            name: 'Admin',
        },
    });
    return new User(user.id, user.email, user.password, user.name, user.role as Role, user.createdAt, user.updatedAt);
};

export const loginAndGetCookies = async (
    app: INestApplication,
    email: string,
    password: string,
): Promise<string[]> => {
    const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password });

    // Extrai os cookies do header 'set-cookie'
    const cookies = response.headers['set-cookie'] as unknown as string[];
    return cookies || [];
};

export const createUserAndLogin = async (
    app: INestApplication,
    dto: SignupDto = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'testpassword',
    },
): Promise<{ user: User; cookies: string[] }> => {
    const user = await createUser(dto);
    const cookies = await loginAndGetCookies(app, dto.email, dto.password);
    return { user, cookies };
};

export const authenticatedRequest = (
    app: INestApplication,
    cookies: string[],
) => {
    return {
        get: (url: string) =>
            request(app.getHttpServer())
                .get(url)
                .set('Cookie', cookies),
        post: (url: string) =>
            request(app.getHttpServer())
                .post(url)
                .set('Cookie', cookies),
        put: (url: string) =>
            request(app.getHttpServer())
                .put(url)
                .set('Cookie', cookies),
        patch: (url: string) =>
            request(app.getHttpServer())
                .patch(url)
                .set('Cookie', cookies),
        delete: (url: string) =>
            request(app.getHttpServer())
                .delete(url)
                .set('Cookie', cookies),
    };
};