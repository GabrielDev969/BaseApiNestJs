import { HttpStatus, INestApplication, ValidationPipe } from "@nestjs/common"
import { cleanDatabase, disconnectTestDatabase, setupTestDatabase } from "test/helpers/prisma-test.helper";
import { TestingModule, Test } from "@nestjs/testing";
import { AppModule } from "src/app.module";
import cookieParser from "cookie-parser";
import { SignupDto } from "src/modules/auth/dtos/signup.dto";
import request from "supertest";
import { Role } from "src/modules/user/domain/enums/role.enum";
import { createUser, loginAndGetCookies } from "test/helpers/prisma-auth.helper";
import { LoginDto } from "src/modules/auth/dtos/auth.dto";

describe('Auth Controller', () => {
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

        it('should return 409 if email is already registered', async () => {
            const signupDto = {
                email: 'test@example.com',
                name: 'Test User',
                password: 'testpassword',
            };

            await createUser(signupDto as SignupDto);
            
            const response = await request(app.getHttpServer())
                .post('/auth/signup')
                .send(signupDto as SignupDto)
                .expect(409);

            expect(response.body).toEqual({
                error: 'Conflict',
                statusCode: 409,
                message: 'Email already registered',
            });
        });

        it('should return 400 if email is invalid', async () => {
            const signupDto = {
                email: 'invalid-email',
                name: 'Test User',
                password: 'testpassword',
            };
            
            const response = await request(app.getHttpServer())
                .post('/auth/signup')
                .send(signupDto as SignupDto)
                .expect(400);

            expect(response.body).toEqual({
                error: 'Bad Request',
                statusCode: 400,
                message: ['email must be an email'],
            });
        });

        it('should return 400 if name is too short', async () => {
            const signupDto = {
                email: 'test@example.com',
                name: 'T',
                password: 'testpassword',
            };
            
            const response = await request(app.getHttpServer())
                .post('/auth/signup')
                .send(signupDto as SignupDto)
                .expect(400);

            expect(response.body).toEqual({
                error: 'Bad Request',
                statusCode: 400,
                message: ['name must be longer than or equal to 2 characters'],
            });
        });
        
        it('should return 400 if password is too short', async () => {
            const signupDto = {
                email: 'test@example.com',
                name: 'Test User',
                password: 'test',
            };
            
            const response = await request(app.getHttpServer())
                .post('/auth/signup')
                .send(signupDto as SignupDto)
                .expect(400);

            expect(response.body).toEqual({
                error: 'Bad Request',
                statusCode: 400,
                message: ['password must be longer than or equal to 6 characters'],
            });
        });
    });

    describe('POST /auth/login', () => {
        it('should login a user is successful', async () => {
            const signupDto = {
                email: 'test@example.com',
                name: 'Test User',
                password: 'testpassword',
            };
            
            await createUser(signupDto as SignupDto);

            const loginDto = {
                email: 'test@example.com',
                password: 'testpassword',
            };
            
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send(loginDto as LoginDto)
                .expect(201);

            expect(response.body).toEqual({
                user: {
                    id: expect.any(String),
                    email: loginDto.email,
                    name: signupDto.name,
                    role: Role.USER,
                    createdAt: expect.any(String),
                    updatedAt: expect.any(String),
                },
                accessToken: expect.any(String),
                refreshToken: expect.any(String),
            });
            expect(response.body.user.password).toBeUndefined();
        });

        it('should return 401 if credentials are invalid', async () => {
            const loginDto = {
                email: 'test@example.com',
                password: 'testpassword',
            };
            
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send(loginDto as LoginDto)
                .expect(401);

            expect(response.body).toEqual({
                error: 'Unauthorized',
                statusCode: 401,
                message: 'Invalid credentials',
            });
        });
    });

    describe('POST /auth/me', () => {
        it('should return the user information', async () => {
            const signupDto = {
                email: 'test@example.com',
                name: 'Test User',
                password: 'testpassword',
            };
            
            await createUser(signupDto as SignupDto);

            const loginDto = {
                email: 'test@example.com',
                password: 'testpassword',
            };
            
            const cookies = await loginAndGetCookies(app, loginDto.email, loginDto.password);

            const response = await request(app.getHttpServer())
                .get('/auth/me')
                .set('Cookie', cookies)
                .expect(200);

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

        it('should return 401 if user is not authenticated', async () => {
            const response = await request(app.getHttpServer())
                .get('/auth/me')
                .set('Cookie', [])
                .expect(401);
                
            expect(response.body).toEqual({
                error: 'Unauthorized',
                statusCode: 401,
                message: 'Missing token',
            });
        });
    });
});