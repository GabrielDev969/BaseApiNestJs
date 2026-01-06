import { HttpStatus, INestApplication, ValidationPipe } from "@nestjs/common"
import { cleanDatabase, disconnectTestDatabase, setupTestDatabase } from "test/helpers/prisma-test.helper";
import { TestingModule, Test } from "@nestjs/testing";
import { AppModule } from "src/app.module";
import cookieParser from "cookie-parser";
import { SignupDto } from "src/modules/auth/dtos/signup.dto";
import request from "supertest";
import { Role } from "src/modules/user/domain/enums/role.enum";

describe('Auth Signup Integration', () => {
    let app: INestApplication;

    beforeAll(async () => {
        await setupTestDatabase();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }));
        await app.init();
    });

    beforeEach(async () => {
        await cleanDatabase();
    });

    afterAll(async () => {
        await disconnectTestDatabase();
        await app.close();
    });

    describe('POST /auth/signup', () => {
        it('should create a new user', async () => {
            const signupDto = {
                email: 'test@example.com',
                name: 'Test User',
                password: 'testpassword',
            };
            
            const response = await request(app.getHttpServer())
                .post('/auth/signup')
                .send(signupDto as SignupDto)
                .expect(HttpStatus.CREATED);

            expect(response.body).toEqual({
                id: expect.any(String),
                email: signupDto.email,
                name: signupDto.name,
                role: Role.USER,
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
            });
            expect(response.body.password).toBeUndefined();
        });
    });
});